/**
 * Habilidades trabalhadas nos treinamentos. São a mesma régua dos critérios
 * do Analista de Conversas, para ligar "onde a conversa foi fraca" a "o que estudar".
 */

export const SKILLS = {
  abertura: "Abertura e conexão",
  diagnostico: "Diagnóstico da necessidade",
  valor: "Apresentação de valor",
  objecoes: "Tratamento de objeções",
  proximo_passo: "Condução para o próximo passo",
  agilidade: "Agilidade e cadência",
  outro: "Outro",
} as const;

export type Skill = keyof typeof SKILLS;

export const FORMAT_LABELS: Record<string, string> = { text: "Leitura", video: "Vídeo", link: "Link", exercise: "Exercício" };
export const STATUS_LABELS: Record<string, string> = {
  recommended: "Recomendado",
  started: "Em andamento",
  completed: "Concluído",
  dismissed: "Dispensado",
};
export const SOURCE_LABELS: Record<string, string> = { leader: "Indicado pelo líder", analysis: "Pela análise de conversa", agent: "Pelo Head" };

const BY_LABEL = new Map<string, Skill>(Object.entries(SKILLS).map(([k, v]) => [v.toLowerCase(), k as Skill]));

/** Critério da análise ("Diagnóstico da necessidade") para a habilidade ("diagnostico"). */
export function skillOfCriterion(name: string): Skill | null {
  return BY_LABEL.get(name.trim().toLowerCase()) ?? null;
}

export interface Criterion {
  nome: string;
  nota: number;
  comentario?: string;
}

/** Habilidades com nota até o limite, da mais fraca para a menos fraca. */
export function weakSkills(criteria: Criterion[], threshold = 5, max = 2): { skill: Skill; score: number; comment: string }[] {
  return criteria
    .map((c) => ({ skill: skillOfCriterion(c.nome), score: c.nota, comment: c.comentario ?? "" }))
    .filter((c): c is { skill: Skill; score: number; comment: string } => c.skill !== null && c.skill !== "outro" && c.score <= threshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, max);
}

/** Nota média da habilidade nas análises (ignora análises sem esse critério). */
export function skillAverage(analyses: { criteria: unknown }[], skill: Skill): { average: number | null; count: number } {
  const scores: number[] = [];
  for (const a of analyses) {
    if (!Array.isArray(a.criteria)) continue;
    const hit = (a.criteria as Criterion[]).find((c) => skillOfCriterion(c.nome) === skill);
    if (hit && typeof hit.nota === "number") scores.push(hit.nota);
  }
  if (!scores.length) return { average: null, count: 0 };
  return { average: Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10, count: scores.length };
}

/** Frase da evolução depois do treinamento. */
export function evolutionText(baseline: number | null, after: { average: number | null; count: number }): string {
  if (after.average === null) return "Ainda sem conversas analisadas depois da conclusão.";
  const avg = after.average.toLocaleString("pt-BR");
  if (baseline === null) return `Nota média depois: ${avg}/10 em ${after.count} análise(s).`;
  const delta = Math.round((after.average - baseline) * 10) / 10;
  const trend = delta > 0 ? `subiu ${delta.toLocaleString("pt-BR")}` : delta < 0 ? `caiu ${Math.abs(delta).toLocaleString("pt-BR")}` : "ficou igual";
  return `Antes: ${baseline.toLocaleString("pt-BR")}/10. Depois: ${avg}/10 em ${after.count} análise(s), ${trend}.`;
}
