'use client';

import type { Opportunity } from '@/lib/ghl';

interface RecentCandidatesProps {
  opportunities: Opportunity[];
}

function statusLabel(status: string) {
  if (status === 'won') return { label: 'Aprovado', color: '#74FAA5', bg: '#74FAA522' };
  if (status === 'lost') return { label: 'Reprovado', color: '#e08888', bg: '#e0555522' };
  return { label: 'Em Andamento', color: '#7ec8f0', bg: '#295D8622' };
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function RecentCandidates({ opportunities }: RecentCandidatesProps) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0d1829 0%, #111e34 100%)',
        border: '1px solid #295D8633',
        borderRadius: 16,
        padding: '28px',
      }}
    >
      <h2 style={{ color: '#f0f4f8', fontSize: 16, fontWeight: 600, margin: '0 0 20px 0' }}>
        Candidatos Recentes
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Candidato', 'E-mail', 'Etapa', 'Status', 'Data'].map((h) => (
                <th
                  key={h}
                  style={{
                    color: '#6b84a0',
                    fontSize: 11,
                    fontWeight: 600,
                    textAlign: 'left',
                    padding: '0 12px 12px 0',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
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
              const st = statusLabel(opp.status);
              return (
                <tr
                  key={opp.id}
                  style={{
                    background: idx % 2 === 0 ? 'transparent' : '#ffffff04',
                    transition: 'background 0.15s',
                  }}
                >
                  <td style={{ padding: '12px 12px 12px 0', color: '#f0f4f8', fontSize: 13 }}>
                    <div style={{ fontWeight: 600 }}>{opp.contact?.name ?? opp.name ?? '—'}</div>
                  </td>
                  <td style={{ padding: '12px 12px 12px 0', color: '#8ca0b8', fontSize: 12 }}>
                    {opp.contact?.email ?? '—'}
                  </td>
                  <td style={{ padding: '12px 12px 12px 0' }}>
                    <span
                      style={{
                        background: '#295D8622',
                        color: '#7ec8f0',
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opp.pipelineStageName ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px 12px 0' }}>
                    <span
                      style={{
                        background: st.bg,
                        color: st.color,
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0', color: '#6b84a0', fontSize: 12 }}>
                    {formatDate(opp.createdAt)}
                  </td>
                </tr>
              );
            })}
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: '#6b84a0', padding: '32px 0', fontSize: 13 }}>
                  Nenhum candidato encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
