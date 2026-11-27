-- =============================================================================
-- Fase 4 · Alertas e referências da empresa
--
-- O Head observa a operação e chama atenção sozinho. A função refresh_alerts
-- calcula as situações de alerta, cria ou atualiza os alertas (sem duplicar,
-- pela chave dedupe_key) e resolve sozinha os que deixaram de valer.
-- Alerta dispensado por alguém não volta enquanto a situação for a mesma.
-- =============================================================================

create table public.company_settings (
  company_id                  uuid primary key references public.companies (id) on delete cascade,
  stale_days                  smallint not null default 7 check (stale_days between 1 and 90),
  awaiting_reply_hours        smallint not null default 2 check (awaiting_reply_hours between 1 and 72),
  report_grace_hours          smallint not null default 2 check (report_grace_hours between 0 and 48),
  daily_target_conversations  smallint check (daily_target_conversations is null or daily_target_conversations between 0 and 1000),
  daily_target_messages       smallint check (daily_target_messages is null or daily_target_messages between 0 and 5000),
  alerts_refreshed_at         timestamptz,
  updated_at                  timestamptz not null default now()
);

create trigger company_settings_touch before update on public.company_settings
  for each row execute function app.touch_updated_at();

create or replace function app.create_company_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.company_settings (company_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger companies_default_settings after insert on public.companies
  for each row execute function app.create_company_settings();

insert into public.company_settings (company_id) select id from public.companies on conflict do nothing;

create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  user_id         uuid not null references auth.users (id),
  type            text not null check (type in (
                    'next_step_overdue', 'next_step_today', 'no_next_step', 'stale_opportunity',
                    'awaiting_reply', 'low_production', 'report_missing', 'divergence_open')),
  severity        text not null check (severity in ('high', 'medium', 'low')),
  entity_type     text,
  entity_id       uuid,
  reference_date  date,
  title           text not null check (char_length(title) <= 300),
  detail          jsonb not null default '{}'::jsonb,
  status          text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  dedupe_key      text not null,
  first_seen_at   timestamptz not null default now(),
  last_seen_at    timestamptz not null default now(),
  resolved_at     timestamptz,
  dismissed_at    timestamptz,
  dismissed_by    uuid references auth.users (id),
  updated_at      timestamptz not null default now(),
  unique (company_id, dedupe_key)
);

create index alerts_open_idx on public.alerts (company_id, user_id, severity) where status = 'open';

create trigger alerts_touch before update on public.alerts for each row execute function app.touch_updated_at();

-- Dispensar (ou reabrir) um alerta: marca quem e quando.
create or replace function app.alert_dismiss_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.status = 'dismissed' and old.status <> 'dismissed' then
    new.dismissed_at := now();
    new.dismissed_by := auth.uid();
  elsif new.status = 'open' and old.status = 'dismissed' then
    new.dismissed_at := null;
    new.dismissed_by := null;
  elsif new.status <> old.status then
    raise exception 'Só é possível dispensar ou reabrir um alerta' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger alerts_dismiss_rules before update on public.alerts
  for each row execute function app.alert_dismiss_rules();

-- -----------------------------------------------------------------------------
-- Cálculo dos alertas de uma empresa
-- -----------------------------------------------------------------------------
create or replace function public.refresh_alerts(target_company uuid, now_ts timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz text;
  s public.company_settings;
  today date;
  day_end timestamptz;
  tpl public.report_templates;
  report_day date;
  prod_day date;
  d date;
  opens_at timestamptz;
  workdays smallint[];
  open_count integer;
begin
  select timezone into tz from public.companies where id = target_company and status = 'active';
  if tz is null then
    return 0;
  end if;
  select * into s from public.company_settings where company_id = target_company;
  if s is null then
    insert into public.company_settings (company_id) values (target_company) returning * into s;
  end if;

  today := (now_ts at time zone tz)::date;
  day_end := ((today + 1)::timestamp at time zone tz);

  select * into tpl from public.report_templates where company_id = target_company and active;
  workdays := coalesce(tpl.weekdays, '{1,2,3,4,5}'::smallint[]);

  -- Último relatório que já deveria ter sido enviado (abertura + tolerância).
  report_day := null;
  if tpl.id is not null then
    for i in 0..14 loop
      d := today - i;
      continue when not (extract(isodow from d)::smallint = any (tpl.weekdays));
      opens_at := ((case when tpl.reference = 'previous_day' then d + 1 else d end) + tpl.schedule_time)::timestamp at time zone tz;
      if opens_at + make_interval(hours => s.report_grace_hours) <= now_ts then
        report_day := d;
        exit;
      end if;
    end loop;
  end if;

  -- Último dia de trabalho completo (para comparar a produção com a meta).
  prod_day := null;
  for i in 1..14 loop
    d := today - i;
    if extract(isodow from d)::smallint = any (workdays) then
      prod_day := d;
      exit;
    end if;
  end loop;

  create temp table if not exists pg_temp.current_alerts (
    user_id uuid, type text, severity text, entity_type text, entity_id uuid,
    reference_date date, title text, detail jsonb, dedupe_key text
  ) on commit drop;
  -- truncate em vez de delete sem filtro: o Supabase bloqueia DELETE sem WHERE (pg_safeupdate).
  truncate pg_temp.current_alerts;

  -- 1 e 2. Próximo passo vencido ou para hoje.
  insert into pg_temp.current_alerts
  select o.owner_id,
         case when o.next_step_at < now_ts then 'next_step_overdue' else 'next_step_today' end,
         case when o.next_step_at < now_ts then 'high' else 'medium' end,
         'opportunities', o.id, null,
         case when o.next_step_at < now_ts then 'Próximo passo vencido: ' else 'Próximo passo para hoje: ' end || o.title,
         jsonb_build_object('next_step', o.next_step, 'next_step_at', o.next_step_at),
         case when o.next_step_at < now_ts then 'overdue:' else 'today:' end || o.id || ':' || o.next_step_at
    from public.opportunities o
   where o.company_id = target_company and o.status = 'open'
     and o.next_step_at is not null and o.next_step_at < day_end;

  -- 3. Sem próximo passo.
  insert into pg_temp.current_alerts
  select o.owner_id, 'no_next_step', 'low', 'opportunities', o.id, null,
         'Sem próximo passo: ' || o.title, '{}'::jsonb, 'no_next:' || o.id
    from public.opportunities o
   where o.company_id = target_company and o.status = 'open' and o.next_step is null;

  -- 4. Negociação parada.
  insert into pg_temp.current_alerts
  select o.owner_id, 'stale_opportunity', 'medium', 'opportunities', o.id, null,
         'Negociação parada: ' || o.title,
         jsonb_build_object('last_activity_at', o.last_activity_at,
                            'days', floor(extract(epoch from now_ts - o.last_activity_at) / 86400)),
         'stale:' || o.id || ':' || o.last_activity_at
    from public.opportunities o
   where o.company_id = target_company and o.status = 'open'
     and o.last_activity_at < now_ts - make_interval(days => s.stale_days);

  -- 5. Cliente esperando resposta.
  insert into pg_temp.current_alerts
  select c.owner_id, 'awaiting_reply', 'high', 'conversations', c.id, null,
         'Cliente esperando resposta: ' || ct.name,
         jsonb_build_object('since', c.last_inbound_at,
                            'hours', floor(extract(epoch from now_ts - c.last_inbound_at) / 3600)),
         'awaiting:' || c.id || ':' || c.last_inbound_at
    from public.conversations c
    join public.contacts ct on ct.id = c.contact_id
   where c.company_id = target_company and c.awaiting_reply
     and c.last_inbound_at < now_ts - make_interval(hours => s.awaiting_reply_hours);

  -- 6. Produção abaixo da referência (último dia de trabalho, quem tem WhatsApp conectado).
  if prod_day is not null and (s.daily_target_conversations is not null or s.daily_target_messages is not null) then
    insert into pg_temp.current_alerts
    select p.owner_id, 'low_production', 'medium', null, null, prod_day,
           'Produção abaixo da referência em ' || to_char(prod_day, 'DD/MM'),
           jsonb_build_object('conversations', p.conversations, 'messages', p.messages,
                              'target_conversations', s.daily_target_conversations,
                              'target_messages', s.daily_target_messages),
           'lowprod:' || p.owner_id || ':' || prod_day
      from (
        select src.owner_user_id as owner_id,
               (select count(distinct m.conversation_id) from public.messages m
                  join public.conversations c on c.id = m.conversation_id
                 where c.owner_id = src.owner_user_id and c.company_id = target_company
                   and m.sent_at >= (prod_day::timestamp at time zone tz)
                   and m.sent_at < ((prod_day + 1)::timestamp at time zone tz)) as conversations,
               (select count(*) from public.messages m
                  join public.conversations c on c.id = m.conversation_id
                 where c.owner_id = src.owner_user_id and c.company_id = target_company and m.direction = 'outbound'
                   and m.sent_at >= (prod_day::timestamp at time zone tz)
                   and m.sent_at < ((prod_day + 1)::timestamp at time zone tz)) as messages
          from public.integration_sources src
          join public.memberships mb on mb.user_id = src.owner_user_id and mb.company_id = target_company and mb.status = 'active'
         where src.company_id = target_company and src.kind = 'whatsapp_device' and src.archived_at is null
           and src.created_at < (prod_day::timestamp at time zone tz)
      ) p
     where (s.daily_target_conversations is not null and p.conversations < s.daily_target_conversations)
        or (s.daily_target_messages is not null and p.messages < s.daily_target_messages);
  end if;

  -- 7. Relatório não preenchido.
  if report_day is not null then
    insert into pg_temp.current_alerts
    select mb.user_id, 'report_missing', 'medium', null, null, report_day,
           'Relatório de ' || to_char(report_day, 'DD/MM') || ' não preenchido', '{}'::jsonb,
           'report:' || mb.user_id || ':' || report_day
      from public.memberships mb
     where mb.company_id = target_company and mb.status = 'active'
       and mb.created_at < (report_day + 1)::timestamp at time zone tz
       and not exists (
         select 1 from public.report_submissions rs
          where rs.template_id = tpl.id and rs.user_id = mb.user_id and rs.reference_date = report_day);
  end if;

  -- 8. Divergência em aberto.
  insert into pg_temp.current_alerts
  select dv.user_id, 'divergence_open', 'medium', 'divergences', dv.id, dv.reference_date,
         'Diferença para conferir: ' || q.label,
         jsonb_build_object('declared', dv.declared, 'captured', dv.captured),
         'div:' || dv.id
    from public.divergences dv
    join public.report_questions q on q.id = dv.question_id
   where dv.company_id = target_company and dv.status = 'open';

  -- Grava: cria os novos, atualiza os que continuam, reabre os resolvidos que voltaram.
  insert into public.alerts (company_id, user_id, type, severity, entity_type, entity_id, reference_date,
                             title, detail, dedupe_key, first_seen_at, last_seen_at)
  select target_company, ca.user_id, ca.type, ca.severity, ca.entity_type, ca.entity_id, ca.reference_date,
         left(ca.title, 300), ca.detail, ca.dedupe_key, now_ts, now_ts
    from pg_temp.current_alerts ca
  on conflict (company_id, dedupe_key) do update set
    user_id = excluded.user_id,
    severity = excluded.severity,
    title = excluded.title,
    detail = excluded.detail,
    last_seen_at = now_ts,
    status = case when public.alerts.status = 'resolved' then 'open' else public.alerts.status end,
    resolved_at = case when public.alerts.status = 'resolved' then null else public.alerts.resolved_at end;

  -- Resolve o que deixou de valer.
  update public.alerts a set status = 'resolved', resolved_at = now_ts
   where a.company_id = target_company and a.status = 'open'
     and not exists (select 1 from pg_temp.current_alerts ca where ca.dedupe_key = a.dedupe_key);

  update public.company_settings set alerts_refreshed_at = now_ts where company_id = target_company;
  select count(*) into open_count from public.alerts where company_id = target_company and status = 'open';
  return open_count;
end;
$$;

revoke all on function public.refresh_alerts(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.refresh_alerts(uuid, timestamptz) to service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.company_settings enable row level security;
alter table public.alerts enable row level security;

revoke all on public.company_settings, public.alerts from anon, authenticated;
grant all on public.company_settings, public.alerts to service_role;

grant select on public.company_settings to authenticated;
grant update (stale_days, awaiting_reply_hours, report_grace_hours, daily_target_conversations, daily_target_messages)
  on public.company_settings to authenticated;
create policy company_settings_select on public.company_settings for select to authenticated
  using (app.is_platform_admin() or app.is_member(company_id));
create policy company_settings_update on public.company_settings for update to authenticated
  using (app.is_leader(company_id)) with check (app.is_leader(company_id));

grant select on public.alerts to authenticated;
grant update (status) on public.alerts to authenticated;
create policy alerts_select on public.alerts for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id) or (user_id = auth.uid() and app.is_member(company_id)));
create policy alerts_update on public.alerts for update to authenticated
  using (app.is_leader(company_id) or (user_id = auth.uid() and app.is_member(company_id)))
  with check (app.is_leader(company_id) or (user_id = auth.uid() and app.is_member(company_id)));

-- Mudanças nas referências entram no histórico (o recálculo dos alertas não).
create trigger company_settings_audit
  after update of stale_days, awaiting_reply_hours, report_grace_hours, daily_target_conversations, daily_target_messages
  on public.company_settings
  for each row execute function app.audit_row();
