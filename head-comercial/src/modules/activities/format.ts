import { formatMoney } from "@/lib/format";

/**
 * Transforma uma linha do histórico em frase legível.
 * Função pura, sem acesso ao banco, para ser testada facilmente.
 */

export interface ActivityRow {
  id: number;
  actor_type: "user" | "integration" | "automation" | "agent" | "system";
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: unknown;
  occurred_at: string;
}

export interface EntityInfo {
  email?: string;
  userId?: string;
  name?: string;
}

export interface FormatContext {
  /** Nome de cada usuário, pelo id. */
  names: Record<string, string>;
  /** Dados atuais do registro afetado, pelo id (para dar contexto às alterações). */
  entities: Record<string, EntityInfo>;
  /** Nome das etapas do funil, pelo id. */
  stages?: Record<string, string>;
}

const LOST: Record<string, string> = {
  preco: "preço",
  timing: "momento errado",
  concorrente: "fechou com concorrente",
  sem_resposta: "parou de responder",
  sem_fit: "sem perfil para a solução",
  sem_orcamento: "sem orçamento",
  outro: "outro motivo",
};

const OPP_FIELD: Record<string, string> = {
  title: "título",
  product: "produto",
  expected_close_date: "previsão de fechamento",
  contact_id: "contato",
  lost_reason_detail: "detalhe da perda",
};

const CONTACT_FIELD: Record<string, string> = {
  name: "nome",
  phone_e164: "telefone",
  email: "e-mail",
  organization: "empresa",
  notes: "observações",
  owner_id: "responsável",
};

function describeOpportunity(row: ActivityRow, changes: Record<string, unknown>, ctx: FormatContext): string {
  const stageName = (id: unknown) => ctx.stages?.[str(id)] ?? "outra etapa";
  const person = (id: unknown) => ctx.names[str(id)] || "outra pessoa";
  if (row.action === "insert") {
    return `Oportunidade criada: ${str(changes.title)} (${stageName(changes.stage_id)})`;
  }
  if (row.action !== "update") return "Oportunidade removida";

  const parts: string[] = [];
  const status = changes.status as Change | undefined;
  const lostReason = (changes.lost_reason as Change | undefined)?.para;
  if (status && str(status.para) === "won") parts.push("Marcada como ganha");
  else if (status && str(status.para) === "lost")
    parts.push(`Encerrada como perdida${lostReason ? ` (${LOST[str(lostReason)] ?? str(lostReason)})` : ""}`);
  else if (status && str(status.para) === "open") parts.push("Reaberta");

  const stage = changes.stage_id as Change | undefined;
  if (stage) parts.push(`Etapa: ${stageName(stage.de)} → ${stageName(stage.para)}`);
  const value = changes.value_cents as Change | undefined;
  if (value) parts.push(`Valor: ${formatMoney(Number(value.de))} → ${formatMoney(Number(value.para))}`);
  const owner = changes.owner_id as Change | undefined;
  if (owner) parts.push(`Responsável: ${person(owner.de)} → ${person(owner.para)}`);
  const next = changes.next_step as Change | undefined;
  if (next && next.para && !status) parts.push(`Próximo passo: ${str(next.para)}`);
  else if (changes.next_step_at && !status) parts.push("Data do próximo passo alterada");
  const others = Object.keys(changes).filter((k) => OPP_FIELD[k]).map((k) => OPP_FIELD[k]);
  if (others.length) parts.push(`Alterou ${others.join(", ")}`);

  return parts.length ? parts.join(" · ") : "Oportunidade atualizada";
}

type Change = { de: unknown; para: unknown };

const ROLE: Record<string, string> = { leader: "líder", seller: "vendedor" };
const FIELD: Record<string, string> = {
  name: "nome",
  slug: "identificador",
  timezone: "fuso horário",
  status: "situação",
  max_users: "limite de usuários",
  role: "papel",
  full_name: "nome",
};

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

export function actorLabel(row: ActivityRow, ctx: FormatContext): string {
  switch (row.actor_type) {
    case "user":
      return (row.actor_id && ctx.names[row.actor_id]) || "Usuário";
    case "integration":
      return "Integração";
    case "automation":
      return "Automação";
    case "agent":
      return "Agente de IA";
    default:
      return "Sistema";
  }
}

export function describeActivity(row: ActivityRow, ctx: FormatContext): string {
  const changes = obj(row.changes);
  const entity = (row.entity_id && ctx.entities[row.entity_id]) || {};
  const person = (id: unknown) => ctx.names[str(id)] || "um usuário";

  if (row.entity_type === "memberships") {
    const userId = str(changes.user_id) || entity.userId;
    if (row.action === "insert") {
      return `${person(userId)} entrou na equipe como ${ROLE[str(changes.role)] ?? "membro"}`;
    }
    if (row.action === "update") {
      const status = changes.status as Change | undefined;
      const role = changes.role as Change | undefined;
      if (status) {
        return str(status.para) === "disabled"
          ? `${person(userId)} foi desativado da equipe`
          : `${person(userId)} foi reativado na equipe`;
      }
      if (role) {
        return `Papel de ${person(userId)} mudou de ${ROLE[str(role.de)] ?? str(role.de)} para ${ROLE[str(role.para)] ?? str(role.para)}`;
      }
    }
    if (row.action === "delete") return `${person(userId)} foi removido da equipe`;
  }

  if (row.entity_type === "invitations") {
    const email = str(changes.email) || entity.email || "um e-mail";
    if (row.action === "insert") {
      return `Convite enviado para ${email} como ${ROLE[str(changes.role)] ?? "membro"}`;
    }
    if (row.action === "update") {
      const status = changes.status as Change | undefined;
      if (status && str(status.para) === "accepted") return `Convite de ${email} foi aceito`;
      if (status && str(status.para) === "revoked") return `Convite de ${email} foi cancelado`;
      if (changes.user_id) return `Convite de ${email} ligado à conta criada`;
    }
  }

  if (row.entity_type === "opportunities") return describeOpportunity(row, changes, ctx);

  if (row.entity_type === "opportunity_objections") {
    if (row.action === "insert") return `Objeção registrada: ${str(changes.description)}`;
    const status = changes.status as Change | undefined;
    if (status) return str(status.para) === "handled" ? "Objeção marcada como resolvida" : "Objeção reaberta";
    if (row.action === "delete") return "Objeção removida";
    return "Objeção editada";
  }

  if (row.entity_type === "contacts") {
    if (row.action === "insert") return `Contato criado: ${str(changes.name)}`;
    const archived = changes.archived_at as Change | undefined;
    if (archived) return archived.para ? "Contato arquivado" : "Contato reativado";
    const fields = Object.keys(changes).map((k) => CONTACT_FIELD[k] ?? k);
    return `Contato alterado: ${fields.join(", ")}`;
  }

  if (row.entity_type === "pipeline_stages") {
    if (row.action === "insert") return `Etapa criada no funil: ${str(changes.name)}`;
    const name = changes.name as Change | undefined;
    if (name) return `Etapa renomeada de ${str(name.de)} para ${str(name.para)}`;
    const archived = changes.archived_at as Change | undefined;
    if (archived) return archived.para ? "Etapa arquivada" : "Etapa reativada";
    if (changes.position) return "Ordem das etapas alterada";
  }

  if (row.entity_type === "pipelines" && row.action === "insert") return "Funil criado";

  if (row.entity_type === "companies") {
    const name = str(changes.name && typeof changes.name === "string" ? changes.name : "") || entity.name || "";
    if (row.action === "insert") return `Empresa ${name} criada`;
    if (row.action === "update") {
      const fields = Object.keys(changes).map((k) => FIELD[k] ?? k);
      return `Dados da empresa alterados: ${fields.join(", ")}`;
    }
  }

  const verb: Record<string, string> = { insert: "criado", update: "alterado", delete: "apagado" };
  return `Registro ${verb[row.action] ?? row.action} (${row.entity_type})`;
}
