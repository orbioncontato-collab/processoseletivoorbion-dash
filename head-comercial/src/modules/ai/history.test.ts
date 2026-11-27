import { describe, expect, it } from "vitest";
import { buildHistory, threadTitle } from "./history";

describe("histórico do chat", () => {
  it("repassa os blocos originais da resposta do agente, incluindo ferramentas", () => {
    const turn = [
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "listar_alertas", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "[]" }] },
      { role: "assistant", content: [{ type: "text", text: "Nenhum alerta." }] },
    ];
    const history = buildHistory([
      { role: "user", content: "Tenho alertas?", blocks: null },
      { role: "assistant", content: "Nenhum alerta.", blocks: turn },
      { role: "user", content: "E amanhã?", blocks: null },
    ]);
    expect(history).toHaveLength(5);
    expect(history[1]).toBe(turn[0]);
    expect(history[4]).toEqual({ role: "user", content: "E amanhã?" });
  });

  it("sem blocos gravados, usa o texto da resposta", () => {
    expect(buildHistory([{ role: "assistant", content: "Oi", blocks: null }])).toEqual([{ role: "assistant", content: "Oi" }]);
  });

  it("título curto a partir da primeira pergunta", () => {
    expect(threadTitle("  O que   eu faço hoje? ")).toBe("O que eu faço hoje?");
    expect(threadTitle("a".repeat(80))).toHaveLength(60);
    expect(threadTitle("   ")).toBe("Nova conversa");
  });
});
