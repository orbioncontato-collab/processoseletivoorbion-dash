export const KIND_LABELS: Record<string, string> = {
  crm: "CRM",
  webhook: "Automação",
  import: "Planilha",
  whatsapp_device: "WhatsApp (QR Code)",
  whatsapp_cloud: "WhatsApp (API oficial)",
};

export const SOURCE_STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  active: { label: "Ativa", variant: "success" },
  paused: { label: "Pausada", variant: "outline" },
  pending: { label: "Aguardando", variant: "warning" },
  disconnected: { label: "Desconectada", variant: "warning" },
  error: { label: "Com erro", variant: "destructive" },
};

export const EVENT_STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  pending: { label: "Na fila", variant: "outline" },
  processed: { label: "Processado", variant: "success" },
  failed: { label: "Falhou", variant: "destructive" },
  ignored: { label: "Ignorado", variant: "warning" },
};

export const EVENT_LABELS: Record<string, string> = {
  "contact.upsert": "Contato",
  "opportunity.upsert": "Oportunidade",
  message: "Mensagem",
};
