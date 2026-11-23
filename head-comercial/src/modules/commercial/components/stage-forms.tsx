"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormMessage } from "@/components/form/form-message";
import { Field } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { addStage, archiveStage, renameStage } from "@/modules/commercial/actions";

export function RenameStageForm({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState(renameStage, null);
  return (
    <form action={action} className="flex min-w-0 flex-1 flex-col gap-1">
      <input type="hidden" name="id" value={id} />
      <div className="flex gap-2">
        <Input name="name" defaultValue={name} aria-label={`Nome da etapa ${name}`} maxLength={60} className="h-8" />
        <SubmitButton size="sm" variant="outline" pendingLabel="...">
          Salvar
        </SubmitButton>
      </div>
      {state && !state.ok ? <p className="text-xs text-destructive">{state.fieldErrors?.name?.[0] ?? state.message}</p> : null}
    </form>
  );
}

export function ArchiveStageForm({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState(archiveStage, null);
  return (
    <form action={action} className="grid gap-1">
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="ghost" className="text-destructive" pendingLabel="..." aria-label={`Arquivar ${name}`}>
        Arquivar
      </SubmitButton>
      {state && !state.ok ? <p className="max-w-48 text-xs text-destructive">{state.message}</p> : null}
    </form>
  );
}

export function AddStageForm() {
  const [state, action] = useActionState(addStage, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <Field id="stage-name" label="Nome da etapa" errors={state?.fieldErrors?.name}>
          <Input name="name" maxLength={60} placeholder="Ex.: Reunião agendada" />
        </Field>
        <Field id="stage-kind" label="Tipo">
          <Select name="kind" defaultValue="open">
            <option value="open">Em andamento</option>
            <option value="won">Ganho</option>
            <option value="lost">Perda</option>
          </Select>
        </Field>
      </div>
      <div>
        <SubmitButton size="sm">Adicionar etapa</SubmitButton>
      </div>
    </form>
  );
}
