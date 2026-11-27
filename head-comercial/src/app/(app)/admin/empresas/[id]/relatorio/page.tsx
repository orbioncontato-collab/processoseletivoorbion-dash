import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowDown, ArrowUp } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveTemplate } from "@/modules/reports/queries";
import { METRICS, QUESTION_KINDS, type MetricKey } from "@/modules/reports/rules";
import { questionAction } from "@/modules/reports/admin-actions";
import { QuestionForm, TemplateForm } from "@/modules/reports/components/admin-forms";

export const metadata: Metadata = { title: "Relatório da empresa" };

export default async function CompanyReportAdminPage({ params }: PageProps<"/admin/empresas/[id]/relatorio">) {
  await requirePlatformAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data: company } = await supabase.from("companies").select("id, name").eq("id", id).maybeSingle();
  if (!company) notFound();

  const [template, stagesRes] = await Promise.all([
    getActiveTemplate(company.id),
    supabase.from("pipeline_stages").select("id, name").eq("company_id", company.id).is("archived_at", null).order("position"),
  ]);
  const stages = stagesRes.data ?? [];
  const stageName = new Map(stages.map((s) => [s.id, s.name]));

  return (
    <div className="grid gap-6">
      <div>
        <Link href={`/admin/empresas/${company.id}`} className="text-sm text-primary hover:underline">
          ← {company.name}
        </Link>
      </div>
      <PageHeader title="Relatório da empresa" description="Perguntas, horário e comparação com os dados capturados." />
      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateForm
            companyId={company.id}
            values={
              template
                ? { name: template.name, scheduleTime: template.schedule_time, reference: template.reference, weekdays: template.weekdays }
                : null
            }
          />
        </CardContent>
      </Card>
      {template ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Perguntas</CardTitle>
              <CardDescription>{template.questions.length} pergunta(s) ativa(s).</CardDescription>
            </CardHeader>
            <CardContent>
              {template.questions.length ? (
                <ol className="grid gap-2">
                  {template.questions.map((q, i) => (
                    <li key={q.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-1">
                        {(["up", "down"] as const).map((op) => (
                          <form key={op} action={questionAction}>
                            <input type="hidden" name="id" value={q.id} />
                            <input type="hidden" name="op" value={op} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              disabled={op === "up" ? i === 0 : i === template.questions.length - 1}
                              aria-label={`${op === "up" ? "Subir" : "Descer"} ${q.label}`}
                            >
                              {op === "up" ? <ArrowUp /> : <ArrowDown />}
                            </Button>
                          </form>
                        ))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{q.label}</p>
                        <p className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {QUESTION_KINDS[q.kind]}
                          {q.required ? "" : " · opcional"}
                          {q.options.length ? ` · ${q.options.join(", ")}` : ""}
                        </p>
                        {q.metric_key ? (
                          <Badge variant="outline" className="mt-1">
                            Compara com: {METRICS[q.metric_key as MetricKey]}
                            {q.metric_stage_id ? ` "${stageName.get(q.metric_stage_id) ?? ""}"` : ""} · margem {q.tolerance_pct}% ou{" "}
                            {q.kind === "currency" ? `R$ ${q.tolerance_abs}` : q.tolerance_abs}
                          </Badge>
                        ) : null}
                      </div>
                      <form action={questionAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="op" value="archive" />
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive" aria-label={`Remover ${q.label}`}>
                          Remover
                        </Button>
                      </form>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma pergunta ainda.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Nova pergunta</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionForm companyId={company.id} templateId={template.id} stages={stages} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
