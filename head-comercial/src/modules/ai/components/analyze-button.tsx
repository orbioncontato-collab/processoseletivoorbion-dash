"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { requestAnalysis } from "@/modules/ai/analysis-actions";

export function AnalyzeButton({ conversationId, again }: { conversationId: string; again: boolean }) {
  const [state, action] = useActionState(requestAnalysis, null);
  return (
    <form action={action} className="grid gap-2">
      <FormMessage state={state} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <SubmitButton variant={again ? "outline" : "default"} pendingLabel="Analisando a conversa...">
        <Sparkles aria-hidden />
        {again ? "Analisar de novo" : "Analisar com IA"}
      </SubmitButton>
    </form>
  );
}
