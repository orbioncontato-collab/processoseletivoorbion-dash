'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { StageStatItem } from '@/lib/ghl';

interface StageBarChartProps {
  activeFunnelStats: StageStatItem[];
  exitStats: StageStatItem[];
  reserveStats: StageStatItem[];
}

function abbrev(name: string, max = 6) {
  return name.length > max ? name.slice(0, max - 1) + '…' : name;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const categoryLabel =
    d.category === 'active'   ? 'Funil Ativo'        :
    d.category === 'reserve'  ? 'Banco de Talentos'  :
                                'Saída';
  const categoryColor =
    d.category === 'active'   ? '#74FAA5' :
    d.category === 'reserve'  ? '#f0c040' :
                                '#e08888';

  return (
    <div style={{ background: '#0c1826', border: '1px solid #295D86', borderRadius: 8, padding: '10px 14px', minWidth: 160 }}>
      <p style={{ color: '#6b84a0', fontSize: 11, margin: '0 0 2px' }}>{d.fullName}</p>
      <p style={{ color: categoryColor, fontSize: 10, margin: '0 0 6px', fontWeight: 500 }}>{categoryLabel}</p>
      <p style={{ color: '#f0f4f8', fontWeight: 700, fontSize: 20, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
        {d.count}
      </p>
    </div>
  );
}

export function StageBarChart({ activeFunnelStats, exitStats, reserveStats }: StageBarChartProps) {
  // Monta dados combinados com metadados de categoria
  const data = [
    ...activeFunnelStats.map((s) => ({ ...s, fullName: s.stageName, name: abbrev(s.stageName), category: 'active' })),
    { stageId: '__sep1', stageName: '', fullName: '', name: '', count: 0, position: -1, category: 'sep' },
    ...reserveStats.map((s) => ({ ...s, fullName: s.stageName, name: abbrev(s.stageName), category: 'reserve' })),
    { stageId: '__sep2', stageName: '', fullName: '', name: '', count: 0, position: -1, category: 'sep' },
    ...exitStats.map((s) => ({ ...s, fullName: s.stageName, name: abbrev(s.stageName), category: 'negative' })),
  ];

  // Posições dos separadores no eixo X
  const sep1Idx = activeFunnelStats.length;
  const sep2Idx = activeFunnelStats.length + 1 + reserveStats.length;

  return (
    <div
      role="region"
      aria-label="Visão geral de candidatos por etapa"
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8628',
        borderRadius: 16,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h2 style={{ color: '#f0f4f8', fontSize: 15, fontWeight: 600, margin: 0 }}>
          Visão Geral por Etapa
        </h2>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { color: '#74FAA5', label: 'Funil ativo' },
            { color: '#f0c040', label: 'Reserva' },
            { color: '#e08888', label: 'Saídas' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} aria-hidden="true" />
              <span style={{ color: '#6b84a0', fontSize: 11 }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 24 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2a3a" horizontal vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#5a7080', fontSize: 9 }}
            axisLine={false}
            tickLine={false}
            angle={-35}
            textAnchor="end"
          />
          <YAxis tick={{ fill: '#5a7080', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff06' }} />
          {/* Linhas de separação entre categorias */}
          <ReferenceLine x={data[sep1Idx]?.name} stroke="#295D8640" strokeDasharray="4 4" />
          <ReferenceLine x={data[sep2Idx]?.name} stroke="#295D8640" strokeDasharray="4 4" />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => {
              const color =
                entry.category === 'active'   ? '#74FAA5' :
                entry.category === 'reserve'  ? '#f0c040' :
                entry.category === 'negative' ? '#e08888' :
                                                'transparent';
              return <Cell key={entry.stageId} fill={color} fillOpacity={entry.category === 'sep' ? 0 : 0.85} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
