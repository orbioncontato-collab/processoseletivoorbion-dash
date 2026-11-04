import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { PASTA_MEDIA } from "./db";
import type { Formato, Perfil, Post } from "./types";

/**
 * Coleta pública do Instagram, sem API paga.
 *
 * Usa o mesmo endereço que o próprio site do Instagram chama quando você
 * abre um perfil no navegador. Ele devolve seguidores e os 12 posts mais
 * recentes com curtidas, comentários, visualizações e legenda.
 *
 * Limites que vale saber:
 * - Vem 12 posts por coleta. A plataforma guarda o histórico, então a cada
 *   semana a base fica maior.
 * - O Instagram pode bloquear se fizer muitas coletas seguidas. Por isso
 *   coletamos um perfil por vez, com pausa entre eles.
 * - Se bloquear, dá para colocar o cookie "sessionid" da sua conta no
 *   arquivo .env.local (INSTAGRAM_SESSIONID). Isso costuma resolver.
 */

const APP_ID = "936619743392459";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

interface IgNode {
  __typename?: string;
  shortcode: string;
  display_url?: string;
  thumbnail_src?: string;
  is_video?: boolean;
  product_type?: string;
  video_view_count?: number;
  video_play_count?: number;
  taken_at_timestamp: number;
  edge_liked_by?: { count: number };
  edge_media_preview_like?: { count: number };
  edge_media_to_comment?: { count: number };
  edge_media_to_caption?: { edges: { node: { text: string } }[] };
  edge_sidecar_to_children?: { edges: unknown[] };
  pinned_for_users?: unknown[];
}

interface IgUser {
  full_name: string;
  biography: string;
  profile_pic_url_hd?: string;
  profile_pic_url?: string;
  edge_followed_by: { count: number };
  edge_follow: { count: number };
  edge_owner_to_timeline_media: { count: number; edges: { node: IgNode }[] };
}

export class ErroColeta extends Error {}

function cabecalhos(): HeadersInit {
  const h: Record<string, string> = {
    "x-ig-app-id": APP_ID,
    "User-Agent": UA,
    Accept: "*/*",
    "Accept-Language": "pt-BR,pt;q=0.9",
    Referer: "https://www.instagram.com/",
  };
  if (process.env.INSTAGRAM_SESSIONID) h.Cookie = `sessionid=${process.env.INSTAGRAM_SESSIONID}`;
  return h;
}

async function buscarUsuario(username: string): Promise<IgUser> {
  const url = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: cabecalhos(), cache: "no-store" });
  } catch {
    throw new ErroColeta("Sem conexão com o Instagram. Confira sua internet.");
  }
  if (res.status === 404) throw new ErroColeta(`O perfil @${username} não existe ou mudou de nome.`);
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    throw new ErroColeta(
      "O Instagram pediu para esperar (limite de acessos). Tente de novo em alguns minutos ou configure o INSTAGRAM_SESSIONID.",
    );
  }
  if (!res.ok) throw new ErroColeta(`O Instagram respondeu com erro ${res.status}.`);

  const txt = await res.text();
  let json: { data?: { user?: IgUser | null } };
  try {
    json = JSON.parse(txt);
  } catch {
    throw new ErroColeta("O Instagram devolveu uma página de login. Configure o INSTAGRAM_SESSIONID e tente de novo.");
  }
  const user = json.data?.user;
  if (!user) throw new ErroColeta(`Não consegui ler o perfil @${username}. Ele pode ser privado.`);
  return user;
}

function formatoDe(n: IgNode): Formato {
  if (n.__typename === "GraphSidecar" || n.edge_sidecar_to_children) return "carrossel";
  if (n.is_video || n.__typename === "GraphVideo") return "video";
  return "imagem";
}

async function baixar(url: string | undefined, nome: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    await fs.mkdir(PASTA_MEDIA, { recursive: true });
    const destino = path.join(PASTA_MEDIA, nome);
    try {
      await fs.access(destino);
      return nome; // já baixado antes
    } catch {}
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return undefined;
    await fs.writeFile(destino, Buffer.from(await res.arrayBuffer()));
    return nome;
  } catch {
    return undefined;
  }
}

const naoNegativo = (n: number | undefined) => (n && n > 0 ? n : 0);

/** Coleta o perfil e junta com o que já existia (mantém histórico e posts antigos). */
export async function coletarPerfil(atual: Perfil): Promise<Perfil> {
  const user = await buscarUsuario(atual.username);
  const agora = new Date().toISOString();

  const novos: Post[] = await Promise.all(
    user.edge_owner_to_timeline_media.edges.map(async ({ node: n }) => {
      const formato = formatoDe(n);
      const legenda = n.edge_media_to_caption?.edges[0]?.node.text ?? "";
      const anterior = atual.posts.find((p) => p.id === n.shortcode);
      return {
        id: n.shortcode,
        url: `https://www.instagram.com/p/${n.shortcode}/`,
        formato,
        legenda,
        curtidas: naoNegativo(n.edge_liked_by?.count ?? n.edge_media_preview_like?.count),
        comentarios: naoNegativo(n.edge_media_to_comment?.count),
        views: formato === "video" ? naoNegativo(n.video_view_count ?? n.video_play_count) || null : null,
        data: new Date(n.taken_at_timestamp * 1000).toISOString(),
        thumb: await baixar(n.thumbnail_src ?? n.display_url, `${n.shortcode}.jpg`),
        slides: n.edge_sidecar_to_children?.edges.length,
        fixado: Boolean(n.pinned_for_users?.length),
        origem: "auto" as const,
        analise: anterior?.analise,
      };
    }),
  );

  const idsNovos = new Set(novos.map((p) => p.id));
  const antigos = atual.posts.filter((p) => !idsNovos.has(p.id));
  const posts = [...novos, ...antigos].sort((a, b) => b.data.localeCompare(a.data));

  const seguidores = user.edge_followed_by.count;
  const hoje = agora.slice(0, 10);
  const historico = atual.historico.filter((h) => h.data !== hoje);
  historico.push({ data: hoje, seguidores });

  return {
    ...atual,
    nome: user.full_name,
    bio: user.biography,
    seguidores,
    seguindo: user.edge_follow.count,
    totalPosts: user.edge_owner_to_timeline_media.count,
    foto: (await baixar(user.profile_pic_url_hd ?? user.profile_pic_url, `perfil-${atual.username}.jpg`)) ?? atual.foto,
    posts,
    historico,
    atualizadoEm: agora,
    erroColeta: undefined,
  };
}

/** Aceita "@fulano", "fulano" ou o link do perfil e devolve só "fulano". */
export function limparUsername(entrada: string): string {
  let u = entrada.trim();
  const m = u.match(/instagram\.com\/([^/?#]+)/i);
  if (m) u = m[1];
  return u.replace(/^@/, "").toLowerCase();
}

/** Extrai o shortcode de um link de post ou reel. */
export function shortcodeDoLink(link: string): string | null {
  const m = link.match(/instagram\.com\/(?:[^/]+\/)?(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/i);
  return m ? m[1] : null;
}
