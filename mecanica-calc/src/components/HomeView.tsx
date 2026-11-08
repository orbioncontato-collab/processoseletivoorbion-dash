"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Info, LayoutGrid, Search, Star } from "lucide-react";
import { CALCS, CATEGORIES } from "@/lib/calcs";
import type { Calc, CategoryId } from "@/lib/types";
import { useFavorites } from "@/lib/store";
import { Icon, catColor } from "./Icon";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function CalcCard({ c, fav, onFav }: { c: Calc; fav: boolean; onFav: () => void }) {
  const cat = CATEGORIES.find((k) => k.id === c.category)!;
  return (
    <article className="card flex flex-col p-5 transition-shadow hover:shadow-pop">
      <div className="mb-3 flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-[10px]" style={catColor(c.category)}>
          <Icon name={c.icon} size={22} />
        </span>
        <button
          type="button"
          onClick={onFav}
          aria-pressed={fav}
          aria-label={fav ? `Remover ${c.name} das favoritas` : `Adicionar ${c.name} às favoritas`}
          title={fav ? "Remover das favoritas" : "Favoritar"}
          className="rounded-lg p-1.5 text-muted hover:bg-surface-2"
        >
          <Star size={19} className={fav ? "fill-amber-400 text-amber-500" : ""} />
        </button>
      </div>
      <p className="text-xs font-semibold text-muted">
        <span className="mono">{c.num}</span> | {cat.short}
      </p>
      <h3 className="mt-0.5 text-[18px] font-bold text-ink">{c.name}</h3>
      <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-muted">{c.short}</p>
      <Link href={`/calc/${c.slug}/`} className="btn btn-soft mt-4 w-full">
        Abrir calculadora
      </Link>
    </article>
  );
}

export function HomeView() {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<CategoryId | "todas" | "fav">("todas");
  const [fav, toggleFav] = useFavorites();

  const lista = useMemo(() => {
    const termo = fold(q.trim());
    return CALCS.filter((c) => {
      if (filtro === "fav" && !fav.includes(c.slug)) return false;
      if (filtro !== "todas" && filtro !== "fav" && c.category !== filtro) return false;
      if (!termo) return true;
      return fold(`${c.num} ${c.name} ${c.short} ${c.keywords}`).includes(termo);
    });
  }, [q, filtro, fav]);

  const chip = (id: typeof filtro, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setFiltro(id)}
      aria-pressed={filtro === id}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
        filtro === id ? "border-navy bg-navy text-white" : "border-line-2 bg-white text-ink hover:bg-surface-2"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-navy to-[#1f4a82] p-6 text-white sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-[600px]">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-[#93b8ff]">Kit de calculadoras automáticas de Engenharia Mecânica</p>
            <h1 className="mt-3 text-[28px] font-bold leading-tight sm:text-[34px]">
              Confira seus exercícios de Mecânica com a conta feita passo a passo.
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-white/80">
              Escolha a calculadora, preencha os dados na unidade que quiser e veja a fórmula, a substituição dos valores e a explicação do resultado.
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {[
              ["12", "calculadoras"],
              ["4", "áreas"],
              ["0", "cadastros"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-white/15 bg-white/10 px-2 py-4 text-center backdrop-blur sm:px-6">
                <dt className="sr-only">{l}</dt>
                <dd className="text-[26px] font-bold">{n}</dd>
                <dd className="text-[12px] text-white/75 sm:text-[13px]">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou assunto (ex.: tensão, Reynolds, kW)"
          aria-label="Buscar calculadora"
          className="w-full rounded-xl border border-line-2 bg-white py-3 pl-11 pr-4 text-[16px] outline-none focus:border-brand"
        />
      </div>

      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        {chip("todas", "Todas", <LayoutGrid size={16} />)}
        {CATEGORIES.map((c) => chip(c.id, c.short, <Icon name={c.icon} size={16} />))}
        {chip("fav", "Favoritas", <Star size={16} />)}
      </div>

      {lista.length === 0 && (
        <div className="card p-8 text-center text-muted">
          {filtro === "fav" && fav.length === 0
            ? "Você ainda não marcou favoritas. Toque na estrela de um cartão para guardar a calculadora aqui."
            : "Nenhuma calculadora encontrada. Tente outra palavra."}
        </div>
      )}

      {CATEGORIES.map((cat) => {
        const itens = lista.filter((c) => c.category === cat.id);
        if (!itens.length) return null;
        return (
          <section key={cat.id} aria-labelledby={`cat-${cat.id}`}>
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={catColor(cat.id)}>
                <Icon name={cat.icon} size={18} />
              </span>
              <h2 id={`cat-${cat.id}`} className="text-[18px] font-bold leading-tight sm:text-[19px]">
                {cat.name}
                <span className="ml-2 whitespace-nowrap text-sm font-normal text-muted">
                  {itens.length} {itens.length === 1 ? "calculadora" : "calculadoras"}
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {itens.map((c) => (
                <CalcCard key={c.slug} c={c} fav={fav.includes(c.slug)} onFav={() => toggleFav(c.slug)} />
              ))}
            </div>
          </section>
        );
      })}

      <p className="flex items-start gap-2 rounded-xl border border-dashed border-line-2 bg-white p-4 text-sm text-muted">
        <Info size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
        Ferramenta educacional para estudar e conferir exercícios. Os modelos são simplificados e não substituem normas técnicas, projetos de engenharia nem profissionais habilitados.
      </p>
    </div>
  );
}
