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
  '#5dd4c5',
  '#4ab8c8',
  '#3d9dbf',
  '#3484b2',
  '#295D86',
  '#265C58',
];

export function FunnelChart({ stages }: FunnelChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8633',
        borderRadius: 16,
        padding: '28px',
      }}
    >
      <h2 style={{ color: '#f0f4f8', fontSize: 16, fontWeight: 600, marginBottom: 24, margin: '0 0 24px 0' }}>
        Funil por Etapa
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {stages.map((stage, idx) => {
          const pct = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
          const color = STAGE_COLORS[idx % STAGE_COLORS.length];
          const prevCount = idx > 0 ? stages[idx - 1].count : stage.count;
          const convPct = prevCount > 0 && idx > 0 ? Math.round((stage.count / prevCount) * 100) : null;

          return (
            <div key={stage.stageId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ color: '#c0d0e0', fontSize: 13 }}>{stage.stageName}</span>
                  {convPct !== null && (
                    <span style={{
                      background: convPct >= 50 ? '#74FAA522' : '#e0555522',
                      color: convPct >= 50 ? '#74FAA5' : '#e08888',
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                    }}>
                      {convPct}% conv.
                    </span>
                  )}
                </div>
                <span style={{ color: '#f0f4f8', fontWeight: 700, fontSize: 15 }}>{stage.count}</span>
              </div>

              <div style={{ height: 10, background: '#1a2a3a', borderRadius: 5, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${color}, ${color}99)`,
                    borderRadius: 5,
                    transition: 'width 0.6s ease',
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
