'use client';

import type { Opportunity } from '@/lib/ghl';

interface RecentCandidatesProps {
  opportunities: Opportunity[];
}

function statusBadge(status: string) {
  if (status === 'won')  return { label: 'Aprovado',      color: '#74FAA5', bg: '#74FAA514' };
  if (status === 'lost') return { label: 'Não avançou',   color: '#e08888', bg: '#e0555514' };
  return                         { label: 'Em andamento', color: '#7ec8f0', bg: '#295D8622' };
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = ['#295D86', '#265C58', '#1d4e6b', '#1a4a44'];

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h2 style={{ color: '#f0f4f8', fontSize: 15, fontWeight: 600, margin: 0 }}>
          Candidatos Recentes
        </h2>
        <span style={{ color: '#4a6478', fontSize: 11 }}>
          Últimas {opportunities.length} entradas
        </span>
      </div>

      {opportunities.length === 0 ? (
        <div
          style={{ textAlign: 'center', padding: '40px 0', color: '#4a6478', fontSize: 13 }}
          role="status"
        >
          Nenhum candidato encontrado ainda.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{ width: '100%', borderCollapse: 'collapse' }}
            aria-label="Lista de candidatos recentes"
          >
            <thead>
              <tr>
                {['Candidato', 'E-mail', 'Etapa', 'Status', 'Data'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    style={{
                      color: '#4a6070',
                      fontSize: 11,
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: '0 16px 10px 0',
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
                const st = statusBadge(opp.status);
                const name = opp.contact?.name ?? opp.name ?? '—';
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];

                return (
                  <tr
                    key={opp.id}
                    style={{ borderBottom: '1px solid #1a2a3a22' }}
                  >
                    <td style={{ padding: '11px 16px 11px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          aria-hidden="true"
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: avatarColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            color: '#e0f0ff',
                            flexShrink: 0,
                          }}
                        >
                          {initials(name)}
                        </div>
                        <span style={{ color: '#dce8f4', fontSize: 13, fontWeight: 500 }}>
                          {name}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '11px 16px 11px 0', color: '#6b84a0', fontSize: 12 }}>
                      {opp.contact?.email ?? '—'}
                    </td>

                    <td style={{ padding: '11px 16px 11px 0' }}>
                      <span
                        style={{
                          background: '#295D8618',
                          color: '#7ec8f0',
                          fontSize: 11,
                          padding: '3px 8px',
                          borderRadius: 4,
                          whiteSpace: 'nowrap',
                          border: '1px solid #295D8630',
                        }}
                      >
                        {opp.pipelineStageName ?? '—'}
                      </span>
                    </td>

                    <td style={{ padding: '11px 16px 11px 0' }}>
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

                    <td style={{ padding: '11px 0', color: '#4a6070', fontSize: 12 }}>
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
