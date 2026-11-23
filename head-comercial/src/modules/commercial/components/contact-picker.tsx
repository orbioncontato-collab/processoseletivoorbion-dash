"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";

export interface ContactOption {
  id: string;
  label: string;
}

/** Escolhe um contato existente ou cadastra um novo no mesmo formulário. */
export function ContactPicker({
  contacts,
  defaultContactId,
  errors,
}: {
  contacts: ContactOption[];
  defaultContactId?: string;
  errors?: Record<string, string[] | undefined>;
}) {
  const [mode, setMode] = useState<"existing" | "new">(contacts.length && !errors?.newContactName ? "existing" : "new");

  return (
    <fieldset className="grid gap-3 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">Contato</legend>
      <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Tipo de contato">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="contactMode"
            checked={mode === "existing"}
            onChange={() => setMode("existing")}
            disabled={!contacts.length}
          />
          Contato existente
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="contactMode" checked={mode === "new"} onChange={() => setMode("new")} />
          Novo contato
        </label>
      </div>

      {mode === "existing" ? (
        <Field id="contactId" label="Escolha o contato" errors={errors?.contactId}>
          <Select name="contactId" defaultValue={defaultContactId ?? ""}>
            <option value="" disabled>
              Selecione...
            </option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="newContactName" label="Nome do contato" errors={errors?.newContactName ?? errors?.contactId}>
            <Input name="newContactName" autoComplete="off" />
          </Field>
          <Field id="newContactPhone" label="WhatsApp ou telefone" errors={errors?.newContactPhone} hint="Ex.: (11) 98765-4321">
            <Input name="newContactPhone" inputMode="tel" autoComplete="off" />
          </Field>
        </div>
      )}
    </fieldset>
  );
}
