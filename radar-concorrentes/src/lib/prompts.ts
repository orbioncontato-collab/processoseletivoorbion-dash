import {
  coberturaPorPilar,
  fmtNum,
  fmtPct,
  fmtScore,
  resumirPerfil,
  todosOsPosts,
  type PostAnalisado,
} from "./metricas";
import { NOME_FORMATO, type Briefing, type Formato, type Perfil } from "./types";

/**
 * Aqui ficam os textos que vão para a IA. O mesmo texto serve para:
 * 1) chamar o Claude direto pela plataforma (se tiver chave de API), ou
 * 2) copiar e colar no claude.ai (sem custo extra, se você já assina).
 */

export const SISTEMA = `Você é estrategista de conteúdo para Instagram de um empresário brasileiro.
Seu trabalho é olhar o que deu certo nos perfis de referência e transformar isso em conteúdo próprio, original e alinhado à marca dele.

Regras de escrita:
- Português do Brasil, linguagem simples e natural, como uma pessoa conversando.
- Nada de travessão (—). Use vírgula, ponto ou dois-pontos.
- Evite estruturas de oposição do tipo "não é X, é Y" ou "não é só X, é Y".
- Nada de promessa inflada, urgência falsa ou cara de guru.
- Nunca copie o conteúdo de outra pessoa. Use o padrão (gancho, estrutura, ângulo), nunca o texto.
- Respeite o tom de voz e os mandamentos do briefing.`;

export function textoBriefing(b: Briefing): string {
  return `# BRIEFING DO MEU PERFIL (@${b.username})
Nome: ${b.nome}
Nicho: ${b.nicho}
Frase de posicionamento: "${b.posicionamento}"

Pilares de conteúdo:
${b.pilares.map((p) => `- ${p.nome}: ${p.descricao}`).join("\n")}

Público:
- Quem é: ${b.publico.quem}
- Idade: ${b.publico.idade}
- Problemas: ${b.publico.problemas}
- O que quer conquistar: ${b.publico.desejos}
- Conteúdo que gosta de ver: ${b.publico.gostaDeVer}

Mecanismo: ${b.mecanismo}
Diferencial: ${b.diferencial}
O que o nicho faz errado: ${b.erroDoNicho}
Tom de voz: ${b.tomDeVoz}
Mandamentos:
${b.mandamentos.map((m) => `- ${m}`).join("\n")}
Nunca faria: ${b.nuncaFaria}
Formatos e funções: ${b.formatos}
Observações estratégicas: ${b.observacoes}`;
}

function linhaPost(p: PostAnalisado, tamanhoLegenda = 500): string {
  const legenda = p.legenda.replace(/\s+/g, " ").trim();
  const corte = legenda.length > tamanhoLegenda ? legenda.slice(0, tamanhoLegenda) + "…" : legenda;
  const alcance = p.alcance ? ` | alcance${p.alcanceEstimado ? " estimado" : ""} ${fmtNum(p.alcance)}` : "";
  return `[${p.id}] @${p.username} | ${NOME_FORMATO[p.formato]}${p.slides ? ` (${p.slides} lâminas)` : ""} | nota ${fmtScore(p.score)} da média do perfil | ${fmtNum(p.curtidas)} curtidas, ${fmtNum(p.comentarios)} comentários | engajamento ${fmtPct(p.taxa)}${alcance}
Legenda: "${corte}"${p.analise ? `\nAnálise já feita: ${p.analise.slice(0, 400)}` : ""}`;
}

export function textoConcorrentes(perfis: Perfil[]): string {
  return perfis
    .map((perfil) => {
      const r = resumirPerfil(perfil);
      const formatos = r.formatos
        .filter((f) => f.qtd > 0)
        .map((f) => `${NOME_FORMATO[f.formato]}: ${f.qtd} posts, nota média ${fmtScore(f.mediaScore)}, engajamento ${fmtPct(f.mediaTaxa)}`)
        .join(" | ");
      return `@${perfil.username} (${perfil.nome || "sem nome"}): ${fmtNum(perfil.seguidores)} seguidores, engajamento médio ${fmtPct(r.taxaEngajamento)}, ${r.postsPorSemana.toFixed(1)} posts/semana.
Bio: ${perfil.bio.replace(/\s+/g, " ")}
Formatos: ${formatos}`;
    })
    .join("\n\n");
}

export function topPosts(perfis: Perfil[], qtd = 15, formato?: Formato): PostAnalisado[] {
  return todosOsPosts(perfis)
    .filter((p) => !formato || p.formato === formato)
    .sort((a, b) => b.score - a.score)
    .slice(0, qtd);
}

/* ------------------------------ Ideias ------------------------------ */

export function promptIdeias(b: Briefing, perfis: Perfil[]): string {
  const posts = todosOsPosts(perfis);
  const melhores = [...posts].sort((a, b) => b.score - a.score).slice(0, 20);
  const piores = [...posts].sort((a, b) => a.score - b.score).slice(0, 8);
  const cobertura = coberturaPorPilar(posts, b.pilares.map((p) => p.nome))
    .map((c) => `- ${c.pilar}: ${c.qtd} posts dos concorrentes (${c.perfis} perfis), nota média ${c.qtd ? fmtScore(c.score) : "sem dados"}`)
    .join("\n");

  return `${textoBriefing(b)}

# PERFIS DE REFERÊNCIA
${textoConcorrentes(perfis)}

# POSTS QUE MAIS PERFORMARAM (nota = quantas vezes acima da média do próprio perfil)
${melhores.map((p) => linhaPost(p)).join("\n\n")}

# POSTS QUE MENOS PERFORMARAM
${piores.map((p) => linhaPost(p, 200)).join("\n\n")}

# COBERTURA DOS MEUS PILARES NOS CONCORRENTES (por palavra-chave, é uma aproximação)
${cobertura}

# O QUE EU PRECISO
Analise os dados acima e me entregue, nesta ordem:

## 1. O que está funcionando
Os 3 a 5 padrões que explicam os posts que bombaram. Para cada padrão: o que é, quais posts provam (cite os ids entre colchetes) e por que funciona com o público.

## 2. Formato vencedor
Qual formato está entregando mais (carrossel, vídeo ou imagem) e em que tipo de assunto. Seja específico.

## 3. O que ninguém está falando
De 3 a 5 assuntos ou ângulos que o meu público quer e que os concorrentes não cobrem (ou cobrem mal). Explique por que é oportunidade para mim, usando meu diferencial.

## 4. 10 ideias de conteúdo para mim
Para cada ideia:
- Título da ideia
- Pilar
- Formato sugerido (Reel curto, Reel falado ou Carrossel) e por quê
- Gancho (a primeira frase ou a capa)
- Em qual post de referência ela se inspira (id) e qual padrão foi modelado
- Isca/CTA na altitude do dono

Lembre: todo gancho passa no teste do dono.`;
}

/* ------------------------------ Roteiro ----------------------------- */

export function promptRoteiro(
  b: Briefing,
  referencias: PostAnalisado[],
  opcoes: { tema?: string; formato: Formato | "auto"; guiaDeVoz?: string },
): string {
  const formatoTxt =
    opcoes.formato === "auto"
      ? "Escolha o melhor formato para essa ideia (Reel curto 6 a 15s, Reel falado 40 a 90s ou Carrossel) e explique em uma linha o motivo, olhando o que performou nas referências."
      : opcoes.formato === "carrossel"
        ? "Formato: Carrossel."
        : opcoes.formato === "video"
          ? "Formato: Reel. Decida se é curto (6 a 15s) ou falado (40 a 90s) e explique em uma linha."
          : "Formato: post de imagem única.";

  return `${textoBriefing(b)}
${opcoes.guiaDeVoz ? `\n# MEU GUIA DE VOZ\n${opcoes.guiaDeVoz}\n` : ""}
# POSTS DE REFERÊNCIA (o que performou nos concorrentes)
${referencias.map((p) => linhaPost(p, 900)).join("\n\n")}

# O QUE EU PRECISO
Crie 1 roteiro pronto para eu gravar ou montar, modelando o que fez as referências performarem e adaptando para a minha marca.
${opcoes.tema ? `Tema que eu quero abordar: ${opcoes.tema}` : "Tema: escolha o melhor tema a partir das referências e do meu briefing."}
${formatoTxt}

Entregue assim:

## Ideia
Uma frase com a ideia e de onde ela veio (qual referência, qual padrão foi modelado).

## Formato
Formato escolhido e o motivo.

## Gancho
3 opções de gancho (primeira frase ou capa). Marque a recomendada.

## Roteiro
${
  opcoes.formato === "carrossel"
    ? "Lâmina por lâmina: título da lâmina e o texto que vai nela. Entre 6 e 10 lâminas. Última lâmina com CTA."
    : "Fala por fala, como eu falaria na câmera, com indicação de cena entre colchetes quando ajudar. Inclua a duração estimada."
}

## Legenda
Legenda pronta para o post, com CTA na altitude do dono.

## Por que deve funcionar
2 ou 3 frases ligando o roteiro aos dados das referências.`;
}

/* --------------------------- Análise de post ------------------------ */

export function promptAnalisePost(b: Briefing, post: PostAnalisado, perfil: Perfil): string {
  const r = resumirPerfil(perfil);
  return `Perfil analisado: @${perfil.username}, ${fmtNum(perfil.seguidores)} seguidores, engajamento médio ${fmtPct(r.taxaEngajamento)}.

Post:
${linhaPost(post, 3000)}

${post.thumb ? "A imagem anexada é a capa do post." : ""}

Explique de forma direta, em até 8 linhas:
1. Por que esse post performou (ou não) em relação à média do perfil: gancho, assunto, formato, emoção, utilidade.
2. Qual padrão dá para modelar.
3. Como eu, @${b.username}, adaptaria isso para o meu público (${b.publico.quem.split(".")[0]}).`;
}

/* ---------------------------- Guia de voz --------------------------- */

export function promptGuiaDeVoz(b: Briefing, meuPerfil: Perfil): string {
  const meus = [...meuPerfil.posts].sort((a, c) => c.curtidas - a.curtidas).slice(0, 12);
  return `${textoBriefing(b)}

# MINHAS LEGENDAS RECENTES
${meus.length ? meus.map((p) => `- (${NOME_FORMATO[p.formato]}) ${p.legenda.replace(/\s+/g, " ").slice(0, 600)}`).join("\n") : "(ainda não coletadas)"}

# O QUE EU PRECISO
Monte o meu guia de voz, para usar em todos os roteiros. Curto e prático:
- Como eu falo (ritmo, tamanho de frase, vocabulário)
- Palavras e expressões que combinam comigo
- Palavras e expressões que eu evito
- Como eu abro um vídeo
- Como eu fecho um vídeo (CTA)
- 3 exemplos de frases no meu jeito de falar`;
}
