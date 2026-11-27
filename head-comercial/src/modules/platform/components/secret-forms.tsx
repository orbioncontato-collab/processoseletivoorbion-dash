"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { saveSecret, testAnthropic } from "@/modules/platform/actions";

export function SecretForm({ name, label, type = "password", placeholder, disabled }: { name: string; label: string; type?: string; placeholder?: string; disabled?: boolean }) {
  const [state, action] = useActionState(saveSecret, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="name" value={name} />
      <Field id={`secret-${name}`} label={label} errors={state?.fieldErrors?.value}>
        <Input name="value" type={type} autoComplete="off" placeholder={placeholder} disabled={disabled} />
      </Field>
      <div>
        <SubmitButton disabled={disabled}>Salvar</SubmitButton>
      </div>
    </form>
  );
}

export function TestAnthropicButton() {
  const [state, action] = useActionState(testAnthropic, null);
  return (
    <form action={action} className="grid gap-2">
      <FormMessage state={state} />
      <div>
        <SubmitButton variant="outline" pendingLabel="Testando...">
          Testar conexão
        </SubmitButton>
      </div>
    </form>
  );
}
