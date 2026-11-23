"use client";

/* eslint-disable @next/next/no-img-element -- QR Code chega como imagem base64 do servidor do WhatsApp */
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import {
  checkConnection,
  createWhatsappConnection,
  disconnectWhatsapp,
  requestQrCode,
  type QrState,
} from "@/modules/integrations/whatsapp-actions";

export function CreateWhatsappForm({ sellers }: { sellers: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createWhatsappConnection, null);
  return (
    <form action={action} className="grid gap-4" noValidate>
      <FormMessage state={state} />
      <Field id="wa-seller" label="WhatsApp de quem" errors={state?.fieldErrors?.sellerId}>
        <Select name="sellerId" defaultValue="">
          <option value="" disabled>
            Selecione...
          </option>
          {sellers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Alert className="text-xs leading-relaxed">
        Esta conexão funciona como um &quot;aparelho conectado&quot;, igual ao WhatsApp Web. Ela não é oficial do WhatsApp
        e existe risco de o número ser bloqueado. O Head só lê as mensagens: nada é enviado por ele. Grupos não são
        capturados.
      </Alert>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="accept" className="mt-1" />
        <span>Entendo o risco e o vendedor está ciente de que as conversas comerciais serão registradas.</span>
      </label>
      {state?.fieldErrors?.accept ? <p className="text-xs text-destructive">{state.fieldErrors.accept[0]}</p> : null}
      <div>
        <SubmitButton pendingLabel="Preparando...">Criar conexão do WhatsApp</SubmitButton>
      </div>
    </form>
  );
}

/** Painel do número: mostra QR Code, verifica a conexão e desconecta. */
export function WhatsappPanel({ sourceId, status }: { sourceId: string; status: string }) {
  const [qrState, qrAction] = useActionState<QrState, FormData>(requestQrCode, null);
  const [checkState, checkAction] = useActionState<QrState, FormData>(checkConnection, null);
  const [offState, offAction] = useActionState<QrState, FormData>(disconnectWhatsapp, null);
  const connected = status === "active";

  return (
    <div className="grid gap-4">
      {connected ? (
        <Alert variant="success">WhatsApp conectado. As mensagens novas entram no Head automaticamente.</Alert>
      ) : (
        <p className="text-sm text-muted-foreground">
          Gere o QR Code e leia com o celular do vendedor em: WhatsApp &gt; Aparelhos conectados &gt; Conectar um
          aparelho.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!connected ? (
          <form action={qrAction}>
            <input type="hidden" name="id" value={sourceId} />
            <SubmitButton size="sm" pendingLabel="Gerando...">
              {qrState?.qr ? "Gerar outro QR Code" : "Mostrar QR Code"}
            </SubmitButton>
          </form>
        ) : null}
        <form action={checkAction}>
          <input type="hidden" name="id" value={sourceId} />
          <SubmitButton size="sm" variant="outline" pendingLabel="Verificando...">
            Verificar conexão
          </SubmitButton>
        </form>
        {connected ? (
          <form action={offAction}>
            <input type="hidden" name="id" value={sourceId} />
            <SubmitButton size="sm" variant="ghost" className="text-destructive" pendingLabel="Desconectando...">
              Desconectar
            </SubmitButton>
          </form>
        ) : null}
      </div>
      {!qrState?.qr ? <FormMessage state={qrState} /> : null}
      <FormMessage state={checkState} />
      <FormMessage state={offState} />
      {qrState?.qr && !connected ? (
        <div className="grid justify-items-start gap-2">
          <img src={qrState.qr} alt="QR Code para conectar o WhatsApp" width={260} height={260} className="rounded-lg border bg-white p-2" />
          <p className="text-xs text-muted-foreground">{qrState.message} O código expira em poucos segundos.</p>
        </div>
      ) : null}
    </div>
  );
}
