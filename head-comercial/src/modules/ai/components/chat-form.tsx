"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/form/form-message";
import { sendChatMessage } from "@/modules/ai/chat-actions";

function Pending() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      O Head está consultando os dados...
    </p>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-label="Enviar pergunta">
      <Send aria-hidden />
      Enviar
    </Button>
  );
}

export function ChatForm({ threadId, suggestions = [] }: { threadId?: string; suggestions?: string[] }) {
  const [state, action] = useActionState(sendChatMessage, null);
  const ref = useRef<HTMLTextAreaElement>(null);
  return (
    <form action={action} className="grid gap-3">
      <FormMessage state={state?.ok ? null : state} />
      {threadId ? <input type="hidden" name="threadId" value={threadId} /> : null}
      {suggestions.length ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (ref.current) {
                  ref.current.value = s;
                  ref.current.focus();
                }
              }}
              className="rounded-full border px-3 py-1 text-xs hover:bg-secondary"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      <label htmlFor="chat-message" className="sr-only">
        Sua pergunta
      </label>
      <textarea
        ref={ref}
        id="chat-message"
        name="message"
        rows={3}
        maxLength={4000}
        required
        placeholder="Pergunte ao Head Comercial"
        className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      {state?.fieldErrors?.message ? <p className="text-xs text-destructive">{state.fieldErrors.message[0]}</p> : null}
      <div className="flex items-center justify-between gap-3">
        <Pending />
        <div className="ml-auto">
          <SendButton />
        </div>
      </div>
    </form>
  );
}
