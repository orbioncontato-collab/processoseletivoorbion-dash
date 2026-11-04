import Link from "next/link";
import { concorrentesVisiveis, lerDB } from "@/lib/db";
import { fmtNum, fmtPct, resumirPerfil } from "@/lib/metricas";
import { GraficoSeguidores } from "@/components/GraficoSeguidores";
import { Avatar, Cabecalho, Card, SeloExemplo, TituloSecao } from "@/components/ui";

export default async function Metricas() {
  const db = await lerDB();
  const perfis = [db.meuPerfil, ...concorrentesVisiveis(db)].filter((p) => p.posts.length);
  const resumos = perfis.map(resumirPerfil);
  const series = perfis.filter((p) => p.historico.length >= 2).map((p) => ({ username: p.username, pontos: p.historico }));

  return (
    <>
      <Cabecalho
        titulo="Métricas"
        descricao="Comparativo lado a lado, incluindo o seu perfil. O histórico de seguidores ganha um ponto a cada coleta, então vale atualizar toda semana."
      />

      <Card className="mb-6">
        <TituloSecao>Comparativo</TituloSecao>
        {resumos.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-suave">
                  <th className="pb-2 font-medium">Perfil</th>
                  <th className="pb-2 text-right font-medium">Seguidores</th>
                  <th className="pb-2 text-right font-medium">Crescimento</th>
                  <th className="pb-2 text-right font-medium">Engaj.</th>
                  <th className="pb-2 text-right font-medium">Interações</th>
                  <th className="pb-2 text-right font-medium">Coment.</th>
                  <th className="pb-2 text-right font-medium">Views (vídeo)</th>
                  <th className="pb-2 text-right font-medium">Posts/sem</th>
                  <th className="pb-2 text-right font-medium">Mix V / C / I</th>
                </tr>
              </thead>
              <tbody>
                {resumos.map((r) => {
                  const eu = r.perfil.username === db.meuPerfil.username;
                  const mix = r.formatos.map((f) => Math.round(f.share * 100)).join(" / ");
                  return (
                    <tr key={r.perfil.username} className={`border-t border-borda ${eu ? "bg-emerald-50/60" : ""}`}>
                      <td className="py-2">
                        <Link href={`/concorrentes/${r.perfil.username}`} className="flex items-center gap-2 hover:underline">
                          <Avatar perfil={r.perfil} tamanho={24} />@{r.perfil.username}
                          {eu && <span className="text-[10px] font-bold uppercase text-emerald-700">você</span>}
                          {r.perfil.exemplo && <SeloExemplo />}
                        </Link>
                      </td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(r.perfil.seguidores)}</td>
                      <td className="py-2 text-right tabular-nums">
                        {r.variacaoSeguidores === null ? "–" : `${r.variacaoSeguidores >= 0 ? "+" : ""}${fmtNum(r.variacaoSeguidores)}`}
                      </td>
                      <td className="py-2 text-right font-semibold tabular-nums">{fmtPct(r.taxaEngajamento)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(r.mediaInteracoes)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(r.mediaComentarios)}</td>
                      <td className="py-2 text-right tabular-nums">{fmtNum(r.mediaViews)}</td>
                      <td className="py-2 text-right tabular-nums">{r.postsPorSemana.toFixed(1)}</td>
                      <td className="py-2 text-right tabular-nums text-slate-600">{mix}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-suave">Sem dados ainda.</p>
        )}
      </Card>

      <Card>
        <TituloSecao>Evolução de seguidores</TituloSecao>
        {series.length ? (
          <GraficoSeguidores series={series} />
        ) : (
          <p className="text-sm text-suave">O gráfico aparece a partir da segunda coleta em dias diferentes.</p>
        )}
      </Card>
    </>
  );
}
