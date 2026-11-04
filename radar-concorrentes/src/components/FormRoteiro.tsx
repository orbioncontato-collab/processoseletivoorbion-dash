"use client";

import { useMemo, useState } from "react";
import type { Formato } from "@/lib/types";
import { NOME_FORMATO } from "@/lib/types";
import { PainelIA } from "./PainelIA";

export interface RefOpcao {
  id: string;
  username: string;
  formato: Formato;
  legenda: string;
  score: number;
}

const OPCOES_FORMATO: { valor: Formato | "auto"; nome: string; dica: string }[] = [
  { valor: "auto", nome: "Deixar a IA escolher", dica: "Ela olha o que performou e decide" },
  { valor: "video", nome: "Reels", dica: "Curto (6 a 15s) ou falado (40 a 90s)" },
  { valor: "carrossel", nome: "Carrossel", dica: "Método, lista, framework" },
];

export function FormRoteiro({ referencias, iaDisponivel }: { referencias: RefOpcao[]; iaDisponivel: boolean }) {
  const [tema, setTema] = useState("");
  const [formato, setFormato] = useState<Formato | "auto">("auto");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  const visiveis = useMemo(
    () => referencias.filter((r) => formato === "auto" || r.formato === formato).slice(0, 12),
    [referencias, formato],
  );

  const alternar = (id: string) =>
    setSelecionadas((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 6 ? s : [...s, id]));

  return (
    <div className="space-y-5">
      <label className="block text-sm font-medium">
        Sobre o que você quer falar? <span className="font-normal text-suave">(opcional)</span>
        <input
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ex.: por que o vendedor contratado não bate meta"
          className="mt-1 w-full rounded-md border border-borda px-3 py-2 text-sm font-normal outline-none focus:border-estrategico"
        />
      </label>

      <div>
        <div className="mb-2 text-sm font-medium">Formato</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {OPCOES_FORMATO.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => setFormato(o.valor)}
              className={`rounded-lg border p-3 text-left ${formato === o.valor ? "border-noturno bg-noturno text-white" : "border-borda bg-white hover:bg-slate-50"}`}
            >
              <div className="text-sm font-semibold">{o.nome}</div>
              <div className={`text-xs ${formato === o.valor ? "text-slate-300" : "text-suave"}`}>{o.dica}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1 text-sm font-medium">
          Posts de referência <span className="font-normal text-suave">(escolha até 6. Se não escolher, uso os 8 melhores)</span>
        </div>
        {visiveis.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {visiveis.map((r) => {
              const ativo = selecionadas.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => alternar(r.id)}
                  className={`flex items-start gap-2 rounded-lg border p-2 text-left text-xs ${ativo ? "border-orbital bg-emerald-50" : "border-borda bg-white hover:bg-slate-50"}`}
                >
                  <input type="checkbox" readOnly checked={ativo} className="mt-0.5 accent-emerald-600" />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">@{r.username}</span>{" "}
                    <span className="text-suave">
                      · {NOME_FORMATO[r.formato]} · nota {r.score.toFixed(1).replace(".", ",")}x
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-slate-600">{r.legenda || "sem legenda"}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-suave">Nenhum post real desse formato ainda.</p>
        )}
      </div>

      <PainelIA
        pedido={{ tipo: "roteiro", tema: tema.trim() || undefined, formato, referencias: selecionadas }}
        rotulo="Gerar roteiro"
        iaDisponivel={iaDisponivel}
        desabilitado={referencias.length ? undefined : "Colete os dados dos concorrentes primeiro (os perfis de exemplo não entram nos roteiros)."}
      />
    </div>
  );
}
