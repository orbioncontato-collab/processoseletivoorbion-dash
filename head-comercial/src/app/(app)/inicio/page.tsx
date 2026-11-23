import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDuration, formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/modules/team/schemas";
import { STALE_DAYS } from "@/modules/commercial/schemas";
import { getHomeCounters, getTeam, listOpportunities } from "@/modules/commercial/queries";
import { getTodayMetrics } from "@/modules/conversations/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NextStepInfo } from "@/modules/commercial/components/badges";

export const metadata: Metadata = { title: "Início" };

function Counter({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  href: string;
  tone?: "default" | "danger" | "warning";
}) {
  const color = tone === "danger" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-foreground";
  return (
    <Link href={href} className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-secondary/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </Link>
  );
}

export default async function HomePage() {
  const { user, company } = await requireCompany();
  const firstName = (user.fullName || user.email).split(" ")[0];
  const isLeader = company.role === "leader";

  const [counters, overdue, today, metrics, team] = await Promise.all([
    getHomeCounters(company.companyId, company.timezone),
    listOpportunities(company.companyId, { status: "open", due: "overdue" }, company.timezone, 8),
    listOpportunities(company.companyId, { status: "open", due: "today" }, company.timezone, 8),
    getTodayMetrics(company.companyId, company.timezone),
    isLeader ? getTeam(company.companyId) : Promise.resolve([]),
  ]);
  const ownerName = new Map(team.map((t) => [t.userId, t.name]));
  const mine = metrics.find((m) => m.ownerId === user.id);
  const priorities = [...overdue, ...today].slice(0, 8);

  let pendingInvites = 0;
  if (isLeader) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.companyId)
      .eq("status", "pending");
    pendingInvites = count ?? 0;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Olá, ${firstName}`}
        description={`${company.companyName} · ${ROLE_LABELS[company.role]}`}
        actions={
          <Button asChild>
            <Link href="/oportunidades/nova">
              <Plus aria-hidden /> Nova oportunidade
            </Link>
          </Button>
        }
      />

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Counter label={isLeader ? "Em aberto no time" : "Em aberto"} value={counters.open} href="/oportunidades" />
        <Counter label="Valor em aberto" value={formatMoney(counters.openValueCents)} href="/oportunidades" />
        <Counter
          label="Próximos passos vencidos"
          value={counters.overdue}
          href="/oportunidades?due=overdue"
          tone={counters.overdue ? "danger" : "default"}
        />
        <Counter label="Para hoje" value={counters.today} href="/oportunidades?due=today" />
        <Counter
          label="Sem próximo passo"
          value={counters.withoutNextStep}
          href="/oportunidades?due=none"
          tone={counters.withoutNextStep ? "warning" : "default"}
        />
        <Counter
          label={`Paradas há ${STALE_DAYS}+ dias`}
          value={counters.stale}
          href="/oportunidades?due=stale"
          tone={counters.stale ? "warning" : "default"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Prioridades de hoje</CardTitle>
            <CardDescription>Próximos passos vencidos e marcados para hoje.</CardDescription>
          </CardHeader>
          <CardContent>
            {priorities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nada vencido nem marcado para hoje.
                {counters.withoutNextStep
                  ? ` Mas ${counters.withoutNextStep} oportunidade(s) estão sem próximo passo.`
                  : ""}
              </p>
            ) : (
              <ul className="divide-y">
                {priorities.map((o) => (
                  <li key={o.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_1.2fr] sm:gap-4">
                    <div className="min-w-0">
                      <Link href={`/oportunidades/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.contactName} · {o.stageName}
                        {isLeader ? ` · ${o.ownerName}` : ""}
                      </p>
                    </div>
                    <div className="text-sm">
                      <NextStepInfo
                        nextStep={o.next_step}
                        nextStepAt={o.next_step_at}
                        timeZone={company.timezone}
                        status={o.status}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="grid content-start gap-6">
          {isLeader ? (
            <Card>
              <CardHeader>
                <CardTitle>Equipe</CardTitle>
                <CardDescription>
                  {pendingInvites ? `${pendingInvites} convite(s) aguardando resposta.` : "Gerencie acessos e convites."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" size="sm">
                  <Link href="/equipe">Abrir equipe</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          <Card data-testid="whatsapp-hoje">
            <CardHeader>
              <CardTitle>WhatsApp hoje</CardTitle>
              <CardDescription>Movimentação capturada desde a meia-noite.</CardDescription>
            </CardHeader>
            <CardContent>
              {!metrics.length ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma conversa capturada hoje. Os números aparecem quando o WhatsApp estiver conectado.
                </p>
              ) : isLeader ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pessoa</TableHead>
                      <TableHead className="text-right">Conversas</TableHead>
                      <TableHead className="text-right">Enviadas</TableHead>
                      <TableHead className="text-right">Resposta</TableHead>
                      <TableHead className="text-right">Esperando</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m) => (
                      <TableRow key={m.ownerId}>
                        <TableCell>{ownerName.get(m.ownerId) ?? "Ex-membro"}</TableCell>
                        <TableCell className="text-right">{m.conversationsActive}</TableCell>
                        <TableCell className="text-right">{m.outbound}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">{formatDuration(m.avgFirstResponseSeconds)}</TableCell>
                        <TableCell className={`text-right ${m.awaitingReply ? "font-medium text-warning" : ""}`}>
                          {m.awaitingReply}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Conversas</dt>
                    <dd className="text-lg font-semibold">{mine?.conversationsActive ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Mensagens enviadas</dt>
                    <dd className="text-lg font-semibold">{mine?.outbound ?? 0}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Tempo médio de resposta</dt>
                    <dd className="text-lg font-semibold">{formatDuration(mine?.avgFirstResponseSeconds)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Esperando resposta</dt>
                    <dd className={`text-lg font-semibold ${mine?.awaitingReply ? "text-warning" : ""}`}>
                      <Link href="/conversas?aguardando=1" className="hover:underline">
                        {mine?.awaitingReply ?? 0}
                      </Link>
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
