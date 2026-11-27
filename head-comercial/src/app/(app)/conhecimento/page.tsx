import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalibrationForm, DocumentForm } from "@/modules/knowledge/components/forms";
import { CalibrationList, DocumentList, SearchBox, SearchResults } from "@/modules/knowledge/components/views";
import { listCalibrationCases, listDocuments, searchKnowledge } from "@/modules/knowledge/queries";

export const metadata: Metadata = { title: "Conhecimento" };

export default async function KnowledgePage({ searchParams }: PageProps<"/conhecimento">) {
  const { company } = await requireCompany();
  const isLeader = company.role === "leader";
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 300) : "";
  const [docs, hits, cases] = await Promise.all([
    listDocuments("company", company.companyId),
    searchKnowledge(company.companyId, q, false),
    isLeader ? listCalibrationCases("company", company.companyId) : Promise.resolve([]),
  ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Conhecimento"
        description="Playbooks, scripts, produtos e processos da empresa. Os agentes usam este material junto com a metodologia Orbion."
      />
      <Card>
        <CardHeader>
          <CardTitle>Buscar</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <SearchBox q={q} placeholder="Ex.: prazo da proposta" />
          <SearchResults q={q} hits={hits} />
        </CardContent>
      </Card>
      {isLeader ? (
        <Card>
          <CardHeader>
            <CardTitle>Novo documento</CardTitle>
          </CardHeader>
          <CardContent>
            <DocumentForm scope="company" />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Documentos da empresa ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <DocumentList docs={docs} canEdit={isLeader} tz={company.timezone} />
        </CardContent>
      </Card>
      {isLeader ? (
        <Card>
          <CardHeader>
            <CardTitle>Casos de calibragem da empresa</CardTitle>
            <CardDescription>
              Conversas do seu time com a avaliação esperada. Ajudam a afinar os agentes ao jeito de vender da empresa.
              Só líderes veem.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <CalibrationForm scope="company" />
            <CalibrationList cases={cases} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
