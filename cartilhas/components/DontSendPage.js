import { esc, page } from "./util.js";

export function DontSendPage(ctx) {
  const n = ctx.data.naoMande;
  const cards = n.cards
    .map(
      (c) => `
      <div class="dont-card">
        <span class="phrase">“${esc(c.frase)}”</span>
        <span class="alt">→ ${esc(c.alternativa)}</span>
        <p class="why">${esc(c.porque)}</p>
      </div>`
    )
    .join("");
  const body = `
    <span class="eyebrow" style="color:var(--stop-ink)">Não mande isso</span>
    <h1 class="page-title" style="margin-top:2mm;font-size:22pt">${esc(n.titulo)}</h1>
    ${n.intro ? `<p class="dont-intro">${esc(n.intro)}</p>` : ""}
    <div class="dont-list">${cards}</div>`;
  return page({ kind: "dont", ctx, body });
}
