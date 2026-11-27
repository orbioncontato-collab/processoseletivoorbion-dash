"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import { insertAction } from "./service";

/** Plano de ação. O líder cria para qualquer pessoa da equipe; o vendedor, para si. */

const schema = z.object({
  title: z.string().trim().min(3, "Descreva a ação.").max(200),
  description: z.string().optional().transform((v) => (v ?? "").trim()).pipe(z.string().max(4000)),
  ownerId: z.string().optional().transform((v) => v || null).pipe(z.uuid().nullable()),
  dueDate: z
    .string()
    .optional()
    .transform((v) => v || null)
    .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable()),
  priority: z.enum(["low", "medium", "high"]),
});

export async function createAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, company } = await requireCompany();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const isLeader = company.role === "leader";
  const ownerId = isLeader ? (parsed.data.ownerId ?? user.id) : user.id;
  const result = await insertAction({
    companyId: company.companyId,
    actorId: user.id,
    actorType: "user",
    title: parsed.data.title,
    description: parsed.data.description,
    ownerId,
    dueDate: parsed.data.dueDate,
    priority: parsed.data.priority,
    source: ownerId === user.id && !isLeader ? "self" : "leader",
  });
  if ("error" in result) return { ok: false, message: result.error };
  refresh();
  return { ok: true, message: "Ação criada." };
}

export async function setActionStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = z.enum(["open", "doing", "done", "canceled"]).safeParse(formData.get("status"));
  if (!z.uuid().safeParse(id).success || !status.success) return;
  const { user, company } = await requireCompany();
  const db = createServiceClient({ type: "user", id: user.id });
  const { data: a } = await db.from("action_items").select("owner_id, company_id").eq("id", id).maybeSingle();
  if (!a || a.company_id !== company.companyId) return;
  if (a.owner_id !== user.id && company.role !== "leader") return;
  await db.from("action_items").update({ status: status.data }).eq("id", id);
  refresh();
}
