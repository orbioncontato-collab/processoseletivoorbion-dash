import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateCompanyForm } from "./create-company-form";

export const metadata: Metadata = { title: "Empresas" };

export default async function CompaniesPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();
  const [companiesRes, membersRes] = await Promise.all([
    supabase.from("companies").select("id, name, slug, status, max_users, created_at").order("name"),
    supabase.from("memberships").select("company_id").eq("status", "active"),
  ]);
  if (companiesRes.error || membersRes.error) throw new Error("Não foi possível carregar as empresas.");

  const countByCompany = new Map<string, number>();
  for (const m of membersRes.data ?? []) {
    countByCompany.set(m.company_id, (countByCompany.get(m.company_id) ?? 0) + 1);
  }
  const companies = companiesRes.data ?? [];

  return (
    <div className="grid gap-6">
      <PageHeader title="Empresas" description="Administração da plataforma." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Empresas cadastradas</CardTitle>
            <CardDescription>{companies.length} empresa(s).</CardDescription>
          </CardHeader>
          <CardContent>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma empresa ainda. Crie a primeira ao lado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link href={`/admin/empresas/${c.id}`} className="font-medium text-primary hover:underline">
                          {c.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">{c.slug}</div>
                      </TableCell>
                      <TableCell>
                        {countByCompany.get(c.id) ?? 0} / {c.max_users}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.status === "active" ? "success" : "warning"}>
                          {c.status === "active" ? "Ativa" : "Suspensa"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nova empresa</CardTitle>
            <CardDescription>Depois de criar, convide o líder da empresa.</CardDescription>
          </CardHeader>
          <CardContent>
            <CreateCompanyForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
