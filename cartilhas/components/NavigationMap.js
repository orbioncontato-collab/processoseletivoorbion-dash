import { esc, page, pagesLabel } from "./util.js";

export function NavigationMap(ctx) {
  const rows = ctx.data.categorias
    .map((cat) => {
      const r = ctx.rangeOf[cat.id];
      return `
      <div class="map-row">
        <span class="num-badge">${esc(cat.id)}</span>
        <span class="situ">${esc(cat.rotuloMapa)}</span>
        <span class="go-to">
          <span class="msgs"><span class="arr">→</span>Mensagens ${esc(cat.intervalo)}</span>
          <span class="pgs">${pagesLabel(r.first, r.last)}</span>
        </span>
      </div>`;
    })
    .join("");
  const body = `
    <span class="eyebrow">Mapa rápido</span>
    <h1 class="page-title" style="margin-top:2mm">${esc(ctx.data.mapa.titulo)}</h1>
    <div class="map-list">${rows}</div>
    <p class="map-hint">Não achou a situação exata? Use a <strong>mais parecida</strong> e ajuste os campos em amarelo.</p>`;
  return page({ kind: "map", ctx, body });
}
