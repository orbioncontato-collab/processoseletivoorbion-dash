import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalibrationForm, DocumentForm } from "@/modules/knowledge/components/forms";
import { CalibrationList, DocumentList, SearchBox, SearchResults } from "@/modules/knowledge/components/views";
import { listCalibrationCases, listDocuments, searchKnowledge } from "@/modules/knowledge/queries";

export const metadata: Metadata = { title: "Cérebro central" };

export default async function BrainPage({ searchParams }: PageProps<"/admin/cerebro">) {
  await requirePlatformAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 300) : "";
  const [docs, hits, cases] = await Promise.all([
    listDocuments("global"),
    searchKnowledge(null, q, true),
    listCalibrationCases("global"),
  ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Cérebro central"
        description="Metodologia Orbion usada pelos agentes em todas as empresas. Clientes não veem este acervo."
      />
      <Card>
        <CardHeader>
          <CardTitle>Testar a busca</CardTitle>
          <CardDescription>Veja o que os agentes encontrariam para uma pergunta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SearchBox q={q} placeholder="Ex.: como tratar objeção de preço" />
          <SearchResults q={q} hits={hits} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Novo documento</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentForm scope="global" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Documentos ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList docs={docs} canEdit />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Base de calibragem</CardTitle>
          <CardDescription>
            Conversas reais com a avaliação que um bom analista faria. Servem para testar e ajustar os agentes; ficam
            separadas do conhecimento que eles consultam.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <CalibrationForm scope="global" />
          <CalibrationList cases={cases} />
        </CardContent>
      </Card>
    </div>
  );
}
