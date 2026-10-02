import { esc, page } from "./util.js";

export function ErrorsPage(ctx) {
  const e = ctx.data.erros;
  const items = e.itens
    .map(
      (it, i) => `
      <li>
        <span class="n">${i + 1}</span>
        <div><p class="t">${esc(it.titulo)}</p><p class="e">${esc(it.explicacao)}</p></div>
      </li>`
    )
    .join("");
  const body = `
    <span class="eyebrow" style="color:var(--stop-ink)">Cuidado</span>
    <h1 class="page-title" style="margin-top:2mm;font-size:21pt">${esc(e.titulo)}</h1>
    <ul class="err-list">${items}</ul>`;
  return page({ kind: "errors", ctx, body });
}
