// Leitura e exibição de números no padrão brasileiro.

export type Parsed = { kind: "ok"; value: number } | { kind: "empty" } | { kind: "error"; error: string };

const INVALIDO = "Digite apenas números (ex.: 12,5 ou 4,7e-6).";

export function parseNumber(raw: string): Parsed {
  const s = raw.trim().replace(/\s+/g, "").replace(/−/g, "-");
  if (!s) return { kind: "empty" };
  const m = s.match(/^([+-]?)([\d.,]*\d[\d.,]*|[\d]*[.,]\d+)(?:[eE]([+-]?\d+))?$/);
  if (!m) return { kind: "error", error: INVALIDO };
  const [, sign, body, exp] = m;
  const commas = (body.match(/,/g) || []).length;
  const dots = (body.match(/\./g) || []).length;
  let norm: string;
  if (commas > 1) return { kind: "error", error: "Use só uma vírgula para separar os decimais." };
  if (commas === 1) {
    const [int, dec] = body.split(",");
    if (dots > 0) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(int)) {
        return { kind: "error", error: "Ponto de milhar fora do lugar. Exemplo correto: 1.234,5" };
      }
      norm = int.replace(/\./g, "") + "." + dec;
    } else {
      norm = (int || "0") + "." + dec;
    }
  } else if (dots === 0) {
    norm = body;
  } else if (dots === 1) {
    const [int, dec] = body.split(".");
    if (/^[1-9]\d{0,2}$/.test(int) && /^\d{3}$/.test(dec)) {
      return {
        kind: "error",
        error: `"${body}" é ambíguo. Escreva ${int}${dec} (milhar) ou ${int},${dec} (decimal).`,
      };
    }
    norm = (int || "0") + "." + dec;
  } else {
    if (!/^\d{1,3}(\.\d{3})+$/.test(body)) return { kind: "error", error: INVALIDO };
    norm = body.replace(/\./g, "");
  }
  const v = Number(sign + norm + (exp ? "e" + exp : ""));
  if (!Number.isFinite(v)) return { kind: "error", error: INVALIDO };
  return { kind: "ok", value: v };
}

const SUP: Record<string, string> = {
  "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹",
};

function plain(x: number, dec: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: dec }).format(x);
}

/** Formata com até `dec` casas. Valores muito pequenos ou muito grandes vão para notação científica. */
export function formatNumber(x: number, dec: number): string {
  if (!Number.isFinite(x)) return "—";
  if (x === 0 || Math.abs(x) < 1e-300) return "0";
  const ax = Math.abs(x);
  if (ax < 1e-2 || ax >= 1e12) {
    let e = Math.floor(Math.log10(ax));
    let mant = x / Math.pow(10, e);
    const r = Number(mant.toFixed(dec));
    if (Math.abs(r) >= 10) {
      e += 1;
      mant = x / Math.pow(10, e);
    }
    const exp = String(e).split("").map((c) => SUP[c] ?? c).join("");
    return `${plain(mant, dec)} × 10${exp}`;
  }
  const out = plain(x, dec);
  return out === "-0" ? "0" : out;
}

/** Converte um número para texto editável no campo (vírgula decimal, sem milhar). */
export function toInputText(x: number): string {
  return String(x).replace(".", ",");
}
