import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { canEncrypt, decryptSecret, encryptSecret, hintOf } = await import("./secrets");

const KEY = "chave-de-teste-com-mais-de-32-caracteres-123";

afterEach(() => vi.unstubAllEnvs());

describe("cifra das chaves", () => {
  it("cifra e decifra; cada gravação gera um valor diferente", () => {
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", KEY);
    const a = encryptSecret("sk-ant-segredo");
    const b = encryptSecret("sk-ant-segredo");
    expect(a).not.toBe(b);
    expect(a).not.toContain("segredo");
    expect(decryptSecret(a)).toBe("sk-ant-segredo");
  });

  it("valor adulterado ou chave trocada não decifra", () => {
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", KEY);
    const stored = encryptSecret("sk-ant-segredo");
    const [v, iv, tag, data] = stored.split(".");
    expect(decryptSecret([v, iv, tag, data.slice(0, -2) + "AA"].join("."))).toBeNull();
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", `${KEY}-outra`);
    expect(decryptSecret(stored)).toBeNull();
  });

  it("sem chave de cifra (ou curta) não grava", () => {
    vi.stubEnv("SECRETS_ENCRYPTION_KEY", "curta");
    expect(canEncrypt()).toBe(false);
    expect(() => encryptSecret("x")).toThrow(/SECRETS_ENCRYPTION_KEY/);
  });

  it("mostra só o final", () => {
    expect(hintOf("sk-ant-api03-abcdef1234")).toBe("1234");
    expect(hintOf("curta")).toBe("****");
  });
});
