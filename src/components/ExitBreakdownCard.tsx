'use client';

import type { StageStatItem } from '@/lib/ghl';

interface ExitBreakdownCardProps {
  exitStats: StageStatItem[];
  reserveStats: StageStatItem[];
  exitTotal: number;
  reserveTotal: number;
}

function MiniRow({
  name,
  count,
  color,
  bg,
  total,
}: {
  name: string;
  count: number;
  color: string;
  bg: string;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <div
        style={{
          minWidth: 28,
          height: 28,
          borderRadius: 6,
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color,
          flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {count}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#b0c4d8', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </span>
          <span style={{ color: '#4a6070', fontSize: 10, flexShrink: 0, marginLeft: 4 }}>
            {pct}%
          </span>
        </div>
        <div style={{ height: 4, background: '#1a2a3a', borderRadius: 2, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${pct}%`,
              background: color,
              borderRadius: 2,
              transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingBottom: 8,
        borderBottom: `1px solid ${color}22`,
      }}
    >
      <span style={{ color: '#6b84a0', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
      </span>
      <span style={{ color, fontWeight: 700, fontSize: 20, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </div>
  );
}

export function ExitBreakdownCard({ exitStats, reserveStats, exitTotal, reserveTotal }: ExitBreakdownCardProps) {
  return (
    <div
      role="region"
      aria-label="Saídas e reserva do funil"
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8628',
        borderRadius: 16,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Saídas negativas */}
      <div>
        <SectionTitle label="Saídas do Funil" count={exitTotal} color="#e08888" />
        <div>
          {exitStats.map((s) => (
            <MiniRow
              key={s.stageId}
              name={s.stageName}
              count={s.count}
              color="#e08888"
              bg="#e0555518"
              total={exitTotal}
            />
          ))}
        </div>
      </div>

      {/* Divisor */}
      <div style={{ height: 1, background: '#1a2a3a' }} aria-hidden="true" />

      {/* Reserva */}
      <div>
        <SectionTitle label="Banco de Talentos" count={reserveTotal} color="#f0c040" />
        <div>
          {reserveStats.map((s) => (
            <MiniRow
              key={s.stageId}
              name={s.stageName}
              count={s.count}
              color="#f0c040"
              bg="#f0c04018"
              total={reserveTotal}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
