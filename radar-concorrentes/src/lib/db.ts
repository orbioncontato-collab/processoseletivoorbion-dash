import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { dbInicial, PERFIS_EXEMPLO } from "./seed";
import type { DB, Perfil } from "./types";

/**
 * Banco de dados simples: um arquivo JSON em data/radar.json.
 * Como a plataforma é de uso pessoal e roda na sua máquina, isso basta
 * e você pode abrir o arquivo para ver tudo que foi coletado.
 */
export const PASTA_DADOS = path.join(process.cwd(), "data");
export const PASTA_MEDIA = path.join(PASTA_DADOS, "media");
const ARQUIVO = path.join(PASTA_DADOS, "radar.json");

let fila: Promise<unknown> = Promise.resolve();

export async function lerDB(): Promise<DB> {
  try {
    const txt = await fs.readFile(ARQUIVO, "utf8");
    return JSON.parse(txt) as DB;
  } catch {
    const db = dbInicial();
    await gravar(db);
    return db;
  }
}

async function gravar(db: DB) {
  await fs.mkdir(PASTA_DADOS, { recursive: true });
  const tmp = ARQUIVO + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, ARQUIVO);
}

/** Lê, altera e grava em sequência, para duas ações ao mesmo tempo não se atropelarem. */
export function alterarDB<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const tarefa = fila.then(async () => {
    const db = await lerDB();
    const resultado = await fn(db);
    await gravar(db);
    return resultado;
  });
  fila = tarefa.catch(() => undefined);
  return tarefa;
}

/** Concorrentes que aparecem nas telas (inclui os de exemplo se a opção estiver ligada). */
export function concorrentesVisiveis(db: DB): Perfil[] {
  const reais = db.concorrentes;
  return db.config.mostrarExemplos ? [...reais, ...PERFIS_EXEMPLO] : reais;
}

/** Só concorrentes reais e com dados. É isso que vai para a IA. */
export function concorrentesReais(db: DB): Perfil[] {
  return db.concorrentes.filter((p) => p.posts.length > 0);
}
