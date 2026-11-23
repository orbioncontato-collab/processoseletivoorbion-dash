"use client";

import { useActionState } from "react";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { linkConversation } from "@/modules/conversations/actions";

export function LinkOpportunityForm({
  conversationId,
  current,
  options,
}: {
  conversationId: string;
  current: string | null;
  options: { id: string; title: string }[];
}) {
  const [state, action] = useActionState(linkConversation, null);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="id" value={conversationId} />
      <FormMessage state={state} />
      <Field id="link-opportunity" label="Oportunidade desta conversa">
        <Select name="opportunityId" defaultValue={current ?? ""}>
          <option value="">Nenhuma</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </Select>
      </Field>
      <div>
        <SubmitButton size="sm" variant="outline">
          Salvar vínculo
        </SubmitButton>
      </div>
    </form>
  );
}
