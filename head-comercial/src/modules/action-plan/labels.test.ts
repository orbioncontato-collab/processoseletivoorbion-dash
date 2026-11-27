import { describe, expect, it } from "vitest";
import { dueLabel } from "./labels";

describe("prazo das ações", () => {
  it("atrasada, vence hoje, no prazo e encerrada", () => {
    expect(dueLabel("2026-11-20", "2026-11-27", "open")).toEqual({ text: "Atrasada desde 20/11/2026", tone: "danger" });
    expect(dueLabel("2026-11-27", "2026-11-27", "doing")).toEqual({ text: "Vence hoje", tone: "warning" });
    expect(dueLabel("2026-12-02", "2026-11-27", "open")).toEqual({ text: "Prazo 02/12/2026", tone: "default" });
    expect(dueLabel("2026-11-20", "2026-11-27", "done")).toEqual({ text: "Prazo 20/11/2026", tone: "default" });
    expect(dueLabel(null, "2026-11-27", "open")).toBeNull();
  });
});
