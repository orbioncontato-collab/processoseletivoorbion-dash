-- =============================================================================
-- Chaves das integrações da plataforma (Anthropic, servidor do WhatsApp)
--   A administração cola as chaves numa tela. O valor fica cifrado pelo servidor
--   (AES-256-GCM, chave em SECRETS_ENCRYPTION_KEY) e só o servidor lê esta tabela.
-- =============================================================================

create table public.platform_secrets (
  name        text primary key check (name in ('anthropic_api_key', 'evolution_api_url', 'evolution_api_key')),
  ciphertext  text not null check (char_length(ciphertext) between 1 and 4000),
  hint        text check (hint is null or char_length(hint) <= 40),
  updated_by  uuid references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);

alter table public.platform_secrets enable row level security;
revoke all on public.platform_secrets from anon, authenticated;
grant all on public.platform_secrets to service_role;
-- Sem política para authenticated: nenhum usuário lê ou grava direto, nem o admin.
