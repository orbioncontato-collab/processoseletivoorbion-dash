import { concorrentesVisiveis, lerDB } from "@/lib/db";
import { resumirPerfil } from "@/lib/metricas";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";
import { ConcorrenteCard } from "@/components/ConcorrenteCard";
import { FormNovoConcorrente } from "@/components/Formularios";
import { Cabecalho, Card, TituloSecao } from "@/components/ui";

export default async function Concorrentes() {
  const db = await lerDB();
  const perfis = concorrentesVisiveis(db);

  return (
    <>
      <Cabecalho
        titulo="Concorrentes"
        descricao="Os perfis de referência que você acompanha. Cada coleta traz os 12 posts mais recentes e a base vai crescendo com o tempo."
        acoes={<BotaoAtualizar />}
      />

      <Card className="mb-6">
        <TituloSecao>Adicionar perfil</TituloSecao>
        <FormNovoConcorrente />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {perfis.map((p) => (
          <ConcorrenteCard key={p.username} r={resumirPerfil(p)} />
        ))}
      </div>
    </>
  );
}
