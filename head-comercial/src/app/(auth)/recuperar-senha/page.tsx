import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ResetPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link para você criar uma nova senha.
        </p>
      </div>
      <ResetForm />
      <Link href="/entrar" className="text-center text-sm text-primary hover:underline">
        Voltar para a entrada
      </Link>
    </div>
  );
}
