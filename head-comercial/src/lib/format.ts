/**
 * Formatação e normalização de dados comerciais (telefone, dinheiro, datas).
 * Funções puras, testadas em format.test.ts.
 */

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------

/**
 * Converte um telefone digitado de qualquer jeito para o padrão internacional
 * (E.164), que é como o WhatsApp identifica o número.
 *   "(11) 98765-4321"   -> "+5511987654321"
 *   "11 8765-4321"      -> "+5511987654321" (celular antigo sem o 9)
 *   "(11) 3456-7890"    -> "+551134567890"  (fixo)
 *   "+1 415 555 2671"   -> "+14155552671"
 * Devolve null quando não dá para entender o número.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let international = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  // "00" só é prefixo internacional quando vem no começo (ex.: "0055 11 ...").
  // Em "(00) ..." é um DDD inválido, não ligação internacional.
  if (trimmed.startsWith("00")) {
    international = true;
    digits = digits.slice(2);
  }

  if (!international) {
    digits = digits.replace(/^0+/, ""); // prefixo de longa distância "0"
    if (digits.length === 10 || digits.length === 11) {
      digits = `55${digits}`;
    } else if (!(digits.startsWith("55") && (digits.length === 12 || digits.length === 13))) {
      return null;
    }
  }

  if (digits.startsWith("55")) {
    const national = digits.slice(2);
    const ddd = national.slice(0, 2);
    let number = national.slice(2);
    if (!/^[1-9][1-9]$/.test(ddd)) return null;
    if (number.length === 8 && /^[6-9]/.test(number)) number = `9${number}`;
    if (number.length === 9 && !number.startsWith("9")) return null;
    if (number.length === 8 && !/^[2-5]/.test(number)) return null;
    if (number.length !== 8 && number.length !== 9) return null;
    return `+55${ddd}${number}`;
  }

  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  return `+${digits}`;
}

/** "+5511987654321" -> "(11) 98765-4321"; outros países ficam no padrão internacional. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+55(\d{2})(\d{4,5})(\d{4})$/);
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`;
  return e164;
}

// ---------------------------------------------------------------------------
// Dinheiro (sempre em centavos no banco)
// ---------------------------------------------------------------------------

/**
 * Lê um valor em reais digitado de formas comuns e devolve centavos.
 *   "R$ 1.500,50" -> 150050   "1500" -> 150000   "1.500" -> 150000   "1500.5" -> 150050
 * Devolve null se não for um número válido; string vazia vira 0.
 */
export function parseMoneyToCents(raw: string | null | undefined): number | null {
  if (raw == null) return 0;
  let s = raw.replace(/R\$|\s/gi, "");
  if (!s) return 0;
  if (s.startsWith("-")) return null;

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(".")) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    // "1.500" ou "1.500.000" = separador de milhar; "1500.5" = decimal
    if (parts.length > 2 || last.length === 3) s = parts.join("");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ""] = s.split(".");
  const cents = Number(int) * 100 + Number(dec.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatMoney(cents: number | null | undefined): string {
  return brl.format((cents ?? 0) / 100);
}

/** Valor para preencher um campo de edição: 150050 -> "1500,50". */
export function centsToInput(cents: number | null | undefined): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

// ---------------------------------------------------------------------------
// Datas no fuso da empresa
// ---------------------------------------------------------------------------

function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * Converte data e hora "de parede" no fuso da empresa para um instante UTC.
 *   ("2026-11-24T10:00", "America/Sao_Paulo") -> 2026-11-24T13:00:00.000Z
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (guess.getUTCMonth() !== mo - 1 || guess.getUTCDate() !== d) return null;
  const first = new Date(guess.getTime() - offsetMinutes(guess, timeZone) * 60000);
  // Segunda passada corrige mudanças de horário de verão perto da data.
  return new Date(guess.getTime() - offsetMinutes(first, timeZone) * 60000);
}

/** Instante UTC -> valor para <input type="datetime-local"> no fuso da empresa. */
export function utcToZonedInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const shifted = new Date(d.getTime() + offsetMinutes(d, timeZone) * 60000);
  return shifted.toISOString().slice(0, 16);
}

export function formatDateTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(iso));
}

export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Diz se o próximo passo está vencido, é hoje ou é futuro, no fuso da empresa. */
export function dueState(
  iso: string | null | undefined,
  timeZone: string,
  now: Date = new Date(),
): "none" | "overdue" | "today" | "future" {
  if (!iso) return "none";
  const due = new Date(iso);
  if (due.getTime() < now.getTime()) return "overdue";
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
  return day(due) === day(now) ? "today" : "future";
}

/** Duração curta e legível: 45 -> "menos de 1 min"; 1050 -> "18 min"; 5400 -> "1 h 30 min". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  if (seconds < 60) return "menos de 1 min";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} dia${d > 1 ? "s" : ""}`;
}
