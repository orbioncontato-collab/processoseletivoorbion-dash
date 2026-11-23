import { z } from "zod";
import { normalizePhone, parseMoneyToCents } from "@/lib/format";
import { LOST_REASONS, type LostReason } from "@/modules/commercial/schemas";

/**
 * Formato padrão de entrada do Head Comercial.
 * Qualquer fonte (CRM, Make, Zapier, n8n, planilha, WhatsApp) é traduzida para estes eventos.
 * Funções puras, testadas em standard.test.ts.
 */

export const EVENT_TYPES = ["contact.upsert", "opportunity.upsert", "message"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const envelopeSchema = z.object({
  type: z.enum(EVENT_TYPES, { message: `Tipo de evento inválido. Use: ${EVENT_TYPES.join(", ")}.` }),
  idempotency_key: z.string().trim().min(1).max(200).optional(),
  data: z.record(z.string(), z.unknown()),
});
export type Envelope = z.infer<typeof envelopeSchema>;

/** Aceita um evento sozinho ou um lote { events: [...] } com até 100 eventos. */
export const requestSchema = z.union([
  envelopeSchema.transform((e) => [e]),
  z.object({ events: z.array(envelopeSchema).min(1).max(100) }).transform((b) => b.events),
]);

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const externalId = z.union([z.string(), z.number()]).transform((v) => String(v).trim()).pipe(z.string().min(1).max(200));

export const contactDataSchema = z.object({
  external_id: externalId,
  name: z.string().trim().min(1, "Nome do contato é obrigatório.").max(120),
  phone: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? undefined : String(v))),
  email: text(200),
  organization: text(120),
  notes: text(4000),
  owner_email: text(200),
});
export type ContactData = z.infer<typeof contactDataSchema>;

const isoDateTime = z
  .string()
  .optional()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Data e hora inválidas (use o padrão ISO 8601).");

export const opportunityDataSchema = z
  .object({
    external_id: externalId,
    title: z.string().trim().min(1, "Título é obrigatório.").max(160),
    contact_external_id: externalId.optional(),
    contact: contactDataSchema.partial({ external_id: true }).optional(),
    value: z.union([z.number(), z.string()]).optional(),
    product: text(120),
    stage: text(120),
    status: z.enum(["open", "won", "lost"]).optional(),
    lost_reason: text(500),
    next_step: text(280),
    next_step_at: isoDateTime,
    expected_close_date: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data de fechamento inválida (use AAAA-MM-DD)."),
    owner_email: text(200),
  })
  .refine((v) => v.contact_external_id || v.contact, {
    message: "Informe contact_external_id ou contact.",
    path: ["contact"],
  });
export type OpportunityData = z.infer<typeof opportunityDataSchema>;

export const MESSAGE_TYPES = ["text", "audio", "image", "video", "document", "sticker", "location", "other"] as const;

export const messageDataSchema = z.object({
  external_id: externalId,
  conversation_external_id: externalId.optional(),
  direction: z.enum(["inbound", "outbound"], { message: "direction deve ser inbound ou outbound." }),
  sent_at: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "sent_at inválido (use o padrão ISO 8601)."),
  contact: z.object({
    phone: z.union([z.string(), z.number()]).transform((v) => String(v)),
    name: text(120),
  }),
  body: z.string().max(10000).optional(),
  type: z.enum(MESSAGE_TYPES).optional().catch("other"),
  seller_email: text(200),
});
export type MessageData = z.infer<typeof messageDataSchema>;

/** Telefone recebido: devolve o padrão E.164 ou null, com aviso quando veio inválido. */
export function readPhone(raw: string | undefined): { phone: string | null; warning?: string } {
  if (!raw || !raw.trim()) return { phone: null };
  const phone = normalizePhone(raw);
  return phone ? { phone } : { phone: null, warning: `Telefone "${raw}" ignorado por estar fora do padrão.` };
}

/** Valor em reais (número ou texto) para centavos. */
export function readValueCents(value: number | string | undefined): number | null {
  if (value == null || value === "") return 0;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }
  return parseMoneyToCents(value);
}

/** Converte o motivo de perda escrito livremente para a lista do Head. */
export function readLostReason(raw: string | undefined): { reason: LostReason; detail: string | null } {
  if (!raw) return { reason: "outro", detail: "Encerrada pela integração sem motivo informado." };
  const key = raw.trim().toLowerCase();
  if (key in LOST_REASONS) return { reason: key as LostReason, detail: null };
  const plain = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const rules: [RegExp, LostReason][] = [
    [/orcamento|budget|sem verba|sem dinheiro/, "sem_orcamento"],
    [/preco|caro|valor alto|desconto/, "preco"],
    [/concorr/, "concorrente"],
    [/nao respond|sem resposta|sumiu|parou de responder|ghost/, "sem_resposta"],
    [/momento|timing|depois|mais pra frente|mais para frente|adiou/, "timing"],
    [/perfil|fit|nao se encaixa|nao e o publico/, "sem_fit"],
  ];
  const hit = rules.find(([re]) => re.test(plain));
  return { reason: hit ? hit[1] : "outro", detail: raw.trim().slice(0, 500) };
}

export interface StageRef {
  id: string;
  name: string;
  kind: "open" | "won" | "lost";
}

export type StageResolution = { stageId: string } | { keep: true } | { error: string };

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/**
 * Descobre a etapa do Head para o que veio da fonte.
 * Ordem: mapeamento configurado > mesmo nome de uma etapa do Head > situação (ganha/perdida).
 * Sem etapa nem situação: na criação usa a primeira etapa aberta; na atualização mantém a atual.
 */
export function resolveStage(
  input: { stage?: string; status?: "open" | "won" | "lost" },
  stageMap: Record<string, string>,
  stages: StageRef[],
  creating: boolean,
): StageResolution {
  const byId = new Map(stages.map((s) => [s.id, s]));
  const firstOf = (kind: StageRef["kind"]) => stages.find((s) => s.kind === kind);

  let found: StageRef | undefined;
  if (input.stage) {
    const mapped = Object.entries(stageMap).find(([k]) => norm(k) === norm(input.stage!))?.[1];
    found = (mapped && byId.get(mapped)) || stages.find((s) => norm(s.name) === norm(input.stage!));
  }

  // A situação informada tem prioridade quando conflita com a etapa.
  if (input.status === "won" || input.status === "lost") {
    if (found?.kind === input.status) return { stageId: found.id };
    const terminal = firstOf(input.status);
    return terminal ? { stageId: terminal.id } : { error: "O funil não tem etapa de encerramento." };
  }

  if (found) return { stageId: found.id };
  if (input.stage) return { error: `Etapa "${input.stage}" não está mapeada para nenhuma etapa do Head.` };
  if (!creating) return { keep: true };
  const first = firstOf("open");
  return first ? { stageId: first.id } : { error: "O funil não tem etapa em andamento." };
}

/** Mensagem curta e legível a partir de um erro de validação. */
export function describeIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 3)
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join(" · ");
}
