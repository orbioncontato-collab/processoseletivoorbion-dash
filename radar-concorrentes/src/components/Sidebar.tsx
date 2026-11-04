"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Clapperboard,
  Lightbulb,
  LayoutDashboard,
  Megaphone,
  Menu,
  Settings,
  Trophy,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

const ITENS = [
  { href: "/", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/meu-perfil", label: "Meu Perfil", icon: UserRound },
  { href: "/concorrentes", label: "Concorrentes", icon: Users },
  { href: "/top-posts", label: "Top Posts", icon: Trophy },
  { href: "/tendencias", label: "Tendências", icon: TrendingUp },
  { href: "/ideias", label: "Ideias", icon: Lightbulb },
  { href: "/roteiros", label: "Roteiros", icon: Clapperboard },
  { href: "/metricas", label: "Métricas", icon: BarChart3 },
  { href: "/anuncios", label: "Anúncios", icon: Megaphone },
];

export function Sidebar() {
  const path = usePathname();
  const [aberto, setAberto] = useState(false);
  const ativo = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  const nav = (
    <nav className="flex h-full flex-col gap-1 px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <Image src="/orbion-logo.png" alt="Orbion" width={110} height={28} style={{ height: 26, width: "auto" }} priority />
        <span className="rounded bg-orbital/15 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-orbital">RADAR</span>
      </div>
      {ITENS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setAberto(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
            ativo(href) ? "bg-orbital font-semibold text-noturno" : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <Icon size={17} />
          {label}
        </Link>
      ))}
      <div className="mt-auto">
        <Link
          href="/configuracoes"
          onClick={() => setAberto(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
            ativo("/configuracoes") ? "bg-orbital font-semibold text-noturno" : "text-slate-400 hover:text-white"
          }`}
        >
          <Settings size={17} />
          Configurações
        </Link>
      </div>
    </nav>
  );

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="fixed left-3 top-3 z-30 rounded-lg bg-noturno p-2 text-white shadow md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={18} />
      </button>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-noturno md:block">{nav}</aside>
      {aberto && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-noturno">
            <button onClick={() => setAberto(false)} className="absolute right-3 top-4 text-slate-300" aria-label="Fechar menu">
              <X size={18} />
            </button>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}
