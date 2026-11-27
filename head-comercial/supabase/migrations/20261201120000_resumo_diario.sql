-- =============================================================================
-- Fase 6 · Resumo do dia
--   O Head monta uma leitura da operação para os líderes, uma vez por dia, no
--   horário escolhido. O resumo vira uma conversa no chat de cada líder.
-- =============================================================================

alter table public.company_settings
  add column daily_summary_enabled boolean not null default false,
  add column daily_summary_hour smallint not null default 8 check (daily_summary_hour between 5 and 12),
  add column daily_summary_last_date date;

grant update (daily_summary_enabled, daily_summary_hour) on public.company_settings to authenticated;

-- Mudanças de configuração do resumo também entram no histórico.
drop trigger company_settings_audit on public.company_settings;
create trigger company_settings_audit
  after update of stale_days, awaiting_reply_hours, report_grace_hours, daily_target_conversations, daily_target_messages,
                  daily_summary_enabled, daily_summary_hour
  on public.company_settings
  for each row execute function app.audit_row();

alter table public.agent_threads
  add column kind text not null default 'chat' check (kind in ('chat', 'daily_summary'));

create index agent_threads_kind_idx on public.agent_threads (user_id, kind, created_at desc);
