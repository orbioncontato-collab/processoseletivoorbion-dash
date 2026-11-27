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
import { listAssignments, listLibrary } from "@/modules/training/queries";
import { SKILLS, STATUS_LABELS } from "@/modules/training/skills";
import { getStages } from "@/modules/commercial/queries";
import { funnelMetrics, type FunnelOpp } from "@/modules/commercial/funnel-metrics";
import { forecastMonth, type ForecastOpp } from "@/modules/commercial/forecast";
import { zonedLocalToUtc } from "@/lib/format";
import { getDocument, listDocuments } from "@/modules/documents/queries";
import { DOC_KIND_LABELS } from "@/modules/documents/labels";
import { listActions } from "@/modules/action-plan/queries";
import { insertAction } from "@/modules/action-plan/service";
import { ACTION_PRIORITY, ACTION_STATUS } from "@/modules/action-plan/labels";

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
  tool({
    name: "ver_treinamentos",
    description:
      "Treinamentos indicados (para a pessoa ou, para o líder, para o time), com motivo, situação e evolução depois da conclusão, e a biblioteca disponível por habilidade. Use quando perguntarem o que estudar ou como alguém está evoluindo.",
    schema: z.object({ incluir_biblioteca: z.boolean().default(false) }),
    run: async (i, ctx) => {
      const [assignments, library, team] = await Promise.all([
        listAssignments(ctx.companyId, ctx.role === "leader" ? {} : { userId: ctx.userId }),
        i.incluir_biblioteca ? listLibrary() : Promise.resolve([]),
        getTeam(ctx.companyId),
      ]);
      const name = new Map(team.map((t) => [t.userId, t.name]));
      return {
        indicados: assignments.slice(0, 40).map((a) => ({
          para: a.user_id === ctx.userId ? "você" : (name.get(a.user_id) ?? "Ex-membro"),
          treinamento: a.trainingTitle,
          habilidade: SKILLS[a.skill as keyof typeof SKILLS] ?? a.skill,
          situacao: STATUS_LABELS[a.status] ?? a.status,
          motivo: a.reason,
          evolucao: a.evolution,
        })),
        biblioteca: library.slice(0, 60).map((t) => ({ titulo: t.title, habilidade: SKILLS[t.skill as keyof typeof SKILLS] ?? t.skill, resumo: t.summary })),
      };
    },
  }),

  tool({
    name: "metricas_do_funil",
    description:
      "Saúde do funil no período: negociações e valor por etapa, criadas, ganhas e perdidas, taxa de ganho, ticket médio, ciclo médio de venda, paradas, sem próximo passo, vencidas e motivos de perda. Para o líder é o time; para o vendedor, só as dele. Pode filtrar por vendedor.",
    schema: z.object({ dias: z.number().int().min(7).max(365).default(90), responsavel_id: uuid.optional() }),
    run: async (i, ctx) => {
      const supabase = await createClient();
      let q = supabase
        .from("opportunities")
        .select("stage_id, owner_id, status, value_cents, created_at, closed_at, last_activity_at, next_step_at, lost_reason")
        .eq("company_id", ctx.companyId)
        .limit(5000);
      if (i.responsavel_id) q = q.eq("owner_id", i.responsavel_id);
      const [{ data: opps }, stages, { data: settings }] = await Promise.all([
        q,
        getStages(ctx.companyId),
        supabase.from("company_settings").select("stale_days").eq("company_id", ctx.companyId).maybeSingle(),
      ]);
      const m = funnelMetrics((opps ?? []) as FunnelOpp[], stages, { periodDays: i.dias, staleDays: settings?.stale_days ?? 7 });
      const money = (c: number | null) => (c === null ? null : formatMoney(c));
      return {
        ...m,
        valor_em_aberto: money(m.valor_em_aberto_cents),
        valor_ganho: money(m.valor_ganho_cents),
        ticket_medio_ganho: money(m.ticket_medio_ganho_cents),
        por_etapa: m.por_etapa.map((e) => ({ etapa: e.etapa, negociacoes: e.negociacoes, valor: money(e.valor_cents) })),
      };
    },
  }),
  tool({
    name: "listar_documentos",
    description: "Documentos comerciais da empresa (playbook, roteiros, política de preço, processos) com a versão publicada e a mais recente.",
    schema: z.object({}),
    run: async (_i, ctx) =>
      (await listDocuments(ctx.companyId)).map((d) => ({
        id: d.id,
        titulo: d.title,
        tipo: DOC_KIND_LABELS[d.kind] ?? d.kind,
        versao_publicada: d.published_version,
        versao_mais_recente: ctx.role === "leader" ? d.latest_version : d.published_version,
      })),
  }),
  tool({
    name: "ver_documento",
    description: "Conteúdo de um documento comercial: a versão publicada (e, para o líder, também a mais recente, se for rascunho).",
    schema: z.object({ id: uuid }),
    run: async (i, ctx) => {
      const found = await getDocument(ctx.companyId, i.id);
      if (!found) return { erro: "Documento não encontrado ou sem permissão para ver." };
      const published = found.versions.find((v) => v.version === found.doc.published_version);
      const latest = found.versions[0];
      return {
        titulo: found.doc.title,
        tipo: DOC_KIND_LABELS[found.doc.kind] ?? found.doc.kind,
        versao_publicada: published ? { versao: published.version, conteudo: published.content } : null,
        rascunho_mais_recente: latest && latest.version !== published?.version ? { versao: latest.version, nota: latest.change_note, conteudo: latest.content } : null,
      };
    },
  }),
  tool({
    name: "propor_versao_documento",
    description:
      "Grava uma nova versão de um documento comercial como rascunho, para o líder revisar e publicar. Só funciona para líderes. Envie o texto completo do documento, não só o trecho alterado.",
    schema: z.object({ documento_id: uuid, conteudo: z.string().min(20).max(100000), nota: z.string().min(3).max(1000) }),
    run: async (i, ctx) => {
      if (ctx.role !== "leader") return { erro: "Só líderes podem gravar versões. Mostre a sugestão na resposta." };
      const found = await getDocument(ctx.companyId, i.documento_id);
      if (!found) return { erro: "Documento não encontrado." };
      const db = createServiceClient({ type: "agent", id: ctx.userId });
      const { data, error } = await db
        .from("document_versions")
        .insert({ company_id: ctx.companyId, document_id: i.documento_id, content: i.conteudo, change_note: i.nota, author_type: "agent", created_by: ctx.userId })
        .select("version")
        .single();
      if (error || !data) throw new Error(error?.message ?? "sem versão");
      return { versao: data.version, situacao: "rascunho", onde_revisar: `/documentos/${i.documento_id}?v=${data.version}` };
    },
  }),
  tool({
    name: "listar_acoes",
    description: "Ações do plano de ação em aberto (o vendedor vê as dele; o líder, as do time), com responsável, prazo, prioridade e situação.",
    schema: z.object({ incluir_encerradas: z.boolean().default(false) }),
    run: async (i, ctx) => {
      const [actions, team] = await Promise.all([
        listActions(ctx.companyId, { includeClosed: i.incluir_encerradas, ownerId: ctx.role === "leader" ? undefined : ctx.userId, limit: 100 }),
        getTeam(ctx.companyId),
      ]);
      const name = new Map(team.map((t) => [t.userId, t.name]));
      return actions.map((a) => ({
        acao: a.title,
        responsavel: name.get(a.owner_id) ?? "Ex-membro",
        prazo: a.due_date,
        prioridade: ACTION_PRIORITY[a.priority] ?? a.priority,
        situacao: ACTION_STATUS[a.status] ?? a.status,
      }));
    },
  }),
  tool({
    name: "criar_acao",
    description:
      "Cria uma ação no plano de ação, com responsável, prazo e prioridade. O líder pode atribuir a qualquer pessoa da equipe (use listar_equipe para achar o id); o vendedor só cria para si. Crie só o que a pessoa pediu ou aprovou.",
    schema: z.object({
      titulo: z.string().min(3).max(200),
      descricao: z.string().max(4000).optional(),
      responsavel_id: uuid.optional().describe("Sem informar, fica com a própria pessoa."),
      prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("AAAA-MM-DD"),
      prioridade: z.enum(["low", "medium", "high"]).default("medium"),
    }),
    run: async (i, ctx) => {
      const owner = i.responsavel_id ?? ctx.userId;
      if (ctx.role !== "leader" && owner !== ctx.userId) return { erro: "Vendedor só cria ações para si." };
      const result = await insertAction({
        companyId: ctx.companyId,
        actorId: ctx.userId,
        actorType: "agent",
        title: i.titulo,
        description: i.descricao,
        ownerId: owner,
        dueDate: i.prazo ?? null,
        priority: i.prioridade,
        source: "agent",
      });
      return "error" in result ? { erro: result.error } : { criada: true, titulo: i.titulo, onde_ver: "/acoes" };
    },
  }),

  tool({
    name: "previsao_receita",
    description:
      "Previsão de receita do mês atual: quanto já foi ganho, o que está previsto para fechar no mês, a projeção ponderada pela taxa de ganho dos últimos 90 dias, o melhor caso e, se informada, a meta. Para o líder é o time (com divisão por vendedor); para o vendedor, só as dele.",
    schema: z.object({ meta_reais: z.number().positive().max(1e10).optional().describe("Meta do mês em reais, se a pessoa informar.") }),
    run: async (i, ctx) => {
      const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: ctx.timezone, year: "numeric", month: "2-digit" }).format(new Date());
      const [y, m] = ymd.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
      const monthStart = zonedLocalToUtc(`${ymd}-01T00:00`, ctx.timezone)!.toISOString();
      const nextMonthStart = zonedLocalToUtc(`${next}-01T00:00`, ctx.timezone)!.toISOString();
      const since90 = new Date(Date.now() - 90 * 86_400_000).toISOString();
      const supabase = await createClient();
      const [{ data }, team] = await Promise.all([
        supabase.from("opportunities").select("owner_id, status, value_cents, expected_close_date, closed_at").eq("company_id", ctx.companyId).limit(5000),
        getTeam(ctx.companyId),
      ]);
      const opps = (data ?? []) as ForecastOpp[];
      const range = { monthStart, nextMonthStart, since90 };
      const target = i.meta_reais ? Math.round(i.meta_reais * 100) : null;
      const total = forecastMonth(opps, { ...range, target });
      const money = (c: number | null) => (c === null ? null : formatMoney(c));
      const fmt = (f: ReturnType<typeof forecastMonth>) => ({
        ganho_no_mes: money(f.ganho_no_mes_cents),
        ganhas_no_mes: f.ganhas_no_mes,
        previstas_para_o_mes: f.previstas_para_o_mes,
        valor_previsto: money(f.valor_previsto_cents),
        taxa_usada_pct: f.taxa_usada_pct,
        taxa_com_historico: f.taxa_com_historico,
        projecao: money(f.projecao_cents),
        melhor_caso: money(f.melhor_caso_cents),
        sem_previsao_de_fechamento: f.sem_previsao_de_fechamento,
        meta: money(f.meta_cents),
        atingimento_projetado_pct: f.atingimento_projetado_pct,
      });
      const byOwner =
        ctx.role === "leader"
          ? team.map((t) => ({ vendedor: t.name, ...fmt(forecastMonth(opps.filter((o) => o.owner_id === t.userId), range)) }))
          : [];
      return { mes: ymd, total: fmt(total), por_vendedor: byOwner };
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

const DEFINITIONS = new Map<string, Anthropic.Beta.BetaTool>(
  TOOLS.map((t) => [
    t.name,
    {
      name: t.name,
      description: t.description,
      input_schema: inputSchema(t.schema),
      // As entradas chegam aos poucos durante a resposta; runTool valida cada uma antes de executar.
      eager_input_streaming: true,
    },
  ]),
);

export const ALL_TOOL_NAMES = TOOLS.map((t) => t.name);

/** Definições enviadas à API, sempre na mesma ordem (ajuda o cache). */
export function toolDefinitions(names: readonly string[] = ALL_TOOL_NAMES): Anthropic.Beta.BetaTool[] {
  return ALL_TOOL_NAMES.filter((n) => names.includes(n)).map((n) => DEFINITIONS.get(n)!);
}

const MAX_RESULT_CHARS = 30_000;

/** Executa uma ferramenta pedida pelo modelo. Erros voltam como texto para o modelo se corrigir. */
export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: AgentContext,
  allowed: readonly string[] = ALL_TOOL_NAMES,
): Promise<{ content: string; isError: boolean }> {
  const spec = BY_NAME.get(name);
  if (!spec || !allowed.includes(name)) return { content: `Ferramenta indisponível para este agente: ${name}`, isError: true };
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
