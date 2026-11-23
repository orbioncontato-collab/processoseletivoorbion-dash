import { describe, expect, it } from "vitest";
import {
  contactDataSchema,
  opportunityDataSchema,
  readLostReason,
  readPhone,
  readValueCents,
  requestSchema,
  resolveStage,
  type StageRef,
} from "./standard";

const stages: StageRef[] = [
  { id: "s-novo", name: "Novo contato", kind: "open" },
  { id: "s-prop", name: "Proposta", kind: "open" },
  { id: "s-ganho", name: "Ganho", kind: "won" },
  { id: "s-perdido", name: "Perdido", kind: "lost" },
];

describe("envelope", () => {
  it("aceita evento único e lote", () => {
    expect(requestSchema.parse({ type: "contact.upsert", data: {} })).toHaveLength(1);
    expect(requestSchema.parse({ events: [{ type: "message", data: {} }, { type: "message", data: {} }] })).toHaveLength(2);
  });
  it("recusa tipo desconhecido e lote grande demais", () => {
    expect(requestSchema.safeParse({ type: "deal.created", data: {} }).success).toBe(false);
    const big = Array.from({ length: 101 }, () => ({ type: "message", data: {} }));
    expect(requestSchema.safeParse({ events: big }).success).toBe(false);
  });
});

describe("dados", () => {
  it("contato aceita external_id numérico", () => {
    expect(contactDataSchema.parse({ external_id: 123, name: "Ana", phone: 11987654321 })).toMatchObject({
      external_id: "123",
      phone: "11987654321",
    });
  });
  it("oportunidade exige contato", () => {
    expect(opportunityDataSchema.safeParse({ external_id: "1", title: "X" }).success).toBe(false);
    expect(opportunityDataSchema.safeParse({ external_id: "1", title: "X", contact_external_id: "c1" }).success).toBe(true);
  });
  it("valida data do próximo passo", () => {
    const r = opportunityDataSchema.safeParse({ external_id: "1", title: "X", contact_external_id: "c", next_step_at: "amanhã" });
    expect(r.success).toBe(false);
  });
});

describe("conversões", () => {
  it("telefone inválido vira aviso, não erro", () => {
    expect(readPhone("(11) 98765-4321")).toEqual({ phone: "+5511987654321" });
    expect(readPhone("123").phone).toBeNull();
    expect(readPhone("123").warning).toContain("ignorado");
  });
  it("valor em número ou texto", () => {
    expect(readValueCents(1500.5)).toBe(150050);
    expect(readValueCents("1.500,50")).toBe(150050);
    expect(readValueCents(undefined)).toBe(0);
    expect(readValueCents(-1)).toBeNull();
  });
  it("motivo de perda livre vira item da lista", () => {
    expect(readLostReason("Cliente achou caro")).toEqual({ reason: "preco", detail: "Cliente achou caro" });
    expect(readLostReason("Fechou com a concorrência")).toMatchObject({ reason: "concorrente" });
    expect(readLostReason("Sumiu, não respondeu mais")).toMatchObject({ reason: "sem_resposta" });
    expect(readLostReason("Sem orçamento este ano")).toMatchObject({ reason: "sem_orcamento" });
    expect(readLostReason("sem_fit")).toEqual({ reason: "sem_fit", detail: null });
    expect(readLostReason("Mudou de ideia")).toMatchObject({ reason: "outro", detail: "Mudou de ideia" });
    expect(readLostReason(undefined).reason).toBe("outro");
  });
});

describe("resolveStage", () => {
  it("usa o mapeamento configurado, sem diferenciar acento e maiúscula", () => {
    expect(resolveStage({ stage: "PROPOSTA ENVIADA" }, { "Proposta enviada": "s-prop" }, stages, true)).toEqual({
      stageId: "s-prop",
    });
  });
  it("usa a etapa do Head com o mesmo nome", () => {
    expect(resolveStage({ stage: "proposta" }, {}, stages, true)).toEqual({ stageId: "s-prop" });
  });
  it("situação ganha ou perdida tem prioridade", () => {
    expect(resolveStage({ stage: "Proposta", status: "won" }, {}, stages, false)).toEqual({ stageId: "s-ganho" });
    expect(resolveStage({ status: "lost" }, {}, stages, false)).toEqual({ stageId: "s-perdido" });
  });
  it("etapa desconhecida vira erro claro", () => {
    expect(resolveStage({ stage: "Contrato" }, {}, stages, true)).toEqual({
      error: 'Etapa "Contrato" não está mapeada para nenhuma etapa do Head.',
    });
  });
  it("sem etapa: cria na primeira aberta; atualiza mantendo a atual", () => {
    expect(resolveStage({}, {}, stages, true)).toEqual({ stageId: "s-novo" });
    expect(resolveStage({}, {}, stages, false)).toEqual({ keep: true });
  });
  it("mapeamento apontando para etapa que não existe mais cai na regra seguinte", () => {
    expect(resolveStage({ stage: "Proposta" }, { Proposta: "apagada" }, stages, true)).toEqual({ stageId: "s-prop" });
  });
});
