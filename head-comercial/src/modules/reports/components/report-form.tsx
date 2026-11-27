"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { justifyDivergence, submitReport } from "@/modules/reports/actions";

export interface FormQuestion {
  id: string;
  label: string;
  help: string | null;
  kind: "number" | "currency" | "text" | "single_choice" | "multi_choice" | "yes_no";
  options: string[];
  required: boolean;
}

export interface ExistingAnswer {
  value_number: number | null;
  value_text: string | null;
  value_options: string[] | null;
}

function centsToField(cents: number | null) {
  return cents == null ? "" : (cents / 100).toFixed(2).replace(".", ",");
}

export function ReportForm({
  questions,
  referenceDate,
  answers,
  alreadySent,
}: {
  questions: FormQuestion[];
  referenceDate: string;
  answers: Record<string, ExistingAnswer>;
  alreadySent: boolean;
}) {
  const [state, action] = useActionState(submitReport, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <input type="hidden" name="referenceDate" value={referenceDate} />
      <FormMessage state={state} />
      {questions.map((q) => {
        const name = `q_${q.id}`;
        const a = answers[q.id];
        const label = `${q.label}${q.required ? "" : " (opcional)"}`;
        if (q.kind === "multi_choice") {
          return (
            <fieldset key={q.id} className="grid gap-2">
              <legend className="text-sm font-medium">{label}</legend>
              {q.help ? <p className="text-xs text-muted-foreground">{q.help}</p> : null}
              <div className="flex flex-wrap gap-4">
                {q.options.map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={name} value={o} defaultChecked={a?.value_options?.includes(o)} />
                    {o}
                  </label>
                ))}
              </div>
              {e?.[name] ? <p className="text-xs text-destructive">{e[name]![0]}</p> : null}
            </fieldset>
          );
        }
        return (
          <Field key={q.id} id={name} label={label} errors={e?.[name]} hint={q.help ?? undefined}>
            {q.kind === "text" ? (
              <textarea
                name={name}
                rows={3}
                defaultValue={a?.value_text ?? ""}
                className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : q.kind === "single_choice" || q.kind === "yes_no" ? (
              <Select name={name} defaultValue={a?.value_text ?? ""}>
                <option value="">Selecione...</option>
                {(q.kind === "yes_no" ? ["sim", "nao"] : q.options).map((o) => (
                  <option key={o} value={o}>
                    {q.kind === "yes_no" ? (o === "sim" ? "Sim" : "Não") : o}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                name={name}
                inputMode={q.kind === "currency" ? "decimal" : "numeric"}
                defaultValue={q.kind === "currency" ? centsToField(a?.value_number ?? null) : (a?.value_number ?? "").toString()}
                placeholder={q.kind === "currency" ? "Ex.: 1.500,00" : "0"}
                className="max-w-48"
              />
            )}
          </Field>
        );
      })}
      <div>
        <SubmitButton pendingLabel="Enviando...">{alreadySent ? "Atualizar relatório" : "Enviar relatório"}</SubmitButton>
      </div>
    </form>
  );
}

export function JustifyForm({ id, current }: { id: string; current: string | null }) {
  const [state, action] = useActionState(justifyDivergence, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <Field id={`just-${id}`} label="Explicação" errors={state?.fieldErrors?.justification}>
        <Input name="justification" defaultValue={current ?? ""} maxLength={1000} placeholder="Ex.: fiz 4 contatos por ligação" />
      </Field>
      <div>
        <SubmitButton size="sm" variant="outline">
          {current ? "Atualizar explicação" : "Enviar explicação"}
        </SubmitButton>
      </div>
    </form>
  );
}
