"use client";

import { useState, useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { salvarAnuncio } from "@/app/actions";
import type { StatusAnuncio } from "@/lib/types";

export function AnuncioLinha({ username, nome, status }: { username: string; nome: string; status: StatusAnuncio }) {
  const [situacao, setSituacao] = useState(status.situacao);
  const [obs, setObs] = useState(status.observacao);
  const [pendente, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);

  // A Biblioteca de Anúncios da Meta é pública. A busca por nome costuma achar a página do perfil.
  const termo = encodeURIComponent(nome || username);
  const biblioteca = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${termo}&search_type=keyword_unordered&media_type=all`;

  const salvar = (nova: StatusAnuncio["situacao"], texto: string) =>
    iniciar(async () => {
      await salvarAnuncio(username, nova, texto);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1500);
    });

  const opcao = (valor: StatusAnuncio["situacao"], rotulo: string, cor: string) => (
    <button
      onClick={() => {
        setSituacao(valor);
        salvar(valor, obs);
      }}
      className={`rounded-md px-2.5 py-1 text-xs font-medium ${situacao === valor ? cor : "border border-borda bg-white text-slate-600"}`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="grid gap-3 py-4 md:grid-cols-[220px_auto_1fr] md:items-center">
      <div>
        <div className="font-semibold">@{username}</div>
        <a href={biblioteca} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-estrategico hover:underline">
          Abrir na Biblioteca de Anúncios <ExternalLink size={11} />
        </a>
        {status.verificadoEm && (
          <div className="text-[11px] text-suave">verificado em {new Date(status.verificadoEm).toLocaleDateString("pt-BR")}</div>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {opcao("ativo", "Tem anúncio", "bg-orbital text-noturno")}
        {opcao("nenhum", "Nenhum", "bg-slate-700 text-white")}
        {opcao("nao-verificado", "Não verifiquei", "bg-slate-200 text-slate-700")}
      </div>
      <div className="flex gap-2">
        <input
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="O que anunciam? Ex.: mentoria, isca de planilha, há 3 semanas"
          className="w-full rounded-md border border-borda px-3 py-1.5 text-sm"
        />
        <button disabled={pendente} onClick={() => salvar(situacao, obs)} className="rounded-md border border-borda px-3 text-xs">
          {salvo ? "Salvo" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
