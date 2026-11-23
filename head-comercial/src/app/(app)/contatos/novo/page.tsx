import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getTeam } from "@/modules/commercial/queries";
import { ContactForm } from "@/modules/commercial/components/contact-forms";

export const metadata: Metadata = { title: "Novo contato" };

export default async function NewContactPage() {
  const { user, company } = await requireCompany();
  const team = company.role === "leader" ? await getTeam(company.companyId) : null;
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/contatos" className="text-sm text-primary hover:underline">
          ← Contatos
        </Link>
      </div>
      <PageHeader title="Novo contato" />
      <Card>
        <CardContent className="p-6">
          <ContactForm
            owners={team ? team.map((t) => ({ id: t.userId, name: t.name })) : null}
            values={{ ownerId: user.id }}
            submitLabel="Criar contato"
          />
        </CardContent>
      </Card>
    </div>
  );
}
