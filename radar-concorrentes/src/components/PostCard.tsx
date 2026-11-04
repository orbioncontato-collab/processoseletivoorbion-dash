import Link from "next/link";
import { ExternalLink, Eye, Heart, MessageCircle, Rocket } from "lucide-react";
import { fmtData, fmtNum, fmtPct, type PostAnalisado } from "@/lib/metricas";
import { Markdown } from "./Markdown";
import { PainelIA } from "./PainelIA";
import { SeloExemplo, SeloFormato, SeloNota, Thumb } from "./ui";

export function PostCard({
  post,
  iaDisponivel,
  posicao,
  mostrarAutor = true,
}: {
  post: PostAnalisado;
  iaDisponivel: boolean;
  posicao?: number;
  mostrarAutor?: boolean;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-borda bg-white shadow-sm">
      <div className="relative">
        <Thumb src={post.thumb} alt={post.legenda.slice(0, 40)} className={post.thumb ? "aspect-[4/5] w-full" : "h-24 w-full"} />
        {posicao !== undefined && (
          <span className="absolute left-2 top-2 rounded-md bg-noturno/90 px-2 py-0.5 text-xs font-bold text-orbital">#{posicao}</span>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <SeloNota score={post.score} />
        </div>
        {post.furouBolha && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-orbital px-1.5 py-0.5 text-[10px] font-bold text-noturno">
            <Rocket size={11} /> furou a bolha
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeloFormato formato={post.formato} />
          {post.exemplo && <SeloExemplo />}
          {post.fixado && <span className="text-[10px] text-suave">fixado</span>}
          <span className="ml-auto text-[11px] text-suave">{fmtData(post.data)}</span>
        </div>
        {mostrarAutor && (
          <Link href={`/concorrentes/${post.username}`} className="text-xs font-semibold text-estrategico hover:underline">
            @{post.username}
          </Link>
        )}
        <p className="line-clamp-3 text-xs leading-relaxed text-slate-700">{post.legenda || <i className="text-suave">sem legenda</i>}</p>
        <div className="mt-auto grid grid-cols-3 gap-1 border-t border-borda pt-2 text-[11px] text-slate-600">
          <span className="flex items-center gap-1" title="Curtidas"><Heart size={12} />{fmtNum(post.curtidas)}</span>
          <span className="flex items-center gap-1" title="Comentários"><MessageCircle size={12} />{fmtNum(post.comentarios)}</span>
          <span
            className="flex items-center gap-1"
            title={post.alcanceEstimado ? "Alcance estimado a partir do engajamento do perfil" : "Visualizações"}
          >
            <Eye size={12} />
            {post.alcance ? `${post.alcanceEstimado ? "~" : ""}${fmtNum(post.alcance)}` : "–"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-suave">
          <span>engaj. {fmtPct(post.taxa)}</span>
          {post.url && post.url !== "#" && (
            <a href={post.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-texto">
              abrir <ExternalLink size={11} />
            </a>
          )}
        </div>
        {post.analise ? (
          <details className="rounded-md bg-slate-50 p-2">
            <summary className="cursor-pointer text-xs font-semibold text-profundo">Por que performou</summary>
            <div className="mt-1">
              <Markdown texto={post.analise} />
            </div>
          </details>
        ) : (
          !post.exemplo && (
            <PainelIA
              compacto
              iaDisponivel={iaDisponivel}
              rotulo="Por que performou?"
              pedido={{ tipo: "analise-post", username: post.username, postId: post.id }}
            />
          )
        )}
      </div>
    </div>
  );
}
