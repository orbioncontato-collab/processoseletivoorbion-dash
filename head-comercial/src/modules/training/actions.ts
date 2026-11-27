"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany, requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { FORMAT_LABELS, SKILLS } from "./skills";

/**
 * Treinamentos. Biblioteca da Orbion: só a administração da plataforma.
 * Da empresa: o líder. Indicar treinamento: o líder. Iniciar e concluir: a própria pessoa.
 */

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.string().max(max));

const trainingSchema = z.object({
  scope: z.enum(["global", "company"]),
  title: z.string().trim().min(1, "Dê um título.").max(200),
  summary: optionalText(600),
  skill: z.enum(Object.keys(SKILLS) as [string, ...string[]]),
  format: z.enum(Object.keys(FORMAT_LABELS) as [string, ...string[]]),
  content: optionalText(50000),
  url: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim() || null)
    .pipe(z.url("Use um link completo, começando com https://").max(500).nullable()),
  duration: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? Number(v) : null))
    .pipe(z.number().int("Use minutos inteiros.").min(1).max(600).nullable()),
});

export async function createTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = trainingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;
  if (!v.content && !v.url) return { ok: false, fieldErrors: { content: ["Escreva o conteúdo ou informe um link."] } };

  let companyId: string | null = null;
  let userId: string;
  if (v.scope === "global") {
    const user = await requireUser();
    if (!user.isPlatformAdmin) return { ok: false, message: "Só a administração cadastra na biblioteca da Orbion." };
    userId = user.id;
  } else {
    const { user, company } = await requireCompany();
    if (company.role !== "leader") return { ok: false, message: "Só o líder cadastra treinamentos da empresa." };
    companyId = company.companyId;
    userId = user.id;
  }

  const db = createServiceClient({ type: "user", id: userId });
  const { error } = await db.from("trainings").insert({
    scope: v.scope,
    company_id: companyId,
    title: v.title,
    summary: v.summary,
    skill: v.skill,
    format: v.format,
    content: v.content,
    url: v.url,
    duration_minutes: v.duration,
    created_by: userId,
  });
  if (error) return unexpected("createTraining", error.message);
  refresh();
  return { ok: true, message: "Treinamento salvo." };
}

export async function archiveTraining(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const user = await requireUser();
  const db = createServiceClient({ type: "user", id: user.id });
  const { data: t } = await db.from("trainings").select("scope, company_id").eq("id", id).maybeSingle();
  if (!t) return;
  if (t.scope === "global" && !user.isPlatformAdmin) return;
  if (t.scope === "company") {
    const { company } = await requireCompany();
    if (company.role !== "leader" || company.companyId !== t.company_id) return;
  }
  await db.from("trainings").update({ archived_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

const assignSchema = z.object({
  userId: z.uuid("Escolha a pessoa."),
  trainingId: z.uuid("Escolha o treinamento."),
  reason: z.string().trim().min(3, "Diga o motivo, em poucas palavras.").max(1000),
});

export async function assignTraining(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, company } = await requireCompany();
  if (company.role !== "leader") return { ok: false, message: "Só o líder indica treinamentos." };
  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const db = createServiceClient({ type: "user", id: user.id });
  const { data: training } = await db
    .from("trainings")
    .select("id, skill, scope, company_id")
    .eq("id", parsed.data.trainingId)
    .is("archived_at", null)
    .maybeSingle();
  if (!training || (training.scope === "company" && training.company_id !== company.companyId)) {
    return { ok: false, fieldErrors: { trainingId: ["Treinamento não encontrado."] } };
  }
  const { error } = await db.from("training_assignments").insert({
    company_id: company.companyId,
    user_id: parsed.data.userId,
    training_id: training.id,
    source: "leader",
    reason: parsed.data.reason,
    skill: training.skill,
    assigned_by: user.id,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, message: "Essa pessoa já tem este treinamento em aberto." };
    if (error.message.includes("não faz parte")) return { ok: false, fieldErrors: { userId: ["Pessoa fora da equipe."] } };
    return unexpected("assignTraining", error.message);
  }
  refresh();
  return { ok: true, message: "Treinamento indicado." };
}

export async function setAssignmentStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = z.enum(["started", "completed", "dismissed", "recommended"]).safeParse(formData.get("status"));
  if (!z.uuid().safeParse(id).success || !status.success) return;
  const { user, company } = await requireCompany();
  const db = createServiceClient({ type: "user", id: user.id });
  const { data: a } = await db.from("training_assignments").select("user_id, company_id").eq("id", id).maybeSingle();
  if (!a || a.company_id !== company.companyId) return;
  const isOwner = a.user_id === user.id;
  const isLeader = company.role === "leader";
  // A pessoa inicia e conclui o próprio treinamento; o líder também pode dispensar ou reabrir.
  const allowed = (isOwner && (status.data === "started" || status.data === "completed")) || isLeader;
  if (!allowed) return;
  await db.from("training_assignments").update({ status: status.data }).eq("id", id);
  refresh();
}
