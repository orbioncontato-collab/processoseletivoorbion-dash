"use client";

import { useActionState } from "react";
import { setPassword } from "@/modules/auth/actions";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";

export function PasswordForm() {
  const [state, action] = useActionState(setPassword, null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        id="password"
        label="Nova senha"
        errors={state?.fieldErrors?.password}
        hint="Pelo menos 8 caracteres, com letras e números."
      >
        <Input name="password" type="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field id="confirm" label="Repita a senha" errors={state?.fieldErrors?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full">Salvar senha e entrar</SubmitButton>
    </form>
  );
}
