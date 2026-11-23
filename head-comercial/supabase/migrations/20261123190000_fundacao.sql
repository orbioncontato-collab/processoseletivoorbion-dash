-- =============================================================================
-- Fase 0 · Fundação
-- Empresas, usuários, papéis, convites e histórico central de atividades.
--
-- Regras de isolamento:
--   * Toda tabela de negócio tem company_id e RLS ligado.
--   * Leitura pelo usuário logado é controlada por RLS.
--   * Escritas nas tabelas de base (empresas, vínculos, convites) acontecem pelo
--     servidor, com a chave de serviço, depois da checagem de permissão no código.
--     O papel "authenticated" não tem permissão de escrita nelas.
--   * O histórico (activities) só recebe linhas por gatilho ou pelo servidor e
--     nunca pode ser alterado ou apagado.
-- =============================================================================

create schema if not exists app;
grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type public.member_role as enum ('leader', 'seller');
create type public.actor_type as enum ('user', 'integration', 'automation', 'agent', 'system');

-- -----------------------------------------------------------------------------
-- Função utilitária: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Empresas
-- -----------------------------------------------------------------------------
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 120),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  timezone    text not null default 'America/Sao_Paulo',
  status      text not null default 'active' check (status in ('active', 'suspended')),
  max_users   integer not null default 6 check (max_users between 1 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger companies_touch before update on public.companies
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Perfis (1 por usuário do Auth)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- Cria o perfil sempre que um usuário nasce no Auth (convite ou criação pelo admin).
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- Administradores da plataforma (equipe Orbion)
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Vínculo usuário x empresa, com papel
-- -----------------------------------------------------------------------------
create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        public.member_role not null,
  status      text not null default 'active' check (status in ('active', 'disabled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, user_id)
);

create index memberships_user_idx on public.memberships (user_id) where status = 'active';

create trigger memberships_touch before update on public.memberships
  for each row execute function app.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Convites
-- -----------------------------------------------------------------------------
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies (id) on delete cascade,
  email        text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  full_name    text not null default '',
  role         public.member_role not null,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by   uuid references auth.users (id) on delete set null,
  user_id      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);

create unique index invitations_one_pending_per_email
  on public.invitations (company_id, lower(email)) where status = 'pending';

-- -----------------------------------------------------------------------------
-- Funções de permissão (usadas pelas políticas RLS)
-- security definer para não entrar em recursão com o RLS das próprias tabelas.
-- -----------------------------------------------------------------------------
create or replace function app.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function app.member_role(target_company uuid)
returns public.member_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.memberships m
  join public.companies c on c.id = m.company_id
  where m.company_id = target_company
    and m.user_id = auth.uid()
    and m.status = 'active'
    and c.status = 'active';
$$;

create or replace function app.is_member(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.member_role(target_company) is not null;
$$;

create or replace function app.is_leader(target_company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.member_role(target_company) = 'leader';
$$;

-- Empresas em que o usuário logado está ativo.
create or replace function app.my_company_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.company_id
  from public.memberships m
  join public.companies c on c.id = m.company_id
  where m.user_id = auth.uid() and m.status = 'active' and c.status = 'active';
$$;

grant execute on function
  app.is_platform_admin(), app.member_role(uuid), app.is_member(uuid),
  app.is_leader(uuid), app.my_company_ids()
to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Histórico central de atividades
-- -----------------------------------------------------------------------------
create table public.activities (
  id           bigint generated always as identity primary key,
  company_id   uuid references public.companies (id) on delete cascade,
  actor_type   public.actor_type not null,
  actor_id     uuid,
  action       text not null check (char_length(action) between 1 and 80),
  entity_type  text not null check (char_length(entity_type) between 1 and 60),
  entity_id    uuid,
  changes      jsonb,
  metadata     jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now()
);

create index activities_company_time_idx on public.activities (company_id, occurred_at desc);
create index activities_entity_idx on public.activities (entity_type, entity_id, occurred_at desc);
create index activities_actor_idx on public.activities (actor_id, occurred_at desc);

-- O histórico nunca muda depois de gravado.
create or replace function app.block_activity_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Permite apenas a exclusão em cascata, quando a empresa inteira é apagada
  -- (por exemplo, pedido de exclusão de dados pela LGPD).
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'O histórico de atividades não pode ser alterado nem apagado';
end;
$$;

create trigger activities_immutable
  before update or delete on public.activities
  for each row execute function app.block_activity_changes();

-- Descobre quem originou a ação atual.
--   * Requisição de usuário logado: actor_type = user, actor_id = auth.uid().
--   * Requisição do servidor com a chave de serviço: o servidor informa o autor
--     pelos cabeçalhos x-actor-type e x-actor-id (só confiamos neles quando o
--     papel é service_role).
--   * Rotinas SQL podem usar set_config('app.actor_type' / 'app.actor_id').
create or replace function app.current_actor(out actor_type public.actor_type, out actor_id uuid)
language plpgsql
stable
set search_path = ''
as $$
declare
  headers jsonb;
  claimed_type text;
  claimed_id text;
begin
  if auth.uid() is not null then
    actor_type := 'user';
    actor_id := auth.uid();
    return;
  end if;

  claimed_type := nullif(current_setting('app.actor_type', true), '');
  claimed_id := nullif(current_setting('app.actor_id', true), '');

  -- current_user muda dentro de funções security definer; o GUC "role" (definido
  -- pelo PostgREST com SET ROLE) e as claims do JWT continuam mostrando quem chamou.
  if claimed_type is null and (
    current_setting('role', true) = 'service_role'
    or (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role'
  ) then
    begin
      headers := nullif(current_setting('request.headers', true), '')::jsonb;
    exception when others then
      headers := null;
    end;
    claimed_type := headers ->> 'x-actor-type';
    claimed_id := headers ->> 'x-actor-id';
  end if;

  actor_type := case
    when claimed_type in ('user', 'integration', 'automation', 'agent', 'system')
      then claimed_type::public.actor_type
    else 'system'
  end;

  begin
    actor_id := claimed_id::uuid;
  exception when others then
    actor_id := null;
  end;
end;
$$;

-- Gatilho genérico de auditoria: grava criação, alteração e exclusão no histórico.
-- Em alterações, guarda só os campos que mudaram (antes e depois).
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
      if k <> 'updated_at' and (row_data -> k) is distinct from (old_data -> k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('de', old_data -> k, 'para', row_data -> k));
      end if;
    end loop;
    if diff = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'INSERT' then
    diff := row_data;
  else
    diff := row_data;
  end if;

  -- Se a empresa está sendo apagada (exclusão em cascata), o registro fica sem empresa.
  if company is not null and not exists (select 1 from public.companies where id = company) then
    company := null;
  end if;

  insert into public.activities (company_id, actor_type, actor_id, action, entity_type, entity_id, changes)
  values (
    company,
    actor.actor_type,
    actor.actor_id,
    lower(tg_op),
    tg_table_name,
    entity,
    diff
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger companies_audit after insert or update or delete on public.companies
  for each row execute function app.audit_row();
create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function app.audit_row();
create trigger invitations_audit after insert or update or delete on public.invitations
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.activities enable row level security;

-- Permissões de tabela explícitas (não dependemos dos padrões do projeto).
revoke all on public.companies, public.profiles, public.platform_admins,
  public.memberships, public.invitations, public.activities from anon, authenticated;
grant all on public.companies, public.profiles, public.platform_admins,
  public.memberships, public.invitations, public.activities to service_role;

grant select on public.companies, public.profiles, public.platform_admins,
  public.memberships, public.invitations, public.activities to authenticated;
-- O usuário só pode mudar o próprio nome.
grant update (full_name) on public.profiles to authenticated;

-- companies: membro vê a própria empresa; admin vê todas.
create policy companies_select on public.companies for select to authenticated
  using (app.is_platform_admin() or id in (select app.my_company_ids()));

-- profiles: o próprio, colegas de empresa e admin.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or app.is_platform_admin()
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id
        and m.company_id in (select app.my_company_ids())
    )
  );

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- platform_admins: só admins enxergam a lista; cada um sabe se é admin.
create policy platform_admins_select on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or app.is_platform_admin());

-- memberships: membros da empresa veem a equipe; admin vê tudo.
create policy memberships_select on public.memberships for select to authenticated
  using (app.is_platform_admin() or company_id in (select app.my_company_ids()));

-- invitations: líder da empresa e admin.
create policy invitations_select on public.invitations for select to authenticated
  using (app.is_platform_admin() or app.is_leader(company_id));

-- activities: admin vê tudo; líder vê a empresa; vendedor vê o que ele mesmo fez.
-- (Nas próximas fases o vendedor também verá o histórico dos próprios registros.)
create policy activities_select on public.activities for select to authenticated
  using (
    app.is_platform_admin()
    or (company_id is not null and app.is_leader(company_id))
    or (company_id is not null and actor_id = auth.uid() and app.is_member(company_id))
  );
