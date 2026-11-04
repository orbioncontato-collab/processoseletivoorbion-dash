import Link from "next/link";
import { concorrentesReais, lerDB } from "@/lib/db";
import { fmtDataHora, fmtNum, fmtPct, fmtScore, media, resumirPerfil } from "@/lib/metricas";
import { NOME_FORMATO } from "@/lib/types";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";
import { FormBriefing } from "@/components/FormBriefing";
import { Avatar, Cabecalho, Card, Kpi, TituloSecao } from "@/components/ui";

export default async function MeuPerfil() {
  const db = await lerDB();
  const eu = db.meuPerfil;
  const r = eu.posts.length ? resumirPerfil(eu) : null;
  const outros = concorrentesReais(db).map(resumirPerfil);
  const taxaOutros = media(outros.map((o) => o.taxaEngajamento));

  return (
    <>
      <Cabecalho
        titulo="Meu Perfil"
        descricao="Seu briefing é a base de tudo: ideias, roteiros e análises usam estas informações. Ele já veio preenchido com o seu Guia de Marca Pessoal."
        acoes={<BotaoAtualizar username={eu.username} rotulo="Coletar meu perfil" />}
      />

      <Card className="mb-6">
        <div className="flex items-start gap-4">
          <Avatar perfil={{ ...eu, nome: db.briefing.nome }} tamanho={56} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{db.briefing.nome}</div>
            <div className="text-sm text-suave">
              @{eu.username} · coletado {fmtDataHora(eu.atualizadoEm)}
            </div>
            {eu.bio && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{eu.bio}</p>}
            {eu.erroColeta && <p className="mt-2 text-sm text-rose-700">{eu.erroColeta}</p>}
          </div>
          {r && (
            <Link href={`/concorrentes/${eu.username}`} className="text-xs font-semibold text-estrategico hover:underline">
              ver meus posts →
            </Link>
          )}
        </div>
        {r && (
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi rotulo="Seguidores" valor={fmtNum(eu.seguidores)} />
            <Kpi rotulo="Meu engajamento" valor={fmtPct(r.taxaEngajamento)} detalhe={outros.length ? `concorrentes: ${fmtPct(taxaOutros)}` : undefined} destaque />
            <Kpi rotulo="Interações / post" valor={fmtNum(r.mediaInteracoes)} />
            <Kpi
              rotulo="Meu melhor formato"
              valor={r.melhorFormato ? NOME_FORMATO[r.melhorFormato] : "–"}
              detalhe={r.melhorFormato ? `nota ${fmtScore(r.formatos.find((f) => f.formato === r.melhorFormato)!.mediaScore)}` : undefined}
            />
          </div>
        )}
      </Card>

      <Card>
        <TituloSecao>Briefing</TituloSecao>
        <FormBriefing inicial={db.briefing} />
      </Card>
    </>
  );
}
