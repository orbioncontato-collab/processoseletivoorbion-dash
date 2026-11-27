"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { setAiLimit } from "@/modules/companies/ai-limit";

export function AiLimitForm({ companyId, limitUsd }: { companyId: string; limitUsd: number | null }) {
  const [state, action] = useActionState(setAiLimit, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="companyId" value={companyId} />
      <Field id="ai-limit" label="Limite mensal de IA (US$)" errors={state?.fieldErrors?.limitUsd} hint="Vazio para não limitar. Ao atingir, o chat, a análise e o resumo param até o mês seguinte.">
        <Input name="limitUsd" inputMode="decimal" defaultValue={limitUsd === null ? "" : String(limitUsd)} className="max-w-40" />
      </Field>
      <div>
        <SubmitButton>Salvar limite</SubmitButton>
      </div>
    </form>
  );
}
