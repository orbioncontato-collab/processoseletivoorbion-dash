import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Termos de uso" };

/** Confere a sessão: sem login vai para a entrada; quem já aceitou vai para o início. */
async function Gate() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  if (user.termsAccepted) redirect("/inicio");
  return <AcceptForm />;
}

export default function AcceptTermsPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold">Antes de começar</h1>
        <p className="text-sm text-muted-foreground">
          Leia os termos de uso e o aviso de privacidade do Head Comercial. Eles explicam como o sistema funciona e como os
          dados são tratados.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
        <Gate />
      </Suspense>
    </div>
  );
}
