import { concorrentesVisiveis, lerDB } from "@/lib/db";
import {
  desempenhoPorDia,
  desempenhoPorTamanhoLegenda,
  fmtScore,
  hashtags,
  palavrasQuePerformam,
  resumirFormatos,
  resumirPerfil,
  todosOsPosts,
} from "@/lib/metricas";
import { FORMATOS, NOME_FORMATO } from "@/lib/types";
import { Barra, Cabecalho, Card, COR_GRAFICO, SeloExemplo, TituloSecao, Vazio } from "@/components/ui";

function corNota(score: number, qtd: number) {
  if (!qtd) return "bg-slate-50 text-slate-300";
  if (score >= 1.5) return "bg-emerald-500 text-white";
  if (score >= 1.1) return "bg-emerald-100 text-emerald-900";
  if (score >= 0.9) return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

export default async function Tendencias() {
  const db = await lerDB();
  const perfis = concorrentesVisiveis(db).filter((p) => p.posts.length);
  if (!perfis.length) {
    return (
      <>
        <Cabecalho titulo="Tendências" />
        <Vazio titulo="Sem dados ainda" link={{ href: "/concorrentes", texto: "Coletar dados" }}>
          As tendências aparecem depois da primeira coleta.
        </Vazio>
      </>
    );
  }

  const posts = todosOsPosts(perfis);
  const formatos = resumirFormatos(posts);
  const palavras = palavrasQuePerformam(posts);
  const dias = desempenhoPorDia(posts);
  const legendas = desempenhoPorTamanhoLegenda(posts);
  const maxDia = Math.max(...dias.map((d) => d.score), 1);
  const maxLeg = Math.max(...legendas.map((d) => d.score), 1);

  const ordenados = [...posts].sort((a, b) => b.score - a.score);
  const topQuarto = ordenados.slice(0, Math.max(3, Math.floor(ordenados.length / 4)));
  const contaTags = new Map<string, number>();
  topQuarto.forEach((p) => hashtags(p.legenda).forEach((h) => contaTags.set(h, (contaTags.get(h) ?? 0) + 1)));
  const tags = [...contaTags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);

  // o que eles postam mais x o que rende mais
  const maisPostado = [...formatos].sort((a, b) => b.qtd - a.qtd)[0];
  const maisRende = [...formatos].filter((f) => f.qtd >= 3).sort((a, b) => b.mediaScore - a.mediaScore)[0];

  return (
    <>
      <Cabecalho
        titulo="Tendências"
        descricao={`Padrões encontrados em ${posts.length} posts de ${perfis.length} perfis. Para a leitura completa (temas, ganchos e lacunas), use a aba Ideias.`}
      />

      {maisPostado && maisRende && (
        <div className="mb-6 rounded-xl bg-noturno p-5 text-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-orbital">Leitura rápida</div>
          <p className="mt-2 text-sm leading-relaxed">
            O formato que eles mais publicam é <b className="text-white">{NOME_FORMATO[maisPostado.formato]}</b> ({Math.round(maisPostado.share * 100)}% dos posts).
            O que mais rende acima da média é <b className="text-white">{NOME_FORMATO[maisRende.formato]}</b> (nota {fmtScore(maisRende.mediaScore)}).
            {maisPostado.formato !== maisRende.formato &&
              ` Ou seja: tem espaço para quem fizer mais ${NOME_FORMATO[maisRende.formato].toLowerCase()} bem feito.`}
          </p>
        </div>
      )}

      <Card>
        <TituloSecao>Nota média por formato em cada perfil</TituloSecao>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-suave">
                <th className="pb-2 font-medium">Perfil</th>
                {FORMATOS.map((f) => (
                  <th key={f} className="pb-2 text-center font-medium">{NOME_FORMATO[f]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfis.map((p) => {
                const r = resumirPerfil(p);
                return (
                  <tr key={p.username} className="border-t border-borda">
                    <td className="py-2 pr-2">
                      @{p.username} {p.exemplo && <SeloExemplo />}
                    </td>
                    {r.formatos.map((f) => (
                      <td key={f.formato} className="p-1">
                        <div className={`rounded-md px-2 py-1.5 text-center text-xs font-semibold tabular-nums ${corNota(f.mediaScore, f.qtd)}`}>
                          {f.qtd ? `${fmtScore(f.mediaScore)} (${f.qtd})` : "–"}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-suave">Verde = formato rende acima da média daquele perfil. O número entre parênteses é a quantidade de posts.</p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <TituloSecao>Palavras que aparecem nos posts que bombaram</TituloSecao>
          {palavras.length ? (
            <div className="flex flex-wrap gap-2">
              {palavras.map((w) => (
                <span key={w.palavra} className="rounded-full border border-borda bg-slate-50 px-3 py-1 text-sm" title={`Aparece em ${w.noTop} dos melhores posts`}>
                  {w.palavra} <span className="text-xs text-emerald-700">{w.lift.toFixed(1)}x</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-suave">Precisa de mais posts para achar padrão.</p>
          )}
          <p className="mt-3 text-xs text-suave">O número mostra quantas vezes a palavra aparece mais nos 25% melhores posts do que no resto.</p>
        </Card>

        <Card>
          <TituloSecao>Hashtags dos melhores posts</TituloSecao>
          {tags.length ? (
            <div className="flex flex-wrap gap-2">
              {tags.map(([t, n]) => (
                <span key={t} className="rounded-full bg-sky-50 px-3 py-1 text-sm text-sky-800">
                  {t} <span className="text-xs">({n})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-suave">Os melhores posts quase não usam hashtag.</p>
          )}
        </Card>

        <Card>
          <TituloSecao>Dia da semana</TituloSecao>
          <div className="space-y-2">
            {dias.map((d) => (
              <div key={d.dia} className="grid grid-cols-[36px_1fr_80px] items-center gap-2 text-xs">
                <span>{d.dia}</span>
                <Barra valor={d.score} max={maxDia} cor="#295d86" />
                <span className="text-right tabular-nums text-slate-600">
                  {d.qtd ? fmtScore(d.score) : "–"} <span className="text-suave">({d.qtd})</span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <TituloSecao>Tamanho da legenda</TituloSecao>
          <div className="space-y-3">
            {legendas.map((l) => (
              <div key={l.faixa}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{l.faixa} caracteres</span>
                  <span className="tabular-nums text-slate-600">
                    {l.qtd ? fmtScore(l.score) : "–"} <span className="text-suave">({l.qtd})</span>
                  </span>
                </div>
                <Barra valor={l.score} max={maxLeg} cor="#265c58" />
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-suave">Mix geral</div>
            {formatos.map((f) => (
              <div key={f.formato} className="grid grid-cols-[80px_1fr_44px] items-center gap-2 text-xs">
                <span>{NOME_FORMATO[f.formato]}</span>
                <Barra valor={f.share} max={1} cor={COR_GRAFICO[f.formato]} />
                <span className="text-right tabular-nums">{Math.round(f.share * 100)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
