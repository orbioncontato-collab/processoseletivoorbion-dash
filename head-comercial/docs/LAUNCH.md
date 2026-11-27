# Checklist de publicação do piloto interno

Passo a passo para colocar o Head Comercial no ar para a equipe da Orbion. Siga na ordem. Cada passo diz quem faz e como conferir que deu certo.

Detalhes técnicos de cada serviço estão em [SETUP.md](./SETUP.md).

---

## 0. Decisões e custos (proprietário)

| Item | Para que serve | Custo mensal aproximado* |
|---|---|---|
| Supabase, plano Pro | Banco, login e cópias de segurança diárias | US$ 25 |
| Vercel, plano Pro | Hospedagem; agendadores de hora em hora; respostas longas da IA (até 5 min) | US$ 20 por pessoa com acesso ao painel |
| Provedor de e-mail (ex.: Resend) | Convites e recuperação de senha | Grátis até cerca de 3 mil e-mails/mês |
| Anthropic | Chat, análise de conversas e resumo do dia | Por uso. Defina um limite por empresa na tela da empresa |
| Servidor do WhatsApp (Evolution API) | Conexão por QR Code dos celulares | US$ 5 a 20 |
| Domínio headorbion.com.br | Endereço do sistema | Já contratado |

\* Valores de referência. Confira o preço atual em cada site antes de contratar.

No plano gratuito da Vercel o sistema funciona, mas os agendadores rodam só uma vez por dia e respostas da IA com mais de 1 minuto são cortadas.

---

## 1. Supabase (quem administra as contas)

1. Crie um projeto em supabase.com. Região: **South America (São Paulo)**. Guarde a senha do banco num cofre de senhas.
2. Mude o projeto para o plano **Pro**.
3. Aplique as migrações do banco, a partir da pasta `head-comercial`:
   ```bash
   npx supabase login
   ```
   ```bash
   npx supabase link --project-ref SEU_PROJECT_REF
   ```
   ```bash
   npx supabase db push
   ```
   **Conferir:** em Table Editor aparecem as tabelas `companies`, `opportunities`, `agent_threads` e as demais.
4. Em **Authentication, Sign In / Providers**: desligue "Allow new users to sign up" (só entra quem é convidado).
5. Em **Authentication, URL Configuration**:
   - Site URL: `https://headorbion.com.br`
   - Redirect URLs: `https://headorbion.com.br/auth/confirm`
6. Em **Authentication, Emails**:
   - Configure o SMTP do provedor de e-mail (remetente, por exemplo, `nao-responda@orbion.com.br`).
   - Template **Invite user**: assunto "Seu convite para o Head Comercial"; corpo = conteúdo de `supabase/templates/invite.html`.
   - Template **Reset password**: assunto "Criar nova senha no Head Comercial"; corpo = conteúdo de `supabase/templates/recovery.html`.
7. Em **Project Settings, API Keys**, copie: a URL do projeto, a chave publicável (`sb_publishable_...`) e a chave secreta (`sb_secret_...`).

## 2. Chaves que você mesmo gera

Gere dois valores aleatórios e guarde no cofre de senhas:
```bash
openssl rand -base64 48
```
- Um vira o `CRON_SECRET`.
- Outro vira o `SECRETS_ENCRYPTION_KEY`. **Não perca este:** sem ele, as chaves salvas na tela "Chaves e integrações" precisam ser coladas de novo.

## 3. Vercel (quem administra as contas)

1. Importe o repositório no Vercel. Em **Root Directory**, escolha `head-comercial`.
2. Variáveis de ambiente (Production):

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável |
| `SUPABASE_SECRET_KEY` | chave secreta |
| `NEXT_PUBLIC_SITE_URL` | `https://headorbion.com.br` |
| `CRON_SECRET` | o valor gerado no passo 2 |
| `SECRETS_ENCRYPTION_KEY` | o valor gerado no passo 2 |

   Opcionais: `ANTHROPIC_API_KEY`, `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`, se preferir não colar na tela; `WEBHOOK_EVENTS_PER_MINUTE` (padrão 600).
3. Publique (Deploy) e ligue o domínio em **Settings, Domains**.
4. **Conferir:** abra `https://headorbion.com.br/api/health`. A resposta precisa mostrar `"ok": true`.
5. **Conferir:** em **Settings, Cron Jobs** aparecem os três agendadores (alertas, resumo do dia e maturidade).

## 4. Primeiro acesso (quem administra as contas)

1. Crie o administrador da plataforma, a partir da pasta `head-comercial`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... NEXT_PUBLIC_SITE_URL=https://headorbion.com.br npm run admin:create -- email@orbion.com.br "Nome da Pessoa"
   ```
2. A pessoa recebe o convite, cria a senha e aceita os termos.
3. Em **Chaves e integrações**: cole a chave da Anthropic e clique em **Testar conexão**. Cole também o endereço e a chave do servidor do WhatsApp quando ele estiver no ar.

## 5. Montar a operação da Orbion (administração e líder)

1. Em **Empresas**, crie a empresa "Orbion" e defina o limite mensal de IA (sugestão para começar: US$ 50).
2. Convide o líder comercial. O líder convida os vendedores em **Equipe**.
3. Em **Empresas, Configurar relatório diário**, monte as perguntas do relatório da equipe.
4. O líder ajusta o **Funil** (etapas) e as **Configurações** (referências dos alertas e resumo do dia).
5. Em **Integrações**, conecte o CRM (webhook ou planilha) e os WhatsApps dos vendedores.
6. No **Cérebro central**, suba a metodologia Orbion. Em **Biblioteca da Orbion**, cadastre os treinamentos.

## 6. Conferência final (líder, no primeiro dia)

Marque cada item depois de testar:

- [ ] Vendedor recebeu o convite, criou a senha e entrou.
- [ ] Oportunidade criada aparece no funil e no Início.
- [ ] Mensagem enviada pelo WhatsApp conectado aparece em Conversas em até 1 minuto.
- [ ] Relatório do dia enviado aparece em Relatórios do time.
- [ ] Chat com o Head responde e cita dados reais.
- [ ] Análise de uma conversa sai com nota e próximo passo.
- [ ] Alertas aparecem quando um próximo passo vence.
- [ ] Em **Consumo da IA**, o gasto do dia aparece.
- [ ] Em **Erros do sistema**, não há erros novos.

## 7. Rotina depois de publicar

- **Monitoramento:** cadastre `https://headorbion.com.br/api/health` num serviço gratuito de verificação (ex.: UptimeRobot), com aviso por e-mail se cair.
- **Toda semana:** olhe **Erros do sistema** e **Consumo da IA**.
- **Todo mês:** confira a cópia de segurança (SETUP.md, seção 7) e anote a data.
- **Antes do primeiro cliente de fora:** revisão jurídica dos termos e do aviso de privacidade (`src/modules/legal/content.tsx`). Ao mudar o texto, atualize a versão em `src/lib/auth/terms.ts` para todos aceitarem de novo.

## 8. Repositório próprio (quando o repositório novo for criado)

O código vive em `head-comercial/` deste repositório. Para levar para o repositório `head-comercial-orbion` com todo o histórico, a partir da raiz deste repositório:
```bash
git subtree split --prefix=head-comercial -b head-comercial-only
```
```bash
git push git@github.com:orbioncontato-collab/head-comercial-orbion.git head-comercial-only:main
```
Depois disso, copie `.github/workflows/head-comercial-ci.yml` para o novo repositório, tirando as linhas `working-directory: head-comercial`, e aponte a Vercel para o novo repositório com Root Directory vazio.
