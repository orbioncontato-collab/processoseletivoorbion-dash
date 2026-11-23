import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCompany } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOpenSummary, getStages, getTeam, listOpportunities } from "@/modules/commercial/queries";
import { opportunityFiltersSchema, STALE_DAYS } from "@/modules/commercial/schemas";
import { NextStepInfo, StatusBadge } from "@/modules/commercial/components/badges";

export const metadata: Metadata = { title: "Oportunidades" };

export default async function OpportunitiesPage({ searchParams }: PageProps<"/oportunidades">) {
  const { company } = await requireCompany();
  const isLeader = company.role === "leader";
  const filters = opportunityFiltersSchema.parse(await searchParams);

  const [stages, team] = await Promise.all([getStages(company.companyId), isLeader ? getTeam(company.companyId) : []]);
  const [items, summary] = await Promise.all([
    listOpportunities(company.companyId, filters, company.timezone),
    getOpenSummary(company.companyId, stages),
  ]);
  const totalOpen = summary.reduce((s, x) => s + x.valueCents, 0);
  const anyFilter = filters.stage || filters.owner || filters.due || filters.q || filters.status !== "open";

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Oportunidades"
        description={isLeader ? "Todas as negociações do time." : "Suas negociações."}
        actions={
          <Button asChild>
            <Link href="/oportunidades/nova">
              <Plus aria-hidden /> Nova oportunidade
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium">Funil em aberto</p>
            <p className="text-sm text-muted-foreground">{formatMoney(totalOpen)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {summary.map((s) => (
              <Link
                key={s.stageId}
                href={`/oportunidades?stage=${s.stageId}`}
                className="rounded-lg border bg-secondary/40 px-3 py-2 transition-colors hover:bg-secondary"
              >
                <p className="truncate text-xs text-muted-foreground">{s.name}</p>
                <p className="text-lg font-semibold">{s.count}</p>
                <p className="truncate text-xs text-muted-foreground">{formatMoney(s.valueCents)}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <form method="get" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="sr-only">
            Buscar
          </label>
          <Input id="q" name="q" placeholder="Buscar por título ou contato" defaultValue={filters.q ?? ""} />
        </div>
        <Select name="status" defaultValue={filters.status} aria-label="Situação">
          <option value="open">Em aberto</option>
          <option value="won">Ganhas</option>
          <option value="lost">Perdidas</option>
          <option value="all">Todas</option>
        </Select>
        <Select name="stage" defaultValue={filters.stage ?? ""} aria-label="Etapa">
          <option value="">Todas as etapas</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select name="due" defaultValue={filters.due ?? ""} aria-label="Próximo passo">
          <option value="">Qualquer próximo passo</option>
          <option value="overdue">Vencidos</option>
          <option value="today">Para hoje</option>
          <option value="none">Sem próximo passo</option>
          <option value="stale">Paradas há {STALE_DAYS}+ dias</option>
        </Select>
        {isLeader ? (
          <Select name="owner" defaultValue={filters.owner ?? ""} aria-label="Responsável">
            <option value="">Todo o time</option>
            {team.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.name}
              </option>
            ))}
          </Select>
        ) : null}
        <div className="flex gap-2 lg:col-span-6">
          <Button type="submit" variant="secondary" size="sm">
            Filtrar
          </Button>
          {anyFilter ? (
            <Button asChild variant="ghost" size="sm">
              <Link href="/oportunidades">Limpar filtros</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="grid gap-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {anyFilter ? "Nenhuma oportunidade encontrada com esses filtros." : "Nenhuma oportunidade ainda."}
              </p>
              {!anyFilter ? (
                <div>
                  <Button asChild size="sm">
                    <Link href="/oportunidades/nova">Criar a primeira</Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Próximo passo</TableHead>
                  {isLeader ? <TableHead>Responsável</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="max-w-[260px]">
                      <Link href={`/oportunidades/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{o.contactName}</p>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1">
                        <span className="text-sm">{o.stageName}</span>
                        {o.status !== "open" ? <StatusBadge status={o.status} /> : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">{formatMoney(o.value_cents)}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <NextStepInfo
                        nextStep={o.next_step}
                        nextStepAt={o.next_step_at}
                        timeZone={company.timezone}
                        status={o.status}
                      />
                    </TableCell>
                    {isLeader ? <TableCell className="whitespace-nowrap">{o.ownerName}</TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
