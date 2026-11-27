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
import { getHomeCounters, getTeam } from "@/modules/commercial/queries";
import { listOpenAlerts } from "@/modules/alerts/queries";
import { rankPeople, teamReading } from "@/modules/alerts/rules";
import { AlertList } from "@/modules/alerts/components/alert-list";
import { getTodayMetrics } from "@/modules/conversations/queries";
import { getActiveTemplate } from "@/modules/reports/queries";
import { dueReferenceDate } from "@/modules/reports/rules";
import { formatDate } from "@/lib/format";
import { latestDailySummary } from "@/modules/ai/queries";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  const [counters, metrics, team, alerts, summary] = await Promise.all([
    getHomeCounters(company.companyId, company.timezone),
    getTodayMetrics(company.companyId, company.timezone),
    isLeader ? getTeam(company.companyId) : Promise.resolve([]),
    listOpenAlerts(company.companyId),
    isLeader ? latestDailySummary(company.companyId) : Promise.resolve(null),
  ]);
  const ownerName = new Map(team.map((t) => [t.userId, t.name]));
  const names = Object.fromEntries(team.map((t) => [t.userId, t.name]));
  const myAlerts = alerts.filter((a) => a.user_id === user.id);
  const ranking = isLeader ? rankPeople(alerts, names).slice(0, 6) : [];

  // Relatório do dia e divergências em aberto.
  const template = await getActiveTemplate(company.companyId);
  const due = template?.questions.length
    ? dueReferenceDate(new Date(), company.timezone, template.schedule_time, template.reference, template.weekdays)
    : null;
  const reportClient = await createClient();
  const [mySub, teamSubs, openDivs] = await Promise.all([
    due && template
      ? reportClient.from("report_submissions").select("id").eq("template_id", template.id).eq("user_id", user.id).eq("reference_date", due).maybeSingle()
      : Promise.resolve({ data: null }),
    due && template && isLeader
      ? reportClient.from("report_submissions").select("id", { count: "exact", head: true }).eq("template_id", template.id).eq("reference_date", due)
      : Promise.resolve({ count: 0 }),
    reportClient
      .from("divergences")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.companyId)
      .eq("status", "open")
      .match(isLeader ? {} : { user_id: user.id }),
  ]);
  const openDivergences = openDivs.count ?? 0;
  const mine = metrics.find((m) => m.ownerId === user.id);

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
        <div className="grid content-start gap-6">
          {summary ? (
            <Card data-testid="resumo-do-dia">
              <CardHeader>
                <CardTitle>{summary.title}</CardTitle>
                <CardDescription>Escrito pelo Head Comercial.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <p className="line-clamp-[12] whitespace-pre-wrap text-sm">{summary.content}</p>
                <Link href={`/assistente/${summary.id}`} className="text-sm text-primary hover:underline">
                  Abrir e conversar sobre o resumo
                </Link>
              </CardContent>
            </Card>
          ) : null}
          {isLeader ? (
            <Card data-testid="leitura-operacao">
              <CardHeader>
                <CardTitle>Leitura da operação</CardTitle>
                <CardDescription>{teamReading(alerts, names)}</CardDescription>
              </CardHeader>
              {ranking.length ? (
                <CardContent>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Quem merece atenção</p>
                  <ol className="grid gap-2">
                    {ranking.map((p) => (
                      <li key={p.userId} className="flex flex-col gap-0.5 rounded-lg border px-3 py-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                        <Link href={`/alertas?pessoa=${p.userId}`} className="font-medium text-primary hover:underline">
                          {p.name}
                        </Link>
                        <span className="text-sm text-muted-foreground">{p.sentence}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              ) : null}
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>O que fazer agora</CardTitle>
              <CardDescription>
                {myAlerts.length
                  ? "Suas pendências, da mais urgente para a menos urgente."
                  : "Nada urgente agora. Bom momento para prospectar ou revisar as negociações."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertList alerts={myAlerts} timeZone={company.timezone} isLeaderView={false} limit={8} emptyText="Sem pendências." />
            </CardContent>
          </Card>
        </div>

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
          {due ? (
            <Card data-testid="relatorio-card">
              <CardHeader>
                <CardTitle>Relatório de {formatDate(due)}</CardTitle>
                <CardDescription>
                  {mySub.data ? "Seu relatório foi enviado." : "Seu relatório está pendente."}
                  {isLeader ? ` Time: ${teamSubs.count ?? 0} de ${team.length} enviados.` : ""}
                  {openDivergences
                    ? ` ${openDivergences} diferença(s) entre o informado e o capturado para conferir.`
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant={mySub.data ? "outline" : "default"}>
                  <Link href="/relatorio">{mySub.data ? "Ver meu relatório" : "Responder agora"}</Link>
                </Button>
                {isLeader ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href="/relatorios">Relatórios do time</Link>
                  </Button>
                ) : null}
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
