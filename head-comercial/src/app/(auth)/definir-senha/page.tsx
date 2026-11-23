import type { Metadata } from "next";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Criar senha" };

export default function SetPasswordPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Crie sua senha</h1>
        <p className="text-sm text-muted-foreground">
          Ela será usada junto com seu e-mail para entrar no Head Comercial.
        </p>
      </div>
      <PasswordForm />
    </div>
  );
}
