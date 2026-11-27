import type { Metadata } from "next";
import { requireCompany } from "@/lib/auth/session";
import { isAiConfigured } from "@/lib/ai/client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChatForm } from "@/modules/ai/components/chat-form";
import { AiNotConfigured, ThreadList } from "@/modules/ai/components/views";
import { listThreads } from "@/modules/ai/queries";

export const metadata: Metadata = { title: "Head Comercial" };

const SELLER_SUGGESTIONS = [
  "O que eu devo fazer primeiro hoje?",
  "Quais negociações estão paradas?",
  "Como responder quando o cliente diz que está caro?",
];
const LEADER_SUGGESTIONS = [
  "Como está o time hoje?",
  "Quem precisa de ajuda esta semana?",
  "Quais negociações grandes estão em risco?",
];

export default async function AssistantPage() {
  const { company } = await requireCompany();
  const threads = await listThreads(company.companyId);
  const configured = isAiConfigured();
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Head Comercial"
        description="Pergunte sobre suas negociações, seu dia e como vender melhor. O Head consulta os dados que você pode ver no sistema."
      />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardContent className="p-2">
            <ThreadList threads={threads} tz={company.timezone} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4 p-4">
            {configured ? (
              <ChatForm suggestions={company.role === "leader" ? LEADER_SUGGESTIONS : SELLER_SUGGESTIONS} />
            ) : (
              <AiNotConfigured />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
