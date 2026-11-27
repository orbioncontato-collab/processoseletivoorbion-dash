import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { SKILLS, weakSkills, type Criterion } from "./skills";

/**
 * Especialista de Desenvolvimento (primeira versão, por regras): depois de uma
 * análise de conversa, as habilidades com nota até 5 viram recomendação de
 * treinamento. Usa o treinamento da empresa para a habilidade, ou o da Orbion,
 * e não repete o que a pessoa já tem em aberto.
 */
export async function recommendFromAnalysis(input: {
  companyId: string;
  sellerId: string;
  analysisId: string;
  contactName: string;
  criteria: Criterion[];
  actorId: string;
}): Promise<{ title: string; skill: string }[]> {
  const weak = weakSkills(input.criteria);
  if (!weak.length) return [];
  const db = createServiceClient({ type: "agent", id: input.actorId });

  const { data: active } = await db
    .from("training_assignments")
    .select("training_id, skill")
    .eq("user_id", input.sellerId)
    .eq("company_id", input.companyId)
    .in("status", ["recommended", "started"]);
  const activeSkills = new Set((active ?? []).map((a) => a.skill));

  const created: { title: string; skill: string }[] = [];
  for (const w of weak) {
    if (activeSkills.has(w.skill)) continue;
    const { data: options } = await db
      .from("trainings")
      .select("id, title, scope")
      .eq("skill", w.skill)
      .is("archived_at", null)
      .or(`company_id.eq.${input.companyId},scope.eq.global`)
      .order("created_at", { ascending: false })
      .limit(10);
    // Material da própria empresa primeiro.
    const pick = (options ?? []).sort((a, b) => (a.scope === b.scope ? 0 : a.scope === "company" ? -1 : 1))[0];
    if (!pick) continue;
    const reason = `Na análise da conversa com ${input.contactName}, "${SKILLS[w.skill]}" ficou ${w.score}/10.${w.comment ? ` ${w.comment}` : ""}`.slice(0, 1000);
    const { error } = await db.from("training_assignments").insert({
      company_id: input.companyId,
      user_id: input.sellerId,
      training_id: pick.id,
      source: "analysis",
      reason,
      skill: w.skill,
      analysis_id: input.analysisId,
      baseline_score: w.score,
      assigned_by: null,
    });
    if (error) {
      console.error("[recommendFromAnalysis]", error.message);
      continue;
    }
    activeSkills.add(w.skill);
    created.push({ title: pick.title, skill: w.skill });
  }
  return created;
}
