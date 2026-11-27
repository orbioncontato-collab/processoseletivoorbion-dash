import type { Metadata } from "next";
import { CURRENT_TERMS_VERSION } from "@/lib/auth/terms";
import { TERMS_DRAFT_NOTICE, TermsContent } from "@/modules/legal/content";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermsPage() {
  return (
    <article className="grid gap-6">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">Termos de uso</h1>
        <p className="text-sm text-muted-foreground">
          Versão {CURRENT_TERMS_VERSION}. {TERMS_DRAFT_NOTICE}
        </p>
      </header>
      <TermsContent />
    </article>
  );
}
