import { z } from "zod";
import { normalizePhone, parseMoneyToCents } from "@/lib/format";

export const STATUS_LABELS = { open: "Em aberto", won: "Ganha", lost: "Perdida" } as const;

export const LOST_REASONS = {
  preco: "Preço",
  timing: "Momento errado",
  concorrente: "Fechou com concorrente",
  sem_resposta: "Parou de responder",
  sem_fit: "Sem perfil para a solução",
  sem_orcamento: "Sem orçamento",
  outro: "Outro",
} as const;
export type LostReason = keyof typeof LOST_REASONS;

export const OBJECTION_CATEGORIES = {
  preco: "Preço",
  tempo: "Tempo ou momento",
  confianca: "Confiança",
  necessidade: "Necessidade",
  concorrente: "Concorrente",
  decisor: "Decisor",
  outro: "Outro",
} as const;

export const SOURCE_LABELS: Record<string, string> = {
  manual: "Cadastro manual",
  whatsapp: "WhatsApp",
  crm: "CRM",
  import: "Importação",
  api: "API",
};

export const STAGE_KIND_LABELS = { open: "Em andamento", won: "Ganho", lost: "Perda" } as const;

const optionalText = (max: number, msg: string) =>
  z
    .string()
    .trim()
    .max(max, msg)
    .optional()
    .transform((v) => (v ? v : null));

const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.uuid().nullable());

/** Telefone opcional: vazio vira null; preenchido precisa ser válido. */
const phoneField = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v || !v.trim()) return null;
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Telefone inválido. Ex.: (11) 98765-4321" });
      return z.NEVER;
    }
    return p;
  });

const moneyField = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const cents = parseMoneyToCents(v ?? "");
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Valor inválido. Ex.: 1.500,00" });
      return z.NEVER;
    }
    if (cents > 100_000_000_000) {
      ctx.addIssue({ code: "custom", message: "Valor alto demais." });
      return z.NEVER;
    }
    return cents;
  });

const localDateTime = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data e hora inválidas.")
      .nullable(),
  );

const isoDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable());

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
  phone: phoneField,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.email("E-mail inválido.").nullable()),
  organization: optionalText(120, "Máximo de 120 caracteres."),
  notes: optionalText(4000, "Máximo de 4000 caracteres."),
  ownerId: optionalUuid,
});

const nextStepFields = {
  nextStep: optionalText(280, "Máximo de 280 caracteres."),
  nextStepAt: localDateTime,
};

const requireNextStepText = <T extends { nextStep: string | null; nextStepAt: string | null }>(v: T) =>
  !v.nextStepAt || Boolean(v.nextStep);

export const createOpportunitySchema = z
  .object({
    contactId: optionalUuid,
    newContactName: optionalText(120, "Máximo de 120 caracteres."),
    newContactPhone: phoneField,
    title: z.string().trim().min(1, "Informe um título.").max(160, "Máximo de 160 caracteres."),
    product: optionalText(120, "Máximo de 120 caracteres."),
    value: moneyField,
    stageId: z.uuid("Escolha a etapa."),
    ownerId: optionalUuid,
    expectedCloseDate: isoDate,
    ...nextStepFields,
  })
  .refine((v) => v.contactId || v.newContactName, {
    message: "Escolha um contato ou informe o nome de um novo.",
    path: ["contactId"],
  })
  .refine(requireNextStepText, { message: "Descreva o próximo passo.", path: ["nextStep"] });

export const updateOpportunitySchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1, "Informe um título.").max(160, "Máximo de 160 caracteres."),
    product: optionalText(120, "Máximo de 120 caracteres."),
    value: moneyField,
    ownerId: optionalUuid,
    expectedCloseDate: isoDate,
    ...nextStepFields,
  })
  .refine(requireNextStepText, { message: "Descreva o próximo passo.", path: ["nextStep"] });

export const moveStageSchema = z.object({
  id: z.uuid(),
  stageId: z.uuid(),
  lostReason: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.enum(Object.keys(LOST_REASONS) as [LostReason, ...LostReason[]]).nullable()),
  lostReasonDetail: optionalText(500, "Máximo de 500 caracteres."),
});

export const objectionSchema = z.object({
  opportunityId: z.uuid(),
  description: z.string().trim().min(1, "Descreva a objeção.").max(500, "Máximo de 500 caracteres."),
  category: z.enum(Object.keys(OBJECTION_CATEGORIES) as [string, ...string[]]).default("outro"),
});

export const stageSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(60, "Máximo de 60 caracteres."),
  kind: z.enum(["open", "won", "lost"]).default("open"),
});

export const renameStageSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Informe o nome.").max(60, "Máximo de 60 caracteres."),
});

/** Filtros da lista de oportunidades (vindos da URL). */
export const opportunityFiltersSchema = z.object({
  status: z.enum(["open", "won", "lost", "all"]).catch("open"),
  stage: z.uuid().optional().catch(undefined),
  owner: z.uuid().optional().catch(undefined),
  due: z.enum(["overdue", "today", "none", "stale"]).optional().catch(undefined),
  q: z
    .string()
    .trim()
    .max(80)
    .optional()
    .catch(undefined)
    .transform((v) => (v ? v : undefined)),
});
export type OpportunityFilters = z.infer<typeof opportunityFiltersSchema>;

/** Dias sem movimentação para considerar uma negociação parada. */
export const STALE_DAYS = 7;
