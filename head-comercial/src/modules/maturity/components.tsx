"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { recalculateMaturity } from "./actions";

export function RecalculateButton() {
  const [state, action] = useActionState(recalculateMaturity, null);
  return (
    <form action={action} className="grid gap-2">
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel="Calculando...">Calcular agora</SubmitButton>
      </div>
    </form>
  );
}
