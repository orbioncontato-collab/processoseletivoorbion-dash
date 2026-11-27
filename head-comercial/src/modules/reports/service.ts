import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { checkDivergence, dayRange, WHATSAPP_METRICS, type MetricKey } from "./rules";

/**
 * Cruzamento do relatório com os dados capturados.
 * Roda com a chave secreta depois do envio (autor "automação" no histórico).
 * Só mexe em divergências em aberto: as já explicadas ou verificadas ficam como estão.
 */
export async function recomputeDivergences(opts: {
  companyId: string;
  userId: string;
  templateId: string;
  referenceDate: string;
  timeZone: string;
}): Promise<{ open: number }> {
  const db = createServiceClient({ type: "automation" });
  const { companyId, userId, templateId, referenceDate, timeZone } = opts;

  const { data: submission } = await db
    .from("report_submissions")
    .select("id")
    .eq("template_id", templateId)
    .eq("user_id", userId)
    .eq("reference_date", referenceDate)
    .maybeSingle();
  if (!submission) return { open: 0 };

  const [questionsRes, answersRes, existingRes, whatsappRes] = await Promise.all([
    db
      .from("report_questions")
      .select("id, kind, metric_key, metric_stage_id, tolerance_pct, tolerance_abs")
      .eq("template_id", templateId)
      .is("archived_at", null)
      .not("metric_key", "is", null),
    db.from("report_answers").select("question_id, value_number").eq("submission_id", submission.id),
    db
      .from("divergences")
      .select("id, question_id, status, declared, captured")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("reference_date", referenceDate),
    db
      .from("integration_sources")
      .select("id")
      .eq("company_id", companyId)
      .eq("kind", "whatsapp_device")
      .eq("owner_user_id", userId)
      .is("archived_at", null)
      .limit(1),
  ]);
  const questions = questionsRes.data ?? [];
  if (!questions.length) return { open: 0 };

  const { start, end } = dayRange(referenceDate, timeZone);
  const { data: metrics, error } = await db.rpc("captured_metrics", {
    target_company: companyId,
    target_user: userId,
    period_start: start,
    period_end: end,
  });
  if (error) throw new Error(`Falha ao calcular números capturados: ${error.message}`);

  const captured = (key: string, stage: string | null) =>
    Number(
      (metrics ?? []).find((m) => m.metric_key === key && (key !== "stage_entries" || m.stage_id === stage))?.value ?? 0,
    );
  const answerOf = new Map((answersRes.data ?? []).map((a) => [a.question_id, a.value_number]));
  const existingOf = new Map((existingRes.data ?? []).map((d) => [d.question_id, d]));
  const hasWhatsapp = Boolean(whatsappRes.data?.length);

  let open = 0;
  for (const q of questions) {
    const key = q.metric_key as MetricKey;
    const declared = answerOf.get(q.id);
    const existing = existingOf.get(q.id);
    const comparable = declared != null && (hasWhatsapp || !WHATSAPP_METRICS.includes(key));
    const value = captured(key, q.metric_stage_id);
    const result = comparable
      ? checkDivergence(Number(declared), value, q.tolerance_pct, Number(q.tolerance_abs), q.kind === "currency" ? "currency" : "number")
      : null;

    if (existing && existing.status !== "open") {
      continue; // já explicada ou verificada: não mexe
    }
    if (!result) {
      if (existing) await db.from("divergences").delete().eq("id", existing.id);
      continue;
    }
    open++;
    if (existing) {
      if (Number(existing.declared) !== Number(declared) || Number(existing.captured) !== value) {
        await db.from("divergences").update({ declared: Number(declared), captured: value }).eq("id", existing.id);
      }
    } else {
      await db.from("divergences").insert({
        company_id: companyId,
        user_id: userId,
        reference_date: referenceDate,
        question_id: q.id,
        metric_key: key,
        declared: Number(declared),
        captured: value,
      });
    }
  }
  return { open };
}
