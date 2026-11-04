"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { salvarBriefing } from "@/app/actions";
import type { Briefing } from "@/lib/types";

const campo = "mt-1 w-full rounded-md border border-borda bg-white px-3 py-2 text-sm font-normal outline-none focus:border-estrategico";

function Campo({ rotulo, valor, onChange, linhas = 3, dica }: { rotulo: string; valor: string; onChange: (v: string) => void; linhas?: number; dica?: string }) {
  return (
    <label className="block text-sm font-medium">
      {rotulo}
      {dica && <span className="ml-1 font-normal text-suave">{dica}</span>}
      {linhas === 1 ? (
        <input value={valor} onChange={(e) => onChange(e.target.value)} className={campo} />
      ) : (
        <textarea value={valor} onChange={(e) => onChange(e.target.value)} rows={linhas} className={campo} />
      )}
    </label>
  );
}

export function FormBriefing({ inicial }: { inicial: Briefing }) {
  const [b, setB] = useState(inicial);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState("");

  const set = <K extends keyof Briefing>(k: K, v: Briefing[K]) => setB((x) => ({ ...x, [k]: v }));
  const setPub = (k: keyof Briefing["publico"], v: string) => setB((x) => ({ ...x, publico: { ...x.publico, [k]: v } }));

  const salvar = () =>
    iniciar(async () => {
      const limpo = { ...b, mandamentos: b.mandamentos.map((m) => m.trim()).filter(Boolean) };
      setB(limpo);
      const r = await salvarBriefing(limpo);
      setMsg(r.ok ? "Salvo." : r.erro);
      setTimeout(() => setMsg(""), 2500);
    });

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2">
        <Campo rotulo="Nome" valor={b.nome} onChange={(v) => set("nome", v)} linhas={1} />
        <Campo rotulo="@ do Instagram" valor={b.username} onChange={(v) => set("username", v)} linhas={1} />
        <div className="md:col-span-2">
          <Campo rotulo="Nicho" valor={b.nicho} onChange={(v) => set("nicho", v)} linhas={4} />
        </div>
        <div className="md:col-span-2">
          <Campo rotulo="Frase de posicionamento" valor={b.posicionamento} onChange={(v) => set("posicionamento", v)} linhas={1} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-suave">Pilares de conteúdo</h3>
        <div className="space-y-2">
          {b.pilares.map((p, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[220px_1fr_auto]">
              <input
                value={p.nome}
                onChange={(e) => set("pilares", b.pilares.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))}
                className={campo + " mt-0 font-semibold"}
              />
              <input
                value={p.descricao}
                onChange={(e) => set("pilares", b.pilares.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))}
                className={campo + " mt-0"}
              />
              <button onClick={() => set("pilares", b.pilares.filter((_, j) => j !== i))} className="rounded-md p-2 text-slate-400 hover:text-rose-600" title="Remover pilar">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <button onClick={() => set("pilares", [...b.pilares, { nome: "Novo pilar", descricao: "" }])} className="inline-flex items-center gap-1 text-xs text-estrategico">
            <Plus size={13} /> adicionar pilar
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-suave md:col-span-2">Público-alvo</h3>
        <Campo rotulo="Quem é" valor={b.publico.quem} onChange={(v) => setPub("quem", v)} />
        <Campo rotulo="Idade" valor={b.publico.idade} onChange={(v) => setPub("idade", v)} linhas={1} />
        <Campo rotulo="Problemas" valor={b.publico.problemas} onChange={(v) => setPub("problemas", v)} />
        <Campo rotulo="O que quer conquistar" valor={b.publico.desejos} onChange={(v) => setPub("desejos", v)} />
        <div className="md:col-span-2">
          <Campo rotulo="Conteúdo que gosta de ver" valor={b.publico.gostaDeVer} onChange={(v) => setPub("gostaDeVer", v)} />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-suave md:col-span-2">Marca e voz</h3>
        <Campo rotulo="Mecanismo único" valor={b.mecanismo} onChange={(v) => set("mecanismo", v)} />
        <Campo rotulo="Diferencial" valor={b.diferencial} onChange={(v) => set("diferencial", v)} />
        <Campo rotulo="O que o nicho faz errado" valor={b.erroDoNicho} onChange={(v) => set("erroDoNicho", v)} />
        <Campo rotulo="Tom de voz" valor={b.tomDeVoz} onChange={(v) => set("tomDeVoz", v)} />
        <Campo
          rotulo="Mandamentos de conteúdo"
          dica="(um por linha)"
          valor={b.mandamentos.join("\n")}
          onChange={(v) => set("mandamentos", v.split("\n"))}
          linhas={5}
        />
        <Campo rotulo="O que eu nunca faria" valor={b.nuncaFaria} onChange={(v) => set("nuncaFaria", v)} linhas={5} />
        <Campo rotulo="Formatos e função de cada um" valor={b.formatos} onChange={(v) => set("formatos", v)} linhas={5} />
        <Campo rotulo="Observações estratégicas" valor={b.observacoes} onChange={(v) => set("observacoes", v)} linhas={5} />
      </section>

      <div className="sticky bottom-4 flex items-center gap-3">
        <button
          onClick={salvar}
          disabled={pendente}
          className="rounded-lg bg-noturno px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar briefing"}
        </button>
        {msg && <span className="rounded bg-white px-2 py-1 text-sm text-emerald-700 shadow">{msg}</span>}
      </div>
    </div>
  );
}
