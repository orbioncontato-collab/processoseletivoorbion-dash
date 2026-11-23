"use server";

import { refresh } from "next/cache";
import { canManageCompany, requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { publicEnv } from "@/lib/env";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { acceptInvitationRecord, exactIlike } from "./service";
import {
  invitationIdSchema,
  inviteMemberSchema,
  memberStatusSchema,
  remainingSeats,
} from "./schemas";

const NO_PERMISSION: ActionState = {
  ok: false,
  message: "Você não tem permissão para gerenciar a equipe desta empresa.",
};

async function seatsLeft(db: ReturnType<typeof createServiceClient>, companyId: string) {
  const [company, members, invites] = await Promise.all([
    db.from("companies").select("max_users, status").eq("id", companyId).maybeSingle(),
    db
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    db
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pending"),
  ]);
  if (company.error || members.error || invites.error) {
    throw new Error(company.error?.message ?? members.error?.message ?? invites.error?.message);
  }
  if (!company.data) return { exists: false as const, seats: 0, active: false };
  return {
    exists: true as const,
    active: company.data.status === "active",
    seats: remainingSeats(company.data.max_users, members.count ?? 0, invites.count ?? 0),
  };
}

export async function inviteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = inviteMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const { companyId, email, fullName, role } = parsed.data;

  if (!canManageCompany(user, companyId)) return NO_PERMISSION;
  const db = createServiceClient({ type: "user", id: user.id });

  try {
    const seats = await seatsLeft(db, companyId);
    if (!seats.exists || !seats.active) {
      return { ok: false, message: "Empresa não encontrada ou suspensa." };
    }
    if (seats.seats === 0) {
      return {
        ok: false,
        message: "A empresa atingiu o limite de usuários. Desative alguém ou fale com a Orbion.",
      };
    }

    const { data: existing, error: profileError } = await db
      .from("profiles")
      .select("id")
      .ilike("email", exactIlike(email))
      .maybeSingle();
    if (profileError) throw profileError;

    if (existing) {
      const { data: membership } = await db
        .from("memberships")
        .select("status")
        .eq("company_id", companyId)
        .eq("user_id", existing.id)
        .maybeSingle();
      if (membership?.status === "active") {
        return { ok: false, fieldErrors: { email: ["Essa pessoa já faz parte da equipe."] } };
      }
    }

    const { data: invite, error: inviteError } = await db
      .from("invitations")
      .insert({
        company_id: companyId,
        email,
        full_name: fullName,
        role,
        invited_by: user.id,
        user_id: existing?.id ?? null,
      })
      .select("id, company_id, role, email, user_id")
      .single();
    if (inviteError) {
      if (inviteError.code === "23505") {
        return { ok: false, fieldErrors: { email: ["Já existe um convite pendente para esse e-mail."] } };
      }
      throw inviteError;
    }

    const redirectTo = `${publicEnv().NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/definir-senha`;

    if (existing) {
      const { data: authUser } = await db.auth.admin.getUserById(existing.id);
      if (authUser?.user?.last_sign_in_at) {
        // Já usa o sistema (em outra empresa): entra direto na equipe.
        await acceptInvitationRecord(db, invite, existing.id);
        refresh();
        return { ok: true, message: `${fullName} já tinha conta e foi adicionado à equipe.` };
      }
      // Tem conta, mas nunca entrou: manda de novo o link para criar a senha.
      const { error: linkError } = await db.auth.resetPasswordForEmail(email, { redirectTo });
      if (linkError) throw linkError;
      refresh();
      return { ok: true, message: `Convite reenviado para ${email}.` };
    }

    const { data: invited, error: authError } = await db.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo,
    });
    if (authError || !invited.user) {
      await db.from("invitations").update({ status: "revoked" }).eq("id", invite.id);
      if (authError?.status === 429) {
        return { ok: false, message: "Limite de envio de e-mails atingido. Tente de novo mais tarde." };
      }
      return unexpected("inviteMember.auth", authError?.message);
    }

    await db.from("invitations").update({ user_id: invited.user.id }).eq("id", invite.id);
    refresh();
    return { ok: true, message: `Convite enviado para ${email}.` };
  } catch (err) {
    return unexpected("inviteMember", err);
  }
}

export async function revokeInvitation(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = invitationIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const db = createServiceClient({ type: "user", id: user.id });
  const { data: inv } = await db
    .from("invitations")
    .select("company_id, status")
    .eq("id", parsed.data.invitationId)
    .maybeSingle();
  if (!inv || inv.status !== "pending" || !canManageCompany(user, inv.company_id)) return;

  const { error } = await db
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", parsed.data.invitationId)
    .eq("status", "pending");
  if (error) console.error("[revokeInvitation]", error.message);
  refresh();
}

export async function setMemberStatus(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = memberStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;

  const db = createServiceClient({ type: "user", id: user.id });
  const { data: membership } = await db
    .from("memberships")
    .select("company_id, user_id, status")
    .eq("id", parsed.data.membershipId)
    .maybeSingle();
  if (!membership || !canManageCompany(user, membership.company_id)) return;
  if (membership.user_id === user.id) return; // ninguém desativa a si mesmo
  if (membership.status === parsed.data.status) return;

  if (parsed.data.status === "active") {
    const seats = await seatsLeft(db, membership.company_id);
    if (seats.seats === 0) return;
  }

  const { error } = await db
    .from("memberships")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.membershipId);
  if (error) console.error("[setMemberStatus]", error.message);
  refresh();
}
