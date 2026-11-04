import Link from "next/link";
import { AlertTriangle, Instagram, Youtube } from "lucide-react";
import { fmtDataHora, fmtNum, fmtPct, fmtScore, type ResumoPerfil } from "@/lib/metricas";
import { NOME_FORMATO } from "@/lib/types";
import { BotaoAtualizar } from "./BotaoAtualizar";
import { BotaoRemoverConcorrente } from "./Formularios";
import { Avatar, Barra, COR_GRAFICO, SeloExemplo, SeloNota, Thumb } from "./ui";

export function ConcorrenteCard({ r }: { r: ResumoPerfil }) {
  const { perfil } = r;
  const semDados = perfil.posts.length === 0;
  const maxInter = Math.max(...r.formatos.map((f) => f.mediaInteracoes), 1);
  const top = [...r.posts].sort((a, b) => b.score - a.score).slice(0, 2);

  return (
    <div className="flex flex-col rounded-xl border border-borda bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <Avatar perfil={perfil} tamanho={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link href={`/concorrentes/${perfil.username}`} className="truncate font-semibold hover:underline">
              {perfil.nome || `@${perfil.username}`}
            </Link>
            {perfil.exemplo && <SeloExemplo />}
          </div>
          <div className="truncate text-xs text-suave">
            {perfil.nome && `@${perfil.username} · `}{perfil.posts.length} posts na base · {fmtDataHora(perfil.atualizadoEm)}
          </div>
        </div>
        {!perfil.exemplo && <BotaoRemoverConcorrente username={perfil.username} />}
      </div>

      {perfil.erroColeta && (
        <div className="mt-3 flex gap-2 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {perfil.erroColeta}
        </div>
      )}

      {semDados ? (
        <div className="mt-4 flex flex-1 flex-col items-start justify-between gap-3 rounded-lg bg-slate-50 p-4 text-sm text-suave">
          Ainda sem dados. Clique em atualizar para coletar.
          <BotaoAtualizar username={perfil.username} rotulo="Coletar agora" discreto />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <Metrica valor={fmtNum(perfil.seguidores)} rotulo="seguidores" extra={r.variacaoSeguidores ? `${r.variacaoSeguidores > 0 ? "+" : ""}${fmtNum(r.variacaoSeguidores)}` : undefined} />
            <Metrica valor={fmtNum(r.mediaInteracoes)} rotulo="interações / post" />
            <Metrica valor={fmtPct(r.taxaEngajamento)} rotulo="taxa de engajamento" />
            <Metrica valor={fmtNum(r.mediaComentarios)} rotulo="comentários / post" />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
              <Instagram size={11} /> Instagram
            </span>
            {perfil.youtube && (
              <a href={perfil.youtube} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-1.5 py-0.5 text-rose-700">
                <Youtube size={11} /> YouTube
              </a>
            )}
            {perfil.tiktok && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">TikTok</span>}
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">{r.postsPorSemana.toFixed(1)} posts/sem</span>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-suave">Engajamento por formato</div>
            <div className="space-y-2">
              {r.formatos
                .filter((f) => f.qtd > 0)
                .map((f) => (
                  <div key={f.formato} className="grid grid-cols-[88px_1fr_74px] items-center gap-2 text-xs">
                    <span>
                      {NOME_FORMATO[f.formato]} <span className="text-suave">({f.qtd})</span>
                    </span>
                    <Barra valor={f.mediaInteracoes} max={maxInter} cor={COR_GRAFICO[f.formato]} />
                    <span className="text-right tabular-nums text-slate-600">
                      {fmtNum(f.mediaInteracoes)} · {fmtScore(f.mediaScore)}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-suave">Top posts</div>
            <div className="space-y-2">
              {top.map((p) => (
                <a key={p.id} href={p.url !== "#" ? p.url : undefined} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md p-1 hover:bg-slate-50">
                  <Thumb src={p.thumb} alt="" className="h-10 w-10 shrink-0 rounded" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">{p.legenda || "sem legenda"}</div>
                    <div className="text-[11px] text-suave">
                      {fmtNum(p.interacoes)} interações · {NOME_FORMATO[p.formato]}
                    </div>
                  </div>
                  <SeloNota score={p.score} />
                </a>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-borda pt-3">
            <Link href={`/concorrentes/${perfil.username}`} className="text-xs font-semibold text-estrategico hover:underline">
              Ver todos os posts →
            </Link>
            {!perfil.exemplo && <BotaoAtualizar username={perfil.username} discreto />}
          </div>
        </>
      )}
    </div>
  );
}

function Metrica({ valor, rotulo, extra }: { valor: string; rotulo: string; extra?: string }) {
  return (
    <div>
      <div className="text-lg font-bold tabular-nums">
        {valor} {extra && <span className="text-xs font-medium text-emerald-600">{extra}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-suave">{rotulo}</div>
    </div>
  );
}
