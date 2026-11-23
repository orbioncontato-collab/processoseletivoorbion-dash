import { describe, expect, it } from "vitest";
import {
  contactSchema,
  createOpportunitySchema,
  moveStageSchema,
  opportunityFiltersSchema,
  updateOpportunitySchema,
} from "./schemas";

const stageId = "2b1f7a52-3a3c-4a0e-9a59-6c6f2c9f6a11";
const contactId = "5f0c1b9e-2d1a-4c3b-8f7e-1a2b3c4d5e6f";

describe("contactSchema", () => {
  it("normaliza telefone e limpa campos vazios", () => {
    expect(contactSchema.parse({ name: " Ana ", phone: "(11) 98765-4321", email: "", organization: "" })).toMatchObject({
      name: "Ana",
      phone: "+5511987654321",
      email: null,
      organization: null,
      ownerId: null,
    });
  });
  it("aponta telefone e e-mail inválidos", () => {
    const r = contactSchema.safeParse({ name: "Ana", phone: "123", email: "x" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["phone", "email"]));
  });
});

describe("createOpportunitySchema", () => {
  it("aceita contato existente e converte o valor para centavos", () => {
    const r = createOpportunitySchema.parse({ contactId, title: "Consultoria", value: "R$ 12.000,00", stageId });
    expect(r).toMatchObject({ contactId, value: 1_200_000, nextStep: null, nextStepAt: null });
  });
  it("aceita contato novo pelo nome", () => {
    const r = createOpportunitySchema.parse({
      newContactName: "Bruno",
      newContactPhone: "11 98765 4321",
      title: "X",
      stageId,
    });
    expect(r).toMatchObject({ contactId: null, newContactName: "Bruno", newContactPhone: "+5511987654321", value: 0 });
  });
  it("exige contato", () => {
    const r = createOpportunitySchema.safeParse({ title: "X", stageId });
    expect(r.error?.issues[0].path).toEqual(["contactId"]);
  });
  it("data do próximo passo exige descrição", () => {
    const r = createOpportunitySchema.safeParse({ contactId, title: "X", stageId, nextStepAt: "2026-11-24T10:00" });
    expect(r.error?.issues[0].path).toEqual(["nextStep"]);
  });
  it("recusa valor inválido", () => {
    const r = createOpportunitySchema.safeParse({ contactId, title: "X", stageId, value: "mil reais" });
    expect(r.error?.issues[0].path).toEqual(["value"]);
  });
});

describe("updateOpportunitySchema e moveStageSchema", () => {
  it("edição valida a data esperada", () => {
    const r = updateOpportunitySchema.safeParse({ id: contactId, title: "X", expectedCloseDate: "24/11/2026" });
    expect(r.error?.issues[0].path).toEqual(["expectedCloseDate"]);
  });
  it("motivo de perda só aceita valores da lista", () => {
    expect(moveStageSchema.safeParse({ id: contactId, stageId, lostReason: "preco" }).success).toBe(true);
    expect(moveStageSchema.safeParse({ id: contactId, stageId, lostReason: "inventado" }).success).toBe(false);
    expect(moveStageSchema.parse({ id: contactId, stageId, lostReason: "" }).lostReason).toBeNull();
  });
});

describe("opportunityFiltersSchema", () => {
  it("usa padrões seguros quando a URL traz lixo", () => {
    expect(opportunityFiltersSchema.parse({ status: "hack", stage: "x", due: "y", q: "  " })).toEqual({
      status: "open",
      stage: undefined,
      owner: undefined,
      due: undefined,
      q: undefined,
    });
  });
});
