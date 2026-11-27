/**
 * Maturidade comercial: notas de 0 a 100 por dimensão, calculadas com os dados
 * reais. Dimensão sem dados fica "não medida" e não entra na média.
 */

export interface MaturityInput {
  openOpps: { next_step_at: string | null; last_activity_at: string }[];
  staleDays: number;
  /** Relatórios enviados nos últimos 30 dias e quantos eram esperados (null = sem relatório configurado). */
  reports: { sent: number; expected: number } | null;
  /** Notas gerais das análises de conversa dos últimos 90 dias. */
  analysisScores: number[];
  /** Treinamentos indicados nos últimos 90 dias. */
  trainings: { status: string }[];
  /** Ações com prazo nos últimos 30 dias. */
  actions: { status: string; due_date: string; completed_at: string | null }[];
  now?: Date;
}

export interface Dimension {
  key: string;
  label: string;
  score: number | null;
  detail: string;
  tip: string;
}

const pct = (part: number, total: number) => Math.round((part / total) * 100);

export function maturityLevel(score: number): string {
  if (score >= 80) return "Avançada";
  if (score >= 60) return "Consistente";
  if (score >= 40) return "Em estruturação";
  return "Inicial";
}

export function computeMaturity(i: MaturityInput): { overall: number; level: string; dimensions: Dimension[] } {
  const now = (i.now ?? new Date()).getTime();
  const nowIso = new Date(now).toISOString();
  const dims: Dimension[] = [];

  const open = i.openOpps.length;
  const withNext = i.openOpps.filter((o) => o.next_step_at && o.next_step_at >= nowIso).length;
  dims.push({
    key: "processo",
    label: "Processo",
    score: open ? pct(withNext, open) : null,
    detail: open ? `${withNext} de ${open} negociações em aberto têm próximo passo marcado e em dia.` : "Sem negociações em aberto.",
    tip: "Toda negociação em aberto precisa de um próximo passo com data.",
  });

  const fresh = i.openOpps.filter((o) => now - Date.parse(o.last_activity_at) < i.staleDays * 86_400_000).length;
  dims.push({
    key: "dados",
    label: "Dados atualizados",
    score: open ? pct(fresh, open) : null,
    detail: open ? `${fresh} de ${open} negociações tiveram movimento nos últimos ${i.staleDays} dias.` : "Sem negociações em aberto.",
    tip: "Registre cada contato importante para o funil mostrar a realidade.",
  });

  dims.push({
    key: "rotina",
    label: "Rotina de relatório",
    score: i.reports && i.reports.expected ? Math.min(100, pct(i.reports.sent, i.reports.expected)) : null,
    detail: i.reports && i.reports.expected ? `${i.reports.sent} de ${i.reports.expected} relatórios esperados nos últimos 30 dias.` : "Relatório diário ainda não configurado.",
    tip: "O relatório do dia é o que permite cruzar o que foi dito com o que foi feito.",
  });

  const avg = i.analysisScores.length ? i.analysisScores.reduce((s, n) => s + n, 0) / i.analysisScores.length : null;
  dims.push({
    key: "conversas",
    label: "Qualidade das conversas",
    score: avg === null ? null : Math.round(avg * 10),
    detail: avg === null ? "Nenhuma conversa analisada nos últimos 90 dias." : `Nota média ${avg.toFixed(1).replace(".", ",")}/10 em ${i.analysisScores.length} análise(s).`,
    tip: "Analise conversas toda semana para o time ver onde melhorar.",
  });

  const active = i.trainings.filter((t) => t.status !== "dismissed");
  const done = active.filter((t) => t.status === "completed").length;
  dims.push({
    key: "desenvolvimento",
    label: "Desenvolvimento do time",
    score: active.length ? pct(done, active.length) : null,
    detail: active.length ? `${done} de ${active.length} treinamentos indicados foram concluídos.` : "Nenhum treinamento indicado nos últimos 90 dias.",
    tip: "Indique treinamentos a partir das análises e acompanhe a conclusão.",
  });

  const due = i.actions.filter((a) => a.status !== "canceled");
  const onTime = due.filter((a) => a.status === "done" && a.completed_at && a.completed_at.slice(0, 10) <= a.due_date).length;
  dims.push({
    key: "gestao",
    label: "Plano de ação em dia",
    score: due.length ? pct(onTime, due.length) : null,
    detail: due.length ? `${onTime} de ${due.length} ações com prazo nos últimos 30 dias foram feitas no prazo.` : "Nenhuma ação com prazo nos últimos 30 dias.",
    tip: "Ações pequenas, com dono e prazo, e revisão toda semana.",
  });

  const measured = dims.filter((d) => d.score !== null).map((d) => d.score as number);
  const overall = measured.length ? Math.round(measured.reduce((s, n) => s + n, 0) / measured.length) : 0;
  return { overall, level: maturityLevel(overall), dimensions: dims };
}
