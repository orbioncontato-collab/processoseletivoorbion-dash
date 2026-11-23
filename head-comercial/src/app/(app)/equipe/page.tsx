import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { TeamManager } from "@/modules/team/components/team-manager";

export const metadata: Metadata = { title: "Equipe" };

export default async function TeamPage() {
  const { user, company } = await requireLeader();
  return (
    <div className="grid gap-6">
      <PageHeader title="Equipe" description={`Pessoas com acesso a ${company.companyName}.`} />
      <TeamManager companyId={company.companyId} currentUserId={user.id} />
    </div>
  );
}
