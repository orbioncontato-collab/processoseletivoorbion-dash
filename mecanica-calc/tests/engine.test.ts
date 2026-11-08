// Testes do motor de cálculo. Rodar com: npm test
import { CALCS, getCalc } from "../src/lib/calcs.ts";
import { emptyState, evaluate, exampleState } from "../src/lib/engine.ts";
import type { FormState } from "../src/lib/engine.ts";
import { formatNumber, parseNumber } from "../src/lib/number.ts";

let total = 0;
const falhas: string[] = [];

function check(nome: string, cond: boolean, detalhe = "") {
  total++;
  if (!cond) falhas.push(`${nome} ${detalhe}`);
}

function near(a: unknown, b: number, rel = 1e-9) {
  return typeof a === "number" && Math.abs(a - b) <= Math.max(1e-12, rel * Math.abs(b));
}

function run(slug: string, patch: Partial<FormState> & { set?: Record<string, string>; unit?: Record<string, string> } = {}) {
  const c = getCalc(slug)!;
  const st = exampleState(c);
  if (patch.mode) st.mode = patch.mode;
  if (patch.groups) st.groups = patch.groups;
  if (patch.set) Object.assign(st.values, patch.set);
  if (patch.unit) Object.assign(st.units, patch.unit);
  return evaluate(c, st, 6);
}

function val(ev: ReturnType<typeof run>, label: string, unit?: string) {
  const o = ev.output!;
  const all = [o.main, ...o.others];
  return all.find((r) => r.label === label && (unit === undefined || r.unit === unit))?.value;
}

// 1. Exemplos: mesmos valores de referência da planilha Excel
const R = {
  forcas: Math.hypot(100, 100),
  tensao: 100,
  deformacao: 0.5,
  torcao: (16 * 100 * 1000) / (Math.PI * 20 ** 3),
  potencia: (100 * 2 * Math.PI * 1500) / 60 / 1000,
  gases: (101.325 * 1000) / (287 * 293.15),
  rendimento: 30,
  hidro: 19.62,
  vazao: (Math.PI * 0.05 ** 2) / 4 * 2 * 1000,
  re: 2000,
  hf: 0.02 * (10 / 0.05) * 4 / (2 * 9.81),
  q: 480,
};
const exemplos: [string, number][] = [
  ["forcas", R.forcas], ["tensao", R.tensao], ["deformacao", R.deformacao], ["torcao", R.torcao],
  ["potencia-torque", R.potencia], ["gases-ideais", R.gases], ["rendimento", R.rendimento], ["hidrostatica", R.hidro],
  ["vazao", R.vazao], ["reynolds", R.re], ["perda-de-carga", R.hf], ["conducao", R.q],
];
for (const [slug, esp] of exemplos) {
  const ev = run(slug);
  check(`exemplo ${slug}`, ev.output !== null && near(ev.output.main.value, esp), JSON.stringify(ev.output?.main ?? ev.errors));
}
check("12 calculadoras", CALCS.length === 12);

// Resultados secundários dos exemplos
check("forcas angulo 45", near(val(run("forcas"), "Direção da resultante"), 45));
check("torcao phi rad", near(val(run("torcao"), "Ângulo de torção", "rad"), (32 * 100 * 1) / (Math.PI * 80e9 * 0.02 ** 4)));
check("hidro p abs", near(val(run("hidrostatica"), "Pressão absoluta no ponto"), 120.945));
check("perda dp 8 kPa", near(val(run("perda-de-carga"), "Queda de pressão por atrito", "kPa"), 8));
check("reynolds laminar", val(run("reynolds"), "Regime aproximado") === "Laminar");
check("conducao Rt", near(val(run("conducao"), "Resistência térmica"), 0.0625));
check("rendimento Qsai", near(val(run("rendimento"), "Calor rejeitado"), 700));
check("gases T K", near(val(run("gases-ideais"), "Temperatura absoluta"), 293.15));

// 2. Conversão de unidades: mesmo problema escrito de outro jeito
check("tensao em N e cm²", near(run("tensao", { set: { F: "10000", A: "1" }, unit: { F: "N", A: "cm²" } }).output?.main.value, 100));
check("deformacao E em MPa", near(run("deformacao", { set: { E: "200000" }, unit: { E: "MPa" } }).output?.main.value, 0.5));
check("torque N·mm", near(run("torcao", { set: { T: "100000" }, unit: { T: "N·mm" } }).output?.main.value, R.torcao));
check("potencia rad/s", near(run("potencia-torque", { set: { n: String(50 * Math.PI) }, unit: { n: "rad/s" } }).output?.main.value, R.potencia));
check("gases T em K", near(run("gases-ideais", { set: { T: "293,15" }, unit: { T: "K" } }).output?.main.value, R.gases));
check("gases T em °F", near(run("gases-ideais", { set: { T: "68" }, unit: { T: "°F" } }).output?.main.value, R.gases));
check("gases p em atm", near(run("gases-ideais", { set: { p: "1" }, unit: { p: "atm" } }).output?.main.value, R.gases));
check("vazao D em cm", near(run("vazao", { set: { D: "5" }, unit: { D: "cm" } }).output?.main.value, R.vazao));
check("reynolds mu em cP", near(run("reynolds", { set: { mu: "1" }, unit: { mu: "cP" } }).output?.main.value, 2000));
check("conducao T em K", near(run("conducao", { set: { T1: "323,15", T2: "293,15" }, unit: { T1: "K", T2: "K" } }).output?.main.value, 480));

// 3. Modos
const inv = run("potencia-torque", { mode: "pt", set: { P: "15,707963267948966" } });
check("potencia modo inverso", near(inv.output?.main.value, 100));
const gp = run("gases-ideais", { mode: "p", set: { m: String(R.gases).replace(".", ",") } });
check("gases calcular pressão", near(gp.output?.main.value, 101.325));
const gv = run("gases-ideais", { mode: "V", set: { m: String(R.gases).replace(".", ",") } });
check("gases calcular volume", near(gv.output?.main.value, 1));
const gt = run("gases-ideais", { mode: "T", set: { m: String(R.gases).replace(".", ",") } });
check("gases calcular temperatura", near(gt.output?.main.value, 20));

// 4. Campos opcionais
check("torcao sem angulo", near(run("torcao", { groups: [] }).output?.main.value, R.torcao) && run("torcao", { groups: [] }).output!.others.length === 1);
check("hidro sem p0", run("hidrostatica", { groups: [] }).output !== null && val(run("hidrostatica", { groups: [] }), "Pressão absoluta no ponto") === undefined);
check("perda sem densidade", near(run("perda-de-carga", { groups: [] }).output?.main.value, R.hf));
const f4 = run("forcas", { groups: ["f2", "f3", "f4"], set: { F1: "10", a1: "30", F2: "20", a2: "120", F3: "30", a3: "210", F4: "40", a4: "300" } });
const fx = [10, 20, 30, 40].reduce((s, F, k) => s + F * Math.cos(((30 + 90 * k) * Math.PI) / 180), 0);
const fy = [10, 20, 30, 40].reduce((s, F, k) => s + F * Math.sin(((30 + 90 * k) * Math.PI) / 180), 0);
check("forcas quatro", near(f4.output?.main.value, Math.hypot(fx, fy)));

// 5. Erros e casos-limite
const e1 = run("tensao", { set: { A: "0" } });
check("area zero", e1.output === null && e1.errors.A === "Informe um valor maior que zero.");
check("campo vazio", run("tensao", { set: { A: "" } }).errors.A === "Preencha este campo.");
check("texto", run("tensao", { set: { F: "abc" } }).errors.F?.startsWith("Digite apenas números") === true);
check("negativo", run("tensao", { set: { F: "-1" } }).errors.F === "O valor não pode ser negativo.");
check("diametro zero", run("vazao", { set: { D: "0" } }).output === null);
check("viscosidade zero", run("reynolds", { set: { mu: "0" } }).output === null);
check("W >= Q", run("rendimento", { set: { W: "1000" } }).errors.W?.includes("2ª lei") === true);
check("W = 0", near(run("rendimento", { set: { W: "0" } }).output?.main.value, 0));
check("zero absoluto", run("gases-ideais", { set: { T: "-300" } }).errors.T?.includes("zero absoluto") === true);
check("temperaturas negativas ok", near(run("conducao", { set: { T1: "-10", T2: "-30" } }).output?.main.value, 320));
check("sentido invertido", val(run("conducao", { set: { T1: "20", T2: "50" } }), "Sentido do calor") === "Do lado 2 para o lado 1");
check("resultante nula", val(run("forcas", { set: { a2: "180" } }), "Direção da resultante") === "Direção indefinida");
check("angulo negativo", near(val(run("forcas", { groups: [], set: { a1: "-90" } }), "Direção da resultante"), 270));
check("re 2300", val(run("reynolds", { set: { v: "0,115" } }), "Regime aproximado") === "Transição");
check("re 4000", val(run("reynolds", { set: { v: "0,2" } }), "Regime aproximado") === "Turbulento");
check("v zero", val(run("reynolds", { set: { v: "0" } }), "Regime aproximado") === "Sem escoamento");
check("aviso R universal", run("gases-ideais", { set: { R: "8,314" } }).output!.warnings.length === 1);
check("aviso Fanning", run("perda-de-carga", { set: { fD: "0,005" } }).output!.warnings.length === 1);
check("extremo grande", near(run("tensao", { set: { F: "1e6", A: "1e-3" } }).output?.main.value, 1e12));
check("estado vazio", evaluate(getCalc("tensao")!, emptyState(getCalc("tensao")!), 4).missing === 2);

// 6. Leitura de números
const p = (s: string) => { const r = parseNumber(s); return r.kind === "ok" ? r.value : r.kind; };
check("parse 0,5", p("0,5") === 0.5);
check("parse 0.5", p("0.5") === 0.5);
check("parse 1.234,5", p("1.234,5") === 1234.5);
check("parse 1.000.000", p("1.000.000") === 1e6);
check("parse 1.500 ambíguo", p("1.500") === "error");
check("parse 4,7e-6", p("4,7e-6") === 4.7e-6);
check("parse -12", p("-12") === -12);
check("parse vazio", p("  ") === "empty");
check("parse 12a", p("12a") === "error");
check("parse 1,2,3", p("1,2,3") === "error");

// 7. Exibição
check("fmt 141,4214", formatNumber(141.42135623730951, 4) === "141,4214");
check("fmt milhar", formatNumber(100000000, 2) === "100.000.000");
check("fmt científico", formatNumber(0.000001, 4) === "1 × 10⁻⁶");
check("fmt 0,0625", formatNumber(0.0625, 4) === "0,0625");
check("fmt -0", formatNumber(-0, 4) === "0");

console.log(`Testes do motor: ${total - falhas.length}/${total} aprovados`);
for (const f of falhas) console.log("  FALHA:", f);
process.exit(falhas.length ? 1 : 0);
