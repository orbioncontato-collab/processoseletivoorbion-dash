import { describe, expect, it } from "vitest";
import { addUsage, costMicros, emptyUsage, formatUsd } from "./pricing";

describe("custo da IA", () => {
  it("soma o uso de várias chamadas, aceitando campos nulos", () => {
    let u = addUsage(emptyUsage(), { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: null, cache_creation_input_tokens: 3000 });
    u = addUsage(u, { input_tokens: 50, output_tokens: 100, cache_read_input_tokens: 3000 });
    expect(u).toEqual({ input: 1050, output: 300, cacheRead: 3000, cacheWrite: 3000 });
  });

  it("calcula em milionésimos de dólar pelo preço do modelo", () => {
    const u = { input: 1_000_000, output: 100_000, cacheRead: 1_000_000, cacheWrite: 0 };
    // Opus 5.5: 4 + 2 + 0,20 = US$ 6,20
    expect(costMicros("claude-opus-5-5", u)).toBe(6_200_000);
    // Modelo de reserva (Opus 4.8): 5 + 2,5 + 0,5 = US$ 8,00
    expect(costMicros("claude-opus-4-8", u)).toBe(8_000_000);
    expect(costMicros("modelo-novo", u)).toBe(6_200_000);
  });

  it("mostra o valor em dólar no formato brasileiro", () => {
    expect(formatUsd(6_200_000)).toBe("US$ 6,20");
    expect(formatUsd(3_000)).toBe("< US$ 0,01");
    expect(formatUsd(0)).toBe("US$ 0,00");
  });
});
