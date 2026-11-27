"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { saveCompanySettings } from "@/modules/alerts/actions";

export interface SettingsValues {
  stale_days: number;
  awaiting_reply_hours: number;
  report_grace_hours: number;
  daily_target_conversations: number | null;
  daily_target_messages: number | null;
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action] = useActionState(saveCompanySettings, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="staleDays" label="Negociação parada após (dias)" errors={e?.staleDays}>
          <Input name="staleDays" type="number" min={1} max={90} defaultValue={values.stale_days} />
        </Field>
        <Field id="awaitingReplyHours" label="Cliente esperando há mais de (horas)" errors={e?.awaitingReplyHours}>
          <Input name="awaitingReplyHours" type="number" min={1} max={72} defaultValue={values.awaiting_reply_hours} />
        </Field>
        <Field id="reportGraceHours" label="Tolerância do relatório (horas)" errors={e?.reportGraceHours} hint="Depois da abertura, antes de virar alerta.">
          <Input name="reportGraceHours" type="number" min={0} max={48} defaultValue={values.report_grace_hours} />
        </Field>
      </div>
      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Referência diária de produção (por vendedor com WhatsApp conectado)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="dailyTargetConversations" label="Conversas por dia" errors={e?.dailyTargetConversations} hint="Vazio para não acompanhar.">
            <Input name="dailyTargetConversations" type="number" min={0} max={1000} defaultValue={values.daily_target_conversations ?? ""} />
          </Field>
          <Field id="dailyTargetMessages" label="Mensagens enviadas por dia" errors={e?.dailyTargetMessages} hint="Vazio para não acompanhar.">
            <Input name="dailyTargetMessages" type="number" min={0} max={5000} defaultValue={values.daily_target_messages ?? ""} />
          </Field>
        </div>
      </fieldset>
      <div>
        <SubmitButton>Salvar referências</SubmitButton>
      </div>
    </form>
  );
}
