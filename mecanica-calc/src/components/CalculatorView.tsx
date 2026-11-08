"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BookOpen, Calculator, CircleAlert, CircleCheck, Copy, Eraser, FileText, Printer,
  RotateCcw, Star, TriangleAlert,
} from "lucide-react";
import { CATEGORIES, getCalc } from "@/lib/calcs";
import { emptyState, evaluate, exampleState, isVisible, resultText, solutionText, type FormState } from "@/lib/engine";
import { formatNumber } from "@/lib/number";
import { addHistory, getHistoryEntry, useDecimals, useFavorites } from "@/lib/store";
import type { Calc, Field, ResultItem } from "@/lib/types";
import { UNITS } from "@/lib/units";
import { Diagram } from "./Diagram";
import { Icon, catColor } from "./Icon";

function FieldInput({
  f, value, unit, error, onValue, onUnit,
}: {
  f: Field; value: string; unit: string; error?: string; onValue: (v: string) => void; onUnit: (u: string) => void;
}) {
  const units = UNITS[f.qty] as { id: string }[];
  const id = `f-${f.id}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-2 text-[15px] font-semibold text-ink">
        {f.label}
        <span className="mono rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-bold text-brand-700">{f.symbol}</span>
      </label>
      <div
        className={`flex overflow-hidden rounded-[10px] border bg-white transition-colors focus-within:border-brand ${
          error ? "border-err bg-err-50" : "border-line-2"
        }`}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="Digite o valor"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `e-${f.id}` : undefined}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[17px] outline-none"
        />
        {units.length > 1 ? (
          <select
            value={unit}
            onChange={(e) => onUnit(e.target.value)}
            aria-label={`Unidade de ${f.label}`}
            className="w-[108px] shrink-0 border-l border-line bg-surface-2 px-2 text-[15px] font-semibold outline-none"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.id}</option>
            ))}
          </select>
        ) : (
          <span className="grid w-[108px] shrink-0 place-items-center border-l border-line bg-surface-2 px-2 text-[15px] font-semibold text-muted">
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={`e-${f.id}`} className="mt-1.5 flex items-start gap-1.5 text-sm text-err">
          <CircleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  );
}

const showValue = (r: ResultItem, dec: number) => (typeof r.value === "number" ? formatNumber(r.value, dec) : r.value);

export function CalculatorView({ slug }: { slug: string }) {
  const calc = getCalc(slug) as Calc;
  const cat = CATEGORIES.find((c) => c.id === calc.category)!;
  const [dec] = useDecimals();
  const [fav, toggleFav] = useFavorites();
  const [st, setSt] = useState<FormState>(() => emptyState(calc));
  const [tried, setTried] = useState(false);
  const [copied, setCopied] = useState("");

  // Abrir um cálculo salvo no histórico (?h=id)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("h");
    const h = id ? getHistoryEntry(id) : undefined;
    if (h && h.slug === calc.slug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSt(h.state);
      setTried(true);
    }
  }, [calc.slug]);

  const ev = useMemo(() => evaluate(calc, st, dec), [calc, st, dec]);
  const out = tried ? ev.output : null;
  const errors = tried ? ev.errors : {};

  const set = (patch: Partial<FormState>) => setSt((s) => ({ ...s, ...patch }));
  const setValue = (id: string, v: string) => setSt((s) => ({ ...s, values: { ...s.values, [id]: v } }));
  const setUnit = (id: string, u: string) => setSt((s) => ({ ...s, units: { ...s.units, [id]: u } }));
  const toggleGroup = (g: string) =>
    setSt((s) => ({ ...s, groups: s.groups.includes(g) ? s.groups.filter((x) => x !== g) : [...s.groups, g] }));

  const calcular = () => {
    setTried(true);
    if (ev.output) {
      addHistory({ slug: calc.slug, state: st, label: ev.output.main.label, value: ev.output.main.value, unit: ev.output.main.unit });
    } else {
      const first = calc.fields.find((f) => ev.errors[f.id]);
      if (first) document.getElementById(`f-${first.id}`)?.focus();
    }
  };
  const limpar = () => {
    setSt(emptyState(calc));
    setTried(false);
  };
  const novo = () => {
    limpar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const exemplo = () => {
    setSt(exampleState(calc));
    setTried(true);
  };
  const copiar = async (tipo: "res" | "sol") => {
    if (!out) return;
    const txt = tipo === "res" ? resultText(calc, out, dec) : solutionText(calc, st, out, dec);
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(tipo);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setCopied("erro");
    }
  };

  const visiveis = calc.fields.filter((f) => isVisible(f, st.mode, st.groups));
  const base = calc.fields.filter((f) => !f.group && (!f.modes || f.modes.includes(st.mode)));
  const nErros = Object.keys(errors).length;

  return (
    <div className="flex flex-col gap-5">
      <Link href="/" className="no-print inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Todas as calculadoras
      </Link>

      <header className="card flex gap-4 p-5 sm:p-6">
        <span className="hidden h-14 w-14 shrink-0 place-items-center rounded-xl sm:grid" style={catColor(calc.category)}>
          <Icon name={calc.icon} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">
            Calculadora <span className="mono">{calc.num}</span> | {cat.name}
          </p>
          <h1 className="mt-1 text-[26px] font-bold leading-tight sm:text-[30px]">{calc.name}</h1>
          <p className="mt-2 text-[16px] leading-relaxed text-ink">{calc.desc}</p>
          <p className="mt-1.5 text-[14px] text-muted">{calc.hint}</p>
        </div>
        <button
          type="button"
          onClick={() => toggleFav(calc.slug)}
          aria-pressed={fav.includes(calc.slug)}
          aria-label={fav.includes(calc.slug) ? "Remover das favoritas" : "Adicionar às favoritas"}
          title="Favoritar"
          className="no-print h-fit rounded-lg p-1.5 text-muted hover:bg-surface-2"
        >
          <Star size={21} className={fav.includes(calc.slug) ? "fill-amber-400 text-amber-500" : ""} />
        </button>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* ENTRADAS */}
        <form
          className="card no-print flex flex-col gap-5 p-5 sm:p-6"
          onSubmit={(e) => {
            e.preventDefault();
            calcular();
          }}
          noValidate
        >
          <h2 className="flex items-center gap-2 text-[18px] font-bold">
            <Calculator size={20} aria-hidden="true" /> Dados de entrada
          </h2>

          {calc.modes && (
            <fieldset>
              <legend className="mb-2 text-[15px] font-semibold">{calc.modeLabel}</legend>
              <div className={`grid gap-1 rounded-xl bg-surface-2 p-1 ${calc.modes.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
                {calc.modes.map((m) => (
                  <label
                    key={m.id}
                    className={`cursor-pointer rounded-[9px] px-2 py-2.5 text-center text-[14px] font-semibold transition-colors ${
                      st.mode === m.id ? "bg-white text-brand-700 shadow-card" : "text-ink hover:bg-white/60"
                    }`}
                  >
                    <input type="radio" name="modo" value={m.id} checked={st.mode === m.id} onChange={() => set({ mode: m.id })} className="sr-only" />
                    {m.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {calc.presets && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-muted">{calc.presetLabel}: preencher com valor de tabela</p>
              <div className="flex flex-wrap gap-2">
                {calc.presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      setSt((s) => ({
                        ...s,
                        values: { ...s.values, ...Object.fromEntries(Object.entries(p.values).map(([k, [v]]) => [k, v])) },
                        units: { ...s.units, ...Object.fromEntries(Object.entries(p.values).map(([k, [, u]]) => [k, u])) },
                      }))
                    }
                    className="rounded-full border border-line-2 bg-white px-3 py-1.5 text-[13px] font-medium hover:border-brand hover:text-brand-700"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {base.map((f) => (
            <FieldInput key={f.id} f={f} value={st.values[f.id] ?? ""} unit={st.units[f.id]} error={errors[f.id]} onValue={(v) => setValue(f.id, v)} onUnit={(u) => setUnit(f.id, u)} />
          ))}

          {(calc.groups ?? []).map((g) => {
            const on = st.groups.includes(g.id);
            const fs = calc.fields.filter((f) => f.group === g.id);
            return (
              <div key={g.id} className={`flex flex-col gap-4 rounded-xl border p-4 ${on ? "border-brand-100 bg-brand-50/50" : "border-dashed border-line-2"}`}>
                <label className="flex cursor-pointer items-center gap-3 text-[15px] font-semibold">
                  <input type="checkbox" checked={on} onChange={() => toggleGroup(g.id)} className="h-5 w-5 accent-[var(--color-brand)]" />
                  {g.label}
                  <span className="text-xs font-normal text-muted">(opcional)</span>
                </label>
                {on &&
                  fs.map((f) => (
                    <FieldInput key={f.id} f={f} value={st.values[f.id] ?? ""} unit={st.units[f.id]} error={errors[f.id]} onValue={(v) => setValue(f.id, v)} onUnit={(u) => setUnit(f.id, u)} />
                  ))}
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button type="submit" className="btn btn-primary flex-1 py-3 text-[15px]">
              <CircleCheck size={18} aria-hidden="true" /> Calcular
            </button>
            <button type="button" onClick={exemplo} className="btn btn-ghost flex-1 py-3">
              <BookOpen size={17} aria-hidden="true" /> Carregar exemplo
            </button>
            <button type="button" onClick={limpar} className="btn btn-ghost py-3">
              <Eraser size={17} aria-hidden="true" /> Limpar
            </button>
          </div>
        </form>

        {/* RESULTADO */}
        <section className="card flex flex-col gap-4 p-5 sm:p-6" aria-live="polite" aria-labelledby="res-titulo">
          <div className="flex items-center justify-between gap-2">
            <h2 id="res-titulo" className="flex items-center gap-2 text-[18px] font-bold">
              <CircleCheck size={20} aria-hidden="true" /> Resultado
            </h2>
            {tried && (
              <span className="no-print inline-flex items-center gap-1.5 rounded-full bg-ok-50 px-2.5 py-1 text-xs font-semibold text-ok-700">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" /> Atualização automática
              </span>
            )}
          </div>

          {!tried && (
            <div className="rounded-xl border border-dashed border-line-2 bg-surface-2 p-6 text-center text-[15px] text-muted">
              Preencha os dados e toque em <strong className="text-ink">Calcular</strong>. Para ver um caso pronto, use{" "}
              <strong className="text-ink">Carregar exemplo</strong>.
            </div>
          )}

          {tried && !out && (
            <div className={`rounded-xl border p-4 text-[15px] ${ev.missing === nErros ? "border-amber-200 bg-warn-50 text-warn" : "border-red-200 bg-err-50 text-err"}`}>
              <p className="flex items-center gap-2 font-semibold">
                <CircleAlert size={18} aria-hidden="true" />
                {ev.missing === nErros ? "Preencha os campos obrigatórios." : "Corrija os campos destacados."}
              </p>
              <p className="mt-1 text-sm opacity-90">O resultado aparece assim que os dados estiverem completos e válidos.</p>
            </div>
          )}

          {out && (
            <>
              <div className="rounded-xl border border-green-200 bg-ok-50 p-4 sm:p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-ok-700">
                  <CircleCheck size={16} aria-hidden="true" /> {out.main.label}
                  {out.main.symbol && <span className="mono rounded bg-white/70 px-1.5 text-xs">{out.main.symbol}</span>}
                </p>
                <p data-test="main" className="mt-1 break-words text-[32px] font-bold leading-tight text-ink">
                  {showValue(out.main, dec)}
                  {out.main.unit && <span className="ml-2 text-[22px] font-semibold text-ok-700">{out.main.unit}</span>}
                </p>
              </div>

              {out.warnings.map((w) => (
                <p key={w} className="flex items-start gap-2 rounded-xl border border-amber-200 bg-warn-50 p-3 text-sm text-warn">
                  <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> {w}
                </p>
              ))}

              {out.others.length > 0 && (
                <div>
                  <p className="eyebrow mb-1">Outros resultados</p>
                  <dl className="divide-y divide-line">
                    {out.others.map((r, k) => (
                      <div key={k} className="flex items-baseline justify-between gap-4 py-2.5">
                        <dt className="text-[15px] text-ink">
                          {r.label}
                          {r.symbol && <span className="mono ml-1.5 rounded bg-brand-50 px-1 text-xs font-bold text-brand-700">{r.symbol}</span>}
                        </dt>
                        <dd className="text-right text-[16px] font-bold">
                          {showValue(r, dec)}
                          {r.unit && r.unit !== "adim." && <span className="ml-1 font-semibold text-muted">{r.unit}</span>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="rounded-xl border border-line bg-surface-2 p-4">
                <p className="eyebrow mb-2">Esquema simplificado</p>
                <Diagram slug={calc.slug} viz={out.viz} st={st} dec={dec} />
              </div>

              <div className="no-print grid grid-cols-1 gap-2 border-t border-line pt-4 sm:grid-cols-2">
                <button type="button" onClick={() => copiar("res")} className="btn btn-ghost">
                  <Copy size={16} aria-hidden="true" /> {copied === "res" ? "Copiado!" : "Copiar resultado"}
                </button>
                <button type="button" onClick={() => copiar("sol")} className="btn btn-ghost">
                  <FileText size={16} aria-hidden="true" /> {copied === "sol" ? "Copiado!" : "Copiar resolução"}
                </button>
                <button type="button" onClick={() => window.print()} className="btn btn-ghost">
                  <Printer size={16} aria-hidden="true" /> Imprimir ou salvar PDF
                </button>
                <button type="button" onClick={novo} className="btn btn-ghost">
                  <RotateCcw size={16} aria-hidden="true" /> Fazer novo cálculo
                </button>
              </div>
              {copied === "erro" && <p className="text-sm text-err">Não foi possível copiar. Selecione o texto e copie manualmente.</p>}
            </>
          )}
        </section>
      </div>

      {out && (
        <section className="card p-5 sm:p-6" aria-labelledby="mem-titulo">
          <h2 id="mem-titulo" className="flex items-center gap-2 text-[18px] font-bold">
            <FileText size={20} aria-hidden="true" /> Memória de cálculo
          </h2>
          <p className="eyebrow mb-2 mt-4">Dados utilizados</p>
          <div className="flex flex-wrap gap-2">
            {calc.modes && (
              <span className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm">
                <strong>{calc.modeLabel}</strong> {calc.modes.find((m) => m.id === st.mode)?.label}
              </span>
            )}
            {visiveis.map((f) => (
              <span key={f.id} className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm">
                <strong className="mono">{f.symbol}</strong> {st.values[f.id]} {st.units[f.id] === "adim." ? "" : st.units[f.id]}
              </span>
            ))}
          </div>
          <ol className="mt-4 flex flex-col gap-3">
            {out.steps.map((s, k) => (
              <li key={k} className="rounded-xl border border-line p-4">
                <p className="flex items-center gap-2.5 font-bold">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-xs text-white">{k + 1}</span>
                  {s.title}
                </p>
                <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[120px_1fr]">
                  <dt className="eyebrow pt-0.5">Fórmula</dt>
                  <dd className="mono whitespace-pre-wrap break-words">{s.formula}</dd>
                  <dt className="eyebrow pt-0.5">Substituição</dt>
                  <dd className="mono whitespace-pre-wrap break-words">{s.subst}</dd>
                  <dt className="eyebrow pt-0.5">Resultado</dt>
                  <dd className="mono whitespace-pre-wrap break-words font-bold text-ok-700">{s.result}</dd>
                </dl>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card p-5 sm:p-6" aria-labelledby="exp-titulo">
        <h2 id="exp-titulo" className="flex items-center gap-2 text-[18px] font-bold">
          <BookOpen size={20} aria-hidden="true" /> Explicação
        </h2>
        {out ? (
          out.explanation.map((p) => (
            <p key={p} className="mt-3 text-[16px] leading-relaxed">{p}</p>
          ))
        ) : (
          <p className="mt-3 text-[15px] text-muted">A explicação do resultado aparece aqui depois do cálculo.</p>
        )}
        <p className="eyebrow mb-2 mt-5">Fórmulas desta calculadora</p>
        <div className="flex flex-wrap gap-2">
          {calc.formulas.map((f) => (
            <code key={f} className="mono rounded-lg bg-brand-50 px-3 py-1.5 text-[14px] text-navy">{f}</code>
          ))}
        </div>
        <p className="eyebrow mb-2 mt-5">Hipóteses e limitações</p>
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed">
          {calc.hypotheses.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <p className="mt-5 flex items-start gap-2 text-[13px] text-muted">
          <CircleAlert size={15} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
          Ferramenta educacional. Os resultados não substituem normas técnicas, projetos de engenharia nem profissionais habilitados.
        </p>
      </section>
    </div>
  );
}
