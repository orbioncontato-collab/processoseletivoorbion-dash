import { normalizePhone, zonedLocalToUtc } from "@/lib/format";
import type { Envelope } from "./standard";

/**
 * Importação por planilha (CSV). Funções puras, testadas em csv.test.ts.
 * Aceita separador ";" (Excel em português) ou ",", aspas, quebras de linha
 * dentro de aspas e o marcador BOM do início do arquivo.
 */

export const CSV_COLUMNS = [
  "nome",
  "telefone",
  "email",
  "empresa",
  "responsavel_email",
  "titulo",
  "valor",
  "produto",
  "etapa",
  "situacao",
  "motivo_perda",
  "proximo_passo",
  "data_proximo_passo",
  "previsao_fechamento",
  "contato_id",
  "oportunidade_id",
] as const;

export const CSV_TEMPLATE =
  CSV_COLUMNS.join(";") +
  "\n" +
  [
    "Maria Souza",
    "(11) 91234-5678",
    "maria@cliente.com",
    "Cliente SA",
    "",
    "Consultoria comercial",
    "12.000,00",
    "Consultoria",
    "Proposta",
    "aberta",
    "",
    "Enviar proposta revisada",
    "28/11/2026 10:00",
    "15/12/2026",
    "",
    "",
  ].join(";") +
  "\n";

export const MAX_IMPORT_ROWS = 500;

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"' && field === "") quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const normHeader = (h: string) =>
  h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[()$.]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+$/g, "");

/** Nomes de coluna comuns aceitos como sinônimos. */
const HEADER_ALIASES: Record<string, string> = {
  e_mail: "email",
  whatsapp: "telefone",
  celular: "telefone",
  fone: "telefone",
  empresa_do_cliente: "empresa",
  organizacao: "empresa",
  responsavel: "responsavel_email",
  email_responsavel: "responsavel_email",
  oportunidade: "titulo",
  negocio: "titulo",
  valor_r: "valor",
  status: "situacao",
  motivo_da_perda: "motivo_perda",
  proximo_passo_data: "data_proximo_passo",
  data_do_proximo_passo: "data_proximo_passo",
  previsao_de_fechamento: "previsao_fechamento",
};
const headerKey = (h: string) => {
  const n = normHeader(h);
  return HEADER_ALIASES[n] ?? n;
};

const STATUS: Record<string, "open" | "won" | "lost"> = {
  aberta: "open",
  aberto: "open",
  em_aberto: "open",
  ganha: "won",
  ganho: "won",
  perdida: "lost",
  perdido: "lost",
};

/** "28/11/2026 10:00" -> instante UTC no fuso da empresa. */
function brDateTime(v: string, timeZone: string): string | undefined | "invalid" {
  if (!v.trim()) return undefined;
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) return "invalid";
  const [, d, mo, y, h = "9", mi = "00"] = m;
  const date = zonedLocalToUtc(`${y}-${mo}-${d}T${h.padStart(2, "0")}:${mi}`, timeZone);
  return date ? date.toISOString() : "invalid";
}

function brDate(v: string): string | undefined | "invalid" {
  if (!v.trim()) return undefined;
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "invalid";
}

export interface CsvConversion {
  events: Envelope[];
  errors: { line: number; message: string }[];
}

/**
 * Converte as linhas da planilha em eventos do formato padrão.
 * Linha com título vira oportunidade (com o contato junto); sem título, só contato.
 * Os identificadores externos usam o telefone ou e-mail, para que reimportar a
 * mesma planilha atualize os registros em vez de duplicar.
 */
export function csvToEvents(rows: string[][], timeZone: string): CsvConversion {
  const errors: CsvConversion["errors"] = [];
  if (rows.length < 2) return { events: [], errors: [{ line: 1, message: "A planilha está vazia." }] };

  const headers = rows[0].map(headerKey);
  if (!headers.includes("nome")) {
    return { events: [], errors: [{ line: 1, message: 'A primeira linha precisa ter os nomes das colunas, incluindo "nome".' }] };
  }
  const body = rows.slice(1);
  if (body.length > MAX_IMPORT_ROWS) {
    return { events: [], errors: [{ line: 1, message: `Máximo de ${MAX_IMPORT_ROWS} linhas por importação.` }] };
  }

  const events: Envelope[] = [];
  body.forEach((cells, i) => {
    const line = i + 2;
    const get = (col: string) => (cells[headers.indexOf(col)] ?? "").trim();
    const name = get("nome");
    if (!name) {
      errors.push({ line, message: "Coluna nome vazia." });
      return;
    }
    const phone = get("telefone");
    const email = get("email").toLowerCase();
    const contactKey =
      get("contato_id") || normalizePhone(phone) || email || `nome:${name.toLowerCase()}`;
    const contact = {
      external_id: contactKey,
      name,
      ...(phone ? { phone } : {}),
      ...(email ? { email } : {}),
      ...(get("empresa") ? { organization: get("empresa") } : {}),
      ...(get("responsavel_email") ? { owner_email: get("responsavel_email") } : {}),
    };

    const title = get("titulo");
    if (!title) {
      events.push({ type: "contact.upsert", data: contact });
      return;
    }

    const statusRaw = normHeader(get("situacao"));
    const status = statusRaw ? STATUS[statusRaw] : undefined;
    if (statusRaw && !status) {
      errors.push({ line, message: `Situação "${get("situacao")}" inválida. Use aberta, ganha ou perdida.` });
      return;
    }
    const nextAt = brDateTime(get("data_proximo_passo"), timeZone);
    if (nextAt === "invalid") {
      errors.push({ line, message: "data_proximo_passo inválida. Use DD/MM/AAAA HH:MM." });
      return;
    }
    const closeDate = brDate(get("previsao_fechamento"));
    if (closeDate === "invalid") {
      errors.push({ line, message: "previsao_fechamento inválida. Use DD/MM/AAAA." });
      return;
    }

    const data: Record<string, unknown> = {
      external_id: get("oportunidade_id") || `${contactKey}:${title.toLowerCase()}`,
      title,
      contact,
    };
    if (get("valor")) data.value = get("valor");
    if (get("produto")) data.product = get("produto");
    if (get("etapa")) data.stage = get("etapa");
    if (status) data.status = status;
    if (get("motivo_perda")) data.lost_reason = get("motivo_perda");
    if (get("proximo_passo")) {
      data.next_step = get("proximo_passo");
      if (nextAt) data.next_step_at = nextAt;
    }
    if (closeDate) data.expected_close_date = closeDate;
    if (get("responsavel_email")) data.owner_email = get("responsavel_email");
    events.push({ type: "opportunity.upsert", data });
  });

  return { events, errors };
}
