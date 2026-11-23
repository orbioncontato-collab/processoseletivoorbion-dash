"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import {
  addObjection,
  createOpportunity,
  moveOpportunityStage,
  updateOpportunity,
} from "@/modules/commercial/actions";
import { LOST_REASONS, OBJECTION_CATEGORIES } from "@/modules/commercial/schemas";
import { ContactPicker, type ContactOption } from "./contact-picker";

export interface StageOption {
  id: string;
  name: string;
  kind: "open" | "won" | "lost";
}
export interface OwnerOption {
  id: string;
  name: string;
}

function OwnerSelect({ owners, defaultValue, errors }: { owners: OwnerOption[]; defaultValue?: string; errors?: string[] }) {
  return (
    <Field id="ownerId" label="Responsável" errors={errors}>
      <Select name="ownerId" defaultValue={defaultValue}>
        {owners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function NextStepFields({
  defaultStep,
  defaultAt,
  errors,
}: {
  defaultStep?: string | null;
  defaultAt?: string;
  errors?: Record<string, string[] | undefined>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
      <Field id="nextStep" label="Próximo passo" errors={errors?.nextStep} hint="Ex.: Enviar proposta revisada">
        <Input name="nextStep" defaultValue={defaultStep ?? ""} maxLength={280} />
      </Field>
      <Field id="nextStepAt" label="Quando" errors={errors?.nextStepAt}>
        <Input name="nextStepAt" type="datetime-local" defaultValue={defaultAt ?? ""} />
      </Field>
    </div>
  );
}

export function NewOpportunityForm({
  contacts,
  stages,
  owners,
  currentUserId,
  defaultContactId,
}: {
  contacts: ContactOption[];
  stages: StageOption[];
  owners: OwnerOption[] | null;
  currentUserId: string;
  defaultContactId?: string;
}) {
  const [state, action] = useActionState(createOpportunity, null);
  const e = state?.fieldErrors;
  const openStages = stages.filter((s) => s.kind === "open");

  return (
    <form action={action} className="grid gap-5" noValidate>
      <FormMessage state={state} />
      <ContactPicker contacts={contacts} defaultContactId={defaultContactId} errors={e} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="title" label="Título da oportunidade" errors={e?.title} hint="Ex.: Consultoria comercial 6 meses">
          <Input name="title" required maxLength={160} />
        </Field>
        <Field id="product" label="Produto ou serviço" errors={e?.product}>
          <Input name="product" maxLength={120} />
        </Field>
        <Field id="value" label="Valor (R$)" errors={e?.value} hint="Ex.: 12.000,00">
          <Input name="value" inputMode="decimal" />
        </Field>
        <Field id="stageId" label="Etapa" errors={e?.stageId}>
          <Select name="stageId" defaultValue={openStages[0]?.id}>
            {openStages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="expectedCloseDate" label="Previsão de fechamento" errors={e?.expectedCloseDate}>
          <Input name="expectedCloseDate" type="date" />
        </Field>
        {owners ? <OwnerSelect owners={owners} defaultValue={currentUserId} errors={e?.ownerId} /> : null}
      </div>
      <NextStepFields errors={e} />
      <div>
        <SubmitButton pendingLabel="Criando...">Criar oportunidade</SubmitButton>
      </div>
    </form>
  );
}

export function EditOpportunityForm({
  opportunity,
  owners,
  nextStepAtInput,
}: {
  opportunity: {
    id: string;
    title: string;
    product: string | null;
    valueInput: string;
    owner_id: string;
    expected_close_date: string | null;
    next_step: string | null;
    status: "open" | "won" | "lost";
  };
  owners: OwnerOption[] | null;
  nextStepAtInput: string;
}) {
  const [state, action] = useActionState(updateOpportunity, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <input type="hidden" name="id" value={opportunity.id} />
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="title" label="Título" errors={e?.title}>
          <Input name="title" defaultValue={opportunity.title} maxLength={160} />
        </Field>
        <Field id="product" label="Produto ou serviço" errors={e?.product}>
          <Input name="product" defaultValue={opportunity.product ?? ""} maxLength={120} />
        </Field>
        <Field id="value" label="Valor (R$)" errors={e?.value}>
          <Input name="value" defaultValue={opportunity.valueInput} inputMode="decimal" />
        </Field>
        <Field id="expectedCloseDate" label="Previsão de fechamento" errors={e?.expectedCloseDate}>
          <Input name="expectedCloseDate" type="date" defaultValue={opportunity.expected_close_date ?? ""} />
        </Field>
        {owners ? <OwnerSelect owners={owners} defaultValue={opportunity.owner_id} errors={e?.ownerId} /> : null}
      </div>
      {opportunity.status === "open" ? (
        <NextStepFields defaultStep={opportunity.next_step} defaultAt={nextStepAtInput} errors={e} />
      ) : null}
      <div>
        <SubmitButton>Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}

/** Use com key={etapaAtual} para reiniciar a seleção quando a etapa mudar. */
export function StageMover({
  opportunityId,
  stages,
  currentStageId,
}: {
  opportunityId: string;
  stages: StageOption[];
  currentStageId: string;
}) {
  const [state, action] = useActionState(moveOpportunityStage, null);
  const [stageId, setStageId] = useState(currentStageId);
  const selected = stages.find((s) => s.id === stageId);
  const e = state?.fieldErrors;


  return (
    <form action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="id" value={opportunityId} />
      <FormMessage state={state} />
      <Field id="move-stage" label="Mover para a etapa">
        <Select name="stageId" value={stageId} onChange={(ev) => setStageId(ev.target.value)}>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.kind === "won" ? " (ganho)" : s.kind === "lost" ? " (perda)" : ""}
            </option>
          ))}
        </Select>
      </Field>
      {selected?.kind === "lost" ? (
        <div className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <Field id="lostReason" label="Motivo da perda" errors={e?.lostReason}>
            <Select name="lostReason" defaultValue="">
              <option value="" disabled>
                Selecione...
              </option>
              {Object.entries(LOST_REASONS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="lostReasonDetail" label="Detalhe (opcional)" errors={e?.lostReasonDetail}>
            <Input name="lostReasonDetail" maxLength={500} />
          </Field>
        </div>
      ) : null}
      <div>
        <SubmitButton
          variant={selected?.kind === "lost" ? "destructive" : "default"}
          disabled={stageId === currentStageId}
        >
          {selected?.kind === "won" ? "Marcar como ganha" : selected?.kind === "lost" ? "Encerrar como perdida" : "Mover"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ObjectionForm({ opportunityId }: { opportunityId: string }) {
  const [state, action] = useActionState(addObjection, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-3" noValidate>
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <FormMessage state={state} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <Field id="objection-description" label="Nova objeção" errors={state?.fieldErrors?.description}>
          <Input name="description" maxLength={500} placeholder="Ex.: Achou o valor alto para o momento" />
        </Field>
        <Field id="objection-category" label="Tipo">
          <Select name="category" defaultValue="outro">
            {Object.entries(OBJECTION_CATEGORIES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div>
        <SubmitButton size="sm" variant="outline">
          Registrar objeção
        </SubmitButton>
      </div>
    </form>
  );
}
