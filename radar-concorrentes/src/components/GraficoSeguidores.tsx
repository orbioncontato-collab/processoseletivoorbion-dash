"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CORES = ["#0a1123", "#1f9d57", "#295d86", "#d97706", "#7c3aed", "#db2777", "#0891b2", "#65a30d"];

export function GraficoSeguidores({ series }: { series: { username: string; pontos: { data: string; seguidores: number }[] }[] }) {
  const datas = [...new Set(series.flatMap((s) => s.pontos.map((p) => p.data)))].sort();
  const linhas = datas.map((data) => {
    const linha: Record<string, string | number> = { data: data.slice(5).split("-").reverse().join("/") };
    for (const s of series) {
      const ponto = s.pontos.find((p) => p.data === data);
      if (ponto) linha[s.username] = ponto.seguidores;
    }
    return linha;
  });

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={linhas} margin={{ left: 8, right: 8, top: 8 }}>
          <CartesianGrid stroke="#eef2f7" vertical={false} />
          <XAxis dataKey="data" tick={{ fontSize: 11 }} stroke="#94a3b8" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="#94a3b8"
            width={48}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip formatter={(v) => Number(v).toLocaleString("pt-BR")} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s, i) => (
            <Line key={s.username} type="monotone" dataKey={s.username} stroke={CORES[i % CORES.length]} strokeWidth={2} dot={{ r: 2 }} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
