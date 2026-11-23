import type { Metadata } from "next";
import { ArrowDown, ArrowUp } from "lucide-react";
import { requireLeader } from "@/lib/auth/session";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOpenSummary, getStages } from "@/modules/commercial/queries";
import { STAGE_KIND_LABELS } from "@/modules/commercial/schemas";
import { reorderStage } from "@/modules/commercial/actions";
import { AddStageForm, ArchiveStageForm, RenameStageForm } from "@/modules/commercial/components/stage-forms";

export const metadata: Metadata = { title: "Funil" };

export default async function PipelinePage() {
  const { company } = await requireLeader();
  const stages = await getStages(company.companyId);
  const summary = await getOpenSummary(company.companyId, stages);
  const countOf = new Map(summary.map((s) => [s.stageId, s.count]));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Funil de vendas"
        description="As etapas que as oportunidades percorrem. Etapas de ganho e perda encerram a negociação."
      />
      <Card>
        <CardHeader>
          <CardTitle>Etapas</CardTitle>
          <CardDescription>
            Renomeie, reordene ou arquive. Uma etapa só pode ser arquivada quando não tem oportunidades em aberto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-2">
            {stages.map((s, i) => {
              const prev = stages[i - 1];
              const next = stages[i + 1];
              const canUp = prev && (prev.kind === "open") === (s.kind === "open");
              const canDown = next && (next.kind === "open") === (s.kind === "open");
              return (
                <li key={s.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-1">
                    <form action={reorderStage}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="direction" value="up" />
                      <Button type="submit" variant="ghost" size="icon" disabled={!canUp} aria-label={`Subir ${s.name}`}>
                        <ArrowUp />
                      </Button>
                    </form>
                    <form action={reorderStage}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="direction" value="down" />
                      <Button type="submit" variant="ghost" size="icon" disabled={!canDown} aria-label={`Descer ${s.name}`}>
                        <ArrowDown />
                      </Button>
                    </form>
                  </div>
                  <RenameStageForm id={s.id} name={s.name} />
                  <div className="flex items-center gap-2">
                    <Badge variant={s.kind === "won" ? "success" : s.kind === "lost" ? "destructive" : "outline"}>
                      {STAGE_KIND_LABELS[s.kind]}
                    </Badge>
                    {s.kind === "open" ? (
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{countOf.get(s.id) ?? 0} aberta(s)</span>
                    ) : null}
                    <ArchiveStageForm id={s.id} name={s.name} />
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Nova etapa</CardTitle>
          <CardDescription>Etapas em andamento entram antes das etapas de encerramento.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddStageForm />
        </CardContent>
      </Card>
    </div>
  );
}
