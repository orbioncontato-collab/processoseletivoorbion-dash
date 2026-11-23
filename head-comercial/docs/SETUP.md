# Como colocar o Head Comercial no ar

Este guia vale para o ambiente de produção (Supabase hospedado + Vercel). Para desenvolvimento local, veja o README.

## 1. Supabase
1. Criar o projeto em supabase.com, na região **South America (São Paulo)**.
2. Em **Authentication > Sign In / Providers**: desligar "Allow new users to sign up" (só entra quem for convidado).
3. Em **Authentication > Policies de senha**: mínimo de 8 caracteres, letras e números.
4. Em **Authentication > URL Configuration**:
   - Site URL: o endereço do app (ex.: `https://head.orbion.com.br`).
   - Redirect URLs: `https://SEU-ENDERECO/auth/confirm`.
5. Em **Authentication > Email Templates**: copiar o conteúdo de `supabase/templates/invite.html` (Invite user) e `supabase/templates/recovery.html` (Reset password), com os assuntos de `supabase/config.toml`.
6. Em **Authentication > SMTP**: configurar um provedor de e-mail próprio (ex.: Resend, Amazon SES). O envio padrão do Supabase tem limite baixo e não serve para produção.
7. Aplicar as migrações:

```bash
npx supabase link --project-ref SEU_PROJECT_REF
```

```bash
npx supabase db push
```

8. Criar o primeiro administrador da plataforma: convidar o e-mail pelo painel do Supabase (Authentication > Users > Invite) e, depois que a pessoa criar a senha, rodar no SQL Editor:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where email = 'email-do-admin@orbion.com.br';
```

## 2. Vercel
1. Importar o repositório e apontar a pasta raiz para `head-comercial` (enquanto estiver neste repositório).
2. Variáveis de ambiente (Settings > Environment Variables):

| Nome | Onde pegar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > Project Settings > API Keys (publishable) |
| `SUPABASE_SECRET_KEY` | Supabase > Project Settings > API Keys (secret). Nunca expor. |
| `NEXT_PUBLIC_SITE_URL` | Endereço público do app |

## 3. Conferência depois de publicar
- Abrir `/entrar` e entrar com o administrador.
- Criar uma empresa de teste, convidar um e-mail seu como líder, aceitar e convidar um vendedor.
- Conferir o histórico em `/historico`.
