"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { METRICS, QUESTION_KINDS } from "./rules";

/** Configuração do relatório de cada empresa. Só a administração da plataforma (o RLS também bloqueia). */

async function admin() {
  const user = await requireUser();
  return user.isPlatformAdmin ? user : null;
}

const templateSchema = z.object({
  companyId: z.uuid(),
  name: z.string().trim().min(1, "Dê um nome.").max(80),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/, "Horário inválido."),
  reference: z.enum(["same_day", "previous_day"]),
});

export async function saveTemplate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await admin())) return { ok: false, message: "Só a administração da plataforma configura relatórios." };
  const parsed = templateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const weekdays = formData
    .getAll("weekdays")
    .map(Number)
    .filter((d) => d >= 1 && d <= 7);
  if (!weekdays.length) return { ok: false, fieldErrors: { weekdays: ["Escolha pelo menos um dia."] } };

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("report_templates")
    .select("id")
    .eq("company_id", parsed.data.companyId)
    .eq("active", true)
    .maybeSingle();
  const values = {
    name: parsed.data.name,
    schedule_time: parsed.data.scheduleTime,
    reference: parsed.data.reference,
    weekdays,
  };
  const { error } = current
    ? await supabase.from("report_templates").update(values).eq("id", current.id)
    : await supabase.from("report_templates").insert({ ...values, company_id: parsed.data.companyId });
  if (error) return unexpected("saveTemplate", error.message);
  refresh();
  return { ok: true, message: "Configuração salva." };
}

const questionSchema = z
  .object({
    companyId: z.uuid(),
    templateId: z.uuid(),
    label: z.string().trim().min(1, "Escreva a pergunta.").max(200),
    help: z.string().trim().max(300).optional().transform((v) => (v ? v : null)),
    kind: z.enum(Object.keys(QUESTION_KINDS) as [keyof typeof QUESTION_KINDS, ...(keyof typeof QUESTION_KINDS)[]]),
    options: z.string().optional().transform((v) => (v ?? "").split("\n").map((o) => o.trim()).filter(Boolean)),
    required: z.string().optional().transform((v) => v === "on"),
    metricKey: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(z.enum(Object.keys(METRICS) as [keyof typeof METRICS, ...(keyof typeof METRICS)[]]).nullable()),
    metricStageId: z.string().optional().transform((v) => (v ? v : null)).pipe(z.uuid().nullable()),
    tolerancePct: z.coerce.number().int().min(0).max(100).default(20),
    toleranceAbs: z.coerce.number().min(0).max(1_000_000).default(1),
  })
  .refine((v) => !v.metricKey || v.kind === "number" || v.kind === "currency", {
    message: "Só perguntas de número ou valor podem ser comparadas com dados capturados.",
    path: ["metricKey"],
  })
  .refine((v) => v.metricKey !== "stage_entries" || v.metricStageId, {
    message: "Escolha a etapa.",
    path: ["metricStageId"],
  })
  .refine((v) => !["single_choice", "multi_choice"].includes(v.kind) || v.options.length >= 2, {
    message: "Informe pelo menos duas opções, uma por linha.",
    path: ["options"],
  });

export async function addQuestion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await admin())) return { ok: false, message: "Só a administração da plataforma configura relatórios." };
  const parsed = questionSchema.safeParse(Object.fromEntries([...formData.keys()].map((k) => [k, formData.get(k)])));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("report_questions")
    .select("position")
    .eq("template_id", v.templateId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("report_questions").insert({
    company_id: v.companyId,
    template_id: v.templateId,
    label: v.label,
    help: v.help,
    kind: v.kind,
    options: ["single_choice", "multi_choice"].includes(v.kind) ? v.options : [],
    required: v.required,
    metric_key: v.metricKey,
    metric_stage_id: v.metricKey === "stage_entries" ? v.metricStageId : null,
    tolerance_pct: v.tolerancePct,
    tolerance_abs: v.toleranceAbs,
    position: (last?.position ?? -1) + 1,
  });
  if (error) return unexpected("addQuestion", error.message);
  refresh();
  return { ok: true, message: "Pergunta adicionada." };
}

export async function questionAction(formData: FormData): Promise<void> {
  if (!(await admin())) return;
  const id = String(formData.get("id") ?? "");
  const op = String(formData.get("op") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  if (op === "archive") {
    await supabase.from("report_questions").update({ archived_at: new Date().toISOString() }).eq("id", id);
  } else if (op === "up" || op === "down") {
    const { data: q } = await supabase.from("report_questions").select("template_id").eq("id", id).maybeSingle();
    if (!q) return;
    const { data: all } = await supabase
      .from("report_questions")
      .select("id, position")
      .eq("template_id", q.template_id)
      .is("archived_at", null)
      .order("position")
      .order("created_at");
    const list = all ?? [];
    const i = list.findIndex((x) => x.id === id);
    const j = op === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= list.length) return;
    // Renumera tudo para evitar posições repetidas.
    const order = [...list];
    [order[i], order[j]] = [order[j], order[i]];
    for (const [pos, item] of order.entries()) {
      if (item.position !== pos) await supabase.from("report_questions").update({ position: pos }).eq("id", item.id);
    }
  }
  refresh();
}
