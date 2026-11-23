import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/session";
import { formatPhone } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getStages, getTeam, listContacts } from "@/modules/commercial/queries";
import { NewOpportunityForm } from "@/modules/commercial/components/opportunity-forms";

export const metadata: Metadata = { title: "Nova oportunidade" };

export default async function NewOpportunityPage({ searchParams }: PageProps<"/oportunidades/nova">) {
  const { user, company } = await requireCompany();
  const { contato } = await searchParams;
  const isLeader = company.role === "leader";
  const [stages, contacts, team] = await Promise.all([
    getStages(company.companyId),
    listContacts(company.companyId),
    isLeader ? getTeam(company.companyId) : Promise.resolve(null),
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/oportunidades" className="text-sm text-primary hover:underline">
          ← Oportunidades
        </Link>
      </div>
      <PageHeader title="Nova oportunidade" description="Registre a negociação e o próximo passo combinado." />
      <Card>
        <CardContent className="p-6">
          <NewOpportunityForm
            contacts={contacts.map((c) => ({
              id: c.id,
              label: c.phone_e164 ? `${c.name} · ${formatPhone(c.phone_e164)}` : c.name,
            }))}
            stages={stages}
            owners={team ? team.map((t) => ({ id: t.userId, name: t.name })) : null}
            currentUserId={user.id}
            defaultContactId={typeof contato === "string" ? contato : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
