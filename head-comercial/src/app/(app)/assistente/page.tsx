import type { Metadata } from "next";
import Link from "next/link";
import { requireCompany } from "@/lib/auth/session";
import { isAiConfigured } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { AGENT_IDS, agentOf } from "@/modules/ai/agents";
import { ChatForm } from "@/modules/ai/components/chat-form";
import { AiNotConfigured, ThreadList } from "@/modules/ai/components/views";
import { listThreads } from "@/modules/ai/queries";

export const metadata: Metadata = { title: "Agentes" };

export default async function AssistantPage({ searchParams }: PageProps<"/assistente">) {
  const { company } = await requireCompany();
  const sp = await searchParams;
  const agent = agentOf(typeof sp.agente === "string" ? sp.agente : "head");
  const [threads, configured] = await Promise.all([listThreads(company.companyId), isAiConfigured()]);
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Agentes"
        description="Escolha com quem conversar. Cada agente tem um papel e consulta só os dados que você pode ver no sistema."
      />
      <nav aria-label="Escolher agente" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {AGENT_IDS.map((id) => {
          const a = agentOf(id);
          const active = a.id === agent.id;
          return (
            <Link
              key={id}
              href={id === "head" ? "/assistente" : `/assistente?agente=${id}`}
              aria-current={active ? "page" : undefined}
              className={cn("rounded-lg border p-3 text-sm hover:bg-secondary", active && "border-primary bg-secondary")}
            >
              <span className="block font-medium">{a.name}</span>
              <span className="block text-xs text-muted-foreground">{a.role}</span>
            </Link>
          );
        })}
      </nav>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardContent className="p-2">
            <ThreadList threads={threads} tz={company.timezone} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-4 p-4">
            <p className="text-sm font-medium">Nova conversa com {agent.name}</p>
            {configured ? (
              <ChatForm
                key={agent.id}
                agent={agent.id}
                agentName={agent.name}
                suggestions={company.role === "leader" ? agent.suggestions.leader : agent.suggestions.seller}
              />
            ) : (
              <AiNotConfigured />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
