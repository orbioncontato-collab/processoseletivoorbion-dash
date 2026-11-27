import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { archiveDocument, publishVersion } from "@/modules/documents/actions";
import { NewVersionForm } from "@/modules/documents/components/forms";
import { DOC_KIND_LABELS } from "@/modules/documents/labels";
import { getDocument } from "@/modules/documents/queries";

export const metadata: Metadata = { title: "Documento" };

export default async function DocumentPage({ params, searchParams }: PageProps<"/documentos/[id]">) {
  const { company } = await requireCompany();
  const isLeader = company.role === "leader";
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const found = await getDocument(company.companyId, id);
  if (!found || found.doc.archived_at) notFound();
  const { doc, versions } = found;
  const sp = await searchParams;
  const asked = Number(typeof sp.v === "string" ? sp.v : NaN);
  const shown = versions.find((v) => v.version === asked) ?? versions.find((v) => v.version === doc.published_version) ?? versions[0];
  if (!shown) notFound();
  const published = versions.find((v) => v.version === doc.published_version);

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/documentos" className="text-sm text-primary hover:underline">
          ← Documentos
        </Link>
      </div>
      <PageHeader
        title={doc.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{DOC_KIND_LABELS[doc.kind] ?? doc.kind}</Badge>
            <span>
              Mostrando a versão {shown.version}
              {shown.version === doc.published_version ? " (publicada)" : " (rascunho)"}
            </span>
          </span>
        }
        actions={
          isLeader ? (
            <form action={archiveDocument}>
              <input type="hidden" name="documentId" value={doc.id} />
              <Button type="submit" variant="ghost" size="sm">
                Arquivar documento
              </Button>
            </form>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="grid gap-3 p-5">
            {isLeader && shown.version !== doc.published_version ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary px-3 py-2 text-sm">
                <span>
                  Rascunho{shown.author_type === "agent" ? " proposto pelo Estrategista Comercial" : ""}: {shown.change_note || "sem nota"}
                </span>
                <form action={publishVersion}>
                  <input type="hidden" name="documentId" value={doc.id} />
                  <input type="hidden" name="version" value={shown.version} />
                  <Button type="submit" size="sm">
                    Publicar versão {shown.version}
                  </Button>
                </form>
              </div>
            ) : null}
            <article className="whitespace-pre-wrap text-sm leading-relaxed" aria-label="Conteúdo do documento">
              {shown.content}
            </article>
          </CardContent>
        </Card>
        {isLeader ? (
          <Card>
            <CardHeader>
              <CardTitle>Versões</CardTitle>
              <CardDescription>A equipe vê só a publicada.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="grid gap-2" aria-label="Histórico de versões">
                {versions.map((v) => (
                  <li key={v.id} className="text-sm">
                    <Link href={`/documentos/${doc.id}?v=${v.version}`} className="font-medium text-primary hover:underline">
                      Versão {v.version}
                    </Link>
                    {v.version === doc.published_version ? <Badge variant="success" className="ml-2">Publicada</Badge> : null}
                    {v.author_type === "agent" ? <Badge variant="outline" className="ml-2">Agente</Badge> : null}
                    <span className="block text-xs text-muted-foreground">
                      {v.change_note || "Sem nota"} · {formatDateTime(v.created_at, company.timezone)}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ) : null}
      </div>
      {isLeader ? (
        <Card>
          <CardHeader>
            <CardTitle>Nova versão</CardTitle>
            <CardDescription>Começa com o texto da versão {published?.version ?? shown.version}. A anterior continua no histórico.</CardDescription>
          </CardHeader>
          <CardContent>
            <NewVersionForm documentId={doc.id} current={(published ?? shown).content} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
