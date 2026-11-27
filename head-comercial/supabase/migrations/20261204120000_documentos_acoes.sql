-- =============================================================================
-- Fase 8 · Documentos comerciais com versões e planos de ação
--
--   * Documento: playbook, roteiro, política de preço, processo, perfil de
--     cliente ideal. Cada mudança vira uma versão nova; nada é sobrescrito.
--     A versão publicada é a que a equipe vê. Rascunhos (inclusive os
--     propostos pelo Estrategista Comercial) só o líder vê até publicar.
--   * Ação: tarefa com responsável, prazo, prioridade, situação e origem
--     (líder, agente, análise, alerta).
--   * Escritas pelo servidor, depois da checagem de permissão no código.
-- =============================================================================

create table public.commercial_documents (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  title              text not null check (char_length(btrim(title)) between 1 and 200),
  kind               text not null default 'other' check (kind in ('playbook', 'script', 'pricing', 'process', 'icp', 'other')),
  published_version  integer,
  latest_version     integer not null default 0,
  created_by         uuid references auth.users (id) on delete set null,
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (company_id, id)
);

create index commercial_documents_company_idx on public.commercial_documents (company_id) where archived_at is null;

create table public.document_versions (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null,
  document_id  uuid not null,
  -- Preenchido pelo banco com o próximo número (gatilho document_versions_number).
  version      integer not null default 0 check (version > 0),
  content      text not null check (char_length(content) between 1 and 100000),
  change_note  text not null default '' check (char_length(change_note) <= 1000),
  author_type  text not null default 'user' check (author_type in ('user', 'agent')),
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  foreign key (company_id, document_id) references public.commercial_documents (company_id, id) on delete cascade,
  unique (document_id, version)
);

-- Número da versão é sempre o próximo; o documento acompanha.
create or replace function app.document_version_next()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_v integer;
begin
  update public.commercial_documents
     set latest_version = latest_version + 1, updated_at = now()
   where id = new.document_id and company_id = new.company_id
  returning latest_version into next_v;
  if next_v is null then
    raise exception 'Documento não encontrado.' using errcode = 'P0001';
  end if;
  new.version := next_v;
  return new;
end;
$$;

create trigger document_versions_number before insert on public.document_versions
  for each row execute function app.document_version_next();

create or replace function app.document_versions_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'Versões de documento não podem ser alteradas.' using errcode = 'P0001';
end;
$$;

create trigger document_versions_no_change before update or delete on public.document_versions
  for each row execute function app.document_versions_immutable();

-- Só publica versão que existe.
create or replace function app.document_publish_check()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.published_version is not null and new.published_version is distinct from old.published_version
     and not exists (select 1 from public.document_versions v where v.document_id = new.id and v.version = new.published_version) then
    raise exception 'Versão inexistente.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger commercial_documents_publish before update of published_version on public.commercial_documents
  for each row execute function app.document_publish_check();
create trigger commercial_documents_touch before update on public.commercial_documents
  for each row execute function app.touch_updated_at();
create trigger commercial_documents_company_fixed before update on public.commercial_documents
  for each row execute function app.block_company_change();
create trigger commercial_documents_audit after insert or update of title, published_version, archived_at
  on public.commercial_documents for each row execute function app.audit_row();
create trigger document_versions_audit after insert on public.document_versions
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- Planos de ação
-- -----------------------------------------------------------------------------
create table public.action_items (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  description   text not null default '' check (char_length(description) <= 4000),
  owner_id      uuid not null references auth.users (id),
  due_date      date,
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status        text not null default 'open' check (status in ('open', 'doing', 'done', 'canceled')),
  source        text not null default 'leader' check (source in ('leader', 'self', 'agent', 'analysis', 'alert')),
  source_ref    text check (source_ref is null or char_length(source_ref) <= 300),
  created_by    uuid references auth.users (id) on delete set null,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index action_items_owner_idx on public.action_items (company_id, owner_id, status, due_date);

create or replace function app.action_item_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.memberships m where m.company_id = new.company_id and m.user_id = new.owner_id and m.status = 'active') then
    raise exception 'O responsável não faz parte da equipe.' using errcode = 'P0001';
  end if;
  if new.status = 'done' then new.completed_at := coalesce(new.completed_at, now());
  else new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger action_items_rules before insert or update on public.action_items
  for each row execute function app.action_item_rules();
create trigger action_items_touch before update on public.action_items
  for each row execute function app.touch_updated_at();
create trigger action_items_company_fixed before update on public.action_items
  for each row execute function app.block_company_change();
create trigger action_items_audit after insert or update of status, owner_id, due_date on public.action_items
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.commercial_documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.action_items enable row level security;

revoke all on public.commercial_documents, public.document_versions, public.action_items from anon, authenticated;
grant all on public.commercial_documents, public.document_versions, public.action_items to service_role;
grant select on public.commercial_documents, public.document_versions, public.action_items to authenticated;

-- Equipe vê documentos publicados; líder vê todos, inclusive rascunhos.
create policy commercial_documents_select on public.commercial_documents for select to authenticated
  using (
    app.is_leader(company_id)
    or (app.is_member(company_id) and published_version is not null and archived_at is null)
  );

-- Equipe vê só a versão publicada; líder vê o histórico inteiro.
create policy document_versions_select on public.document_versions for select to authenticated
  using (
    app.is_leader(company_id)
    or (app.is_member(company_id) and exists (
      select 1 from public.commercial_documents d
       where d.id = document_versions.document_id and d.published_version = document_versions.version and d.archived_at is null
    ))
  );

create policy action_items_select on public.action_items for select to authenticated
  using (
    app.is_leader(company_id)
    or (owner_id = auth.uid() and app.is_member(company_id))
  );
