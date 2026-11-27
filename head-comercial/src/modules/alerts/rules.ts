/**
 * Leitura dos alertas: rótulos, links, ordem de urgência e frases para o líder.
 * Funções puras, testadas em rules.test.ts.
 */

export type AlertType =
  | "next_step_overdue"
  | "next_step_today"
  | "no_next_step"
  | "stale_opportunity"
  | "awaiting_reply"
  | "low_production"
  | "report_missing"
  | "divergence_open";

export type Severity = "high" | "medium" | "low";

export const ALERT_LABELS: Record<AlertType, { one: string; many: string }> = {
  next_step_overdue: { one: "próximo passo vencido", many: "próximos passos vencidos" },
  next_step_today: { one: "próximo passo para hoje", many: "próximos passos para hoje" },
  no_next_step: { one: "oportunidade sem próximo passo", many: "oportunidades sem próximo passo" },
  stale_opportunity: { one: "negociação parada", many: "negociações paradas" },
  awaiting_reply: { one: "cliente esperando resposta", many: "clientes esperando resposta" },
  low_production: { one: "dia com produção abaixo da referência", many: "dias com produção abaixo da referência" },
  report_missing: { one: "relatório pendente", many: "relatórios pendentes" },
  divergence_open: { one: "diferença para conferir", many: "diferenças para conferir" },
};

/** Ordem de leitura: o que costuma custar venda primeiro. */
export const TYPE_ORDER: AlertType[] = [
  "awaiting_reply",
  "next_step_overdue",
  "next_step_today",
  "stale_opportunity",
  "no_next_step",
  "report_missing",
  "divergence_open",
  "low_production",
];

const SEVERITY_WEIGHT: Record<Severity, number> = { high: 3, medium: 2, low: 1 };

export interface AlertLike {
  id: string;
  type: AlertType;
  severity: Severity;
  user_id: string;
  entity_type: string | null;
  entity_id: string | null;
  reference_date: string | null;
  first_seen_at: string;
}

/** Mais urgente primeiro; entre iguais, o mais antigo primeiro. */
export function sortAlerts<T extends AlertLike>(alerts: T[]): T[] {
  return [...alerts].sort(
    (a, b) =>
      SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] ||
      TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) ||
      a.first_seen_at.localeCompare(b.first_seen_at),
  );
}

/** Para onde o alerta leva quando clicado. */
export function alertHref(a: AlertLike, isLeaderView: boolean): string {
  if (a.entity_type === "opportunities" && a.entity_id) return `/oportunidades/${a.entity_id}`;
  if (a.entity_type === "conversations" && a.entity_id) return `/conversas/${a.entity_id}`;
  if (a.type === "divergence_open") return isLeaderView ? "/relatorios" : `/relatorio?data=${a.reference_date ?? ""}`;
  if (a.type === "report_missing") return isLeaderView ? "/relatorios" : `/relatorio?data=${a.reference_date ?? ""}`;
  if (a.type === "low_production") return "/conversas";
  return "/alertas";
}

/** Junta itens em português: "a", "a e b", "a, b e c". */
export function joinPt(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

export function countByType(alerts: Pick<AlertLike, "type">[]): Partial<Record<AlertType, number>> {
  const out: Partial<Record<AlertType, number>> = {};
  for (const a of alerts) out[a.type] = (out[a.type] ?? 0) + 1;
  return out;
}

/** Frase curta com os alertas de uma pessoa: "3 próximos passos vencidos e 1 relatório pendente". */
export function describeCounts(counts: Partial<Record<AlertType, number>>, max = 3): string {
  const parts = TYPE_ORDER.filter((t) => counts[t]).map((t) => {
    const n = counts[t]!;
    return `${n} ${n === 1 ? ALERT_LABELS[t].one : ALERT_LABELS[t].many}`;
  });
  if (!parts.length) return "Nada pendente.";
  const shown = parts.slice(0, max);
  const rest = parts.length - shown.length;
  return joinPt(rest ? [...shown, `mais ${rest} tipo(s) de pendência`] : shown);
}

/** Pontuação de atenção: alertas graves pesam mais. */
export function attentionScore(alerts: Pick<AlertLike, "severity">[]): number {
  return alerts.reduce((s, a) => s + SEVERITY_WEIGHT[a.severity], 0);
}

export interface PersonReading {
  userId: string;
  name: string;
  score: number;
  high: number;
  total: number;
  sentence: string;
}

/** Quem merece atenção, do mais para o menos urgente. Pessoas sem alerta ficam de fora. */
export function rankPeople(alerts: AlertLike[], names: Record<string, string>): PersonReading[] {
  const byUser = new Map<string, AlertLike[]>();
  for (const a of alerts) byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a]);
  return [...byUser.entries()]
    .map(([userId, list]) => ({
      userId,
      name: names[userId] ?? "Ex-membro",
      score: attentionScore(list),
      high: list.filter((a) => a.severity === "high").length,
      total: list.length,
      sentence: describeCounts(countByType(list)),
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt-BR"));
}

/** Leitura do time em uma ou duas frases. */
export function teamReading(alerts: AlertLike[], names: Record<string, string>): string {
  if (!alerts.length) return "Nenhuma pendência no time agora.";
  const ranking = rankPeople(alerts, names);
  const counts = countByType(alerts);
  const top = TYPE_ORDER.find((t) => counts[t]);
  const first = `O time tem ${describeCounts(counts, 2)}.`;
  if (!top || ranking.length < 2) return `${first} Comece por ${ranking[0].name}.`;
  const owners = alerts.filter((a) => a.type === top);
  const byOwner = rankPeople(owners, names);
  const share = byOwner[0].total / owners.length;
  const concentration = share >= 0.6 && owners.length >= 2 ? ` A maior parte dos casos de ${ALERT_LABELS[top].many} está com ${byOwner[0].name}.` : "";
  return `${first}${concentration} Quem merece atenção primeiro: ${ranking[0].name}.`;
}
