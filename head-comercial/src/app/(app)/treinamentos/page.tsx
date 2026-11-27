import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeam } from "@/modules/commercial/queries";
import { AssignForm, TrainingForm } from "@/modules/training/components/forms";
import { AssignmentList, LibraryList } from "@/modules/training/components/views";
import { listAssignments, listLibrary } from "@/modules/training/queries";

export const metadata: Metadata = { title: "Treinamentos" };

export default async function TrainingsPage() {
  const { user, company } = await requireCompany();
  const isLeader = company.role === "leader";
  const [library, mine, team, teamAssignments] = await Promise.all([
    listLibrary(),
    listAssignments(company.companyId, { userId: user.id }),
    isLeader ? getTeam(company.companyId) : Promise.resolve([]),
    isLeader ? listAssignments(company.companyId) : Promise.resolve([]),
  ]);
  const names = Object.fromEntries(team.map((t) => [t.userId, t.name]));
  const others = teamAssignments.filter((a) => a.user_id !== user.id);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Treinamentos"
        description="O que estudar para vender melhor. As recomendações vêm do líder e das análises das suas conversas."
      />
      <Card>
        <CardHeader>
          <CardTitle>Meus treinamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignmentList items={mine} currentUserId={user.id} isLeader={isLeader} tz={company.timezone} empty="Nenhum treinamento indicado para você agora." />
        </CardContent>
      </Card>
      {isLeader ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Treinamentos do time</CardTitle>
              <CardDescription>Depois da conclusão, o Head compara a nota da habilidade nas conversas analisadas antes e depois.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <AssignForm members={team.filter((t) => t.userId !== user.id)} trainings={library.map((t) => ({ id: t.id, title: t.title, skill: t.skill }))} />
              <AssignmentList items={others} currentUserId={user.id} isLeader names={names} tz={company.timezone} empty="Nenhum treinamento indicado para o time ainda." />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Novo treinamento da empresa</CardTitle>
              <CardDescription>Fica disponível só para a sua equipe, ao lado da biblioteca da Orbion.</CardDescription>
            </CardHeader>
            <CardContent>
              <TrainingForm scope="company" />
            </CardContent>
          </Card>
        </>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Biblioteca ({library.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <LibraryList items={library} canArchive={(t) => isLeader && t.scope === "company"} empty="A biblioteca ainda está vazia." />
        </CardContent>
      </Card>
    </div>
  );
}
