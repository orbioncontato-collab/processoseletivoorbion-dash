"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { addMemory, createCalibrationCase, createDocument } from "@/modules/knowledge/actions";
import { COMPANY_MEMORY, KIND_LABELS, MEMORY_CATEGORIES, OUTCOME_LABELS, USER_MEMORY } from "@/modules/knowledge/labels";

const TEXTAREA =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DocumentForm({ scope }: { scope: "global" | "company" }) {
  const [state, action] = useActionState(createDocument, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="scope" value={scope} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="doc-title" label="Título" errors={e?.title} className="sm:col-span-2">
          <Input name="title" maxLength={200} required />
        </Field>
        <Field id="doc-kind" label="Tipo" errors={e?.kind}>
          <Select name="kind" defaultValue="methodology">
            {Object.entries(KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="doc-tags" label="Etiquetas" errors={e?.tags} hint="Separe por vírgula. Ex.: diagnóstico, preço, fechamento.">
        <Input name="tags" maxLength={400} />
      </Field>
      <Field id="doc-file" label="Arquivo" errors={e?.file} hint="Aceita .txt, .md, .pdf e .docx, até 4 MB. Se enviar arquivo, o texto colado é ignorado.">
        <Input name="file" type="file" accept=".txt,.md,.pdf,.docx" />
      </Field>
      <Field id="doc-text" label="Ou cole o texto" errors={e?.text}>
        <textarea name="text" rows={8} className={TEXTAREA} />
      </Field>
      <div>
        <SubmitButton pendingLabel="Processando...">Salvar documento</SubmitButton>
      </div>
    </form>
  );
}

export function CalibrationForm({ scope }: { scope: "global" | "company" }) {
  const [state, action] = useActionState(createCalibrationCase, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="scope" value={scope} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="case-title" label="Título do caso" errors={e?.title} className="sm:col-span-2">
          <Input name="title" maxLength={200} required />
        </Field>
        <Field id="case-outcome" label="Resultado da venda" errors={e?.outcome}>
          <Select name="outcome" defaultValue="unknown">
            {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="case-conversation" label="Conversa" errors={e?.conversation} hint="Cole a conversa real, com quem falou cada parte.">
        <textarea name="conversation" rows={8} maxLength={50000} className={TEXTAREA} />
      </Field>
      <Field id="case-expected" label="Avaliação esperada" errors={e?.expected} hint="O que um bom analista diria sobre esta conversa: acertos, erros e próximo passo.">
        <textarea name="expected" rows={5} maxLength={10000} className={TEXTAREA} />
      </Field>
      <div>
        <SubmitButton>Salvar caso</SubmitButton>
      </div>
    </form>
  );
}

export function MemoryForm({ members }: { members: { userId: string; name: string }[] }) {
  const [state, action] = useActionState(addMemory, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="mem-about" label="Sobre" errors={e?.subjectUserId}>
          <Select name="subjectUserId" defaultValue="">
            <option value="">A empresa</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="mem-category" label="Assunto" errors={e?.category} className="sm:col-span-2">
          <Select name="category" defaultValue="other">
            <optgroup label="Da empresa">
              {COMPANY_MEMORY.map((c) => (
                <option key={c} value={c}>
                  {MEMORY_CATEGORIES[c]}
                </option>
              ))}
            </optgroup>
            <optgroup label="Da pessoa">
              {USER_MEMORY.filter((c) => !COMPANY_MEMORY.includes(c)).map((c) => (
                <option key={c} value={c}>
                  {MEMORY_CATEGORIES[c]}
                </option>
              ))}
            </optgroup>
          </Select>
        </Field>
      </div>
      <Field id="mem-content" label="O que vale lembrar" errors={e?.content} hint="Um fato por registro. Ex.: ticket médio de R$ 12 mil; cliente decide em comitê.">
        <textarea name="content" rows={3} maxLength={2000} className={TEXTAREA} />
      </Field>
      <div>
        <SubmitButton>Registrar</SubmitButton>
      </div>
    </form>
  );
}
