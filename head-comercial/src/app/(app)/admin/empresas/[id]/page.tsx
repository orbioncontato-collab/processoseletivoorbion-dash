import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TeamManager } from "@/modules/team/components/team-manager";

export const metadata: Metadata = { title: "Empresa" };

export default async function CompanyAdminPage({ params }: PageProps<"/admin/empresas/[id]">) {
  const admin = await requirePlatformAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, timezone, status")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

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
    </div>
  );
}
