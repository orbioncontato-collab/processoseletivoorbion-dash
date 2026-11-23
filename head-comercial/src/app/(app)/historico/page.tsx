import type { Metadata } from "next";
import { requireLeader } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  actorLabel,
  describeActivity,
  type ActivityRow,
  type EntityInfo,
} from "@/modules/activities/format";

export const metadata: Metadata = { title: "Histórico" };

const dateFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const ACTOR_BADGE: Record<ActivityRow["actor_type"], string> = {
  user: "Pessoa",
  integration: "Integração",
  automation: "Automação",
  agent: "IA",
  system: "Sistema",
};

export default async function HistoryPage() {
  const { company } = await requireLeader();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("activities")
    .select("id, actor_type, actor_id, action, entity_type, entity_id, changes, occurred_at")
    .eq("company_id", company.companyId)
    .order("occurred_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Não foi possível carregar o histórico.");
  const rows = (data ?? []) as ActivityRow[];

  // Contexto para as frases: nomes das pessoas e dados atuais dos registros citados.
  const membershipIds = rows.filter((r) => r.entity_type === "memberships").map((r) => r.entity_id!);
  const invitationIds = rows.filter((r) => r.entity_type === "invitations").map((r) => r.entity_id!);
  const [memberships, invitations] = await Promise.all([
    membershipIds.length
      ? supabase.from("memberships").select("id, user_id").in("id", membershipIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
    invitationIds.length
      ? supabase.from("invitations").select("id, email").in("id", invitationIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
  ]);

  const entities: Record<string, EntityInfo> = {};
  for (const m of memberships.data ?? []) entities[m.id] = { userId: m.user_id };
  for (const i of invitations.data ?? []) entities[i.id] = { email: i.email };

  const userIds = new Set<string>();
  for (const r of rows) {
    if (r.actor_id) userIds.add(r.actor_id);
    const uid = (r.changes as Record<string, unknown> | null)?.user_id;
    if (typeof uid === "string") userIds.add(uid);
  }
  for (const m of memberships.data ?? []) userIds.add(m.user_id);
  const { data: profiles } = userIds.size
    ? await supabase.from("profiles").select("id, full_name, email").in("id", [...userIds])
    : { data: [] };
  const names: Record<string, string> = {};
  for (const p of profiles ?? []) names[p.id] = p.full_name || p.email;

  const ctx = { names, entities };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Histórico"
        description="Tudo que mudou na empresa, com quem fez e quando. Os registros não podem ser alterados."
      />
      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          ) : (
            <ol className="divide-y">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm">{describeActivity(r, ctx)}</p>
                    <p className="text-xs text-muted-foreground">
                      por {actorLabel(r, ctx)} · {dateFmt.format(new Date(r.occurred_at))}
                    </p>
                  </div>
                  <Badge variant="outline" className="self-start sm:self-auto">
                    {ACTOR_BADGE[r.actor_type]}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
