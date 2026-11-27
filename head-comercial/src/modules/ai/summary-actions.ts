"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";

const schema = z.object({
  enabled: z.literal("on").optional().transform(Boolean),
  hour: z.coerce.number().int().min(5, "Entre 5h e 12h.").max(12, "Entre 5h e 12h."),
});

export async function saveSummarySettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { company } = await requireCompany();
  if (company.role !== "leader") return { ok: false, message: "Só o líder altera o resumo do dia." };
  const parsed = schema.safeParse({ enabled: formData.get("enabled") ?? undefined, hour: formData.get("hour") });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .update({ daily_summary_enabled: parsed.data.enabled, daily_summary_hour: parsed.data.hour })
    .eq("company_id", company.companyId)
    .select("company_id");
  if (error) return unexpected("saveSummarySettings", error.message);
  if (!data?.length) return { ok: false, message: "Não foi possível salvar." };
  refresh();
  return {
    ok: true,
    message: parsed.data.enabled ? `Resumo do dia ligado, todo dia a partir das ${parsed.data.hour}h.` : "Resumo do dia desligado.",
  };
}
