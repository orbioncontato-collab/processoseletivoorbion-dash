// Gera o PDF A5 e roda as checagens de qualidade.
//
//   node scripts/exportar-pdf.mjs                     -> dist/cartilha-cliente-sumido.pdf
//   node scripts/exportar-pdf.mjs --sangria           -> versão gráfica com 3mm de sangria
//   node scripts/exportar-pdf.mjs --png               -> também salva cada página em PNG (dist/png)
//   node scripts/exportar-pdf.mjs --cartilha=outra    -> usa data/cartilha-outra.json
//
// Requer o pacote "playwright" (npm i -D playwright) e o Chromium dele.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);
const slug = args.cartilha || "cliente-sumido";
const bleed = !!args.sangria;

async function loadPlaywright() {
  try { return await import("playwright"); } catch {}
  const req = createRequire(import.meta.url);
  for (const p of [process.env.PLAYWRIGHT_PATH, "/opt/node22/lib/node_modules/playwright"].filter(Boolean)) {
    try { return req(p); } catch {}
  }
  throw new Error('Pacote "playwright" não encontrado. Rode: npm i -D playwright');
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".woff2": "font/woff2" };
function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

const { chromium } = await loadPlaywright();
const server = await serve();
const url = `http://localhost:${server.address().port}/index.html?cartilha=${slug}${bleed ? "&sangria=1" : ""}`;
const browser = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") && !process.env.PW_DEFAULT ? {} : {});
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(url);
await page.waitForFunction(() => window.__CARTILHA_READY__ || window.__CARTILHA_ERROR__);
const err = await page.evaluate(() => window.__CARTILHA_ERROR__);
if (err) throw new Error(err);

const data = JSON.parse(fs.readFileSync(path.join(ROOT, `data/cartilha-${slug}.json`), "utf8"));
const expected = data.checagens || {};

// ---------- Checagens dentro do navegador ----------
const report = await page.evaluate(({ bleedMm }) => {
  const mm = 96 / 25.4;
  const problems = [];
  const pages = [...document.querySelectorAll(".page")];
  pages.forEach((p, i) => {
    const n = i + 1;
    const r = p.getBoundingClientRect();
    const safe = getComputedStyle(document.documentElement).getPropertyValue("--safe").trim();
    const s = (parseFloat(safe) + bleedMm) * mm - 0.75; // tolerância de 0.2mm
    const box = { l: r.left + s, t: r.top + s, r: r.right - s, b: r.bottom - s };
    const content = p.querySelector(".content");
    if (content.scrollHeight > content.clientHeight + 1) problems.push(`pág ${n}: conteúdo maior que a página (${content.scrollHeight - content.clientHeight}px)`);
    p.querySelectorAll(".content *").forEach((el) => {
      const e = el.getBoundingClientRect();
      if (!e.width || !e.height) return;
      if (e.left < box.l || e.top < box.t || e.right > box.r || e.bottom > box.b) {
        problems.push(`pág ${n}: <${el.tagName.toLowerCase()} class="${el.className}"> sai da margem segura`);
      }
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible") {
        problems.push(`pág ${n}: texto cortado em .${el.className}`);
      }
    });
  });
  const msgIds = [...document.querySelectorAll(".page-message")].map((p) => p.dataset.message);
  const msgTexts = [...document.querySelectorAll('[data-check="mensagem"]')].map((e) => e.innerText.trim());
  const text = document.querySelector(".sheets").innerText;
  return {
    pages: pages.length,
    widthMm: pages[0].getBoundingClientRect().width / mm,
    heightMm: pages[0].getBoundingClientRect().height / mm,
    msgIds,
    dupMessages: msgTexts.length - new Set(msgTexts).size,
    promise: document.querySelector('[data-check="promessa"]').innerText.trim(),
    fontOk: document.fonts.check('700 16px "Inter"'),
    text,
    problems,
  };
}, { bleedMm: bleed ? 3 : 0 });

const checks = [];
const ok = (cond, label) => checks.push([cond, label]);
const pad = (n) => String(n).padStart(2, "0");
ok(report.pages === (expected.paginas ?? 44), `${report.pages} páginas (esperado ${expected.paginas ?? 44})`);
ok(report.msgIds.length === (expected.mensagens ?? 27), `${report.msgIds.length} mensagens (esperado ${expected.mensagens ?? 27})`);
ok(report.msgIds.every((id, i) => id === pad(i + 1)), "numeração 01 em sequência, sem pular");
ok(report.dupMessages === 0, "nenhuma mensagem duplicada");
ok(Math.abs(report.widthMm - (148 + (bleed ? 6 : 0))) < 0.5 && Math.abs(report.heightMm - (210 + (bleed ? 6 : 0))) < 0.5,
  `formato ${report.widthMm.toFixed(1)} x ${report.heightMm.toFixed(1)} mm`);
ok(report.promise === data.meta.subtitulo, "promessa da capa idêntica ao dado");
ok(report.fontOk, "fonte Inter carregada");
ok(report.problems.length === 0, `sem overflow / margem segura respeitada${report.problems.length ? ":\n     " + report.problems.join("\n     ") : ""}`);
const banned = (expected.palavrasProibidas ?? ["método", "metodologia", "curso", "aprenda"]).filter((w) => new RegExp(`\\b${w}\\b`, "i").test(report.text));
ok(banned.length === 0, `sem linguagem de treinamento${banned.length ? ": " + banned.join(", ") : ""}`);
ok(!report.text.includes("—"), "sem travessão (—)");
const garantia = /(garant|com certeza ele|vai responder)/i.exec(report.text);
ok(!garantia, `sem promessa de resultado garantido${garantia ? ": " + garantia[0] : ""}`);

// ---------- PDF ----------
const outDir = path.join(ROOT, "dist");
fs.mkdirSync(outDir, { recursive: true });
const pdfPath = path.join(outDir, `cartilha-${slug}${bleed ? "-sangria" : ""}.pdf`);
await page.emulateMedia({ media: "print" });
await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
const pdfPages = (fs.readFileSync(pdfPath, "latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
ok(pdfPages === report.pages, `PDF com ${pdfPages} páginas`);

if (args.png) {
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => { document.querySelector(".toolbar").style.display = "none"; });
  const pngDir = path.join(outDir, "png");
  fs.mkdirSync(pngDir, { recursive: true });
  const els = await page.$$(".page");
  for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: path.join(pngDir, `pagina-${pad(i + 1)}.png`) });
}

await browser.close();
server.close();

let failed = 0;
for (const [c, label] of checks) { if (!c) failed++; console.log(`${c ? "✓" : "✗"} ${label}`); }
console.log(`\nPDF: ${path.relative(process.cwd(), pdfPath)}`);
process.exit(failed ? 1 : 0);
