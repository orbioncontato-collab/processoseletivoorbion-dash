"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { isAiConfigured } from "@/lib/ai/client";
import type { ActionState } from "@/lib/action-state";
import { AnalysisError, analyzeConversation } from "./analysis";
import { currentAgentContext } from "./context";

export async function requestAnalysis(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAiConfigured())) return { ok: false, message: "A IA ainda não está configurada nesta instalação." };
  const id = String(formData.get("conversationId") ?? "");
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Conversa inválida." };
  const ctx = await currentAgentContext();
  try {
    await analyzeConversation(ctx, id);
  } catch (err) {
    if (err instanceof AnalysisError) return { ok: false, message: err.message };
    console.error("[requestAnalysis]", err);
    return { ok: false, message: "A análise falhou. Tente de novo em instantes." };
  }
  refresh();
  return { ok: true, message: "Análise pronta." };
}
