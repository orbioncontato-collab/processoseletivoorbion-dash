import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ActivityRow, EntityInfo, FormatContext } from "./format";

/** Busca os nomes de pessoas, etapas e registros citados no histórico. */
export async function buildFormatContext(companyId: string, rows: ActivityRow[]): Promise<FormatContext> {
  const supabase = await createClient();
  const idsOf = (type: string) => rows.filter((r) => r.entity_type === type && r.entity_id).map((r) => r.entity_id!);
  const membershipIds = idsOf("memberships");
  const invitationIds = idsOf("invitations");

  const [memberships, invitations, stages] = await Promise.all([
    membershipIds.length
      ? supabase.from("memberships").select("id, user_id").in("id", membershipIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string }[] }),
    invitationIds.length
      ? supabase.from("invitations").select("id, email").in("id", invitationIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    supabase.from("pipeline_stages").select("id, name").eq("company_id", companyId),
  ]);

  const entities: Record<string, EntityInfo> = {};
  for (const m of memberships.data ?? []) entities[m.id] = { userId: m.user_id };
  for (const i of invitations.data ?? []) entities[i.id] = { email: i.email };

  const userIds = new Set<string>();
  const addId = (v: unknown) => {
    if (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)) userIds.add(v);
  };
  for (const r of rows) {
    addId(r.actor_id);
    const ch = (r.changes ?? {}) as Record<string, unknown>;
    addId(ch.user_id);
    const owner = ch.owner_id as { de?: unknown; para?: unknown } | undefined;
    if (owner && typeof owner === "object") {
      addId(owner.de);
      addId(owner.para);
    }
  }
  for (const m of memberships.data ?? []) userIds.add(m.user_id);

  const { data: profiles } = userIds.size
    ? await supabase.from("profiles").select("id, full_name, email").in("id", [...userIds])
    : { data: [] };
  const names: Record<string, string> = {};
  for (const p of profiles ?? []) names[p.id] = p.full_name || p.email;

  const stageNames: Record<string, string> = {};
  for (const s of stages.data ?? []) stageNames[s.id] = s.name;

  return { names, entities, stages: stageNames };
}
