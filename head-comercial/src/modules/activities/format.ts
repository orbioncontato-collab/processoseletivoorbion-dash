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
