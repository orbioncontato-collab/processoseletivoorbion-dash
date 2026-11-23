// Servidor falso da Evolution API, só para os testes de ponta a ponta.
// Imita: criar instância, devolver QR Code, informar e mudar a situação da conexão.
import http from "node:http";

const PORT = Number(process.env.MOCK_EVOLUTION_PORT ?? 54399);
const KEY = process.env.EVOLUTION_API_KEY ?? "chave-de-teste";
// PNG 1x1 transparente.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const instances = new Map(); // nome -> { webhookUrl, state }

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

http
  .createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const url = new URL(req.url, "http://x");
    const parts = url.pathname.split("/").filter(Boolean);

    // Rotas de controle do teste (sem chave).
    if (parts[0] === "__instances") return send(res, 200, [...instances].map(([name, v]) => ({ name, ...v })));
    if (parts[0] === "__state" && parts[1]) {
      const inst = instances.get(parts[1]);
      if (inst) inst.state = body.state;
      return send(res, inst ? 200 : 404, { ok: Boolean(inst) });
    }

    if (req.headers.apikey !== KEY) return send(res, 401, { error: "apikey inválida" });

    if (req.method === "POST" && url.pathname === "/instance/create") {
      instances.set(body.instanceName, { webhookUrl: body.webhook?.url, state: "connecting" });
      return send(res, 201, { instance: { instanceName: body.instanceName }, qrcode: { base64: `data:image/png;base64,${PNG}` } });
    }
    const name = parts[2];
    const inst = name ? instances.get(name) : undefined;
    if (!inst) return send(res, 404, { error: "instância não encontrada" });
    if (req.method === "GET" && parts[1] === "connect") return send(res, 200, { base64: `data:image/png;base64,${PNG}`, code: "x" });
    if (req.method === "GET" && parts[1] === "connectionState") return send(res, 200, { instance: { instanceName: name, state: inst.state } });
    if (req.method === "DELETE" && parts[1] === "logout") {
      inst.state = "close";
      return send(res, 200, { status: "SUCCESS" });
    }
    return send(res, 404, { error: "rota desconhecida" });
  })
  .listen(PORT, "127.0.0.1", () => console.log(`Evolution falsa em http://127.0.0.1:${PORT}`));
