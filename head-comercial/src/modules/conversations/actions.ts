"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/action-state";
import { friendlyDbError } from "@/modules/commercial/db-errors";

const linkSchema = z.object({
  id: z.uuid(),
  opportunityId: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
});

/** Liga (ou desliga) a conversa a uma oportunidade do mesmo contato. */
export async function linkConversation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { company } = await requireCompany();
  const parsed = linkSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Dados inválidos." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ opportunity_id: parsed.data.opportunityId })
    .eq("id", parsed.data.id)
    .eq("company_id", company.companyId)
    .select("id");
  if (error) return { ok: false, message: friendlyDbError(error) };
  if (!data?.length) return { ok: false, message: "Conversa não encontrada ou sem permissão." };
  refresh();
  return { ok: true, message: parsed.data.opportunityId ? "Conversa ligada à oportunidade." : "Vínculo removido." };
}
