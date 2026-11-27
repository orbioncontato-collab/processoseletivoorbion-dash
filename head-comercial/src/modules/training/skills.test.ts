import { describe, expect, it } from "vitest";
import { CRITERIA } from "@/modules/ai/criteria";
import { evolutionText, skillAverage, skillOfCriterion, SKILLS, weakSkills } from "./skills";

describe("habilidades", () => {
  it("todo critério do Analista corresponde a uma habilidade", () => {
    for (const c of CRITERIA) expect(skillOfCriterion(c)).not.toBeNull();
    expect(Object.keys(SKILLS)).toHaveLength(CRITERIA.length + 1);
    expect(skillOfCriterion(" diagnóstico da necessidade ")).toBe("diagnostico");
    expect(skillOfCriterion("Critério novo")).toBeNull();
  });

  it("pega as habilidades mais fracas até o limite", () => {
    const out = weakSkills([
      { nome: "Abertura e conexão", nota: 8 },
      { nome: "Diagnóstico da necessidade", nota: 3, comentario: "Não perguntou a dor." },
      { nome: "Tratamento de objeções", nota: 5 },
      { nome: "Agilidade e cadência", nota: 4 },
      { nome: "Critério desconhecido", nota: 1 },
    ]);
    expect(out).toEqual([
      { skill: "diagnostico", score: 3, comment: "Não perguntou a dor." },
      { skill: "agilidade", score: 4, comment: "" },
    ]);
  });

  it("média da habilidade nas análises e a frase da evolução", () => {
    const analyses = [
      { criteria: [{ nome: "Diagnóstico da necessidade", nota: 6 }] },
      { criteria: [{ nome: "Diagnóstico da necessidade", nota: 7 }, { nome: "Abertura e conexão", nota: 9 }] },
      { criteria: [{ nome: "Abertura e conexão", nota: 2 }] },
      { criteria: null },
    ];
    const after = skillAverage(analyses, "diagnostico");
    expect(after).toEqual({ average: 6.5, count: 2 });
    expect(evolutionText(4, after)).toBe("Antes: 4/10. Depois: 6,5/10 em 2 análise(s), subiu 2,5.");
    expect(evolutionText(7, after)).toBe("Antes: 7/10. Depois: 6,5/10 em 2 análise(s), caiu 0,5.");
    expect(evolutionText(4, { average: null, count: 0 })).toBe("Ainda sem conversas analisadas depois da conclusão.");
  });
});
