import { esc, page, paragraphs, withFields } from "./util.js";

// Template ÚNICO das páginas de mensagem. Não criar variações por mensagem.
export function MessagePage(ctx, m) {
  const cat = ctx.data.categorias.find((c) => c.id === m.categoria);
  const fields = (m.camposPersonalizaveis || []).map((f) => `<span class="ph">${esc(f)}</span>`).join("");
  const body = `
    <div class="msg-head">
      <span class="eyebrow">Mensagem ${esc(m.id)}</span>
      <span class="msg-tag"><b>${esc(cat.id)}</b> · ${esc(cat.rotuloMapa)}</span>
    </div>
    <h1 class="msg-title">${esc(m.tituloSituacao)}</h1>

    <div class="msg-when">
      <span class="label">Quando usar</span>
      <p>${esc(m.quandoUsar)}</p>
    </div>

    <div class="box box-dont">
      <span class="label">✕ Não mande isso</span>
      <p class="bad">“${esc(m.naoMandar)}”</p>
      <p class="why"><b>Por quê?</b> ${esc(m.motivoNaoMandar)}</p>
    </div>

    <div class="box box-do">
      <span class="label">✓ Mande isso</span>
      <div class="bubble" data-check="mensagem">${paragraphs(m.mensagemPrincipal)}</div>
      ${m.observacaoOpcional ? `<p class="tip"><span class="ico">!</span><span>${withFields(m.observacaoOpcional)}</span></p>` : ""}
    </div>

    <div class="msg-grid">
      <div class="box box-custom">
        <span class="label">Personalize</span>
        <div class="chips">${fields}</div>
      </div>
      <div class="box box-next">
        <span class="label">Se ele responder</span>
        <p>${esc(m.seResponder)}</p>
      </div>
    </div>

    <div class="msg-goal">
      <span class="label">Objetivo desta mensagem</span>
      <p>${esc(m.objetivo)}</p>
    </div>`;
  return page({ kind: "message", ctx, body, attrs: `data-message="${esc(m.id)}"` });
}
