"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";

export async function setAlertStatus(formData: FormData): Promise<void> {
  const { company } = await requireCompany();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "open" ? "open" : "dismissed";
  if (!z.uuid().safeParse(id).success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("alerts").update({ status }).eq("id", id).eq("company_id", company.companyId);
  if (error) console.error("[setAlertStatus]", error.message);
  refresh();
}

const optionalInt = (min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v.trim() === "" ? null : Number(v)))
    .pipe(z.number().int("Use um número inteiro.").min(min).max(max).nullable());

const settingsSchema = z.object({
  staleDays: z.coerce.number().int().min(1, "Mínimo de 1 dia.").max(90, "Máximo de 90 dias."),
  awaitingReplyHours: z.coerce.number().int().min(1, "Mínimo de 1 hora.").max(72, "Máximo de 72 horas."),
  reportGraceHours: z.coerce.number().int().min(0).max(48, "Máximo de 48 horas."),
  dailyTargetConversations: optionalInt(0, 1000),
  dailyTargetMessages: optionalInt(0, 5000),
});

export async function saveCompanySettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, company } = await requireCompany();
  if (company.role !== "leader") return { ok: false, message: "Só o líder altera as referências." };
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .update({
      stale_days: v.staleDays,
      awaiting_reply_hours: v.awaitingReplyHours,
      report_grace_hours: v.reportGraceHours,
      daily_target_conversations: v.dailyTargetConversations,
      daily_target_messages: v.dailyTargetMessages,
    })
    .eq("company_id", company.companyId)
    .select("company_id");
  if (error) return unexpected("saveCompanySettings", error.message);
  if (!data?.length) return { ok: false, message: "Não foi possível salvar." };
  // Força o recálculo na próxima visita, já com as novas referências.
  await createServiceClient({ type: "user", id: user.id })
    .from("company_settings")
    .update({ alerts_refreshed_at: null })
    .eq("company_id", company.companyId);
  refresh();
  return { ok: true, message: "Referências salvas. Os alertas serão recalculados." };
}
