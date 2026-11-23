# Decisões técnicas

Cada decisão tem data, motivo e se pode ser revista.

## D001 · 2026-11-23 · Stack principal
Next.js com TypeScript, Supabase (Postgres, Auth, RLS, pgvector, Storage), Tailwind com shadcn/ui, Zod, Vercel.
**Motivo:** a equipe já usa Next.js; Supabase entrega login, isolamento por empresa e busca vetorial prontos, o que reduz infraestrutura genérica.
**Pode rever?** Hospedagem sim, banco e login com custo alto.

## D002 · 2026-11-23 · Isolamento por empresa no banco
`company_id` em toda tabela de negócio e políticas RLS no Postgres, com testes automáticos que tentam ler dados de outra empresa.
**Motivo:** proteger os dados mesmo que exista erro na tela ou na API.

## D003 · 2026-11-23 · Histórico central único
Uma tabela `activities` para todos os módulos, com tipo de autor (usuário, integração, automação, agente).
**Motivo:** memória, auditoria e confiança nos dados a partir de um lugar só.

## D004 · 2026-11-23 · Integrações como fontes de dados
Todo evento externo entra bruto em `raw_events` e passa por um tradutor. Nenhum módulo depende diretamente de uma ferramenta externa.
**Motivo:** trocar ou somar fontes (WhatsApp, webhook, CRM) sem mexer no resto.

## D005 · 2026-11-23 · Agentes com laço próprio na API da Anthropic
API de mensagens com ferramentas executadas no nosso servidor, com as permissões do usuário logado. Modelo padrão `claude-opus-5-5`, com fallback automático em caso de recusa.
**Motivo:** isolamento entre empresas igual ao resto do sistema, respostas rápidas no chat, custo só de tokens. Managed Agents fica como opção para tarefas longas.

## D006 · 2026-11-23 · Análise profunda só quando escolhida
Captura de todas as mensagens, análise com IA só de conversas selecionadas ou marcadas por regra.
**Motivo:** custo e foco, como pede o documento do produto.

## D007 · 2026-11-23 · Projeto separado do dashboard de recrutamento
O Head Comercial será um aplicativo novo. O dashboard de processo seletivo atual continua intacto.
**Motivo:** produtos diferentes, com usuários e dados diferentes.
**Pendente:** definir o repositório (ver PROGRESS.md).

## Decisões pendentes com o proprietário
- P1: Repositório do novo produto.
- P2: Forma de conexão com o WhatsApp.
- P3: Fornecedor de vetores para a busca do cérebro central (recomendação: Voyage AI, indicado pela Anthropic). Pode esperar até a Fase 5.
