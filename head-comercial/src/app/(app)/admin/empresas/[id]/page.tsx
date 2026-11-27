import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TeamManager } from "@/modules/team/components/team-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AiLimitForm } from "@/modules/companies/components/ai-limit-form";
import { aiBudget } from "@/modules/ai/budget";
import { formatUsd } from "@/modules/ai/pricing";

export const metadata: Metadata = { title: "Empresa" };

export default async function CompanyAdminPage({ params }: PageProps<"/admin/empresas/[id]">) {
  const admin = await requirePlatformAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, timezone, status, ai_monthly_limit_micros")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();
  const budget = await aiBudget(company.id);

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/empresas" className="text-sm text-primary hover:underline">
          ← Empresas
        </Link>
      </div>
      <PageHeader
        title={company.name}
        description={`${company.slug} · ${company.timezone.replace("America/", "").replace("_", " ")}`}
        actions={
          <Link href={`/admin/empresas/${company.id}/relatorio`} className="text-sm text-primary hover:underline">
            Configurar relatório diário →
          </Link>
        }
      />
      <TeamManager companyId={company.id} currentUserId={admin.id} />
      <Card>
        <CardHeader>
          <CardTitle>Uso da IA</CardTitle>
          <CardDescription>
            {budget.limitMicros === null
              ? "Sem limite mensal."
              : `Usado neste mês: ${formatUsd(budget.usedMicros)} de ${formatUsd(budget.limitMicros)}${budget.exceeded ? " (limite atingido)" : ""}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AiLimitForm companyId={company.id} limitUsd={company.ai_monthly_limit_micros == null ? null : Number(company.ai_monthly_limit_micros) / 1_000_000} />
        </CardContent>
      </Card>
    </div>
  );
}
