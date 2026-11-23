import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayRange } from "@/modules/commercial/filters";

/** Consultas de conversas. O RLS decide: vendedor vê as dele, líder vê as do time. */

export interface SellerMetrics {
  ownerId: string;
  conversationsActive: number;
  conversationsStarted: number;
  inbound: number;
  outbound: number;
  avgFirstResponseSeconds: number | null;
  awaitingReply: number;
}

export async function getTodayMetrics(companyId: string, timeZone: string): Promise<SellerMetrics[]> {
  const supabase = await createClient();
  const { start, end } = todayRange(timeZone);
  const { data, error } = await supabase.rpc("seller_daily_metrics", {
    target_company: companyId,
    period_start: start,
    period_end: end,
  });
  if (error) throw new Error(`Falha ao calcular os números do dia: ${error.message}`);
  return (data ?? []).map((r) => ({
    ownerId: r.owner_id,
    conversationsActive: r.conversations_active,
    conversationsStarted: r.conversations_started,
    inbound: r.messages_inbound,
    outbound: r.messages_outbound,
    avgFirstResponseSeconds: r.avg_first_response_seconds,
    awaitingReply: r.awaiting_reply,
  }));
}

export async function listConversations(companyId: string, opts: { awaiting?: boolean; owner?: string } = {}) {
  const supabase = await createClient();
  let query = supabase
    .from("conversations")
    .select("id, contact_id, owner_id, opportunity_id, last_message_at, last_inbound_at, inbound_count, outbound_count, awaiting_reply")
    .eq("company_id", companyId);
  if (opts.awaiting) query = query.eq("awaiting_reply", true);
  if (opts.owner) query = query.eq("owner_id", opts.owner);
  const { data, error } = await query.order("last_message_at", { ascending: false }).limit(200);
  if (error) throw new Error(`Falha ao carregar conversas: ${error.message}`);
  const rows = data ?? [];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const contactIds = [...new Set(rows.map((r) => r.contact_id))];
  const [contacts, lastMessages] = await Promise.all([
    supabase.from("contacts").select("id, name, phone_e164").in("id", contactIds),
    supabase
      .from("messages")
      .select("conversation_id, body, direction, message_type, sent_at")
      .in("conversation_id", ids)
      .order("sent_at", { ascending: false })
      .limit(1000),
  ]);
  const contactById = new Map((contacts.data ?? []).map((c) => [c.id, c]));
  const lastByConv = new Map<string, { body: string | null; direction: string; message_type: string }>();
  for (const m of lastMessages.data ?? []) if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m);

  return rows.map((r) => ({
    ...r,
    contactName: contactById.get(r.contact_id)?.name ?? "Contato",
    contactPhone: contactById.get(r.contact_id)?.phone_e164 ?? null,
    last: lastByConv.get(r.id) ?? null,
  }));
}

export async function getConversation(companyId: string, id: string) {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", id)
    .maybeSingle();
  if (!conversation) return null;
  const [contact, messages, opportunities] = await Promise.all([
    supabase.from("contacts").select("id, name, phone_e164, organization").eq("id", conversation.contact_id).maybeSingle(),
    supabase
      .from("messages")
      .select("id, direction, sent_at, message_type, body")
      .eq("conversation_id", id)
      .order("sent_at", { ascending: true })
      .limit(500),
    supabase
      .from("opportunities")
      .select("id, title, status")
      .eq("contact_id", conversation.contact_id)
      .order("created_at", { ascending: false }),
  ]);
  return { conversation, contact: contact.data, messages: messages.data ?? [], opportunities: opportunities.data ?? [] };
}
