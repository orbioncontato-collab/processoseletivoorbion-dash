-- =============================================================================
-- Fase 2 · Conversas e mensagens (WhatsApp e outros canais)
-- Toda mensagem capturada entra aqui, ligada ao contato e ao vendedor dono do número.
-- A análise com IA é feita depois, só nas conversas escolhidas (D006).
--
-- Acesso: vendedor vê as conversas dele; líder vê as do time. Escrita só pelo
-- processador de integrações (chave secreta), exceto ligar a conversa a uma
-- oportunidade, que o vendedor e o líder podem fazer.
-- =============================================================================

create table public.conversations (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete cascade,
  source_id         uuid not null,
  contact_id        uuid not null,
  owner_id          uuid not null references auth.users (id),
  opportunity_id    uuid references public.opportunities (id) on delete set null,
  channel           text not null default 'whatsapp' check (channel in ('whatsapp', 'email', 'other')),
  external_id       text not null check (char_length(external_id) between 1 and 200),
  started_at        timestamptz not null,
  last_message_at   timestamptz not null,
  last_inbound_at   timestamptz,
  last_outbound_at  timestamptz,
  inbound_count     integer not null default 0,
  outbound_count    integer not null default 0,
  -- true quando a última mensagem foi do cliente e o vendedor ainda não respondeu.
  awaiting_reply    boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  foreign key (company_id, source_id) references public.integration_sources (company_id, id) on delete cascade,
  foreign key (company_id, contact_id) references public.contacts (company_id, id),
  unique (source_id, external_id),
  unique (company_id, id)
);

create index conversations_owner_idx on public.conversations (company_id, owner_id, last_message_at desc);
create index conversations_contact_idx on public.conversations (contact_id);
create index conversations_awaiting_idx on public.conversations (company_id, owner_id) where awaiting_reply;

create trigger conversations_touch before update on public.conversations
  for each row execute function app.touch_updated_at();
create trigger conversations_company_fixed before update on public.conversations
  for each row execute function app.block_company_change();

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null,
  conversation_id  uuid not null,
  source_id        uuid not null,
  direction        text not null check (direction in ('inbound', 'outbound')),
  sent_at          timestamptz not null,
  message_type     text not null default 'text'
                     check (message_type in ('text', 'audio', 'image', 'video', 'document', 'sticker', 'location', 'other')),
  body             text check (body is null or char_length(body) <= 10000),
  external_id      text not null check (char_length(external_id) between 1 and 200),
  created_at       timestamptz not null default now(),
  foreign key (company_id, conversation_id) references public.conversations (company_id, id) on delete cascade,
  unique (source_id, external_id)
);

create index messages_conversation_idx on public.messages (conversation_id, sent_at);
create index messages_company_time_idx on public.messages (company_id, sent_at);

-- Cada mensagem atualiza a conversa e conta como movimentação das
-- oportunidades abertas daquele contato com o mesmo vendedor.
create or replace function app.message_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conv record;
begin
  update public.conversations c set
    last_message_at  = greatest(c.last_message_at, new.sent_at),
    last_inbound_at  = case when new.direction = 'inbound'  then greatest(coalesce(c.last_inbound_at,  new.sent_at), new.sent_at) else c.last_inbound_at end,
    last_outbound_at = case when new.direction = 'outbound' then greatest(coalesce(c.last_outbound_at, new.sent_at), new.sent_at) else c.last_outbound_at end,
    inbound_count    = c.inbound_count  + (new.direction = 'inbound')::int,
    outbound_count   = c.outbound_count + (new.direction = 'outbound')::int,
    started_at       = least(c.started_at, new.sent_at)
  where c.id = new.conversation_id
  returning * into conv;

  -- Espera resposta se a mensagem mais recente da conversa é do cliente.
  update public.conversations set awaiting_reply = (
    coalesce(conv.last_inbound_at, '-infinity'::timestamptz) > coalesce(conv.last_outbound_at, '-infinity'::timestamptz)
  ) where id = conv.id;

  if new.direction = 'outbound' then
    update public.opportunities o
       set last_activity_at = greatest(o.last_activity_at, new.sent_at)
     where o.contact_id = conv.contact_id
       and o.owner_id = conv.owner_id
       and o.status = 'open';
  end if;
  return new;
end;
$$;

create trigger messages_after_insert after insert on public.messages
  for each row execute function app.message_after_insert();

-- Mensagens não mudam depois de capturadas.
create trigger messages_immutable before update on public.messages
  for each row execute function app.block_activity_changes();

-- Auditoria das conversas (vínculo com oportunidade, troca de dono). Mensagens
-- não entram no histórico central: o volume é alto e elas já são o próprio registro.
create trigger conversations_audit after insert or update of opportunity_id, owner_id on public.conversations
  for each row execute function app.audit_row();

-- -----------------------------------------------------------------------------
-- Números do dia por vendedor (security invoker: o RLS decide o que cada um vê)
-- -----------------------------------------------------------------------------
create or replace function public.seller_daily_metrics(target_company uuid, period_start timestamptz, period_end timestamptz)
returns table (
  owner_id                    uuid,
  conversations_active        integer,
  conversations_started       integer,
  messages_inbound            integer,
  messages_outbound           integer,
  avg_first_response_seconds  integer,
  awaiting_reply              integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with msgs as (
    select m.*, c.owner_id,
           lag(m.direction) over (partition by m.conversation_id order by m.sent_at, m.id) as prev_direction
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    where m.company_id = target_company
      and m.sent_at >= period_start and m.sent_at < period_end
  ),
  -- Primeira mensagem do cliente depois de uma resposta (ou a primeira da conversa):
  -- é a partir dela que conta o tempo de resposta.
  asks as (
    select a.owner_id,
           extract(epoch from (
             select min(o.sent_at) from public.messages o
             where o.conversation_id = a.conversation_id and o.direction = 'outbound' and o.sent_at > a.sent_at
           ) - a.sent_at) as wait_seconds
    from msgs a
    where a.direction = 'inbound' and (a.prev_direction is null or a.prev_direction = 'outbound')
  ),
  per_owner as (
    select owner_id,
           count(distinct conversation_id)::int as conversations_active,
           count(*) filter (where direction = 'inbound')::int as messages_inbound,
           count(*) filter (where direction = 'outbound')::int as messages_outbound
    from msgs group by owner_id
  ),
  started as (
    select c.owner_id, count(*)::int as conversations_started
    from public.conversations c
    where c.company_id = target_company and c.started_at >= period_start and c.started_at < period_end
    group by c.owner_id
  ),
  waiting as (
    select c.owner_id, count(*)::int as awaiting_reply
    from public.conversations c
    where c.company_id = target_company and c.awaiting_reply
    group by c.owner_id
  ),
  response as (
    select owner_id, round(avg(wait_seconds))::int as avg_first_response_seconds
    from asks where wait_seconds is not null group by owner_id
  ),
  owners as (
    select owner_id from per_owner union select owner_id from started union select owner_id from waiting
  )
  select o.owner_id,
         coalesce(p.conversations_active, 0),
         coalesce(s.conversations_started, 0),
         coalesce(p.messages_inbound, 0),
         coalesce(p.messages_outbound, 0),
         r.avg_first_response_seconds,
         coalesce(w.awaiting_reply, 0)
  from owners o
  left join per_owner p on p.owner_id = o.owner_id
  left join started s on s.owner_id = o.owner_id
  left join waiting w on w.owner_id = o.owner_id
  left join response r on r.owner_id = o.owner_id;
$$;

revoke all on function public.seller_daily_metrics(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.seller_daily_metrics(uuid, timestamptz, timestamptz) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.messages from anon, authenticated;
grant all on public.conversations, public.messages to service_role;
grant select on public.conversations, public.messages to authenticated;
grant update (opportunity_id) on public.conversations to authenticated;

create policy conversations_select on public.conversations for select to authenticated
  using (
    app.is_platform_admin()
    or app.is_leader(company_id)
    or (owner_id = auth.uid() and app.is_member(company_id))
  );
create policy conversations_link on public.conversations for update to authenticated
  using (app.is_leader(company_id) or (owner_id = auth.uid() and app.is_member(company_id)))
  with check (
    (app.is_leader(company_id) or (owner_id = auth.uid() and app.is_member(company_id)))
    and (opportunity_id is null or exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.company_id = conversations.company_id and o.contact_id = conversations.contact_id
    ))
  );

create policy messages_select on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = messages.conversation_id));
