import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { QuestionDef, QuestionKind } from "./rules";

export interface TemplateWithQuestions {
  id: string;
  name: string;
  schedule_time: string;
  reference: "same_day" | "previous_day";
  weekdays: number[];
  questions: (QuestionDef & {
    help: string | null;
    position: number;
    metric_key: string | null;
    metric_stage_id: string | null;
    tolerance_pct: number;
    tolerance_abs: number;
  })[];
}

/** Modelo ativo da empresa com as perguntas em ordem (o RLS limita à empresa). */
export async function getActiveTemplate(companyId: string): Promise<TemplateWithQuestions | null> {
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("report_templates")
    .select("id, name, schedule_time, reference, weekdays")
    .eq("company_id", companyId)
    .eq("active", true)
    .maybeSingle();
  if (!t) return null;
  const { data: qs } = await supabase
    .from("report_questions")
    .select("id, label, help, kind, options, required, position, metric_key, metric_stage_id, tolerance_pct, tolerance_abs")
    .eq("template_id", t.id)
    .is("archived_at", null)
    .order("position")
    .order("created_at");
  return {
    ...t,
    reference: t.reference as "same_day" | "previous_day",
    weekdays: t.weekdays as number[],
    questions: (qs ?? []).map((q) => ({
      ...q,
      kind: q.kind as QuestionKind,
      tolerance_abs: Number(q.tolerance_abs),
    })),
  };
}
