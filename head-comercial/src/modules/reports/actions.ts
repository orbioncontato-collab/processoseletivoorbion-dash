"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { unexpected, type ActionState } from "@/lib/action-state";
import { getActiveTemplate } from "./queries";
import { dueReferenceDate, isoWeekday, parseAnswers } from "./rules";
import { recomputeDivergences } from "./service";

/** Envia (ou corrige) o relatório de um dia e refaz o cruzamento. */
export async function submitReport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, company } = await requireCompany();
  const template = await getActiveTemplate(company.companyId);
  if (!template) return { ok: false, message: "A empresa ainda não tem relatório configurado." };

  const referenceDate = String(formData.get("referenceDate") ?? "");
  const due = dueReferenceDate(new Date(), company.timezone, template.schedule_time, template.reference, template.weekdays);
  const limit = due ? new Date(Date.parse(`${due}T00:00:00Z`) - 14 * 86400000).toISOString().slice(0, 10) : null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) ||
    !due ||
    referenceDate > due ||
    (limit && referenceDate < limit) ||
    !template.weekdays.includes(isoWeekday(referenceDate))
  ) {
    return { ok: false, message: "Este relatório não está liberado para esse dia." };
  }

  const { answers, errors } = parseAnswers(
    template.questions,
    (k) => String(formData.get(k) ?? ""),
    (k) => formData.getAll(k).map(String),
  );
  if (Object.keys(errors).length) {
    const fieldErrors: Record<string, string[]> = {};
    for (const [qid, msg] of Object.entries(errors)) fieldErrors[`q_${qid}`] = [msg];
    return { ok: false, message: "Confira as respostas destacadas.", fieldErrors };
  }

  const supabase = await createClient();
  let { data: submission } = await supabase
    .from("report_submissions")
    .select("id")
    .eq("template_id", template.id)
    .eq("user_id", user.id)
    .eq("reference_date", referenceDate)
    .maybeSingle();
  const isUpdate = Boolean(submission);
  if (!submission) {
    const created = await supabase
      .from("report_submissions")
      .insert({ company_id: company.companyId, template_id: template.id, user_id: user.id, reference_date: referenceDate })
      .select("id")
      .single();
    if (created.error) return unexpected("submitReport.insert", created.error.message);
    submission = created.data;
  }

  const { error } = await supabase.from("report_answers").upsert(
    answers.map((a) => ({ ...a, company_id: company.companyId, submission_id: submission!.id })),
    { onConflict: "submission_id,question_id" },
  );
  if (error) return unexpected("submitReport.answers", error.message);

  let open = 0;
  try {
    ({ open } = await recomputeDivergences({
      companyId: company.companyId,
      userId: user.id,
      templateId: template.id,
      referenceDate,
      timeZone: company.timezone,
    }));
  } catch (err) {
    console.error("[submitReport] cruzamento", err);
  }

  refresh();
  const base = isUpdate ? "Relatório atualizado." : "Relatório enviado.";
  return {
    ok: true,
    message: open
      ? `${base} O Head encontrou ${open} diferença(s) entre o informado e o capturado. Confira abaixo.`
      : `${base} Nenhuma diferença encontrada com os dados capturados.`,
  };
}

const justifySchema = z.object({
  id: z.uuid(),
  justification: z.string().trim().min(3, "Escreva uma explicação.").max(1000, "Máximo de 1000 caracteres."),
});

export async function justifyDivergence(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { company } = await requireCompany();
  const parsed = justifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: { justification: [parsed.error.issues[0].message] } };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("divergences")
    .update({ status: "justified", justification: parsed.data.justification })
    .eq("id", parsed.data.id)
    .eq("company_id", company.companyId)
    .select("id");
  if (error) return { ok: false, message: error.message.includes("verificada") ? "O líder já verificou esta divergência." : "Não foi possível salvar." };
  if (!data?.length) return { ok: false, message: "Divergência não encontrada." };
  refresh();
  return { ok: true, message: "Explicação registrada." };
}

export async function setDivergenceStatus(formData: FormData): Promise<void> {
  const { company } = await requireCompany();
  if (company.role !== "leader") return;
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "open" ? "open" : "verified";
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("divergences").update({ status }).eq("id", id).eq("company_id", company.companyId);
  if (error) console.error("[setDivergenceStatus]", error.message);
  refresh();
}
