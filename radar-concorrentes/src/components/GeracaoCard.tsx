"use client";

import { useState, useTransition } from "react";
import { Check, ClipboardCopy, Pencil, Trash2 } from "lucide-react";
import { editarGeracao, removerGeracao } from "@/app/actions";
import { NOME_FORMATO, type Geracao } from "@/lib/types";
import { Markdown } from "./Markdown";

export function GeracaoCard({ g, aberto = false, numero }: { g: Geracao; aberto?: boolean; numero?: number }) {
  const [pendente, iniciar] = useTransition();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(g.conteudo);
  const [copiado, setCopiado] = useState(false);

  const data = new Date(g.criadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <details open={aberto} className="group rounded-xl border border-borda bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        {numero !== undefined && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-noturno text-xs font-bold text-orbital">{numero}</span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{g.titulo}</div>
          <div className="text-xs text-suave">
            {data}
            {g.formato && g.formato !== "auto" && ` · ${NOME_FORMATO[g.formato]}`}
            {g.referencias.length > 0 && ` · ${g.referencias.length} referências`}
            {g.origem === "colado" && " · colado do Claude"}
          </div>
        </div>
        <span className="text-xs text-suave group-open:hidden">abrir</span>
      </summary>
      <div className="border-t border-borda p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(g.conteudo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 text-xs"
          >
            {copiado ? <Check size={13} /> : <ClipboardCopy size={13} />} {copiado ? "Copiado" : "Copiar"}
          </button>
          <button onClick={() => setEditando((v) => !v)} className="inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 text-xs">
            <Pencil size={13} /> {editando ? "Cancelar" : "Editar"}
          </button>
          <button
            disabled={pendente}
            onClick={() => confirm("Apagar este item?") && iniciar(async () => void (await removerGeracao(g.id)))}
            className="inline-flex items-center gap-1 rounded-md border border-borda px-2 py-1 text-xs text-rose-600"
          >
            <Trash2 size={13} /> Apagar
          </button>
        </div>
        {editando ? (
          <div className="space-y-2">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={18} className="w-full rounded-md border border-borda p-3 font-mono text-xs" />
            <button
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  await editarGeracao(g.id, texto);
                  setEditando(false);
                })
              }
              className="rounded-md bg-noturno px-3 py-1.5 text-xs font-semibold text-white"
            >
              Salvar
            </button>
          </div>
        ) : (
          <Markdown texto={g.conteudo} />
        )}
      </div>
    </details>
  );
}
