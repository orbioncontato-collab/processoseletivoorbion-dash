"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { addQuestion, saveTemplate } from "@/modules/reports/admin-actions";
import { METRICS, QUESTION_KINDS, WEEKDAYS } from "@/modules/reports/rules";

export function TemplateForm({
  companyId,
  values,
}: {
  companyId: string;
  values: { name: string; scheduleTime: string; reference: string; weekdays: number[] } | null;
}) {
  const [state, action] = useActionState(saveTemplate, null);
  const v = values ?? { name: "Relatório do dia", scheduleTime: "18:00", reference: "same_day", weekdays: [1, 2, 3, 4, 5] };
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="companyId" value={companyId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="tpl-name" label="Nome" errors={state?.fieldErrors?.name}>
          <Input name="name" defaultValue={v.name} maxLength={80} />
        </Field>
        <Field id="tpl-time" label="Horário de abertura" errors={state?.fieldErrors?.scheduleTime}>
          <Input name="scheduleTime" type="time" defaultValue={v.scheduleTime.slice(0, 5)} />
        </Field>
        <Field id="tpl-ref" label="O relatório é sobre">
          <Select name="reference" defaultValue={v.reference}>
            <option value="same_day">O próprio dia (responde no fim do dia)</option>
            <option value="previous_day">O dia anterior (responde na manhã seguinte)</option>
          </Select>
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Dias de trabalho</legend>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="weekdays" value={i + 1} defaultChecked={v.weekdays.includes(i + 1)} />
              {d}
            </label>
          ))}
        </div>
        {state?.fieldErrors?.weekdays ? <p className="text-xs text-destructive">{state.fieldErrors.weekdays[0]}</p> : null}
      </fieldset>
      <div>
        <SubmitButton size="sm">Salvar configuração</SubmitButton>
      </div>
    </form>
  );
}

export function QuestionForm({
  companyId,
  templateId,
  stages,
}: {
  companyId: string;
  templateId: string;
  stages: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(addQuestion, null);
  const [kind, setKind] = useState("number");
  const [metric, setMetric] = useState("");
  const e = state?.fieldErrors;
  const numeric = kind === "number" || kind === "currency";
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="companyId" value={companyId} />
      <input type="hidden" name="templateId" value={templateId} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field id="q-label" label="Pergunta" errors={e?.label} hint="Ex.: Quantos contatos você fez hoje?">
          <Input name="label" maxLength={200} />
        </Field>
        <Field id="q-kind" label="Tipo de resposta">
          <Select
            name="kind"
            value={kind}
            onChange={(ev) => {
              setKind(ev.target.value);
              if (!["number", "currency"].includes(ev.target.value)) setMetric("");
            }}
          >
            {Object.entries(QUESTION_KINDS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="q-help" label="Explicação para quem responde (opcional)">
        <Input name="help" maxLength={300} />
      </Field>
      {kind === "single_choice" || kind === "multi_choice" ? (
        <Field id="q-options" label="Opções (uma por linha)" errors={e?.options}>
          <textarea
            name="options"
            rows={3}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>
      ) : null}
      {numeric ? (
        <div className="grid gap-4 rounded-lg border p-4">
          <Field id="q-metric" label="Comparar com dado capturado (opcional)" errors={e?.metricKey}>
            <Select name="metricKey" value={metric} onChange={(ev) => setMetric(ev.target.value)}>
              <option value="">Não comparar</option>
              {Object.entries(METRICS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          {metric === "stage_entries" ? (
            <Field id="q-stage" label="Etapa" errors={e?.metricStageId}>
              <Select name="metricStageId" defaultValue="">
                <option value="">Selecione...</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {metric ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="q-tol-pct" label="Margem em %" hint="Diferenças até esta porcentagem não contam.">
                <Input name="tolerancePct" type="number" min={0} max={100} defaultValue={20} />
              </Field>
              <Field
                id="q-tol-abs"
                label={kind === "currency" ? "Margem mínima em R$" : "Margem mínima em unidades"}
                hint="Usada quando for maior que a porcentagem."
              >
                <Input name="toleranceAbs" type="number" min={0} step="1" defaultValue={kind === "currency" ? 100 : 1} />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="required" defaultChecked /> Resposta obrigatória
      </label>
      <div>
        <SubmitButton size="sm">Adicionar pergunta</SubmitButton>
      </div>
    </form>
  );
}
