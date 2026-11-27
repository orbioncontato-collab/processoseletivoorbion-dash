// Servidor falso da API da Anthropic, só para os testes de ponta a ponta.
// Imita o laço com ferramentas do chat e a resposta estruturada do Analista,
// com respostas previsíveis montadas a partir do que o próprio sistema envia.
import http from "node:http";

const PORT = Number(process.env.MOCK_ANTHROPIC_PORT ?? 54398);
const requests = [];
let counter = 0;

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const message = (content, stop_reason) => ({
  id: `msg_mock_${++counter}`,
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content,
  stop_reason,
  stop_sequence: null,
  usage: { input_tokens: 1200, output_tokens: 300, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 },
});

const textOf = (content) =>
  typeof content === "string" ? content : (content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");

function chatReply(body) {
  const last = body.messages.at(-1);
  // Depois de uma ferramenta: resume o resultado.
  if (Array.isArray(last.content) && last.content.some((b) => b.type === "tool_result")) {
    const result = last.content.find((b) => b.type === "tool_result");
    let data;
    try {
      data = JSON.parse(typeof result.content === "string" ? result.content : textOf(result.content));
    } catch {
      data = null;
    }
    if (Array.isArray(data) && data[0]?.titulo) {
      return message([{ type: "text", text: `Suas prioridades agora:\n${data.map((o) => `- ${o.titulo} (${o.cliente})`).join("\n")}` }], "end_turn");
    }
    if (Array.isArray(data) && data[0]?.documento) {
      return message([{ type: "text", text: `Segundo o documento ${data[0].documento}: ${data[0].trecho.slice(0, 160)}` }], "end_turn");
    }
    if (Array.isArray(data) && data.length === 0) {
      return message([{ type: "text", text: "Não encontrei nada em aberto para você agora." }], "end_turn");
    }
    return message([{ type: "text", text: `Resultado da consulta: ${JSON.stringify(data).slice(0, 200)}` }], "end_turn");
  }

  const question = textOf(last.content).toLowerCase();
  const toolUse = (name, input) =>
    message(
      [
        { type: "thinking", thinking: "", signature: "mock-signature" },
        { type: "tool_use", id: `toolu_mock_${++counter}`, name, input },
      ],
      "tool_use",
    );
  if (question.includes("fazer") || question.includes("prioridade")) return toolUse("listar_oportunidades", { situacao: "open" });
  if (question.includes("caro") || question.includes("objeção")) return toolUse("buscar_conhecimento", { pergunta: question });
  if (question.includes("recusa")) return message([], "refusal");

  // Pergunta de continuação: prova que o histórico com as ferramentas foi reenviado.
  const earlierTools = body.messages.flatMap((m) => (Array.isArray(m.content) ? m.content : [])).filter((b) => b.type === "tool_use").length;
  return message([{ type: "text", text: `Certo. Nesta conversa já fiz ${earlierTools} consulta(s) ao sistema.` }], "end_turn");
}

function analysisReply(body) {
  const content = textOf(body.messages.at(-1).content);
  const calibration = content.match(/<exemplos_de_calibragem>\n## ([^\n(]+)/)?.[1]?.trim();
  const lines = (content.match(/<conversa[^>]*>\n([\s\S]*?)\n<\/conversa>/)?.[1] ?? "").split("\n").filter(Boolean);
  const result = {
    resumo: `Conversa com ${lines.length} mensagens. O cliente pediu preço e o vendedor respondeu sem entender a necessidade.${calibration ? ` Referência usada: ${calibration}.` : ""}`,
    nota_geral: 6,
    etapa_alcancada: "Primeiro contato",
    criterios: [
      { nome: "Abertura e conexão", nota: 7, comentario: "Cumprimentou e respondeu rápido." },
      { nome: "Diagnóstico da necessidade", nota: 4, comentario: "Não perguntou o que motivou a busca." },
    ],
    pontos_fortes: ["Respondeu em poucos minutos"],
    falhas: ["Mandou o preço antes de entender a necessidade"],
    objecoes: ["Preço"],
    recomendacoes: ["Antes do preço, pergunte o que o cliente quer resolver"],
    proximo_passo: "Ligar para entender a necessidade e reapresentar a proposta",
  };
  return message([{ type: "text", text: JSON.stringify(result) }], "end_turn");
}

http
  .createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const url = new URL(req.url, "http://x");

    if (url.pathname === "/__requests") return send(res, 200, requests.slice(-20));

    if (!req.headers["x-api-key"] && !req.headers.authorization) return send(res, 401, { type: "error", error: { type: "authentication_error", message: "sem chave" } });
    if (req.method !== "POST" || url.pathname !== "/v1/messages") return send(res, 404, { type: "error", error: { type: "not_found_error", message: url.pathname } });

    const body = JSON.parse(raw || "{}");
    requests.push({ beta: req.headers["anthropic-beta"] ?? null, body });
    if (!body.model || !Array.isArray(body.messages) || !body.max_tokens) {
      return send(res, 400, { type: "error", error: { type: "invalid_request_error", message: "pedido incompleto" } });
    }
    if (body.thinking?.type === "disabled") {
      return send(res, 400, { type: "error", error: { type: "invalid_request_error", message: "thinking disabled não é aceito" } });
    }
    return send(res, 200, body.output_config?.format ? analysisReply(body) : chatReply(body));
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Anthropic falsa em http://127.0.0.1:${PORT}`));
