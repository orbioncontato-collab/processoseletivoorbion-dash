import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { getTeam } from "@/modules/commercial/queries";
import { listOpenAlerts } from "@/modules/alerts/queries";
import { ALERT_LABELS, TYPE_ORDER, describeCounts, countByType, type AlertType } from "@/modules/alerts/rules";
import { AlertList } from "@/modules/alerts/components/alert-list";

export const metadata: Metadata = { title: "Alertas" };

export default async function AlertsPage({ searchParams }: PageProps<"/alertas">) {
  const { user, company } = await requireCompany();
  const isLeader = company.role === "leader";
  const sp = await searchParams;
  const type = TYPE_ORDER.includes(sp.tipo as AlertType) ? (sp.tipo as AlertType) : undefined;
  const team = isLeader ? await getTeam(company.companyId) : [];
  const person = isLeader && team.some((t) => t.userId === sp.pessoa) ? (sp.pessoa as string) : undefined;
  const showDismissed = sp.dispensados === "1";

  const alerts = await listOpenAlerts(company.companyId, {
    type,
    userId: isLeader ? person : user.id,
    includeDismissed: showDismissed,
  });
  const names = Object.fromEntries(team.map((t) => [t.userId, t.name]));
  const open = alerts.filter((a) => a.status === "open");

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Alertas"
        description={open.length ? `${describeCounts(countByType(open), 4)}.` : "Nenhuma pendência com esses filtros."}
      />
      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-4" role="search">
        <Select name="tipo" defaultValue={type ?? ""} aria-label="Tipo de alerta">
          <option value="">Todos os tipos</option>
          {TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {ALERT_LABELS[t].many.charAt(0).toUpperCase() + ALERT_LABELS[t].many.slice(1)}
            </option>
          ))}
        </Select>
        {isLeader ? (
          <Select name="pessoa" defaultValue={person ?? ""} aria-label="Pessoa">
            <option value="">Todo o time</option>
            {team.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.name}
              </option>
            ))}
          </Select>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="dispensados" value="1" defaultChecked={showDismissed} /> Incluir dispensados
        </label>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" size="sm">
            Filtrar
          </Button>
          {type || person || showDismissed ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/alertas">Limpar</Link>
            </Button>
          ) : null}
        </div>
      </form>
      <Card>
        <CardContent className="px-6 py-2">
          <AlertList alerts={alerts} timeZone={company.timezone} isLeaderView={isLeader} names={isLeader ? names : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
