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
| `CRON_SECRET` | Valor aleatório longo. A Vercel usa para chamar o recálculo dos alertas e o resumo do dia (vercel.json). |
| `SECRETS_ENCRYPTION_KEY` | Valor aleatório com 32 caracteres ou mais (`openssl rand -base64 48`). Protege as chaves salvas na tela "Chaves e integrações". Se mudar, as chaves salvas precisam ser coladas de novo. |
| `ANTHROPIC_API_KEY` | Opcional. A chave da Anthropic pode ser colada na tela "Chaves e integrações" da administração; a variável só vale quando não há chave salva na tela. |

## 3. Conferência depois de publicar
- Abrir `/entrar` e entrar com o administrador.
- Criar uma empresa de teste, convidar um e-mail seu como líder, aceitar e convidar um vendedor.
- Conferir o histórico em `/historico`.

## 4. WhatsApp por QR Code (Evolution API)
Só depois da autorização do gasto (estimativa de 5 a 20 dólares por mês).

1. Subir a Evolution API (código aberto) num servidor que fique ligado o tempo todo. Opções simples: Railway, Render ou uma VPS pequena com Docker. Usar a versão 2 e um banco próprio dela (o modelo oficial de instalação já traz Postgres e Redis).
2. Definir na Evolution uma chave global forte (`AUTHENTICATION_API_KEY`).
3. Na Vercel, adicionar:

| Nome | Valor |
|---|---|
| `EVOLUTION_API_URL` | Endereço público da Evolution (ex.: `https://whatsapp.orbion.com.br`) |
| `EVOLUTION_API_KEY` | A chave global definida no passo 2. Nunca expor. |

4. No Head, em Integrações > WhatsApp por QR Code, criar a conexão de um vendedor de teste e ler o QR Code com o celular.
5. Conferir com uma conversa real: mensagem recebida, resposta enviada pelo celular, mensagem de grupo (deve ser ignorada) e um áudio. O tradutor foi escrito com base no formato da Evolution v2 e precisa dessa conferência com o servidor real.

## 5. Chaves e integrações pela tela

Depois de publicar, a administração da Orbion entra em **Chaves e integrações** (menu da administração) e cola:
- a chave da API da Anthropic, que liga o chat, a análise de conversas e o resumo do dia (o botão "Testar conexão" confere a chave sem gastar tokens);
- o endereço e a chave do servidor do WhatsApp (Evolution API), quando ele estiver no ar.

Os valores ficam cifrados no banco e só o final aparece na tela. Remover uma chave da tela faz o sistema voltar a usar a variável de ambiente, se existir.

## 6. Agendadores (vercel.json)

| Caminho | Quando | O que faz |
|---|---|---|
| `/api/cron/alerts` | a cada 15 min | Recalcula os alertas |
| `/api/cron/daily-summary` | a cada hora | Entrega o resumo do dia no horário de cada empresa |
| `/api/cron/maturity` | uma vez por dia | Atualiza a maturidade comercial do mês |

No plano gratuito da Vercel os agendadores rodam uma vez por dia. Os alertas e a maturidade também são recalculados na hora pela tela.

## 7. Cópias de segurança

O Supabase guarda cópias diárias do banco nos planos pagos (Pro em diante, com 7 dias de histórico; recuperação para um ponto exato no tempo é um adicional). Antes dos clientes convidados:
1. Ative o plano Pro no projeto de produção e confira em Database, Backups que as cópias diárias aparecem.
2. Uma vez por mês, restaure a cópia mais recente num projeto de teste e abra o sistema para conferir que os dados estão lá. Anote a data da conferência.
3. Os arquivos enviados ao cérebro central ficam no banco como texto; não há arquivos soltos para copiar à parte.
