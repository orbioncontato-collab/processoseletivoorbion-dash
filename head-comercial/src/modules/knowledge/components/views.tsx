import { Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import { archiveDocument, archiveMemory } from "@/modules/knowledge/actions";
import { KIND_LABELS, MEMORY_CATEGORIES, OUTCOME_LABELS } from "@/modules/knowledge/labels";

const DEFAULT_TZ = "America/Sao_Paulo";

export function SearchBox({ q, placeholder }: { q: string; placeholder: string }) {
  return (
    <form role="search" className="flex gap-2">
      <Input name="q" defaultValue={q} placeholder={placeholder} aria-label="Buscar no conhecimento" maxLength={300} />
      <Button type="submit" variant="outline">
        Buscar
      </Button>
    </form>
  );
}

export interface Hit {
  chunk_id: string;
  title: string;
  kind: string;
  scope: string;
  heading: string | null;
  content: string;
}

export function SearchResults({ q, hits }: { q: string; hits: Hit[] }) {
  if (!q) return null;
  if (!hits.length) return <p className="text-sm text-muted-foreground">Nada encontrado para “{q}”.</p>;
  return (
    <ol className="grid gap-3" aria-label="Resultados da busca">
      {hits.map((h) => (
        <li key={h.chunk_id} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{h.title}</span>
            <Badge variant="outline">{KIND_LABELS[h.kind] ?? h.kind}</Badge>
            {h.scope === "global" ? <Badge>Metodologia Orbion</Badge> : null}
          </div>
          {h.heading ? <p className="mt-1 text-xs text-muted-foreground">{h.heading}</p> : null}
          <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-sm">{h.content}</p>
        </li>
      ))}
    </ol>
  );
}

export interface DocRow {
  id: string;
  title: string;
  kind: string;
  tags: string[];
  source: string;
  file_name: string | null;
  chunk_count: number;
  status: string;
  created_at: string;
}

export function DocumentList({ docs, canEdit, tz = DEFAULT_TZ }: { docs: DocRow[]; canEdit: boolean; tz?: string }) {
  if (!docs.length) return <p className="text-sm text-muted-foreground">Nenhum documento cadastrado ainda.</p>;
  return (
    <ul className="divide-y rounded-lg border" aria-label="Documentos">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{d.title}</p>
            <p className="text-xs text-muted-foreground">
              {KIND_LABELS[d.kind] ?? d.kind} · {d.chunk_count} trecho(s) · {d.file_name ?? "texto colado"} ·{" "}
              {formatDateTime(d.created_at, tz)}
            </p>
            {d.tags.length ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {d.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {d.status === "error" ? <Badge variant="destructive">Falhou</Badge> : null}
            {d.status === "processing" ? <Badge variant="warning">Processando</Badge> : null}
            {canEdit ? (
              <form action={archiveDocument}>
                <input type="hidden" name="id" value={d.id} />
                <Button type="submit" variant="ghost" size="sm" aria-label={`Arquivar ${d.title}`}>
                  <Archive aria-hidden />
                  Arquivar
                </Button>
              </form>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export interface CaseRow {
  id: string;
  title: string;
  outcome: string;
  conversation: string;
  expected_assessment: string;
  created_at: string;
}

export function CalibrationList({ cases }: { cases: CaseRow[] }) {
  if (!cases.length) return <p className="text-sm text-muted-foreground">Nenhum caso cadastrado ainda.</p>;
  return (
    <ul className="grid gap-3" aria-label="Casos de calibragem">
      {cases.map((c) => (
        <li key={c.id} className="rounded-lg border">
          <details>
            <summary className="flex cursor-pointer flex-wrap items-center gap-2 p-3 text-sm font-medium">
              {c.title}
              <Badge variant="outline">{OUTCOME_LABELS[c.outcome] ?? c.outcome}</Badge>
            </summary>
            <div className="grid gap-3 border-t p-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Conversa</p>
                <p className="max-h-64 overflow-y-auto whitespace-pre-line">{c.conversation}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avaliação esperada</p>
                <p className="whitespace-pre-line">{c.expected_assessment}</p>
              </div>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

const SOURCE_LABELS: Record<string, string> = { manual: "registrado por", agent: "aprendido pelo agente", report: "vindo do relatório", system: "sistema" };

export interface MemoryRow {
  id: string;
  category: string;
  content: string;
  source: string;
  created_at: string;
  authorName: string;
}

export function MemoryList({ items, canEdit, empty, tz = DEFAULT_TZ }: { items: MemoryRow[]; canEdit: boolean; empty: string; tz?: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {items.map((m) => (
        <li key={m.id} className="flex items-start justify-between gap-3 p-3">
          <div className="min-w-0">
            <Badge variant="outline">{MEMORY_CATEGORIES[m.category] ?? m.category}</Badge>
            <p className="mt-1 whitespace-pre-line text-sm">{m.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {m.source === "manual" ? `${SOURCE_LABELS.manual} ${m.authorName}` : SOURCE_LABELS[m.source]} ·{" "}
              {formatDateTime(m.created_at, tz)}
            </p>
          </div>
          {canEdit ? (
            <form action={archiveMemory}>
              <input type="hidden" name="id" value={m.id} />
              <Button type="submit" variant="ghost" size="sm" aria-label="Arquivar registro">
                <Archive aria-hidden />
                Arquivar
              </Button>
            </form>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
