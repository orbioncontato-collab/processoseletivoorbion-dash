import type { QtyKey } from "./units.ts";

export type Rule = "pos" | "nonneg" | "any" | "absTemp";

export type CategoryId = "solidos" | "termo" | "fluidos" | "calor";

export interface Field {
  id: string;
  label: string;
  symbol: string;
  qty: QtyKey;
  unit: string;
  rule: Rule;
  /** Só aparece nestes modos. */
  modes?: string[];
  /** Só aparece quando este grupo opcional está ativo. */
  group?: string;
  help?: string;
}

export interface Group {
  id: string;
  label: string;
  defaultOn: boolean;
}

export interface Preset {
  label: string;
  values: Record<string, [string, string]>;
}

export interface Example {
  mode?: string;
  groups?: string[];
  values: Record<string, [string, string]>;
}

export interface ResultItem {
  label: string;
  symbol?: string;
  value: number | string;
  unit?: string;
}

export interface Step {
  title: string;
  formula: string;
  subst: string;
  result: string;
}

export interface Output {
  main: ResultItem;
  others: ResultItem[];
  steps: Step[];
  explanation: string[];
  warnings: string[];
  viz: Record<string, unknown>;
}

export interface Inputs {
  /** Valores convertidos para o SI. */
  si: Record<string, number>;
  /** Valores como digitados, com a unidade escolhida. */
  raw: Record<string, { v: number; unit: string }>;
  mode: string;
  groups: Set<string>;
}

export type Fmt = (x: number) => string;

export interface Calc {
  slug: string;
  num: string;
  name: string;
  category: CategoryId;
  icon: string;
  short: string;
  desc: string;
  hint: string;
  keywords: string;
  modeLabel?: string;
  modes?: { id: string; label: string }[];
  groups?: Group[];
  fields: Field[];
  presetLabel?: string;
  presets?: Preset[];
  example: Example;
  validate?: (i: Inputs) => Record<string, string> | null;
  compute: (i: Inputs, f: Fmt) => Output;
  formulas: string[];
  hypotheses: string[];
}
