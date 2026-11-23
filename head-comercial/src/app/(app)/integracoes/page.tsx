import type { Metadata } from "next";
import Link from "next/link";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateSourceForm, ImportCsvForm, PROVIDER_LABELS } from "@/modules/integrations/components/forms";
import { KIND_LABELS, SOURCE_STATUS } from "@/modules/integrations/labels";

export const metadata: Metadata = { title: "Integrações" };

export default async function IntegrationsPage() {
  const { company } = await requireLeader();
  const supabase = await createClient();
  const [sources, failedRes] = await Promise.all([
    supabase
      .from("integration_sources")
      .select("id, name, kind, provider, status, last_event_at, last_error")
      .eq("company_id", company.companyId)
      .is("archived_at", null)
      .order("created_at"),
    supabase.from("raw_events").select("source_id").eq("company_id", company.companyId).eq("status", "failed").limit(5000),
  ]);
  if (sources.error) throw new Error("Não foi possível carregar as integrações.");
  const failedBySource = new Map<string, number>();
  for (const e of failedRes.data ?? []) failedBySource.set(e.source_id, (failedBySource.get(e.source_id) ?? 0) + 1);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Integrações"
        description="Fontes de dados que alimentam o Head: CRM, automações e planilhas. Tudo que chega fica registrado."
      />
      <Card>
        <CardHeader>
          <CardTitle>Conexões</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sources.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conexão</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Último dado</TableHead>
                  <TableHead>Falhas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources.data.map((s) => {
                  const st = SOURCE_STATUS[s.status] ?? SOURCE_STATUS.active;
                  const failed = failedBySource.get(s.id) ?? 0;
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/integracoes/${s.id}`} className="font-medium text-primary hover:underline">
                          {s.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {KIND_LABELS[s.kind]} · {PROVIDER_LABELS[s.provider] ?? s.provider}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {s.last_event_at ? formatDateTime(s.last_event_at, company.timezone) : "Nunca"}
                      </TableCell>
                      <TableCell>
                        {failed ? <Badge variant="destructive">{failed}</Badge> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma conexão ainda. Crie a primeira abaixo.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Nova conexão</CardTitle>
            <CardDescription>
              Qualquer CRM ou automação pode enviar contatos e oportunidades para o Head pelo formato padrão.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateSourceForm baseUrl={publicEnv().NEXT_PUBLIC_SITE_URL} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Importar planilha</CardTitle>
            <CardDescription>
              Traga contatos e oportunidades de uma planilha. Reimportar a mesma planilha atualiza os registros em vez de
              duplicar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportCsvForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
