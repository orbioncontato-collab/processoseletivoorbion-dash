import { describe, expect, it } from "vitest";
import { createCompanySchema, slugify } from "./companies/schemas";
import { inviteMemberSchema, remainingSeats } from "./team/schemas";
import { newPasswordSchema, signInSchema } from "./auth/schemas";

describe("slugify", () => {
  it("remove acentos, espaços e símbolos", () => {
    expect(slugify("Orbion Comunicação Ltda.")).toBe("orbion-comunicacao-ltda");
    expect(slugify("  São João & Cia  ")).toBe("sao-joao-cia");
  });
  it("limita a 60 caracteres sem hífen no final", () => {
    const s = slugify("a".repeat(59) + " b c");
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("createCompanySchema", () => {
  it("gera o identificador pelo nome", () => {
    const r = createCompanySchema.parse({ name: "Empresa Ágil", maxUsers: "6" });
    expect(r).toMatchObject({ slug: "empresa-agil", maxUsers: 6, timezone: "America/Sao_Paulo" });
  });
  it("recusa nome só com símbolos", () => {
    expect(createCompanySchema.safeParse({ name: "!!!" }).success).toBe(false);
  });
  it("recusa fuso horário fora da lista", () => {
    expect(createCompanySchema.safeParse({ name: "Empresa", timezone: "Europe/Paris" }).success).toBe(false);
  });
});

describe("inviteMemberSchema", () => {
  const base = {
    companyId: "2b1f7a52-3a3c-4a0e-9a59-6c6f2c9f6a11",
    email: "  Fulano@Empresa.COM ",
    fullName: " Fulano ",
    role: "seller",
  };
  it("normaliza e-mail e nome", () => {
    expect(inviteMemberSchema.parse(base)).toMatchObject({
      email: "fulano@empresa.com",
      fullName: "Fulano",
    });
  });
  it("recusa papel inexistente e e-mail inválido", () => {
    expect(inviteMemberSchema.safeParse({ ...base, role: "admin" }).success).toBe(false);
    expect(inviteMemberSchema.safeParse({ ...base, email: "sem-arroba" }).success).toBe(false);
  });
});

describe("remainingSeats", () => {
  it("conta vínculos e convites pendentes", () => {
    expect(remainingSeats(6, 4, 1)).toBe(1);
    expect(remainingSeats(6, 5, 3)).toBe(0);
  });
});

describe("senha", () => {
  it("exige 8 caracteres, letra e número e confirmação igual", () => {
    expect(newPasswordSchema.safeParse({ password: "abc12345", confirm: "abc12345" }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: "abcdefgh", confirm: "abcdefgh" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "12345678", confirm: "12345678" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "abc123", confirm: "abc123" }).success).toBe(false);
    expect(newPasswordSchema.safeParse({ password: "abc12345", confirm: "abc12346" }).success).toBe(false);
  });
  it("login normaliza o e-mail", () => {
    expect(signInSchema.parse({ email: " A@B.COM ", password: "x" }).email).toBe("a@b.com");
  });
});
