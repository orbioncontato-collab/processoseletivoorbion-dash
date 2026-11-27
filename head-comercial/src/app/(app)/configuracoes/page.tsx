import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/modules/alerts/components/settings-form";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { company } = await requireLeader();
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_settings")
    .select("stale_days, awaiting_reply_hours, report_grace_hours, daily_target_conversations, daily_target_messages")
    .eq("company_id", company.companyId)
    .maybeSingle();
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
    </div>
  );
}
