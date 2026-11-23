import { describe, expect, it } from "vitest";
import { actorLabel, describeActivity, type ActivityRow, type FormatContext } from "./format";

const ctx: FormatContext = {
  names: { u1: "Ana", u2: "Bruno" },
  entities: { inv1: { email: "c@x.com" }, m1: { userId: "u2" }, c1: { name: "Orbion" } },
};

const row = (p: Partial<ActivityRow>): ActivityRow => ({
  id: 1,
  actor_type: "user",
  actor_id: "u1",
  action: "insert",
  entity_type: "memberships",
  entity_id: "m1",
  changes: {},
  occurred_at: "2026-11-23T10:00:00Z",
  ...p,
});

describe("describeActivity", () => {
  it("entrada na equipe", () => {
    expect(describeActivity(row({ changes: { user_id: "u2", role: "seller" } }), ctx)).toBe(
      "Bruno entrou na equipe como vendedor",
    );
  });
  it("desativação usa o vínculo para achar a pessoa", () => {
    expect(
      describeActivity(row({ action: "update", changes: { status: { de: "active", para: "disabled" } } }), ctx),
    ).toBe("Bruno foi desativado da equipe");
  });
  it("convite aceito usa o e-mail do registro", () => {
    expect(
      describeActivity(
        row({
          entity_type: "invitations",
          entity_id: "inv1",
          action: "update",
          changes: { status: { de: "pending", para: "accepted" } },
        }),
        ctx,
      ),
    ).toBe("Convite de c@x.com foi aceito");
  });
  it("alteração da empresa lista os campos em português", () => {
    expect(
      describeActivity(
        row({ entity_type: "companies", entity_id: "c1", action: "update", changes: { name: {}, timezone: {} } }),
        ctx,
      ),
    ).toBe("Dados da empresa alterados: nome, fuso horário");
  });
  it("tipo desconhecido tem frase genérica", () => {
    expect(describeActivity(row({ entity_type: "x", action: "delete" }), ctx)).toBe("Registro apagado (x)");
  });
});

describe("actorLabel", () => {
  it("mostra o nome do usuário ou o tipo de autor", () => {
    expect(actorLabel(row({}), ctx)).toBe("Ana");
    expect(actorLabel(row({ actor_type: "agent", actor_id: null }), ctx)).toBe("Agente de IA");
    expect(actorLabel(row({ actor_type: "system", actor_id: null }), ctx)).toBe("Sistema");
  });
});

describe("histórico das oportunidades", () => {
  const c: FormatContext = { ...ctx, stages: { s1: "Proposta", s2: "Negociação", s3: "Perdido" } };
  it("criação e mudança de etapa", () => {
    expect(describeActivity(row({ entity_type: "opportunities", changes: { title: "Consultoria", stage_id: "s1" } }), c)).toBe(
      "Oportunidade criada: Consultoria (Proposta)",
    );
    expect(
      describeActivity(row({ entity_type: "opportunities", action: "update", changes: { stage_id: { de: "s1", para: "s2" } } }), c),
    ).toBe("Etapa: Proposta → Negociação");
  });
  it("perda mostra o motivo; valor mostra antes e depois", () => {
    expect(
      describeActivity(
        row({
          entity_type: "opportunities",
          action: "update",
          changes: {
            status: { de: "open", para: "lost" },
            stage_id: { de: "s2", para: "s3" },
            lost_reason: { de: null, para: "preco" },
            next_step: { de: "Ligar", para: null },
          },
        }),
        c,
      ),
    ).toBe("Encerrada como perdida (preço) · Etapa: Negociação → Perdido");
    expect(
      describeActivity(
        row({ entity_type: "opportunities", action: "update", changes: { value_cents: { de: 100000, para: 150000 } } }),
        c,
      ).replace(/\s/g, " "),
    ).toBe("Valor: R$ 1.000,00 → R$ 1.500,00");
  });
  it("objeção registrada e resolvida", () => {
    expect(describeActivity(row({ entity_type: "opportunity_objections", changes: { description: "Caro" } }), c)).toBe(
      "Objeção registrada: Caro",
    );
    expect(
      describeActivity(
        row({ entity_type: "opportunity_objections", action: "update", changes: { status: { de: "open", para: "handled" } } }),
        c,
      ),
    ).toBe("Objeção marcada como resolvida");
  });
});
