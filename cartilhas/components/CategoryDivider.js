import { esc, pad, page } from "./util.js";

export function CategoryDivider(ctx, cat) {
  const msgs = ctx.data.mensagens.filter((m) => m.categoria === cat.id);
  const index = msgs
    .map(
      (m) => `<li><span class="n">${esc(m.id)}</span><span class="t">${esc(m.tituloSituacao)}</span><span class="p">pág. ${pad(ctx.pageOfMessage[m.id])}</span></li>`
    )
    .join("");
  const body = `
    <div class="div-hero" data-decor>
    <div class="div-top">
      <span class="eyebrow">Categoria</span>
      <span class="eyebrow" style="color:var(--gray-500)">Mensagens ${esc(cat.intervalo)}</span>
    </div>
    <div class="div-num">${esc(cat.id)}</div>
    <h2 class="div-title">${cat.titulo.map(esc).join("<br>")}</h2>
    </div>
    <p class="div-sub">${esc(cat.subtitulo)}</p>
    ${cat.nota ? `<p class="div-note">“${esc(cat.nota)}”</p>` : ""}
    ${cat.aviso ? `<div class="div-warn"><span class="label">Atenção</span>${esc(cat.aviso)}</div>` : ""}
    <div class="div-index">
      <span class="label">Nesta categoria</span>
      <ul>${index}</ul>
    </div>`;
  return page({ kind: "divider", ctx, body, attrs: `data-category="${esc(cat.id)}"` });
}
