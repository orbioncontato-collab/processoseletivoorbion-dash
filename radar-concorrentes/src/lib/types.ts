export type Formato = "video" | "carrossel" | "imagem";

export const FORMATOS: Formato[] = ["video", "carrossel", "imagem"];

export const NOME_FORMATO: Record<Formato, string> = {
  video: "Vídeo",
  carrossel: "Carrossel",
  imagem: "Imagem",
};

export interface Post {
  /** shortcode do Instagram (ou id gerado para posts manuais) */
  id: string;
  url: string;
  formato: Formato;
  legenda: string;
  curtidas: number;
  comentarios: number;
  /** visualizações. Só existe em vídeo/Reels */
  views: number | null;
  /** data de publicação em ISO */
  data: string;
  /** nome do arquivo salvo em data/media */
  thumb?: string;
  slides?: number;
  fixado?: boolean;
  origem: "auto" | "manual";
  /** texto da análise da IA: por que esse post performou */
  analise?: string;
}

export interface StatusAnuncio {
  situacao: "ativo" | "nenhum" | "nao-verificado";
  observacao: string;
  verificadoEm?: string;
}

export interface Perfil {
  username: string;
  nome: string;
  bio: string;
  seguidores: number;
  seguindo: number;
  totalPosts: number;
  foto?: string;
  youtube?: string;
  tiktok?: string;
  atualizadoEm?: string;
  erroColeta?: string;
  posts: Post[];
  historico: { data: string; seguidores: number }[];
  anuncios: StatusAnuncio;
  /** perfil fictício, só para visualizar as telas */
  exemplo?: boolean;
}

export interface Briefing {
  nome: string;
  username: string;
  nicho: string;
  posicionamento: string;
  pilares: { nome: string; descricao: string }[];
  publico: {
    quem: string;
    idade: string;
    problemas: string;
    desejos: string;
    gostaDeVer: string;
  };
  mecanismo: string;
  diferencial: string;
  erroDoNicho: string;
  tomDeVoz: string;
  mandamentos: string[];
  nuncaFaria: string;
  formatos: string;
  observacoes: string;
}

export type TipoGeracao = "ideias" | "roteiro" | "analise-post" | "guia-de-voz";

export interface Geracao {
  id: string;
  tipo: TipoGeracao;
  titulo: string;
  criadoEm: string;
  conteudo: string;
  /** ids dos posts usados como referência */
  referencias: string[];
  formato?: Formato | "auto";
  origem: "ia" | "colado";
}

export interface Config {
  mostrarExemplos: boolean;
}

export interface DB {
  versao: 1;
  briefing: Briefing;
  meuPerfil: Perfil;
  concorrentes: Perfil[];
  geracoes: Geracao[];
  config: Config;
}
