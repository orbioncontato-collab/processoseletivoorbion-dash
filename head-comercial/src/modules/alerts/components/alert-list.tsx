import Link from "next/link";
import { AlarmClock, CalendarCheck, CircleDashed, ClipboardX, Hourglass, MessageCircleWarning, Scale, TrendingDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { setAlertStatus } from "@/modules/alerts/actions";
import { alertHref, sortAlerts, type AlertType } from "@/modules/alerts/rules";
import type { AlertRow } from "@/modules/alerts/queries";

const ICON: Record<AlertType, typeof AlarmClock> = {
  next_step_overdue: AlarmClock,
  next_step_today: CalendarCheck,
  no_next_step: CircleDashed,
  stale_opportunity: Hourglass,
  awaiting_reply: MessageCircleWarning,
  low_production: TrendingDown,
  report_missing: ClipboardX,
  divergence_open: Scale,
};

const TONE = { high: "text-destructive", medium: "text-warning", low: "text-muted-foreground" } as const;

function detailLine(a: AlertRow, timeZone: string): string | null {
  const d = a.detail;
  if (a.type === "awaiting_reply" && typeof d.hours === "number") return `Há ${d.hours} hora(s) sem resposta`;
  if (a.type === "stale_opportunity" && typeof d.days === "number") return `Sem movimentação há ${d.days} dia(s)`;
  if ((a.type === "next_step_overdue" || a.type === "next_step_today") && typeof d.next_step_at === "string") {
    return `${d.next_step ?? "Próximo passo"} · ${formatDateTime(d.next_step_at, timeZone)}`;
  }
  if (a.type === "divergence_open") return `Informado ${String(d.declared)} · capturado ${String(d.captured)}`;
  if (a.type === "low_production") return `${String(d.conversations)} conversa(s) e ${String(d.messages)} mensagem(ns) enviada(s)`;
  return null;
}

/** Lista de alertas com link para o lugar certo e opção de dispensar. */
export function AlertList({
  alerts,
  timeZone,
  isLeaderView,
  names,
  limit,
  emptyText = "Nenhuma pendência agora.",
}: {
  alerts: AlertRow[];
  timeZone: string;
  isLeaderView: boolean;
  names?: Record<string, string>;
  limit?: number;
  emptyText?: string;
}) {
  const sorted = sortAlerts(alerts);
  const shown = limit ? sorted.slice(0, limit) : sorted;
  if (!shown.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="divide-y" data-testid="alert-list">
      {shown.map((a) => {
        const Icon = ICON[a.type];
        const detail = detailLine(a, timeZone);
        return (
          <li key={a.id} className="flex items-start gap-3 py-3">
            <Icon className={cn("mt-0.5 size-4 shrink-0", TONE[a.severity])} aria-hidden />
            <div className="min-w-0 flex-1">
              <Link href={alertHref(a, isLeaderView)} className="font-medium text-primary hover:underline">
                {a.title}
              </Link>
              <p className="text-xs text-muted-foreground">
                {names ? `${names[a.user_id] ?? "Ex-membro"}${detail ? " · " : ""}` : ""}
                {detail}
                {a.status === "dismissed" ? " · dispensado" : ""}
              </p>
            </div>
            <form action={setAlertStatus}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="status" value={a.status === "dismissed" ? "open" : "dismissed"} />
              <Button type="submit" variant="ghost" size="icon" aria-label={a.status === "dismissed" ? `Reabrir: ${a.title}` : `Dispensar: ${a.title}`}>
                <X aria-hidden />
              </Button>
            </form>
          </li>
        );
      })}
      {limit && sorted.length > limit ? (
        <li className="pt-3 text-sm">
          <Link href="/alertas" className="text-primary hover:underline">
            Ver todos os {sorted.length} alertas
          </Link>
        </li>
      ) : null}
    </ul>
  );
}
