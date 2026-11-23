"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, updateProfile } from "@/modules/profile/actions";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";

export function NameForm({ fullName }: { fullName: string }) {
  const [state, action] = useActionState(updateProfile, null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="fullName" label="Nome" errors={state?.fieldErrors?.fullName}>
        <Input name="fullName" defaultValue={fullName} autoComplete="name" required />
      </Field>
      <div>
        <SubmitButton>Salvar nome</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordChangeForm() {
  const [state, action] = useActionState(changePassword, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="current" label="Senha atual" errors={state?.fieldErrors?.current}>
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field
        id="password"
        label="Nova senha"
        errors={state?.fieldErrors?.password}
        hint="Pelo menos 8 caracteres, com letras e números."
      >
        <Input name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field id="confirm" label="Repita a nova senha" errors={state?.fieldErrors?.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <div>
        <SubmitButton>Trocar senha</SubmitButton>
      </div>
    </form>
  );
}
