"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Chat com o Head. A resposta chega aos poucos pela rota /api/assistente
 * (uma linha JSON por evento) e, no fim, a página recarrega com a conversa gravada.
 */

type StreamEvent =
  | { type: "thread"; id: string }
  | { type: "tool"; name: string; label: string }
  | { type: "text"; delta: string }
  | { type: "done"; threadId: string; status: string }
  | { type: "error"; message: string; threadId?: string };

interface Live {
  question: string;
  answer: string;
  tools: string[];
}

export function ChatForm({ threadId, suggestions = [] }: { threadId?: string; suggestions?: string[] }) {
  const router = useRouter();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [, startTransition] = useTransition();

  async function submit(message: string) {
    setError(null);
    setSending(true);
    setLive({ question: message, answer: "", tools: [] });
    let thread = threadId ?? null;
    let failed: string | null = null;
    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: threadId ?? null, message }),
      });
      if (res.ok && !res.headers.get("content-type")?.includes("ndjson")) {
        throw new Error("Sua sessão expirou. Entre de novo para continuar.");
      }
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Não foi possível enviar a pergunta.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "thread") thread = event.id;
          else if (event.type === "text") setLive((l) => (l ? { ...l, answer: l.answer + event.delta } : l));
          else if (event.type === "tool") setLive((l) => (l && !l.tools.includes(event.label) ? { ...l, tools: [...l.tools, event.label] } : l));
          else if (event.type === "error") failed = event.message;
        }
      }
    } catch (err) {
      failed = err instanceof Error ? err.message : "Não foi possível enviar a pergunta.";
    }
    setSending(false);
    if (failed) setError(failed);
    if (ref.current && !failed) ref.current.value = "";
    // Mostra a conversa gravada e limpa a prévia no mesmo passo, sem piscar.
    startTransition(() => {
      if (thread && thread !== threadId) router.push(`/assistente/${thread}`);
      else router.refresh();
      setLive(null);
    });
  }

  return (
    <div className="grid gap-4">
      {live ? (
        <div className="grid gap-4" aria-label="Resposta em andamento" aria-live="polite">
          <p className="max-w-[85%] justify-self-end whitespace-pre-wrap break-words rounded-lg bg-accent px-3 py-2 text-sm">{live.question}</p>
          <div className="max-w-[92%] justify-self-start rounded-lg border bg-card px-3 py-2 text-sm">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Bot className="size-3.5" aria-hidden />
              Head Comercial
            </p>
            {live.answer ? <div className="whitespace-pre-wrap break-words">{live.answer}</div> : null}
            {sending ? (
              <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {live.tools.length ? `Consultando: ${live.tools.join(", ")}...` : "Pensando..."}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <form
        className="grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const message = ref.current?.value.trim() ?? "";
          if (!message) {
            setError("Escreva sua pergunta.");
            return;
          }
          if (!sending) void submit(message);
        }}
      >
        {error ? <Alert variant="destructive">{error}</Alert> : null}
        {suggestions.length ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  if (ref.current) {
                    ref.current.value = s;
                    ref.current.focus();
                  }
                }}
                className="rounded-full border px-3 py-1 text-xs hover:bg-secondary"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        <label htmlFor="chat-message" className="sr-only">
          Sua pergunta
        </label>
        <textarea
          ref={ref}
          id="chat-message"
          name="message"
          rows={3}
          maxLength={4000}
          placeholder="Pergunte ao Head Comercial"
          disabled={sending}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={sending} aria-label="Enviar pergunta">
            {sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
            Enviar
          </Button>
        </div>
      </form>
    </div>
  );
}
