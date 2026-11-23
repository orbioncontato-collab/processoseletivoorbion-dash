# Head Comercial

Plataforma que acompanha a operação comercial, mostra o que merece atenção, orienta vendedor e líder e aprende com o resultado.

A documentação do produto e do projeto fica em [`docs/`](docs):
[visão](docs/PROJECT_OVERVIEW.md) ·
[arquitetura](docs/ARCHITECTURE.md) ·
[roadmap](docs/ROADMAP.md) ·
[progresso](docs/PROGRESS.md) ·
[decisões](docs/DECISIONS.md) ·
[testes](docs/TESTING.md) ·
[publicação](docs/SETUP.md)

## Rodar localmente

Requisitos: Node 22 e Docker (para o Supabase local).

```bash
npm install
```

```bash
npx supabase start
```

```bash
node scripts/ci-supabase-env.mjs > .env.local
```

```bash
npm run dev
```

O app abre em http://localhost:3000. Os e-mails de convite chegam no Mailpit em http://127.0.0.1:54324.

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm test` | Testes de unidade |
| `npm run db:test:up` | Sobe um Postgres local descartável com as migrações |
| `npm run test:db` | Testes de isolamento entre empresas (RLS) |
| `npm run test:e2e` | Teste de ponta a ponta (precisa do app e do Supabase local rodando) |
| `npm run db:types` | Regenera os tipos do banco em `src/lib/supabase/database.types.ts` |
| `npm run typecheck` / `npm run lint` | Checagens de código |

## Estrutura

```
src/app/(auth)     telas de entrada, recuperação e criação de senha
src/app/(app)      área logada (início, equipe, histórico, perfil, admin)
src/app/auth       rota que recebe os links dos e-mails
src/lib            sessão, clientes do Supabase, configuração
src/modules        regras de negócio por módulo (auth, team, companies, profile, activities)
src/components     componentes de tela
supabase/          migrações, configuração local e modelos de e-mail
tests/             testes de banco (db) e de ponta a ponta (e2e)
```
