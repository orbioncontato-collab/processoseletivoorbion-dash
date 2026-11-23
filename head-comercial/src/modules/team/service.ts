import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

type ServiceClient = ReturnType<typeof createServiceClient>;

interface PendingInvite {
  id: string;
  company_id: string;
  role: "leader" | "seller";
  email: string;
  user_id: string | null;
}

/** Escapa curingas do ILIKE para comparar e-mail de forma exata, sem diferenciar maiúsculas. */
export function exactIlike(value: string): string {
  return value.toLowerCase().replace(/[%_\\]/g, "\\$&");
}

/** Cria (ou reativa) o vínculo e marca o convite como aceito. */
export async function acceptInvitationRecord(db: ServiceClient, inv: PendingInvite, userId: string) {
  const { error: upsertError } = await db
    .from("memberships")
    .upsert(
      { company_id: inv.company_id, user_id: userId, role: inv.role, status: "active" },
      { onConflict: "company_id,user_id" },
    );
  if (upsertError) throw new Error(`Falha ao criar vínculo: ${upsertError.message}`);

  const { error: updateError } = await db
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString(), user_id: userId })
    .eq("id", inv.id)
    .eq("status", "pending");
  if (updateError) throw new Error(`Falha ao concluir convite: ${updateError.message}`);
}

/**
 * Transforma convites pendentes do usuário em vínculos ativos.
 * Roda quando a pessoa define a senha e também a cada login, para cobrir
 * quem já tinha conta e foi convidado para outra empresa.
 */
export async function acceptPendingInvitations(userId: string, email: string): Promise<number> {
  const db = createServiceClient({ type: "user", id: userId });

  // Duas consultas separadas, sem montar filtro com texto do usuário.
  const columns = "id, company_id, role, email, user_id";
  const [byId, byEmail] = await Promise.all([
    db.from("invitations").select(columns).eq("status", "pending").eq("user_id", userId),
    email
      ? db
          .from("invitations")
          .select(columns)
          .eq("status", "pending")
          .is("user_id", null)
          .ilike("email", exactIlike(email))
      : Promise.resolve({ data: [] as PendingInvite[], error: null }),
  ]);
  if (byId.error || byEmail.error) {
    throw new Error(`Falha ao ler convites: ${byId.error?.message ?? byEmail.error?.message}`);
  }

  const invites: PendingInvite[] = [...(byId.data ?? []), ...(byEmail.data ?? [])];
  for (const inv of invites) {
    await acceptInvitationRecord(db, inv, userId);
  }
  return invites.length;
}
