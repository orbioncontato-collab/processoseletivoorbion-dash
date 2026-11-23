import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/modules/team/schemas";

export const metadata: Metadata = { title: "Início" };

export default async function HomePage() {
  const { user, company } = await requireCompany();
  const firstName = (user.fullName || user.email).split(" ")[0];
  const isLeader = company.role === "leader";

  let teamInfo: { active: number; pending: number } | null = null;
  if (isLeader) {
    const supabase = await createClient();
    const [members, invites] = await Promise.all([
      supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.companyId)
        .eq("status", "active"),
      supabase
        .from("invitations")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.companyId)
        .eq("status", "pending"),
    ]);
    teamInfo = { active: members.count ?? 0, pending: invites.count ?? 0 };
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title={`Olá, ${firstName}`}
        description={`${company.companyName} · ${ROLE_LABELS[company.role]}`}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {teamInfo ? (
          <Card>
            <CardHeader>
              <CardTitle>Sua equipe</CardTitle>
              <CardDescription>
                {teamInfo.active} pessoa(s) ativa(s)
                {teamInfo.pending ? ` e ${teamInfo.pending} convite(s) aguardando` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/equipe">Gerenciar equipe</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>{isLeader ? "Painel do líder" : "Seu painel"}</CardTitle>
            <CardDescription>
              {isLeader
                ? "A visão consolidada do time, com alertas, divergências e prioridades, entra quando a captura de oportunidades e conversas estiver ligada."
                : "Suas prioridades do dia, oportunidades e recomendações aparecem aqui quando a captura de oportunidades e conversas estiver ligada."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
