"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Cog, History, House, Info, Menu, X } from "lucide-react";
import { CALCS, CATEGORIES } from "@/lib/calcs";
import { SITE } from "@/lib/site";
import { useDecimals } from "@/lib/store";

const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, "") : p);

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = norm(usePathname() ?? "/");
  const link = (href: string, active: boolean) =>
    `flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] transition-colors ${
      active ? "bg-brand-50 font-semibold text-brand-700" : "text-ink hover:bg-surface-2"
    }`;
  return (
    <nav aria-label="Menu principal" className="flex flex-col gap-1 p-3">
      <Link href="/" onClick={onNavigate} className={link("/", path === "/")}>
        <House size={18} aria-hidden="true" /> Início
      </Link>
      <Link href="/historico/" onClick={onNavigate} className={link("/historico", path === "/historico")}>
        <History size={18} aria-hidden="true" /> Histórico
      </Link>
      <Link href="/como-usar/" onClick={onNavigate} className={link("/como-usar", path === "/como-usar")}>
        <Info size={18} aria-hidden="true" /> Como usar e avisos
      </Link>
      <hr className="mx-2 my-3 border-line" />
      {CATEGORIES.map((cat) => (
        <div key={cat.id} className="mb-3">
          <div className="mb-1 flex items-center gap-2 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: `var(--cat-${cat.id})` }} />
            {cat.name}
          </div>
          {CALCS.filter((c) => c.category === cat.id).map((c) => {
            const href = `/calc/${c.slug}`;
            const active = path === href;
            return (
              <Link key={c.slug} href={`${href}/`} onClick={onNavigate} className={link(href, active)} aria-current={active ? "page" : undefined}>
                <span className={`mono w-5 text-xs ${active ? "text-brand-700" : "text-muted"}`}>{c.num}</span>
                {c.name}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dec, setDec] = useDecimals();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <header className="no-print fixed inset-x-0 top-0 z-30 flex h-[62px] items-center gap-3 bg-navy px-4 text-white lg:px-5">
        <button
          type="button"
          className="-ml-1 rounded-lg p-2 hover:bg-white/10 lg:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-brand">
            <Cog size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block whitespace-nowrap text-[16px] font-bold sm:text-[17px]">
              {SITE.name} <span className="text-[#93b8ff]">{SITE.nameAccent}</span>
            </span>
            <span className="hidden truncate text-xs text-white/70 sm:block">{SITE.tagline}</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <span className="hidden sm:inline">Casas decimais</span>
            <span className="sm:hidden">Casas</span>
            <select
              value={dec}
              onChange={(e) => setDec(Number(e.target.value))}
              className="rounded-lg border border-white/20 bg-navy-2 px-2 py-1.5 font-semibold text-white"
              aria-label="Casas decimais dos resultados"
            >
              {[2, 4, 6].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>
          <Link href="/historico/" className="rounded-lg p-2 hover:bg-white/10" aria-label="Histórico de cálculos" title="Histórico">
            <History size={20} />
          </Link>
        </div>
      </header>

      <aside className="no-print fixed bottom-0 left-0 top-[62px] z-20 hidden w-[268px] overflow-y-auto border-r border-line bg-white lg:block">
        <Sidebar />
      </aside>

      {open && (
        <div className="no-print fixed inset-0 top-[62px] z-40 lg:hidden">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-navy/40" onClick={() => setOpen(false)} />
          <aside className="absolute bottom-0 left-0 top-0 w-[290px] max-w-[85vw] overflow-y-auto bg-white shadow-pop">
            <Sidebar onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="pt-[62px] lg:pl-[268px]">
        <main id="conteudo" className="mx-auto w-full max-w-[1120px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
        <footer className="no-print mx-auto flex w-full max-w-[1120px] flex-col gap-1 border-t border-line px-4 py-5 text-[13px] text-muted sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>
            {SITE.name} {SITE.nameAccent} v{SITE.version} | Ferramenta educacional
          </span>
          <span>Os cálculos rodam no seu aparelho. Nenhum dado é enviado para a internet.</span>
        </footer>
      </div>
    </>
  );
}
