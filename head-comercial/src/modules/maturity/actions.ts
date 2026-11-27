"use server";

import { refresh } from "next/cache";
import { requireCompany } from "@/lib/auth/session";
import { unexpected, type ActionState } from "@/lib/action-state";
import { refreshMaturity } from "./service";

export async function recalculateMaturity(previous: ActionState): Promise<ActionState> {
  void previous;
  const { user, company } = await requireCompany();
  if (company.role !== "leader") return { ok: false, message: "Só o líder recalcula a maturidade." };
  try {
    const r = await refreshMaturity(company.companyId, user.id);
    refresh();
    return { ok: true, message: `Maturidade atualizada: ${r.overall}/100 (${r.level}).` };
  } catch (err) {
    return unexpected("recalculateMaturity", err);
  }
}
