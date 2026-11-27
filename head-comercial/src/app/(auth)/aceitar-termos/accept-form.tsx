"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { acceptTerms } from "@/modules/legal/actions";

export function AcceptForm() {
  const [state, action] = useActionState(acceptTerms, null);
  return (
    <form action={action} className="grid gap-4">
      <FormMessage state={state} />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="accept" className="mt-0.5 size-4" />
        <span>
          Li e aceito os{" "}
          <a href="/termos" target="_blank" className="text-primary underline">
            Termos de uso
          </a>{" "}
          e o{" "}
          <a href="/privacidade" target="_blank" className="text-primary underline">
            Aviso de privacidade
          </a>
          .
        </span>
      </label>
      <SubmitButton>Aceitar e continuar</SubmitButton>
    </form>
  );
}
