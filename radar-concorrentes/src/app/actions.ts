"use server";

import { promises as fs } from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { alterarDB, concorrentesReais, lerDB, PASTA_MEDIA } from "@/lib/db";
import { gerarTexto, iaConfigurada, type ImagemAnexo } from "@/lib/ia";
import { coletarPerfil, ErroColeta, limparUsername, shortcodeDoLink } from "@/lib/instagram";
import { analisarPosts } from "@/lib/metricas";
import { promptAnalisePost, promptGuiaDeVoz, promptIdeias, promptRoteiro, topPosts } from "@/lib/prompts";
import { perfilVazio } from "@/lib/seed";
import type { Briefing, DB, Formato, Geracao, Perfil, StatusAnuncio } from "@/lib/types";

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };

const atualizarTudo = () => revalidatePath("/", "layout");
const novoId = () => Math.random().toString(36).slice(2, 10);

function acharPerfil(db: DB, username: string): Perfil | undefined {
  if (db.meuPerfil.username === username) return db.meuPerfil;
  return db.concorrentes.find((c) => c.username === username);
}

/* ---------------------------- Concorrentes ---------------------------- */

export async function adicionarConcorrente(_: unknown, form: FormData): Promise<Resultado> {
  const username = limparUsername(String(form.get("username") ?? ""));
  if (!username || !/^[a-z0-9._]+$/.test(username)) return { ok: false, erro: "Digite um @ válido." };
  const youtube = String(form.get("youtube") ?? "").trim() || undefined;
  const tiktok = String(form.get("tiktok") ?? "").trim() || undefined;

  const res = await alterarDB<Resultado>((db) => {
    if (db.concorrentes.some((c) => c.username === username)) return { ok: false, erro: `@${username} já está na lista.` };
    db.concorrentes.push({ ...perfilVazio(username), youtube, tiktok });
    return { ok: true, msg: `@${username} adicionado. Clique em atualizar para coletar os dados.` };
  });
  atualizarTudo();
  return res;
}

export async function removerConcorrente(username: string): Promise<Resultado> {
  await alterarDB((db) => {
    db.concorrentes = db.concorrentes.filter((c) => c.username !== username);
  });
  atualizarTudo();
  return { ok: true };
}

export async function salvarLinks(username: string, youtube: string, tiktok: string): Promise<Resultado> {
  await alterarDB((db) => {
    const p = acharPerfil(db, username);
    if (p) {
      p.youtube = youtube.trim() || undefined;
      p.tiktok = tiktok.trim() || undefined;
    }
  });
  atualizarTudo();
  return { ok: true };
}

/* ------------------------------- Coleta ------------------------------- */

export async function atualizarPerfil(username: string): Promise<Resultado> {
  const db = await lerDB();
  const atual = acharPerfil(db, username);
  if (!atual) return { ok: false, erro: "Perfil não encontrado." };

  try {
    const novo = await coletarPerfil(atual);
    await alterarDB((d) => {
      if (d.meuPerfil.username === username) d.meuPerfil = { ...novo, anuncios: d.meuPerfil.anuncios };
      else d.concorrentes = d.concorrentes.map((c) => (c.username === username ? { ...novo, anuncios: c.anuncios, youtube: c.youtube, tiktok: c.tiktok } : c));
    });
    atualizarTudo();
    return { ok: true, msg: `@${username} atualizado: ${novo.posts.length} posts na base.` };
  } catch (e) {
    const erro = e instanceof ErroColeta ? e.message : `Falha inesperada: ${(e as Error).message}`;
    await alterarDB((d) => {
      const p = acharPerfil(d, username);
      if (p) p.erroColeta = erro;
    });
    atualizarTudo();
    return { ok: false, erro };
  }
}

/** Atualiza todo mundo, um por vez, com pausa para o Instagram não bloquear. */
export async function atualizarTodos(): Promise<Resultado> {
  const db = await lerDB();
  const nomes = [db.meuPerfil.username, ...db.concorrentes.map((c) => c.username)];
  const falhas: string[] = [];
  for (let i = 0; i < nomes.length; i++) {
    const r = await atualizarPerfil(nomes[i]);
    if (!r.ok) {
      falhas.push(`@${nomes[i]}: ${r.erro}`);
      if (r.erro.includes("limite")) break; // se bloqueou, não adianta continuar agora
    }
    if (i < nomes.length - 1) await new Promise((ok) => setTimeout(ok, 2500 + Math.random() * 2000));
  }
  return falhas.length
    ? { ok: false, erro: `Alguns perfis falharam:\n${falhas.join("\n")}` }
    : { ok: true, msg: `${nomes.length} perfis atualizados.` };
}

/* --------------------------- Post manual ------------------------------ */

export async function adicionarPostManual(_: unknown, form: FormData): Promise<Resultado> {
  const username = String(form.get("username"));
  const link = String(form.get("link") ?? "").trim();
  const formato = String(form.get("formato")) as Formato;
  const num = (k: string) => Math.max(0, Number(String(form.get(k) ?? "").replace(/\D/g, "")) || 0);
  const views = num("views");
  const data = String(form.get("data") || new Date().toISOString().slice(0, 10));

  const res = await alterarDB<Resultado>((db) => {
    const p = acharPerfil(db, username);
    if (!p) return { ok: false, erro: "Perfil não encontrado." };
    const id = shortcodeDoLink(link) ?? `manual-${novoId()}`;
    p.posts = p.posts.filter((x) => x.id !== id);
    p.posts.unshift({
      id,
      url: link || "#",
      formato,
      legenda: String(form.get("legenda") ?? ""),
      curtidas: num("curtidas"),
      comentarios: num("comentarios"),
      views: formato === "video" && views ? views : null,
      data: new Date(data + "T12:00:00").toISOString(),
      origem: "manual",
    });
    p.posts.sort((a, b) => b.data.localeCompare(a.data));
    if (!p.seguidores) p.seguidores = num("seguidores");
    return { ok: true, msg: "Post adicionado." };
  });
  atualizarTudo();
  return res;
}

export async function removerPost(username: string, id: string): Promise<Resultado> {
  await alterarDB((db) => {
    const p = acharPerfil(db, username);
    if (p) p.posts = p.posts.filter((x) => x.id !== id);
  });
  atualizarTudo();
  return { ok: true };
}

export async function salvarSeguidores(username: string, seguidores: number): Promise<Resultado> {
  await alterarDB((db) => {
    const p = acharPerfil(db, username);
    if (p) p.seguidores = Math.max(0, Math.round(seguidores));
  });
  atualizarTudo();
  return { ok: true };
}

/* ------------------------------ Anúncios ------------------------------ */

export async function salvarAnuncio(username: string, situacao: StatusAnuncio["situacao"], observacao: string): Promise<Resultado> {
  await alterarDB((db) => {
    const p = acharPerfil(db, username);
    if (p) p.anuncios = { situacao, observacao, verificadoEm: new Date().toISOString() };
  });
  atualizarTudo();
  return { ok: true };
}

/* ------------------------- Briefing e config -------------------------- */

export async function salvarBriefing(b: Briefing): Promise<Resultado> {
  const username = limparUsername(b.username);
  await alterarDB((db) => {
    db.briefing = { ...b, username };
    if (db.meuPerfil.username !== username) db.meuPerfil = perfilVazio(username);
  });
  atualizarTudo();
  return { ok: true, msg: "Briefing salvo." };
}

export async function salvarConfig(mostrarExemplos: boolean): Promise<Resultado> {
  await alterarDB((db) => {
    db.config.mostrarExemplos = mostrarExemplos;
  });
  atualizarTudo();
  return { ok: true };
}

export async function importarBackup(json: string): Promise<Resultado> {
  try {
    const dados = JSON.parse(json) as DB;
    if (dados.versao !== 1 || !dados.briefing || !Array.isArray(dados.concorrentes)) throw new Error();
    await alterarDB((db) => Object.assign(db, dados));
    atualizarTudo();
    return { ok: true, msg: "Backup importado." };
  } catch {
    return { ok: false, erro: "Arquivo inválido." };
  }
}

/* ------------------------------- IA ----------------------------------- */

export type PedidoGeracao =
  | { tipo: "ideias" }
  | { tipo: "guia-de-voz" }
  | { tipo: "roteiro"; tema?: string; formato: Formato | "auto"; referencias: string[] }
  | { tipo: "analise-post"; username: string; postId: string };

interface Preparado {
  prompt: string;
  titulo: string;
  referencias: string[];
  esforco: "low" | "medium" | "high";
  imagens?: ImagemAnexo[];
  formato?: Formato | "auto";
}

async function preparar(db: DB, pedido: PedidoGeracao): Promise<Preparado> {
  const reais = concorrentesReais(db);
  const b = db.briefing;

  switch (pedido.tipo) {
    case "ideias": {
      if (!reais.length) throw new Error("Colete os dados dos concorrentes primeiro (botão Atualizar em Concorrentes).");
      return { prompt: promptIdeias(b, reais), titulo: `Ideias e oportunidades (${new Date().toLocaleDateString("pt-BR")})`, referencias: [], esforco: "high" };
    }
    case "guia-de-voz":
      return { prompt: promptGuiaDeVoz(b, db.meuPerfil), titulo: "Guia de voz", referencias: [], esforco: "medium" };
    case "roteiro": {
      if (!reais.length) throw new Error("Colete os dados dos concorrentes primeiro.");
      const todos = reais.flatMap(analisarPosts);
      let refs = todos.filter((p) => pedido.referencias.includes(p.id));
      if (!refs.length) refs = topPosts(reais, 8, pedido.formato === "auto" ? undefined : pedido.formato);
      const guia = db.geracoes.find((g) => g.tipo === "guia-de-voz")?.conteudo;
      return {
        prompt: promptRoteiro(b, refs, { tema: pedido.tema, formato: pedido.formato, guiaDeVoz: guia }),
        titulo: pedido.tema?.trim() || `Roteiro a partir de ${refs.length} referências`,
        referencias: refs.map((r) => r.id),
        esforco: "high",
        formato: pedido.formato,
      };
    }
    case "analise-post": {
      const perfil = db.concorrentes.find((c) => c.username === pedido.username) ?? (db.meuPerfil.username === pedido.username ? db.meuPerfil : undefined);
      const post = perfil && analisarPosts(perfil).find((p) => p.id === pedido.postId);
      if (!perfil || !post) throw new Error("Post não encontrado.");
      let imagens: ImagemAnexo[] | undefined;
      if (post.thumb) {
        try {
          const buf = await fs.readFile(path.join(PASTA_MEDIA, path.basename(post.thumb)));
          imagens = [{ base64: buf.toString("base64"), mediaType: "image/jpeg" }];
        } catch {}
      }
      return { prompt: promptAnalisePost(b, post, perfil), titulo: `Análise do post ${post.id}`, referencias: [post.id], esforco: "low", imagens };
    }
  }
}

export async function verPrompt(pedido: PedidoGeracao): Promise<{ ok: true; prompt: string; iaDisponivel: boolean } | { ok: false; erro: string }> {
  try {
    const db = await lerDB();
    const p = await preparar(db, pedido);
    return { ok: true, prompt: p.prompt, iaDisponivel: iaConfigurada() };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

async function salvarGeracao(pedido: PedidoGeracao, p: Preparado, conteudo: string, origem: Geracao["origem"]): Promise<Geracao> {
  const g: Geracao = {
    id: novoId(),
    tipo: pedido.tipo,
    titulo: p.titulo,
    criadoEm: new Date().toISOString(),
    conteudo,
    referencias: p.referencias,
    formato: p.formato,
    origem,
  };
  await alterarDB((db) => {
    if (pedido.tipo === "analise-post") {
      const perfil = acharPerfil(db, pedido.username);
      const post = perfil?.posts.find((x) => x.id === pedido.postId);
      if (post) post.analise = conteudo;
      return;
    }
    if (pedido.tipo === "guia-de-voz") db.geracoes = db.geracoes.filter((x) => x.tipo !== "guia-de-voz");
    db.geracoes.unshift(g);
  });
  atualizarTudo();
  return g;
}

export async function gerarComIA(pedido: PedidoGeracao): Promise<Resultado> {
  if (!iaConfigurada()) return { ok: false, erro: "Sem chave da API. Use o botão de copiar o prompt e cole a resposta aqui." };
  try {
    const db = await lerDB();
    const p = await preparar(db, pedido);
    const texto = await gerarTexto(p.prompt, { esforco: p.esforco, imagens: p.imagens });
    await salvarGeracao(pedido, p, texto, "ia");
    return { ok: true, msg: "Pronto." };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function salvarRespostaColada(pedido: PedidoGeracao, conteudo: string): Promise<Resultado> {
  if (!conteudo.trim()) return { ok: false, erro: "Cole a resposta antes de salvar." };
  try {
    const db = await lerDB();
    const p = await preparar(db, pedido);
    await salvarGeracao(pedido, p, conteudo.trim(), "colado");
    return { ok: true, msg: "Salvo." };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

export async function removerGeracao(id: string): Promise<Resultado> {
  await alterarDB((db) => {
    db.geracoes = db.geracoes.filter((g) => g.id !== id);
  });
  atualizarTudo();
  return { ok: true };
}

export async function editarGeracao(id: string, conteudo: string): Promise<Resultado> {
  await alterarDB((db) => {
    const g = db.geracoes.find((x) => x.id === id);
    if (g) g.conteudo = conteudo;
  });
  atualizarTudo();
  return { ok: true, msg: "Salvo." };
}
