import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { CURRENT_TERMS_VERSION } from "./terms";

export type MemberRole = Database["public"]["Enums"]["member_role"];

export interface CompanyMembership {
  companyId: string;
  companyName: string;
  companySlug: string;
  timezone: string;
  role: MemberRole;
}

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  isPlatformAdmin: boolean;
  memberships: CompanyMembership[];
  /** Aceitou a versão atual dos termos de uso e do aviso de privacidade. */
  termsAccepted: boolean;
}

export { CURRENT_TERMS_VERSION };

export interface CompanyContext {
  user: CurrentUser;
  company: CompanyMembership;
}

export const ACTIVE_COMPANY_COOKIE = "hc_empresa";

/**
 * Camada de acesso a dados da sessão (DAL).
 * Lê e VERIFICA o token (getClaims) e carrega perfil, vínculos e se é admin.
 * Usa cache() para rodar uma vez por requisição.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const userId = data.claims.sub;

  const [profileRes, adminRes, membershipsRes] = await Promise.all([
    supabase.from("profiles").select("email, full_name, terms_version").eq("id", userId).maybeSingle(),
    supabase.from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
    supabase
      .from("memberships")
      .select("role, company_id, companies(name, slug, timezone)")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  if (profileRes.error || membershipsRes.error || adminRes.error) {
    console.error("Falha ao carregar sessão", {
      profile: profileRes.error?.message,
      admin: adminRes.error?.message,
      memberships: membershipsRes.error?.message,
    });
    return null;
  }

  const memberships: CompanyMembership[] = (membershipsRes.data ?? [])
    // Empresa suspensa não aparece (o RLS de companies devolve null no join).
    .filter((m) => m.companies !== null)
    .map((m) => ({
      companyId: m.company_id,
      companyName: m.companies!.name,
      companySlug: m.companies!.slug,
      timezone: m.companies!.timezone,
      role: m.role,
    }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName, "pt-BR"));

  return {
    id: userId,
    email: profileRes.data?.email ?? (data.claims.email as string | undefined) ?? "",
    fullName: profileRes.data?.full_name ?? "",
    isPlatformAdmin: Boolean(adminRes.data),
    memberships,
    termsAccepted: profileRes.data?.terms_version === CURRENT_TERMS_VERSION,
  };
});

/** Exige login e o aceite dos termos. Sem sessão, manda para a entrada; sem aceite, para os termos. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (!user.termsAccepted) redirect("/aceitar-termos");
  return user;
}

/** Empresa ativa: a escolhida no seletor (cookie) ou a primeira da lista. */
export async function getActiveCompany(user: CurrentUser): Promise<CompanyMembership | null> {
  if (user.memberships.length === 0) return null;
  const chosen = (await cookies()).get(ACTIVE_COMPANY_COOKIE)?.value;
  return user.memberships.find((m) => m.companyId === chosen) ?? user.memberships[0];
}

/** Exige login e uma empresa ativa. */
export async function requireCompany(): Promise<CompanyContext> {
  const user = await requireUser();
  const company = await getActiveCompany(user);
  if (!company) redirect(user.isPlatformAdmin ? "/admin/empresas" : "/sem-acesso");
  return { user, company };
}

/** Exige que o usuário seja líder da empresa ativa. */
export async function requireLeader(): Promise<CompanyContext> {
  const ctx = await requireCompany();
  if (ctx.company.role !== "leader") redirect("/inicio");
  return ctx;
}

/** Exige administrador da plataforma. */
export async function requirePlatformAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isPlatformAdmin) redirect("/inicio");
  return user;
}

/**
 * Versão para ações do servidor: em vez de redirecionar, diz se pode gerenciar
 * a equipe de uma empresa (admin da plataforma ou líder ativo dela).
 */
export function canManageCompany(user: CurrentUser, companyId: string): boolean {
  if (user.isPlatformAdmin) return true;
  return user.memberships.some((m) => m.companyId === companyId && m.role === "leader");
}
