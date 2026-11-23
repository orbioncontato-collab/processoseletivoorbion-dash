/**
 * Traduz erros do banco (vindos do PostgREST) para mensagens claras.
 * As mensagens dos nossos gatilhos já são em português e podem ser mostradas.
 */
export interface DbError {
  code?: string;
  message: string;
}

const OUR_MESSAGES = [
  "Etapa inválida",
  "Etapa arquivada",
  "O responsável precisa ser membro ativo",
  "Mova as oportunidades abertas",
  "O funil precisa de pelo menos",
  "Não é possível mudar o tipo de uma etapa",
  "Oportunidade inválida",
];

export function friendlyDbError(err: DbError): string {
  const known = OUR_MESSAGES.find((m) => err.message.includes(m));
  if (known) return err.message;
  if (err.code === "42501" || /row-level security|permission denied/i.test(err.message)) {
    return "Você não tem permissão para fazer isso.";
  }
  if (err.code === "23505") {
    if (err.message.includes("contacts_unique_phone")) return "Já existe um contato com esse telefone.";
    return "Esse registro já existe.";
  }
  if (err.message.includes("lost_needs_reason")) return "Informe o motivo da perda.";
  if (err.message.includes("next_step_date_needs_text")) return "Descreva o próximo passo.";
  if (err.code === "23503") return "Um dos dados escolhidos não existe mais. Atualize a página.";
  return "Não foi possível salvar. Tente de novo.";
}
