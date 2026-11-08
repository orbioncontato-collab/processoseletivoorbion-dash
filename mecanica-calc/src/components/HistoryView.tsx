"use client";

import Link from "next/link";
import { History, Trash2 } from "lucide-react";
import { getCalc } from "@/lib/calcs";
import { formatNumber } from "@/lib/number";
import { clearHistory, removeHistory, useDecimals, useHistory } from "@/lib/store";
import { Icon, catColor } from "./Icon";

const quando = (t: number) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(t);

export function HistoryView() {
  const hist = useHistory();
  const [dec] = useDecimals();
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-[28px] font-bold">
            <History size={26} aria-hidden="true" /> Histórico de cálculos
          </h1>
          <p className="mt-1 text-muted">Os últimos 20 cálculos ficam guardados só neste navegador.</p>
        </div>
        {hist.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (window.confirm("Apagar todo o histórico deste navegador?")) clearHistory();
            }}
          >
            <Trash2 size={16} aria-hidden="true" /> Limpar histórico
          </button>
        )}
      </header>

      {hist.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          Nenhum cálculo no histórico ainda. Ao tocar em <strong className="text-ink">Calcular</strong>, o resultado aparece aqui.
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {hist.map((h) => {
            const c = getCalc(h.slug);
            if (!c) return null;
            return (
              <li key={h.id} className="card flex items-center gap-4 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px]" style={catColor(c.category)}>
                  <Icon name={c.icon} size={20} />
                </span>
                <Link href={`/calc/${c.slug}/?h=${h.id}`} className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted">
                    <span className="mono">{c.num}</span> {c.name} • {quando(h.at)}
                  </p>
                  <p className="mt-0.5 truncate font-semibold text-ink">
                    {h.label}: {typeof h.value === "number" ? formatNumber(h.value, dec) : h.value} {h.unit}
                  </p>
                </Link>
                <button type="button" onClick={() => removeHistory(h.id)} aria-label="Remover do histórico" className="rounded-lg p-2 text-muted hover:bg-surface-2">
                  <Trash2 size={17} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
