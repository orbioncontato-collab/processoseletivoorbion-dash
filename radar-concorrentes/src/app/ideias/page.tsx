import { concorrentesReais, concorrentesVisiveis, lerDB } from "@/lib/db";
import { iaConfigurada } from "@/lib/ia";
import { coberturaPorPilar, fmtScore, todosOsPosts } from "@/lib/metricas";
import { GeracaoCard } from "@/components/GeracaoCard";
import { PainelIA } from "@/components/PainelIA";
import { Cabecalho, Card, SeloNota, TituloSecao } from "@/components/ui";

function rotulo(qtd: number, share: number, score: number) {
  if (qtd === 0) return { texto: "Ninguém fala", cor: "bg-orbital text-noturno" };
  if (share < 0.08 && score >= 1) return { texto: "Pouca gente fala e funciona", cor: "bg-emerald-600 text-white" };
  if (share < 0.08) return { texto: "Pouca gente fala", cor: "bg-emerald-100 text-emerald-800" };
  if (score >= 1.2) return { texto: "Disputado, mas rende", cor: "bg-sky-100 text-sky-800" };
  return { texto: "Disputado", cor: "bg-slate-100 text-slate-600" };
}

export default async function Ideias() {
  const db = await lerDB();
  const reais = concorrentesReais(db);
  const posts = todosOsPosts(concorrentesVisiveis(db).filter((p) => p.posts.length));
  const cobertura = coberturaPorPilar(posts, db.briefing.pilares.map((p) => p.nome)).sort((a, b) => a.share - b.share);
  const ideias = db.geracoes.filter((g) => g.tipo === "ideias");

  return (
    <>
      <Cabecalho
        titulo="Ideias e Oportunidades"
        descricao="Cruza o que performou nos concorrentes com o seu briefing. Mostra o que está funcionando, o que ninguém está falando e sugere conteúdos para você."
      />

      <Card className="mb-6">
        <TituloSecao>Seus pilares nos concorrentes</TituloSecao>
        <p className="mb-4 text-xs text-suave">
          Contagem por palavra-chave na legenda, serve como primeira pista. A análise da IA abaixo lê o conteúdo de verdade.
        </p>
        <div className="divide-y divide-borda">
          {cobertura.map((c) => {
            const r = rotulo(c.qtd, c.share, c.score);
            return (
              <div key={c.pilar} className="flex flex-col gap-2 py-3 md:flex-row md:items-center">
                <div className="md:w-60">
                  <div className="text-sm font-semibold">{c.pilar}</div>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.cor}`}>{r.texto}</span>
                </div>
                <div className="flex-1 text-xs text-slate-600">
                  {c.qtd} posts ({Math.round(c.share * 100)}%) em {c.perfis} perfis{c.qtd ? ` · nota média ${fmtScore(c.score)}` : ""}
                  {c.exemplos.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {c.exemplos.slice(0, 2).map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <SeloNota score={p.score} />
                          <span className="truncate">
                            @{p.username}: {p.legenda.slice(0, 90)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mb-6">
        <TituloSecao>Análise completa com IA</TituloSecao>
        <p className="mb-4 text-sm text-slate-600">
          Gera: os padrões que explicam os posts que bombaram, o formato vencedor, os assuntos que ninguém cobre e 10 ideias prontas para você,
          cada uma com formato, gancho e referência.
        </p>
        <PainelIA
          pedido={{ tipo: "ideias" }}
          rotulo="Gerar ideias"
          iaDisponivel={iaConfigurada()}
          desabilitado={reais.length ? undefined : "Colete os dados dos concorrentes primeiro (os perfis de exemplo não entram na análise)."}
        />
      </Card>

      <div className="space-y-3">
        {ideias.map((g, i) => (
          <GeracaoCard key={g.id} g={g} aberto={i === 0} />
        ))}
      </div>
    </>
  );
}
