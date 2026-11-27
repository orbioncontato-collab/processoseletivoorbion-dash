import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { setActionStatus } from "@/modules/action-plan/actions";
import { ACTION_PRIORITY, ACTION_SOURCE, ACTION_STATUS, dueLabel } from "@/modules/action-plan/labels";

export interface ActionRow {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  due_date: string | null;
  priority: string;
  status: string;
  source: string;
}

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setActionStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={status === "done" ? "default" : "outline"}>
        {label}
      </Button>
    </form>
  );
}

export function ActionList({
  items,
  today,
  currentUserId,
  isLeader,
  names,
  empty,
  label = "Ações",
}: {
  items: ActionRow[];
  today: string;
  currentUserId: string;
  isLeader: boolean;
  names?: Record<string, string>;
  empty: string;
  label?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid gap-2" aria-label={label}>
      {items.map((a) => {
        const due = dueLabel(a.due_date, today, a.status);
        const canChange = a.owner_id === currentUserId || isLeader;
        const open = a.status === "open" || a.status === "doing";
        return (
          <li key={a.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{a.title}</span>
              <Badge variant={a.status === "done" ? "success" : a.status === "doing" ? "default" : "outline"}>{ACTION_STATUS[a.status] ?? a.status}</Badge>
              {a.priority === "high" ? <Badge variant="destructive">Prioridade {ACTION_PRIORITY.high.toLowerCase()}</Badge> : null}
              {due ? <Badge variant={due.tone === "danger" ? "destructive" : due.tone === "warning" ? "warning" : "outline"}>{due.text}</Badge> : null}
              {names ? <span className="text-xs text-muted-foreground">{names[a.owner_id] ?? "Ex-membro"}</span> : null}
            </div>
            {a.description ? <p className="mt-1 text-sm text-muted-foreground">{a.description}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">{ACTION_SOURCE[a.source] ?? a.source}</p>
            {canChange && open ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {a.status === "open" ? <StatusButton id={a.id} status="doing" label="Comecei" /> : null}
                <StatusButton id={a.id} status="done" label="Feito" />
                {isLeader ? <StatusButton id={a.id} status="canceled" label="Cancelar" /> : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
