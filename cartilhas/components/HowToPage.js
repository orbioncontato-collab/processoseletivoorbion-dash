import { esc, page } from "./util.js";

export function HowToPage(ctx) {
  const c = ctx.data.comoUsar;
  const steps = c.etapas
    .map(
      (e) => `
      <div class="step">
        <div class="step-num">${esc(e.numero)}</div>
        <div class="step-body">
          <h3 class="step-title">${esc(e.titulo)}</h3>
          ${e.descricao ? `<p class="step-desc">${esc(e.descricao)}</p>` : ""}
        </div>
      </div>`
    )
    .join("");
  const body = `
    <span class="eyebrow">Antes de mandar outro follow-up</span>
    <h1 class="page-title" style="margin-top:2mm">${esc(c.titulo)}</h1>
    <div class="steps">${steps}</div>
    <p class="howto-foot">${esc(c.rodape)}</p>`;
  return page({ kind: "howto", ctx, body });
}
