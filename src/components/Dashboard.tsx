'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, CheckCircle, XCircle, TrendingUp, RefreshCw, Clock, Activity, BookOpen } from 'lucide-react';
import { OrbionLogo } from './OrbionLogo';
import { KpiCard } from './KpiCard';
import { FunnelChart } from './FunnelChart';
import { TrendChart } from './TrendChart';
import { StageBarChart } from './StageBarChart';
import { RecentCandidates } from './RecentCandidates';
import { ExitBreakdownCard } from './ExitBreakdownCard';
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from './Skeleton';
import type { DashboardData } from '@/lib/ghl';

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        background: '#e0555514', border: '1px solid #e0555530',
        borderRadius: 12, padding: '36px 24px', textAlign: 'center',
        maxWidth: 480, margin: '80px auto',
      }}
    >
      <p style={{ color: '#e08888', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
        Erro ao carregar dados
      </p>
      <p style={{ color: '#7a90a4', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          background: '#e05555', border: 'none', borderRadius: 8,
          padding: '10px 24px', color: '#fff', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, minHeight: 44,
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Erro ${res.status}`);
      }
      setData(await res.json());
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: '100vh', background: '#0A1123' }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
        .dash-section { animation: fadeIn 0.3s ease both; }
        .refresh-btn:hover:not(:disabled) { background: #1d304822 !important; }
        .refresh-btn:focus-visible { outline: 2px solid #74FAA5; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .dash-section { animation: none; } }
        @media (max-width: 1100px) { .kpi-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 768px)  { .kpi-grid { grid-template-columns: repeat(2,1fr) !important; } .two-col { grid-template-columns:1fr !important; } }
        @media (max-width: 480px)  { .kpi-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid #295D8622',
        background: 'linear-gradient(180deg,#0c1726 0%,#0A1123 100%)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{
          maxWidth: 1320, margin: '0 auto', padding: '13px 28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <OrbionLogo height={28} />
            <div style={{ width: 1, height: 22, background: '#295D8640' }} aria-hidden="true" />
            <span style={{ color: '#5a7890', fontSize: 13, fontWeight: 500 }}>Processo Seletivo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdated && !loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#3e5568', fontSize: 12 }} aria-live="polite">
                <Clock size={12} aria-hidden="true" />
                <span>{lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            <button
              className="refresh-btn"
              onClick={() => load(true)}
              disabled={refreshing || loading}
              aria-label="Atualizar dados"
              style={{
                background: 'transparent', border: '1px solid #295D8640', borderRadius: 8,
                padding: '8px 16px', color: '#74FAA5', fontSize: 13, fontWeight: 500,
                cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: refreshing ? 0.5 : 1, transition: 'background 0.15s, opacity 0.15s', minHeight: 44,
              }}
            >
              <RefreshCw size={13} aria-hidden="true" style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              {refreshing ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" style={{ maxWidth: 1320, margin: '0 auto', padding: '28px' }}>

        {/* ── Loading ── */}
        {loading && (
          <div aria-busy="true" aria-label="Carregando dados do CRM">
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 200, height: 22, borderRadius: 6, background: '#1a2a3a', marginBottom: 8 }} />
              <div style={{ width: 260, height: 13, borderRadius: 4, background: '#141f30' }} />
            </div>
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 18 }}>
              {Array.from({ length: 6 }).map((_, i) => <KpiSkeleton key={i} />)}
            </div>
            <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <ChartSkeleton height={320} />
              <ChartSkeleton height={320} />
            </div>
            <ChartSkeleton height={240} />
            <div style={{ marginTop: 14 }}><TrendChart data={[]} /></div>
            <div style={{ marginTop: 14 }}><TableSkeleton /></div>
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && <ErrorState message={error} onRetry={() => load()} />}

        {/* ── Dashboard ── */}
        {!loading && data && (
          <div className="dash-section" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Título */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={17} color="#74FAA5" aria-hidden="true" />
              <div>
                <h1 style={{ color: '#74FAA5', fontSize: 19, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                  {data.pipeline.name}
                </h1>
                <p style={{ color: '#3e5568', fontSize: 12, margin: '3px 0 0' }}>
                  {data.pipeline.stages.length} etapas · {data.totalCount.toLocaleString('pt-BR')} candidatos cadastrados
                </p>
              </div>
            </div>

            {/* ── KPIs (6 cards) ── */}
            <div
              className="kpi-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12 }}
              role="region"
              aria-label="Indicadores de desempenho"
            >
              <KpiCard
                title="Total"
                value={data.totalCount.toLocaleString('pt-BR')}
                subtitle="Candidaturas recebidas"
                icon={<Users size={17} />}
                accent="blue"
              />
              <KpiCard
                title="Funil Ativo"
                value={data.activeFunnelCount.toLocaleString('pt-BR')}
                subtitle="Em processo agora"
                icon={<TrendingUp size={17} />}
                accent="green"
              />
              <KpiCard
                title="Contratados"
                value={data.hiredCount.toLocaleString('pt-BR')}
                subtitle="Efetivados"
                icon={<CheckCircle size={17} />}
                accent="teal"
              />
              <KpiCard
                title="Saíram"
                value={data.exitCount.toLocaleString('pt-BR')}
                subtitle="Descartados ou declinaram"
                icon={<XCircle size={17} />}
                accent="red"
              />
              <KpiCard
                title="Reserva"
                value={data.reserveCount.toLocaleString('pt-BR')}
                subtitle="Banco de talentos"
                icon={<BookOpen size={17} />}
                accent="yellow"
              />
              <KpiCard
                title="Conversão"
                value={`${data.conversionRate}%`}
                subtitle="Contratados / Total"
                icon={<TrendingUp size={17} />}
                accent="teal"
              />
            </div>

            {/* ── Funil ativo + Saídas/Reserva ── */}
            <div
              className="two-col"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}
              role="region"
              aria-label="Funil e saídas"
            >
              <FunnelChart stages={data.activeFunnelStats} />
              <ExitBreakdownCard
                exitStats={data.exitStats}
                reserveStats={data.reserveStats}
                exitTotal={data.exitCount}
                reserveTotal={data.reserveCount}
              />
            </div>

            {/* ── Gráfico overview completo ── */}
            <StageBarChart
              activeFunnelStats={data.activeFunnelStats}
              exitStats={data.exitStats}
              reserveStats={data.reserveStats}
            />

            {/* ── Tendência ── */}
            <TrendChart data={data.dailyTrend} />

            {/* ── Candidatos recentes ── */}
            <RecentCandidates opportunities={data.recentOpportunities} />

          </div>
        )}
      </main>
    </div>
  );
}
