"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/auth/routes";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { acceptPendingInvitations } from "@/modules/team/service";
import { newPasswordSchema, resetRequestSchema, signInSchema } from "./schemas";

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    if (error?.status === 429) {
      return { ok: false, message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    }
    // Mensagem única para não revelar se o e-mail existe.
    return { ok: false, message: "E-mail ou senha incorretos." };
  }

  try {
    await acceptPendingInvitations(data.user.id, data.user.email ?? parsed.data.email);
  } catch (err) {
    // O login continua; o convite pode ser aceito no próximo acesso.
    console.error("[signIn] aceitar convites", err);
  }

  redirect(safeNextPath(parsed.data.next));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function requestPasswordReset(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-senha`,
  });
  if (error && error.status === 429) {
    return { ok: false, message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
  }
  if (error) console.error("[requestPasswordReset]", error.message);

  // Resposta igual exista ou não a conta, para não revelar e-mails cadastrados.
  return {
    ok: true,
    message: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.",
  };
}

export async function setPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { ok: false, message: "Seu link expirou. Peça um novo convite ou recupere a senha." };
  }

  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { ok: false, message: "A nova senha precisa ser diferente da anterior." };
    }
    if (error.code === "weak_password") {
      return { ok: false, message: "Senha fraca. Use letras e números, com pelo menos 8 caracteres." };
    }
    return unexpected("setPassword", error.message);
  }

  try {
    await acceptPendingInvitations(data.user.id, data.user.email ?? "");
  } catch (err) {
    console.error("[setPassword] aceitar convites", err);
  }

  redirect("/inicio");
}
