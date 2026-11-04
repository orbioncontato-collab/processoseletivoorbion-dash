import Link from "next/link";
import { concorrentesVisiveis, lerDB } from "@/lib/db";
import { iaConfigurada } from "@/lib/ia";
import { inicioDoPeriodo, todosOsPosts } from "@/lib/metricas";
import { FORMATOS, NOME_FORMATO, type Formato } from "@/lib/types";
import { PostCard } from "@/components/PostCard";
import { Cabecalho, Vazio } from "@/components/ui";

const CRITERIOS = {
  nota: { nome: "Nota (vs. média do perfil)", ordenar: (p: { score: number }) => p.score },
  engajamento: { nome: "Taxa de engajamento", ordenar: (p: { taxa: number }) => p.taxa },
  alcance: { nome: "Alcance / views", ordenar: (p: { alcance: number | null }) => p.alcance ?? 0 },
  comentarios: { nome: "Comentários", ordenar: (p: { comentarios: number }) => p.comentarios },
} as const;
type Criterio = keyof typeof CRITERIOS;

export default async function TopPosts({
  searchParams,
}: {
  searchParams: Promise<{ formato?: string; criterio?: string; dias?: string; perfil?: string }>;
}) {
  const sp = await searchParams;
  const formato = FORMATOS.includes(sp.formato as Formato) ? (sp.formato as Formato) : undefined;
  const criterio: Criterio = sp.criterio && sp.criterio in CRITERIOS ? (sp.criterio as Criterio) : "nota";
  const dias = Number(sp.dias) || 0;

  const db = await lerDB();
  const perfis = concorrentesVisiveis(db);
  const limite = inicioDoPeriodo(dias);

  const posts = todosOsPosts(perfis)
    .filter((p) => !formato || p.formato === formato)
    .filter((p) => !sp.perfil || p.username === sp.perfil)
    .filter((p) => new Date(p.data).getTime() >= limite)
    .sort((a, b) => CRITERIOS[criterio].ordenar(b) - CRITERIOS[criterio].ordenar(a))
    .slice(0, 40);

  const url = (mudar: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base = { formato, criterio, dias: dias ? String(dias) : undefined, perfil: sp.perfil, ...mudar };
    Object.entries(base).forEach(([k, v]) => v && q.set(k, v));
    return `?${q.toString()}`;
  };
  const pill = (ativo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${ativo ? "bg-noturno text-white" : "border border-borda bg-white text-slate-700 hover:bg-slate-50"}`;

  return (
    <>
      <Cabecalho
        titulo="Top Posts"
        descricao="Ranking dos posts dos concorrentes. A nota compara cada post com a média do próprio perfil, assim um perfil pequeno também aparece quando acerta."
      />

      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Link href={url({ formato: undefined })} className={pill(!formato)}>Todos os formatos</Link>
          {FORMATOS.map((f) => (
            <Link key={f} href={url({ formato: f })} className={pill(formato === f)}>
              {NOME_FORMATO[f]}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-suave">Ordenar por:</span>
          {(Object.keys(CRITERIOS) as Criterio[]).map((c) => (
            <Link key={c} href={url({ criterio: c })} className={pill(criterio === c)}>
              {CRITERIOS[c].nome}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-suave">Período:</span>
          {[
            { d: 0, n: "Tudo" },
            { d: 30, n: "30 dias" },
            { d: 90, n: "90 dias" },
          ].map(({ d, n }) => (
            <Link key={d} href={url({ dias: d ? String(d) : undefined })} className={pill(dias === d)}>
              {n}
            </Link>
          ))}
          <span className="mx-1 self-center text-borda">|</span>
          <Link href={url({ perfil: undefined })} className={pill(!sp.perfil)}>Todos os perfis</Link>
          {perfis
            .filter((p) => p.posts.length)
            .map((p) => (
              <Link key={p.username} href={url({ perfil: p.username })} className={pill(sp.perfil === p.username)}>
                @{p.username}
              </Link>
            ))}
        </div>
      </div>

      {posts.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((p, i) => (
            <PostCard key={`${p.username}-${p.id}`} post={p} posicao={i + 1} iaDisponivel={iaConfigurada()} />
          ))}
        </div>
      ) : (
        <Vazio titulo="Nenhum post com esse filtro" link={{ href: "/concorrentes", texto: "Coletar dados" }} />
      )}
    </>
  );
}
