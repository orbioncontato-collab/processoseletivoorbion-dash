import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewDocumentForm } from "@/modules/documents/components/forms";
import { DOC_KIND_LABELS } from "@/modules/documents/labels";
import { listDocuments } from "@/modules/documents/queries";

export const metadata: Metadata = { title: "Documentos" };

export default async function DocumentsPage() {
  const { company } = await requireCompany();
  const isLeader = company.role === "leader";
  const docs = await listDocuments(company.companyId);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Documentos comerciais"
        description="Playbook, roteiros, política de preço e processos da equipe. Cada mudança vira uma versão nova, e o histórico fica guardado."
      />
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length ? (
            <ul className="divide-y rounded-lg border" aria-label="Documentos comerciais">
              {docs.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div>
                    <Link href={`/documentos/${d.id}`} className="text-sm font-medium text-primary hover:underline">
                      {d.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {DOC_KIND_LABELS[d.kind] ?? d.kind} · atualizado em {formatDateTime(d.updated_at, company.timezone)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {d.published_version ? <Badge variant="success">Versão {d.published_version} publicada</Badge> : <Badge variant="warning">Rascunho</Badge>}
                    {isLeader && d.latest_version > (d.published_version ?? 0) ? (
                      <Badge variant="outline">Versão {d.latest_version} esperando revisão</Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum documento publicado ainda.</p>
          )}
        </CardContent>
      </Card>
      {isLeader ? (
        <Card>
          <CardHeader>
            <CardTitle>Novo documento</CardTitle>
            <CardDescription>O Estrategista Comercial, no chat, também pode propor versões novas; elas ficam como rascunho até você publicar.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewDocumentForm />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
