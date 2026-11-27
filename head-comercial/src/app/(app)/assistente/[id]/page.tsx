import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { isAiConfigured } from "@/lib/ai/client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChatForm } from "@/modules/ai/components/chat-form";
import { AiNotConfigured, ArchiveThreadButton, MessageList, ThreadList } from "@/modules/ai/components/views";
import { getThread, listThreads } from "@/modules/ai/queries";

export const metadata: Metadata = { title: "Head Comercial" };

export default async function ThreadPage({ params }: PageProps<"/assistente/[id]">) {
  const { company } = await requireCompany();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [found, threads] = await Promise.all([getThread(company.companyId, id), listThreads(company.companyId)]);
  if (!found) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader title={found.thread.title} description="Conversa com o Head Comercial" actions={<ArchiveThreadButton id={id} />} />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Card>
          <CardContent className="p-2">
            <ThreadList threads={threads} current={id} tz={company.timezone} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="grid gap-6 p-4">
            <MessageList messages={found.messages} tz={company.timezone} />
            {(await isAiConfigured()) ? <ChatForm threadId={id} /> : <AiNotConfigured />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
