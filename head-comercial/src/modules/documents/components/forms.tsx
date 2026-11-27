"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { addVersion, createDocument } from "@/modules/documents/actions";
import { DOC_KIND_LABELS } from "@/modules/documents/labels";

const TEXTAREA =
  "w-full rounded-md border border-input bg-card px-3 py-2 font-mono text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function NewDocumentForm() {
  const [state, action] = useActionState(createDocument, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="doc-new-title" label="Título do documento" errors={e?.title} className="sm:col-span-2">
          <Input name="title" maxLength={200} />
        </Field>
        <Field id="doc-new-kind" label="Tipo de documento" errors={e?.kind}>
          <Select name="kind" defaultValue="playbook">
            {Object.entries(DOC_KIND_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="doc-new-content" label="Conteúdo da primeira versão" errors={e?.content}>
        <textarea name="content" rows={10} maxLength={100000} className={TEXTAREA} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" defaultChecked className="size-4" />
        Publicar para a equipe agora
      </label>
      <div>
        <SubmitButton>Criar documento</SubmitButton>
      </div>
    </form>
  );
}

export function NewVersionForm({ documentId, current }: { documentId: string; current: string }) {
  const [state, action] = useActionState(addVersion, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="documentId" value={documentId} />
      <Field id="doc-v-content" label="Conteúdo da nova versão" errors={e?.content}>
        <textarea name="content" rows={14} maxLength={100000} defaultValue={current} className={TEXTAREA} />
      </Field>
      <Field id="doc-v-note" label="O que mudou" errors={e?.note}>
        <Input name="note" maxLength={1000} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="publish" className="size-4" />
        Publicar esta versão
      </label>
      <div>
        <SubmitButton>Salvar versão</SubmitButton>
      </div>
    </form>
  );
}
