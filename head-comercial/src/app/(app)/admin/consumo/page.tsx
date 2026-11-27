import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isAiConfigured } from "@/lib/ai/client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AiNotConfigured } from "@/modules/ai/components/views";
import { formatUsd } from "@/modules/ai/pricing";
import { monthStart, PURPOSE_LABELS, usageSince } from "@/modules/ai/usage";

export const metadata: Metadata = { title: "Consumo da IA" };

const n = (v: number) => v.toLocaleString("pt-BR");

export default async function AiUsagePage() {
  await requirePlatformAdmin();
  const since = monthStart("America/Sao_Paulo");
  const supabase = await createClient();
  const [usage, companies] = await Promise.all([
    usageSince(since),
    supabase.from("companies").select("id, name"),
  ]);
  const name = new Map((companies.data ?? []).map((c) => [c.id, c.name]));
  const total = usage.reduce((acc, u) => acc + u.costMicros, 0);
  return (
    <div className="grid gap-6">
      <PageHeader title="Consumo da IA" description="Chamadas, tokens e custo estimado por empresa neste mês (preço de tabela da Anthropic, em dólar)." />
      {!isAiConfigured() ? <AiNotConfigured /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Total do mês: {formatUsd(total)}</CardTitle>
          <CardDescription>Inclui chat, análises e resumos. A leitura do cache custa bem menos que a entrada normal.</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.length ? (
            <Table aria-label="Consumo por empresa">
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead className="text-right">Chamadas</TableHead>
                  <TableHead className="text-right">Tokens de entrada</TableHead>
                  <TableHead className="text-right">Lidos do cache</TableHead>
                  <TableHead className="text-right">Tokens de saída</TableHead>
                  <TableHead>Por uso</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usage.map((u) => (
                  <TableRow key={u.companyId ?? "sem-empresa"}>
                    <TableCell className="font-medium">{u.companyId ? (name.get(u.companyId) ?? "Empresa removida") : "Sem empresa"}</TableCell>
                    <TableCell className="text-right">
                      {n(u.runs)}
                      {u.errors ? <span className="block text-xs text-destructive">{u.errors} com falha</span> : null}
                    </TableCell>
                    <TableCell className="text-right">{n(u.inputTokens)}</TableCell>
                    <TableCell className="text-right">{n(u.cacheReadTokens)}</TableCell>
                    <TableCell className="text-right">{n(u.outputTokens)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {Object.entries(u.byPurpose)
                        .map(([p, v]) => `${PURPOSE_LABELS[p] ?? p}: ${v.runs} (${formatUsd(v.costMicros)})`)
                        .join(" · ")}
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatUsd(u.costMicros)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma chamada à IA neste mês.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
