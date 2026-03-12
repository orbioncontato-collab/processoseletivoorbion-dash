'use client';

import type { Opportunity } from '@/lib/ghl';
import { STAGE_IDS, NEGATIVE_STAGE_IDS, RESERVE_STAGE_IDS } from '@/lib/ghl';

interface RecentCandidatesProps {
  opportunities: Opportunity[];
}

function stageBadge(stageId: string, stageName: string) {
  if (stageId === STAGE_IDS.CONTRATADOS)
    return { color: '#74FAA5', bg: '#74FAA514' };
  if (NEGATIVE_STAGE_IDS.has(stageId))
    return { color: '#e08888', bg: '#e0555514' };
  if (RESERVE_STAGE_IDS.has(stageId))
    return { color: '#f0c040', bg: '#f0c04014' };
  return { color: '#7ec8f0', bg: '#295D8618' };
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#1d4870', '#1a4a44', '#2a3d5e', '#2e4a3a', '#3a2e5e'];

export function RecentCandidates({ opportunities }: RecentCandidatesProps) {
  const items = opportunities.slice(0, 5);

  return (
    <section
      aria-label="Candidatos recentes"
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8628',
        borderRadius: 16,
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <h2 style={{ color: '#f0f4f8', fontSize: 13, fontWeight: 600, margin: 0 }}>
          Candidatos Recentes
        </h2>
        <span style={{ color: '#4a6478', fontSize: 10 }}>
          Últimas {items.length} entradas
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: '#4a6478', fontSize: 12 }} role="status">
          Nenhum candidato encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((opp, idx) => {
            const name = opp.contact?.name ?? opp.name ?? '—';
            const badge = stageBadge(opp.pipelineStageId, opp.pipelineStageName ?? '');
            const av = AVATAR_COLORS[idx % AVATAR_COLORS.length];

            return (
              <div
                key={opp.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 0',
                  borderBottom: idx < items.length - 1 ? '1px solid #1a2a3a20' : 'none',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 26, height: 26, borderRadius: '50%', background: av,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: '#c8e0f0', flexShrink: 0,
                  }}
                >
                  {initials(name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#dce8f4', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </div>
                </div>
                <span style={{
                  background: badge.bg, color: badge.color, fontSize: 10,
                  padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}>
                  {opp.pipelineStageName ?? '—'}
                </span>
                <span style={{ color: '#4a6070', fontSize: 10, flexShrink: 0 }}>
                  {formatDate(opp.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
