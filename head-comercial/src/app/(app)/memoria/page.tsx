import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeam } from "@/modules/commercial/queries";
import { MemoryForm } from "@/modules/knowledge/components/forms";
import { MemoryList } from "@/modules/knowledge/components/views";
import { listMemory } from "@/modules/knowledge/queries";

export const metadata: Metadata = { title: "Memória" };

export default async function MemoryPage() {
  const { user, company } = await requireCompany();
  const isLeader = company.role === "leader";
  const [items, team] = await Promise.all([listMemory(company.companyId), isLeader ? getTeam(company.companyId) : Promise.resolve([])]);
  const companyItems = items.filter((m) => m.scope === "company");
  const people = new Map<string, { name: string; items: typeof items }>();
  for (const m of items) {
    if (m.scope !== "user" || !m.subject_user_id) continue;
    const entry = people.get(m.subject_user_id) ?? { name: m.subjectName ?? "Sem nome", items: [] };
    entry.items.push(m);
    people.set(m.subject_user_id, entry);
  }
  const mine = people.get(user.id);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Memória"
        description="O que o Head sabe sobre a empresa e sobre cada pessoa. Os agentes usam isso para dar orientações no contexto certo."
      />
      {isLeader ? (
        <Card>
          <CardHeader>
            <CardTitle>Registrar</CardTitle>
            <CardDescription>A memória de uma pessoa só aparece para ela e para os líderes.</CardDescription>
          </CardHeader>
          <CardContent>
            <MemoryForm members={team} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Sobre a empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <MemoryList items={companyItems} canEdit={isLeader} empty="Nada registrado sobre a empresa ainda." tz={company.timezone} />
        </CardContent>
      </Card>
      {isLeader ? (
        [...people.entries()]
          .sort((a, b) => a[1].name.localeCompare(b[1].name, "pt-BR"))
          .map(([id, p]) => (
            <Card key={id}>
              <CardHeader>
                <CardTitle>Sobre {p.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <MemoryList items={p.items} canEdit empty="" tz={company.timezone} />
              </CardContent>
            </Card>
          ))
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sobre você</CardTitle>
          </CardHeader>
          <CardContent>
            <MemoryList items={mine?.items ?? []} canEdit={false} empty="Nada registrado sobre você ainda." tz={company.timezone} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
