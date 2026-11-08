import type { Calc, Field, Inputs, Output } from "./types.ts";
import { formatNumber, parseNumber } from "./number.ts";
import { toSI } from "./units.ts";

export interface FormState {
  mode: string;
  groups: string[];
  values: Record<string, string>;
  units: Record<string, string>;
}

export interface Evaluation {
  errors: Record<string, string>;
  missing: number;
  output: Output | null;
}

export function defaultMode(calc: Calc): string {
  return calc.example.mode ?? calc.modes?.[0]?.id ?? "";
}

export function emptyState(calc: Calc): FormState {
  return {
    mode: defaultMode(calc),
    groups: (calc.groups ?? []).filter((g) => g.defaultOn).map((g) => g.id),
    values: {},
    units: Object.fromEntries(calc.fields.map((f) => [f.id, f.unit])),
  };
}

export function exampleState(calc: Calc): FormState {
  const s = emptyState(calc);
  s.mode = calc.example.mode ?? s.mode;
  if (calc.example.groups) s.groups = [...calc.example.groups];
  for (const [id, [v, u]] of Object.entries(calc.example.values)) {
    s.values[id] = v;
    s.units[id] = u;
  }
  return s;
}

export function isVisible(f: Field, mode: string, groups: string[]): boolean {
  if (f.modes && !f.modes.includes(mode)) return false;
  if (f.group && !groups.includes(f.group)) return false;
  return true;
}

const MSG = {
  empty: "Preencha este campo.",
  pos: "Informe um valor maior que zero.",
  nonneg: "O valor não pode ser negativo.",
  absTemp: "Temperatura abaixo do zero absoluto (−273,15 °C).",
};

export function evaluate(calc: Calc, st: FormState, decimals: number): Evaluation {
  const errors: Record<string, string> = {};
  const si: Record<string, number> = {};
  const raw: Inputs["raw"] = {};
  let missing = 0;
  for (const f of calc.fields) {
    if (!isVisible(f, st.mode, st.groups)) continue;
    const p = parseNumber(st.values[f.id] ?? "");
    if (p.kind === "empty") {
      errors[f.id] = MSG.empty;
      missing++;
      continue;
    }
    if (p.kind === "error") {
      errors[f.id] = p.error;
      continue;
    }
    const unit = st.units[f.id] ?? f.unit;
    const v = toSI(f.qty, unit, p.value);
    if (f.rule === "pos" && !(v > 0)) errors[f.id] = MSG.pos;
    else if (f.rule === "nonneg" && v < 0) errors[f.id] = MSG.nonneg;
    else if (f.rule === "absTemp" && !(v > 0)) errors[f.id] = MSG.absTemp;
    si[f.id] = v;
    raw[f.id] = { v: p.value, unit };
  }
  if (Object.keys(errors).length) return { errors, missing, output: null };
  const inputs: Inputs = { si, raw, mode: st.mode, groups: new Set(st.groups) };
  const extra = calc.validate?.(inputs);
  if (extra) return { errors: extra, missing: 0, output: null };
  const fmt = (x: number) => formatNumber(x, decimals);
  return { errors: {}, missing: 0, output: calc.compute(inputs, fmt) };
}

/** Texto do resultado, para copiar. */
export function resultText(calc: Calc, out: Output, decimals: number): string {
  const v = (x: number | string) => (typeof x === "number" ? formatNumber(x, decimals) : x);
  const line = (r: Output["main"]) => `${r.label}${r.symbol ? ` (${r.symbol})` : ""}: ${v(r.value)}${r.unit ? ` ${r.unit}` : ""}`;
  return [`${calc.num} ${calc.name}`, line(out.main), ...out.others.map(line)].join("\n");
}

export function solutionText(calc: Calc, st: FormState, out: Output, decimals: number): string {
  const dados = calc.fields
    .filter((f) => isVisible(f, st.mode, st.groups))
    .map((f) => `${f.symbol} = ${st.values[f.id]} ${st.units[f.id] === "adim." ? "" : st.units[f.id]}`.trim());
  const passos = out.steps.map((s, k) => `${k + 1}. ${s.title}\n   Fórmula: ${s.formula}\n   Substituição: ${s.subst}\n   Resultado: ${s.result}`);
  return [
    `Calculadora ${calc.num}: ${calc.name}`,
    "",
    "Dados utilizados: " + dados.join("; "),
    "",
    ...passos,
    "",
    resultText(calc, out, decimals),
    "",
    "Explicação: " + out.explanation.join(" "),
  ].join("\n");
}
