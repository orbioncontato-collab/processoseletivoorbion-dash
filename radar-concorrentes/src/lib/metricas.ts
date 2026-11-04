import { FORMATOS, type Formato, type Perfil, type Post } from "./types";

/**
 * Como as métricas funcionam (resumo):
 *
 * - Interações = curtidas + comentários (é o que fica público no Instagram).
 * - Taxa de engajamento = interações ÷ seguidores. Assim dá para comparar
 *   um perfil de 500 mil com um de 20 mil.
 * - Nota do post (score) = interações do post ÷ mediana de interações do
 *   próprio perfil. Nota 3x quer dizer que o post foi 3 vezes melhor que o
 *   normal daquela pessoa. É a métrica principal para achar "o que funcionou".
 * - Alcance: em vídeo usamos as visualizações (dado real). Em carrossel e
 *   imagem estimamos: pegamos quantas interações cada visualização gera nos
 *   vídeos do próprio perfil e aplicamos ao post. É uma estimativa, sempre
 *   marcada como tal.
 */

export const interacoes = (p: Post) => p.curtidas + p.comentarios;

export function mediana(valores: number[]): number {
  if (!valores.length) return 0;
  const v = [...valores].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export const media = (valores: number[]) =>
  valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0;

export interface PostAnalisado extends Post {
  username: string;
  seguidoresPerfil: number;
  interacoes: number;
  taxa: number; // interações / seguidores
  score: number; // interações / mediana do perfil
  alcance: number | null;
  alcanceEstimado: boolean;
  furouBolha: boolean; // alcance maior que o número de seguidores
  exemplo?: boolean;
}

/** Quantas interações cada visualização gera nos vídeos do perfil. */
function taxaInteracaoPorView(perfil: Perfil): number | null {
  const ratios = perfil.posts
    .filter((p) => p.formato === "video" && p.views && p.views > 0)
    .map((p) => interacoes(p) / (p.views as number));
  if (ratios.length < 2) return null;
  return mediana(ratios);
}

export function analisarPosts(perfil: Perfil): PostAnalisado[] {
  const med = mediana(perfil.posts.map(interacoes)) || 1;
  const porView = taxaInteracaoPorView(perfil);
  const seg = perfil.seguidores || 1;

  return perfil.posts.map((p) => {
    const i = interacoes(p);
    let alcance: number | null = null;
    let estimado = false;
    if (p.views) {
      alcance = p.views;
    } else if (porView) {
      // carrossel e imagem costumam gerar mais interação por pessoa alcançada
      // que vídeo, então corrigimos para não exagerar a estimativa
      alcance = Math.round(i / (porView * 1.6));
      estimado = true;
    }
    return {
      ...p,
      username: perfil.username,
      seguidoresPerfil: perfil.seguidores,
      interacoes: i,
      taxa: i / seg,
      score: i / med,
      alcance,
      alcanceEstimado: estimado,
      furouBolha: alcance !== null && perfil.seguidores > 0 && alcance > perfil.seguidores,
      exemplo: perfil.exemplo,
    };
  });
}

export interface ResumoFormato {
  formato: Formato;
  qtd: number;
  mediaInteracoes: number;
  mediaTaxa: number;
  mediaScore: number;
  /** participação no total de posts */
  share: number;
}

export interface ResumoPerfil {
  perfil: Perfil;
  posts: PostAnalisado[];
  mediaInteracoes: number;
  mediaComentarios: number;
  taxaEngajamento: number;
  mediaViews: number | null;
  postsPorSemana: number;
  formatos: ResumoFormato[];
  melhorFormato: Formato | null;
  variacaoSeguidores: number | null;
}

export function resumirFormatos(posts: PostAnalisado[]): ResumoFormato[] {
  return FORMATOS.map((formato) => {
    const doFormato = posts.filter((p) => p.formato === formato);
    return {
      formato,
      qtd: doFormato.length,
      mediaInteracoes: media(doFormato.map((p) => p.interacoes)),
      mediaTaxa: media(doFormato.map((p) => p.taxa)),
      mediaScore: media(doFormato.map((p) => p.score)),
      share: posts.length ? doFormato.length / posts.length : 0,
    };
  });
}

export function resumirPerfil(perfil: Perfil): ResumoPerfil {
  const posts = analisarPosts(perfil);
  const formatos = resumirFormatos(posts);
  const comDados = formatos.filter((f) => f.qtd >= 2);
  const melhor = comDados.sort((a, b) => b.mediaScore - a.mediaScore)[0];
  const views = posts.filter((p) => p.views).map((p) => p.views as number);

  const datas = posts.map((p) => new Date(p.data).getTime()).sort((a, b) => a - b);
  const semanas = datas.length > 1 ? (datas[datas.length - 1] - datas[0]) / (7 * 86400000) : 0;

  const h = perfil.historico;
  const variacao = h.length >= 2 ? h[h.length - 1].seguidores - h[0].seguidores : null;

  return {
    perfil,
    posts,
    mediaInteracoes: media(posts.map((p) => p.interacoes)),
    mediaComentarios: media(posts.map((p) => p.comentarios)),
    taxaEngajamento: media(posts.map((p) => p.taxa)),
    mediaViews: views.length ? media(views) : null,
    postsPorSemana: semanas > 0.5 ? posts.length / semanas : posts.length,
    formatos: resumirFormatos(posts),
    melhorFormato: melhor ? melhor.formato : null,
    variacaoSeguidores: variacao,
  };
}

/** Junta todos os posts de vários perfis, já com nota. */
export function todosOsPosts(perfis: Perfil[]): PostAnalisado[] {
  return perfis.flatMap(analisarPosts);
}

/* --------------------------- Tendências --------------------------- */

const STOPWORDS = new Set(
  (
    "a o e é de do da dos das em no na nos nas um uma uns umas para pra pro por com sem que se não nao mais mas como ao aos à às ou já ja eu você voce vc te me meu minha seu sua isso isto esse essa este esta ele ela eles elas foi ser ter tem tá ta só so sobre quando qual quem onde porque porquê então entao também tambem muito muita muitos muitas bem aqui ali lá la vai vou nós nos dia hoje até ate cada todo toda todos todas sua seus suas mesmo mesma pelo pela pelos pelas era são sao há ha está esta estou link bio comenta comente salva salve compartilha segue siga"
  ).split(" "),
);

export function palavras(texto: string): string[] {
  return texto
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#@]\S+/g, " ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

export function hashtags(texto: string): string[] {
  return (texto.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((h) => h.toLowerCase());
}

/** Palavras que aparecem mais nos posts que bombaram do que no resto. */
export function palavrasQuePerformam(posts: PostAnalisado[], limite = 15) {
  if (posts.length < 6) return [];
  const ordenados = [...posts].sort((a, b) => b.score - a.score);
  const corte = Math.max(3, Math.floor(ordenados.length * 0.25));
  const top = ordenados.slice(0, corte);
  const resto = ordenados.slice(corte);

  const conta = (lista: PostAnalisado[]) => {
    const m = new Map<string, number>();
    for (const p of lista) for (const w of new Set(palavras(p.legenda))) m.set(w, (m.get(w) ?? 0) + 1);
    return m;
  };
  const cTop = conta(top);
  const cResto = conta(resto);

  return [...cTop.entries()]
    .filter(([, n]) => n >= 2)
    .map(([palavra, n]) => {
      const fTop = n / top.length;
      const fResto = (cResto.get(palavra) ?? 0) / Math.max(1, resto.length);
      return { palavra, noTop: n, lift: (fTop + 0.01) / (fResto + 0.01) };
    })
    .sort((a, b) => b.lift - a.lift || b.noTop - a.noTop)
    .slice(0, limite);
}

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function desempenhoPorDia(posts: PostAnalisado[]) {
  return DIAS.map((dia, i) => {
    const doDia = posts.filter((p) => new Date(p.data).getDay() === i);
    return { dia, qtd: doDia.length, score: media(doDia.map((p) => p.score)) };
  });
}

export function desempenhoPorTamanhoLegenda(posts: PostAnalisado[]) {
  const faixas = [
    { nome: "Curta (até 150)", min: 0, max: 150 },
    { nome: "Média (150 a 600)", min: 150, max: 600 },
    { nome: "Longa (600+)", min: 600, max: Infinity },
  ];
  return faixas.map((f) => {
    const lista = posts.filter((p) => p.legenda.length >= f.min && p.legenda.length < f.max);
    return { faixa: f.nome, qtd: lista.length, score: media(lista.map((p) => p.score)) };
  });
}

/* ------------------------ Pilares / lacunas ------------------------ */

/** Palavras-chave para encaixar cada post num pilar do seu briefing. */
export const PALAVRAS_PILAR: Record<string, string[]> = {
  "Bastidores da Orbion": ["bastidor", "bastidores", "minha empresa", "nosso time", "reuniao", "rotina", "escritorio", "quadro"],
  "Estruturação comercial": ["comercial", "estrutura", "estruturar", "funil", "diagnostico", "processo comercial", "pilares", "operacao"],
  "Gestão e processos": ["gestao", "processo", "indicador", "indicadores", "kpi", "crm", "meta", "metas", "planilha", "ritual", "rotina"],
  "Visão de dono": ["empresario", "dono", "empreendedor", "erro", "erros", "decisao", "negocio", "empresa"],
  "Casos reais": ["case", "cliente", "faturamento", "resultado", "historia", "antes", "depois", "meses"],
  "Liderança e time comercial": ["vendedor", "vendedores", "time", "equipe", "contratar", "contratacao", "lideranca", "lider", "treinar", "cobrar"],
  "Princípios e vida": ["deus", "familia", "fe", "esposa", "filho", "filhos", "disciplina", "proposito", "principio"],
};

function normalizar(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function pilaresDoPost(legenda: string, pilares: string[]): string[] {
  const t = ` ${normalizar(legenda)} `;
  return pilares.filter((pilar) =>
    (PALAVRAS_PILAR[pilar] ?? palavras(pilar)).some((k) => t.includes(` ${k}`)),
  );
}

export function coberturaPorPilar(posts: PostAnalisado[], pilares: string[]) {
  return pilares.map((pilar) => {
    const lista = posts.filter((p) => pilaresDoPost(p.legenda, [pilar]).length > 0);
    const perfis = new Set(lista.map((p) => p.username));
    return {
      pilar,
      qtd: lista.length,
      perfis: perfis.size,
      share: posts.length ? lista.length / posts.length : 0,
      score: media(lista.map((p) => p.score)),
      exemplos: [...lista].sort((a, b) => b.score - a.score).slice(0, 3),
    };
  });
}

/** Timestamp de "N dias atrás" (0 = desde sempre). */
export function inicioDoPeriodo(dias: number): number {
  return dias ? Date.now() - dias * 86400000 : 0;
}

/* ---------------------------- Formatação --------------------------- */

export function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + " mi";
  if (Math.abs(n) >= 10_000) return Math.round(n / 1000) + " mil";
  if (Math.abs(n) >= 1_000) return (n / 1000).toFixed(1).replace(".", ",") + " mil";
  return Math.round(n).toLocaleString("pt-BR");
}

export const fmtPct = (n: number) => (n * 100).toFixed(2).replace(".", ",") + "%";
export const fmtScore = (n: number) => n.toFixed(1).replace(".", ",") + "x";

export function fmtData(iso?: string) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function fmtDataHora(iso?: string) {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
