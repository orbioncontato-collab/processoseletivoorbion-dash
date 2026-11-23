import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WhatsappPanel } from "@/modules/integrations/components/whatsapp";
import { SOURCE_STATUS } from "@/modules/integrations/labels";

export const metadata: Metadata = { title: "Meu WhatsApp" };

export default async function MyWhatsappPage() {
  const { user, company } = await requireCompany();
  // O vendedor não lê a tabela de fontes (só o líder); aqui buscamos só a conexão dele.
  const db = createServiceClient({ type: "user", id: user.id });
  const { data: source } = await db
    .from("integration_sources")
    .select("id, name, status, last_event_at, last_error")
    .eq("company_id", company.companyId)
    .eq("kind", "whatsapp_device")
    .eq("owner_user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();

  return (
    <div className="grid gap-6">
      <PageHeader title="Meu WhatsApp" description="Conecte seu WhatsApp para que suas conversas comerciais entrem no Head." />
      {!source ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Seu líder ainda não criou a conexão do seu WhatsApp. Peça para ele ativar em Integrações.
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {source.name}
              <Badge variant={(SOURCE_STATUS[source.status] ?? SOURCE_STATUS.active).variant}>
                {(SOURCE_STATUS[source.status] ?? SOURCE_STATUS.active).label}
              </Badge>
            </CardTitle>
            <CardDescription>
              {source.last_event_at
                ? `Última mensagem capturada: ${formatDateTime(source.last_event_at, company.timezone)}`
                : "Nenhuma mensagem capturada ainda."}
              {" "}Grupos não são capturados e o Head nunca envia mensagens pelo seu número.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WhatsappPanel sourceId={source.id} status={source.status} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
