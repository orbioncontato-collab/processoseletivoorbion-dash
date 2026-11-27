import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/modules/alerts/components/settings-form";
import { formatUsd } from "@/modules/ai/pricing";
import { SummarySettingsForm } from "@/modules/ai/components/summary-settings-form";
import { monthStart, PURPOSE_LABELS, usageSince } from "@/modules/ai/usage";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { company } = await requireLeader();
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_settings")
    .select("stale_days, awaiting_reply_hours, report_grace_hours, daily_target_conversations, daily_target_messages, daily_summary_enabled, daily_summary_hour")
    .eq("company_id", company.companyId)
    .maybeSingle();
  const [usage] = await usageSince(monthStart(company.timezone), company.companyId);
  return (
    <div className="grid gap-6">
      <PageHeader title="Configurações" description={company.companyName} />
      <Card>
        <CardHeader>
          <CardTitle>Referências dos alertas</CardTitle>
          <CardDescription>
            Definem quando o Head chama atenção: negociação parada, cliente esperando, relatório atrasado e produção do
            dia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            values={
              data ?? {
                stale_days: 7,
                awaiting_reply_hours: 2,
                report_grace_hours: 2,
                daily_target_conversations: null,
                daily_target_messages: null,
              }
            }
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Resumo do dia</CardTitle>
          <CardDescription>
            Todo dia, no horário escolhido, o Head escreve para os líderes como foi ontem, o que pede atenção hoje e até três
            ações. O resumo chega como uma conversa no chat, para continuar perguntando a partir dele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SummarySettingsForm enabled={data?.daily_summary_enabled ?? false} hour={data?.daily_summary_hour ?? 8} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Uso da IA neste mês</CardTitle>
          <CardDescription>Custo estimado das conversas com o Head e das análises, pelo preço de tabela, em dólar.</CardDescription>
        </CardHeader>
        <CardContent>
          {usage ? (
            <div className="grid gap-1 text-sm">
              <p className="text-lg font-semibold">{formatUsd(usage.costMicros)}</p>
              <p className="text-muted-foreground">
                {usage.runs} chamada(s):{" "}
                {Object.entries(usage.byPurpose)
                  .map(([p, v]) => `${PURPOSE_LABELS[p] ?? p} ${v.runs}`)
                  .join(", ")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum uso da IA neste mês.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
