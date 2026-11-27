"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { assignTraining, createTraining } from "@/modules/training/actions";
import { FORMAT_LABELS, SKILLS } from "@/modules/training/skills";

const TEXTAREA =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TrainingForm({ scope }: { scope: "global" | "company" }) {
  const [state, action] = useActionState(createTraining, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="scope" value={scope} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="tr-title" label="Título do treinamento" errors={e?.title} className="sm:col-span-2">
          <Input name="title" maxLength={200} />
        </Field>
        <Field id="tr-skill" label="Habilidade" errors={e?.skill}>
          <Select name="skill" defaultValue="diagnostico">
            {Object.entries(SKILLS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="tr-summary" label="Resumo" errors={e?.summary} hint="Uma frase sobre o que a pessoa vai aprender.">
        <Input name="summary" maxLength={600} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="tr-format" label="Formato" errors={e?.format}>
          <Select name="format" defaultValue="text">
            {Object.entries(FORMAT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="tr-url" label="Link (opcional)" errors={e?.url} className="sm:col-span-1">
          <Input name="url" type="url" placeholder="https://" />
        </Field>
        <Field id="tr-duration" label="Duração em minutos" errors={e?.duration}>
          <Input name="duration" type="number" min={1} max={600} />
        </Field>
      </div>
      <Field id="tr-content" label="Conteúdo" errors={e?.content} hint="O texto do treinamento, um roteiro de estudo ou o exercício.">
        <textarea name="content" rows={6} maxLength={50000} className={TEXTAREA} />
      </Field>
      <div>
        <SubmitButton>Salvar treinamento</SubmitButton>
      </div>
    </form>
  );
}

export function AssignForm({ members, trainings }: { members: { userId: string; name: string }[]; trainings: { id: string; title: string; skill: string }[] }) {
  const [state, action] = useActionState(assignTraining, null);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="as-user" label="Para quem" errors={e?.userId}>
          <Select name="userId" defaultValue="">
            <option value="">Escolha</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="as-training" label="Treinamento" errors={e?.trainingId}>
          <Select name="trainingId" defaultValue="">
            <option value="">Escolha</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({SKILLS[t.skill as keyof typeof SKILLS] ?? t.skill})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field id="as-reason" label="Motivo" errors={e?.reason} hint="Ex.: nas últimas conversas, passou o preço antes de entender a necessidade.">
        <Input name="reason" maxLength={1000} />
      </Field>
      <div>
        <SubmitButton>Indicar treinamento</SubmitButton>
      </div>
    </form>
  );
}
