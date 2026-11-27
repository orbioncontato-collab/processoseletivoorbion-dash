-- =============================================================================
-- Fase 5 · Cérebro central, calibragem e memória
--
--   * Conhecimento global (metodologia Orbion): só a administração da plataforma
--     lê e escreve. Os agentes usam pelo servidor. Clientes não acessam o acervo.
--   * Conhecimento da empresa: toda a empresa lê; líder e admin escrevem (pelo servidor).
--   * Documentos são divididos em trechos com busca por texto em português,
--     sem diferenciar acentos. Busca por significado (vetores) entra depois (D020).
--   * Calibragem: conversas reais com a avaliação esperada (base de teste da IA).
--   * Memória: fatos da empresa e de cada pessoa, com origem e data.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- Português sem diferenciar acentos: "negociação" encontra "negociacao" e vice-versa.
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'pt_unaccent') then
    create text search configuration public.pt_unaccent (copy = pg_catalog.portuguese);
    alter text search configuration public.pt_unaccent
      alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Documentos e trechos
-- -----------------------------------------------------------------------------
create table public.knowledge_documents (
  id             uuid primary key default gen_random_uuid(),
  scope          text not null check (scope in ('global', 'company')),
  company_id     uuid references public.companies (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 200),
  kind           text not null default 'other' check (kind in (
                   'methodology', 'framework', 'script', 'objection', 'process', 'training',
                   'playbook', 'product', 'example', 'other')),
  tags           text[] not null default '{}',
  source         text not null default 'paste' check (source in ('upload', 'paste', 'notion', 'import')),
  source_ref     text check (source_ref is null or char_length(source_ref) <= 500),
  file_name      text check (file_name is null or char_length(file_name) <= 255),
  content_chars  integer not null default 0,
  chunk_count    integer not null default 0,
  status         text not null default 'ready' check (status in ('processing', 'ready', 'error')),
  error          text check (error is null or char_length(error) <= 1000),
  created_by     uuid references auth.users (id) on delete set null,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint scope_company check ((scope = 'global' and company_id is null) or (scope = 'company' and company_id is not null))
);

create index knowledge_documents_company_idx on public.knowledge_documents (company_id) where archived_at is null;
create index knowledge_documents_global_idx on public.knowledge_documents (scope) where scope = 'global' and archived_at is null;

create table public.knowledge_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.knowledge_documents (id) on delete cascade,
  position     integer not null,
  heading      text check (heading is null or char_length(heading) <= 300),
  content      text not null check (char_length(content) between 1 and 8000),
  tsv          tsvector generated always as (
                 to_tsvector('public.pt_unaccent'::regconfig, coalesce(heading, '') || ' ' || content)
               ) stored,
  created_at   timestamptz not null default now(),
  unique (document_id, position)
);

create index knowledge_chunks_tsv_idx on public.knowledge_chunks using gin (tsv);

create trigger knowledge_documents_touch before update on public.knowledge_documents
  for each row execute function app.touch_updated_at();

create trigger knowledge_documents_audit after insert or update of title, kind, tags, status, archived_at
  on public.knowledge_documents for each row execute function app.audit_row();

-- Busca por texto (security invoker: o RLS decide o que cada um encontra).
create or replace function public.search_knowledge(
  target_company uuid, q text, include_global boolean default true, max_results integer default 8
)
returns table (
  chunk_id uuid, document_id uuid, title text, kind text, scope text, chunk_position integer,
  heading text, content text, rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  -- Qualquer palavra da pergunta conta (OU); trechos com mais palavras ficam no topo.
  -- As palavras saem normalizadas (sem acento, raiz em português). O dicionário não junta
  -- "-ção" e "-ções" (objeca x objeco), então palavras longas buscam pelo começo (objec:*).
  with query as (
    select to_tsquery('simple', string_agg(
             case when length(lexeme) > 5 then quote_literal(left(lexeme, length(lexeme) - 1)) || ':*'
                  else quote_literal(lexeme) end, ' | ')) as tsq
      from unnest(tsvector_to_array(to_tsvector('public.pt_unaccent'::regconfig, coalesce(q, '')))) as lexeme
  )
  select c.id, d.id, d.title, d.kind, d.scope, c.position, c.heading, c.content,
         ts_rank_cd(c.tsv, query.tsq) as rank
    from public.knowledge_chunks c
    join public.knowledge_documents d on d.id = c.document_id
   cross join query
   where query.tsq is not null and d.archived_at is null and d.status = 'ready'
     and ((d.scope = 'company' and d.company_id = target_company) or (include_global and d.scope = 'global'))
     and c.tsv @@ query.tsq
   order by rank desc, d.title, c.position
   limit least(greatest(max_results, 1), 50);
$$;

revoke all on function public.search_knowledge(uuid, text, boolean, integer) from public, anon;
grant execute on function public.search_knowledge(uuid, text, boolean, integer) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Calibragem: conversas reais com a avaliação esperada
-- -----------------------------------------------------------------------------
create table public.calibration_cases (
  id                   uuid primary key default gen_random_uuid(),
  scope                text not null check (scope in ('global', 'company')),
  company_id           uuid references public.companies (id) on delete cascade,
  title                text not null check (char_length(btrim(title)) between 1 and 200),
  conversation         text not null check (char_length(conversation) between 1 and 50000),
  expected_assessment  text not null check (char_length(expected_assessment) between 1 and 10000),
  outcome              text not null default 'unknown' check (outcome in ('won', 'lost', 'open', 'unknown')),
  tags                 text[] not null default '{}',
  created_by           uuid references auth.users (id) on delete set null,
  archived_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint calibration_scope_company check ((scope = 'global' and company_id is null) or (scope = 'company' and company_id is not null))
);

create trigger calibration_cases_touch before update on public.calibration_cases
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Memória da empresa e de cada pessoa
-- -----------------------------------------------------------------------------
create table public.memory_items (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies (id) on delete cascade,
  scope            text not null check (scope in ('company', 'user')),
  subject_user_id  uuid references auth.users (id),
  category         text not null check (category in (
                     'product', 'pricing', 'customer_profile', 'process', 'goal', 'team', 'competitor',
                     'strength', 'difficulty', 'development', 'preference', 'other')),
  content          text not null check (char_length(btrim(content)) between 1 and 2000),
  source           text not null default 'manual' check (source in ('manual', 'agent', 'report', 'system')),
  source_ref       text check (source_ref is null or char_length(source_ref) <= 300),
  status           text not null default 'active' check (status in ('active', 'archived')),
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint memory_scope_subject check ((scope = 'company' and subject_user_id is null) or (scope = 'user' and subject_user_id is not null))
);

create index memory_items_company_idx on public.memory_items (company_id, scope, status);
create index memory_items_subject_idx on public.memory_items (subject_user_id) where status = 'active';

create trigger memory_items_touch before update on public.memory_items
  for each row execute function app.touch_updated_at();
create trigger memory_items_company_fixed before update on public.memory_items
  for each row execute function app.block_company_change();
create trigger memory_items_audit after insert or update on public.memory_items
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS (escritas só pelo servidor, depois da checagem de permissão no código)
-- -----------------------------------------------------------------------------
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.calibration_cases enable row level security;
alter table public.memory_items enable row level security;

revoke all on public.knowledge_documents, public.knowledge_chunks, public.calibration_cases, public.memory_items
  from anon, authenticated;
grant all on public.knowledge_documents, public.knowledge_chunks, public.calibration_cases, public.memory_items
  to service_role;
grant select on public.knowledge_documents, public.knowledge_chunks, public.calibration_cases, public.memory_items
  to authenticated;

create policy knowledge_documents_select on public.knowledge_documents for select to authenticated
  using (
    app.is_platform_admin()
    or (scope = 'company' and app.is_member(company_id))
  );
create policy knowledge_chunks_select on public.knowledge_chunks for select to authenticated
  using (exists (select 1 from public.knowledge_documents d where d.id = knowledge_chunks.document_id));

create policy calibration_cases_select on public.calibration_cases for select to authenticated
  using (
    app.is_platform_admin()
    or (scope = 'company' and app.is_leader(company_id))
  );

create policy memory_items_select on public.memory_items for select to authenticated
  using (
    app.is_platform_admin()
    or (scope = 'company' and app.is_member(company_id))
    or (scope = 'user' and (app.is_leader(company_id) or (subject_user_id = auth.uid() and app.is_member(company_id))))
  );
