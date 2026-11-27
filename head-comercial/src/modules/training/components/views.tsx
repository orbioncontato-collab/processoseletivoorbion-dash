import Link from "next/link";
import { Archive } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { archiveTraining, setAssignmentStatus } from "@/modules/training/actions";
import { FORMAT_LABELS, SKILLS, SOURCE_LABELS, STATUS_LABELS } from "@/modules/training/skills";
import type { AssignmentView } from "@/modules/training/queries";

const skillLabel = (s: string) => SKILLS[s as keyof typeof SKILLS] ?? s;

export interface LibraryItem {
  id: string;
  scope: string;
  title: string;
  summary: string;
  skill: string;
  format: string;
  duration_minutes: number | null;
}

export function LibraryList({ items, canArchive, empty }: { items: LibraryItem[]; canArchive: (i: LibraryItem) => boolean; empty: string }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y rounded-lg border" aria-label="Biblioteca de treinamentos">
      {items.map((t) => (
        <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 p-3">
          <div className="min-w-0">
            <Link href={`/treinamentos/${t.id}`} className="text-sm font-medium text-primary hover:underline">
              {t.title}
            </Link>
            {t.summary ? <p className="text-sm text-muted-foreground">{t.summary}</p> : null}
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline">{skillLabel(t.skill)}</Badge>
              <Badge variant="outline">{FORMAT_LABELS[t.format] ?? t.format}</Badge>
              {t.duration_minutes ? <Badge variant="outline">{t.duration_minutes} min</Badge> : null}
              {t.scope === "global" ? <Badge>Orbion</Badge> : null}
            </div>
          </div>
          {canArchive(t) ? (
            <form action={archiveTraining}>
              <input type="hidden" name="id" value={t.id} />
              <Button type="submit" variant="ghost" size="sm" aria-label={`Arquivar ${t.title}`}>
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

function StatusButton({ id, status, label, variant = "outline" }: { id: string; status: string; label: string; variant?: "outline" | "default" | "ghost" }) {
  return (
    <form action={setAssignmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}

const statusVariant = (s: string) => (s === "completed" ? "success" : s === "started" ? "default" : s === "dismissed" ? "outline" : "warning");

export function AssignmentList({
  items,
  currentUserId,
  isLeader,
  names,
  tz,
  empty,
}: {
  items: AssignmentView[];
  currentUserId: string;
  isLeader: boolean;
  names?: Record<string, string>;
  tz: string;
  empty: string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid gap-3" aria-label="Treinamentos indicados">
      {items.map((a) => {
        const mine = a.user_id === currentUserId;
        return (
          <li key={a.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/treinamentos/${a.training_id}`} className="text-sm font-medium text-primary hover:underline">
                {a.trainingTitle}
              </Link>
              <Badge variant={statusVariant(a.status)}>{STATUS_LABELS[a.status] ?? a.status}</Badge>
              <Badge variant="outline">{skillLabel(a.skill)}</Badge>
              {names ? <span className="text-xs text-muted-foreground">para {names[a.user_id] ?? "Ex-membro"}</span> : null}
            </div>
            <p className="mt-1 text-sm">{a.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {SOURCE_LABELS[a.source] ?? a.source} · {formatDateTime(a.created_at, tz)}
            </p>
            {a.evolution ? <p className="mt-2 rounded-md bg-secondary px-2 py-1 text-xs">{a.evolution}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {mine && a.status === "recommended" ? <StatusButton id={a.id} status="started" label="Começar" variant="default" /> : null}
              {mine && (a.status === "recommended" || a.status === "started") ? <StatusButton id={a.id} status="completed" label="Concluí" /> : null}
              {isLeader && (a.status === "recommended" || a.status === "started") ? <StatusButton id={a.id} status="dismissed" label="Dispensar" variant="ghost" /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
