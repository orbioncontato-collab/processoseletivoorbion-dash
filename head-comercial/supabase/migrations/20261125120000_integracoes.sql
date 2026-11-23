-- =============================================================================
-- Fase 2 · Camada de integrações
-- Toda fonte externa (webhook, CRM, planilha, WhatsApp) entra pelo mesmo caminho:
--   1. o evento chega e é guardado bruto em raw_events;
--   2. o processador traduz para o formato padrão (contato, oportunidade, mensagem);
--   3. o resultado é gravado com autor "integração" no histórico.
--
-- Acesso:
--   * Líder e admin da plataforma enxergam as fontes e os eventos da empresa.
--   * Toda escrita é feita pelo servidor com a chave secreta, depois de checar
--     a permissão no código (as fontes guardam a impressão digital de chaves).
-- =============================================================================

create type public.source_kind as enum ('webhook', 'crm', 'import', 'whatsapp_device', 'whatsapp_cloud');

create table public.integration_sources (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  kind           public.source_kind not null,
  provider       text not null default 'generic' check (provider ~ '^[a-z0-9_]{2,30}$'),
  name           text not null check (char_length(btrim(name)) between 1 and 80),
  status         text not null default 'active'
                   check (status in ('active', 'paused', 'pending', 'disconnected', 'error')),
  -- Vendedor dono do número (WhatsApp) ou responsável padrão dos registros importados.
  owner_user_id  uuid references auth.users (id) on delete set null,
  -- Configuração NÃO secreta (ex.: mapeamento de etapas). Segredos nunca vão aqui.
  config         jsonb not null default '{}'::jsonb,
  -- Impressão digital (SHA-256) da chave de acesso. A chave em si só é mostrada uma vez.
  secret_hash    text check (secret_hash is null or secret_hash ~ '^[0-9a-f]{64}$'),
  secret_hint    text check (secret_hint is null or char_length(secret_hint) <= 8),
  last_event_at  timestamptz,
  last_error     text check (last_error is null or char_length(last_error) <= 1000),
  created_by     uuid references auth.users (id) on delete set null,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (company_id, id)
);

create index integration_sources_company_idx on public.integration_sources (company_id) where archived_at is null;

create trigger integration_sources_touch before update on public.integration_sources
  for each row execute function app.touch_updated_at();
create trigger integration_sources_company_fixed before update on public.integration_sources
  for each row execute function app.block_company_change();

create table public.raw_events (
  id               bigint generated always as identity primary key,
  company_id       uuid not null,
  source_id        uuid not null,
  event_type       text not null check (event_type ~ '^[a-z_]+(\.[a-z_]+)*$' and char_length(event_type) <= 60),
  -- Chave de idempotência enviada pela fonte: a mesma entrega não é processada duas vezes.
  idempotency_key  text check (idempotency_key is null or char_length(idempotency_key) <= 200),
  payload          jsonb not null,
  status           text not null default 'pending' check (status in ('pending', 'processed', 'failed', 'ignored')),
  attempts         integer not null default 0 check (attempts >= 0),
  error            text check (error is null or char_length(error) <= 1000),
  result           jsonb,
  received_at      timestamptz not null default now(),
  processed_at     timestamptz,
  foreign key (company_id, source_id) references public.integration_sources (company_id, id) on delete cascade,
  constraint payload_size check (pg_column_size(payload) <= 262144)
);

create unique index raw_events_idempotency
  on public.raw_events (source_id, idempotency_key) where idempotency_key is not null;
create index raw_events_company_status_idx on public.raw_events (company_id, status, received_at desc);
create index raw_events_source_idx on public.raw_events (source_id, received_at desc);

create table public.external_refs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  source_id    uuid not null,
  entity_type  text not null check (entity_type in ('contact', 'opportunity', 'conversation', 'message')),
  entity_id    uuid not null,
  external_id  text not null check (char_length(external_id) between 1 and 200),
  created_at   timestamptz not null default now(),
  foreign key (company_id, source_id) references public.integration_sources (company_id, id) on delete cascade,
  unique (source_id, entity_type, external_id)
);

create index external_refs_entity_idx on public.external_refs (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- Auditoria: a fonte entra no histórico, mas a impressão digital da chave não.
-- -----------------------------------------------------------------------------
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
      if k not in ('updated_at', 'last_activity_at', 'last_event_at', 'secret_hash')
         and (row_data -> k) is distinct from (old_data -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('de', old_data -> k, 'para', row_data -> k));
      end if;
    end loop;
    if (row_data -> 'secret_hash') is distinct from (old_data -> 'secret_hash') then
      diff := diff || jsonb_build_object('chave', 'trocada');
    end if;
    if diff = '{}'::jsonb then
      return new;
    end if;
  else
    diff := row_data - 'updated_at' - 'last_activity_at' - 'last_event_at' - 'secret_hash';
  end if;

  if company is not null and not exists (select 1 from public.companies where id = company) then
    company := null;
  end if;

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

create trigger integration_sources_audit after insert or update or delete on public.integration_sources
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.integration_sources enable row level security;
alter table public.raw_events enable row level security;
alter table public.external_refs enable row level security;

revoke all on public.integration_sources, public.raw_events, public.external_refs from anon, authenticated;
grant all on public.integration_sources, public.raw_events, public.external_refs to service_role;

-- Leitura: líder e admin. A impressão digital da chave nunca é lida pelo app.
grant select (id, company_id, kind, provider, name, status, owner_user_id, config, secret_hint,
  last_event_at, last_error, created_by, archived_at, created_at, updated_at)
  on public.integration_sources to authenticated;
grant select on public.raw_events, public.external_refs to authenticated;

create policy integration_sources_select on public.integration_sources for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id));
create policy raw_events_select on public.raw_events for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id));
create policy external_refs_select on public.external_refs for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id));

-- Origem "integração" passa a ser aceita nos registros criados por fontes externas.
-- (contacts.source e opportunities.source já aceitam 'crm', 'import', 'api', 'whatsapp'.)
