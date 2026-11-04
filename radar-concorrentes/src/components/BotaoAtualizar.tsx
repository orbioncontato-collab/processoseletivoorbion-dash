"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { atualizarPerfil, atualizarTodos } from "@/app/actions";

/** Botão que dispara a coleta de um perfil (ou de todos). */
export function BotaoAtualizar({ username, rotulo, discreto }: { username?: string; rotulo?: string; discreto?: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  const clicar = () =>
    iniciar(async () => {
      setMsg(null);
      const r = username ? await atualizarPerfil(username) : await atualizarTodos();
      setMsg(r.ok ? { ok: true, texto: r.msg ?? "Atualizado." } : { ok: false, texto: r.erro });
    });

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={clicar}
        disabled={pendente}
        className={
          discreto
            ? "inline-flex items-center gap-1.5 rounded-md border border-borda bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
            : "inline-flex items-center gap-2 rounded-lg bg-noturno px-4 py-2 text-sm font-semibold text-white hover:bg-noturno-2 disabled:opacity-60"
        }
      >
        {pendente ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} className={discreto ? "" : "text-orbital"} />}
        {pendente ? (username ? "Coletando…" : "Coletando todos, aguarde…") : rotulo ?? (username ? "Atualizar" : "Atualizar todos")}
      </button>
      {msg && <span className={`max-w-xs whitespace-pre-line text-xs ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.texto}</span>}
    </div>
  );
}
