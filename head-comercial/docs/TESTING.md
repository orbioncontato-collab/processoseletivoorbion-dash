# Estratégia de testes

## Regra geral
Nenhuma funcionalidade é marcada como concluída sem teste executado. O resultado de cada execução fica registrado em PROGRESS.md.

## Tipos de teste

| Tipo | Ferramenta | Onde está | O que cobre |
|---|---|---|---|
| Unidade | Vitest | `src/**/*.test.ts` | Regras puras: validação de formulários, identificador da empresa, vagas, proteção de redirecionamento, frases do histórico. |
| Isolamento e permissões | Vitest + Postgres | `tests/db/` | Para cada tabela: usuário da empresa A tenta ler, editar e apagar dados da empresa B; vendedor tenta o que só líder pode; visitante sem login; histórico imutável. |
| Ponta a ponta | Playwright | `tests/e2e/` | Fluxo real: admin cria empresa, convida líder, líder cria senha e convida vendedor, permissões por papel, histórico, desativação. |
| Regressão | Toda a suíte no CI | `.github/workflows/head-comercial-ci.yml` | Roda a cada envio que mexe em `head-comercial/`. |
| IA (fases futuras) | Avaliação com a base de calibragem | | Mudança de instrução só entra se a nota não cair. |

## Como rodar

```bash
npm install
```

Testes de unidade:

```bash
npm test
```

Testes de isolamento num Postgres local descartável (precisa do PostgreSQL instalado; não precisa de Docker):

```bash
npm run db:test:up
```

```bash
DATABASE_URL_TEST=postgres://postgres@127.0.0.1:54329/head_comercial_test npm run test:db
```

Ponta a ponta (precisa do Supabase local com Docker, `npx supabase start`, e do app rodando):

```bash
node scripts/ci-supabase-env.mjs > .env.local
```

```bash
npm run build && npm start
```

```bash
npm run test:e2e
```

## Postgres local x Supabase real
O `scripts/test-db.sh` usa um Postgres comum com uma imitação mínima do Supabase (`tests/db/supabase-shim.sql`: papéis anon, authenticated e service_role, tabela auth.users e auth.uid()). Isso permite rodar os testes de isolamento em qualquer máquina. No CI os mesmos testes rodam contra o Supabase completo, para garantir que a imitação não esconde diferenças.

## Prova de que os testes pegam falhas
Em 2026-11-23 duas políticas de isolamento foram trocadas de propósito por "liberar tudo". Cinco testes falharam e apontaram o vazamento. Com as políticas restauradas, todos voltaram a passar.
