import Link from "next/link";
import { concorrentesVisiveis, lerDB } from "@/lib/db";
import { iaConfigurada } from "@/lib/ia";
import { fmtDataHora, fmtNum, fmtPct, fmtScore, resumirFormatos, resumirPerfil, todosOsPosts } from "@/lib/metricas";
import { NOME_FORMATO } from "@/lib/types";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";
import { PostCard } from "@/components/PostCard";
import { Avatar, Barra, Cabecalho, Card, COR_GRAFICO, Kpi, SeloExemplo, TituloSecao, Vazio } from "@/components/ui";

export default async function VisaoGeral() {
  const db = await lerDB();
  const perfis = concorrentesVisiveis(db);
  const comDados = perfis.filter((p) => p.posts.length);
  const reaisComDados = db.concorrentes.filter((p) => p.posts.length);
  const resumos = comDados.map(resumirPerfil).sort((a, b) => b.taxaEngajamento - a.taxaEngajamento);
  const posts = todosOsPosts(comDados);
  const formatos = resumirFormatos(posts).filter((f) => f.qtd > 0);
  const vencedor = [...formatos].filter((f) => f.qtd >= 3).sort((a, b) => b.mediaScore - a.mediaScore)[0];
  const maxScore = Math.max(...formatos.map((f) => f.mediaScore), 1);
  const top = [...posts].sort((a, b) => b.score - a.score).slice(0, 4);
  const meu = db.meuPerfil.posts.length ? resumirPerfil(db.meuPerfil) : null;
  const mediaConcorrentes = resumos.length ? resumos.reduce((s, r) => s + r.taxaEngajamento, 0) / resumos.length : 0;
  const ultimaColeta = db.concorrentes.map((c) => c.atualizadoEm).filter(Boolean).sort().at(-1);
  const ultimaIdeia = db.geracoes.find((g) => g.tipo === "ideias");

  return (
    <>
      <Cabecalho
        titulo="Visão Geral"
        descricao={`Resumo dos ${db.concorrentes.length} perfis que você acompanha. Última coleta: ${fmtDataHora(ultimaColeta)}.`}
        acoes={<BotaoAtualizar />}
      />

      {!reaisComDados.length && (
        <div className="mb-6 rounded-xl border border-orbital/40 bg-noturno p-5 text-sm text-slate-200">
          <div className="font-semibold text-white">Primeiro passo: coletar os dados</div>
          <p className="mt-1">
            Clique em <b className="text-orbital">Atualizar todos</b>. A plataforma visita cada perfil (o seu e os concorrentes) e salva os posts recentes.
            Leva uns 30 segundos.
            {db.config.mostrarExemplos && " Enquanto isso, as telas mostram dois perfis de exemplo (fictícios) para você ver como tudo fica."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Perfis monitorados" valor={db.concorrentes.length} detalhe={`${reaisComDados.length} com dados coletados`} />
        <Kpi rotulo="Posts analisados" valor={fmtNum(posts.length)} detalhe="a base cresce a cada coleta" />
        <Kpi
          rotulo="Formato vencedor"
          valor={vencedor ? NOME_FORMATO[vencedor.formato] : "–"}
          detalhe={vencedor ? `nota média ${fmtScore(vencedor.mediaScore)} da média dos perfis` : "precisa de mais posts"}
          destaque
        />
        <Kpi
          rotulo="Seu engajamento"
          valor={meu ? fmtPct(meu.taxaEngajamento) : "–"}
          detalhe={meu ? `concorrentes: ${fmtPct(mediaConcorrentes)}` : "colete o seu perfil"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <TituloSecao extra={<Link href="/concorrentes" className="text-xs text-estrategico hover:underline">ver todos</Link>}>
            Ranking por engajamento
          </TituloSecao>
          {resumos.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-suave">
                    <th className="pb-2 font-medium">Perfil</th>
                    <th className="pb-2 text-right font-medium">Seguidores</th>
                    <th className="pb-2 text-right font-medium">Engaj.</th>
                    <th className="hidden pb-2 text-right font-medium sm:table-cell">Posts/sem</th>
                    <th className="pb-2 text-right font-medium">Melhor formato</th>
                  </tr>
                </thead>
                <tbody>
                  {resumos.map((r, i) => (
                    <tr key={r.perfil.username} className="border-t border-borda">
                      <td className="py-2">
                        <Link href={`/concorrentes/${r.perfil.username}`} className="flex items-center gap-2 hover:underline">
                          <span className="w-4 text-xs text-suave">{i + 1}</span>
                          <Avatar perfil={r.perfil} tamanho={26} />
                          <span className="truncate">@{r.perfil.username}</span>
                          {r.perfil.exemplo && <SeloExemplo />}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(r.perfil.seguidores)}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">{fmtPct(r.taxaEngajamento)}</td>
                      <td className="hidden py-2 text-right tabular-nums sm:table-cell">{r.postsPorSemana.toFixed(1)}</td>
                      <td className="py-2 text-right">{r.melhorFormato ? NOME_FORMATO[r.melhorFormato] : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-suave">Sem dados ainda.</p>
          )}
        </Card>

        <Card>
          <TituloSecao>Qual formato entrega mais</TituloSecao>
          {formatos.length ? (
            <div className="space-y-4">
              {formatos.map((f) => (
                <div key={f.formato}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{NOME_FORMATO[f.formato]}</span>
                    <span className="tabular-nums text-slate-600">
                      nota {fmtScore(f.mediaScore)} · {Math.round(f.share * 100)}% dos posts
                    </span>
                  </div>
                  <Barra valor={f.mediaScore} max={maxScore} cor={COR_GRAFICO[f.formato]} />
                </div>
              ))}
              <p className="text-xs text-suave">
                Nota = quanto o post rendeu comparado à média do próprio perfil. Acima de 1,0x quer dizer que o formato rende mais que o normal.
              </p>
            </div>
          ) : (
            <p className="text-sm text-suave">Sem dados ainda.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <TituloSecao extra={<Link href="/top-posts" className="text-xs text-estrategico hover:underline">ver ranking completo</Link>}>
          Posts que mais performaram
        </TituloSecao>
        {top.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {top.map((p, i) => (
              <PostCard key={`${p.username}-${p.id}`} post={p} posicao={i + 1} iaDisponivel={iaConfigurada()} />
            ))}
          </div>
        ) : (
          <Vazio titulo="Nenhum post ainda" link={{ href: "/concorrentes", texto: "Ir para concorrentes" }} />
        )}
      </div>

      <div className="mt-6">
        <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold">Ideias e oportunidades</div>
            <p className="text-sm text-suave">
              {ultimaIdeia
                ? `Última análise: ${fmtDataHora(ultimaIdeia.criadoEm)}.`
                : "A IA cruza o que performou nos concorrentes com o seu briefing e mostra o que ninguém está falando."}
            </p>
          </div>
          <Link href="/ideias" className="rounded-lg bg-orbital px-4 py-2 text-center text-sm font-semibold text-noturno">
            {ultimaIdeia ? "Ver ideias" : "Gerar ideias"}
          </Link>
        </Card>
      </div>
    </>
  );
}
