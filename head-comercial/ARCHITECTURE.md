# Arquitetura

## Visão em uma frase

Um único aplicativo web (Next.js) conectado a um banco Postgres gerenciado (Supabase). Todos os dados entram por uma porta comum de integrações, ficam registrados num histórico central e são lidos por regras automáticas e por agentes de IA.

```
 WhatsApp ─┐
 Webhook ──┼─> Entrada de eventos ─> Normalização ─> Contatos, conversas, mensagens, métricas
 API ──────┘        (bruto)                                   │
                                                              v
 Vendedor/Líder ─> Telas ─> Oportunidades, relatórios ─> Histórico central de atividades
                                                              │
                                  ┌───────────────────────────┼──────────────────────────┐
                                  v                           v                          v
                      Regras (alertas, divergências)   Memória (empresa, pessoa)   Cérebro central
                                  │                           │                          │
                                  └────────────> Agentes de IA (Head e equipe) <─────────┘
                                                              │
                                                              v
                                          Painéis, recomendações, planos de ação
```

## Tecnologias escolhidas

| Camada | Escolha | Por quê |
|---|---|---|
| Aplicação web | Next.js (App Router) com TypeScript | A equipe já usa nos outros projetos. Frontend e backend no mesmo código, menos peças para manter. |
| Banco de dados | Postgres no Supabase (região São Paulo) | Banco relacional sólido, com isolamento por empresa direto no banco (RLS), busca vetorial (pgvector) para o cérebro central e armazenamento de arquivos. Servidor no Brasil ajuda com LGPD e velocidade. |
| Login | Supabase Auth (e-mail e senha, convite, recuperação de senha) | Pronto, seguro e integrado às regras de acesso do banco. Construir login do zero é risco sem ganho. |
| Componentes de tela | Tailwind CSS e shadcn/ui | Componentes profissionais prontos (tabelas, formulários, modais). Gastamos esforço no que diferencia o produto. |
| Gráficos | Recharts | Já usado no dashboard atual da Orbion. |
| Validação de dados | Zod | A mesma regra valida no navegador e no servidor. |
| Tarefas agendadas | Fila no próprio Postgres e um agendador (Vercel Cron) que chama rotas protegidas | Alertas, lembretes de relatório e processamento de mensagens sem contratar mais um serviço. Pode ser trocado por um serviço de filas se o volume crescer. |
| IA | API da Anthropic (Claude), com o laço de ferramentas controlado pelo nosso servidor | Os agentes precisam consultar dados de cada empresa com o mesmo isolamento do restante do sistema. Mantendo o laço no nosso servidor, cada ferramenta do agente usa as permissões do usuário logado. |
| Busca no cérebro central | Busca híbrida: texto completo do Postgres em português + vetores (pgvector) | Traz só os trechos relevantes para cada pergunta, sem mandar a base inteira para a IA. |
| Hospedagem | Vercel (aplicação) e Supabase (banco) | Pouca infraestrutura para cuidar no início. |
| Testes | Vitest (unidade e integração), Playwright (fluxos de tela), testes de isolamento rodando contra o Supabase local | Ver TESTING.md. |

### Sobre os agentes de IA

A Anthropic oferece um serviço chamado Managed Agents, em que ela mesma roda o laço do agente e um ambiente isolado de execução. Para este produto eu escolhi usar a API de mensagens com o laço no nosso servidor, porque:

1. Os agentes vão ler dados de várias empresas e a regra de isolamento precisa ser a mesma do resto do sistema.
2. As conversas com os agentes são curtas e não precisam de um computador isolado para rodar código.
3. O custo fica só nos tokens, sem cobrança de tempo de sessão.

Se no futuro um agente precisar fazer tarefas longas (por exemplo, ler 200 documentos e montar um playbook), podemos usar Managed Agents só para essa tarefa.

Modelo padrão: Claude Opus 5.5 (`claude-opus-5-5`). Para tarefas simples e de alto volume (classificar mensagens, por exemplo) podemos usar um modelo mais barato, mas essa troca é uma decisão de custo que fica com você.

## Isolamento entre empresas (multi-tenant)

- Toda tabela de dados de negócio tem a coluna `company_id`.
- A tabela `memberships` diz a qual empresa cada usuário pertence e com qual papel (`leader` ou `seller`).
- Administradores da plataforma ficam numa tabela separada (`platform_admins`).
- O próprio banco bloqueia o acesso com políticas RLS. Mesmo que exista um erro na tela, a consulta de uma empresa não devolve linhas de outra.
- Vendedor enxerga só os próprios contatos, conversas e oportunidades. Líder enxerga tudo da empresa e também tem as próprias oportunidades.
- A chave de serviço do banco (que ignora as regras) só existe no servidor, usada pelas integrações e tarefas agendadas, e nunca chega ao navegador.

### Matriz de permissões (MVP)

| Ação | Admin plataforma | Líder | Vendedor |
|---|---|---|---|
| Criar empresa | Sim | Não | Não |
| Convidar usuários da empresa | Sim | Sim | Não |
| Configurar relatório da empresa | Sim | Não (pode sugerir) | Não |
| Configurar etapas do funil | Sim | Sim | Não |
| Ver oportunidades do time | Sim | Sim | Só as próprias |
| Editar oportunidade | Sim | Sim | Só as próprias |
| Preencher relatório | Não | Sim | Sim |
| Ver divergências | Sim | Do time todo | Só as próprias |
| Justificar divergência | Não | Sim | Só as próprias |
| Alimentar cérebro central | Sim | Não | Não |
| Documentos da empresa | Sim | Criar e editar | Ler |
| Conversar com agentes | Sim | Sim (dados do time) | Sim (dados próprios) |

## Modelo de dados (principais entidades)

**Base**
- `companies`: empresa, configurações (fuso horário, referência de produção).
- `profiles`: dados do usuário.
- `memberships`: usuário, empresa e papel.
- `platform_admins`.
- `invitations`.

**Histórico central**
- `activities`: quem fez (`actor_type`: user, integration, automation, agent; `actor_id`), o quê (`action`), em qual registro (`entity_type`, `entity_id`), quando, e o que mudou (antes e depois). Toda ação importante grava aqui. É a base da memória e da confiança nos dados.

**Comercial**
- `pipelines` e `pipeline_stages`: etapas configuráveis por empresa.
- `contacts`: cliente, telefone normalizado, origem.
- `opportunities`: contato, responsável, produto, valor, etapa, status, próximo passo e data, resultado, motivo da perda.
- `opportunity_objections`.
- `next_steps`: tarefa com data, responsável e status.

**Captura**
- `integration_sources`: cada conexão (WhatsApp de um vendedor, webhook genérico).
- `raw_events`: tudo que chega, guardado do jeito que chegou. Permite reprocessar se a regra mudar.
- `conversations` e `messages`: direção (recebida ou enviada), horário, responsável.
- `daily_metrics`: números do dia por vendedor (conversas iniciadas, mensagens enviadas, tempo médio de resposta, clientes sem retorno).

**Relatórios e cruzamento**
- `report_templates`, `report_questions` (tipos: número, valor, texto, escolha única, escolha múltipla, sim ou não), `report_schedules` (horário e se é referente ao dia atual ou anterior).
- `report_submissions` e `report_answers`.
- `crosscheck_rules`: liga uma pergunta do relatório a uma métrica capturada, com tolerância.
- `divergences`: valor declarado, valor capturado, status e justificativa.

**Inteligência**
- `alerts`: tipo, gravidade, pessoa, registro relacionado, status.
- `knowledge_documents` e `knowledge_chunks`: cérebro central (global da Orbion) e documentos de cada empresa, com tags e vetores.
- `calibration_cases`: conversa real, avaliação esperada e resultado.
- `memory_items`: fatos de memória com escopo (empresa ou pessoa), origem e data.
- `agents`: papel, instruções, ferramentas e fontes permitidas.
- `agent_threads`, `agent_messages`: conversas com os agentes, sempre com o agente identificado.
- `ai_runs`: cada chamada à IA, com tokens, custo, empresa e resultado.
- `conversation_analyses`: análise estruturada de uma conversa (critérios, notas, pontos fortes, falhas, recomendações).

**Desenvolvimento e operação**
- `trainings`, `training_recommendations` (motivo, origem, status: recomendado, iniciado, concluído).
- `commercial_documents` e `document_versions`.
- `action_items`: ações com responsável, prazo, status e origem.
- `maturity_assessments`.

## Camada de integrações

Toda fonte externa segue o mesmo caminho:

1. Recebe o evento (webhook ou consulta periódica) e grava em `raw_events`.
2. Um processador transforma o evento no formato interno (contato, conversa, mensagem).
3. O processador grava o resultado e registra a atividade com `actor_type = integration`.

Para adicionar uma ferramenta nova basta escrever um novo tradutor de eventos. O resto do sistema não muda. O WhatsApp é a primeira fonte. Um webhook genérico com chave por empresa fica pronto junto, para receber dados de qualquer ferramenta.

## Segurança

- Senhas e sessões ficam com o Supabase Auth. Cookies seguros, sem token no armazenamento do navegador.
- Chaves de API (Anthropic, WhatsApp) apenas em variáveis de ambiente do servidor.
- Webhooks validados por assinatura ou chave secreta por empresa.
- Limite de requisições nas rotas públicas e nas chamadas de IA.
- Todo dado de entrada passa por validação Zod no servidor.
- Mensagens de erro para o usuário não mostram detalhes internos. Os detalhes vão para o log.
- Backups diários do Supabase (plano pago).
- LGPD: aviso de privacidade, política de retenção de conversas, exportação e exclusão de dados de um contato a pedido.

## Estrutura de pastas planejada

```
src/
  app/                 telas e rotas (App Router)
    (auth)/            login, convite, recuperar senha
    (app)/             área logada: vendedor, líder, admin
    api/               webhooks, tarefas agendadas
  modules/             regras de negócio por módulo (opportunities, capture, reports, alerts, agents...)
  lib/                 clientes (supabase, anthropic), utilidades
  components/          componentes de tela reutilizáveis
supabase/
  migrations/          alterações do banco versionadas
  seed.sql             dados de desenvolvimento
tests/                 testes de integração, isolamento e fluxos
```
