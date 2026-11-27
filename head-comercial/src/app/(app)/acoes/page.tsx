import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeam } from "@/modules/commercial/queries";
import { ActionForm } from "@/modules/action-plan/components/action-form";
import { ActionList } from "@/modules/action-plan/components/action-list";
import { listActions } from "@/modules/action-plan/queries";
import { localDate } from "@/modules/ai/daily-summary";

export const metadata: Metadata = { title: "Plano de ação" };

export default async function ActionsPage({ searchParams }: PageProps<"/acoes">) {
  const { user, company } = await requireCompany();
  const isLeader = company.role === "leader";
  const sp = await searchParams;
  const showClosed = sp.todas === "1";
  const [mine, team, all] = await Promise.all([
    listActions(company.companyId, { ownerId: user.id, includeClosed: showClosed }),
    isLeader ? getTeam(company.companyId) : Promise.resolve([]),
    isLeader ? listActions(company.companyId, { includeClosed: showClosed }) : Promise.resolve([]),
  ]);
  const names = Object.fromEntries(team.map((t) => [t.userId, t.name]));
  const today = localDate(company.timezone);
  const others = all.filter((a) => a.owner_id !== user.id);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Plano de ação"
        description="O que precisa ser feito, por quem e até quando. O Gestor de Projetos também cria ações pelo chat."
        actions={
          <a href={showClosed ? "/acoes" : "/acoes?todas=1"} className="text-sm text-primary hover:underline">
            {showClosed ? "Mostrar só em aberto" : "Mostrar também as encerradas"}
          </a>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Minhas ações</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionList items={mine} today={today} currentUserId={user.id} isLeader={isLeader} empty="Nenhuma ação em aberto com você." label="Minhas ações" />
        </CardContent>
      </Card>
      {isLeader ? (
        <Card>
          <CardHeader>
            <CardTitle>Ações do time</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionList items={others} today={today} currentUserId={user.id} isLeader names={names} empty="Nenhuma ação em aberto com o time." label="Ações do time" />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Nova ação</CardTitle>
          <CardDescription>{isLeader ? "Escolha quem fica responsável." : "Fica sob sua responsabilidade."}</CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm members={isLeader ? team.filter((t) => t.userId !== user.id) : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
