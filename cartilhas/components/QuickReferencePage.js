import { esc, page, pagesLabel } from "./util.js";

// Cola rápida: precisa funcionar sozinha quando impressa.
export function QuickReferencePage(ctx) {
  const rows = ctx.data.categorias
    .map((cat) => {
      const r = ctx.rangeOf[cat.id];
      return `
      <div class="cheat-row">
        <span class="situ"><span class="num-badge">${esc(cat.id)}</span>${esc(cat.rotuloCola)}</span>
        <span class="range"><span class="arr">→</span>${esc(cat.intervalo)}</span>
      </div>`;
    })
    .join("");
  const body = `
    <span class="eyebrow">Cola rápida · ${esc(ctx.data.meta.titulo.join(" "))}</span>
    <h1 class="page-title" style="margin-top:2mm">${ctx.data.colaRapida.titulo.map(esc).join("<br>")}</h1>
    <div class="cheat-list">${rows}</div>
    <p class="cheat-foot">Números à direita = mensagens. Encontre a situação, abra a mensagem, personalize os campos em amarelo e envie.</p>`;
  return page({ kind: "cheat", ctx, body });
}
