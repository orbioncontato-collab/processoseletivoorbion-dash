"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardCopy, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { gerarComIA, salvarRespostaColada, verPrompt, type PedidoGeracao } from "@/app/actions";

/**
 * Painel que gera conteúdo com IA.
 * - Com chave de API: um clique e pronto.
 * - Sem chave: mostra o prompt para copiar, você cola no claude.ai e
 *   traz a resposta de volta para salvar aqui.
 */
export function PainelIA({
  pedido,
  rotulo,
  iaDisponivel,
  compacto = false,
  desabilitado,
}: {
  pedido: PedidoGeracao;
  rotulo: string;
  iaDisponivel: boolean;
  compacto?: boolean;
  desabilitado?: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [resposta, setResposta] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const gerar = () =>
    iniciar(async () => {
      setMsg(null);
      const r = await gerarComIA(pedido);
      setMsg(r.ok ? { ok: true, texto: r.msg ?? "Pronto." } : { ok: false, texto: r.erro });
    });

  const abrirPrompt = () =>
    iniciar(async () => {
      setMsg(null);
      const r = await verPrompt(pedido);
      if (r.ok) setPrompt(r.prompt);
      else setMsg({ ok: false, texto: r.erro });
    });

  const copiar = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarRespostaColada(pedido, resposta);
      if (r.ok) {
        setPrompt(null);
        setResposta("");
        setMsg({ ok: true, texto: "Salvo." });
      } else setMsg({ ok: false, texto: r.erro });
    });

  const botao = compacto
    ? "inline-flex items-center gap-1.5 rounded-md border border-borda bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
    : "inline-flex items-center gap-2 rounded-lg bg-noturno px-4 py-2 text-sm font-semibold text-white hover:bg-noturno-2 disabled:opacity-50";

  if (desabilitado) {
    return <p className="text-xs text-suave">{desabilitado}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {iaDisponivel && (
          <button onClick={gerar} disabled={pendente} className={botao}>
            {pendente ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className={compacto ? "" : "text-orbital"} />}
            {pendente ? "Gerando, pode levar um minuto…" : rotulo}
          </button>
        )}
        <button
          onClick={prompt ? () => setPrompt(null) : abrirPrompt}
          disabled={pendente}
          className={
            iaDisponivel
              ? "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-suave underline-offset-2 hover:underline"
              : botao
          }
        >
          {!iaDisponivel && <Sparkles size={15} className={compacto ? "" : "text-orbital"} />}
          {prompt ? "Fechar prompt" : iaDisponivel ? "ver prompt" : `${rotulo} (copiar prompt)`}
        </button>
      </div>

      {msg && <p className={`whitespace-pre-line text-sm ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.texto}</p>}

      {prompt && (
        <div className="space-y-3 rounded-xl border border-borda bg-slate-50 p-4">
          <div className="text-sm text-slate-700">
            <b>Passo 1.</b> Copie o prompt e cole numa conversa nova do Claude.
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copiar} className="inline-flex items-center gap-1.5 rounded-md bg-noturno px-3 py-1.5 text-xs font-semibold text-white">
              {copiado ? <Check size={14} /> : <ClipboardCopy size={14} />}
              {copiado ? "Copiado" : "Copiar prompt"}
            </button>
            <a
              href="https://claude.ai/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-borda bg-white px-3 py-1.5 text-xs font-medium"
            >
              Abrir o Claude <ExternalLink size={13} />
            </a>
          </div>
          <details>
            <summary className="cursor-pointer text-xs text-suave">ver o prompt ({Math.round(prompt.length / 1000)} mil caracteres)</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-white p-3 text-xs text-slate-700">{prompt}</pre>
          </details>
          <div className="text-sm text-slate-700">
            <b>Passo 2.</b> Cole aqui a resposta do Claude para salvar na plataforma.
          </div>
          <textarea
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            rows={6}
            placeholder="Cole a resposta aqui…"
            className="w-full rounded-md border border-borda bg-white p-3 text-sm"
          />
          <button
            onClick={salvar}
            disabled={pendente || !resposta.trim()}
            className="rounded-md bg-orbital px-3 py-1.5 text-xs font-semibold text-noturno disabled:opacity-50"
          >
            Salvar resposta
          </button>
        </div>
      )}
    </div>
  );
}
