-- =============================================================================
-- Fase 3 · Relatórios configuráveis e cruzamento com dados capturados
--
--   * A administração da plataforma define o modelo de cada empresa (perguntas,
--     horário, dias e se o relatório é do dia ou do dia anterior).
--   * O vendedor (ou o líder, quando também vende) responde.
--   * Perguntas de número ou valor podem ser ligadas a um número capturado pelo
--     sistema. Diferença acima da tolerância vira uma divergência.
--   * Divergência é informação a verificar: o vendedor explica, o líder verifica.
-- =============================================================================

create table public.report_templates (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  name            text not null default 'Relatório do dia' check (char_length(btrim(name)) between 1 and 80),
  active          boolean not null default true,
  schedule_time   time not null default '18:00',
  reference       text not null default 'same_day' check (reference in ('same_day', 'previous_day')),
  weekdays        smallint[] not null default '{1,2,3,4,5}'
                    check (cardinality(weekdays) between 1 and 7 and weekdays <@ '{1,2,3,4,5,6,7}'::smallint[]),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, id)
);

create unique index report_templates_one_active on public.report_templates (company_id) where active;

create table public.report_questions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null,
  template_id      uuid not null,
  position         integer not null default 0,
  label            text not null check (char_length(btrim(label)) between 1 and 200),
  help             text check (help is null or char_length(help) <= 300),
  kind             text not null check (kind in ('number', 'currency', 'text', 'single_choice', 'multi_choice', 'yes_no')),
  options          text[] not null default '{}',
  required         boolean not null default true,
  metric_key       text check (metric_key is null or metric_key in (
                     'wa_conversations', 'wa_conversations_started', 'wa_messages_sent',
                     'opportunities_created', 'opportunities_won', 'revenue_won', 'stage_entries')),
  metric_stage_id  uuid references public.pipeline_stages (id) on delete set null,
  tolerance_pct    smallint not null default 20 check (tolerance_pct between 0 and 100),
  tolerance_abs    numeric not null default 1 check (tolerance_abs >= 0),
  archived_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (company_id, template_id) references public.report_templates (company_id, id) on delete cascade,
  unique (company_id, id),
  -- Só número e valor podem ser comparados com dados capturados.
  constraint metric_only_numeric check (metric_key is null or kind in ('number', 'currency')),
  -- Entradas em etapa precisam dizer qual etapa.
  constraint stage_metric_needs_stage check (metric_key is distinct from 'stage_entries' or metric_stage_id is not null),
  -- Perguntas de escolha precisam de pelo menos duas opções.
  constraint choices_need_options check (kind not in ('single_choice', 'multi_choice') or cardinality(options) >= 2)
);

create index report_questions_template_idx on public.report_questions (template_id, position) where archived_at is null;

create table public.report_submissions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null,
  template_id     uuid not null,
  user_id         uuid not null default auth.uid() references auth.users (id),
  reference_date  date not null,
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (company_id, template_id) references public.report_templates (company_id, id) on delete cascade,
  unique (template_id, user_id, reference_date),
  unique (company_id, id)
);

create index report_submissions_company_date_idx on public.report_submissions (company_id, reference_date desc);

create table public.report_answers (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null,
  submission_id  uuid not null,
  question_id    uuid not null,
  value_number   numeric,
  value_text     text check (value_text is null or char_length(value_text) <= 4000),
  value_options  text[],
  foreign key (company_id, submission_id) references public.report_submissions (company_id, id) on delete cascade,
  foreign key (company_id, question_id) references public.report_questions (company_id, id),
  unique (submission_id, question_id)
);

create table public.divergences (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  user_id         uuid not null references auth.users (id),
  reference_date  date not null,
  question_id     uuid not null,
  metric_key      text not null,
  declared        numeric not null,
  captured        numeric not null,
  status          text not null default 'open' check (status in ('open', 'justified', 'verified')),
  justification   text check (justification is null or char_length(justification) <= 1000),
  justified_at    timestamptz,
  verified_by     uuid references auth.users (id),
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  foreign key (company_id, question_id) references public.report_questions (company_id, id) on delete cascade,
  unique (question_id, user_id, reference_date)
);

create index divergences_company_status_idx on public.divergences (company_id, status, reference_date desc);
create index divergences_user_idx on public.divergences (company_id, user_id, reference_date desc);

create trigger report_templates_touch before update on public.report_templates for each row execute function app.touch_updated_at();
create trigger report_questions_touch before update on public.report_questions for each row execute function app.touch_updated_at();
create trigger report_submissions_touch before update on public.report_submissions for each row execute function app.touch_updated_at();
create trigger divergences_touch before update on public.divergences for each row execute function app.touch_updated_at();

create trigger report_templates_company_fixed before update on public.report_templates for each row execute function app.block_company_change();
create trigger report_questions_company_fixed before update on public.report_questions for each row execute function app.block_company_change();
create trigger report_submissions_company_fixed before update on public.report_submissions for each row execute function app.block_company_change();
create trigger divergences_company_fixed before update on public.divergences for each row execute function app.block_company_change();

-- A resposta precisa ser de uma pergunta do mesmo modelo do envio.
create or replace function app.answer_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.report_submissions s
    join public.report_questions q on q.template_id = s.template_id
    where s.id = new.submission_id and q.id = new.question_id
  ) then
    raise exception 'Pergunta não pertence a este relatório' using errcode = 'check_violation';
  end if;
  update public.report_submissions set updated_at = now() where id = new.submission_id;
  return new;
end;
$$;

create trigger report_answers_rules before insert or update on public.report_answers
  for each row execute function app.answer_rules();

-- Fluxo da divergência:
--   * vendedor (dono) explica: status 'justified' com justificativa;
--   * líder verifica ('verified') ou reabre ('open');
--   * o servidor (chave secreta, sem usuário) pode tudo.
create or replace function app.divergence_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  leader boolean;
begin
  if uid is null then
    return new;
  end if;
  leader := app.is_leader(new.company_id);

  if new.status = 'justified' then
    if coalesce(char_length(btrim(new.justification)), 0) < 3 then
      raise exception 'Escreva uma explicação' using errcode = 'check_violation';
    end if;
    if old.status = 'verified' and not leader then
      raise exception 'Divergência já verificada pelo líder' using errcode = 'check_violation';
    end if;
    new.justified_at := now();
  elsif new.status = 'verified' then
    if not leader then
      raise exception 'Só o líder verifica divergências' using errcode = 'insufficient_privilege';
    end if;
    new.verified_by := uid;
    new.verified_at := now();
  elsif new.status = 'open' and old.status <> 'open' then
    if not leader then
      raise exception 'Só o líder reabre divergências' using errcode = 'insufficient_privilege';
    end if;
    new.verified_by := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger divergences_rules before update on public.divergences
  for each row execute function app.divergence_rules();

-- Auditoria (o relatório preenchido e o fluxo das divergências entram no histórico).
create trigger report_templates_audit after insert or update on public.report_templates for each row execute function app.audit_row();
create trigger report_questions_audit after insert or update on public.report_questions for each row execute function app.audit_row();
create trigger report_submissions_audit after insert on public.report_submissions for each row execute function app.audit_row();
create trigger divergences_audit after insert or update of status on public.divergences for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- Números capturados de uma pessoa num período (security invoker: respeita o RLS)
-- -----------------------------------------------------------------------------
create or replace function public.captured_metrics(
  target_company uuid, target_user uuid, period_start timestamptz, period_end timestamptz
)
returns table (metric_key text, stage_id uuid, value numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'wa_conversations', null::uuid, count(distinct m.conversation_id)::numeric
    from public.messages m join public.conversations c on c.id = m.conversation_id
   where c.company_id = target_company and c.owner_id = target_user
     and m.sent_at >= period_start and m.sent_at < period_end
  union all
  select 'wa_conversations_started', null, count(*)::numeric
    from public.conversations c
   where c.company_id = target_company and c.owner_id = target_user
     and c.started_at >= period_start and c.started_at < period_end
  union all
  select 'wa_messages_sent', null, count(*)::numeric
    from public.messages m join public.conversations c on c.id = m.conversation_id
   where c.company_id = target_company and c.owner_id = target_user and m.direction = 'outbound'
     and m.sent_at >= period_start and m.sent_at < period_end
  union all
  select 'opportunities_created', null, count(*)::numeric
    from public.opportunities o
   where o.company_id = target_company and o.owner_id = target_user
     and o.created_at >= period_start and o.created_at < period_end
  union all
  select 'opportunities_won', null, count(*)::numeric
    from public.opportunities o
   where o.company_id = target_company and o.owner_id = target_user and o.status = 'won'
     and o.closed_at >= period_start and o.closed_at < period_end
  union all
  select 'revenue_won', null, coalesce(sum(o.value_cents), 0)::numeric
    from public.opportunities o
   where o.company_id = target_company and o.owner_id = target_user and o.status = 'won'
     and o.closed_at >= period_start and o.closed_at < period_end
  union all
  select 'stage_entries', s.stage_id, count(distinct s.entity_id)::numeric
    from (
      select a.entity_id,
             coalesce(a.changes -> 'stage_id' ->> 'para', case when a.action = 'insert' then a.changes ->> 'stage_id' end)::uuid as stage_id
        from public.activities a
       where a.company_id = target_company and a.entity_type = 'opportunities'
         and a.occurred_at >= period_start and a.occurred_at < period_end
         and a.changes ? 'stage_id'
    ) s
    join public.opportunities o on o.id = s.entity_id
   where o.owner_id = target_user and s.stage_id is not null
   group by s.stage_id;
$$;

revoke all on function public.captured_metrics(uuid, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.captured_metrics(uuid, uuid, timestamptz, timestamptz) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.report_templates enable row level security;
alter table public.report_questions enable row level security;
alter table public.report_submissions enable row level security;
alter table public.report_answers enable row level security;
alter table public.divergences enable row level security;

revoke all on public.report_templates, public.report_questions, public.report_submissions,
  public.report_answers, public.divergences from anon, authenticated;
grant all on public.report_templates, public.report_questions, public.report_submissions,
  public.report_answers, public.divergences to service_role;

grant select on public.report_templates, public.report_questions, public.report_submissions,
  public.report_answers, public.divergences to authenticated;

-- Modelo e perguntas: a empresa toda lê; só a administração da plataforma escreve.
grant insert, update on public.report_templates, public.report_questions to authenticated;
create policy report_templates_select on public.report_templates for select to authenticated
  using (app.is_platform_admin() or app.is_member(company_id));
create policy report_templates_write on public.report_templates for insert to authenticated
  with check (app.is_platform_admin());
create policy report_templates_update on public.report_templates for update to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());
create policy report_questions_select on public.report_questions for select to authenticated
  using (app.is_platform_admin() or app.is_member(company_id));
create policy report_questions_write on public.report_questions for insert to authenticated
  with check (app.is_platform_admin());
create policy report_questions_update on public.report_questions for update to authenticated
  using (app.is_platform_admin()) with check (app.is_platform_admin());

-- Envios: cada um envia o seu; líder vê os do time.
grant insert (company_id, template_id, user_id, reference_date) on public.report_submissions to authenticated;
create policy report_submissions_select on public.report_submissions for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id) or (user_id = auth.uid() and app.is_member(company_id)));
create policy report_submissions_insert on public.report_submissions for insert to authenticated
  with check (user_id = auth.uid() and app.is_member(company_id));

-- Respostas: de quem enviou.
grant insert (company_id, submission_id, question_id, value_number, value_text, value_options) on public.report_answers to authenticated;
grant update (value_number, value_text, value_options) on public.report_answers to authenticated;
create policy report_answers_select on public.report_answers for select to authenticated
  using (exists (select 1 from public.report_submissions s where s.id = report_answers.submission_id));
create policy report_answers_insert on public.report_answers for insert to authenticated
  with check (exists (select 1 from public.report_submissions s where s.id = submission_id and s.user_id = auth.uid()));
create policy report_answers_update on public.report_answers for update to authenticated
  using (exists (select 1 from public.report_submissions s where s.id = submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.report_submissions s where s.id = submission_id and s.user_id = auth.uid()));

-- Divergências: criadas pelo servidor; dono explica, líder verifica.
grant update (status, justification) on public.divergences to authenticated;
create policy divergences_select on public.divergences for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id) or (user_id = auth.uid() and app.is_member(company_id)));
create policy divergences_update on public.divergences for update to authenticated
  using (app.is_leader(company_id) or (user_id = auth.uid() and app.is_member(company_id)))
  with check (app.is_leader(company_id) or (user_id = auth.uid() and app.is_member(company_id)));
