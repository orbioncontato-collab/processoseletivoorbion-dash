import { parseMoneyToCents, zonedLocalToUtc } from "@/lib/format";

/**
 * Regras do relatório diário. Funções puras, testadas em rules.test.ts.
 */

export const QUESTION_KINDS = {
  number: "Número",
  currency: "Valor em reais",
  text: "Texto",
  single_choice: "Escolha única",
  multi_choice: "Várias escolhas",
  yes_no: "Sim ou não",
} as const;
export type QuestionKind = keyof typeof QUESTION_KINDS;

export const METRICS = {
  wa_conversations: "Conversas no WhatsApp no dia",
  wa_conversations_started: "Conversas novas no WhatsApp",
  wa_messages_sent: "Mensagens enviadas no WhatsApp",
  opportunities_created: "Oportunidades criadas",
  opportunities_won: "Oportunidades ganhas",
  revenue_won: "Valor ganho",
  stage_entries: "Oportunidades que entraram na etapa",
} as const;
export type MetricKey = keyof typeof METRICS;

/** Números que dependem do WhatsApp conectado: sem conexão, não há como comparar. */
export const WHATSAPP_METRICS: MetricKey[] = ["wa_conversations", "wa_conversations_started", "wa_messages_sent"];

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

function ymdInZone(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
}

function addDays(ymd: string, days: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Dia da semana no padrão ISO (segunda = 1, domingo = 7). */
export function isoWeekday(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

/** Início e fim de um dia no fuso da empresa, em UTC. */
export function dayRange(ymd: string, timeZone: string) {
  const start = zonedLocalToUtc(`${ymd}T00:00`, timeZone)!;
  const end = zonedLocalToUtc(`${addDays(ymd, 1)}T00:00`, timeZone)!;
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Data de referência do relatório que já está liberado para resposta.
 *  - same_day: o relatório de um dia abre no próprio dia, no horário configurado.
 *  - previous_day: o relatório de um dia abre no dia seguinte, no horário configurado.
 * Só conta dias de trabalho configurados. Procura até 14 dias para trás.
 */
export function dueReferenceDate(
  now: Date,
  timeZone: string,
  scheduleTime: string,
  reference: "same_day" | "previous_day",
  weekdays: number[],
): string | null {
  const hhmm = scheduleTime.slice(0, 5);
  const today = ymdInZone(now, timeZone);
  for (let back = 0; back <= 14; back++) {
    const day = addDays(today, -back);
    if (!weekdays.includes(isoWeekday(day))) continue;
    const opensOn = reference === "same_day" ? day : addDays(day, 1);
    const opensAt = zonedLocalToUtc(`${opensOn}T${hhmm}`, timeZone);
    if (opensAt && opensAt.getTime() <= now.getTime()) return day;
  }
  return null;
}

export interface QuestionDef {
  id: string;
  label: string;
  kind: QuestionKind;
  options: string[];
  required: boolean;
}

export interface AnswerValue {
  question_id: string;
  value_number: number | null;
  value_text: string | null;
  value_options: string[] | null;
}

/**
 * Valida as respostas do formulário. Valor em reais vira centavos em value_number.
 * Campos chegam como `q_<id>` (e várias escolhas como valores repetidos).
 */
export function parseAnswers(
  questions: QuestionDef[],
  get: (name: string) => string,
  getAll: (name: string) => string[],
): { answers: AnswerValue[]; errors: Record<string, string> } {
  const answers: AnswerValue[] = [];
  const errors: Record<string, string> = {};

  for (const q of questions) {
    const name = `q_${q.id}`;
    const raw = (get(name) ?? "").trim();
    const empty = { question_id: q.id, value_number: null, value_text: null, value_options: null };

    if (q.kind === "multi_choice") {
      const picked = getAll(name).filter((v) => q.options.includes(v));
      if (!picked.length && q.required) errors[q.id] = "Escolha pelo menos uma opção.";
      else answers.push({ ...empty, value_options: picked });
      continue;
    }
    if (!raw) {
      if (q.required) errors[q.id] = "Resposta obrigatória.";
      else answers.push(empty);
      continue;
    }
    switch (q.kind) {
      case "number": {
        const n = Number(raw.replace(/\./g, "").replace(",", "."));
        if (!Number.isFinite(n) || n < 0 || n > 1_000_000_000) errors[q.id] = "Informe um número igual ou maior que zero.";
        else answers.push({ ...empty, value_number: n });
        break;
      }
      case "currency": {
        const cents = parseMoneyToCents(raw);
        if (cents === null) errors[q.id] = "Valor inválido. Ex.: 1.500,00";
        else answers.push({ ...empty, value_number: cents });
        break;
      }
      case "single_choice":
        if (!q.options.includes(raw)) errors[q.id] = "Escolha uma das opções.";
        else answers.push({ ...empty, value_text: raw });
        break;
      case "yes_no":
        if (raw !== "sim" && raw !== "nao") errors[q.id] = "Responda sim ou não.";
        else answers.push({ ...empty, value_text: raw });
        break;
      default:
        if (raw.length > 4000) errors[q.id] = "Máximo de 4000 caracteres.";
        else answers.push({ ...empty, value_text: raw });
    }
  }
  return { answers, errors };
}

export interface DivergenceCheck {
  direction: "above" | "below";
  difference: number;
}

/**
 * Compara o informado com o capturado. Diferença dentro da margem não conta.
 * Margem = maior entre a tolerância absoluta e o percentual sobre o maior dos dois.
 * Em valores em reais, a tolerância absoluta vem em reais e o resto em centavos.
 */
export function checkDivergence(
  declared: number,
  captured: number,
  tolerancePct: number,
  toleranceAbs: number,
  kind: "number" | "currency" = "number",
): DivergenceCheck | null {
  const abs = kind === "currency" ? toleranceAbs * 100 : toleranceAbs;
  const margin = Math.max(abs, (tolerancePct / 100) * Math.max(declared, captured));
  const difference = declared - captured;
  if (Math.abs(difference) <= margin) return null;
  return { direction: difference > 0 ? "above" : "below", difference };
}
