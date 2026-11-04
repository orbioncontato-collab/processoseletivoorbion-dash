import type { Briefing, DB, Formato, Perfil, Post } from "./types";

/** Briefing inicial, montado a partir do Guia de Marca Pessoal do Marcelo (ago/2026). */
export const BRIEFING_INICIAL: Briefing = {
  nome: "Marcelo Alves",
  username: "alvesmarcelobr",
  nicho:
    "Autoridade em gestão empresarial com foco em estruturação comercial. O gestor com know-how forte de vendas que organiza a operação comercial das empresas por dentro, traz visão e guia a empresa para crescer com objetivo comercial. Reação que o perfil precisa provocar no empresário: \"eu preciso ter esse domínio empresarial na parte comercial também\".",
  posicionamento: "Eu não ensino a vender. Eu construo a estrutura que vende.",
  pilares: [
    { nome: "Bastidores da Orbion", descricao: "Como gerencio a minha própria empresa por dentro: reuniões, decisões, quadro branco." },
    { nome: "Estruturação comercial", descricao: "O método: os 5 pilares, diagnósticos, o Raio-X." },
    { nome: "Gestão e processos", descricao: "Rotinas, rituais, indicadores, CRM, metas." },
    { nome: "Visão de dono", descricao: "Opinião forte sobre erros que empresário comete." },
    { nome: "Casos reais", descricao: "Histórias de empresas que estruturei." },
    { nome: "Liderança e time comercial", descricao: "Como contratar, treinar e cobrar." },
    { nome: "Princípios e vida", descricao: "Fé, família, disciplina, a empresa cristã. Mostrado no bastidor, nunca pregado como sermão." },
  ],
  publico: {
    quem: "Empresário dono de PME que precisa montar estrutura comercial ou otimizar a que tem para vender mais. Ainda opera muito dentro do negócio e em muitos casos ele é o comercial da empresa.",
    idade: "30 a 50 anos",
    problemas:
      "A venda depende dele; contratou vendedor e não deu resultado; faturamento montanha-russa; lead de tráfego morrendo sem atendimento; não conhece os próprios números; time sem processo e sem cobrança com critério.",
    desejos:
      "Empresa que vende sem depender dele, previsibilidade de faturamento, time confiável, liberdade para pensar no negócio e tempo para a família.",
    gostaDeVer:
      "Bastidor real de gestão, opinião de dono para dono, casos reais, número aberto, visão estratégica, conteúdo de muito valor prático. Se identifica com quem compartilha seus princípios (fé, família, seriedade).",
  },
  mecanismo:
    "Estruturação por dentro: diagnóstico da operação (Raio-X) + os 5 pilares (aquisição, qualificação, fechamento, pós-venda e gestão) implantados com processo, ritual e indicador, na ordem certa do dinheiro.",
  diferencial:
    "Construí primeiro na minha empresa um comercial que bate meta sem mim, repeti em +320 empresas, e implanto dentro da operação do cliente, com visão de gestor e veia comercial juntas.",
  erroDoNicho:
    "Trata o sintoma em vez da causa: treina vendedor, entrega script, dá palestra motivacional e vai embora. Ninguém constrói a estrutura por trás. Consultoria que entrega PDF e não implanta é o padrão do mercado.",
  tomDeVoz:
    "Séria + Professor + Opinião + Storytelling. O mentor próximo: didática de quem domina, opinião firme de dono, histórias reais. Sem humor forçado, sem motivacional vazio.",
  mandamentos: [
    "Nunca parecer guru: nada de promessa inflada, ostentação ou urgência falsa. Se soa charlatão, não posta.",
    "Todo gancho passa no teste do dono: quem executa isso, o dono ou o funcionário dele? Se for o funcionário, refaz.",
    "Princípio se mostra, não se prega: fé, família e honestidade aparecem vividas no bastidor.",
    "Só ensino o que eu já fiz.",
  ],
  nuncaFaria:
    "Qualquer conteúdo que aproxime da imagem de guru de internet, charlatão ou desonesto.",
  formatos:
    "Reel curto 6 a 15s (gancho + isca, atrair seguidor novo). Reel falado 40 a 90s na câmera (experiência, visão, opinião de dono: conexão e autoridade). Carrossel 1x por semana (método, frameworks, testes: salvamento e compartilhamento). Stories diários (bastidores, fé, família, rotina).",
  observacoes:
    "Mudança de altitude: falar de empresa que vende (altitude do dono) e evitar falar só de venda (altitude do vendedor). A isca define quem chega: isca de ativo de gestão (planilha de indicadores, mapa de estrutura, Raio-X) atrai dono. Referência de arquétipo: o dono que mostra como um gestor pensa.",
};

export const CONCORRENTES_INICIAIS = [
  "luanamariamarina",
  "suellen.souzas",
  "rodvincenzi",
  "daniel.abrucezzi",
  "carol.iasmim",
  "a.neliza",
];

export function perfilVazio(username: string): Perfil {
  return {
    username,
    nome: "",
    bio: "",
    seguidores: 0,
    seguindo: 0,
    totalPosts: 0,
    posts: [],
    historico: [],
    anuncios: { situacao: "nao-verificado", observacao: "" },
  };
}

export function dbInicial(): DB {
  return {
    versao: 1,
    briefing: BRIEFING_INICIAL,
    meuPerfil: perfilVazio(BRIEFING_INICIAL.username),
    concorrentes: CONCORRENTES_INICIAIS.map(perfilVazio),
    geracoes: [],
    config: { mostrarExemplos: true },
  };
}

/* ------------------------------------------------------------------ */
/* Perfis de exemplo (fictícios). Servem só para ver as telas cheias   */
/* antes da primeira coleta real. Nunca entram nos prompts da IA.      */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const LEGENDAS_EXEMPLO: { texto: string; formato: Formato }[] = [
  { texto: "3 sinais de que a venda da sua empresa ainda depende de você", formato: "carrossel" },
  { texto: "Contratei 4 vendedores e nenhum bateu meta. O problema era eu.", formato: "video" },
  { texto: "O ritual de segunda-feira que mudou o comercial da empresa", formato: "video" },
  { texto: "Planilha de indicadores que todo dono deveria olhar toda semana", formato: "carrossel" },
  { texto: "Bastidor: reunião de resultado com o time", formato: "imagem" },
  { texto: "Por que seu lead de tráfego está morrendo sem atendimento", formato: "video" },
  { texto: "5 erros de empresário na hora de contratar vendedor", formato: "carrossel" },
  { texto: "Faturamento montanha-russa tem causa. Te mostro qual.", formato: "video" },
  { texto: "Frase do dia sobre disciplina", formato: "imagem" },
  { texto: "Como montar um CRM simples em 1 tarde", formato: "carrossel" },
  { texto: "O que eu faria se tivesse que recomeçar o comercial do zero", formato: "video" },
  { texto: "Meta sem processo é desejo", formato: "imagem" },
];

function perfilExemplo(username: string, nome: string, seguidores: number, seed: number): Perfil {
  const r = rng(seed);
  const hoje = Date.now();
  const posts: Post[] = LEGENDAS_EXEMPLO.map((l, i) => {
    const base = seguidores * (0.01 + r() * 0.03);
    const mult = l.formato === "carrossel" ? 1.4 : l.formato === "video" ? 1.1 : 0.5;
    const pico = r() > 0.85 ? 3 + r() * 3 : 1;
    const curtidas = Math.round(base * mult * pico);
    const comentarios = Math.round(curtidas * (0.02 + r() * 0.05));
    return {
      id: `${username}-${i}`,
      url: "#",
      formato: l.formato,
      legenda: l.texto,
      curtidas,
      comentarios,
      views: l.formato === "video" ? Math.round(curtidas * (12 + r() * 25)) : null,
      data: new Date(hoje - (i * 2 + Math.floor(r() * 2)) * 86400000 - Math.floor(r() * 12) * 3600000).toISOString(),
      slides: l.formato === "carrossel" ? 6 + Math.floor(r() * 5) : undefined,
      origem: "manual",
    };
  });
  return {
    username,
    nome,
    bio: "Perfil fictício para demonstração",
    seguidores,
    seguindo: 500,
    totalPosts: 300,
    posts,
    historico: [],
    anuncios: { situacao: "nao-verificado", observacao: "" },
    atualizadoEm: new Date(hoje).toISOString(),
    exemplo: true,
  };
}

export const PERFIS_EXEMPLO: Perfil[] = [
  perfilExemplo("exemplo.gestor", "Gestor Exemplo", 184000, 7),
  perfilExemplo("exemplo.comercial", "Comercial Exemplo", 52000, 21),
];
