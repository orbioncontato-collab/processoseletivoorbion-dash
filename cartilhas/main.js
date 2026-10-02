// Monta a cartilha a partir de um arquivo de dados.
// Uso: index.html?cartilha=cliente-sumido   (lê data/cartilha-cliente-sumido.json)
//      &sangria=1  adiciona 3mm de sangria para gráfica
//      &guias=1    mostra a margem segura na tela

import { CoverPage } from "./components/CoverPage.js";
import { IntroPage } from "./components/IntroPage.js";
import { HowToPage } from "./components/HowToPage.js";
import { NavigationMap } from "./components/NavigationMap.js";
import { CategoryDivider } from "./components/CategoryDivider.js";
import { MessagePage } from "./components/MessagePage.js";
import { DontSendPage } from "./components/DontSendPage.js";
import { ErrorsPage } from "./components/ErrorsPage.js";
import { QuickReferencePage } from "./components/QuickReferencePage.js";
import { TrackingSheet } from "./components/TrackingSheet.js";
import { BackCover } from "./components/BackCover.js";

const params = new URLSearchParams(location.search);
const slug = params.get("cartilha") || "cliente-sumido";
const bleed = params.get("sangria") === "1" ? 3 : 0;

// Ordem das páginas. Para outra cartilha, normalmente só o JSON muda.
function plan(data) {
  const list = [
    { key: "cover", render: CoverPage },
    { key: "intro", render: IntroPage },
    { key: "howto", render: HowToPage },
    { key: "map", render: NavigationMap },
  ];
  for (const cat of data.categorias) {
    list.push({ key: `cat-${cat.id}`, render: (ctx) => CategoryDivider(ctx, cat) });
    for (const m of data.mensagens.filter((x) => x.categoria === cat.id)) {
      list.push({ key: `msg-${m.id}`, render: (ctx) => MessagePage(ctx, m) });
    }
  }
  list.push(
    { key: "dont", render: DontSendPage },
    { key: "errors", render: ErrorsPage },
    { key: "cheat", render: QuickReferencePage },
    { key: "tracking", render: (ctx) => TrackingSheet(ctx) },
    { key: "tracking-extra", render: (ctx) => TrackingSheet(ctx, { extra: true }) },
    { key: "back", render: BackCover }
  );
  return list;
}

function build(data) {
  const list = plan(data);
  const pageOf = Object.fromEntries(list.map((p, i) => [p.key, i + 1]));
  const pageOfMessage = Object.fromEntries(data.mensagens.map((m) => [m.id, pageOf[`msg-${m.id}`]]));
  const rangeOf = Object.fromEntries(
    data.categorias.map((c) => {
      const pages = data.mensagens.filter((m) => m.categoria === c.id).map((m) => pageOfMessage[m.id]);
      return [c.id, { divider: pageOf[`cat-${c.id}`], first: Math.min(...pages), last: Math.max(...pages) }];
    })
  );
  const base = { data, pageOf, pageOfMessage, rangeOf, totalMessages: data.mensagens.length, totalPages: list.length };
  return list.map((p, i) => p.render({ ...base, pageNumber: i + 1 })).join("");
}

async function init() {
  document.documentElement.style.setProperty("--bleed", `${bleed}mm`);
  const pageStyle = document.createElement("style");
  pageStyle.textContent = `@page { size: ${148 + 2 * bleed}mm ${210 + 2 * bleed}mm; margin: 0; }`;
  document.head.appendChild(pageStyle);
  if (params.get("guias") === "1") document.body.classList.add("guides");

  const res = await fetch(`data/cartilha-${slug}.json`);
  if (!res.ok) throw new Error(`Não encontrei data/cartilha-${slug}.json`);
  const data = await res.json();

  document.title = data.meta.titulo.join(" ");
  document.getElementById("sheets").innerHTML = build(data);
  const total = document.querySelectorAll(".page").length;
  document.getElementById("info").textContent =
    `${data.meta.titulo.join(" ")} · ${total} páginas A5${bleed ? " · com 3mm de sangria" : ""}`;

  document.getElementById("btn-print").onclick = () => window.print();
  document.getElementById("btn-guides").onclick = () => document.body.classList.toggle("guides");

  await document.fonts.ready;
  window.__CARTILHA_READY__ = true;
}

init().catch((err) => {
  document.getElementById("info").textContent = `Erro: ${err.message}`;
  window.__CARTILHA_ERROR__ = err.message;
});
