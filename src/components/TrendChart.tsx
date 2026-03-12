'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartProps {
  data: { date: string; count: number }[];
}

function formatDate(dateStr: string) {
  const [, , dd] = dateStr.split('-');
  return `${dd}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
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
      <p style={{ color: '#8ca0b8', fontSize: 12, margin: 0 }}>{label}</p>
      <p style={{ color: '#74FAA5', fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>
        {payload[0].value} candidatos
      </p>
    </div>
  );
}

export function TrendChart({ data }: TrendChartProps) {
  const formatted = data.map((d) => ({ ...d, day: formatDate(d.date) }));

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
        Novos Candidatos — últimos 14 dias
      </h2>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#74FAA5" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#74FAA5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: '#6b84a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b84a0', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#74FAA5"
            strokeWidth={2.5}
            fill="url(#colorCount)"
            dot={{ fill: '#74FAA5', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#74FAA5', stroke: '#0A1123', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
