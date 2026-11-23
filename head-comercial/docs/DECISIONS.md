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
**Decidido pelo proprietário em 2026-11-23:** repositório novo no GitHub, criado pelo proprietário.

## D008 · 2026-11-23 · WhatsApp com dois modos de conexão (revisada)
A equipe da Orbion usa WhatsApp no celular e no WhatsApp Web, junto com o GHL, sem API. Outras empresas podem já usar a API oficial. Por isso cada número pode ser conectado de um destes jeitos:

1. **Modo API oficial:** para quem já usa ou quer usar a Cloud API da Meta. O sistema recebe as mensagens pelo webhook oficial.
2. **Modo aparelho (QR Code):** para quem usa o WhatsApp normal no celular e no Web. O vendedor lê um QR Code e o sistema vira mais um "aparelho conectado", igual ao WhatsApp Web. O vendedor continua usando celular e Web do mesmo jeito. Usaremos a Evolution API (código aberto) hospedada por nós.

**Regras do modo aparelho no MVP:**
- O sistema só lê. Nenhuma mensagem sai do sistema por esse modo. Isso reduz bastante o risco de bloqueio.
- É uma conexão não oficial. Vai contra os termos do WhatsApp e existe risco de o número ser bloqueado. A tela de conexão mostra esse aviso e registra quem aceitou e quando.
- Grupos ficam fora da captura no MVP. Só conversas individuais.

**Motivo:** atender a operação da Orbion como ela funciona hoje e deixar o caminho oficial pronto para quem já usa API.
**Consequências:** o modo aparelho precisa de um servidor pequeno ligado o tempo todo (a Vercel não roda esse tipo de serviço). Custo estimado entre 5 e 20 dólares por mês. Vai precisar da autorização do proprietário na Fase 2.
**Substitui:** a versão anterior desta decisão, que previa apenas a API oficial em coexistência. A coexistência continua possível dentro do modo API oficial, para quem usa o app WhatsApp Business.

## D009 · 2026-11-23 · Oportunidades próprias e conexão com qualquer CRM (revisada)
O Head Comercial tem o próprio cadastro de contatos e oportunidades e funciona completo sem CRM nenhum. Quem usa um CRM (GHL, RD Station, Pipedrive, HubSpot, Kommo, Agendor, Salesforce ou qualquer outro) pode conectá-lo. Nenhum CRM é tratado como especial.

**Como a conexão funciona, para qualquer CRM:**
1. **Formato padrão do Head.** Existe um formato único para contato, oportunidade, etapa e mudança de etapa. Todo CRM é traduzido para esse formato. O resto do sistema só conhece o formato padrão.
2. **Mapeamento por empresa.** Numa tela de configuração, a empresa diz qual etapa do CRM dela corresponde a qual etapa do Head e qual campo corresponde a qual campo (ex.: "Proposta enviada" no CRM dela vira a etapa "Proposta" no Head).
3. **Três jeitos de os dados chegarem, do mais simples ao mais completo:**
   - **Webhook e API do Head:** qualquer CRM que dispara webhook, ou ferramentas como Make, Zapier e n8n, envia os dados no formato padrão. Funciona com praticamente qualquer CRM desde o primeiro dia, sem programação nossa para cada um.
   - **Importação por planilha (CSV):** para começar com o histórico ou para CRMs sem webhook.
   - **Conectores nativos:** para os CRMs mais usados pelos clientes, um conector pronto que só pede a chave de acesso. Construídos aos poucos, conforme a demanda.

**Quem manda em cada dado:** quando um CRM está conectado, os campos que vêm dele ficam marcados com a origem e são atualizados por lá, para ninguém preencher duas vezes. Campos que só o Head tem (objeções, análises, próximos passos sugeridos) são editados no Head.

**Primeiro conector nativo:** o da operação piloto. Hoje é o GHL, porque é o que a Orbion usa. Ele serve como primeiro exemplo do padrão e não recebe nenhum tratamento especial no código.

**Motivo:** o produto precisa servir qualquer empresa, use ela um CRM ou não.

## Decisões pendentes com o proprietário
- P3: Fornecedor de vetores para a busca do cérebro central (recomendação: Voyage AI, indicado pela Anthropic). Pode esperar até a Fase 5.
