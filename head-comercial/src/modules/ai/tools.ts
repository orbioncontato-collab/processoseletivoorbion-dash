import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getOpportunity, getOpportunityTimeline, getTeam, listOpportunities } from "@/modules/commercial/queries";
import { getConversation, getTodayMetrics, listConversations } from "@/modules/conversations/queries";
import { listOpenAlerts } from "@/modules/alerts/queries";
import { ALERT_LABELS } from "@/modules/alerts/rules";

/**
 * Ferramentas de consulta dos agentes. Todas leem com o login da pessoa que
 * conversa com o agente, então o RLS decide o que aparece: o vendedor só vê o
 * que é dele, o líder vê o time, e nada de outra empresa. A única exceção é a
 * busca no conhecimento, que inclui a metodologia Orbion (global); ela roda
 * pelo servidor, sempre presa à empresa ativa da pessoa.
 */

export interface AgentContext {
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  role: "leader" | "seller";
  timezone: string;
}

interface ToolSpec<S extends z.ZodType> {
  name: string;
  description: string;
  schema: S;
  run: (input: z.infer<S>, ctx: AgentContext) => Promise<unknown>;
}

const tool = <S extends z.ZodType>(spec: ToolSpec<S>) => spec;

const uuid = z.uuid();

const TOOLS = [
  tool({
    name: "listar_oportunidades",
    description:
      "Lista negociações da empresa que a pessoa pode ver (o vendedor vê as dele; o líder, as do time). Use para responder sobre o funil, prioridades, próximos passos vencidos, negociações paradas ou sem próximo passo.",
    schema: z.object({
      situacao: z.enum(["open", "won", "lost", "all"]).default("open").describe("open = em aberto, won = ganhas, lost = perdidas"),
      filtro: z
        .enum(["overdue", "today", "none", "stale"])
        .optional()
        .describe("overdue = próximo passo vencido, today = para hoje, none = sem próximo passo, stale = paradas"),
      responsavel_id: uuid.optional().describe("Filtra por um vendedor (id). Só faz diferença para o líder."),
      busca: z.string().max(80).optional().describe("Parte do título ou do nome do cliente"),
      limite: z.number().int().min(1).max(50).default(20),
    }),
    run: async (i, ctx) => {
      const rows = await listOpportunities(
        ctx.companyId,
        { status: i.situacao, due: i.filtro, owner: i.responsavel_id, q: i.busca },
        ctx.timezone,
        i.limite,
      );
      return rows.map((o) => ({
        id: o.id,
        titulo: o.title,
        cliente: o.contactName,
        etapa: o.stageName,
        situacao: o.status,
        responsavel: o.ownerName,
        valor: formatMoney(o.value_cents),
        proximo_passo: o.next_step,
        proximo_passo_em: o.next_step_at ? formatDateTime(o.next_step_at, ctx.timezone) : null,
        ultima_movimentacao: formatDateTime(o.last_activity_at, ctx.timezone),
      }));
    },
  }),
  tool({
    name: "ver_oportunidade",
    description: "Detalhes de uma negociação: cliente, valor, etapa, próximo passo, objeções e as últimas movimentações do histórico.",
    schema: z.object({ id: uuid }),
    run: async (i, ctx) => {
      const found = await getOpportunity(ctx.companyId, i.id);
      if (!found) return { erro: "Negociação não encontrada ou sem permissão para ver." };
      const timeline = await getOpportunityTimeline(i.id);
      return {
        titulo: found.opp.title,
        cliente: found.contact?.name,
        empresa_do_cliente: found.contact?.organization,
        situacao: found.opp.status,
        valor: formatMoney(found.opp.value_cents),
        produto: found.opp.product,
        proximo_passo: found.opp.next_step,
        proximo_passo_em: found.opp.next_step_at ? formatDateTime(found.opp.next_step_at, ctx.timezone) : null,
        previsao_fechamento: found.opp.expected_close_date,
        motivo_perda: found.opp.lost_reason,
        objecoes: found.objections.map((o) => ({ tipo: o.category, descricao: o.description, situacao: o.status })),
        historico: timeline.slice(0, 20).map((a) => ({
          quando: formatDateTime(a.occurred_at, ctx.timezone),
          autor: a.actor_type,
          acao: a.action,
          mudancas: a.changes,
        })),
      };
    },
  }),
  tool({
    name: "listar_alertas",
    description:
      "Alertas em aberto (próximo passo vencido ou de hoje, sem próximo passo, negociação parada, cliente esperando resposta, produção abaixo da referência, relatório não preenchido, divergência).",
    schema: z.object({ responsavel_id: uuid.optional() }),
    run: async (i, ctx) => {
      const alerts = await listOpenAlerts(ctx.companyId, { userId: i.responsavel_id, limit: 60 });
      return alerts.map((a) => ({
        tipo: ALERT_LABELS[a.type]?.one ?? a.type,
        gravidade: a.severity,
        titulo: a.title,
        responsavel_id: a.user_id,
        desde: formatDateTime(a.first_seen_at, ctx.timezone),
        registro: a.entity_type ? { tipo: a.entity_type, id: a.entity_id } : null,
      }));
    },
  }),
  tool({
    name: "numeros_de_hoje",
    description: "Números do WhatsApp de hoje por vendedor: conversas, mensagens enviadas e recebidas, tempo médio da primeira resposta e clientes esperando retorno.",
    schema: z.object({}),
    run: async (_i, ctx) => {
      const [metrics, team] = await Promise.all([getTodayMetrics(ctx.companyId, ctx.timezone), getTeam(ctx.companyId)]);
      const name = new Map(team.map((t) => [t.userId, t.name]));
      return metrics.map((m) => ({
        vendedor: name.get(m.ownerId) ?? "Ex-membro",
        conversas_ativas: m.conversationsActive,
        conversas_iniciadas: m.conversationsStarted,
        mensagens_recebidas: m.inbound,
        mensagens_enviadas: m.outbound,
        tempo_medio_primeira_resposta_min: m.avgFirstResponseSeconds == null ? null : Math.round(m.avgFirstResponseSeconds / 60),
        clientes_esperando: m.awaitingReply,
      }));
    },
  }),
  tool({
    name: "listar_equipe",
    description: "Pessoas da equipe com id, nome e papel. Use para descobrir o id de um vendedor citado pelo nome.",
    schema: z.object({}),
    run: async (_i, ctx) => (await getTeam(ctx.companyId)).map((t) => ({ id: t.userId, nome: t.name, papel: t.role })),
  }),
  tool({
    name: "listar_conversas",
    description: "Conversas do WhatsApp mais recentes, com o cliente e a última mensagem. Use 'so_esperando' para ver só quem está esperando resposta.",
    schema: z.object({ so_esperando: z.boolean().default(false), limite: z.number().int().min(1).max(30).default(15) }),
    run: async (i, ctx) => {
      const rows = await listConversations(ctx.companyId, { awaiting: i.so_esperando });
      return rows.slice(0, i.limite).map((c) => ({
        id: c.id,
        cliente: c.contactName,
        esperando_resposta: c.awaiting_reply,
        ultima_mensagem_em: formatDateTime(c.last_message_at, ctx.timezone),
        ultima_mensagem: c.last ? `${c.last.direction === "inbound" ? "Cliente" : "Vendedor"}: ${(c.last.body ?? `[${c.last.message_type}]`).slice(0, 200)}` : null,
      }));
    },
  }),
  tool({
    name: "ver_conversa",
    description: "Mensagens de uma conversa do WhatsApp (as últimas 120), em ordem. Use antes de opinar sobre como o vendedor conduziu.",
    schema: z.object({ id: uuid }),
    run: async (i, ctx) => {
      const found = await getConversation(ctx.companyId, i.id);
      if (!found) return { erro: "Conversa não encontrada ou sem permissão para ver." };
      return {
        cliente: found.contact?.name,
        mensagens: found.messages.slice(-120).map((m) => ({
          quando: formatDateTime(m.sent_at, ctx.timezone),
          de: m.direction === "inbound" ? "Cliente" : "Vendedor",
          texto: m.body ?? `[${m.message_type}]`,
        })),
      };
    },
  }),
  tool({
    name: "buscar_conhecimento",
    description:
      "Busca na metodologia Orbion e nos materiais da empresa (playbooks, scripts, objeções, processos). Use palavras-chave do assunto. Baseie as orientações no que encontrar e diga de qual documento veio.",
    schema: z.object({ pergunta: z.string().min(2).max(300) }),
    run: async (i, ctx) => {
      const db = createServiceClient({ type: "agent", id: ctx.userId });
      const { data, error } = await db.rpc("search_knowledge", {
        target_company: ctx.companyId,
        q: i.pergunta,
        include_global: true,
        max_results: 6,
      });
      if (error) throw new Error(error.message);
      if (!data?.length) return { resultado: "Nada encontrado. Tente outras palavras." };
      return data.map((h) => ({
        documento: h.title,
        origem: h.scope === "global" ? "Metodologia Orbion" : "Material da empresa",
        secao: h.heading,
        trecho: h.content,
      }));
    },
  }),
  tool({
    name: "ver_memoria",
    description: "O que o Head sabe sobre a empresa (produto, ticket, perfil de cliente, processo, metas) e sobre a pessoa (pontos fortes, dificuldades, preferências).",
    schema: z.object({}),
    run: async (_i, ctx) => {
      const supabase = await createClient();
      const { data } = await supabase
        .from("memory_items")
        .select("scope, subject_user_id, category, content, created_at")
        .eq("company_id", ctx.companyId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(80);
      return (data ?? []).map((m) => ({
        sobre: m.scope === "company" ? "empresa" : m.subject_user_id === ctx.userId ? "você" : `pessoa ${m.subject_user_id}`,
        assunto: m.category,
        fato: m.content,
      }));
    },
  }),
];

type AnyTool = (typeof TOOLS)[number];
const BY_NAME = new Map<string, AnyTool>(TOOLS.map((t) => [t.name, t]));

function inputSchema(schema: z.ZodType): Anthropic.Beta.BetaTool.InputSchema {
  const json = z.toJSONSchema(schema, { io: "input" }) as Record<string, unknown>;
  delete json.$schema;
  return json as Anthropic.Beta.BetaTool.InputSchema;
}

/** Definições enviadas à API, sempre na mesma ordem (ajuda o cache). */
export const TOOL_DEFINITIONS: Anthropic.Beta.BetaTool[] = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: inputSchema(t.schema),
}));


const MAX_RESULT_CHARS = 30_000;

/** Executa uma ferramenta pedida pelo modelo. Erros voltam como texto para o modelo se corrigir. */
export async function runTool(name: string, rawInput: unknown, ctx: AgentContext): Promise<{ content: string; isError: boolean }> {
  const spec = BY_NAME.get(name);
  if (!spec) return { content: `Ferramenta desconhecida: ${name}`, isError: true };
  const parsed = spec.schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { content: `Parâmetros inválidos: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, isError: true };
  }
  try {
    // O tipo de entrada já foi validado pelo schema da própria ferramenta.
    const result = await (spec.run as (input: unknown, c: AgentContext) => Promise<unknown>)(parsed.data, ctx);
    const text = JSON.stringify(result);
    return { content: text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)}… (resultado cortado)` : text, isError: false };
  } catch (err) {
    console.error(`[tool:${name}]`, err);
    return { content: "Falha ao consultar os dados. Tente de outro jeito ou avise a pessoa.", isError: true };
  }
}
