"use client";

import type { FormState } from "@/lib/engine";
import { formatNumber } from "@/lib/number";

const NAVY = "#142d4e";
const BLUE = "#2563eb";
const GREEN = "#16a34a";
const MUTED = "#64748b";
const ORANGE = "#c2410c";

type V = Record<string, unknown>;

function Arrow({ x1, y1, x2, y2, color = BLUE, w = 2.2 }: { x1: number; y1: number; x2: number; y2: number; color?: string; w?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 8;
  const p1 = `${x2},${y2}`;
  const p2 = `${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)}`;
  const p3 = `${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}`;
  const len = Math.hypot(x2 - x1, y2 - y1);
  return (
    <g>
      {len > h && <line x1={x1} y1={y1} x2={x2 - (h - 2) * Math.cos(a)} y2={y2 - (h - 2) * Math.sin(a)} stroke={color} strokeWidth={w} strokeLinecap="round" />}
      <polygon points={`${p1} ${p2} ${p3}`} fill={color} />
    </g>
  );
}

function T({ x, y, children, color = NAVY, anchor = "middle", size = 12, bold = false }: { x: number; y: number; children: React.ReactNode; color?: string; anchor?: "start" | "middle" | "end"; size?: number; bold?: boolean }) {
  return (
    <text x={x} y={y} fill={color} fontSize={size} fontWeight={bold ? 700 : 500} textAnchor={anchor} fontFamily="inherit">
      {children}
    </text>
  );
}

export function Diagram({ slug, viz, st, dec }: { slug: string; viz: V; st: FormState; dec: number }) {
  const n = (x: number) => formatNumber(x, Math.min(dec, 3));
  const raw = (id: string) => `${st.values[id] ?? ""} ${st.units[id] ?? ""}`.trim();
  const box = { viewBox: "0 0 340 190", className: "h-auto w-full", role: "img" as const };

  switch (slug) {
    case "forcas": {
      const vecs = viz.vecs as { F: number; ang: number }[];
      const R = viz.R as number, th = viz.th as number | null;
      const max = Math.max(R, ...vecs.map((v) => v.F)) || 1;
      const cx = 170, cy = 95, L = 78;
      const end = (F: number, a: number) => [cx + (F / max) * L * Math.cos((a * Math.PI) / 180), cy - (F / max) * L * Math.sin((a * Math.PI) / 180)];
      return (
        <svg {...box} aria-label="Forças e resultante no plano xy">
          <line x1={60} y1={cy} x2={285} y2={cy} stroke="#cbd5e1" />
          <line x1={cx} y1={10} x2={cx} y2={180} stroke="#cbd5e1" />
          <T x={292} y={cy + 4} color={MUTED} anchor="start">x</T>
          <T x={cx + 6} y={16} color={MUTED} anchor="start">y</T>
          {vecs.map((v, k) => {
            const [x, y] = end(v.F, v.ang);
            return (
              <g key={k}>
                <Arrow x1={cx} y1={cy} x2={x} y2={y} color={BLUE} />
                <T x={x + (x >= cx ? 6 : -6)} y={y + (y > cy ? 14 : -4)} color={BLUE} anchor={x >= cx ? "start" : "end"} size={11}>F{k + 1}</T>
              </g>
            );
          })}
          {th !== null && R > 0 && (() => {
            const [x, y] = end(R, th);
            return (
              <g>
                <Arrow x1={cx} y1={cy} x2={x} y2={y} color={GREEN} w={3.2} />
                <T x={x + (x >= cx ? 6 : -6)} y={y + (y > cy ? 16 : -6)} color={GREEN} anchor={x >= cx ? "start" : "end"} bold>R = {n(R)} {String(viz.unit)}</T>
              </g>
            );
          })()}
          {th === null && <T x={cx} y={182} color={MUTED}>Resultante nula</T>}
        </svg>
      );
    }
    case "tensao":
      return (
        <svg {...box} aria-label="Barra tracionada">
          <rect x={150} y={45} width={40} height={100} rx={3} fill="#dbe6fe" stroke={NAVY} strokeWidth={1.5} />
          <Arrow x1={170} y1={45} x2={170} y2={10} />
          <Arrow x1={170} y1={145} x2={170} y2={180} />
          <T x={182} y={22} anchor="start" color={BLUE} bold>F = {raw("F")}</T>
          <T x={182} y={176} anchor="start" color={BLUE} bold>F</T>
          <line x1={110} y1={95} x2={230} y2={95} stroke={ORANGE} strokeDasharray="4 3" />
          <T x={238} y={99} anchor="start" color={ORANGE}>seção A = {raw("A")}</T>
          <T x={100} y={99} anchor="end" color={GREEN} bold>σ = {n(viz.s as number)} MPa</T>
        </svg>
      );
    case "deformacao":
      return (
        <svg {...box} aria-label="Barra antes e depois do alongamento">
          <rect x={30} y={45} width={220} height={26} fill="#e2e8f0" stroke={MUTED} />
          <T x={140} y={38} color={MUTED}>L = {raw("L")} (antes)</T>
          <rect x={30} y={110} width={250} height={26} fill="#dbe6fe" stroke={NAVY} />
          <T x={140} y={155} color={NAVY}>depois da carga</T>
          <line x1={250} y1={40} x2={250} y2={145} stroke={ORANGE} strokeDasharray="3 3" />
          <line x1={280} y1={100} x2={280} y2={145} stroke={ORANGE} strokeDasharray="3 3" />
          <T x={265} y={176} color={GREEN} bold>ΔL = {n(viz.dL as number)} mm</T>
          <Arrow x1={282} y1={123} x2={325} y2={123} />
          <line x1={30} y1={40} x2={30} y2={145} stroke={NAVY} strokeWidth={4} />
        </svg>
      );
    case "torcao": {
      const phi = viz.phi as number | null;
      return (
        <svg {...box} aria-label="Eixo submetido a torque">
          <rect x={60} y={75} width={220} height={40} rx={6} fill="#dbe6fe" stroke={NAVY} strokeWidth={1.5} />
          <ellipse cx={60} cy={95} rx={10} ry={20} fill="#bfd3fb" stroke={NAVY} strokeWidth={1.5} />
          <path d="M 292 65 A 18 32 0 1 1 292 125" fill="none" stroke={BLUE} strokeWidth={2.2} />
          <Arrow x1={296} y1={122} x2={287} y2={126} />
          <T x={316} y={60} color={BLUE} bold>T</T>
          <T x={170} y={60} color={NAVY}>d = {raw("d")}</T>
          <T x={170} y={140} color={GREEN} bold>τmáx na superfície</T>
          {phi !== null && <T x={170} y={165} color={NAVY}>φ = {n((phi * 180) / Math.PI)}° em L = {raw("L")}</T>}
        </svg>
      );
    }
    case "potencia-torque":
      return (
        <svg {...box} aria-label="Eixo em rotação">
          <circle cx={120} cy={95} r={50} fill="#dbe6fe" stroke={NAVY} strokeWidth={1.5} />
          <circle cx={120} cy={95} r={10} fill={NAVY} />
          <path d="M 120 30 A 65 65 0 0 1 185 95" fill="none" stroke={BLUE} strokeWidth={2.4} />
          <Arrow x1={184} y1={88} x2={185} y2={97} />
          <T x={190} y={45} anchor="start" color={BLUE} bold>n = {n(viz.rpm as number)} RPM</T>
          <T x={210} y={110} anchor="start" color={NAVY}>T = {n(viz.T as number)} N·m</T>
          <T x={210} y={135} anchor="start" color={GREEN} bold>P = {n(viz.P as number)} kW</T>
        </svg>
      );
    case "gases-ideais":
      return (
        <svg {...box} aria-label="Gás em um recipiente">
          <rect x={90} y={40} width={150} height={125} fill="#f1f5f9" stroke={NAVY} strokeWidth={2} />
          <rect x={92} y={52} width={146} height={12} fill={MUTED} />
          <line x1={165} y1={52} x2={165} y2={14} stroke={MUTED} strokeWidth={5} />
          {[[120, 95], [150, 130], [200, 90], [210, 140], [130, 150], [180, 110]].map(([x, y], k) => (
            <circle key={k} cx={x} cy={y} r={4} fill={BLUE} opacity={0.6} />
          ))}
          <T x={250} y={80} anchor="start" color={NAVY}>p = {n(viz.p as number)} kPa</T>
          <T x={250} y={102} anchor="start" color={NAVY}>V = {n(viz.V as number)} m³</T>
          <T x={250} y={124} anchor="start" color={NAVY}>m = {n(viz.m as number)} kg</T>
          <T x={250} y={146} anchor="start" color={NAVY}>T = {n(viz.T as number)} °C</T>
        </svg>
      );
    case "rendimento": {
      const u = String(viz.unit);
      return (
        <svg {...box} aria-label="Máquina térmica entre duas fontes">
          <rect x={95} y={6} width={150} height={30} rx={6} fill="#fde2d4" stroke={ORANGE} />
          <T x={170} y={26} color={ORANGE} bold>Fonte quente</T>
          <circle cx={170} cy={95} r={28} fill="#dbe6fe" stroke={NAVY} strokeWidth={1.5} />
          <T x={170} y={99} color={NAVY} bold>Ciclo</T>
          <rect x={95} y={154} width={150} height={30} rx={6} fill="#dbeafe" stroke={BLUE} />
          <T x={170} y={174} color={BLUE} bold>Fonte fria</T>
          <Arrow x1={170} y1={37} x2={170} y2={66} color={ORANGE} />
          <Arrow x1={170} y1={124} x2={170} y2={153} color={BLUE} />
          <Arrow x1={199} y1={95} x2={250} y2={95} color={GREEN} w={3} />
          <T x={178} y={56} anchor="start" color={ORANGE}>Qent = {n(viz.Q as number)} {u}</T>
          <T x={178} y={143} anchor="start" color={BLUE}>Qsai = {n(viz.Qo as number)} {u}</T>
          <T x={256} y={92} anchor="start" color={GREEN} bold>W</T>
          <T x={256} y={108} anchor="start" color={GREEN}>{n(viz.W as number)} {u}</T>
          <T x={60} y={99} color={GREEN} bold>η = {n((viz.eta as number) * 100)} %</T>
        </svg>
      );
    }
    case "hidrostatica": {
      const pabs = viz.pabs as number | null;
      return (
        <svg {...box} aria-label="Tanque com líquido e ponto em profundidade">
          <path d="M 60 30 L 60 170 L 220 170 L 220 30" fill="none" stroke={NAVY} strokeWidth={2} />
          <rect x={61} y={50} width={158} height={119} fill="#bfdbfe" opacity={0.7} />
          <line x1={61} y1={50} x2={219} y2={50} stroke={BLUE} strokeWidth={2} />
          <circle cx={150} cy={130} r={5} fill={GREEN} />
          <line x1={240} y1={50} x2={240} y2={130} stroke={ORANGE} />
          <line x1={234} y1={50} x2={246} y2={50} stroke={ORANGE} />
          <line x1={234} y1={130} x2={246} y2={130} stroke={ORANGE} />
          <T x={250} y={94} anchor="start" color={ORANGE}>h = {raw("h")}</T>
          <T x={140} y={22} color={MUTED}>superfície {pabs !== null ? `(p₀ = ${raw("p0")})` : ""}</T>
          <T x={140} y={152} color={GREEN} bold>Δp = {n(viz.dp as number)} kPa</T>
          {pabs !== null && <T x={140} y={186} color={NAVY}>p = {n(pabs)} kPa (absoluta)</T>}
        </svg>
      );
    }
    case "vazao":
      return (
        <svg {...box} aria-label="Tubo com escoamento">
          <rect x={30} y={60} width={250} height={70} fill="#dbeafe" stroke={NAVY} strokeWidth={2} />
          <ellipse cx={280} cy={95} rx={14} ry={35} fill="#bfdbfe" stroke={NAVY} strokeWidth={2} />
          {[78, 95, 112].map((y) => (
            <Arrow key={y} x1={70} y1={y} x2={150} y2={y} />
          ))}
          <T x={110} y={52} color={BLUE} bold>v = {raw("v")}</T>
          <line x1={310} y1={60} x2={310} y2={130} stroke={ORANGE} />
          <T x={314} y={99} anchor="start" color={ORANGE} size={11}>D</T>
          <T x={170} y={160} color={NAVY}>D = {raw("D")}</T>
          <T x={170} y={182} color={GREEN} bold>vazão Q = A·v</T>
        </svg>
      );
    case "reynolds": {
      const Re = viz.Re as number;
      const lo = 1, hi = 6;
      const x = (re: number) => 30 + ((Math.min(Math.max(Math.log10(Math.max(re, 10)), lo), hi) - lo) / (hi - lo)) * 280;
      return (
        <svg {...box} aria-label="Escala de regimes de escoamento">
          <rect x={30} y={80} width={x(2300) - 30} height={26} fill="#bbf7d0" />
          <rect x={x(2300)} y={80} width={x(4000) - x(2300)} height={26} fill="#fde68a" />
          <rect x={x(4000)} y={80} width={310 - x(4000)} height={26} fill="#fecaca" />
          <T x={(30 + x(2300)) / 2} y={98} color={"#166534"} bold>Laminar</T>
          <T x={(x(4000) + 310) / 2} y={98} color={"#991b1b"} bold>Turbulento</T>
          <T x={x(2300)} y={124} size={10} color={MUTED}>2300</T>
          <T x={x(4000) + 4} y={136} size={10} color={MUTED}>4000</T>
          <T x={30} y={124} size={10} color={MUTED}>10</T>
          <T x={310} y={124} size={10} color={MUTED}>10⁶</T>
          {Re > 0 && (
            <g>
              <polygon points={`${x(Re)},76 ${x(Re) - 7},62 ${x(Re) + 7},62`} fill={NAVY} />
              <T x={x(Re)} y={54} color={NAVY} bold>Re = {n(Re)}</T>
            </g>
          )}
          <T x={170} y={168} color={MUTED} size={11}>escala logarítmica • transição entre 2300 e 4000</T>
        </svg>
      );
    }
    case "perda-de-carga": {
      const dp = viz.dp as number | null;
      return (
        <svg {...box} aria-label="Linha de energia caindo ao longo do tubo">
          <rect x={30} y={120} width={280} height={34} fill="#dbeafe" stroke={NAVY} strokeWidth={2} />
          <line x1={30} y1={40} x2={310} y2={90} stroke={GREEN} strokeWidth={2.5} />
          <T x={40} y={34} anchor="start" color={GREEN}>linha de energia</T>
          <line x1={310} y1={40} x2={310} y2={90} stroke={ORANGE} strokeDasharray="3 3" />
          <line x1={250} y1={40} x2={318} y2={40} stroke={MUTED} strokeDasharray="2 3" />
          <T x={302} y={70} anchor="end" color={ORANGE} bold>hf = {n(viz.hf as number)} m</T>
          <T x={170} y={176} color={NAVY}>L = {raw("L")}  •  D = {raw("D")}</T>
          {dp !== null && <T x={170} y={110} color={NAVY}>Δp = {n(dp)} kPa</T>}
        </svg>
      );
    }
    case "conducao": {
      const t1 = viz.T1 as number, t2 = viz.T2 as number, Q = viz.Q as number;
      const hot = (t: number) => (t >= Math.max(t1, t2) ? "#fb923c" : "#60a5fa");
      return (
        <svg {...box} aria-label="Parede plana com calor atravessando">
          <defs>
            <linearGradient id="g12" x1="0" x2="1">
              <stop offset="0" stopColor={hot(t1)} />
              <stop offset="1" stopColor={hot(t2)} />
            </linearGradient>
          </defs>
          <rect x={130} y={25} width={80} height={130} fill="url(#g12)" stroke={NAVY} strokeWidth={1.5} />
          <T x={80} y={95} color={NAVY} bold>T₁ = {n(t1)} °C</T>
          <T x={262} y={95} color={NAVY} bold>T₂ = {n(t2)} °C</T>
          {Q !== 0 && (Q > 0 ? <Arrow x1={140} y1={120} x2={200} y2={120} color={ORANGE} w={3} /> : <Arrow x1={200} y1={120} x2={140} y2={120} color={ORANGE} w={3} />)}
          <T x={170} y={175} color={GREEN} bold>Q̇ = {n(Q)} W</T>
          <T x={170} y={18} color={MUTED}>L = {raw("L")}</T>
        </svg>
      );
    }
    default:
      return null;
  }
}
