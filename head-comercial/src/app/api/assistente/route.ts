import { z } from "zod";
import { getActiveCompany, getCurrentUser } from "@/lib/auth/session";
import { isAiConfigured } from "@/lib/ai/client";
import { ChatError, chatTurn } from "@/modules/ai/chat-service";
import { TOOL_LABELS_PUBLIC } from "@/modules/ai/labels";
import { AGENT_IDS, type AgentId } from "@/modules/ai/agents";

/**
 * Pergunta ao Head com a resposta chegando aos poucos. Devolve uma linha JSON
 * por evento: thread (conversa aberta), tool (consulta em andamento),
 * text (pedaço da resposta), done ou error.
 */
export const maxDuration = 300;

const schema = z.object({
  threadId: z.uuid().nullable().optional(),
  agent: z.enum(AGENT_IDS as [AgentId, ...AgentId[]]).optional(),
  message: z.string().trim().min(1, "Escreva sua pergunta.").max(4000, "Pergunta longa demais."),
});

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Faça login de novo." }, 401);
  if (!user.termsAccepted) return json({ error: "Aceite os termos de uso para continuar." }, 403);
  const company = await getActiveCompany(user);
  if (!company) return json({ error: "Sem empresa ativa." }, 403);
  if (!(await isAiConfigured())) return json({ error: "A IA ainda não está configurada nesta instalação." }, 503);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? "Pedido inválido." }, 400);

  const ctx = {
    companyId: company.companyId,
    companyName: company.companyName,
    userId: user.id,
    userName: user.fullName || user.email,
    role: company.role,
    timezone: company.timezone,
  };

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await chatTurn(
          ctx,
          { threadId: parsed.data.threadId ?? null, message: parsed.data.message, agent: parsed.data.agent },
          {
            onThread: (id) => send({ type: "thread", id }),
            onText: (delta) => send({ type: "text", delta }),
            onTool: (name) => send({ type: "tool", name, label: TOOL_LABELS_PUBLIC[name] ?? name }),
          },
        );
        if (result.status === "error") send({ type: "error", message: result.text, threadId: result.threadId });
        else send({ type: "done", threadId: result.threadId, status: result.status });
      } catch (err) {
        if (!(err instanceof ChatError)) console.error("[api/assistente]", err);
        send({ type: "error", message: err instanceof ChatError ? err.message : "Algo deu errado. Tente de novo em instantes." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
