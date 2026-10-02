import { esc, page } from "./util.js";

// Folha de controle imprimível. A tabela é girada para ganhar largura de escrita.
export function TrackingSheet(ctx, { extra = false } = {}) {
  const c = ctx.data.controle;
  const widths = [14, 13, 11, 10, 10, 11, 12, 19]; // % por coluna
  const head = c.colunas.map((col, i) => `<th style="width:${widths[i] ?? 12}%">${esc(col)}</th>`).join("");
  const ynIndex = c.colunas.findIndex((col) => /respondeu/i.test(col));
  const msgIndex = c.colunas.findIndex((col) => /mensagem/i.test(col));
  const row = c.colunas
    .map((_, i) => (i === ynIndex ? `<td class="yn">☐ Sim ☐ Não</td>` : i === msgIndex ? `<td>Nº</td>` : "<td></td>"))
    .join("");
  const rows = Array.from({ length: c.linhas }, () => `<tr>${row}</tr>`).join("");
  const body = `
    <div class="tracking-rotated">
      <div class="tracking-head">
        <div>
          <span class="eyebrow">Folha de controle</span>
          <h1 class="page-title" style="margin-top:1.5mm">${esc(c.titulo)}</h1>
        </div>
        <div class="meta">
          ${extra ? `<span class="print-note">${esc(c.avisoExtra)}</span>` : ""}
          <span class="pg">${esc(ctx.data.meta.titulo.join(" "))} · PÁG. ${String(ctx.pageNumber).padStart(2, "0")}</span>
        </div>
      </div>
      <table class="track"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  return page({ kind: "tracking", ctx, body, footer: false, attrs: extra ? 'data-extra="1"' : "" });
}
