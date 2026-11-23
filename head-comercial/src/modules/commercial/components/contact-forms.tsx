"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { createContact, updateContact } from "@/modules/commercial/actions";
import type { OwnerOption } from "./opportunity-forms";

export interface ContactValues {
  id?: string;
  name?: string;
  phone?: string;
  email?: string | null;
  organization?: string | null;
  notes?: string | null;
  ownerId?: string;
}

export function ContactForm({
  values,
  owners,
  submitLabel,
}: {
  values?: ContactValues;
  owners: OwnerOption[] | null;
  submitLabel: string;
}) {
  const [state, action] = useActionState(values?.id ? updateContact : createContact, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contact-name" label="Nome" errors={e?.name}>
          <Input name="name" defaultValue={values?.name ?? ""} maxLength={120} />
        </Field>
        <Field id="contact-phone" label="WhatsApp ou telefone" errors={e?.phone} hint="Ex.: (11) 98765-4321">
          <Input name="phone" defaultValue={values?.phone ?? ""} inputMode="tel" />
        </Field>
        <Field id="contact-email" label="E-mail" errors={e?.email}>
          <Input name="email" type="email" defaultValue={values?.email ?? ""} />
        </Field>
        <Field id="contact-organization" label="Empresa do cliente" errors={e?.organization}>
          <Input name="organization" defaultValue={values?.organization ?? ""} maxLength={120} />
        </Field>
        {owners ? (
          <Field id="contact-owner" label="Responsável" errors={e?.ownerId}>
            <Select name="ownerId" defaultValue={values?.ownerId}>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
      <Field id="contact-notes" label="Observações" errors={e?.notes}>
        <textarea
          name="notes"
          defaultValue={values?.notes ?? ""}
          maxLength={4000}
          rows={3}
          className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>
      <div>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
