export const ACTION_STATUS: Record<string, string> = { open: "A fazer", doing: "Fazendo", done: "Feito", canceled: "Cancelado" };
export const ACTION_PRIORITY: Record<string, string> = { high: "Alta", medium: "Média", low: "Baixa" };
export const ACTION_SOURCE: Record<string, string> = {
  leader: "Pelo líder",
  self: "Pela própria pessoa",
  agent: "Pelo Gestor de Projetos",
  analysis: "Pela análise de conversa",
  alert: "Por um alerta",
};

/** Prazo em relação a hoje (datas no formato AAAA-MM-DD). */
export function dueLabel(due: string | null, today: string, status: string): { text: string; tone: "danger" | "warning" | "default" } | null {
  if (!due) return null;
  const [y, m, d] = due.split("-");
  const date = `${d}/${m}/${y}`;
  if (status === "done" || status === "canceled") return { text: `Prazo ${date}`, tone: "default" };
  if (due < today) return { text: `Atrasada desde ${date}`, tone: "danger" };
  if (due === today) return { text: "Vence hoje", tone: "warning" };
  return { text: `Prazo ${date}`, tone: "default" };
}
