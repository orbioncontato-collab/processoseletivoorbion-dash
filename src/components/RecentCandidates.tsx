'use client';

import type { Opportunity } from '@/lib/ghl';
import { STAGE_IDS, NEGATIVE_STAGE_IDS, RESERVE_STAGE_IDS } from '@/lib/ghl';

interface RecentCandidatesProps {
  opportunities: Opportunity[];
}

function stageBadge(stageId: string, stageName: string) {
  if (stageId === STAGE_IDS.CONTRATADOS)
    return { label: 'Contratado',    color: '#74FAA5', bg: '#74FAA514' };
  if (NEGATIVE_STAGE_IDS.has(stageId))
    return { label: stageName,       color: '#e08888', bg: '#e0555514' };
  if (RESERVE_STAGE_IDS.has(stageId))
    return { label: stageName,       color: '#f0c040', bg: '#f0c04014' };
  return   { label: 'Em Andamento', color: '#7ec8f0', bg: '#295D8618' };
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

const AVATAR_COLORS = ['#1d4870', '#1a4a44', '#2a3d5e', '#2e4a3a', '#3a2e5e'];

export function RecentCandidates({ opportunities }: RecentCandidatesProps) {
  return (
    <section
      aria-label="Candidatos recentes"
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8628',
        borderRadius: 16,
        padding: '24px 28px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <h2 style={{ color: '#f0f4f8', fontSize: 15, fontWeight: 600, margin: 0 }}>
          Candidatos Recentes
        </h2>
        <span style={{ color: '#4a6478', fontSize: 11 }}>
          Últimas {opportunities.length} entradas
        </span>
      </div>

      {opportunities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#4a6478', fontSize: 13 }} role="status">
          Nenhum candidato encontrado.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Lista de candidatos recentes">
            <thead>
              <tr>
                {['Candidato', 'E-mail', 'Etapa', 'Status', 'Data'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      color: '#4a6070',
                      fontSize: 10,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '0 14px 10px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      borderBottom: '1px solid #1a2a3a',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp, idx) => {
                const name  = opp.contact?.name ?? opp.name ?? '—';
                const badge = stageBadge(opp.pipelineStageId, opp.pipelineStageName ?? '');
                const av    = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                return (
                  <tr key={opp.id} style={{ borderBottom: '1px solid #1a2a3a20' }}>
                    <td style={{ padding: '10px 14px 10px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div
                          aria-hidden="true"
                          style={{
                            width: 28, height: 28, borderRadius: '50%', background: av,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 700, color: '#c8e0f0', flexShrink: 0,
                          }}
                        >
                          {initials(name)}
                        </div>
                        <span style={{ color: '#dce8f4', fontSize: 13, fontWeight: 500 }}>{name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px 10px 0', color: '#5a7890', fontSize: 12 }}>
                      {opp.contact?.email ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px 10px 0' }}>
                      <span style={{
                        background: '#295D8614', color: '#7ec8f0', fontSize: 11,
                        padding: '3px 8px', borderRadius: 4, whiteSpace: 'nowrap',
                        border: '1px solid #295D8628',
                      }}>
                        {opp.pipelineStageName ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px 10px 0' }}>
                      <span style={{
                        background: badge.bg, color: badge.color, fontSize: 11,
                        padding: '3px 8px', borderRadius: 4, fontWeight: 600, whiteSpace: 'nowrap',
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '10px 0', color: '#4a6070', fontSize: 12 }}>
                      {formatDate(opp.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
