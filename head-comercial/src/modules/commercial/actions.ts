"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { requireCompany } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { zonedLocalToUtc } from "@/lib/format";
import { fieldErrorsFrom, type ActionState } from "@/lib/action-state";
import type { Database } from "@/lib/supabase/database.types";
import { friendlyDbError } from "./db-errors";

type OpportunityUpdate = Database["public"]["Tables"]["opportunities"]["Update"];
type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];
import {
  contactSchema,
  createOpportunitySchema,
  moveStageSchema,
  objectionSchema,
  renameStageSchema,
  stageSchema,
  updateOpportunitySchema,
} from "./schemas";

/**
 * Ações do núcleo comercial. Usam a sessão do usuário: o RLS e os gatilhos do
 * banco garantem quem pode fazer o quê. Aqui ficam a validação dos dados e as
 * mensagens claras de erro.
 */

const fail = (message: string): ActionState => ({ ok: false, message });

function toUtc(local: string | null, timeZone: string): string | null | "invalid" {
  if (!local) return null;
  const d = zonedLocalToUtc(local, timeZone);
  return d ? d.toISOString() : "invalid";
}

// ---------------------------------------------------------------------------
// Oportunidades
// ---------------------------------------------------------------------------

export async function createOpportunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, company } = await requireCompany();
  const parsed = createOpportunitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;

  // Só o líder escolhe outro responsável.
  const ownerId = company.role === "leader" && v.ownerId ? v.ownerId : user.id;
  const nextStepAt = toUtc(v.nextStepAt, company.timezone);
  if (nextStepAt === "invalid") return { ok: false, fieldErrors: { nextStepAt: ["Data e hora inválidas."] } };

  const supabase = await createClient();
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id, pipeline_id, kind")
    .eq("id", v.stageId)
    .eq("company_id", company.companyId)
    .maybeSingle();
  if (!stage) return { ok: false, fieldErrors: { stageId: ["Etapa inválida."] } };
  if (stage.kind !== "open") {
    return { ok: false, fieldErrors: { stageId: ["Crie a oportunidade numa etapa em andamento."] } };
  }

  let contactId = v.contactId;
  if (!contactId) {
    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        company_id: company.companyId,
        owner_id: ownerId,
        name: v.newContactName!,
        phone_e164: v.newContactPhone,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        return {
          ok: false,
          fieldErrors: {
            newContactPhone: ["Já existe um contato com esse telefone. Escolha-o na lista de contatos."],
          },
        };
      }
      return fail(friendlyDbError(error));
    }
    contactId = contact.id;
  }

  const { data: opp, error } = await supabase
    .from("opportunities")
    .insert({
      company_id: company.companyId,
      contact_id: contactId,
      owner_id: ownerId,
      pipeline_id: stage.pipeline_id,
      stage_id: stage.id,
      title: v.title,
      product: v.product,
      value_cents: v.value,
      next_step: v.nextStep,
      next_step_at: nextStepAt,
      expected_close_date: v.expectedCloseDate,
    })
    .select("id")
    .single();
  if (error) return fail(friendlyDbError(error));

  redirect(`/oportunidades/${opp.id}`);
}

export async function updateOpportunity(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { company } = await requireCompany();
  const parsed = updateOpportunitySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;

  const nextStepAt = toUtc(v.nextStepAt, company.timezone);
  if (nextStepAt === "invalid") return { ok: false, fieldErrors: { nextStepAt: ["Data e hora inválidas."] } };

  const changes: OpportunityUpdate = {
    title: v.title,
    product: v.product,
    value_cents: v.value,
    next_step: v.nextStep,
    next_step_at: nextStepAt,
    expected_close_date: v.expectedCloseDate,
  };
  if (company.role === "leader" && v.ownerId) changes.owner_id = v.ownerId;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .update(changes)
    .eq("id", v.id)
    .eq("company_id", company.companyId)
    .select("id");
  if (error) return fail(friendlyDbError(error));
  if (!data?.length) return fail("Oportunidade não encontrada ou sem permissão.");

  refresh();
  return { ok: true, message: "Alterações salvas." };
}

export async function moveOpportunityStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { company } = await requireCompany();
  const parsed = moveStageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("kind")
    .eq("id", v.stageId)
    .eq("company_id", company.companyId)
    .maybeSingle();
  if (!stage) return fail("Etapa inválida.");
  if (stage.kind === "lost" && !v.lostReason) {
    return { ok: false, fieldErrors: { lostReason: ["Informe o motivo da perda."] } };
  }

  const { data, error } = await supabase
    .from("opportunities")
    .update({
      stage_id: v.stageId,
      lost_reason: stage.kind === "lost" ? v.lostReason : null,
      lost_reason_detail: stage.kind === "lost" ? v.lostReasonDetail : null,
    })
    .eq("id", v.id)
    .eq("company_id", company.companyId)
    .select("id");
  if (error) return fail(friendlyDbError(error));
  if (!data?.length) return fail("Oportunidade não encontrada ou sem permissão.");

  refresh();
  const message =
    stage.kind === "won" ? "Oportunidade marcada como ganha." : stage.kind === "lost" ? "Oportunidade encerrada como perdida." : "Etapa atualizada.";
  return { ok: true, message };
}

// ---------------------------------------------------------------------------
// Objeções
// ---------------------------------------------------------------------------

export async function addObjection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { company } = await requireCompany();
  const parsed = objectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("opportunity_objections").insert({
    company_id: company.companyId,
    opportunity_id: parsed.data.opportunityId,
    description: parsed.data.description,
    category: parsed.data.category,
  });
  if (error) return fail(friendlyDbError(error));
  refresh();
  return { ok: true, message: "Objeção registrada." };
}

export async function setObjectionStatus(formData: FormData): Promise<void> {
  const { company } = await requireCompany();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "handled" ? "handled" : "open";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("opportunity_objections")
    .update({ status })
    .eq("id", id)
    .eq("company_id", company.companyId);
  if (error) console.error("[setObjectionStatus]", error.message);
  refresh();
}

// ---------------------------------------------------------------------------
// Contatos
// ---------------------------------------------------------------------------

export async function createContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, company } = await requireCompany();
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      company_id: company.companyId,
      owner_id: company.role === "leader" && v.ownerId ? v.ownerId : user.id,
      name: v.name,
      phone_e164: v.phone,
      email: v.email,
      organization: v.organization,
      notes: v.notes,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { phone: ["Já existe um contato com esse telefone."] } };
    return fail(friendlyDbError(error));
  }
  redirect(`/contatos/${data.id}`);
}

export async function updateContact(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { company } = await requireCompany();
  const id = String(formData.get("id") ?? "");
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const v = parsed.data;

  const changes: ContactUpdate = {
    name: v.name,
    phone_e164: v.phone,
    email: v.email,
    organization: v.organization,
    notes: v.notes,
  };
  if (company.role === "leader" && v.ownerId) changes.owner_id = v.ownerId;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .update(changes)
    .eq("id", id)
    .eq("company_id", company.companyId)
    .select("id");
  if (error) {
    if (error.code === "23505") return { ok: false, fieldErrors: { phone: ["Já existe um contato com esse telefone."] } };
    return fail(friendlyDbError(error));
  }
  if (!data?.length) return fail("Contato não encontrado ou sem permissão.");
  refresh();
  return { ok: true, message: "Contato salvo." };
}

export async function setContactArchived(formData: FormData): Promise<void> {
  const { company } = await requireCompany();
  const id = String(formData.get("id") ?? "");
  const archive = formData.get("archive") === "1";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({ archived_at: archive ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("company_id", company.companyId);
  if (error) console.error("[setContactArchived]", error.message);
  refresh();
}

// ---------------------------------------------------------------------------
// Funil (só líder; o RLS também bloqueia)
// ---------------------------------------------------------------------------

async function leaderContext() {
  const ctx = await requireCompany();
  if (ctx.company.role !== "leader") return null;
  return ctx;
}

export async function addStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leaderContext();
  if (!ctx) return fail("Só o líder pode alterar o funil.");
  const parsed = stageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, pipeline_id, kind, position, pipelines!inner(is_default)")
    .eq("company_id", ctx.company.companyId)
    .eq("pipelines.is_default", true)
    .order("position");
  if (!stages?.length) return fail("Funil não encontrado.");

  // Etapas em andamento entram antes das etapas de encerramento.
  const firstClosed = stages.find((s) => s.kind !== "open");
  const position =
    parsed.data.kind === "open" && firstClosed ? firstClosed.position : stages[stages.length - 1].position + 1;
  if (parsed.data.kind === "open" && firstClosed) {
    for (const s of [...stages].reverse().filter((s) => s.position >= position)) {
      const { error } = await supabase.from("pipeline_stages").update({ position: s.position + 1 }).eq("id", s.id);
      if (error) return fail(friendlyDbError(error));
    }
  }

  const { error } = await supabase.from("pipeline_stages").insert({
    company_id: ctx.company.companyId,
    pipeline_id: stages[0].pipeline_id,
    name: parsed.data.name,
    kind: parsed.data.kind,
    position,
  });
  if (error) return fail(friendlyDbError(error));
  refresh();
  return { ok: true, message: "Etapa adicionada." };
}

export async function renameStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leaderContext();
  if (!ctx) return fail("Só o líder pode alterar o funil.");
  const parsed = renameStageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("pipeline_stages")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .eq("company_id", ctx.company.companyId);
  if (error) return fail(friendlyDbError(error));
  refresh();
  return { ok: true, message: "Nome atualizado." };
}

/** Sobe ou desce uma etapa, trocando de lugar com a vizinha do mesmo tipo de grupo. */
export async function reorderStage(formData: FormData): Promise<void> {
  const ctx = await leaderContext();
  if (!ctx) return;
  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;

  const supabase = await createClient();
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, position, kind, pipelines!inner(is_default)")
    .eq("company_id", ctx.company.companyId)
    .eq("pipelines.is_default", true)
    .is("archived_at", null)
    .order("position");
  if (!stages) return;
  const i = stages.findIndex((s) => s.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= stages.length) return;
  // Etapas de ganho e perda ficam sempre no fim; só troca dentro do mesmo grupo.
  if ((stages[i].kind === "open") !== (stages[j].kind === "open")) return;

  const a = stages[i];
  const b = stages[j];
  await supabase.from("pipeline_stages").update({ position: b.position }).eq("id", a.id);
  await supabase.from("pipeline_stages").update({ position: a.position }).eq("id", b.id);
  refresh();
}

export async function archiveStage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leaderContext();
  if (!ctx) return fail("Só o líder pode alterar o funil.");
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("pipeline_stages")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", ctx.company.companyId);
  if (error) return fail(friendlyDbError(error));
  refresh();
  return { ok: true, message: "Etapa arquivada." };
}
