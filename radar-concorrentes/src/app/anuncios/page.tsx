import { lerDB } from "@/lib/db";
import { AnuncioLinha } from "@/components/AnuncioLinha";
import { Cabecalho, Card, Kpi } from "@/components/ui";

export default async function Anuncios() {
  const db = await lerDB();
  const ativos = db.concorrentes.filter((c) => c.anuncios.situacao === "ativo").length;
  const verificados = db.concorrentes.filter((c) => c.anuncios.situacao !== "nao-verificado").length;

  return (
    <>
      <Cabecalho
        titulo="Anúncios"
        descricao="Quem está investindo em anúncio e no quê. Anúncio rodando há muito tempo costuma ser anúncio que dá resultado, então vale olhar o criativo e a oferta."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi rotulo="Com anúncio ativo" valor={ativos} destaque />
        <Kpi rotulo="Verificados" valor={`${verificados}/${db.concorrentes.length}`} />
      </div>

      <Card className="mb-6 bg-slate-50 text-sm text-slate-700">
        <b>Como funciona:</b> a Biblioteca de Anúncios da Meta é pública e mostra todo anúncio ativo no Facebook e Instagram. Clique no link de cada
        perfil, veja se aparece algo e marque aqui. A API oficial da Meta só libera anúncios políticos no Brasil, por isso essa checagem é feita
        por você, em 1 minuto por perfil. Vale repetir uma vez por mês.
      </Card>

      <Card>
        <div className="divide-y divide-borda">
          {db.concorrentes.map((c) => (
            <AnuncioLinha key={c.username} username={c.username} nome={c.nome} status={c.anuncios} />
          ))}
        </div>
      </Card>
    </>
  );
}
