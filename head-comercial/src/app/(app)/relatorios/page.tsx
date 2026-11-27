import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getTeam } from "@/modules/commercial/queries";
import { getActiveTemplate } from "@/modules/reports/queries";
import { dueReferenceDate } from "@/modules/reports/rules";
import { setDivergenceStatus } from "@/modules/reports/actions";
import { DivergenceSummary } from "@/modules/reports/components/divergence-item";

export const metadata: Metadata = { title: "Relatórios do time" };

export default async function TeamReportsPage({ searchParams }: PageProps<"/relatorios">) {
  const { company } = await requireLeader();
  const template = await getActiveTemplate(company.companyId);
  if (!template) {
    return (
      <div className="grid gap-6">
        <PageHeader title="Relatórios do time" />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            A empresa ainda não tem relatório configurado. Fale com a equipe Orbion para definir as perguntas.
          </CardContent>
        </Card>
      </div>
    );
  }
  const sp = await searchParams;
  const due = dueReferenceDate(new Date(), company.timezone, template.schedule_time, template.reference, template.weekdays);
  const date = typeof sp.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.data) ? sp.data : due;
  const supabase = await createClient();

  const [team, subsRes, divRes, stagesRes] = await Promise.all([
    getTeam(company.companyId),
    date
      ? supabase.from("report_submissions").select("id, user_id, submitted_at").eq("template_id", template.id).eq("reference_date", date)
      : Promise.resolve({ data: [] as { id: string; user_id: string; submitted_at: string }[] }),
    supabase
      .from("divergences")
      .select("id, user_id, reference_date, question_id, metric_key, declared, captured, status, justification")
      .eq("company_id", company.companyId)
      .in("status", ["open", "justified"])
      .order("reference_date", { ascending: false })
      .limit(100),
    supabase.from("pipeline_stages").select("id, name").eq("company_id", company.companyId),
  ]);
  const subs = subsRes.data ?? [];
  const { data: answers } = subs.length
    ? await supabase
        .from("report_answers")
        .select("submission_id, question_id, value_number, value_text, value_options")
        .in("submission_id", subs.map((s) => s.id))
    : { data: [] };
  const subByUser = new Map(subs.map((s) => [s.user_id, s]));
  const answerOf = (subId: string, qid: string) => (answers ?? []).find((a) => a.submission_id === subId && a.question_id === qid);
  const name = new Map(team.map((t) => [t.userId, t.name]));
  const qById = new Map(template.questions.map((q) => [q.id, q]));
  const stageName = new Map((stagesRes.data ?? []).map((s) => [s.id, s.name]));

  const show = (kind: string, a?: { value_number: number | null; value_text: string | null; value_options: string[] | null }) => {
    if (!a) return "-";
    if (kind === "currency") return a.value_number == null ? "-" : formatMoney(Number(a.value_number));
    if (kind === "yes_no") return a.value_text === "sim" ? "Sim" : a.value_text === "nao" ? "Não" : "-";
    if (a.value_options) return a.value_options.join(", ") || "-";
    return a.value_text ?? (a.value_number != null ? String(a.value_number) : "-");
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Relatórios do time"
        description={date ? `Referente a ${formatDate(date)} · ${subs.length} de ${team.length} enviados` : "Nenhum relatório liberado ainda."}
      />

      <Card>
        <CardHeader>
          <CardTitle>Divergências para conferir</CardTitle>
          <CardDescription>
            Diferenças entre o informado e o capturado. Servem para orientar a conversa com a equipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {divRes.data?.length ? (
            divRes.data.map((d) => {
              const q = qById.get(d.question_id);
              return (
                <div key={d.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
                  <DivergenceSummary
                    d={{
                      ...d,
                      declared: Number(d.declared),
                      captured: Number(d.captured),
                      questionLabel: q?.label ?? "Pergunta",
                      questionKind: q?.kind ?? "number",
                      stageName: q?.metric_stage_id ? stageName.get(q.metric_stage_id) : null,
                      personName: name.get(d.user_id) ?? "Ex-membro",
                    }}
                  />
                  <div className="flex shrink-0 gap-2">
                    <form action={setDivergenceStatus}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="status" value="verified" />
                      <Button type="submit" size="sm" variant="outline">
                        <CheckCircle2 aria-hidden /> Verificada
                      </Button>
                    </form>
                    {d.status === "justified" ? (
                      <form action={setDivergenceStatus}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="status" value="open" />
                        <Button type="submit" size="sm" variant="ghost">
                          <RotateCcw aria-hidden /> Reabrir
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma divergência em aberto.</p>
          )}
        </CardContent>
      </Card>

      {date ? (
        <Card>
          <CardHeader>
            <CardTitle>Respostas de {formatDate(date)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pessoa</TableHead>
                  {template.questions.map((q) => (
                    <TableHead key={q.id} className="min-w-32">
                      {q.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map((t) => {
                  const s = subByUser.get(t.userId);
                  return (
                    <TableRow key={t.userId}>
                      <TableCell className="whitespace-nowrap">
                        {t.name}
                        {!s ? (
                          <Badge variant="warning" className="ml-2">
                            Não enviado
                          </Badge>
                        ) : null}
                      </TableCell>
                      {template.questions.map((q) => (
                        <TableCell key={q.id}>{s ? show(q.kind, answerOf(s.id, q.id)) : ""}</TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
      <p className="text-sm">
        <Link href="/relatorio" className="text-primary hover:underline">
          Responder o meu relatório
        </Link>
      </p>
    </div>
  );
}
