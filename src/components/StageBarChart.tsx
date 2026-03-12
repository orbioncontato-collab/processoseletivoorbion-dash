'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface StageBarChartProps {
  stages: { stageName: string; count: number }[];
}

const COLORS = ['#74FAA5', '#5dd4c5', '#4ab8c8', '#3d9dbf', '#3484b2', '#295D86', '#265C58'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#0d1829',
        border: '1px solid #295D86',
        borderRadius: 8,
        padding: '10px 14px',
      }}
    >
      <p style={{ color: '#8ca0b8', fontSize: 12, margin: 0 }}>{payload[0].payload.stageName}</p>
      <p style={{ color: '#74FAA5', fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>
        {payload[0].value}
      </p>
    </div>
  );
}

export function StageBarChart({ stages }: StageBarChartProps) {
  const data = stages.map((s) => ({
    ...s,
    name: s.stageName.length > 14 ? s.stageName.slice(0, 12) + '…' : s.stageName,
  }));

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8633',
        borderRadius: 16,
        padding: '28px',
      }}
    >
      <h2 style={{ color: '#f0f4f8', fontSize: 16, fontWeight: 600, margin: '0 0 24px 0' }}>
        Candidatos por Etapa
      </h2>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" horizontal vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#6b84a0', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            angle={-20}
            textAnchor="end"
          />
          <YAxis
            tick={{ fill: '#6b84a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff08' }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
