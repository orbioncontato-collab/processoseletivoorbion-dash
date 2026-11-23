import { AlarmClock, CalendarCheck, CalendarClock, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dueState, formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/modules/commercial/schemas";

export function StatusBadge({ status }: { status: "open" | "won" | "lost" }) {
  const variant = status === "won" ? "success" : status === "lost" ? "destructive" : "default";
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

/** Mostra o próximo passo com destaque para vencido e hoje. */
export function NextStepInfo({
  nextStep,
  nextStepAt,
  timeZone,
  status,
}: {
  nextStep: string | null;
  nextStepAt: string | null;
  timeZone: string;
  status: "open" | "won" | "lost";
}) {
  if (status !== "open") return <span className="text-muted-foreground">-</span>;
  const state = dueState(nextStepAt, timeZone);
  if (!nextStep) {
    return (
      <span className="inline-flex items-center gap-1 text-warning">
        <CircleDashed className="size-3.5" aria-hidden /> Sem próximo passo
      </span>
    );
  }
  const Icon = state === "overdue" ? AlarmClock : state === "today" ? CalendarCheck : CalendarClock;
  const color = state === "overdue" ? "text-destructive" : state === "today" ? "text-primary" : "text-muted-foreground";
  const label = state === "overdue" ? "Vencido" : state === "today" ? "Hoje" : null;
  return (
    <div className="min-w-0">
      <p className="truncate">{nextStep}</p>
      {nextStepAt ? (
        <p className={`flex items-center gap-1 text-xs ${color}`}>
          <Icon className="size-3.5" aria-hidden />
          {label ? `${label} · ` : ""}
          {formatDateTime(nextStepAt, timeZone)}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Sem data</p>
      )}
    </div>
  );
}
