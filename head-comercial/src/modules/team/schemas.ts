import { z } from "zod";

export const ROLE_LABELS = { leader: "Líder", seller: "Vendedor" } as const;

export const inviteMemberSchema = z.object({
  companyId: z.uuid("Empresa inválida."),
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  fullName: z.string().trim().min(2, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
  role: z.enum(["leader", "seller"], { message: "Escolha o papel." }),
});

export const invitationIdSchema = z.object({ invitationId: z.uuid() });

export const memberStatusSchema = z.object({
  membershipId: z.uuid(),
  status: z.enum(["active", "disabled"]),
});

/** Quantas vagas ainda existem, contando vínculos ativos e convites pendentes. */
export function remainingSeats(maxUsers: number, activeMembers: number, pendingInvites: number) {
  return Math.max(0, maxUsers - activeMembers - pendingInvites);
}
