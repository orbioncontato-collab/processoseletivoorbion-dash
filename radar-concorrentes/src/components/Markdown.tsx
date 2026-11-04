import { Fragment } from "react";

/** Mostra o texto da IA (markdown simples) sem precisar de biblioteca. */
function inline(texto: string, chave: string) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={`${chave}-${i}`}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={`${chave}-${i}`}>{p.slice(1, -1)}</code>;
    return <Fragment key={`${chave}-${i}`}>{p}</Fragment>;
  });
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r/g, "").split("\n");
  const blocos: React.ReactNode[] = [];
  let lista: { tipo: "ul" | "ol"; itens: string[] } | null = null;
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      const k = `p${blocos.length}`;
      blocos.push(<p key={k}>{inline(paragrafo.join(" "), k)}</p>);
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      const k = `l${blocos.length}`;
      const itens = lista.itens.map((it, i) => <li key={i}>{inline(it, `${k}-${i}`)}</li>);
      blocos.push(lista.tipo === "ul" ? <ul key={k}>{itens}</ul> : <ol key={k}>{itens}</ol>);
      lista = null;
    }
  };

  for (const bruta of linhas) {
    const l = bruta.trimEnd();
    const h = l.match(/^(#{1,4})\s+(.*)$/);
    const ul = l.match(/^\s*[-*•]\s+(.*)$/);
    const ol = l.match(/^\s*\d+[.)]\s+(.*)$/);
    if (!l.trim()) {
      fecharParagrafo();
      fecharLista();
    } else if (h) {
      fecharParagrafo();
      fecharLista();
      const k = `h${blocos.length}`;
      blocos.push(h[1].length <= 2 ? <h2 key={k}>{inline(h[2], k)}</h2> : <h3 key={k}>{inline(h[2], k)}</h3>);
    } else if (ul || ol) {
      fecharParagrafo();
      const tipo = ul ? "ul" : "ol";
      if (lista && lista.tipo !== tipo) fecharLista();
      if (!lista) lista = { tipo, itens: [] };
      lista.itens.push((ul ?? ol)![1]);
    } else {
      fecharLista();
      paragrafo.push(l.trim());
    }
  }
  fecharParagrafo();
  fecharLista();

  return <div className="texto-ia text-sm text-slate-800">{blocos}</div>;
}
