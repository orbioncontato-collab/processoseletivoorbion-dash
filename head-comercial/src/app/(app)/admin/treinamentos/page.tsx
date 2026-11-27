import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrainingForm } from "@/modules/training/components/forms";
import { LibraryList } from "@/modules/training/components/views";
import { listLibrary } from "@/modules/training/queries";

export const metadata: Metadata = { title: "Biblioteca da Orbion" };

export default async function AdminTrainingsPage() {
  await requirePlatformAdmin();
  const library = await listLibrary("global");
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Biblioteca da Orbion"
        description="Treinamentos disponíveis para todas as empresas. O Head recomenda a partir das análises de conversa, pela habilidade."
      />
      <Card>
        <CardHeader>
          <CardTitle>Novo treinamento</CardTitle>
        </CardHeader>
        <CardContent>
          <TrainingForm scope="global" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Treinamentos ({library.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <LibraryList items={library} canArchive={() => true} empty="Nenhum treinamento na biblioteca ainda." />
        </CardContent>
      </Card>
    </div>
  );
}
