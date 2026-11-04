/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Film, GalleryHorizontal, ImageIcon } from "lucide-react";
import { fmtScore } from "@/lib/metricas";
import { NOME_FORMATO, type Formato, type Perfil } from "@/lib/types";

export function Cabecalho({ titulo, descricao, acoes }: { titulo: string; descricao?: React.ReactNode; acoes?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 pl-10 md:flex-row md:items-end md:justify-between md:pl-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-texto">{titulo}</h1>
        {descricao && <p className="mt-1 max-w-3xl text-sm text-suave">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-xl border border-borda bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function TituloSecao({ children, extra }: { children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-suave">{children}</h2>
      {extra}
    </div>
  );
}

export function Kpi({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: React.ReactNode; detalhe?: React.ReactNode; destaque?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${destaque ? "border-noturno bg-noturno text-white" : "border-borda bg-white"}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wider ${destaque ? "text-orbital" : "text-suave"}`}>{rotulo}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{valor}</div>
      {detalhe && <div className={`mt-0.5 text-xs ${destaque ? "text-slate-300" : "text-suave"}`}>{detalhe}</div>}
    </div>
  );
}

const ICONE_FORMATO = { video: Film, carrossel: GalleryHorizontal, imagem: ImageIcon };
const COR_FORMATO: Record<Formato, string> = {
  video: "bg-violet-50 text-violet-700 border-violet-200",
  carrossel: "bg-sky-50 text-sky-700 border-sky-200",
  imagem: "bg-amber-50 text-amber-700 border-amber-200",
};
export const COR_GRAFICO: Record<Formato, string> = { video: "#7c3aed", carrossel: "#0284c7", imagem: "#d97706" };

export function SeloFormato({ formato }: { formato: Formato }) {
  const Icone = ICONE_FORMATO[formato];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${COR_FORMATO[formato]}`}>
      <Icone size={12} />
      {NOME_FORMATO[formato]}
    </span>
  );
}

export function SeloNota({ score }: { score: number }) {
  const cor =
    score >= 2 ? "bg-emerald-600 text-white" : score >= 1.2 ? "bg-emerald-100 text-emerald-800" : score >= 0.8 ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-700";
  return (
    <span title="Quantas vezes acima (ou abaixo) da média do próprio perfil" className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${cor}`}>
      {fmtScore(score)}
    </span>
  );
}

export function SeloExemplo() {
  return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800">exemplo</span>;
}

export function Avatar({ perfil, tamanho = 40 }: { perfil: Pick<Perfil, "username" | "foto" | "nome">; tamanho?: number }) {
  if (perfil.foto) {
    return (
      <img
        src={`/api/media/${perfil.foto}`}
        alt={perfil.username}
        width={tamanho}
        height={tamanho}
        className="shrink-0 rounded-full border border-borda object-cover"
        style={{ width: tamanho, height: tamanho }}
      />
    );
  }
  const letra = (perfil.nome || perfil.username).charAt(0).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-noturno font-bold text-orbital"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4 }}
    >
      {letra}
    </div>
  );
}

export function Vazio({ titulo, children, link }: { titulo: string; children?: React.ReactNode; link?: { href: string; texto: string } }) {
  return (
    <div className="rounded-xl border border-dashed border-borda bg-white px-6 py-10 text-center">
      <div className="font-semibold text-texto">{titulo}</div>
      {children && <div className="mx-auto mt-1 max-w-lg text-sm text-suave">{children}</div>}
      {link && (
        <Link href={link.href} className="mt-4 inline-block rounded-lg bg-noturno px-4 py-2 text-sm font-semibold text-white hover:bg-noturno-2">
          {link.texto}
        </Link>
      )}
    </div>
  );
}

export function Thumb({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  if (!src) return <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className}`}><ImageIcon size={18} /></div>;
  return <img src={`/api/media/${src}`} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}

/** Barra horizontal simples (sem biblioteca), boa para comparar formatos. */
export function Barra({ valor, max, cor = "#0a1123" }: { valor: number; max: number; cor?: string }) {
  const pct = max > 0 && valor > 0 ? Math.max(2, Math.min(100, (valor / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}
