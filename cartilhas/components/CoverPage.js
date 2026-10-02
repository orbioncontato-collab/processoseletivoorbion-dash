import { esc, page } from "./util.js";

export function CoverPage(ctx) {
  const { meta, capa } = ctx.data;
  const body = `
    <div>
      <div class="cover-top">
        <div class="cover-bar"><span></span><span></span></div>
        <span class="eyebrow">${esc(ctx.totalMessages)} mensagens prontas</span>
      </div>
      <h1 class="cover-title">
        <span class="t1">${esc(meta.titulo[0])}</span>
        <span class="t2">${esc(meta.titulo[1]).replace(" ", "<br>")}</span>
      </h1>
      <p class="cover-sub" data-check="promessa">${esc(meta.subtitulo)}</p>
    </div>
    <div class="chat" aria-label="Conversa sem resposta">
      <div class="chat-out">
        <div class="chat-bubble"><span class="chat-x" aria-label="Mensagem errada">✕</span>${esc(capa.bolhaMensagem)}</div>
        <div class="chat-meta">Mensagem enviada <span class="ticks">${esc(capa.status)}</span></div>
      </div>
      <div class="chat-silence"><span>${esc(capa.silencio)}</span></div>
    </div>
    <div class="cover-bottom">
      <span class="brand-mark" role="img" aria-label="Orbion"></span>
      <span class="brand-text">${esc(meta.marca)}</span>
    </div>`;
  return page({ kind: "cover", ctx, body, footer: false });
}
