/**
 * Custo das chamadas à IA, em milionésimos de dólar (micros), para somar sem
 * erro de arredondamento. Preço por milhão de tokens = micros por token.
 */

interface Price {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

const PRICES: Record<string, Price> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  "claude-opus-5": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-opus-4-8": { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  "claude-sonnet-5": { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

export interface UsageTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export const emptyUsage = (): UsageTotals => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });

/** Soma o uso de uma resposta (campos podem vir nulos). */
export function addUsage(
  total: UsageTotals,
  u: { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null },
): UsageTotals {
  return {
    input: total.input + (u.input_tokens ?? 0),
    output: total.output + (u.output_tokens ?? 0),
    cacheRead: total.cacheRead + (u.cache_read_input_tokens ?? 0),
    cacheWrite: total.cacheWrite + (u.cache_creation_input_tokens ?? 0),
  };
}

/** Modelo desconhecido usa o preço do modelo padrão (o mais seguro para não subestimar). */
export function costMicros(model: string, u: UsageTotals): number {
  const p = PRICES[model] ?? PRICES["claude-opus-5-5"];
  return Math.round(u.input * p.input + u.output * p.output + u.cacheRead * p.cacheRead + u.cacheWrite * p.cacheWrite);
}

/** Ex.: 123456 micros -> "US$ 0,12". Valores muito pequenos aparecem como "< US$ 0,01". */
export function formatUsd(micros: number): string {
  const dollars = micros / 1_000_000;
  if (micros > 0 && dollars < 0.01) return "< US$ 0,01";
  return `US$ ${dollars.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
