'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Slice {
  name: string;
  value: number;
  color: string;
}

interface DistributionChartProps {
  slices: Slice[];
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#0c1826', border: '1px solid #295D86', borderRadius: 8,
      padding: '10px 14px', minWidth: 120,
    }}>
      <p style={{ color: d.color, fontSize: 12, fontWeight: 600, margin: '0 0 2px' }}>{d.name}</p>
      <p style={{ color: '#eef4f8', fontSize: 18, fontWeight: 700, margin: 0 }}>{d.value}</p>
    </div>
  );
}

export function DistributionChart({ slices, total }: DistributionChartProps) {
  return (
    <div
      role="region"
      aria-label="Distribuição de candidatos"
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8628',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2 style={{ color: '#f0f4f8', fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>
        Distribuição Geral
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Donut */}
        <div style={{ width: 150, height: 150, position: 'relative', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {slices.map((s) => (
                  <Cell key={s.name} fill={s.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ color: '#eef4f8', fontSize: 20, fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {total}
            </div>
            <div style={{ color: '#4a6478', fontSize: 9, marginTop: 2 }}>total</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          {slices.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
            return (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                <span style={{ color: '#8ca0b8', fontSize: 12, flex: 1 }}>{s.name}</span>
                <span style={{ color: '#eef4f8', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {s.value}
                </span>
                <span style={{ color: '#4a6478', fontSize: 10, width: 30, textAlign: 'right' }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
