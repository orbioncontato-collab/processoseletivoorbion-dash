"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  adicionarConcorrente,
  adicionarPostManual,
  removerConcorrente,
  removerPost,
  salvarLinks,
  salvarSeguidores,
  type Resultado,
} from "@/app/actions";

const campo = "w-full rounded-md border border-borda bg-white px-3 py-2 text-sm outline-none focus:border-estrategico";

function Mensagem({ r }: { r: Resultado | null }) {
  if (!r) return null;
  return <p className={`text-xs ${r.ok ? "text-emerald-700" : "text-rose-700"}`}>{r.ok ? r.msg : r.erro}</p>;
}

export function FormNovoConcorrente() {
  const [estado, acao, pendente] = useActionState(adicionarConcorrente, null);
  return (
    <form action={acao} className="grid gap-2 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-end">
      <label className="text-xs text-suave">
        Instagram
        <input name="username" required placeholder="@perfil ou link" className={campo} />
      </label>
      <label className="text-xs text-suave">
        YouTube (opcional)
        <input name="youtube" placeholder="link do canal" className={campo} />
      </label>
      <label className="text-xs text-suave">
        TikTok (opcional)
        <input name="tiktok" placeholder="@perfil" className={campo} />
      </label>
      <button disabled={pendente} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-noturno px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        <Plus size={15} /> Adicionar
      </button>
      <div className="md:col-span-4">
        <Mensagem r={estado} />
      </div>
    </form>
  );
}

export function BotaoRemoverConcorrente({ username }: { username: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      disabled={pendente}
      onClick={() => {
        if (confirm(`Remover @${username} e todos os dados coletados dele?`)) iniciar(async () => void (await removerConcorrente(username)));
      }}
      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
      title="Remover concorrente"
    >
      <Trash2 size={15} />
    </button>
  );
}

export function BotaoRemoverPost({ username, id }: { username: string; id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      disabled={pendente}
      onClick={() => {
        if (confirm("Remover este post da base?")) iniciar(async () => void (await removerPost(username, id)));
      }}
      className="text-[11px] text-rose-600 hover:underline"
    >
      remover
    </button>
  );
}

export function FormPostManual({ username, precisaSeguidores }: { username: string; precisaSeguidores: boolean }) {
  const [estado, acao, pendente] = useActionState(adicionarPostManual, null);
  return (
    <form action={acao} className="grid gap-3 md:grid-cols-4">
      <input type="hidden" name="username" value={username} />
      <label className="text-xs text-suave md:col-span-2">
        Link do post
        <input name="link" placeholder="https://www.instagram.com/p/..." className={campo} />
      </label>
      <label className="text-xs text-suave">
        Formato
        <select name="formato" className={campo} defaultValue="video">
          <option value="video">Vídeo / Reels</option>
          <option value="carrossel">Carrossel</option>
          <option value="imagem">Imagem</option>
        </select>
      </label>
      <label className="text-xs text-suave">
        Data
        <input type="date" name="data" className={campo} />
      </label>
      <label className="text-xs text-suave">
        Curtidas
        <input name="curtidas" inputMode="numeric" required className={campo} />
      </label>
      <label className="text-xs text-suave">
        Comentários
        <input name="comentarios" inputMode="numeric" required className={campo} />
      </label>
      <label className="text-xs text-suave">
        Visualizações (se for vídeo)
        <input name="views" inputMode="numeric" className={campo} />
      </label>
      {precisaSeguidores && (
        <label className="text-xs text-suave">
          Seguidores do perfil
          <input name="seguidores" inputMode="numeric" className={campo} />
        </label>
      )}
      <label className="text-xs text-suave md:col-span-4">
        Legenda ou resumo do conteúdo
        <textarea name="legenda" rows={3} className={campo} placeholder="Cole a legenda. Se for vídeo, vale resumir o que a pessoa fala." />
      </label>
      <div className="flex items-center gap-3 md:col-span-4">
        <button disabled={pendente} className="rounded-md bg-noturno px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          Adicionar post
        </button>
        <Mensagem r={estado} />
      </div>
    </form>
  );
}

export function FormSeguidoresELinks({
  username,
  seguidores,
  youtube,
  tiktok,
}: {
  username: string;
  seguidores: number;
  youtube?: string;
  tiktok?: string;
}) {
  const [seg, setSeg] = useState(String(seguidores || ""));
  const [yt, setYt] = useState(youtube ?? "");
  const [tt, setTt] = useState(tiktok ?? "");
  const [pendente, iniciar] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1.5fr_1fr_auto] md:items-end">
      <label className="text-xs text-suave">
        Seguidores
        <input value={seg} onChange={(e) => setSeg(e.target.value)} inputMode="numeric" className={campo} />
      </label>
      <label className="text-xs text-suave">
        YouTube
        <input value={yt} onChange={(e) => setYt(e.target.value)} className={campo} placeholder="link do canal" />
      </label>
      <label className="text-xs text-suave">
        TikTok
        <input value={tt} onChange={(e) => setTt(e.target.value)} className={campo} placeholder="@perfil" />
      </label>
      <button
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const n = Number(seg.replace(/\D/g, ""));
            if (n) await salvarSeguidores(username, n);
            await salvarLinks(username, yt, tt);
            setOk(true);
            setTimeout(() => setOk(false), 2000);
          })
        }
        className="rounded-md border border-borda bg-white px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {ok ? "Salvo" : "Salvar"}
      </button>
    </div>
  );
}
