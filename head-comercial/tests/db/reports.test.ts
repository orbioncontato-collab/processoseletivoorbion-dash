import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asService, asSuperuser, asUser, buildFixture, pool, run, type Fixture } from "./helpers";
import { todayRange } from "../../src/modules/commercial/filters";

let f: Fixture;
let templateA: string;
let templateB: string;
let qContacts: string; // número ligado a conversas do WhatsApp
let qProposals: string; // número ligado a entradas na etapa Proposta
let qNotes: string; // texto
let qOtherCompany: string;
let submission: string;
let divergence: string;
let proposalStage: string;

const DAY = "2026-11-24";

beforeAll(async () => {
  f = await buildFixture();
  [{ id: templateA }] = await run<{ id: string }>(asUser(f.admin),
    "insert into public.report_templates (company_id, schedule_time, reference) values ($1, '18:00', 'same_day') returning id",
    [f.companyA], { commit: true });
  [{ id: templateB }] = await run<{ id: string }>(asUser(f.admin),
    "insert into public.report_templates (company_id) values ($1) returning id", [f.companyB], { commit: true });
  [{ id: proposalStage }] = await run<{ id: string }>(asSuperuser,
    "select id from public.pipeline_stages where company_id = $1 and name = 'Proposta'", [f.companyA]);

  const q = async (company: string, template: string, label: string, kind: string, extra = "", values: unknown[] = []) => {
    const [r] = await run<{ id: string }>(asUser(f.admin),
      `insert into public.report_questions (company_id, template_id, label, kind ${extra ? ", " + extra.split("=")[0] : ""})
       values ($1, $2, $3, $4 ${extra ? ", $5" : ""}) returning id`,
      [company, template, label, kind, ...values], { commit: true });
    return r.id;
  };
  qContacts = await q(f.companyA, templateA, "Contatos feitos hoje", "number", "metric_key=", ["wa_conversations"]);
  [{ id: qProposals }] = await run<{ id: string }>(asUser(f.admin),
    `insert into public.report_questions (company_id, template_id, label, kind, metric_key, metric_stage_id)
     values ($1, $2, 'Propostas enviadas', 'number', 'stage_entries', $3) returning id`,
    [f.companyA, templateA, proposalStage], { commit: true });
  qNotes = await q(f.companyA, templateA, "Dificuldades do dia", "text");
  qOtherCompany = await q(f.companyB, templateB, "Pergunta da B", "number");

  [{ id: submission }] = await run<{ id: string }>(asUser(f.sellerA1),
    "insert into public.report_submissions (company_id, template_id, user_id, reference_date) values ($1, $2, $3, $4) returning id",
    [f.companyA, templateA, f.sellerA1, DAY], { commit: true });
  await run(asUser(f.sellerA1),
    `insert into public.report_answers (company_id, submission_id, question_id, value_number) values ($1, $2, $3, 10)`,
    [f.companyA, submission, qContacts], { commit: true });

  [{ id: divergence }] = await run<{ id: string }>(asService("automation"),
    `insert into public.divergences (company_id, user_id, reference_date, question_id, metric_key, declared, captured)
     values ($1, $2, $3, $4, 'wa_conversations', 10, 6) returning id`,
    [f.companyA, f.sellerA1, DAY, qContacts], { commit: true });
});

afterAll(async () => {
  await pool.end();
});

describe("modelo do relatório", () => {
  it("só a administração da plataforma cria e altera o modelo", async () => {
    await expect(
      run(asUser(f.leaderA), "insert into public.report_templates (company_id, active) values ($1, false)", [f.companyA]),
    ).rejects.toThrow(/row-level security/);
    const rows = await run(asUser(f.leaderA), "update public.report_templates set schedule_time = '09:00' where id = $1 returning id", [templateA]);
    expect(rows).toHaveLength(0);
  });

  it("a empresa lê o próprio modelo; outra empresa não", async () => {
    const ids = (await run<{ id: string }>(asUser(f.sellerA1), "select id from public.report_questions where template_id = $1", [templateA])).map((r) => r.id);
    expect(ids.sort()).toEqual([qContacts, qProposals, qNotes].sort());
    expect(await run(asUser(f.leaderB), "select id from public.report_questions where template_id = $1", [templateA])).toHaveLength(0);
  });

  it("só um modelo ativo por empresa", async () => {
    await expect(
      run(asUser(f.admin), "insert into public.report_templates (company_id) values ($1)", [f.companyA]),
    ).rejects.toThrow(/duplicate key/);
  });

  it("regras das perguntas", async () => {
    const ins = (sql: string, values: unknown[]) => run(asUser(f.admin), sql, values);
    await expect(ins(
      "insert into public.report_questions (company_id, template_id, label, kind, metric_key) values ($1, $2, 'X', 'text', 'wa_conversations')",
      [f.companyA, templateA])).rejects.toThrow(/metric_only_numeric/);
    await expect(ins(
      "insert into public.report_questions (company_id, template_id, label, kind, metric_key) values ($1, $2, 'X', 'number', 'stage_entries')",
      [f.companyA, templateA])).rejects.toThrow(/stage_metric_needs_stage/);
    await expect(ins(
      "insert into public.report_questions (company_id, template_id, label, kind, options) values ($1, $2, 'X', 'single_choice', '{so-uma}')",
      [f.companyA, templateA])).rejects.toThrow(/choices_need_options/);
  });
});

describe("envios e respostas", () => {
  it("ninguém envia relatório em nome de outra pessoa", async () => {
    await expect(
      run(asUser(f.sellerA1),
        "insert into public.report_submissions (company_id, template_id, user_id, reference_date) values ($1, $2, $3, $4)",
        [f.companyA, templateA, f.sellerA2, DAY]),
    ).rejects.toThrow(/row-level security/);
  });

  it("não responde pergunta de outro relatório", async () => {
    await expect(
      run(asUser(f.sellerA1),
        "insert into public.report_answers (company_id, submission_id, question_id, value_number) values ($1, $2, $3, 1)",
        [f.companyA, submission, qOtherCompany]),
    ).rejects.toThrow(/foreign key|Pergunta não pertence/);
  });

  it("um envio por pessoa e por dia; o dono corrige a resposta", async () => {
    await expect(
      run(asUser(f.sellerA1),
        "insert into public.report_submissions (company_id, template_id, user_id, reference_date) values ($1, $2, $3, $4)",
        [f.companyA, templateA, f.sellerA1, DAY]),
    ).rejects.toThrow(/duplicate key/);
    const rows = await run(asUser(f.sellerA1),
      "update public.report_answers set value_number = 8 where submission_id = $1 returning id", [submission]);
    expect(rows).toHaveLength(1);
  });

  it("colega não vê nem altera; líder vê", async () => {
    expect(await run(asUser(f.sellerA2), "select id from public.report_answers where submission_id = $1", [submission])).toHaveLength(0);
    expect(await run(asUser(f.sellerA2), "update public.report_answers set value_number = 0 where submission_id = $1 returning id", [submission])).toHaveLength(0);
    expect(await run(asUser(f.leaderA), "select id from public.report_answers where submission_id = $1", [submission])).toHaveLength(1);
    expect(await run(asUser(f.leaderB), "select id from public.report_submissions where id = $1", [submission])).toHaveLength(0);
  });
});

describe("números capturados", () => {
  it("conta conversas do dia e entradas na etapa Proposta da pessoa", async () => {
    // Usa o dia de hoje (fuso de São Paulo) para não precisar alterar o histórico.
    const today = todayRange("America/Sao_Paulo");
    const nowIso = new Date().toISOString();
    const svc = asService("automation");
    const [{ id: src }] = await run<{ id: string }>(svc,
      "insert into public.integration_sources (company_id, kind, name, owner_user_id) values ($1, 'whatsapp_device', 'WA', $2) returning id",
      [f.companyA, f.sellerA1], { commit: true });
    for (const [i, phone] of ["+5511911110001", "+5511911110002"].entries()) {
      const [{ id: contact }] = await run<{ id: string }>(svc,
        "insert into public.contacts (company_id, owner_id, name, phone_e164) values ($1, $2, $3, $4) returning id",
        [f.companyA, f.sellerA1, `C${i}`, phone], { commit: true });
      const [{ id: conv }] = await run<{ id: string }>(svc,
        `insert into public.conversations (company_id, source_id, contact_id, owner_id, external_id, started_at, last_message_at)
         values ($1, $2, $3, $4, $5, $6, $6) returning id`,
        [f.companyA, src, contact, f.sellerA1, phone, nowIso], { commit: true });
      await run(svc,
        `insert into public.messages (company_id, conversation_id, source_id, direction, sent_at, external_id)
         values ($1, $2, $3, 'outbound', $4, $5)`,
        [f.companyA, conv, src, nowIso, `msg-${i}`], { commit: true });
      if (i === 0) {
        const [stage0] = await run<{ id: string; pipeline_id: string }>(asSuperuser,
          "select id, pipeline_id from public.pipeline_stages where company_id = $1 order by position limit 1", [f.companyA]);
        const [{ id: opp }] = await run<{ id: string }>(asUser(f.sellerA1),
          `insert into public.opportunities (company_id, contact_id, owner_id, pipeline_id, stage_id, title)
           values ($1, $2, $3, $4, $5, 'Negócio') returning id`,
          [f.companyA, contact, f.sellerA1, stage0.pipeline_id, stage0.id], { commit: true });
        await run(asUser(f.sellerA1), "update public.opportunities set stage_id = $2 where id = $1", [opp, proposalStage], { commit: true });
      }
    }

    const rows = await run<{ metric_key: string; stage_id: string | null; value: string }>(
      asUser(f.sellerA1), "select * from public.captured_metrics($1, $2, $3, $4)", [f.companyA, f.sellerA1, today.start, today.end]);
    const get = (k: string, stage?: string) => Number(rows.find((r) => r.metric_key === k && (stage ? r.stage_id === stage : true))?.value ?? 0);
    expect(get("wa_conversations")).toBe(2);
    expect(get("wa_conversations_started")).toBe(2);
    expect(get("wa_messages_sent")).toBe(2);
    expect(get("opportunities_created")).toBe(1);
    expect(get("stage_entries", proposalStage)).toBe(1);
  });

  it("colega não consegue ver os números de outra pessoa", async () => {
    const rows = await run<{ metric_key: string; value: string }>(
      asUser(f.sellerA2), "select * from public.captured_metrics($1, $2, $3, $4)", [f.companyA, f.sellerA1, todayRange("America/Sao_Paulo").start, todayRange("America/Sao_Paulo").end]);
    expect(rows.find((r) => r.metric_key === "wa_conversations")?.value).toBe("0");
  });
});

describe("divergências", () => {
  it("vendedor vê a dele; colega e outra empresa não", async () => {
    expect(await run(asUser(f.sellerA1), "select id from public.divergences")).toHaveLength(1);
    expect(await run(asUser(f.sellerA2), "select id from public.divergences")).toHaveLength(0);
    expect(await run(asUser(f.leaderB), "select id from public.divergences")).toHaveLength(0);
  });

  it("explicar exige texto; vendedor não verifica nem muda os números", async () => {
    await expect(
      run(asUser(f.sellerA1), "update public.divergences set status = 'justified', justification = '' where id = $1", [divergence]),
    ).rejects.toThrow(/Escreva uma explicação/);
    await expect(
      run(asUser(f.sellerA1), "update public.divergences set status = 'verified' where id = $1", [divergence]),
    ).rejects.toThrow(/Só o líder verifica/);
    await expect(
      run(asUser(f.sellerA1), "update public.divergences set captured = 10 where id = $1", [divergence]),
    ).rejects.toThrow(/permission denied/);
  });

  it("vendedor explica e o líder verifica", async () => {
    const [j] = await run<{ status: string; justified_at: Date | null }>(asUser(f.sellerA1),
      "update public.divergences set status = 'justified', justification = 'Fiz 4 ligações por telefone' where id = $1 returning status, justified_at",
      [divergence], { commit: true });
    expect(j.status).toBe("justified");
    expect(j.justified_at).not.toBeNull();
    const [v] = await run<{ status: string; verified_by: string }>(asUser(f.leaderA),
      "update public.divergences set status = 'verified' where id = $1 returning status, verified_by", [divergence]);
    expect(v).toEqual({ status: "verified", verified_by: f.leaderA });
  });
});
