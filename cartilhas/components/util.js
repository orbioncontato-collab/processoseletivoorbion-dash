// Funções compartilhadas por todos os componentes.

export const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const pad = (n) => String(n).padStart(2, "0");

// Escapa o texto e destaca os campos [Assim] como campos personalizáveis.
export const withFields = (s = "") => esc(s).replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>');

// Quebra o texto em parágrafos (linha em branco) e linhas (\n).
export const paragraphs = (s = "", fmt = withFields) =>
  String(s)
    .split(/\n\s*\n/)
    .map((p) => `<p>${p.split("\n").map(fmt).join("<br>")}</p>`)
    .join("");

// Moldura padrão de toda folha A5.
export function page({ kind, ctx, body, footer = true, attrs = "" }) {
  const foot = footer
    ? `<footer class="page-footer"><span>${esc(ctx.data.meta.titulo.join(" "))} · ${esc(ctx.data.meta.marca)}</span><span class="pg">${pad(ctx.pageNumber)}</span></footer>`
    : "";
  return `<section class="page page-${kind}" data-kind="${kind}" data-page="${ctx.pageNumber}" ${attrs}><div class="content">${body}</div>${foot}</section>`;
}

// "pág. 06" ou "págs. 06–10"
export const pagesLabel = (a, b) => (a === b ? `pág. ${pad(a)}` : `págs. ${pad(a)}–${pad(b)}`);
