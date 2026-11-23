"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import {
  createSource,
  importCsv,
  reprocessFailed,
  rotateSourceKey,
  saveStageMap,
  type KeyState,
} from "@/modules/integrations/actions";

export const PROVIDER_LABELS: Record<string, string> = {
  generic: "Outro sistema (genérico)",
  ghl: "GoHighLevel",
  rdstation: "RD Station CRM",
  pipedrive: "Pipedrive",
  hubspot: "HubSpot",
  kommo: "Kommo",
  agendor: "Agendor",
  make: "Make",
  zapier: "Zapier",
  n8n: "n8n",
  outro: "Outro",
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={label}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copiado" : "Copiar"}
    </Button>
  );
}

/** Mostra a chave uma única vez, com o endereço e um exemplo pronto. */
export function KeyReveal({ keyValue, endpoint }: { keyValue: string; endpoint: string }) {
  const example = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${keyValue}" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"contact.upsert","data":{"external_id":"1","name":"Maria","phone":"11 91234-5678"}}'`;
  return (
    <div className="grid gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="size-4" aria-hidden /> Guarde esta chave agora. Ela não será mostrada de novo.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code data-testid="source-key" className="min-w-0 flex-1 break-all rounded bg-card px-2 py-1.5 font-mono text-xs">
          {keyValue}
        </code>
        <CopyButton value={keyValue} label="Copiar chave" />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-primary">Exemplo de envio</summary>
        <pre className="mt-2 overflow-x-auto rounded bg-card p-3 font-mono text-xs">{example}</pre>
      </details>
    </div>
  );
}

export function CreateSourceForm({ baseUrl }: { baseUrl: string }) {
  const [state, action] = useActionState<KeyState, FormData>(createSource, null);
  return (
    <div className="grid gap-4">
      <form action={action} className="grid gap-4" noValidate>
        {!state?.key ? <FormMessage state={state} /> : null}
        <Field id="source-name" label="Nome da conexão" errors={state?.fieldErrors?.name} hint="Ex.: CRM da Orbion">
          <Input name="name" maxLength={80} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="source-kind" label="Tipo">
            <Select name="kind" defaultValue="crm">
              <option value="crm">CRM (contatos e oportunidades)</option>
              <option value="webhook">Automação (Make, Zapier, n8n, outro)</option>
            </Select>
          </Field>
          <Field id="source-provider" label="Sistema">
            <Select name="provider" defaultValue="generic">
              {Object.entries(PROVIDER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div>
          <SubmitButton pendingLabel="Criando...">Criar conexão</SubmitButton>
        </div>
      </form>
      {state?.key && state.sourceId ? (
        <>
          <Alert variant="success">{state.message}</Alert>
          <KeyReveal keyValue={state.key} endpoint={`${baseUrl}/api/webhooks/ingest/${state.sourceId}`} />
          <a href={`/integracoes/${state.sourceId}`} className="text-sm text-primary hover:underline">
            Abrir a conexão e configurar o mapeamento de etapas →
          </a>
        </>
      ) : null}
    </div>
  );
}

export function RotateKeyForm({ id, endpoint }: { id: string; endpoint: string }) {
  const [state, action] = useActionState<KeyState, FormData>(rotateSourceKey, null);
  return (
    <div className="grid gap-3">
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <SubmitButton variant="outline" size="sm" pendingLabel="Gerando...">
          Gerar nova chave
        </SubmitButton>
      </form>
      {state?.key ? <KeyReveal keyValue={state.key} endpoint={endpoint} /> : <FormMessage state={state} />}
    </div>
  );
}

export function StageMapForm({
  id,
  rows,
  stages,
}: {
  id: string;
  rows: { external: string; target: string; pending?: boolean }[];
  stages: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(saveStageMap, null);
  const [extra, setExtra] = useState(rows.length ? 0 : 1);
  const all = [...rows, ...Array.from({ length: extra }, () => ({ external: "", target: "", pending: false }))];
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <div className="grid gap-2">
        <div className="hidden grid-cols-2 gap-3 text-xs text-muted-foreground sm:grid">
          <span>Etapa no sistema de origem</span>
          <span>Etapa do Head</span>
        </div>
        {all.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <Input
              name="external"
              defaultValue={r.external}
              aria-label={`Etapa de origem ${i + 1}`}
              placeholder="Ex.: Proposta enviada"
              className={r.pending ? "border-warning" : undefined}
            />
            <Select name="target" defaultValue={r.target} aria-label={`Etapa do Head ${i + 1}`}>
              <option value="">Não mapear</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setExtra((n) => n + 1)}>
          Adicionar linha
        </Button>
        <SubmitButton size="sm">Salvar mapeamento</SubmitButton>
      </div>
    </form>
  );
}

export function ReprocessForm({ id, failed }: { id: string; failed: number }) {
  const [state, action] = useActionState(reprocessFailed, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <FormMessage state={state} />
      <div>
        <SubmitButton size="sm" variant="outline" disabled={!failed} pendingLabel="Reprocessando...">
          Reprocessar {failed ? `${failed} com falha` : "falhas"}
        </SubmitButton>
      </div>
    </form>
  );
}

export function ImportCsvForm() {
  const [state, action] = useActionState(importCsv, null);
  return (
    <form action={action} className="grid gap-3" noValidate>
      <FormMessage state={state} />
      <Field id="csv-file" label="Arquivo CSV" errors={state?.fieldErrors?.file} hint="Até 500 linhas e 2 MB.">
        <Input name="file" type="file" accept=".csv,text/csv" className="h-auto py-1.5" />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Importando...">
          Importar planilha
        </SubmitButton>
        <a href="/integracoes/modelo.csv" className="text-sm text-primary hover:underline" download>
          Baixar modelo
        </a>
      </div>
    </form>
  );
}
