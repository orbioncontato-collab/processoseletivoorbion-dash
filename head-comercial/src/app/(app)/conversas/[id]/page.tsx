import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { formatDateTime, formatPhone } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getConversation } from "@/modules/conversations/queries";
import { LinkOpportunityForm } from "@/modules/conversations/components/link-form";

export const metadata: Metadata = { title: "Conversa" };

const TYPE_LABEL: Record<string, string> = {
  audio: "[Áudio]",
  image: "[Imagem]",
  video: "[Vídeo]",
  document: "[Documento]",
  sticker: "[Figurinha]",
  location: "[Localização]",
  other: "[Mensagem]",
};

export default async function ConversationPage({ params }: PageProps<"/conversas/[id]">) {
  const { company } = await requireCompany();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await getConversation(company.companyId, id);
  if (!data) notFound();
  const { conversation, contact, messages, opportunities } = data;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/conversas" className="text-sm text-primary hover:underline">
          ← Conversas
        </Link>
      </div>
      <PageHeader
        title={contact?.name ?? "Conversa"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatPhone(contact?.phone_e164)}
            <span>
              · {conversation.inbound_count} recebida(s), {conversation.outbound_count} enviada(s)
            </span>
            {conversation.awaiting_reply ? <Badge variant="warning">Esperando resposta</Badge> : null}
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="grid max-h-[70vh] gap-2 overflow-y-auto p-4">
            {messages.length === 0 ? <p className="text-sm text-muted-foreground">Sem mensagens.</p> : null}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                  m.direction === "outbound" ? "justify-self-end bg-accent" : "justify-self-start bg-secondary",
                )}
              >
                <p className="whitespace-pre-wrap break-words">
                  {m.body || TYPE_LABEL[m.message_type] || "[Mensagem]"}
                </p>
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {formatDateTime(m.sent_at, company.timezone)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Negociação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {opportunities.length ? (
                <LinkOpportunityForm
                  conversationId={conversation.id}
                  current={conversation.opportunity_id}
                  options={opportunities.map((o) => ({ id: o.id, title: o.title }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Este contato ainda não tem oportunidade.</p>
              )}
              {contact ? (
                <Link
                  href={`/oportunidades/nova?contato=${contact.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Criar oportunidade com este contato
                </Link>
              ) : null}
              {contact ? (
                <Link href={`/contatos/${contact.id}`} className="text-sm text-primary hover:underline">
                  Abrir ficha do contato
                </Link>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
