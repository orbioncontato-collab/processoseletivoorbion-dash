"use server";

import { refresh } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { createServiceClient } from "@/lib/supabase/service";
import { canEncrypt, encryptSecret, hintOf } from "@/lib/secrets";
import { clearPlatformConfigCache, platformSecret, type SecretName } from "@/lib/platform-config";
import { unexpected, type ActionState } from "@/lib/action-state";

/** Chaves das integrações da plataforma. Só a administração da Orbion mexe aqui. */

const NAMES = ["anthropic_api_key", "evolution_api_url", "evolution_api_key"] as const;

const validators: Record<SecretName, z.ZodType<string>> = {
  anthropic_api_key: z.string().trim().min(20, "Chave curta demais.").max(400).regex(/^\S+$/, "A chave não tem espaços."),
  evolution_api_url: z.url("Use um endereço completo, como https://whatsapp.suaempresa.com.").max(400),
  evolution_api_key: z.string().trim().min(8, "Chave curta demais.").max(400).regex(/^\S+$/, "A chave não tem espaços."),
};

async function requireAdmin() {
  const user = await requireUser();
  return user.isPlatformAdmin ? user : null;
}

export async function saveSecret(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, message: "Só a administração da plataforma altera as integrações." };
  const name = z.enum(NAMES).safeParse(formData.get("name"));
  if (!name.success) return { ok: false, message: "Integração desconhecida." };
  if (!canEncrypt()) {
    return { ok: false, message: "O servidor ainda não tem a chave de cifra (SECRETS_ENCRYPTION_KEY). Veja o guia de configuração." };
  }
  const value = validators[name.data].safeParse(String(formData.get("value") ?? "").trim());
  if (!value.success) return { ok: false, fieldErrors: { value: value.error.issues.map((i) => i.message) } };

  const db = createServiceClient({ type: "user", id: admin.id });
  const { error } = await db.from("platform_secrets").upsert({
    name: name.data,
    ciphertext: encryptSecret(value.data),
    hint: name.data === "evolution_api_url" ? new URL(value.data).host.slice(0, 40) : hintOf(value.data),
    updated_by: admin.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return unexpected("saveSecret", error.message);
  clearPlatformConfigCache();
  refresh();
  return { ok: true, message: "Salvo." };
}

export async function removeSecret(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;
  const name = z.enum(NAMES).safeParse(formData.get("name"));
  if (!name.success) return;
  await createServiceClient({ type: "user", id: admin.id }).from("platform_secrets").delete().eq("name", name.data);
  clearPlatformConfigCache();
  refresh();
}

/** Confere se a chave da Anthropic funciona (lista os modelos, sem gastar tokens). */
// Recebe o estado anterior porque é usada com useActionState; não precisa dele.
export async function testAnthropic(previous: ActionState): Promise<ActionState> {
  void previous;
  if (!(await requireAdmin())) return { ok: false, message: "Sem permissão." };
  const key = await platformSecret("anthropic_api_key");
  if (!key) return { ok: false, message: "Nenhuma chave configurada." };
  try {
    const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: 15_000 });
    const page = await client.models.list({ limit: 20 });
    const ids = page.data.map((m) => m.id);
    return {
      ok: true,
      message: `Conexão com a Anthropic funcionando. Modelos disponíveis: ${ids.slice(0, 5).join(", ")}${ids.length > 5 ? "..." : ""}`,
    };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, message: "A Anthropic recusou a chave. Confira se ela foi copiada inteira." };
    if (err instanceof Anthropic.PermissionDeniedError) return { ok: false, message: "A chave não tem permissão para usar a API." };
    if (err instanceof Anthropic.APIError) return { ok: false, message: `A Anthropic respondeu com erro ${err.status ?? ""}.` };
    return { ok: false, message: "Não foi possível falar com a Anthropic agora." };
  }
}
