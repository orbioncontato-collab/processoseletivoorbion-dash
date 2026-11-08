import type { Calc, CategoryId, Fmt, Inputs, ResultItem, Step } from "./types.ts";
import { fromSI } from "./units.ts";

export const CATEGORIES: { id: CategoryId; name: string; short: string; icon: string }[] = [
  { id: "solidos", name: "Estática e Resistência dos Materiais", short: "Sólidos", icon: "Box" },
  { id: "termo", name: "Máquinas e Termodinâmica", short: "Termodinâmica", icon: "Cog" },
  { id: "fluidos", name: "Mecânica dos Fluidos", short: "Fluidos", icon: "Droplet" },
  { id: "calor", name: "Transferência de Calor", short: "Calor", icon: "Thermometer" },
];

const deg = (rad: number) => (rad * 180) / Math.PI;
const step = (title: string, formula: string, subst: string, result: string): Step => ({ title, formula, subst, result });
const item = (label: string, value: number | string, unit?: string, symbol?: string): ResultItem => ({ label, value, unit, symbol });

// ---------------------------------------------------------------- 01 FORÇAS
const forcas: Calc = {
  slug: "forcas",
  num: "01",
  name: "Forças e Vetores",
  category: "solidos",
  icon: "MoveUpRight",
  short: "Componentes, resultante e direção de até 4 forças no plano.",
  desc: "Decompor forças nos eixos x e y e encontrar o módulo e a direção da força resultante.",
  hint: "Ângulos medidos a partir do eixo x positivo, no sentido anti-horário. Ângulos negativos também valem.",
  keywords: "vetor resultante componentes estatica soma vetorial angulo decomposição",
  groups: [
    { id: "f2", label: "Incluir força 2", defaultOn: true },
    { id: "f3", label: "Incluir força 3", defaultOn: false },
    { id: "f4", label: "Incluir força 4", defaultOn: false },
  ],
  fields: [1, 2, 3, 4].flatMap((k) => [
    { id: `F${k}`, label: `Força ${k}`, symbol: `F${k}`, qty: "force" as const, unit: "N", rule: "nonneg" as const, group: k > 1 ? `f${k}` : undefined },
    { id: `a${k}`, label: `Ângulo da força ${k}`, symbol: `θ${k}`, qty: "angle" as const, unit: "graus", rule: "any" as const, group: k > 1 ? `f${k}` : undefined },
  ]),
  example: { groups: ["f2"], values: { F1: ["100", "N"], a1: ["0", "graus"], F2: ["100", "N"], a2: ["90", "graus"] } },
  compute(i: Inputs, f: Fmt) {
    const du = i.raw.F1.unit;
    const U = (si: number) => `${f(fromSI("force", du, si))} ${du}`;
    const ks = [1, 2, 3, 4].filter((k) => k === 1 || i.groups.has(`f${k}`));
    let sx = 0, sy = 0, soma = 0;
    const steps: Step[] = [];
    const vecs: { F: number; ang: number }[] = [];
    for (const k of ks) {
      const F = i.si[`F${k}`], a = i.si[`a${k}`];
      const fx = F * Math.cos(a), fy = F * Math.sin(a);
      sx += fx; sy += fy; soma += F;
      vecs.push({ F, ang: deg(a) });
      steps.push(step(
        `Componentes da força ${k}`,
        `F${k}x = F${k}·cos θ${k}    F${k}y = F${k}·sen θ${k}`,
        `F${k}x = ${U(F)} · cos(${f(deg(a))}°)    F${k}y = ${U(F)} · sen(${f(deg(a))}°)`,
        `F${k}x = ${U(Math.abs(fx) <= 1e-12 * F ? 0 : fx)}    F${k}y = ${U(Math.abs(fy) <= 1e-12 * F ? 0 : fy)}`,
      ));
    }
    const tol = 1e-12 * soma;
    if (Math.abs(sx) <= tol) sx = 0;
    if (Math.abs(sy) <= tol) sy = 0;
    const R = Math.hypot(sx, sy);
    const indef = R <= tol;
    const th = indef ? NaN : ((deg(Math.atan2(sy, sx)) % 360) + 360) % 360;
    steps.push(step(
      "Soma das componentes",
      `ΣFx = ${ks.map((k) => `F${k}x`).join(" + ")}    ΣFy = ${ks.map((k) => `F${k}y`).join(" + ")}`,
      "Somam-se as componentes de mesmo eixo, cada uma com o seu sinal.",
      `ΣFx = ${U(sx)}    ΣFy = ${U(sy)}`,
    ));
    steps.push(step("Módulo da resultante", "R = √(ΣFx² + ΣFy²)", `R = √((${U(sx)})² + (${U(sy)})²)`, `R = ${U(R)}`));
    steps.push(step(
      "Direção da resultante",
      "θR = atan2(ΣFy, ΣFx)",
      `θR = atan2(${U(sy)}, ${U(sx)})`,
      indef ? "Direção indefinida (resultante nula)" : `θR = ${f(th)}°`,
    ));
    const quad = indef ? "" : th === 0 ? "sobre o eixo x positivo" : th === 90 ? "sobre o eixo y positivo" : th === 180 ? "sobre o eixo x negativo" : th === 270 ? "sobre o eixo y negativo" : `no ${Math.floor(th / 90) + 1}º quadrante`;
    return {
      main: item("Módulo da resultante", fromSI("force", du, R), du, "R"),
      others: [
        item("Resultante horizontal", fromSI("force", du, sx), du, "ΣFx"),
        item("Resultante vertical", fromSI("force", du, sy), du, "ΣFy"),
        indef ? item("Direção da resultante", "Direção indefinida", undefined, "θR") : item("Direção da resultante", th, "graus", "θR"),
      ],
      steps,
      explanation: [
        `Somando as componentes das ${ks.length} forças, sobram ${U(sx)} na horizontal e ${U(sy)} na vertical.`,
        indef
          ? "As forças se anulam: a resultante é zero e, por isso, não tem direção definida. O corpo está em equilíbrio de forças (falta checar os momentos)."
          : `A resultante tem módulo ${U(R)} e aponta ${f(th)}° a partir do eixo x positivo, ${quad}. Ela sozinha produz o mesmo efeito de translação que todas as forças juntas.`,
      ],
      warnings: [],
      viz: { vecs, R, th: indef ? null : th, unit: du },
    };
  },
  formulas: ["Fx = F·cos θ", "Fy = F·sen θ", "R = √(ΣFx² + ΣFy²)", "θR = atan2(ΣFy, ΣFx)"],
  hypotheses: [
    "Forças coplanares (todas no mesmo plano), somadas em dois eixos ortogonais.",
    "A resultante não informa o momento. Para equilíbrio de corpo rígido, verifique também a soma dos momentos.",
    "Se a resultante for nula, a direção fica indefinida.",
  ],
};

// ---------------------------------------------------------------- 02 TENSÃO
const tensao: Calc = {
  slug: "tensao",
  num: "02",
  name: "Tensão Normal",
  category: "solidos",
  icon: "ArrowDownToLine",
  short: "Tensão normal média em barras sob carga axial.",
  desc: "Calcular a tensão normal média que uma carga axial centrada provoca na seção transversal de uma barra.",
  hint: "Informe a intensidade da força. Para compressão, o módulo da tensão é o mesmo.",
  keywords: "sigma tensao normal media carga axial area mpa tração compressão",
  fields: [
    { id: "F", label: "Força axial", symbol: "F", qty: "force", unit: "kN", rule: "nonneg" },
    { id: "A", label: "Área da seção transversal", symbol: "A", qty: "area", unit: "mm²", rule: "pos" },
  ],
  example: { values: { F: ["10", "kN"], A: ["100", "mm²"] } },
  compute(i, f) {
    const F = i.si.F, A = i.si.A, s = F / A;
    return {
      main: item("Tensão normal média", s / 1e6, "MPa", "σ"),
      others: [item("Tensão normal média", s, "Pa", "σ"), item("Tensão normal média", s / 6894.757293168, "psi", "σ")],
      steps: [
        step("Unidades de trabalho", "F em N  •  A em mm²", `F = ${f(i.raw.F.v)} ${i.raw.F.unit}    A = ${f(i.raw.A.v)} ${i.raw.A.unit}`, `F = ${f(F)} N    A = ${f(A * 1e6)} mm²`),
        step("Tensão normal", "σ = F / A", `σ = ${f(F)} N / ${f(A * 1e6)} mm²`, `σ = ${f(s / 1e6)} MPa`),
      ],
      explanation: [
        `Uma força de ${f(F)} N distribuída sobre ${f(A * 1e6)} mm² gera uma tensão média de ${f(s / 1e6)} MPa.`,
        "Como 1 MPa = 1 N/mm², basta dividir a força em newtons pela área em milímetros quadrados. Em compressão, o módulo é o mesmo e o sinal é negativo por convenção.",
      ],
      warnings: [],
      viz: { F: i.raw.F, s: s / 1e6 },
    };
  },
  formulas: ["σ = F / A", "1 MPa = 1 N/mm²"],
  hypotheses: [
    "Carga axial centrada e distribuição uniforme de tensão na seção.",
    "Perto de furos, entalhes ou mudanças de seção há concentração de tensões, que esta fórmula não considera.",
    "Em compressão de peças esbeltas, verifique também a flambagem.",
  ],
};

// ---------------------------------------------------------------- 03 DEFORMAÇÃO
const deformacao: Calc = {
  slug: "deformacao",
  num: "03",
  name: "Deformação Axial",
  category: "solidos",
  icon: "StretchVertical",
  short: "Alongamento elástico, deformação e tensão em barras.",
  desc: "Calcular quanto uma barra prismática se alonga sob carga axial, pela lei de Hooke.",
  hint: "Aço ≈ 200 GPa, alumínio ≈ 70 GPa, cobre ≈ 110 GPa.",
  keywords: "alongamento deformacao hooke modulo de elasticidade young delta l epsilon",
  fields: [
    { id: "F", label: "Força axial", symbol: "F", qty: "force", unit: "kN", rule: "nonneg" },
    { id: "L", label: "Comprimento inicial", symbol: "L", qty: "length", unit: "mm", rule: "pos" },
    { id: "A", label: "Área da seção", symbol: "A", qty: "area", unit: "mm²", rule: "pos" },
    { id: "E", label: "Módulo de elasticidade", symbol: "E", qty: "modulus", unit: "GPa", rule: "pos" },
  ],
  presetLabel: "Material",
  presets: [
    { label: "Aço ≈ 200 GPa", values: { E: ["200", "GPa"] } },
    { label: "Alumínio ≈ 70 GPa", values: { E: ["70", "GPa"] } },
    { label: "Cobre ≈ 110 GPa", values: { E: ["110", "GPa"] } },
  ],
  example: { values: { F: ["10", "kN"], L: ["1000", "mm"], A: ["100", "mm²"], E: ["200", "GPa"] } },
  compute(i, f) {
    const { F, L, A, E } = i.si;
    const s = F / A, e = s / E, dL = e * L;
    const w: string[] = [];
    if (E > 1.5e12) w.push("E acima de 1.500 GPa. Confira a unidade: o aço tem cerca de 200 GPa (200.000 MPa).");
    return {
      main: item("Alongamento", dL * 1e3, "mm", "ΔL"),
      others: [
        item("Deformação longitudinal", e, "adim.", "ε"),
        item("Tensão axial média", s / 1e6, "MPa", "σ"),
        item("Comprimento final", (L + dL) * 1e3, "mm", "Lf"),
      ],
      steps: [
        step("Tensão axial", "σ = F / A", `σ = ${f(F)} N / ${f(A * 1e6)} mm²`, `σ = ${f(s / 1e6)} MPa`),
        step("Deformação (lei de Hooke)", "ε = σ / E", `ε = ${f(s / 1e6)} MPa / ${f(E / 1e6)} MPa`, `ε = ${f(e)}`),
        step("Alongamento", "ΔL = ε·L = F·L / (A·E)", `ΔL = ${f(e)} × ${f(L * 1e3)} mm`, `ΔL = ${f(dL * 1e3)} mm`),
      ],
      explanation: [
        `A barra fica submetida a ${f(s / 1e6)} MPa. Dividindo pelo módulo de elasticidade, cada milímetro da barra se estica ${f(e)} mm.`,
        `Multiplicando pelo comprimento de ${f(L * 1e3)} mm, o alongamento total é de ${f(dL * 1e3)} mm e a barra passa a medir ${f((L + dL) * 1e3)} mm.`,
      ],
      warnings: w,
      viz: { dL: dL * 1e3 },
    };
  },
  formulas: ["σ = F / A", "ε = σ / E", "ΔL = F·L / (A·E)"],
  hypotheses: [
    "Barra prismática (seção constante), material elástico linear e carga axial constante.",
    "A tensão precisa ficar abaixo do limite de proporcionalidade do material.",
    "Não considera dilatação térmica, flambagem ou peso próprio.",
  ],
};

// ---------------------------------------------------------------- 04 TORÇÃO
const torcao: Calc = {
  slug: "torcao",
  num: "04",
  name: "Torção de Eixos",
  category: "solidos",
  icon: "RotateCw",
  short: "Tensão de cisalhamento máxima e ângulo de torção.",
  desc: "Calcular a tensão máxima de cisalhamento em um eixo circular maciço e, se quiser, o ângulo de torção.",
  hint: "Aço ≈ 80 GPa de módulo de cisalhamento G. Marque a opção abaixo para obter o ângulo de torção.",
  keywords: "torcao eixo tau cisalhamento momento polar angulo de torção phi torque",
  groups: [{ id: "ang", label: "Calcular também o ângulo de torção", defaultOn: true }],
  fields: [
    { id: "T", label: "Torque aplicado", symbol: "T", qty: "torque", unit: "N·m", rule: "nonneg" },
    { id: "d", label: "Diâmetro do eixo", symbol: "d", qty: "length", unit: "mm", rule: "pos" },
    { id: "L", label: "Comprimento do eixo", symbol: "L", qty: "length", unit: "mm", rule: "pos", group: "ang" },
    { id: "G", label: "Módulo de cisalhamento", symbol: "G", qty: "modulus", unit: "GPa", rule: "pos", group: "ang" },
  ],
  example: { groups: ["ang"], values: { T: ["100", "N·m"], d: ["20", "mm"], L: ["1000", "mm"], G: ["80", "GPa"] } },
  compute(i, f) {
    const { T, d } = i.si;
    const J = (Math.PI * d ** 4) / 32;
    const tau = (16 * T) / (Math.PI * d ** 3);
    const others: ResultItem[] = [item("Momento polar de inércia", J * 1e12, "mm⁴", "J")];
    const steps = [
      step("Momento polar de inércia", "J = π·d⁴ / 32", `J = π × (${f(d * 1e3)} mm)⁴ / 32`, `J = ${f(J * 1e12)} mm⁴`),
      step("Tensão máxima de cisalhamento", "τmáx = T·(d/2) / J = 16·T / (π·d³)", `τmáx = 16 × ${f(T * 1e3)} N·mm / (π × (${f(d * 1e3)} mm)³)`, `τmáx = ${f(tau / 1e6)} MPa`),
    ];
    const exp = [`O torque de ${f(T)} N·m gera ${f(tau / 1e6)} MPa de cisalhamento na superfície do eixo. No centro a tensão é zero e cresce linearmente até a borda.`];
    const w: string[] = [];
    let phi: number | null = null;
    if (i.groups.has("ang")) {
      const { L, G } = i.si;
      phi = (T * L) / (G * J);
      others.push(item("Ângulo de torção", phi, "rad", "φ"), item("Ângulo de torção", deg(phi), "graus", "φ"));
      steps.push(step("Ângulo de torção", "φ = T·L / (G·J)", `φ = ${f(T * 1e3)} N·mm × ${f(L * 1e3)} mm / (${f(G / 1e6)} MPa × ${f(J * 1e12)} mm⁴)`, `φ = ${f(phi)} rad = ${f(deg(phi))}°`));
      exp.push(`Ao longo de ${f(L * 1e3)} mm, uma seção gira ${f(deg(phi))}° em relação à outra.`);
      if (G > 1e12) w.push("G acima de 1.000 GPa. Confira a unidade: o aço tem cerca de 80 GPa.");
    }
    return { main: item("Tensão máxima de cisalhamento", tau / 1e6, "MPa", "τmáx"), others, steps, explanation: exp, warnings: w, viz: { phi } };
  },
  formulas: ["J = π·d⁴ / 32", "τmáx = 16·T / (π·d³)", "φ = T·L / (G·J)"],
  hypotheses: [
    "Eixo circular maciço. Para eixo vazado, J = π(D⁴ − d⁴)/32.",
    "Torção elástica: a tensão deve ficar abaixo do limite de escoamento ao cisalhamento.",
    "Geometria, torque e material constantes ao longo do comprimento. Rasgos de chaveta concentram tensões.",
  ],
};

// ---------------------------------------------------------------- 05 POTÊNCIA E TORQUE
const potencia: Calc = {
  slug: "potencia-torque",
  num: "05",
  name: "Potência e Torque",
  category: "termo",
  icon: "Gauge",
  short: "Converte torque e rotação em potência, e vice-versa.",
  desc: "Calcular a potência mecânica de um eixo a partir do torque e da rotação, ou o torque a partir da potência.",
  hint: "Escolha o que deseja calcular e preencha os outros dois campos.",
  keywords: "potencia torque rotacao rpm kw cv hp velocidade angular motor eixo",
  modeLabel: "O que você quer calcular?",
  modes: [{ id: "tp", label: "Potência (P)" }, { id: "pt", label: "Torque (T)" }],
  fields: [
    { id: "n", label: "Rotação do eixo", symbol: "n", qty: "rotation", unit: "RPM", rule: "pos" },
    { id: "T", label: "Torque", symbol: "T", qty: "torque", unit: "N·m", rule: "nonneg", modes: ["tp"] },
    { id: "P", label: "Potência", symbol: "P", qty: "power", unit: "kW", rule: "nonneg", modes: ["pt"] },
  ],
  example: { mode: "tp", values: { n: ["1500", "RPM"], T: ["100", "N·m"] } },
  compute(i, f) {
    const w = i.si.n;
    const rpm = (w * 60) / (2 * Math.PI);
    const s1 = step("Velocidade angular", "ω = 2·π·n / 60", `ω = 2π × ${f(rpm)} / 60`, `ω = ${f(w)} rad/s`);
    if (i.mode === "pt") {
      const P = i.si.P, T = P / w;
      return {
        main: item("Torque no eixo", T, "N·m", "T"),
        others: [item("Velocidade angular", w, "rad/s", "ω"), item("Potência", P / 1e3, "kW", "P"), item("Potência", P / 735.49875, "cv", "P")],
        steps: [s1, step("Torque", "T = P / ω", `T = ${f(P)} W / ${f(w)} rad/s`, `T = ${f(T)} N·m`)],
        explanation: [`Para entregar ${f(P / 1e3)} kW girando a ${f(rpm)} RPM, o eixo precisa transmitir ${f(T)} N·m.`, "Com a mesma potência, quanto menor a rotação, maior o torque. Por isso redutores aumentam o torque na saída."],
        warnings: [],
        viz: { T, P: P / 1e3, rpm },
      };
    }
    const T = i.si.T, P = T * w;
    return {
      main: item("Potência mecânica", P / 1e3, "kW", "P"),
      others: [item("Velocidade angular", w, "rad/s", "ω"), item("Potência", P / 735.49875, "cv", "P"), item("Potência", P / 745.699872, "hp", "P")],
      steps: [s1, step("Potência", "P = T·ω", `P = ${f(T)} N·m × ${f(w)} rad/s`, `P = ${f(P)} W = ${f(P / 1e3)} kW`)],
      explanation: [`Um torque de ${f(T)} N·m a ${f(rpm)} RPM corresponde a ${f(P / 1e3)} kW (${f(P / 735.49875)} cv).`, "A rotação precisa estar em rad/s para que N·m × rad/s resulte em watts."],
      warnings: [],
      viz: { T, P: P / 1e3, rpm },
    };
  },
  formulas: ["ω = 2·π·n / 60", "P = T·ω", "T = P / ω", "1 cv = 735,5 W"],
  hypotheses: [
    "Potência mecânica no eixo. Não confunda com potência elétrica ou consumida pelo motor.",
    "Para a potência de entrada de um motor, considere o rendimento do conjunto.",
    "Regime permanente: torque e rotação constantes.",
  ],
};

// ---------------------------------------------------------------- 06 GASES IDEAIS
const gases: Calc = {
  slug: "gases-ideais",
  num: "06",
  name: "Gases Ideais",
  category: "termo",
  icon: "Wind",
  short: "Pressão, volume, massa ou temperatura por pV = mRT.",
  desc: "Resolver a equação dos gases ideais para a variável que estiver faltando.",
  hint: "Use pressão absoluta. Escolha o gás para preencher R automaticamente.",
  keywords: "gas ideal clapeyron pv=mrt pressao volume massa temperatura constante do gas ar",
  modeLabel: "O que você quer calcular?",
  modes: [
    { id: "m", label: "Massa" },
    { id: "p", label: "Pressão" },
    { id: "V", label: "Volume" },
    { id: "T", label: "Temperatura" },
  ],
  fields: [
    { id: "p", label: "Pressão absoluta", symbol: "p", qty: "pressure", unit: "kPa", rule: "pos", modes: ["m", "V", "T"] },
    { id: "V", label: "Volume", symbol: "V", qty: "volume", unit: "m³", rule: "pos", modes: ["m", "p", "T"] },
    { id: "m", label: "Massa", symbol: "m", qty: "mass", unit: "kg", rule: "pos", modes: ["p", "V", "T"] },
    { id: "T", label: "Temperatura", symbol: "T", qty: "temp", unit: "°C", rule: "absTemp", modes: ["m", "p", "V"] },
    { id: "R", label: "Constante específica do gás", symbol: "R", qty: "gasR", unit: "J/(kg·K)", rule: "pos" },
  ],
  presetLabel: "Gás",
  presets: [
    { label: "Ar ≈ 287", values: { R: ["287", "J/(kg·K)"] } },
    { label: "N₂ ≈ 296,8", values: { R: ["296,8", "J/(kg·K)"] } },
    { label: "O₂ ≈ 259,8", values: { R: ["259,8", "J/(kg·K)"] } },
    { label: "CO₂ ≈ 188,9", values: { R: ["188,9", "J/(kg·K)"] } },
    { label: "Hélio ≈ 2077", values: { R: ["2077,1", "J/(kg·K)"] } },
    { label: "H₂ ≈ 4124", values: { R: ["4124,2", "J/(kg·K)"] } },
  ],
  example: { mode: "m", values: { p: ["101,325", "kPa"], V: ["1", "m³"], T: ["20", "°C"], R: ["287", "J/(kg·K)"] } },
  compute(i, f) {
    const R = i.si.R;
    let { p, V, m, T } = i.si;
    const steps: Step[] = [];
    if (i.mode !== "T") steps.push(step("Temperatura absoluta", "T (K) = T (°C) + 273,15", `T = ${f(T - 273.15)} °C + 273,15`, `T = ${f(T)} K`));
    let main: ResultItem;
    let exp: string;
    if (i.mode === "m") {
      m = (p * V) / (R * T);
      steps.push(step("Massa", "m = p·V / (R·T)", `m = ${f(p)} Pa × ${f(V)} m³ / (${f(R)} J/(kg·K) × ${f(T)} K)`, `m = ${f(m)} kg`));
      main = item("Massa", m, "kg", "m");
      exp = `Nessas condições, cabem ${f(m)} kg de gás no volume de ${f(V)} m³.`;
    } else if (i.mode === "p") {
      p = (m * R * T) / V;
      steps.push(step("Pressão", "p = m·R·T / V", `p = ${f(m)} kg × ${f(R)} J/(kg·K) × ${f(T)} K / ${f(V)} m³`, `p = ${f(p)} Pa = ${f(p / 1e3)} kPa`));
      main = item("Pressão absoluta", p / 1e3, "kPa", "p");
      exp = `A pressão absoluta do gás é ${f(p / 1e3)} kPa (${f(p / 1e5)} bar). Para a pressão manométrica, subtraia a pressão atmosférica local.`;
    } else if (i.mode === "V") {
      V = (m * R * T) / p;
      steps.push(step("Volume", "V = m·R·T / p", `V = ${f(m)} kg × ${f(R)} J/(kg·K) × ${f(T)} K / ${f(p)} Pa`, `V = ${f(V)} m³`));
      main = item("Volume", V, "m³", "V");
      exp = `O gás ocupa ${f(V)} m³, ou ${f(V * 1e3)} litros.`;
    } else {
      T = (p * V) / (m * R);
      steps.push(step("Temperatura", "T = p·V / (m·R)", `T = ${f(p)} Pa × ${f(V)} m³ / (${f(m)} kg × ${f(R)} J/(kg·K))`, `T = ${f(T)} K = ${f(T - 273.15)} °C`));
      main = item("Temperatura", T - 273.15, "°C", "T");
      exp = `O gás está a ${f(T)} K, o que equivale a ${f(T - 273.15)} °C.`;
    }
    const w: string[] = [];
    if (R < 100) w.push("R muito baixo. Use o R específico do gás em J/(kg·K) (ar ≈ 287), e não a constante universal 8,314 kJ/(kmol·K).");
    return {
      main,
      others: [
        item("Pressão absoluta", p / 1e3, "kPa", "p"),
        item("Volume", V, "m³", "V"),
        item("Massa", m, "kg", "m"),
        item("Temperatura", T - 273.15, "°C", "T"),
        item("Temperatura absoluta", T, "K", "T"),
        item("Massa específica", m / V, "kg/m³", "ρ"),
      ].filter((o) => o.label !== main.label),
      steps,
      explanation: [exp, "A equação só vale com pressão absoluta e temperatura absoluta. A calculadora converte °C e °F para kelvin automaticamente."],
      warnings: w,
      viz: { p: p / 1e3, V, m, T: T - 273.15 },
    };
  },
  formulas: ["p·V = m·R·T", "T (K) = T (°C) + 273,15", "R = Ru / M"],
  hypotheses: [
    "Modelo de gás ideal: vale para pressões moderadas e temperaturas bem acima da condensação.",
    "Sempre pressão absoluta e temperatura absoluta na equação.",
    "R depende do gás: R = 8314 / M, com M em kg/kmol.",
  ],
};

// ---------------------------------------------------------------- 07 RENDIMENTO
const rendimento: Calc = {
  slug: "rendimento",
  num: "07",
  name: "Rendimento Térmico",
  category: "termo",
  icon: "Flame",
  short: "Rendimento de ciclo motor e calor rejeitado.",
  desc: "Calcular o rendimento térmico de um ciclo motor a partir do calor fornecido e do trabalho líquido.",
  hint: "Também funciona com potências: use kW nos dois campos, ou a mesma unidade de energia.",
  keywords: "rendimento eficiencia termica ciclo motor calor trabalho liquido segunda lei carnot",
  fields: [
    { id: "Q", label: "Calor fornecido ao ciclo", symbol: "Qent", qty: "energy", unit: "kJ", rule: "pos" },
    { id: "W", label: "Trabalho líquido produzido", symbol: "Wlíq", qty: "energy", unit: "kJ", rule: "nonneg" },
  ],
  example: { values: { Q: ["1000", "kJ"], W: ["300", "kJ"] } },
  validate(i) {
    return i.si.W >= i.si.Q ? { W: "O trabalho líquido deve ser menor que o calor fornecido (2ª lei da Termodinâmica)." } : null;
  },
  compute(i, f) {
    const { Q, W } = i.si, eta = W / Q, Qo = Q - W;
    const du = i.raw.Q.unit;
    const c = (x: number) => fromSI("energy", du, x);
    return {
      main: item("Rendimento térmico", eta * 100, "%", "η"),
      others: [item("Calor rejeitado", c(Qo), du, "Qsai"), item("Parcela do calor rejeitada", (1 - eta) * 100, "%")],
      steps: [
        step("Rendimento", "η = Wlíq / Qent", `η = ${f(c(W))} ${du} / ${f(c(Q))} ${du}`, `η = ${f(eta)} = ${f(eta * 100)} %`),
        step("Calor rejeitado", "Qsai = Qent − Wlíq", `Qsai = ${f(c(Q))} ${du} − ${f(c(W))} ${du}`, `Qsai = ${f(c(Qo))} ${du}`),
      ],
      explanation: [
        `De cada 100 unidades de calor fornecidas, o ciclo transforma ${f(eta * 100)} em trabalho e rejeita ${f((1 - eta) * 100)} para a fonte fria.`,
        "Pela 2ª lei (Kelvin-Planck), nenhum ciclo converte todo o calor em trabalho. O limite máximo é o rendimento de Carnot: 1 − Tfria/Tquente.",
      ],
      warnings: [],
      viz: { Q: c(Q), W: c(W), Qo: c(Qo), unit: du, eta },
    };
  },
  formulas: ["η = Wlíq / Qent", "Qent = Wlíq + Qsai", "ηCarnot = 1 − Tf/Tq"],
  hypotheses: [
    "Balanço de energia de um ciclo motor completo.",
    "O resultado não representa sozinho o desempenho de uma máquina real.",
    "Calor e trabalho na mesma base (por ciclo, por kg ou por unidade de tempo).",
  ],
};

// ---------------------------------------------------------------- 08 HIDROSTÁTICA
const hidrostatica: Calc = {
  slug: "hidrostatica",
  num: "08",
  name: "Pressão Hidrostática",
  category: "fluidos",
  icon: "Waves",
  short: "Pressão em função da profundidade em líquidos.",
  desc: "Calcular quanto a pressão aumenta com a profundidade em um líquido em repouso.",
  hint: "A pressão na superfície é opcional e deve ser absoluta (ao ar livre ≈ 101,325 kPa).",
  keywords: "pressao hidrostatica stevin profundidade rho g h coluna de liquido manometro",
  groups: [{ id: "p0", label: "Somar a pressão na superfície (pressão absoluta)", defaultOn: true }],
  fields: [
    { id: "rho", label: "Densidade do fluido", symbol: "ρ", qty: "density", unit: "kg/m³", rule: "pos" },
    { id: "g", label: "Aceleração da gravidade", symbol: "g", qty: "accel", unit: "m/s²", rule: "pos" },
    { id: "h", label: "Profundidade", symbol: "h", qty: "length", unit: "m", rule: "nonneg" },
    { id: "p0", label: "Pressão absoluta na superfície", symbol: "p₀", qty: "pressure", unit: "kPa", rule: "pos", group: "p0" },
  ],
  presetLabel: "Fluido",
  presets: [
    { label: "Água ≈ 1000", values: { rho: ["1000", "kg/m³"] } },
    { label: "Água do mar ≈ 1025", values: { rho: ["1025", "kg/m³"] } },
    { label: "Mercúrio ≈ 13.600", values: { rho: ["13600", "kg/m³"] } },
  ],
  example: { groups: ["p0"], values: { rho: ["1000", "kg/m³"], g: ["9,81", "m/s²"], h: ["2", "m"], p0: ["101,325", "kPa"] } },
  compute(i, f) {
    const { rho, g, h } = i.si, dp = rho * g * h;
    const others: ResultItem[] = [item("Variação de pressão", dp, "Pa", "Δp"), item("Variação de pressão", dp / 1e5, "bar", "Δp")];
    const steps = [step("Aumento de pressão", "Δp = ρ·g·h", `Δp = ${f(rho)} kg/m³ × ${f(g)} m/s² × ${f(h)} m`, `Δp = ${f(dp)} Pa = ${f(dp / 1e3)} kPa`)];
    const exp = [`A coluna de ${f(h)} m de fluido acima do ponto pesa o equivalente a ${f(dp / 1e3)} kPa sobre cada metro quadrado.`];
    let pabs: number | null = null;
    if (i.groups.has("p0")) {
      pabs = i.si.p0 + dp;
      others.unshift(item("Pressão absoluta no ponto", pabs / 1e3, "kPa", "p"));
      steps.push(step("Pressão absoluta", "p = p₀ + Δp", `p = ${f(i.si.p0 / 1e3)} kPa + ${f(dp / 1e3)} kPa`, `p = ${f(pabs / 1e3)} kPa`));
      exp.push(`Somando a pressão da superfície, a pressão absoluta no ponto é ${f(pabs / 1e3)} kPa. O valor Δp sozinho é a pressão manométrica.`);
    }
    const w: string[] = [];
    if (rho < 100) w.push("Densidade abaixo de 100 kg/m³. Confira a unidade: a água tem cerca de 1000 kg/m³ (1 g/cm³).");
    return { main: item("Variação de pressão", dp / 1e3, "kPa", "Δp"), others, steps, explanation: exp, warnings: w, viz: { h, dp: dp / 1e3, pabs: pabs === null ? null : pabs / 1e3 } };
  },
  formulas: ["Δp = ρ·g·h", "p = p₀ + ρ·g·h"],
  hypotheses: [
    "Fluido homogêneo, em repouso e com densidade constante (líquido incompressível).",
    "Para líquidos sobrepostos, some ρ·g·h de cada camada.",
    "A profundidade é vertical, medida a partir da superfície livre, qualquer que seja a forma do recipiente.",
  ],
};

// ---------------------------------------------------------------- 09 VAZÃO
const vazao: Calc = {
  slug: "vazao",
  num: "09",
  name: "Vazão em Tubos",
  category: "fluidos",
  icon: "Droplets",
  short: "Área de passagem e vazão em tubos circulares.",
  desc: "Calcular a área interna e a vazão volumétrica de um tubo circular cheio a partir da velocidade média.",
  hint: "Use o diâmetro interno real do tubo, e não o diâmetro nominal comercial.",
  keywords: "vazao volumetrica continuidade area velocidade media tubo litros por segundo m3/h",
  fields: [
    { id: "D", label: "Diâmetro interno do tubo", symbol: "D", qty: "length", unit: "mm", rule: "pos" },
    { id: "v", label: "Velocidade média", symbol: "v", qty: "velocity", unit: "m/s", rule: "nonneg" },
  ],
  example: { values: { D: ["50", "mm"], v: ["2", "m/s"] } },
  compute(i, f) {
    const { D, v } = i.si, A = (Math.PI * D * D) / 4, Q = A * v;
    const w: string[] = [];
    if (D < 1e-3) w.push("Diâmetro menor que 1 mm. Confira a unidade escolhida.");
    return {
      main: item("Vazão volumétrica", Q * 1e3, "L/s", "Q"),
      others: [item("Vazão volumétrica", Q, "m³/s", "Q"), item("Vazão volumétrica", Q * 3600, "m³/h", "Q"), item("Área da seção", A, "m²", "A")],
      steps: [
        step("Área da seção", "A = π·D² / 4", `A = π × (${f(D)} m)² / 4`, `A = ${f(A)} m²`),
        step("Vazão", "Q = A·v", `Q = ${f(A)} m² × ${f(v)} m/s`, `Q = ${f(Q)} m³/s = ${f(Q * 1e3)} L/s`),
      ],
      explanation: [
        `A cada segundo passam ${f(Q * 1e3)} litros pela seção do tubo, o que dá ${f(Q * 3600)} m³ por hora.`,
        "Se o diâmetro dobrar e a vazão for mantida, a velocidade cai para um quarto, porque a área cresce com o quadrado do diâmetro.",
      ],
      warnings: w,
      viz: { D: D * 1e3, v },
    };
  },
  formulas: ["A = π·D² / 4", "Q = A·v", "1 m³/s = 1000 L/s = 3600 m³/h"],
  hypotheses: [
    "Tubo circular completamente cheio (escoamento forçado).",
    "Velocidade média na seção transversal.",
    "Para vazão em massa, multiplique Q pela densidade: ṁ = ρ·Q.",
  ],
};

// ---------------------------------------------------------------- 10 REYNOLDS
export function regime(re: number, v: number): string {
  if (v === 0) return "Sem escoamento";
  const r = Math.round(re * 1e6) / 1e6;
  return r < 2300 ? "Laminar" : r < 4000 ? "Transição" : "Turbulento";
}

const reynolds: Calc = {
  slug: "reynolds",
  num: "10",
  name: "Número de Reynolds",
  category: "fluidos",
  icon: "Activity",
  short: "Reynolds e regime de escoamento em tubos.",
  desc: "Calcular o número de Reynolds e indicar o regime aproximado do escoamento interno em tubos circulares.",
  hint: "Escolha um fluido para preencher densidade e viscosidade com valores de tabela.",
  keywords: "reynolds regime laminar turbulento transicao viscosidade dinamica cinematica",
  fields: [
    { id: "rho", label: "Densidade do fluido", symbol: "ρ", qty: "density", unit: "kg/m³", rule: "pos" },
    { id: "v", label: "Velocidade média", symbol: "v", qty: "velocity", unit: "m/s", rule: "nonneg" },
    { id: "D", label: "Diâmetro interno", symbol: "D", qty: "length", unit: "mm", rule: "pos" },
    { id: "mu", label: "Viscosidade dinâmica", symbol: "μ", qty: "viscosity", unit: "Pa·s", rule: "pos" },
  ],
  presetLabel: "Fluido a 20 °C",
  presets: [
    { label: "Água", values: { rho: ["998,2", "kg/m³"], mu: ["0,001002", "Pa·s"] } },
    { label: "Ar (1 atm)", values: { rho: ["1,204", "kg/m³"], mu: ["1,825e-5", "Pa·s"] } },
    { label: "Óleo de motor", values: { rho: ["888,1", "kg/m³"], mu: ["0,8374", "Pa·s"] } },
  ],
  example: { values: { rho: ["1000", "kg/m³"], v: ["0,1", "m/s"], D: ["20", "mm"], mu: ["0,001", "Pa·s"] } },
  compute(i, f) {
    const { rho, v, D, mu } = i.si, Re = (rho * v * D) / mu, nu = mu / rho, reg = regime(Re, v);
    const w: string[] = [];
    if (mu >= 1) w.push("Viscosidade de 1 Pa·s ou mais. Confira a unidade: a água tem cerca de 0,001 Pa·s (1 cP).");
    const txt: Record<string, string> = {
      "Sem escoamento": "Com velocidade zero o fluido está parado e não há regime de escoamento.",
      Laminar: "No regime laminar o fluido escoa em camadas organizadas, sem mistura entre elas. As forças viscosas dominam.",
      "Transição": "Na faixa de transição o escoamento alterna entre laminar e turbulento. Os resultados de perda de carga ficam incertos.",
      Turbulento: "No regime turbulento há vórtices e mistura intensa. As forças de inércia dominam as viscosas.",
    };
    return {
      main: item("Número de Reynolds", Re, "", "Re"),
      others: [item("Regime aproximado", reg), item("Viscosidade cinemática", nu, "m²/s", "ν")],
      steps: [
        step("Número de Reynolds", "Re = ρ·v·D / μ", `Re = ${f(rho)} kg/m³ × ${f(v)} m/s × ${f(D)} m / ${f(mu)} Pa·s`, `Re = ${f(Re)}`),
        step("Classificação", "Re < 2300 laminar  •  2300 ≤ Re < 4000 transição  •  Re ≥ 4000 turbulento", `Re = ${f(Re)}`, reg),
      ],
      explanation: [`O número de Reynolds vale ${f(Re)}, então o escoamento é classificado como: ${reg.toLowerCase()}.`, txt[reg]],
      warnings: w,
      viz: { Re, reg },
    };
  },
  formulas: ["Re = ρ·v·D / μ", "ν = μ / ρ", "Re = v·D / ν"],
  hypotheses: [
    "Limites 2300 e 4000 são aproximações usuais para tubos circulares.",
    "Rugosidade, vibrações e perturbações na entrada também afetam a transição.",
    "A viscosidade varia muito com a temperatura. Use propriedades na temperatura de operação.",
  ],
};

// ---------------------------------------------------------------- 11 PERDA DE CARGA
const perda: Calc = {
  slug: "perda-de-carga",
  num: "11",
  name: "Perda de Carga",
  category: "fluidos",
  icon: "TrendingDown",
  short: "Perda distribuída por Darcy-Weisbach.",
  desc: "Calcular a perda de carga distribuída e a queda de pressão por atrito em um trecho reto de tubulação.",
  hint: "Use o fator de atrito de Darcy (diagrama de Moody, Colebrook ou 64/Re no laminar).",
  keywords: "perda de carga darcy weisbach fator de atrito moody hf queda de pressao tubulacao",
  groups: [{ id: "dp", label: "Calcular a queda de pressão (informar densidade)", defaultOn: true }],
  fields: [
    { id: "fD", label: "Fator de atrito de Darcy", symbol: "f", qty: "none", unit: "adim.", rule: "pos" },
    { id: "L", label: "Comprimento da tubulação", symbol: "L", qty: "length", unit: "m", rule: "pos" },
    { id: "D", label: "Diâmetro interno", symbol: "D", qty: "length", unit: "mm", rule: "pos" },
    { id: "v", label: "Velocidade média", symbol: "v", qty: "velocity", unit: "m/s", rule: "nonneg" },
    { id: "g", label: "Aceleração da gravidade", symbol: "g", qty: "accel", unit: "m/s²", rule: "pos" },
    { id: "rho", label: "Densidade do fluido", symbol: "ρ", qty: "density", unit: "kg/m³", rule: "pos", group: "dp" },
  ],
  example: { groups: ["dp"], values: { fD: ["0,02", "adim."], L: ["10", "m"], D: ["50", "mm"], v: ["2", "m/s"], g: ["9,81", "m/s²"], rho: ["1000", "kg/m³"] } },
  compute(i, f) {
    const { fD, L, D, v, g } = i.si;
    const vh = (v * v) / (2 * g), hf = fD * (L / D) * vh;
    const others: ResultItem[] = [item("Relação comprimento/diâmetro", L / D, "", "L/D"), item("Carga cinética", vh, "m", "v²/2g")];
    const steps = [step("Perda de carga", "hf = f·(L/D)·v² / (2·g)", `hf = ${f(fD)} × (${f(L)} m / ${f(D)} m) × (${f(v)} m/s)² / (2 × ${f(g)} m/s²)`, `hf = ${f(hf)} m`)];
    const exp = [`O atrito ao longo de ${f(L)} m consome uma energia equivalente a ${f(hf)} m de coluna do próprio fluido.`];
    let dp: number | null = null;
    if (i.groups.has("dp")) {
      dp = i.si.rho * g * hf;
      others.unshift(item("Queda de pressão por atrito", dp / 1e3, "kPa", "Δp"), item("Queda de pressão por atrito", dp, "Pa", "Δp"));
      steps.push(step("Queda de pressão", "Δp = ρ·g·hf", `Δp = ${f(i.si.rho)} kg/m³ × ${f(g)} m/s² × ${f(hf)} m`, `Δp = ${f(dp)} Pa = ${f(dp / 1e3)} kPa`));
      exp.push(`Em termos de pressão, o trecho perde ${f(dp / 1e3)} kPa, que a bomba precisa repor.`);
    }
    const w: string[] = [];
    if (fD > 0.1) w.push("Fator de Darcy acima de 0,1. Valores usuais ficam entre 0,008 e 0,1.");
    if (fD < 0.006) w.push("Fator baixo para Darcy. Se o valor veio do fator de Fanning, multiplique por 4.");
    return { main: item("Perda de carga distribuída", hf, "m", "hf"), others, steps, explanation: exp, warnings: w, viz: { hf, dp: dp === null ? null : dp / 1e3 } };
  },
  formulas: ["hf = f·(L/D)·v²/(2g)", "Δp = ρ·g·hf", "f = 64/Re (laminar)"],
  hypotheses: [
    "Fator de atrito de Darcy, e não o de Fanning (fDarcy = 4·fFanning).",
    "Só perdas distribuídas em trecho reto. Válvulas, curvas e conexões não estão incluídas.",
    "Escoamento permanente, incompressível, tubo cheio e de seção constante.",
  ],
};

// ---------------------------------------------------------------- 12 CONDUÇÃO
const conducao: Calc = {
  slug: "conducao",
  num: "12",
  name: "Condução de Calor",
  category: "calor",
  icon: "Thermometer",
  short: "Condução em parede plana pela Lei de Fourier.",
  desc: "Calcular a taxa de calor por condução através de uma parede plana, a resistência térmica e o fluxo de calor.",
  hint: "T₁ e T₂ são as temperaturas das faces da parede. Podem ser negativas em °C.",
  keywords: "conducao fourier parede plana condutividade termica resistencia termica fluxo de calor",
  fields: [
    { id: "k", label: "Condutividade térmica", symbol: "k", qty: "conductivity", unit: "W/(m·K)", rule: "pos" },
    { id: "A", label: "Área de transferência", symbol: "A", qty: "area", unit: "m²", rule: "pos" },
    { id: "L", label: "Espessura da parede", symbol: "L", qty: "length", unit: "mm", rule: "pos" },
    { id: "T1", label: "Temperatura do lado 1", symbol: "T₁", qty: "temp", unit: "°C", rule: "absTemp" },
    { id: "T2", label: "Temperatura do lado 2", symbol: "T₂", qty: "temp", unit: "°C", rule: "absTemp" },
  ],
  presetLabel: "Material (≈ 25 °C)",
  presets: [
    { label: "Isopor ≈ 0,033", values: { k: ["0,033", "W/(m·K)"] } },
    { label: "Tijolo ≈ 0,72", values: { k: ["0,72", "W/(m·K)"] } },
    { label: "Vidro ≈ 0,78", values: { k: ["0,78", "W/(m·K)"] } },
    { label: "Concreto ≈ 1,4", values: { k: ["1,4", "W/(m·K)"] } },
    { label: "Aço carbono ≈ 43", values: { k: ["43", "W/(m·K)"] } },
    { label: "Alumínio ≈ 237", values: { k: ["237", "W/(m·K)"] } },
    { label: "Cobre ≈ 401", values: { k: ["401", "W/(m·K)"] } },
  ],
  example: { values: { k: ["0,8", "W/(m·K)"], A: ["2", "m²"], L: ["100", "mm"], T1: ["50", "°C"], T2: ["20", "°C"] } },
  compute(i, f) {
    const { k, A, L, T1, T2 } = i.si;
    const dT = T1 - T2, Rt = L / (k * A), Q = dT / Rt, q = Q / A;
    const sentido = Q > 0 ? "Do lado 1 para o lado 2" : Q < 0 ? "Do lado 2 para o lado 1" : "Sem transferência líquida";
    return {
      main: item("Taxa de calor", Q, "W", "Q̇"),
      others: [
        item("Sentido do calor", sentido),
        item("Módulo da taxa de calor", Math.abs(Q), "W", "|Q̇|"),
        item("Resistência térmica", Rt, "K/W", "Rt"),
        item("Fluxo de calor", q, "W/m²", "q″"),
      ],
      steps: [
        step("Diferença de temperatura", "ΔT = T₁ − T₂", `ΔT = ${f(T1)} K − ${f(T2)} K`, `ΔT = ${f(dT)} K`),
        step("Resistência térmica", "Rt = L / (k·A)", `Rt = ${f(L)} m / (${f(k)} W/(m·K) × ${f(A)} m²)`, `Rt = ${f(Rt)} K/W`),
        step("Taxa de calor", "Q̇ = ΔT / Rt = k·A·(T₁ − T₂) / L", `Q̇ = ${f(dT)} K / ${f(Rt)} K/W`, `Q̇ = ${f(Q)} W`),
        step("Fluxo de calor", "q″ = Q̇ / A", `q″ = ${f(Q)} W / ${f(A)} m²`, `q″ = ${f(q)} W/m²`),
      ],
      explanation: [
        Q === 0 ? "As duas faces estão na mesma temperatura, então não há fluxo líquido de calor." : `O calor atravessa a parede ${Q > 0 ? "do lado 1 para o lado 2" : "do lado 2 para o lado 1"}, sempre do lado mais quente para o mais frio, a uma taxa de ${f(Math.abs(Q))} W.`,
        "Pense na resistência térmica como um registro: quanto mais espessa a parede ou menor a condutividade, maior a resistência e menor o calor que passa.",
      ],
      warnings: [],
      viz: { T1: T1 - 273.15, T2: T2 - 273.15, Q },
    };
  },
  formulas: ["Q̇ = k·A·(T₁ − T₂) / L", "Rt = L / (k·A)", "q″ = Q̇ / A"],
  hypotheses: [
    "Condução unidimensional, regime permanente e condutividade constante.",
    "Sem geração interna de calor. Não inclui convecção nem radiação nas faces.",
    "Para paredes compostas, some as resistências térmicas em série.",
  ],
};

export const CALCS: Calc[] = [forcas, tensao, deformacao, torcao, potencia, gases, rendimento, hidrostatica, vazao, reynolds, perda, conducao];

export function getCalc(slug: string): Calc | undefined {
  return CALCS.find((c) => c.slug === slug);
}
