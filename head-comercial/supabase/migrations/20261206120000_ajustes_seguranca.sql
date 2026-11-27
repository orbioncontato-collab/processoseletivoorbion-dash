-- Ajuste da revisão de segurança: treinamento só pode ser indicado para quem está ativo na equipe.
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
  if tg_op = 'INSERT' and not exists (
    select 1 from public.memberships m where m.company_id = new.company_id and m.user_id = new.user_id and m.status = 'active'
  ) then
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
