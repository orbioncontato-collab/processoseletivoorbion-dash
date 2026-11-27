"use client";

import { useActionState } from "react";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { saveSummarySettings } from "@/modules/ai/summary-actions";

export function SummarySettingsForm({ enabled, hour }: { enabled: boolean; hour: number }) {
  const [state, action] = useActionState(saveSummarySettings, null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" defaultChecked={enabled} className="size-4" />
        Receber o resumo do dia no chat do Head
      </label>
      <Field id="summary-hour" label="Horário" errors={state?.fieldErrors?.hour} className="max-w-48">
        <Select name="hour" defaultValue={String(hour)}>
          {[5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
            <option key={h} value={h}>
              {h}h
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <SubmitButton>Salvar resumo do dia</SubmitButton>
      </div>
    </form>
  );
}
