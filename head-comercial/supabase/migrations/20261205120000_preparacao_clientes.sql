-- =============================================================================
-- Fase 9 · Preparação para clientes convidados
--
--   * Maturidade comercial: foto mensal das notas por dimensão, calculadas
--     com os dados reais da operação.
--   * Limite mensal de gasto com IA por empresa (definido pela administração).
--   * Aceite dos termos de uso e do aviso de privacidade.
--   * Registro de erros do servidor, para a administração acompanhar.
-- =============================================================================

create table public.maturity_assessments (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  period       date not null,
  overall      smallint not null check (overall between 0 and 100),
  dimensions   jsonb not null,
  computed_at  timestamptz not null default now(),
  computed_by  uuid references auth.users (id) on delete set null,
  unique (company_id, period)
);

alter table public.maturity_assessments enable row level security;
revoke all on public.maturity_assessments from anon, authenticated;
grant all on public.maturity_assessments to service_role;
grant select on public.maturity_assessments to authenticated;
create policy maturity_assessments_select on public.maturity_assessments for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id));

-- Limite de IA: nulo = sem limite. Em milionésimos de dólar, como ai_runs.cost_micros.
alter table public.companies add column ai_monthly_limit_micros bigint check (ai_monthly_limit_micros is null or ai_monthly_limit_micros >= 0);

-- Termos e privacidade.
alter table public.profiles
  add column terms_version text check (terms_version is null or char_length(terms_version) <= 20),
  add column terms_accepted_at timestamptz;

create table public.app_errors (
  id          uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  source      text not null check (char_length(source) <= 200),
  path        text check (path is null or char_length(path) <= 500),
  method      text check (method is null or char_length(method) <= 10),
  message     text not null check (char_length(message) <= 2000),
  digest      text check (digest is null or char_length(digest) <= 100),
  stack       text check (stack is null or char_length(stack) <= 8000)
);

create index app_errors_occurred_idx on public.app_errors (occurred_at desc);

alter table public.app_errors enable row level security;
revoke all on public.app_errors from anon, authenticated;
grant all on public.app_errors to service_role;
grant select on public.app_errors to authenticated;
create policy app_errors_select on public.app_errors for select to authenticated using (app.is_platform_admin());
