"use server";

import { refresh } from "next/cache";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { newPasswordSchema, profileSchema } from "@/modules/auth/schemas";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName })
    .eq("id", user.id);
  if (error) return unexpected("updateProfile", error.message);

  refresh();
  return { ok: true, message: "Nome atualizado." };
}

/** Troca de senha logado: exige a senha atual. */
export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  if (!current) return { ok: false, fieldErrors: { current: ["Informe a senha atual."] } };

  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  // Confere a senha atual num cliente separado, sem mexer nos cookies da sessão.
  const env = publicEnv();
  const checker = createPlainClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: checkError } = await checker.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (checkError) return { ok: false, fieldErrors: { current: ["Senha atual incorreta."] } };
  await checker.auth.signOut({ scope: "local" });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, fieldErrors: { password: ["Use uma senha diferente da atual."] } };
    }
    return unexpected("changePassword", error.message);
  }
  return { ok: true, message: "Senha alterada." };
}
