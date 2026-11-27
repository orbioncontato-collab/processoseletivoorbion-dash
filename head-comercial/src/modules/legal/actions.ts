"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CURRENT_TERMS_VERSION } from "@/lib/auth/terms";
import { createServiceClient } from "@/lib/supabase/service";
import { unexpected, type ActionState } from "@/lib/action-state";

export async function acceptTerms(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (formData.get("accept") !== "on") return { ok: false, message: "Para continuar, marque que leu e aceita os termos." };
  const { error } = await createServiceClient({ type: "user", id: user.id })
    .from("profiles")
    .update({ terms_version: CURRENT_TERMS_VERSION, terms_accepted_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return unexpected("acceptTerms", error.message);
  redirect("/inicio");
}
