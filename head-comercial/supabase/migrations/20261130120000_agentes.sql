-- =============================================================================
-- Fase 6 · Agentes de IA
--
--   * Conversas com os agentes (chat): cada pessoa vê só as próprias.
--   * Registro de cada chamada à IA: modelo, tokens, custo e resultado.
--   * Análise de conversas do WhatsApp: estruturada, com quem pediu e o modelo usado.
--   * Toda escrita passa pelo servidor, depois da checagem de permissão no código.
--     As ferramentas dos agentes leem com o login da própria pessoa (RLS).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Conversas com os agentes
-- -----------------------------------------------------------------------------
create table public.agent_threads (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  agent       text not null default 'head' check (agent in ('head', 'analyst', 'developer', 'strategist', 'project', 'sales_ops', 'revenue')),
  title       text not null default 'Nova conversa' check (char_length(btrim(title)) between 1 and 200),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, id)
);

create index agent_threads_user_idx on public.agent_threads (user_id, company_id, updated_at desc);

create table public.agent_messages (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null,
  thread_id   uuid not null,
  role        text not null check (role in ('user', 'assistant')),
  agent       text check (agent is null or agent in ('head', 'analyst', 'developer', 'strategist', 'project', 'sales_ops', 'revenue')),
  -- Texto mostrado na tela.
  content     text not null check (char_length(content) between 1 and 100000),
  -- Blocos completos da API (pensamento, ferramentas), para continuar a conversa sem perder nada.
  blocks      jsonb,
  -- Ferramentas usadas nesta resposta, para mostrar "consultou: oportunidades, alertas".
  tools_used  text[] not null default '{}',
  run_id      uuid,
  created_at  timestamptz not null default now(),
  foreign key (company_id, thread_id) references public.agent_threads (company_id, id) on delete cascade
);

create index agent_messages_thread_idx on public.agent_messages (thread_id, created_at);

create trigger agent_threads_touch before update on public.agent_threads
  for each row execute function app.touch_updated_at();
create trigger agent_threads_company_fixed before update on public.agent_threads
  for each row execute function app.block_company_change();

-- Mensagens não mudam depois de gravadas.
create or replace function app.agent_messages_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'Mensagens de agentes não podem ser alteradas.' using errcode = 'P0001';
end;
$$;

create trigger agent_messages_no_change before update or delete on public.agent_messages
  for each row execute function app.agent_messages_immutable();

-- -----------------------------------------------------------------------------
-- Registro de cada chamada à IA (custo em milionésimos de dólar)
-- -----------------------------------------------------------------------------
create table public.ai_runs (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid references public.companies (id) on delete cascade,
  user_id             uuid references auth.users (id) on delete set null,
  agent               text not null,
  purpose             text not null check (purpose in ('chat', 'analysis', 'daily_summary', 'other')),
  model               text not null,
  served_model        text,
  thread_id           uuid,
  status              text not null default 'ok' check (status in ('ok', 'refused', 'error', 'limit')),
  stop_reason         text,
  error               text check (error is null or char_length(error) <= 2000),
  requests            integer not null default 1,
  tool_calls          integer not null default 0,
  input_tokens        integer not null default 0,
  output_tokens       integer not null default 0,
  cache_read_tokens   integer not null default 0,
  cache_write_tokens  integer not null default 0,
  cost_micros         bigint not null default 0,
  duration_ms         integer,
  created_at          timestamptz not null default now()
);

create index ai_runs_company_idx on public.ai_runs (company_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Análise de conversas
-- -----------------------------------------------------------------------------
create table public.conversation_analyses (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null,
  conversation_id  uuid not null,
  seller_id        uuid not null references auth.users (id),
  requested_by     uuid references auth.users (id) on delete set null,
  status           text not null default 'done' check (status in ('done', 'error')),
  summary          text not null default '' check (char_length(summary) <= 4000),
  score            smallint check (score is null or score between 0 and 10),
  stage_reached    text check (stage_reached is null or char_length(stage_reached) <= 200),
  criteria         jsonb not null default '[]',
  strengths        text[] not null default '{}',
  failures         text[] not null default '{}',
  objections       text[] not null default '{}',
  recommendations  text[] not null default '{}',
  next_step        text check (next_step is null or char_length(next_step) <= 1000),
  messages_count   integer not null default 0,
  model            text,
  run_id           uuid references public.ai_runs (id) on delete set null,
  created_at       timestamptz not null default now(),
  foreign key (company_id, conversation_id) references public.conversations (company_id, id) on delete cascade
);

create index conversation_analyses_conversation_idx on public.conversation_analyses (conversation_id, created_at desc);
create index conversation_analyses_seller_idx on public.conversation_analyses (company_id, seller_id, created_at desc);

create trigger conversation_analyses_audit after insert on public.conversation_analyses
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.agent_threads enable row level security;
alter table public.agent_messages enable row level security;
alter table public.ai_runs enable row level security;
alter table public.conversation_analyses enable row level security;

revoke all on public.agent_threads, public.agent_messages, public.ai_runs, public.conversation_analyses
  from anon, authenticated;
grant all on public.agent_threads, public.agent_messages, public.ai_runs, public.conversation_analyses
  to service_role;
grant select on public.agent_threads, public.agent_messages, public.ai_runs, public.conversation_analyses
  to authenticated;

-- O chat é pessoal: nem o líder lê a conversa de outra pessoa com o agente.
create policy agent_threads_select on public.agent_threads for select to authenticated
  using (user_id = auth.uid() and app.is_member(company_id));
create policy agent_messages_select on public.agent_messages for select to authenticated
  using (exists (select 1 from public.agent_threads t where t.id = agent_messages.thread_id));

-- Custo: líder vê o da empresa; admin vê tudo.
create policy ai_runs_select on public.ai_runs for select to authenticated
  using (app.is_platform_admin() or (company_id is not null and app.is_leader(company_id)));

-- Análise: segue a conversa (líder vê todas; vendedor, as dele).
create policy conversation_analyses_select on public.conversation_analyses for select to authenticated
  using (
    app.is_leader(company_id)
    or (seller_id = auth.uid() and app.is_member(company_id))
  );
