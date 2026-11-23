import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireCompany } from "@/lib/auth/session";
import { formatDateTime, formatPhone } from "@/lib/format";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTeam } from "@/modules/commercial/queries";
import { listConversations } from "@/modules/conversations/queries";

export const metadata: Metadata = { title: "Conversas" };

const TYPE_LABEL: Record<string, string> = {
  audio: "Áudio",
  image: "Imagem",
  video: "Vídeo",
  document: "Documento",
  sticker: "Figurinha",
  location: "Localização",
  other: "Mensagem",
};

export default async function ConversationsPage({ searchParams }: PageProps<"/conversas">) {
  const { company } = await requireCompany();
  const isLeader = company.role === "leader";
  const sp = await searchParams;
  const awaiting = sp.aguardando === "1";
  const [rows, team] = await Promise.all([
    listConversations(company.companyId, { awaiting }),
    isLeader ? getTeam(company.companyId) : Promise.resolve([]),
  ]);
  const ownerName = new Map(team.map((t) => [t.userId, t.name]));

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Conversas"
        description="Movimentação capturada do WhatsApp e de outros canais conectados."
        actions={
          <Button asChild variant={awaiting ? "default" : "outline"} size="sm">
            <Link href={awaiting ? "/conversas" : "/conversas?aguardando=1"}>
              {awaiting ? "Ver todas" : "Só quem espera resposta"}
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="grid justify-items-center gap-2 p-10 text-center">
              <MessageCircle className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {awaiting
                  ? "Ninguém esperando resposta agora."
                  : "Nenhuma conversa capturada ainda. Elas aparecem aqui quando o WhatsApp estiver conectado."}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((c) => (
                <li key={c.id}>
                  <Link href={`/conversas/${c.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {c.contactName}
                        {c.awaiting_reply ? <Badge variant="warning">Esperando resposta</Badge> : null}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.last ? (c.last.direction === "outbound" ? "Você: " : "") : ""}
                        {c.last ? c.last.body || TYPE_LABEL[c.last.message_type] || "Mensagem" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPhone(c.contactPhone)}
                        {isLeader ? ` · ${ownerName.get(c.owner_id) ?? "Ex-membro"}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(c.last_message_at, company.timezone)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
