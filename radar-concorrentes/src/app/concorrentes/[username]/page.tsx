import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { concorrentesVisiveis, lerDB } from "@/lib/db";
import { iaConfigurada } from "@/lib/ia";
import { fmtDataHora, fmtNum, fmtPct, fmtScore, resumirPerfil } from "@/lib/metricas";
import { FORMATOS, NOME_FORMATO, type Formato } from "@/lib/types";
import { BotaoAtualizar } from "@/components/BotaoAtualizar";
import { BotaoRemoverPost, FormPostManual, FormSeguidoresELinks } from "@/components/Formularios";
import { PostCard } from "@/components/PostCard";
import { Avatar, Cabecalho, Card, Kpi, SeloExemplo, TituloSecao, Vazio } from "@/components/ui";

export default async function DetalheConcorrente({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ ordem?: string; formato?: string }>;
}) {
  const { username } = await params;
  const { ordem = "nota", formato } = await searchParams;
  const db = await lerDB();
  const perfil =
    db.meuPerfil.username === username ? db.meuPerfil : concorrentesVisiveis(db).find((p) => p.username === username);
  if (!perfil) notFound();

  const r = resumirPerfil(perfil);
  const ia = iaConfigurada();
  const filtro = FORMATOS.includes(formato as Formato) ? (formato as Formato) : undefined;
  const posts = r.posts
    .filter((p) => !filtro || p.formato === filtro)
    .sort((a, b) => (ordem === "data" ? b.data.localeCompare(a.data) : b.score - a.score));

  const link = (o: string, f?: string) => `?ordem=${o}${f ? `&formato=${f}` : ""}`;
  const pill = (ativo: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${ativo ? "bg-noturno text-white" : "border border-borda bg-white text-slate-700 hover:bg-slate-50"}`;

  return (
    <>
      <Cabecalho
        titulo={perfil.nome || `@${perfil.username}`}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            <a href={`https://instagram.com/${perfil.username}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">
              @{perfil.username} <ExternalLink size={12} />
            </a>
            · atualizado {fmtDataHora(perfil.atualizadoEm)}
            {perfil.exemplo && <SeloExemplo />}
          </span>
        }
        acoes={!perfil.exemplo && <BotaoAtualizar username={perfil.username} />}
      />

      <div className="mb-6 flex items-start gap-4">
        <Avatar perfil={perfil} tamanho={64} />
        <p className="whitespace-pre-line text-sm text-slate-700">{perfil.bio || <span className="text-suave">Bio aparece depois da primeira coleta.</span>}</p>
      </div>

      {perfil.erroColeta && <div className="mb-6 rounded-md bg-rose-50 p-3 text-sm text-rose-700">Última coleta falhou: {perfil.erroColeta}</div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi rotulo="Seguidores" valor={fmtNum(perfil.seguidores)} detalhe={r.variacaoSeguidores !== null ? `${r.variacaoSeguidores >= 0 ? "+" : ""}${fmtNum(r.variacaoSeguidores)} no período` : undefined} />
        <Kpi rotulo="Taxa de engajamento" valor={fmtPct(r.taxaEngajamento)} destaque />
        <Kpi rotulo="Interações / post" valor={fmtNum(r.mediaInteracoes)} />
        <Kpi rotulo="Views médias (vídeo)" valor={fmtNum(r.mediaViews)} />
        <Kpi rotulo="Posts por semana" valor={r.postsPorSemana.toFixed(1)} />
      </div>

      <Card className="mt-6">
        <TituloSecao>Desempenho por formato</TituloSecao>
        <div className="grid gap-3 sm:grid-cols-3">
          {r.formatos.map((f) => (
            <div key={f.formato} className={`rounded-lg border p-3 ${r.melhorFormato === f.formato ? "border-orbital bg-emerald-50/50" : "border-borda"}`}>
              <div className="flex items-center justify-between text-sm font-semibold">
                {NOME_FORMATO[f.formato]}
                {r.melhorFormato === f.formato && <span className="text-[10px] font-bold uppercase text-emerald-700">melhor</span>}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                {f.qtd} posts ({Math.round(f.share * 100)}%) · {fmtNum(f.mediaInteracoes)} interações · nota {f.qtd ? fmtScore(f.mediaScore) : "–"}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-3 mt-8 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-xs font-semibold uppercase tracking-wider text-suave">Posts ({posts.length})</h2>
        <Link href={link("nota", filtro)} className={pill(ordem !== "data")}>Melhores primeiro</Link>
        <Link href={link("data", filtro)} className={pill(ordem === "data")}>Mais recentes</Link>
        <span className="mx-1 text-borda">|</span>
        <Link href={link(ordem)} className={pill(!filtro)}>Todos</Link>
        {FORMATOS.map((f) => (
          <Link key={f} href={link(ordem, f)} className={pill(filtro === f)}>
            {NOME_FORMATO[f]}
          </Link>
        ))}
      </div>

      {posts.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-col gap-1">
              <PostCard post={p} iaDisponivel={ia} mostrarAutor={false} />
              {p.origem === "manual" && !perfil.exemplo && (
                <div className="text-right">
                  <BotaoRemoverPost username={perfil.username} id={p.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Vazio titulo="Nenhum post na base">Clique em atualizar para coletar, ou adicione um post à mão logo abaixo.</Vazio>
      )}

      {!perfil.exemplo && (
        <div className="mt-8 grid gap-6">
          <Card>
            <TituloSecao>Adicionar post à mão</TituloSecao>
            <p className="mb-4 text-xs text-suave">
              Use quando a coleta automática falhar ou quando quiser registrar um post mais antigo que bombou (a coleta só pega os 12 mais recentes).
            </p>
            <FormPostManual username={perfil.username} precisaSeguidores={!perfil.seguidores} />
          </Card>
          <Card>
            <TituloSecao>Seguidores e outras redes</TituloSecao>
            <FormSeguidoresELinks username={perfil.username} seguidores={perfil.seguidores} youtube={perfil.youtube} tiktok={perfil.tiktok} />
          </Card>
        </div>
      )}
    </>
  );
}
