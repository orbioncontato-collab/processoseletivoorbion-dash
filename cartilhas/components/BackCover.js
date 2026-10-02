import { esc, page } from "./util.js";

export function BackCover(ctx) {
  const { meta, contracapa } = ctx.data;
  const lines = contracapa.linhas
    .map((l, i) => `<p class="${i >= 2 ? "step-line" : ""}">${esc(l)}</p>`)
    .join("");
  const body = `
    <div class="back-lines">${lines}</div>
    <div class="back-sign">
      <div class="name">${esc(meta.titulo.join(" "))}<small>${esc(meta.marca)}</small></div>
      <span class="brand-mark" role="img" aria-label="Orbion"></span>
    </div>`;
  return page({ kind: "back", ctx, body, footer: false });
}
