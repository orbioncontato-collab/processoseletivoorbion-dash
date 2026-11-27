import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asSuperuser, asUser, buildFixture, pool, run, type Fixture } from "./helpers";

/**
 * Motor de alertas. "Agora" fixo: terça 24/11/2026 às 12h em São Paulo (15h UTC).
 * Segunda 23/11 é o último dia de trabalho completo.
 */
const NOW = "2026-11-24T15:00:00Z";
let f: Fixture;
let oppOverdue: string;
let oppToday: string;
let oppNoStep: string;
let oppStale: string;
let conversation: string;

type Alert = { type: string; user_id: string; status: string; severity: string; dedupe_key: string };
const refresh = (now = NOW) =>
  run<{ refresh_alerts: number }>(asService("automation"), "select public.refresh_alerts($1, $2)", [f.companyA, now], { commit: true });
const alertsOf = (sql = "select type, user_id, status, severity, dedupe_key from public.alerts where company_id = $1", who = asSuperuser) =>
  run<Alert>(who, sql, [f.companyA]);

beforeAll(async () => {
  f = await buildFixture();
  // Pessoas e fonte existindo desde antes do período analisado.
  await run(asSuperuser, "update public.memberships set created_at = '2026-11-01' where company_id = $1", [f.companyA], { commit: true });

  const [stage] = await run<{ id: string; pipeline_id: string }>(asSuperuser,
    "select id, pipeline_id from public.pipeline_stages where company_id = $1 and kind = 'open' order by position limit 1", [f.companyA]);
  const [{ id: contact }] = await run<{ id: string }>(asUser(f.sellerA1),
    "insert into public.contacts (company_id, owner_id, name, phone_e164) values ($1, $2, 'Cliente Alerta', '+5511922221111') returning id",
    [f.companyA, f.sellerA1], { commit: true });
  const opp = async (title: string, step: string | null, at: string | null) => {
    const [r] = await run<{ id: string }>(asUser(f.sellerA1),
      `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title, next_step, next_step_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [f.companyA, contact, f.sellerA1, stage.pipeline_id, stage.id, title, step, at], { commit: true });
    return r.id;
  };
  oppOverdue = await opp("Vencida", "Ligar", "2026-11-24T12:00:00Z");
  oppToday = await opp("Hoje", "Enviar proposta", "2026-11-24T20:00:00Z");
  oppNoStep = await opp("Sem passo", null, null);
  oppStale = await opp("Parada", "Retomar", "2026-12-10T12:00:00Z");
  await run(asSuperuser, "update public.opportunities set last_activity_at = '2026-11-10T12:00:00Z' where id = $1", [oppStale], { commit: true });

  // WhatsApp do vendedor: cliente esperando resposta desde 10h UTC (5 horas antes de "agora").
  const svc = asService("automation");
  const [{ id: src }] = await run<{ id: string }>(svc,
    "insert into public.integration_sources (company_id, kind, name, owner_user_id) values ($1, 'whatsapp_device', 'WA', $2) returning id",
    [f.companyA, f.sellerA1], { commit: true });
  await run(asSuperuser, "update public.integration_sources set created_at = '2026-11-01' where id = $1", [src], { commit: true });
  [{ id: conversation }] = await run<{ id: string }>(svc,
    `insert into public.conversations (company_id, source_id, contact_id, owner_id, external_id, started_at, last_message_at)
     values ($1, $2, $3, $4, 'c1', '2026-11-24T10:00:00Z', '2026-11-24T10:00:00Z') returning id`,
    [f.companyA, src, contact, f.sellerA1], { commit: true });
  await run(svc,
    `insert into public.messages (company_id, conversation_id, source_id, direction, sent_at, external_id)
     values ($1, $2, $3, 'inbound', '2026-11-24T10:00:00Z', 'in-1')`,
    [f.companyA, conversation, src], { commit: true });

  // Referências: meta de 3 conversas por dia.
  await run(asUser(f.leaderA), "update public.company_settings set daily_target_conversations = 3 where company_id = $1", [f.companyA], { commit: true });

  // Relatório das 18h, de segunda a sexta. O vendedor A2 enviou o de segunda.
  const [{ id: tpl }] = await run<{ id: string }>(asUser(f.admin),
    "insert into public.report_templates (company_id, schedule_time) values ($1, '18:00') returning id", [f.companyA], { commit: true });
  const [{ id: q }] = await run<{ id: string }>(asUser(f.admin),
    "insert into public.report_questions (company_id, template_id, label, kind, metric_key) values ($1, $2, 'Contatos', 'number', 'wa_conversations') returning id",
    [f.companyA, tpl], { commit: true });
  await run(asUser(f.sellerA2),
    "insert into public.report_submissions (company_id, template_id, user_id, reference_date) values ($1, $2, $3, '2026-11-23')",
    [f.companyA, tpl, f.sellerA2], { commit: true });
  await run(svc,
    `insert into public.divergences (company_id, user_id, reference_date, question_id, metric_key, declared, captured)
     values ($1, $2, '2026-11-23', $3, 'wa_conversations', 10, 0)`,
    [f.companyA, f.sellerA1, q], { commit: true });
});

afterAll(async () => {
  await pool.end();
});

describe("cálculo dos alertas", () => {
  it("gera cada tipo para a pessoa certa", async () => {
    await refresh();
    const rows = await alertsOf();
    const of = (type: string) => rows.filter((r) => r.type === type);
    expect(of("next_step_overdue")).toMatchObject([{ user_id: f.sellerA1, severity: "high", status: "open" }]);
    expect(of("next_step_today")).toHaveLength(1);
    expect(of("no_next_step")).toHaveLength(1);
    expect(of("stale_opportunity")).toHaveLength(1);
    expect(of("awaiting_reply")).toMatchObject([{ user_id: f.sellerA1, severity: "high" }]);
    expect(of("low_production")).toMatchObject([{ user_id: f.sellerA1 }]);
    expect(of("report_missing").map((r) => r.user_id).sort()).toEqual([f.leaderA, f.sellerA1].sort());
    expect(of("divergence_open")).toMatchObject([{ user_id: f.sellerA1 }]);
  });

  it("rodar de novo não duplica", async () => {
    const before = (await alertsOf()).length;
    await refresh();
    expect(await alertsOf()).toHaveLength(before);
  });

  it("resolve sozinho quando a situação some e cria o alerta novo quando muda", async () => {
    await run(asUser(f.sellerA1), "update public.opportunities set next_step_at = '2026-11-30T12:00:00Z' where id = $1", [oppOverdue], { commit: true });
    await refresh();
    const rows = await alertsOf();
    const overdue = rows.filter((r) => r.type === "next_step_overdue");
    expect(overdue.map((r) => r.status)).toEqual(["resolved"]);
  });

  it("alerta dispensado não volta enquanto a situação for a mesma", async () => {
    const [noStep] = await run<{ id: string }>(asUser(f.sellerA1),
      "update public.alerts set status = 'dismissed' where company_id = $1 and type = 'no_next_step' returning id", [f.companyA], { commit: true });
    expect(noStep).toBeTruthy();
    await refresh();
    const [row] = await run<{ status: string; dismissed_by: string }>(asSuperuser,
      "select status, dismissed_by from public.alerts where id = $1", [noStep.id]);
    expect(row).toEqual({ status: "dismissed", dismissed_by: f.sellerA1 });
    expect(oppNoStep && oppToday && oppStale).toBeTruthy();
  });
});

describe("acesso aos alertas", () => {
  it("vendedor vê só os dele; líder vê todos; outra empresa nada", async () => {
    const seller = await alertsOf("select type, user_id, status, severity, dedupe_key from public.alerts where company_id = $1", asUser(f.sellerA2));
    expect(seller.every((r) => r.user_id === f.sellerA2)).toBe(true);
    const leader = await alertsOf("select type, user_id, status, severity, dedupe_key from public.alerts where company_id = $1", asUser(f.leaderA));
    expect(leader.some((r) => r.user_id === f.sellerA1)).toBe(true);
    expect(await alertsOf("select type, user_id, status, severity, dedupe_key from public.alerts where company_id = $1", asUser(f.leaderB))).toHaveLength(0);
  });

  it("usuário só dispensa ou reabre; não resolve nem mexe no alerta de colega", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.alerts set status = 'resolved' where company_id = $1 and type = 'stale_opportunity'", [f.companyA]),
    ).rejects.toThrow(/Só é possível dispensar ou reabrir/);
    await expect(
      run(asUser(f.sellerA1), "update public.alerts set title = 'x' where company_id = $1", [f.companyA]),
    ).rejects.toThrow(/permission denied/);
    const other = await run(asUser(f.sellerA2),
      "update public.alerts set status = 'dismissed' where company_id = $1 and user_id = $2 returning id", [f.companyA, f.sellerA1]);
    expect(other).toHaveLength(0);
  });

  it("só o servidor roda o cálculo; só o líder muda as referências", async () => {
    await expect(run(asUser(f.leaderA), "select public.refresh_alerts($1)", [f.companyA])).rejects.toThrow(/permission denied/);
    const sellerUpdate = await run(asUser(f.sellerA1),
      "update public.company_settings set stale_days = 1 where company_id = $1 returning company_id", [f.companyA]);
    expect(sellerUpdate).toHaveLength(0);
  });
});
