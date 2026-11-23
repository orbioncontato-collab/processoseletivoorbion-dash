"use client";

import { useActionState } from "react";
import { createCompany } from "@/modules/companies/actions";
import { TIMEZONES } from "@/modules/companies/schemas";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";

export function CreateCompanyForm() {
  const [state, action] = useActionState(createCompany, null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="name" label="Nome da empresa" errors={state?.fieldErrors?.name}>
        <Input name="name" required />
      </Field>
      <Field
        id="slug"
        label="Identificador (opcional)"
        errors={state?.fieldErrors?.slug}
        hint="Gerado pelo nome se ficar em branco. Ex.: orbion"
      >
        <Input name="slug" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="timezone" label="Fuso horário" errors={state?.fieldErrors?.timezone}>
          <Select name="timezone" defaultValue="America/Sao_Paulo">
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace("America/", "").replace("_", " ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="maxUsers" label="Limite de usuários" errors={state?.fieldErrors?.maxUsers}>
          <Input name="maxUsers" type="number" min={1} max={1000} defaultValue={6} />
        </Field>
      </div>
      <div>
        <SubmitButton pendingLabel="Criando...">Criar empresa</SubmitButton>
      </div>
    </form>
  );
}
