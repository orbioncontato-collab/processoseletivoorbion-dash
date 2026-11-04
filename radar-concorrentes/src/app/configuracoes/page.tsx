import { lerDB } from "@/lib/db";
import { iaConfigurada, MODELO } from "@/lib/ia";
import { AlternarExemplos, ImportarBackup } from "@/components/Configuracoes";
import { Cabecalho, Card, TituloSecao } from "@/components/ui";

function Status({ ok, sim, nao }: { ok: boolean; sim: string; nao: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ok ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
      {ok ? sim : nao}
    </span>
  );
}

export default async function Configuracoes() {
  const db = await lerDB();
  const ia = iaConfigurada();
  const sessao = Boolean(process.env.INSTAGRAM_SESSIONID);

  return (
    <>
      <Cabecalho titulo="Configurações" />

      <div className="grid gap-6">
        <Card>
          <TituloSecao>Inteligência artificial</TituloSecao>
          <div className="mb-3">
            <Status ok={ia} sim={`Ligada (${MODELO})`} nao="Modo copiar e colar" />
          </div>
          <p className="text-sm text-slate-700">
            {ia
              ? "As análises, ideias e roteiros são gerados direto aqui na plataforma."
              : "Sem chave de API, a plataforma monta o prompt completo com seus dados e você cola no claude.ai. Funciona igual, só tem um passo a mais."}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Para ligar: crie uma chave em <b>console.anthropic.com</b>, coloque no arquivo <code className="rounded bg-slate-100 px-1">.env.local</code> na
            pasta do projeto como <code className="rounded bg-slate-100 px-1">ANTHROPIC_API_KEY=sua-chave</code> e reinicie a plataforma. O custo fica em
            centavos por roteiro.
          </p>
        </Card>

        <Card>
          <TituloSecao>Coleta do Instagram</TituloSecao>
          <div className="mb-3">
            <Status ok={sessao} sim="Usando sua sessão" nao="Coleta pública (sem login)" />
          </div>
          <p className="text-sm text-slate-700">
            A coleta pública funciona na maioria das vezes. Se o Instagram começar a bloquear, copie o cookie <b>sessionid</b> do seu navegador (logado no
            Instagram) e coloque no <code className="rounded bg-slate-100 px-1">.env.local</code> como{" "}
            <code className="rounded bg-slate-100 px-1">INSTAGRAM_SESSIONID=valor</code>. O passo a passo está no README.
          </p>
        </Card>

        <Card>
          <TituloSecao>Exibição</TituloSecao>
          <AlternarExemplos ligado={db.config.mostrarExemplos} />
          <p className="mt-2 text-xs text-suave">Os perfis de exemplo nunca entram nas análises da IA. Desligue quando os dados reais estiverem coletados.</p>
        </Card>

        <Card>
          <TituloSecao>Seus dados</TituloSecao>
          <p className="mb-3 text-sm text-slate-700">
            Tudo fica salvo no seu computador, no arquivo <code className="rounded bg-slate-100 px-1">data/radar.json</code>. Faça um backup de vez em
            quando.
          </p>
          <div className="flex flex-col gap-4">
            <a href="/api/backup" className="w-fit rounded-md bg-noturno px-4 py-2 text-sm font-semibold text-white">
              Baixar backup
            </a>
            <div>
              <div className="mb-1 text-sm font-medium">Restaurar backup</div>
              <ImportarBackup />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
