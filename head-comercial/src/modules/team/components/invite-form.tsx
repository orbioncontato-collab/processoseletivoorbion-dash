"use client";

import { useActionState, useEffect, useRef } from "react";
import { inviteMember } from "@/modules/team/actions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";

export function InviteForm({ companyId, disabled }: { companyId: string; disabled?: boolean }) {
  const [state, action] = useActionState(inviteMember, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="companyId" value={companyId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Nome" errors={state?.fieldErrors?.fullName}>
          <Input name="fullName" autoComplete="off" required disabled={disabled} />
        </Field>
        <Field id="invite-email" label="E-mail" errors={state?.fieldErrors?.email}>
          <Input name="email" type="email" autoComplete="off" required disabled={disabled} />
        </Field>
      </div>
      <Field id="role" label="Papel" errors={state?.fieldErrors?.role} className="sm:max-w-xs">
        <Select name="role" defaultValue="seller" disabled={disabled}>
          <option value="seller">Vendedor</option>
          <option value="leader">Líder</option>
        </Select>
      </Field>
      <div>
        <SubmitButton pendingLabel="Enviando..." disabled={disabled}>
          Enviar convite
        </SubmitButton>
      </div>
    </form>
  );
}
