'use client';

interface StageData {
  stageId: string;
  stageName: string;
  count: number;
  position: number;
}

interface FunnelChartProps {
  stages: StageData[];
}

const STAGE_COLORS = [
  '#74FAA5',
  '#60e892',
  '#4dcf80',
  '#3db86e',
  '#2ea05d',
  '#295D86',
  '#265C58',
];

function ConversionBadge({ from, to }: { from: number; to: number }) {
  if (from === 0) return null;
  const pct = Math.round((to / from) * 100);

  let bg: string, color: string;
  if (pct >= 60) { bg = '#74FAA522'; color = '#74FAA5'; }
  else if (pct >= 30) { bg = '#f0c04022'; color = '#f0c040'; }
  else { bg = '#e0555522'; color = '#e08888'; }

  return (
    <span
      aria-label={`Taxa de conversão da etapa anterior: ${pct}%`}
      style={{
        background: bg,
        color,
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 7px',
        borderRadius: 4,
        whiteSpace: 'nowrap',
      }}
    >
      ↓ {pct}%
    </span>
  );
}

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  // Filter stages with any activity for relevance, but keep all for completeness
  const active = stages.filter((s) => s.count > 0);
  const inactive = stages.filter((s) => s.count === 0);

  return (
    <div
      role="region"
      aria-label="Funil de candidatos por etapa"
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8633',
        borderRadius: 16,
        padding: '28px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
        <h2 style={{ color: '#f0f4f8', fontSize: 15, fontWeight: 600, margin: 0 }}>
          Funil por Etapa
        </h2>
        <span style={{ color: '#6b84a0', fontSize: 11 }}>
          {active.length}/{stages.length} etapas ativas
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {active.map((stage, idx) => {
          const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const color = STAGE_COLORS[idx % STAGE_COLORS.length];
          const prevActive = active[idx - 1];

          return (
            <div key={stage.stageId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div
                    style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      color: '#c0d0e0',
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {stage.stageName}
                  </span>
                  {prevActive && (
                    <ConversionBadge from={prevActive.count} to={stage.count} />
                  )}
                </div>
                <span style={{ color: '#f0f4f8', fontWeight: 700, fontSize: 15, marginLeft: 8, flexShrink: 0 }}>
                  {stage.count}
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuenow={stage.count}
                aria-valuemax={maxCount}
                aria-label={`${stage.stageName}: ${stage.count} candidatos`}
                style={{ height: 8, background: '#1a2a3a', borderRadius: 4, overflow: 'hidden' }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}88)`,
                    borderRadius: 4,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }}
                />
              </div>
            </div>
          );
        })}

        {inactive.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary
              style={{
                color: '#4a6478',
                fontSize: 12,
                cursor: 'pointer',
                userSelect: 'none',
                listStyle: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 10 }}>▶</span>
              {inactive.length} etapa{inactive.length > 1 ? 's' : ''} sem candidatos
            </summary>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {inactive.map((stage) => (
                <div
                  key={stage.stageId}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2a3a4a', flexShrink: 0 }} />
                    <span style={{ color: '#4a6478', fontSize: 12 }}>{stage.stageName}</span>
                  </div>
                  <span style={{ color: '#4a6478', fontSize: 12 }}>0</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
