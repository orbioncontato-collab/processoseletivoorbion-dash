import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveTemplate } from "@/modules/reports/queries";
import { dueReferenceDate, isoWeekday } from "@/modules/reports/rules";
import { JustifyForm, ReportForm, type ExistingAnswer } from "@/modules/reports/components/report-form";
import { DivergenceSummary } from "@/modules/reports/components/divergence-item";

export const metadata: Metadata = { title: "Relatório" };

function lastWorkingDays(due: string, weekdays: number[], count: number) {
  const out: string[] = [];
  let d = new Date(`${due}T00:00:00Z`);
  for (let i = 0; i < 21 && out.length < count; i++) {
    const ymd = d.toISOString().slice(0, 10);
    if (weekdays.includes(isoWeekday(ymd))) out.push(ymd);
    d = new Date(d.getTime() - 86400000);
  }
  return out;
}

export default async function ReportPage({ searchParams }: PageProps<"/relatorio">) {
  const { user, company } = await requireCompany();
  const template = await getActiveTemplate(company.companyId);
  if (!template || !template.questions.length) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Relatório" />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            A empresa ainda não tem relatório configurado. A configuração é feita pela equipe Orbion.
          </CardContent>
        </Card>
      </div>
    );
  }

  const due = dueReferenceDate(new Date(), company.timezone, template.schedule_time, template.reference, template.weekdays);
  if (!due) {
    return (
      <div className="grid gap-6">
        <PageHeader title={template.name} />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            O primeiro relatório abre às {template.schedule_time.slice(0, 5)}.
          </CardContent>
        </Card>
      </div>
    );
  }

  const days = lastWorkingDays(due, template.weekdays, 7);
  const sp = await searchParams;
  const asked = typeof sp.data === "string" ? sp.data : "";
  const referenceDate = days.includes(asked) ? asked : due;

  const supabase = await createClient();
  const [subsRes, divRes] = await Promise.all([
    supabase
      .from("report_submissions")
      .select("id, reference_date")
      .eq("template_id", template.id)
      .eq("user_id", user.id)
      .in("reference_date", days),
    supabase
      .from("divergences")
      .select("id, reference_date, question_id, metric_key, declared, captured, status, justification")
      .eq("company_id", company.companyId)
      .eq("user_id", user.id)
      .eq("reference_date", referenceDate),
  ]);
  const sentDates = new Set((subsRes.data ?? []).map((s) => s.reference_date));
  const current = (subsRes.data ?? []).find((s) => s.reference_date === referenceDate);
  const { data: answerRows } = current
    ? await supabase.from("report_answers").select("question_id, value_number, value_text, value_options").eq("submission_id", current.id)
    : { data: [] };
  const answers: Record<string, ExistingAnswer> = {};
  for (const a of answerRows ?? []) answers[a.question_id] = a;

  const questionById = new Map(template.questions.map((q) => [q.id, q]));
  const { data: stages } = await supabase.from("pipeline_stages").select("id, name").eq("company_id", company.companyId);
  const stageName = new Map((stages ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="grid gap-6">
      <PageHeader
        title={template.name}
        description={`Referente a ${formatDate(referenceDate)}${current ? " · enviado, você pode corrigir" : ""}`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid content-start gap-6">
          <Card>
            <CardContent className="p-6">
              <ReportForm
                key={referenceDate}
                questions={template.questions}
                referenceDate={referenceDate}
                answers={answers}
                alreadySent={Boolean(current)}
              />
            </CardContent>
          </Card>
          {divRes.data?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Diferenças para conferir</CardTitle>
                <CardDescription>
                  O Head comparou suas respostas com o que foi capturado. Se algo aconteceu fora dos canais conectados,
                  explique aqui.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
                {divRes.data.map((d) => {
                  const q = questionById.get(d.question_id);
                  return (
                    <div key={d.id} className="grid gap-3 rounded-lg border p-4">
                      <DivergenceSummary
                        d={{
                          ...d,
                          declared: Number(d.declared),
                          captured: Number(d.captured),
                          questionLabel: q?.label ?? "Pergunta",
                          questionKind: q?.kind ?? "number",
                          stageName: q?.metric_stage_id ? stageName.get(q.metric_stage_id) : null,
                        }}
                      />
                      {d.status !== "verified" ? <JustifyForm id={d.id} current={d.justification} /> : null}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}
        </div>
        <Card className="content-start">
          <CardHeader>
            <CardTitle>Últimos dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              {days.map((d) => (
                <li key={d} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/relatorio?data=${d}`}
                    className={`hover:underline ${d === referenceDate ? "font-semibold" : "text-primary"}`}
                  >
                    {formatDate(d)}
                  </Link>
                  {sentDates.has(d) ? <Badge variant="success">Enviado</Badge> : <Badge variant="warning">Pendente</Badge>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
