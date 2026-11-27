"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { unexpected, type ActionState } from "@/lib/action-state";

/** Teto mensal de IA da empresa, em dólares. Vazio = sem teto. */
export async function setAiLimit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!user.isPlatformAdmin) return { ok: false, message: "Só a administração define o limite." };
  const companyId = z.uuid().safeParse(formData.get("companyId"));
  if (!companyId.success) return { ok: false, message: "Empresa inválida." };
  const raw = String(formData.get("limitUsd") ?? "").trim().replace(",", ".");
  const value = raw === "" ? null : Number(raw);
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100000)) {
    return { ok: false, fieldErrors: { limitUsd: ["Use um valor entre 0 e 100.000 dólares, ou deixe vazio."] } };
  }
  const { error } = await createServiceClient({ type: "user", id: user.id })
    .from("companies")
    .update({ ai_monthly_limit_micros: value === null ? null : Math.round(value * 1_000_000) })
    .eq("id", companyId.data);
  if (error) return unexpected("setAiLimit", error.message);
  refresh();
  return { ok: true, message: value === null ? "Sem limite de IA." : `Limite mensal de IA: US$ ${value.toFixed(2).replace(".", ",")}.` };
}
