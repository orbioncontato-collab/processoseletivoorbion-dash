import "server-only";
import { requireCompany } from "@/lib/auth/session";
import type { AgentContext } from "./tools";

/** Contexto do agente a partir da pessoa logada e da empresa ativa. */
export async function currentAgentContext(): Promise<AgentContext> {
  const { user, company } = await requireCompany();
  return {
    companyId: company.companyId,
    companyName: company.companyName,
    userId: user.id,
    userName: user.fullName || user.email,
    role: company.role,
    timezone: company.timezone,
  };
}
