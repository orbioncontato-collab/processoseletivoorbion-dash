-- =============================================================================
-- Fase 1 · Núcleo comercial
-- Funil configurável, contatos, oportunidades e objeções.
--
-- Regras de acesso:
--   * Líder vê e altera tudo da empresa.
--   * Vendedor vê e altera só os contatos e oportunidades dele (owner_id).
--   * Vendedor não transfere registro para outra pessoa; o líder pode.
--   * Gatilhos garantem que contato, etapa, funil e responsável são da mesma
--     empresa da oportunidade. Nenhum registro aponta para dados de outra empresa.
--   * Nada é apagado: contatos são arquivados e oportunidades são encerradas.
-- =============================================================================

create type public.stage_kind as enum ('open', 'won', 'lost');
create type public.opportunity_status as enum ('open', 'won', 'lost');

-- -----------------------------------------------------------------------------
-- Funil e etapas
-- -----------------------------------------------------------------------------
create table public.pipelines (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, id)
);

create unique index pipelines_one_default on public.pipelines (company_id) where is_default;

create table public.pipeline_stages (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  pipeline_id  uuid not null,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  kind         public.stage_kind not null default 'open',
  position     integer not null check (position >= 0),
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  foreign key (company_id, pipeline_id) references public.pipelines (company_id, id) on delete cascade
);

create index pipeline_stages_pipeline_idx on public.pipeline_stages (pipeline_id, position);

create trigger pipelines_touch before update on public.pipelines
  for each row execute function app.touch_updated_at();
create trigger pipeline_stages_touch before update on public.pipeline_stages
  for each row execute function app.touch_updated_at();

-- Toda empresa nova ganha um funil padrão, que o líder pode ajustar.
create or replace function app.create_default_pipeline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
begin
  insert into public.pipelines (company_id, name, is_default)
  values (new.id, 'Funil principal', true)
  returning id into pid;

  insert into public.pipeline_stages (company_id, pipeline_id, name, kind, position)
  values
    (new.id, pid, 'Novo contato', 'open', 0),
    (new.id, pid, 'Qualificação', 'open', 1),
    (new.id, pid, 'Diagnóstico', 'open', 2),
    (new.id, pid, 'Proposta', 'open', 3),
    (new.id, pid, 'Negociação', 'open', 4),
    (new.id, pid, 'Ganho', 'won', 5),
    (new.id, pid, 'Perdido', 'lost', 6);
  return new;
end;
$$;

create trigger companies_default_pipeline
  after insert on public.companies
  for each row execute function app.create_default_pipeline();

-- Empresas que já existiam também recebem o funil padrão.
do $$
declare
  c record;
  pid uuid;
begin
  for c in select id from public.companies
           where not exists (select 1 from public.pipelines p where p.company_id = companies.id)
  loop
    insert into public.pipelines (company_id, name, is_default)
    values (c.id, 'Funil principal', true) returning id into pid;
    insert into public.pipeline_stages (company_id, pipeline_id, name, kind, position)
    values
      (c.id, pid, 'Novo contato', 'open', 0),
      (c.id, pid, 'Qualificação', 'open', 1),
      (c.id, pid, 'Diagnóstico', 'open', 2),
      (c.id, pid, 'Proposta', 'open', 3),
      (c.id, pid, 'Negociação', 'open', 4),
      (c.id, pid, 'Ganho', 'won', 5),
      (c.id, pid, 'Perdido', 'lost', 6);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Contatos (clientes e leads)
-- -----------------------------------------------------------------------------
create table public.contacts (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  owner_id      uuid not null references auth.users (id),
  name          text not null check (char_length(btrim(name)) between 1 and 120),
  phone_e164    text check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  email         text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  organization  text check (organization is null or char_length(organization) <= 120),
  notes         text check (notes is null or char_length(notes) <= 4000),
  source        text not null default 'manual' check (source in ('manual', 'whatsapp', 'crm', 'import', 'api')),
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, id)
);

-- Um telefone não se repete entre contatos ativos da mesma empresa.
create unique index contacts_unique_phone
  on public.contacts (company_id, phone_e164)
  where phone_e164 is not null and archived_at is null;
create index contacts_owner_idx on public.contacts (company_id, owner_id) where archived_at is null;
create index contacts_name_idx on public.contacts (company_id, lower(name));

create trigger contacts_touch before update on public.contacts
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Oportunidades
-- -----------------------------------------------------------------------------
create table public.opportunities (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete cascade,
  contact_id            uuid not null,
  owner_id              uuid not null references auth.users (id),
  pipeline_id           uuid not null,
  stage_id              uuid not null references public.pipeline_stages (id),
  title                 text not null check (char_length(btrim(title)) between 1 and 160),
  product               text check (product is null or char_length(product) <= 120),
  value_cents           bigint not null default 0 check (value_cents between 0 and 100000000000),
  status                public.opportunity_status not null default 'open',
  next_step             text check (next_step is null or char_length(next_step) <= 280),
  next_step_at          timestamptz,
  expected_close_date   date,
  lost_reason           text check (lost_reason is null or lost_reason in
                          ('preco', 'timing', 'concorrente', 'sem_resposta', 'sem_fit', 'sem_orcamento', 'outro')),
  lost_reason_detail    text check (lost_reason_detail is null or char_length(lost_reason_detail) <= 500),
  closed_at             timestamptz,
  last_activity_at      timestamptz not null default now(),
  source                text not null default 'manual' check (source in ('manual', 'whatsapp', 'crm', 'import', 'api')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  foreign key (company_id, contact_id) references public.contacts (company_id, id),
  foreign key (company_id, pipeline_id) references public.pipelines (company_id, id),
  -- Perda exige motivo.
  constraint lost_needs_reason check (status <> 'lost' or lost_reason is not null),
  -- Próximo passo com data precisa ter descrição.
  constraint next_step_date_needs_text check (next_step_at is null or next_step is not null)
);

create index opportunities_company_status_idx on public.opportunities (company_id, status, stage_id);
create index opportunities_owner_idx on public.opportunities (company_id, owner_id, status);
create index opportunities_next_step_idx on public.opportunities (company_id, next_step_at) where status = 'open';
create index opportunities_contact_idx on public.opportunities (contact_id);

-- -----------------------------------------------------------------------------
-- Objeções levantadas na negociação
-- -----------------------------------------------------------------------------
create table public.opportunity_objections (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  description     text not null check (char_length(btrim(description)) between 1 and 500),
  category        text not null default 'outro' check (category in
                    ('preco', 'tempo', 'confianca', 'necessidade', 'concorrente', 'decisor', 'outro')),
  status          text not null default 'open' check (status in ('open', 'handled')),
  created_by      uuid references auth.users (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index objections_opportunity_idx on public.opportunity_objections (opportunity_id, created_at);

create trigger objections_touch before update on public.opportunity_objections
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Integridade entre empresas e regras de negócio
-- -----------------------------------------------------------------------------

-- A empresa de um registro nunca muda.
create or replace function app.block_company_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'A empresa de um registro não pode ser alterada';
  end if;
  return new;
end;
$$;

create trigger pipelines_company_fixed before update on public.pipelines
  for each row execute function app.block_company_change();
create trigger pipeline_stages_company_fixed before update on public.pipeline_stages
  for each row execute function app.block_company_change();
create trigger contacts_company_fixed before update on public.contacts
  for each row execute function app.block_company_change();
create trigger opportunities_company_fixed before update on public.opportunities
  for each row execute function app.block_company_change();
create trigger objections_company_fixed before update on public.opportunity_objections
  for each row execute function app.block_company_change();

-- O responsável precisa ser membro ativo da empresa.
create or replace function app.ensure_owner_is_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships
    where company_id = new.company_id and user_id = new.owner_id and status = 'active'
  ) then
    raise exception 'O responsável precisa ser membro ativo da empresa'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger contacts_owner_member before insert or update of owner_id on public.contacts
  for each row execute function app.ensure_owner_is_member();
create trigger opportunities_owner_member before insert or update of owner_id on public.opportunities
  for each row execute function app.ensure_owner_is_member();

-- Regras da oportunidade:
--   * etapa precisa ser do mesmo funil e da mesma empresa, e não arquivada;
--   * a situação (aberta, ganha, perdida) segue o tipo da etapa;
--   * ao encerrar, grava closed_at e limpa o próximo passo; ao reabrir, limpa o motivo de perda;
--   * last_activity_at marca a última mudança real (usado nos alertas de negociação parada).
create or replace function app.opportunity_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  st record;
begin
  select company_id, pipeline_id, kind, archived_at into st
  from public.pipeline_stages where id = new.stage_id;

  if st is null or st.company_id <> new.company_id or st.pipeline_id <> new.pipeline_id then
    raise exception 'Etapa inválida para este funil' using errcode = 'check_violation';
  end if;
  if st.archived_at is not null and (tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id) then
    raise exception 'Etapa arquivada' using errcode = 'check_violation';
  end if;

  new.status := st.kind::text::public.opportunity_status;

  if new.status = 'open' then
    new.closed_at := null;
    new.lost_reason := null;
    new.lost_reason_detail := null;
  else
    if tg_op = 'INSERT' or old.status = 'open' then
      new.closed_at := now();
    end if;
    new.next_step := null;
    new.next_step_at := null;
    if new.status = 'won' then
      new.lost_reason := null;
      new.lost_reason_detail := null;
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.last_activity_at := now();
  elsif (new.stage_id, new.value_cents, new.next_step, new.next_step_at, new.title, new.product,
         new.owner_id, new.expected_close_date, new.lost_reason, new.lost_reason_detail)
        is distinct from
        (old.stage_id, old.value_cents, old.next_step, old.next_step_at, old.title, old.product,
         old.owner_id, old.expected_close_date, old.lost_reason, old.lost_reason_detail) then
    new.last_activity_at := now();
  end if;

  return new;
end;
$$;

create trigger opportunities_rules before insert or update on public.opportunities
  for each row execute function app.opportunity_rules();

-- Objeção precisa ser da mesma empresa da oportunidade; registrar uma objeção
-- também conta como movimentação da oportunidade.
create or replace function app.objection_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.opportunities
    where id = new.opportunity_id and company_id = new.company_id
  ) then
    raise exception 'Oportunidade inválida' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and new.opportunity_id <> old.opportunity_id then
    raise exception 'A objeção não pode mudar de oportunidade';
  end if;
  update public.opportunities set last_activity_at = now() where id = new.opportunity_id;
  return new;
end;
$$;

create trigger objections_rules before insert or update on public.opportunity_objections
  for each row execute function app.objection_rules();

-- Regras do funil:
--   * etapa precisa pertencer a funil da mesma empresa (garantido pela FK composta);
--   * não arquivar etapa com oportunidades abertas;
--   * o funil precisa manter pelo menos uma etapa de ganho e uma de perda ativas.
create or replace function app.stage_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.archived_at is not null and old.archived_at is null then
    if exists (select 1 from public.opportunities where stage_id = new.id and status = 'open') then
      raise exception 'Mova as oportunidades abertas antes de arquivar esta etapa'
        using errcode = 'check_violation';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.kind <> old.kind
     and exists (select 1 from public.opportunities where stage_id = new.id) then
    raise exception 'Não é possível mudar o tipo de uma etapa que já tem oportunidades'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger pipeline_stages_rules before update on public.pipeline_stages
  for each row execute function app.stage_rules();

create or replace function app.stage_kinds_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid := coalesce(new.pipeline_id, old.pipeline_id);
begin
  if not exists (select 1 from public.pipeline_stages where pipeline_id = pid and kind = 'won' and archived_at is null)
     or not exists (select 1 from public.pipeline_stages where pipeline_id = pid and kind = 'lost' and archived_at is null)
     or not exists (select 1 from public.pipeline_stages where pipeline_id = pid and kind = 'open' and archived_at is null) then
    raise exception 'O funil precisa de pelo menos uma etapa aberta, uma de ganho e uma de perda'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger pipeline_stages_kinds_guard
  after update on public.pipeline_stages
  deferrable initially deferred
  for each row execute function app.stage_kinds_guard();

-- -----------------------------------------------------------------------------
-- Auditoria
-- -----------------------------------------------------------------------------
create trigger pipelines_audit after insert or update or delete on public.pipelines
  for each row execute function app.audit_row();
create trigger pipeline_stages_audit after insert or update or delete on public.pipeline_stages
  for each row execute function app.audit_row();
create trigger contacts_audit after insert or update or delete on public.contacts
  for each row execute function app.audit_row();
create trigger opportunities_audit after insert or update or delete on public.opportunities
  for each row execute function app.audit_row();
create trigger objections_audit after insert or update or delete on public.opportunity_objections
  for each row execute function app.audit_row();

-- last_activity_at muda sozinho em toda alteração: não precisa poluir o histórico.
create or replace function app.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor record;
  row_data jsonb;
  old_data jsonb;
  diff jsonb := '{}'::jsonb;
  k text;
  entity uuid;
  company uuid;
begin
  select * into actor from app.current_actor();

  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
  else
    row_data := to_jsonb(new);
  end if;

  entity := (row_data ->> 'id')::uuid;
  company := case
    when tg_table_name = 'companies' then entity
    else (row_data ->> 'company_id')::uuid
  end;

  if tg_op = 'UPDATE' then
    old_data := to_jsonb(old);
    for k in select jsonb_object_keys(row_data) loop
      if k not in ('updated_at', 'last_activity_at')
         and (row_data -> k) is distinct from (old_data -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('de', old_data -> k, 'para', row_data -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return new;
    end if;
  else
    diff := row_data - 'updated_at' - 'last_activity_at';
  end if;

  if company is not null and not exists (select 1 from public.companies where id = company) then
    company := null;
  end if;

  -- Registros filhos levam a oportunidade junto, para montar a linha do tempo
  -- da negociação e aplicar a mesma regra de visibilidade.
  insert into public.activities (company_id, actor_type, actor_id, action, entity_type, entity_id, changes, metadata)
  values (
    company, actor.actor_type, actor.actor_id, lower(tg_op), tg_table_name, entity, diff,
    case when row_data ? 'opportunity_id'
      then jsonb_build_object('opportunity_id', row_data -> 'opportunity_id')
      else '{}'::jsonb end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.contacts enable row level security;
alter table public.opportunities enable row level security;
alter table public.opportunity_objections enable row level security;

revoke all on public.pipelines, public.pipeline_stages, public.contacts,
  public.opportunities, public.opportunity_objections from anon, authenticated;
grant all on public.pipelines, public.pipeline_stages, public.contacts,
  public.opportunities, public.opportunity_objections to service_role;

-- Escrita liberada só nos campos que a pessoa pode editar. Situação, datas de
-- encerramento, origem e marcas de tempo são preenchidas pelo sistema.
grant select on public.pipelines, public.pipeline_stages, public.contacts,
  public.opportunities, public.opportunity_objections to authenticated;

grant insert (company_id, pipeline_id, name, kind, position) on public.pipeline_stages to authenticated;
grant update (name, kind, position, archived_at) on public.pipeline_stages to authenticated;

grant insert (company_id, owner_id, name, phone_e164, email, organization, notes) on public.contacts to authenticated;
grant update (owner_id, name, phone_e164, email, organization, notes, archived_at) on public.contacts to authenticated;

grant insert (company_id, contact_id, owner_id, pipeline_id, stage_id, title, product, value_cents,
  next_step, next_step_at, expected_close_date, lost_reason, lost_reason_detail) on public.opportunities to authenticated;
grant update (contact_id, owner_id, stage_id, title, product, value_cents, next_step, next_step_at,
  expected_close_date, lost_reason, lost_reason_detail) on public.opportunities to authenticated;

grant insert (company_id, opportunity_id, description, category) on public.opportunity_objections to authenticated;
grant update (description, category, status) on public.opportunity_objections to authenticated;
grant delete on public.opportunity_objections to authenticated;

-- Funil: todos da empresa veem; só o líder mexe nas etapas.
create policy pipelines_select on public.pipelines for select to authenticated
  using (app.is_platform_admin() or app.is_member(company_id));

create policy stages_select on public.pipeline_stages for select to authenticated
  using (app.is_platform_admin() or app.is_member(company_id));
create policy stages_insert on public.pipeline_stages for insert to authenticated
  with check (app.is_leader(company_id));
create policy stages_update on public.pipeline_stages for update to authenticated
  using (app.is_leader(company_id))
  with check (app.is_leader(company_id));

-- Contatos: líder vê todos; vendedor vê os dele.
create policy contacts_select on public.contacts for select to authenticated
  using (
    app.is_platform_admin()
    or app.is_leader(company_id)
    or (owner_id = auth.uid() and app.is_member(company_id))
  );
create policy contacts_insert on public.contacts for insert to authenticated
  with check (
    app.is_leader(company_id)
    or (owner_id = auth.uid() and app.is_member(company_id))
  );
create policy contacts_update on public.contacts for update to authenticated
  using (app.is_leader(company_id) or (owner_id = auth.uid() and app.is_member(company_id)))
  with check (app.is_leader(company_id) or (owner_id = auth.uid() and app.is_member(company_id)));

-- Oportunidades: mesma regra dos contatos.
create policy opportunities_select on public.opportunities for select to authenticated
  using (
    app.is_platform_admin()
    or app.is_leader(company_id)
    or (owner_id = auth.uid() and app.is_member(company_id))
  );
create policy opportunities_insert on public.opportunities for insert to authenticated
  with check (
    app.is_leader(company_id)
    or (owner_id = auth.uid() and app.is_member(company_id))
  );
create policy opportunities_update on public.opportunities for update to authenticated
  using (app.is_leader(company_id) or (owner_id = auth.uid() and app.is_member(company_id)))
  with check (app.is_leader(company_id) or (owner_id = auth.uid() and app.is_member(company_id)));

-- Vendedor só cria oportunidade para contato que ele enxerga (o dele).
create or replace function app.can_see_contact(target uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.contacts where id = target);
$$;
grant execute on function app.can_see_contact(uuid) to authenticated;

create policy opportunities_contact_visible on public.opportunities as restrictive for insert to authenticated
  with check (app.can_see_contact(contact_id));
create policy opportunities_contact_visible_update on public.opportunities as restrictive for update to authenticated
  using (true)
  with check (app.can_see_contact(contact_id));

-- Objeções: quem enxerga a oportunidade enxerga e registra objeções.
create policy objections_select on public.opportunity_objections for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy objections_insert on public.opportunity_objections for insert to authenticated
  with check (
    app.is_member(company_id)
    and exists (select 1 from public.opportunities o where o.id = opportunity_id)
  );
create policy objections_update on public.opportunity_objections for update to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id))
  with check (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy objections_delete on public.opportunity_objections for delete to authenticated
  using (
    exists (select 1 from public.opportunities o where o.id = opportunity_id)
    and (created_by = auth.uid() or app.is_leader(company_id))
  );

-- Histórico: o vendedor passa a ver também o histórico dos registros que ele enxerga,
-- mesmo quando quem alterou foi outra pessoa (ex.: o líder mudou a etapa).
drop policy activities_select on public.activities;
create policy activities_select on public.activities for select to authenticated
  using (
    app.is_platform_admin()
    or (company_id is not null and app.is_leader(company_id))
    or (
      company_id is not null and app.is_member(company_id) and (
        actor_id = auth.uid()
        or (entity_type = 'opportunities'
            and exists (select 1 from public.opportunities o where o.id = activities.entity_id))
        or (entity_type = 'contacts'
            and exists (select 1 from public.contacts c where c.id = activities.entity_id))
        or (entity_type = 'opportunity_objections'
            and exists (select 1 from public.opportunities o
                        where o.id = (activities.metadata ->> 'opportunity_id')::uuid))
      )
    )
  );

create index activities_metadata_opportunity_idx
  on public.activities (((metadata ->> 'opportunity_id')))
  where metadata ? 'opportunity_id';
