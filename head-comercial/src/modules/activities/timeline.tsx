import { Badge } from "@/components/ui/badge";
import { actorLabel, describeActivity, type ActivityRow, type FormatContext } from "./format";

const ACTOR_BADGE: Record<ActivityRow["actor_type"], string> = {
  user: "Pessoa",
  integration: "Integração",
  automation: "Automação",
  agent: "IA",
  system: "Sistema",
};

export function Timeline({ rows, ctx, timeZone }: { rows: ActivityRow[]; ctx: FormatContext; timeZone: string }) {
  if (!rows.length) return <p className="p-6 text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>;
  const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone });
  return (
    <ol className="divide-y">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm">{describeActivity(r, ctx)}</p>
            <p className="text-xs text-muted-foreground">
              por {actorLabel(r, ctx)} · {fmt.format(new Date(r.occurred_at))}
            </p>
          </div>
          <Badge variant="outline" className="self-start sm:self-auto">
            {ACTOR_BADGE[r.actor_type]}
          </Badge>
        </li>
      ))}
    </ol>
  );
}
