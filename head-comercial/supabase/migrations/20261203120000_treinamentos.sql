-- =============================================================================
-- Fase 7 · Desenvolvimento do time
--
--   * Biblioteca de treinamentos: da Orbion (global, para todas as empresas) e
--     da própria empresa. Cada treinamento trabalha uma habilidade, a mesma
--     régua dos critérios da análise de conversas.
--   * Recomendação: um treinamento indicado para uma pessoa, com o motivo e a
--     origem (líder, análise de conversa ou agente) e a nota de partida.
--   * Evolução: depois da conclusão, compara a nota da habilidade nas análises
--     seguintes com a nota de partida.
--   * Escritas pelo servidor, depois da checagem de permissão no código.
-- =============================================================================

create table public.trainings (
  id                uuid primary key default gen_random_uuid(),
  scope             text not null check (scope in ('global', 'company')),
  company_id        uuid references public.companies (id) on delete cascade,
  title             text not null check (char_length(btrim(title)) between 1 and 200),
  summary           text not null default '' check (char_length(summary) <= 600),
  skill             text not null check (skill in ('abertura', 'diagnostico', 'valor', 'objecoes', 'proximo_passo', 'agilidade', 'outro')),
  format            text not null default 'text' check (format in ('text', 'video', 'link', 'exercise')),
  content           text not null default '' check (char_length(content) <= 50000),
  url               text check (url is null or (char_length(url) <= 500 and url ~ '^https?://')),
  duration_minutes  smallint check (duration_minutes is null or duration_minutes between 1 and 600),
  created_by        uuid references auth.users (id) on delete set null,
  archived_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint trainings_scope_company check ((scope = 'global' and company_id is null) or (scope = 'company' and company_id is not null))
);

create index trainings_company_idx on public.trainings (company_id, skill) where archived_at is null;
create index trainings_global_idx on public.trainings (skill) where scope = 'global' and archived_at is null;

create trigger trainings_touch before update on public.trainings
  for each row execute function app.touch_updated_at();

create table public.training_assignments (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete cascade,
  user_id         uuid not null references auth.users (id),
  training_id     uuid not null references public.trainings (id) on delete cascade,
  status          text not null default 'recommended' check (status in ('recommended', 'started', 'completed', 'dismissed')),
  source          text not null check (source in ('leader', 'analysis', 'agent')),
  reason          text not null check (char_length(btrim(reason)) between 1 and 1000),
  skill           text not null,
  analysis_id     uuid references public.conversation_analyses (id) on delete set null,
  baseline_score  numeric(4, 2) check (baseline_score is null or baseline_score between 0 and 10),
  assigned_by     uuid references auth.users (id) on delete set null,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index training_assignments_user_idx on public.training_assignments (company_id, user_id, status);
-- Uma recomendação ativa por pessoa e treinamento (dispensada ou concluída libera outra).
create unique index training_assignments_active_uq on public.training_assignments (user_id, training_id)
  where status in ('recommended', 'started');

-- O treinamento precisa ser da Orbion ou da mesma empresa da pessoa.
create or replace function app.training_assignment_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  t record;
begin
  select scope, company_id, archived_at into t from public.trainings where id = new.training_id;
  if t.scope = 'company' and t.company_id <> new.company_id then
    raise exception 'Treinamento de outra empresa.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.memberships m where m.company_id = new.company_id and m.user_id = new.user_id) then
    raise exception 'A pessoa não faz parte da empresa.' using errcode = 'P0001';
  end if;
  if new.status = 'started' and new.started_at is null then new.started_at := now(); end if;
  if new.status = 'completed' then
    new.started_at := coalesce(new.started_at, now());
    new.completed_at := coalesce(new.completed_at, now());
  end if;
  if new.status in ('recommended', 'dismissed') then new.completed_at := null; end if;
  return new;
end;
$$;

create trigger training_assignments_rules before insert or update on public.training_assignments
  for each row execute function app.training_assignment_rules();
create trigger training_assignments_touch before update on public.training_assignments
  for each row execute function app.touch_updated_at();
create trigger training_assignments_company_fixed before update on public.training_assignments
  for each row execute function app.block_company_change();
create trigger training_assignments_audit after insert or update of status on public.training_assignments
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.trainings enable row level security;
alter table public.training_assignments enable row level security;

revoke all on public.trainings, public.training_assignments from anon, authenticated;
grant all on public.trainings, public.training_assignments to service_role;
grant select on public.trainings, public.training_assignments to authenticated;

-- A biblioteca da Orbion é para todas as empresas; a da empresa, só para ela.
create policy trainings_select on public.trainings for select to authenticated
  using (
    app.is_platform_admin()
    or (scope = 'global' and exists (select 1 from public.memberships m where m.user_id = auth.uid() and m.status = 'active'))
    or (scope = 'company' and app.is_member(company_id))
  );

create policy training_assignments_select on public.training_assignments for select to authenticated
  using (
    app.is_leader(company_id)
    or (user_id = auth.uid() and app.is_member(company_id))
  );
