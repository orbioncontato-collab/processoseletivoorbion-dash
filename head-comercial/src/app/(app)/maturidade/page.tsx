import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecalculateButton } from "@/modules/maturity/components";
import { maturityLevel, type Dimension } from "@/modules/maturity/score";

export const metadata: Metadata = { title: "Maturidade comercial" };

const MONTH = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function MaturityPage() {
  const { company } = await requireLeader();
  const supabase = await createClient();
  const { data } = await supabase
    .from("maturity_assessments")
    .select("period, overall, dimensions, computed_at")
    .eq("company_id", company.companyId)
    .order("period", { ascending: false })
    .limit(12);
  const history = data ?? [];
  const current = history[0];
  const previous = history[1];
  const dims = (current?.dimensions ?? []) as unknown as Dimension[];
  const prevDims = new Map(((previous?.dimensions ?? []) as unknown as Dimension[]).map((d) => [d.key, d.score]));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Maturidade comercial"
        description="Uma nota de 0 a 100 para cada parte da operação, calculada com os dados reais. Serve para ver onde a operação está forte e o que trabalhar primeiro."
        actions={<RecalculateButton />}
      />
      {current ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {current.overall}/100 · {maturityLevel(current.overall)}
              </CardTitle>
              <CardDescription>
                {MONTH.format(new Date(current.period))}, calculada em {formatDateTime(current.computed_at, company.timezone)}
                {previous ? ` · mês anterior: ${previous.overall}/100` : ""}
              </CardDescription>
            </CardHeader>
          </Card>
          <ul className="grid gap-3 md:grid-cols-2" aria-label="Dimensões da maturidade">
            {dims.map((d) => {
              const before = prevDims.get(d.key);
              return (
                <li key={d.key} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{d.label}</span>
                    {d.score === null ? <Badge variant="outline">Não medida</Badge> : <Badge variant={d.score >= 60 ? "success" : d.score >= 40 ? "warning" : "destructive"}>{d.score}/100</Badge>}
                  </div>
                  <p className="mt-2 text-sm">{d.detail}</p>
                  {d.score !== null && typeof before === "number" ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Mês anterior: {before}/100 ({d.score - before >= 0 ? "+" : ""}
                      {d.score - before})
                    </p>
                  ) : null}
                  {d.score === null || d.score < 60 ? <p className="mt-2 text-xs text-muted-foreground">Como melhorar: {d.tip}</p> : null}
                </li>
              );
            })}
          </ul>
          {history.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-1 text-sm" aria-label="Histórico da maturidade">
                  {history.map((h) => (
                    <li key={h.period}>
                      {MONTH.format(new Date(h.period))}: {h.overall}/100 ({maturityLevel(h.overall)})
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">Ainda não calculada. Use o botão Calcular agora.</CardContent>
        </Card>
      )}
    </div>
  );
}
