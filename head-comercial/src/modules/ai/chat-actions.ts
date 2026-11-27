"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { currentAgentContext } from "./context";

export async function archiveThread(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!z.uuid().safeParse(id).success) return;
  const ctx = await currentAgentContext();
  const db = createServiceClient({ type: "user", id: ctx.userId });
  await db.from("agent_threads").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("user_id", ctx.userId);
  redirect("/assistente");
}
