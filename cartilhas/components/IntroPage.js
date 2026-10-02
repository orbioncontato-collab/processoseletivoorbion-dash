import { esc, pad, page } from "./util.js";

export function IntroPage(ctx) {
  const a = ctx.data.abertura;
  const body = `
    <h1 class="intro-headline">${esc(a.headline)}</h1>
    <p class="intro-comp">${esc(a.complemento)}</p>
    <div class="intro-rule"></div>
    <div class="intro-text">${a.paragrafos.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    <p class="intro-pointer"><span class="arrow">→</span> Comece pelo mapa da página ${pad(ctx.pageOf.map)}.</p>`;
  return page({ kind: "intro", ctx, body });
}
