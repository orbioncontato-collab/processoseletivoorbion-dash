/** Funções puras usadas nas consultas (testadas em filters.test.ts). */

/** Remove caracteres que têm significado nos filtros do PostgREST. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[,()*%_\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

/** Início e fim do dia de hoje no fuso da empresa, em UTC. */
export function todayRange(timeZone: string, now: Date = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  const offset = (() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return Math.round((asUtc - now.getTime()) / 60000);
  })();
  const start = new Date(Date.parse(`${ymd}T00:00:00Z`) - offset * 60000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

