import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { requireCompany } from "@/lib/auth/session";
import { centsToInput, formatDate, formatDateTime, formatMoney, formatPhone, utcToZonedInput } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOpportunity, getOpportunityTimeline, getStages, getTeam } from "@/modules/commercial/queries";
import { LOST_REASONS, OBJECTION_CATEGORIES, SOURCE_LABELS } from "@/modules/commercial/schemas";
import { setObjectionStatus } from "@/modules/commercial/actions";
import { NextStepInfo, StatusBadge } from "@/modules/commercial/components/badges";
import { EditOpportunityForm, ObjectionForm, StageMover } from "@/modules/commercial/components/opportunity-forms";
import type { ActivityRow } from "@/modules/activities/format";
import { buildFormatContext } from "@/modules/activities/context";
import { Timeline } from "@/modules/activities/timeline";

export const metadata: Metadata = { title: "Oportunidade" };

export default async function OpportunityPage({ params }: PageProps<"/oportunidades/[id]">) {
  const { company } = await requireCompany();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const data = await getOpportunity(company.companyId, id);
  if (!data) notFound();
  const { opp, contact, objections } = data;
  const isLeader = company.role === "leader";

  const [stages, team, timelineRows] = await Promise.all([
    getStages(company.companyId),
    getTeam(company.companyId),
    getOpportunityTimeline(id),
  ]);
  const ctx = await buildFormatContext(company.companyId, timelineRows as ActivityRow[]);
  const stageName = ctx.stages?.[opp.stage_id] ?? "Etapa";
  const ownerName = team.find((t) => t.userId === opp.owner_id)?.name ?? "Ex-membro";
  const openObjections = objections.filter((o) => o.status === "open").length;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/oportunidades" className="text-sm text-primary hover:underline">
          ← Oportunidades
        </Link>
      </div>
      <PageHeader
        title={opp.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{stageName}</span>
            <StatusBadge status={opp.status} />
            <span>· {formatMoney(opp.value_cents)}</span>
            <span>· {ownerName}</span>
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-6">
          {opp.status === "open" ? (
            <Card>
              <CardHeader>
                <CardTitle>Próximo passo</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <NextStepInfo
                  nextStep={opp.next_step}
                  nextStepAt={opp.next_step_at}
                  timeZone={company.timezone}
                  status={opp.status}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{opp.status === "won" ? "Negociação ganha" : "Negociação perdida"}</CardTitle>
                <CardDescription>
                  Encerrada em {formatDateTime(opp.closed_at, company.timezone)}
                  {opp.status === "lost" && opp.lost_reason
                    ? ` · Motivo: ${LOST_REASONS[opp.lost_reason as keyof typeof LOST_REASONS]}`
                    : ""}
                  {opp.lost_reason_detail ? ` · ${opp.lost_reason_detail}` : ""}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dados da oportunidade</CardTitle>
            </CardHeader>
            <CardContent>
              <EditOpportunityForm
                opportunity={{
                  id: opp.id,
                  title: opp.title,
                  product: opp.product,
                  valueInput: centsToInput(opp.value_cents),
                  owner_id: opp.owner_id,
                  expected_close_date: opp.expected_close_date,
                  next_step: opp.next_step,
                  status: opp.status,
                }}
                owners={isLeader ? team.map((t) => ({ id: t.userId, name: t.name })) : null}
                nextStepAtInput={utcToZonedInput(opp.next_step_at, company.timezone)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Objeções</CardTitle>
              <CardDescription>
                {objections.length
                  ? `${objections.length} registrada(s), ${openObjections} sem resposta.`
                  : "O que o cliente levantou como dúvida ou resistência."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {objections.length ? (
                <ul className="divide-y rounded-lg border">
                  {objections.map((o) => (
                    <li key={o.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className={`text-sm ${o.status === "handled" ? "text-muted-foreground line-through" : ""}`}>
                          {o.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {OBJECTION_CATEGORIES[o.category as keyof typeof OBJECTION_CATEGORIES]} ·{" "}
                          {formatDateTime(o.created_at, company.timezone)}
                        </p>
                      </div>
                      <form action={setObjectionStatus}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="status" value={o.status === "open" ? "handled" : "open"} />
                        <Button type="submit" variant="ghost" size="sm">
                          {o.status === "open" ? (
                            <>
                              <CheckCircle2 aria-hidden /> Resolvida
                            </>
                          ) : (
                            <>
                              <RotateCcw aria-hidden /> Reabrir
                            </>
                          )}
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ObjectionForm opportunityId={opp.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
              <CardDescription>Como esta negociação evoluiu.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Timeline rows={timelineRows as ActivityRow[]} ctx={ctx} timeZone={company.timezone} />
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <StageMover key={opp.stage_id} opportunityId={opp.id} stages={stages} currentStageId={opp.stage_id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-1 text-sm">
              {contact ? (
                <>
                  <Link href={`/contatos/${contact.id}`} className="font-medium text-primary hover:underline">
                    {contact.name}
                  </Link>
                  {contact.organization ? <p className="text-muted-foreground">{contact.organization}</p> : null}
                  {contact.phone_e164 ? <p>{formatPhone(contact.phone_e164)}</p> : null}
                  {contact.email ? <p>{contact.email}</p> : null}
                </>
              ) : (
                <p className="text-muted-foreground">Contato não visível para você.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-2 p-6 text-sm">
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Criada em</span>
                <span>{formatDateTime(opp.created_at, company.timezone)}</span>
              </p>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Última movimentação</span>
                <span>{formatDateTime(opp.last_activity_at, company.timezone)}</span>
              </p>
              {opp.expected_close_date ? (
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Previsão de fechamento</span>
                  <span>{formatDate(opp.expected_close_date)}</span>
                </p>
              ) : null}
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">Origem</span>
                <Badge variant="outline">{SOURCE_LABELS[opp.source] ?? opp.source}</Badge>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
