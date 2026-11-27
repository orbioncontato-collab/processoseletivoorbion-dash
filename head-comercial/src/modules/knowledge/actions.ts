"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany, requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { fieldErrorsFrom, unexpected, type ActionState } from "@/lib/action-state";
import { splitIntoChunks } from "./chunking";
import { ExtractError, extractTextFromFile } from "./extract";
import { KIND_LABELS, MEMORY_CATEGORIES, OUTCOME_LABELS } from "./labels";

/**
 * Cadastro do conhecimento. Global (metodologia Orbion): só admin da plataforma.
 * Da empresa: líder ou admin. A gravação usa a chave secreta depois da checagem.
 */

async function authorize(scope: "global" | "company") {
  if (scope === "global") {
    const user = await requireUser();
    return user.isPlatformAdmin ? { userId: user.id, companyId: null as string | null } : null;
  }
  const { user, company } = await requireCompany();
  return company.role === "leader" || user.isPlatformAdmin ? { userId: user.id, companyId: company.companyId } : null;
}

const docSchema = z.object({
  scope: z.enum(["global", "company"]),
  title: z.string().trim().min(1, "Dê um título.").max(200),
  kind: z.enum(Object.keys(KIND_LABELS) as [string, ...string[]]),
  tags: z
    .string()
    .optional()
    .transform((v) => (v ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 20)),
  text: z.string().max(500_000, "Texto grande demais.").optional(),
});

export async function createDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = docSchema.safeParse({
    scope: formData.get("scope"),
    title: formData.get("title"),
    kind: formData.get("kind"),
    tags: formData.get("tags") ?? undefined,
    text: formData.get("text") ?? undefined,
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const auth = await authorize(parsed.data.scope);
  if (!auth) return { ok: false, message: "Você não tem permissão para cadastrar este conhecimento." };

  const file = formData.get("file");
  let text = parsed.data.text ?? "";
  let fileName: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      text = await extractTextFromFile(file);
      fileName = file.name.slice(0, 255);
    } catch (err) {
      return { ok: false, fieldErrors: { file: [err instanceof ExtractError ? err.message : "Falha ao ler o arquivo."] } };
    }
  }
  const chunks = splitIntoChunks(text);
  if (!chunks.length) return { ok: false, fieldErrors: { text: ["Cole o texto ou envie um arquivo com conteúdo."] } };

  const db = createServiceClient({ type: "user", id: auth.userId });
  const { data: doc, error } = await db
    .from("knowledge_documents")
    .insert({
      scope: parsed.data.scope,
      company_id: auth.companyId,
      title: parsed.data.title,
      kind: parsed.data.kind,
      tags: parsed.data.tags,
      source: fileName ? "upload" : "paste",
      file_name: fileName,
      content_chars: text.length,
      chunk_count: chunks.length,
      status: "processing",
      created_by: auth.userId,
    })
    .select("id")
    .single();
  if (error || !doc) return unexpected("createDocument", error?.message);

  for (let i = 0; i < chunks.length; i += 200) {
    const batch = chunks.slice(i, i + 200).map((c, j) => ({ document_id: doc.id, position: i + j, heading: c.heading, content: c.content }));
    const { error: chunkError } = await db.from("knowledge_chunks").insert(batch);
    if (chunkError) {
      await db.from("knowledge_documents").update({ status: "error", error: "Falha ao gravar os trechos." }).eq("id", doc.id);
      return unexpected("createDocument.chunks", chunkError.message);
    }
  }
  await db.from("knowledge_documents").update({ status: "ready" }).eq("id", doc.id);
  refresh();
  return { ok: true, message: `Documento salvo em ${chunks.length} trecho(s).` };
}

export async function archiveDocument(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const user = await requireUser();
  const db = createServiceClient({ type: "user", id: user.id });
  const { data: doc } = await db.from("knowledge_documents").select("scope, company_id").eq("id", id).maybeSingle();
  if (!doc) return;
  const auth = await authorize(doc.scope as "global" | "company");
  if (!auth || (doc.scope === "company" && auth.companyId !== doc.company_id)) return;
  await db.from("knowledge_documents").update({ archived_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

const caseSchema = z.object({
  scope: z.enum(["global", "company"]),
  title: z.string().trim().min(1, "Dê um título.").max(200),
  outcome: z.enum(Object.keys(OUTCOME_LABELS) as [string, ...string[]]),
  conversation: z.string().trim().min(20, "Cole a conversa.").max(50000),
  expected: z.string().trim().min(10, "Descreva a avaliação esperada.").max(10000),
});

export async function createCalibrationCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = caseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const auth = await authorize(parsed.data.scope);
  if (!auth) return { ok: false, message: "Você não tem permissão para cadastrar casos de calibragem." };
  const db = createServiceClient({ type: "user", id: auth.userId });
  const { error } = await db.from("calibration_cases").insert({
    scope: parsed.data.scope,
    company_id: auth.companyId,
    title: parsed.data.title,
    outcome: parsed.data.outcome,
    conversation: parsed.data.conversation,
    expected_assessment: parsed.data.expected,
    created_by: auth.userId,
  });
  if (error) return unexpected("createCalibrationCase", error.message);
  refresh();
  return { ok: true, message: "Caso de calibragem salvo." };
}

const memorySchema = z.object({
  scope: z.enum(["company", "user"]),
  subjectUserId: z.string().optional().transform((v) => (v ? v : null)).pipe(z.uuid().nullable()),
  category: z.enum(Object.keys(MEMORY_CATEGORIES) as [string, ...string[]]),
  content: z.string().trim().min(3, "Escreva o fato.").max(2000),
});

export async function addMemory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { user, company } = await requireCompany();
  if (company.role !== "leader") return { ok: false, message: "Só o líder registra memória." };
  const subject = String(formData.get("subjectUserId") ?? "");
  const parsed = memorySchema.safeParse({
    scope: subject ? "user" : "company",
    subjectUserId: subject,
    category: formData.get("category"),
    content: formData.get("content"),
  });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);

  const db = createServiceClient({ type: "user", id: user.id });
  if (parsed.data.subjectUserId) {
    const { data: m } = await db
      .from("memberships")
      .select("user_id")
      .eq("company_id", company.companyId)
      .eq("user_id", parsed.data.subjectUserId)
      .maybeSingle();
    if (!m) return { ok: false, fieldErrors: { subjectUserId: ["Pessoa fora da equipe."] } };
  }
  const { error } = await db.from("memory_items").insert({
    company_id: company.companyId,
    scope: parsed.data.scope,
    subject_user_id: parsed.data.scope === "user" ? parsed.data.subjectUserId : null,
    category: parsed.data.category,
    content: parsed.data.content,
    source: "manual",
    created_by: user.id,
  });
  if (error) return unexpected("addMemory", error.message);
  refresh();
  return { ok: true, message: "Registrado na memória." };
}

export async function archiveMemory(formData: FormData): Promise<void> {
  const { user, company } = await requireCompany();
  if (company.role !== "leader") return;
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const db = createServiceClient({ type: "user", id: user.id });
  await db.from("memory_items").update({ status: "archived" }).eq("id", id).eq("company_id", company.companyId);
  refresh();
}
