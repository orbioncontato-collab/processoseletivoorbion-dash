"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACTIVE_COMPANY_COOKIE, requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { createCompanySchema } from "./schemas";

export async function createCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!user.isPlatformAdmin) {
    return { ok: false, message: "Só a administração da plataforma pode criar empresas." };
  }

  const parsed = createCompanySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const db = createServiceClient({ type: "user", id: user.id });
  const { data, error } = await db
    .from("companies")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      timezone: parsed.data.timezone,
      max_users: parsed.data.maxUsers,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, fieldErrors: { slug: ["Já existe uma empresa com esse identificador."] } };
    }
    return unexpected("createCompany", error.message);
  }

  redirect(`/admin/empresas/${data.id}`);
}

/** Troca a empresa ativa (para quem participa de mais de uma). */
export async function setActiveCompany(formData: FormData): Promise<void> {
  const user = await requireUser();
  const companyId = String(formData.get("companyId") ?? "");
  if (!user.memberships.some((m) => m.companyId === companyId)) return;

  (await cookies()).set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/inicio");
}
