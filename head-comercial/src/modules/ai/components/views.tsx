import Link from "next/link";
import { Archive, Bot, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { archiveThread } from "@/modules/ai/chat-actions";
import { TOOL_LABELS_PUBLIC } from "@/modules/ai/labels";

export function AiNotConfigured() {
  return (
    <Alert>
      A IA ainda não está configurada nesta instalação. Quando a chave da Anthropic for adicionada, o chat e a análise de
      conversas passam a funcionar aqui.
    </Alert>
  );
}

export function ThreadList({ threads, current, tz }: { threads: { id: string; title: string; updated_at: string }[]; current?: string; tz: string }) {
  return (
    <nav aria-label="Conversas com o Head" className="grid gap-1">
      <Link href="/assistente" className="rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-secondary">
        + Nova conversa
      </Link>
      {threads.map((t) => (
        <Link
          key={t.id}
          href={`/assistente/${t.id}`}
          aria-current={t.id === current ? "page" : undefined}
          className={cn("rounded-md px-3 py-2 text-sm hover:bg-secondary", t.id === current && "bg-secondary font-medium")}
        >
          <span className="block truncate">{t.title}</span>
          <span className="block text-xs text-muted-foreground">{formatDateTime(t.updated_at, tz)}</span>
        </Link>
      ))}
    </nav>
  );
}

export interface ChatMessage {
  id: string;
  role: string;
  agent: string | null;
  content: string;
  tools_used: string[];
  created_at: string;
}

export function MessageList({ messages, tz }: { messages: ChatMessage[]; tz: string }) {
  return (
    <ol className="grid gap-4" aria-label="Mensagens">
      {messages.map((m) =>
        m.role === "user" ? (
          <li key={m.id} className="max-w-[85%] justify-self-end rounded-lg bg-accent px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
            <p className="mt-1 text-right text-[11px] text-muted-foreground">{formatDateTime(m.created_at, tz)}</p>
          </li>
        ) : (
          <li key={m.id} className="max-w-[92%] justify-self-start rounded-lg border bg-card px-3 py-2 text-sm">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <Bot className="size-3.5" aria-hidden />
              Head Comercial
            </p>
            <div className="whitespace-pre-wrap break-words">{m.content}</div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {m.tools_used.length ? `Consultou: ${m.tools_used.map((t) => TOOL_LABELS_PUBLIC[t] ?? t).join(", ")} · ` : ""}
              {formatDateTime(m.created_at, tz)}
            </p>
          </li>
        ),
      )}
    </ol>
  );
}

export function ArchiveThreadButton({ id }: { id: string }) {
  return (
    <form action={archiveThread}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm">
        <Archive aria-hidden />
        Arquivar conversa
      </Button>
    </form>
  );
}

export interface AnalysisRow {
  id: string;
  summary: string;
  score: number | null;
  stage_reached: string | null;
  criteria: unknown;
  strengths: string[];
  failures: string[];
  objections: string[];
  recommendations: string[];
  next_step: string | null;
  created_at: string;
}

function Items({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisView({ analysis, tz }: { analysis: AnalysisRow; tz: string }) {
  const criteria = Array.isArray(analysis.criteria) ? (analysis.criteria as { nome: string; nota: number; comentario: string }[]) : [];
  return (
    <article className="grid gap-4" aria-label="Análise da conversa">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-primary" aria-hidden />
        <span className="text-sm font-medium">Nota {analysis.score ?? "-"}/10</span>
        {analysis.stage_reached ? <Badge variant="outline">{analysis.stage_reached}</Badge> : null}
        <span className="text-xs text-muted-foreground">{formatDateTime(analysis.created_at, tz)}</span>
      </div>
      <p className="text-sm">{analysis.summary}</p>
      {criteria.length ? (
        <ul className="grid gap-2" aria-label="Critérios">
          {criteria.map((c) => (
            <li key={c.nome} className="text-sm">
              <span className="font-medium">
                {c.nome}: {c.nota}/10
              </span>
              <span className="block text-muted-foreground">{c.comentario}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Items title="Pontos fortes" items={analysis.strengths} />
      <Items title="O que melhorar" items={analysis.failures} />
      <Items title="Objeções do cliente" items={analysis.objections} />
      <Items title="Recomendações" items={analysis.recommendations} />
      {analysis.next_step ? (
        <p className="rounded-md bg-secondary px-3 py-2 text-sm">
          <span className="font-medium">Próximo passo: </span>
          {analysis.next_step}
        </p>
      ) : null}
    </article>
  );
}
