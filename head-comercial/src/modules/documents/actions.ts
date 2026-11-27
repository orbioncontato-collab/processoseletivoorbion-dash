"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { DOC_KIND_LABELS } from "./labels";

/** Documentos comerciais. Só o líder cria, escreve versões e publica. */

async function leader() {
  const { user, company } = await requireCompany();
  return company.role === "leader" ? { user, company } : null;
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Dê um título.").max(200),
  kind: z.enum(Object.keys(DOC_KIND_LABELS) as [string, ...string[]]),
  content: z.string().trim().min(1, "Escreva o conteúdo da primeira versão.").max(100000),
  publish: z.literal("on").optional().transform(Boolean),
});

export async function createDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leader();
  if (!ctx) return { ok: false, message: "Só o líder cria documentos." };
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const db = createServiceClient({ type: "user", id: ctx.user.id });
  const { data: doc, error } = await db
    .from("commercial_documents")
    .insert({ company_id: ctx.company.companyId, title: parsed.data.title, kind: parsed.data.kind, created_by: ctx.user.id })
    .select("id")
    .single();
  if (error || !doc) return unexpected("createDocument", error?.message);
  const { error: vError } = await db.from("document_versions").insert({
    company_id: ctx.company.companyId,
    document_id: doc.id,
    content: parsed.data.content,
    change_note: "Primeira versão",
    created_by: ctx.user.id,
  });
  if (vError) return unexpected("createDocument.version", vError.message);
  if (parsed.data.publish) await db.from("commercial_documents").update({ published_version: 1 }).eq("id", doc.id);
  redirect(`/documentos/${doc.id}`);
}

const versionSchema = z.object({
  documentId: z.uuid(),
  content: z.string().trim().min(1, "Escreva o conteúdo.").max(100000),
  note: z.string().trim().min(3, "Diga o que mudou.").max(1000),
  publish: z.literal("on").optional().transform(Boolean),
});

export async function addVersion(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await leader();
  if (!ctx) return { ok: false, message: "Só o líder escreve novas versões." };
  const parsed = versionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const db = createServiceClient({ type: "user", id: ctx.user.id });
  const { data: v, error } = await db
    .from("document_versions")
    .insert({
      company_id: ctx.company.companyId,
      document_id: parsed.data.documentId,
      content: parsed.data.content,
      change_note: parsed.data.note,
      created_by: ctx.user.id,
    })
    .select("version")
    .single();
  if (error || !v) return error?.message.includes("não encontrado") ? { ok: false, message: "Documento não encontrado." } : unexpected("addVersion", error?.message);
  if (parsed.data.publish) {
    await db.from("commercial_documents").update({ published_version: v.version }).eq("id", parsed.data.documentId).eq("company_id", ctx.company.companyId);
  }
  refresh();
  return { ok: true, message: parsed.data.publish ? `Versão ${v.version} salva e publicada.` : `Versão ${v.version} salva como rascunho.` };
}

export async function publishVersion(formData: FormData): Promise<void> {
  const ctx = await leader();
  if (!ctx) return;
  const id = String(formData.get("documentId") ?? "");
  const version = Number(formData.get("version"));
  if (!z.uuid().safeParse(id).success || !Number.isInteger(version) || version < 1) return;
  const db = createServiceClient({ type: "user", id: ctx.user.id });
  const { error } = await db.from("commercial_documents").update({ published_version: version }).eq("id", id).eq("company_id", ctx.company.companyId);
  if (error) console.error("[publishVersion]", error.message);
  refresh();
}

export async function archiveDocument(formData: FormData): Promise<void> {
  const ctx = await leader();
  if (!ctx) return;
  const id = String(formData.get("documentId") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  await createServiceClient({ type: "user", id: ctx.user.id })
    .from("commercial_documents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", ctx.company.companyId);
  redirect("/documentos");
}
