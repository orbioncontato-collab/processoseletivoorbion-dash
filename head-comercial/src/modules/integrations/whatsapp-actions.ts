"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireCompany, type CompanyContext } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { publicEnv } from "@/lib/env";
import type { ActionState } from "@/lib/action-state";
import { generateSourceKey } from "./keys";
import {
  EvolutionError,
  createInstance,
  evolutionConfig,
  getConnectionState,
  getQrCode,
  logoutInstance,
} from "./evolution-client";

/**
 * Conexão do WhatsApp por QR Code (modo aparelho, D008).
 * Só leitura: o Head nunca envia mensagens por esta conexão no MVP.
 */

export type QrState = (ActionState & { qr?: string | null; state?: string }) | null;

const STATUS_BY_STATE: Record<string, string> = { open: "active", close: "disconnected", connecting: "pending" };

async function sourceForUser(ctx: CompanyContext, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  const db = createServiceClient({ type: "user", id: ctx.user.id });
  const { data } = await db
    .from("integration_sources")
    .select("id, company_id, kind, owner_user_id, status")
    .eq("id", id)
    .eq("company_id", ctx.company.companyId)
    .eq("kind", "whatsapp_device")
    .is("archived_at", null)
    .maybeSingle();
  if (!data) return null;
  const allowed = ctx.company.role === "leader" || data.owner_user_id === ctx.user.id;
  return allowed ? { source: data, db } : null;
}

const createSchema = z.object({
  sellerId: z.uuid("Escolha o vendedor."),
  accept: z.literal("on", { message: "É preciso confirmar que entende o risco da conexão não oficial." }),
});

export async function createWhatsappConnection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireCompany();
  if (ctx.company.role !== "leader") return { ok: false, message: "Só o líder cria conexões de WhatsApp." };
  if (!(await evolutionConfig())) return { ok: false, message: "O servidor do WhatsApp ainda não foi configurado." };

  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const i of parsed.error.issues) (fieldErrors[String(i.path[0])] ??= []).push(i.message);
    return { ok: false, fieldErrors };
  }
  const { sellerId } = parsed.data;
  const db = createServiceClient({ type: "user", id: ctx.user.id });

  const { data: member } = await db
    .from("memberships")
    .select("user_id")
    .eq("company_id", ctx.company.companyId)
    .eq("user_id", sellerId)
    .eq("status", "active")
    .maybeSingle();
  if (!member) return { ok: false, fieldErrors: { sellerId: ["Pessoa não encontrada na equipe."] } };

  const { data: existing } = await db
    .from("integration_sources")
    .select("id")
    .eq("company_id", ctx.company.companyId)
    .eq("kind", "whatsapp_device")
    .eq("owner_user_id", sellerId)
    .is("archived_at", null)
    .maybeSingle();
  if (existing) redirect(`/integracoes/${existing.id}`);

  const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", sellerId).maybeSingle();
  const { key, hash, hint } = generateSourceKey();
  const { data: source, error } = await db
    .from("integration_sources")
    .insert({
      company_id: ctx.company.companyId,
      kind: "whatsapp_device",
      provider: "evolution",
      name: `WhatsApp de ${profile?.full_name || profile?.email || "vendedor"}`,
      status: "pending",
      owner_user_id: sellerId,
      created_by: ctx.user.id,
      secret_hash: hash,
      secret_hint: hint,
      config: {
        read_only: true,
        terms_accepted_by: ctx.user.id,
        terms_accepted_at: new Date().toISOString(),
      },
    })
    .select("id")
    .single();
  if (error || !source) {
    console.error("[whatsapp] criar fonte", error?.message);
    return { ok: false, message: "Não foi possível criar a conexão." };
  }

  const webhookUrl = `${publicEnv().NEXT_PUBLIC_SITE_URL}/api/webhooks/whatsapp/${source.id}/${key}`;
  try {
    await createInstance(source.id, webhookUrl);
  } catch (err) {
    const message = err instanceof EvolutionError ? err.message : "Falha ao preparar a conexão.";
    await db.from("integration_sources").update({ status: "error", last_error: message }).eq("id", source.id);
    return { ok: false, message };
  }
  redirect(`/integracoes/${source.id}`);
}

export async function requestQrCode(_prev: QrState, formData: FormData): Promise<QrState> {
  const ctx = await requireCompany();
  const found = await sourceForUser(ctx, String(formData.get("id") ?? ""));
  if (!found) return { ok: false, message: "Conexão não encontrada." };
  try {
    const state = await getConnectionState(found.source.id);
    if (state === "open") {
      await found.db.from("integration_sources").update({ status: "active", last_error: null }).eq("id", found.source.id);
      refresh();
      return { ok: true, message: "Este WhatsApp já está conectado.", state };
    }
    const qr = await getQrCode(found.source.id);
    if (!qr) return { ok: false, message: "O servidor não devolveu o QR Code. Tente de novo em alguns segundos." };
    return { ok: true, qr, message: "Abra o WhatsApp no celular > Aparelhos conectados > Conectar um aparelho." };
  } catch (err) {
    return { ok: false, message: err instanceof EvolutionError ? err.message : "Falha ao gerar o QR Code." };
  }
}

export async function checkConnection(_prev: QrState, formData: FormData): Promise<QrState> {
  const ctx = await requireCompany();
  const found = await sourceForUser(ctx, String(formData.get("id") ?? ""));
  if (!found) return { ok: false, message: "Conexão não encontrada." };
  try {
    const state = await getConnectionState(found.source.id);
    const status = STATUS_BY_STATE[state];
    if (status) {
      await found.db
        .from("integration_sources")
        .update({ status, last_error: state === "close" ? "Desconectado." : null })
        .eq("id", found.source.id);
    }
    refresh();
    const label = state === "open" ? "Conectado." : state === "connecting" ? "Conectando..." : "Desconectado.";
    return { ok: state === "open", message: label, state };
  } catch (err) {
    return { ok: false, message: err instanceof EvolutionError ? err.message : "Falha ao verificar." };
  }
}

export async function disconnectWhatsapp(_prev: QrState, formData: FormData): Promise<QrState> {
  const ctx = await requireCompany();
  const found = await sourceForUser(ctx, String(formData.get("id") ?? ""));
  if (!found) return { ok: false, message: "Conexão não encontrada." };
  try {
    await logoutInstance(found.source.id);
  } catch (err) {
    console.error("[whatsapp] logout", err);
  }
  await found.db
    .from("integration_sources")
    .update({ status: "disconnected", last_error: "Desconectado pelo usuário." })
    .eq("id", found.source.id);
  refresh();
  return { ok: true, message: "WhatsApp desconectado. As conversas já capturadas continuam no Head.", state: "close" };
}
