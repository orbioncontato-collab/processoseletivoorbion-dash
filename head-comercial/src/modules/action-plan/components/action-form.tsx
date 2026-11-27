"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { createAction } from "@/modules/action-plan/actions";
import { ACTION_PRIORITY } from "@/modules/action-plan/labels";

export function ActionForm({ members }: { members?: { userId: string; name: string }[] }) {
  const [state, action] = useActionState(createAction, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="ac-title" label="Ação" errors={e?.title} hint="Algo concreto. Ex.: ligar para os 5 clientes parados há mais de 10 dias.">
        <Input name="title" maxLength={200} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        {members ? (
          <Field id="ac-owner" label="Responsável" errors={e?.ownerId}>
            <Select name="ownerId" defaultValue="">
              <option value="">Eu</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field id="ac-due" label="Prazo" errors={e?.dueDate}>
          <Input name="dueDate" type="date" />
        </Field>
        <Field id="ac-priority" label="Prioridade" errors={e?.priority}>
          <Select name="priority" defaultValue="medium">
            {Object.entries(ACTION_PRIORITY).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="ac-description" label="Detalhes (opcional)" errors={e?.description}>
        <Input name="description" maxLength={4000} />
      </Field>
      <div>
        <SubmitButton>Criar ação</SubmitButton>
      </div>
    </form>
  );
}
