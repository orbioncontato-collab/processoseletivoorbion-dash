import type { Metadata } from "next";
import { CURRENT_TERMS_VERSION } from "@/lib/auth/terms";
import { PrivacyContent, TERMS_DRAFT_NOTICE } from "@/modules/legal/content";

export const metadata: Metadata = { title: "Aviso de privacidade" };

export default function PrivacyPage() {
  return (
    <article className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Aviso de privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Versão {CURRENT_TERMS_VERSION}. {TERMS_DRAFT_NOTICE}
        </p>
      </header>
      <PrivacyContent />
    </article>
  );
}
