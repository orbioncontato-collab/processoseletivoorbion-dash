import { Alert } from "@/components/ui/alert";
import type { ActionState } from "@/lib/action-state";

/** Mostra a mensagem geral da ação (sucesso ou erro). */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return (
    <Alert variant={state.ok ? "success" : "destructive"} aria-live="polite">
      {state.message}
    </Alert>
  );
}
