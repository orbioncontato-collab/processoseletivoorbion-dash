import { concorrentesReais, lerDB } from "@/lib/db";
import { iaConfigurada } from "@/lib/ia";
import { todosOsPosts } from "@/lib/metricas";
import { FormRoteiro } from "@/components/FormRoteiro";
import { GeracaoCard } from "@/components/GeracaoCard";
import { Markdown } from "@/components/Markdown";
import { PainelIA } from "@/components/PainelIA";
import { Cabecalho, Card, TituloSecao } from "@/components/ui";

export default async function Roteiros() {
  const db = await lerDB();
  const ia = iaConfigurada();
  const refs = todosOsPosts(concorrentesReais(db))
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map((p) => ({ id: p.id, username: p.username, formato: p.formato, legenda: p.legenda.slice(0, 220), score: p.score }));
  const guia = db.geracoes.find((g) => g.tipo === "guia-de-voz");
  const roteiros = db.geracoes.filter((g) => g.tipo === "roteiro");

  return (
    <>
      <Cabecalho
        titulo="Roteiros"
        descricao="Ideias de conteúdo prontas para gravar, criadas a partir do que deu certo nos concorrentes e ajustadas ao seu briefing e ao seu jeito de falar."
      />

      <Card className="mb-6 bg-slate-50">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-suave">Como usar esta página</div>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li><b>Guia de voz:</b> gere uma vez. Ele ensina a IA a escrever do seu jeito e entra em todos os roteiros.</li>
          <li><b>Novo roteiro:</b> escolha tema e formato (ou deixe a IA decidir) e as referências que quer modelar.</li>
          <li><b>Ordem de gravação:</b> o roteiro número 1 é o mais recente.</li>
        </ol>
        <p className="mt-2 text-xs text-suave">
          Para quem: {db.briefing.publico.quem.split(".")[0].toLowerCase()}, {db.briefing.publico.idade}.
        </p>
      </Card>

      <Card className="mb-6">
        <TituloSecao>Guia de voz do {db.briefing.nome.split(" ")[0]}</TituloSecao>
        {guia ? (
          <details>
            <summary className="cursor-pointer text-sm text-estrategico">Ver guia de voz (vale para todos os roteiros)</summary>
            <div className="mt-3">
              <Markdown texto={guia.conteudo} />
            </div>
          </details>
        ) : (
          <p className="mb-3 text-sm text-slate-600">Ainda não gerado. Fica melhor depois de coletar o seu perfil, porque a IA lê suas legendas.</p>
        )}
        <div className="mt-3">
          <PainelIA pedido={{ tipo: "guia-de-voz" }} rotulo={guia ? "Refazer guia de voz" : "Gerar guia de voz"} iaDisponivel={ia} compacto={Boolean(guia)} />
        </div>
      </Card>

      <Card className="mb-6">
        <TituloSecao>Novo roteiro</TituloSecao>
        <FormRoteiro referencias={refs} iaDisponivel={ia} />
      </Card>

      <TituloSecao>Roteiros gerados ({roteiros.length})</TituloSecao>
      <div className="space-y-3">
        {roteiros.map((g, i) => (
          <GeracaoCard key={g.id} g={g} numero={i + 1} aberto={i === 0} />
        ))}
        {!roteiros.length && <p className="text-sm text-suave">Nenhum roteiro ainda.</p>}
      </div>
    </>
  );
}
