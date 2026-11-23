import { describe, expect, it } from "vitest";
import { generateSourceKey, hashSourceKey, keyMatches, readKeyFromHeaders } from "./keys";

describe("chaves das fontes", () => {
  it("gera chaves diferentes e só a impressão digital confere", () => {
    const a = generateSourceKey();
    const b = generateSourceKey();
    expect(a.key).not.toBe(b.key);
    expect(a.key.startsWith("hc_")).toBe(true);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(a.hint).toBe(a.key.slice(-4));
    expect(keyMatches(a.key, a.hash)).toBe(true);
    expect(keyMatches(b.key, a.hash)).toBe(false);
    expect(keyMatches("", a.hash)).toBe(false);
    expect(keyMatches(a.key, null)).toBe(false);
    expect(hashSourceKey(a.key)).toBe(a.hash);
  });

  it("lê a chave do Authorization ou do x-api-key", () => {
    expect(readKeyFromHeaders(new Headers({ authorization: "Bearer hc_abc" }))).toBe("hc_abc");
    expect(readKeyFromHeaders(new Headers({ "x-api-key": "hc_xyz" }))).toBe("hc_xyz");
    expect(readKeyFromHeaders(new Headers())).toBe("");
  });
});
