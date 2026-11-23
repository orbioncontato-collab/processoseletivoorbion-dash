"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/modules/auth/actions";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";

export function ResetForm() {
  const [state, action] = useActionState(requestPasswordReset, null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="email" label="E-mail" errors={state?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Enviando...">
        Enviar link
      </SubmitButton>
    </form>
  );
}
