'use client';

import type { StageStatItem } from '@/lib/ghl';

// Etapas do bloco de avaliação formal (recebem accent diferenciado)
const EVAL_STAGE_NAMES = new Set(['APS', 'ER1', 'PPS', 'DPS', 'NPS', 'NCPS']);

interface FunnelChartProps {
  stages: StageStatItem[]; // apenas as 13 etapas do funil ativo
}

function ConversionBadge({ from, to }: { from: number; to: number }) {
  if (from === 0) return null;
  const pct = Math.round((to / from) * 100);
  let color: string, bg: string;
  if (pct >= 60)      { color = '#74FAA5'; bg = '#74FAA518'; }
  else if (pct >= 25) { color = '#f0c040'; bg = '#f0c04018'; }
  else                { color = '#e08888'; bg = '#e0555518'; }

  return (
    <span
      aria-label={`Conversão da etapa anterior: ${pct}%`}
      style={{ background: bg, color, fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}
    >
      ↓ {pct}%
    </span>
  );
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div
      role="region"
      aria-label="Funil de recrutamento ativo"
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8628',
        borderRadius: 16,
        padding: '24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h2 style={{ color: '#f0f4f8', fontSize: 15, fontWeight: 600, margin: 0 }}>
          Funil Ativo
        </h2>
        <span style={{ color: '#4a6478', fontSize: 11 }}>
          {stages.reduce((s, e) => s + e.count, 0)} candidatos em processo
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {stages.map((stage, idx) => {
          const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const isEval = EVAL_STAGE_NAMES.has(stage.stageName);
          const barColor = isEval ? '#5dd4c5' : '#74FAA5';
          const dotColor = isEval ? '#5dd4c5' : '#74FAA5';
          const prev = stages[idx - 1];

          return (
            <div key={stage.stageId} style={{ paddingBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div
                    style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <span style={{ color: '#c0d0e0', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stage.stageName}
                  </span>
                  {prev && <ConversionBadge from={prev.count} to={stage.count} />}
                </div>
                <span style={{ color: '#eef4f8', fontWeight: 700, fontSize: 14, marginLeft: 8, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {stage.count}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={stage.count}
                aria-valuemax={maxCount}
                aria-label={`${stage.stageName}: ${stage.count}`}
                style={{ height: 7, background: '#1a2a3a', borderRadius: 4, overflow: 'hidden' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}, ${barColor}77)`,
                    borderRadius: 4,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
