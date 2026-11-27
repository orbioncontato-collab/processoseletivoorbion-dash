import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Criação de ação usada pela tela e pelo Gestor de Projetos (permissão checada antes). */
export async function insertAction(input: {
  companyId: string;
  actorId: string;
  actorType: "user" | "agent";
  title: string;
  description?: string;
  ownerId: string;
  dueDate: string | null;
  priority: "low" | "medium" | "high";
  source: "leader" | "self" | "agent" | "analysis" | "alert";
  sourceRef?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const db = createServiceClient({ type: input.actorType, id: input.actorId });
  const { data, error } = await db
    .from("action_items")
    .insert({
      company_id: input.companyId,
      title: input.title,
      description: input.description ?? "",
      owner_id: input.ownerId,
      due_date: input.dueDate,
      priority: input.priority,
      source: input.source,
      source_ref: input.sourceRef ?? null,
      created_by: input.actorId,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message.includes("não faz parte") ? "O responsável não faz parte da equipe." : "Não foi possível criar a ação." };
  return { id: data.id };
}
