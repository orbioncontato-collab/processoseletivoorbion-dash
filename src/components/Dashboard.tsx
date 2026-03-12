'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, CheckCircle, XCircle, TrendingUp, RefreshCw, Clock, Activity } from 'lucide-react';
import { OrbionLogo } from './OrbionLogo';
import { KpiCard } from './KpiCard';
import { FunnelChart } from './FunnelChart';
import { TrendChart } from './TrendChart';
import { StageBarChart } from './StageBarChart';
import { RecentCandidates } from './RecentCandidates';
import { KpiSkeleton, ChartSkeleton, TableSkeleton } from './Skeleton';
import type { DashboardData } from '@/lib/ghl';

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      style={{
        background: '#e0555514',
        border: '1px solid #e0555530',
        borderRadius: 12,
        padding: '32px 24px',
        textAlign: 'center',
        maxWidth: 480,
        margin: '80px auto',
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }} aria-hidden="true">⚠️</div>
      <p style={{ color: '#e08888', fontWeight: 600, marginBottom: 8, fontSize: 15 }}>
        Erro ao carregar dados
      </p>
      <p style={{ color: '#7a90a4', fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          background: '#e05555',
          border: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          minHeight: 44,
          minWidth: 44,
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
      const json: DashboardData = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: '100vh', background: '#0A1123' }}>
      {/* Global styles */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .dash-refresh-btn:hover:not(:disabled) { background: #295D8644 !important; }
        .dash-refresh-btn:focus-visible { outline: 2px solid #74FAA5; outline-offset: 2px; }
        .dash-section { animation: fadeIn 0.3s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .dash-section { animation: none; }
        }
        @media (max-width: 768px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
          .header-inner { flex-wrap: wrap; gap: 12px; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header */}
      <header
        role="banner"
        style={{
          borderBottom: '1px solid #295D8628',
          background: 'linear-gradient(180deg, #0c1726 0%, #0A1123 100%)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="header-inner"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <OrbionLogo height={28} />
            <div style={{ width: 1, height: 24, background: '#295D8650' }} aria-hidden="true" />
            <span style={{ color: '#6b84a0', fontSize: 13, fontWeight: 500 }}>
              Processo Seletivo
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastUpdated && !loading && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4a6478', fontSize: 12 }}
                aria-live="polite"
              >
                <Clock size={12} aria-hidden="true" />
                <span>
                  {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            <button
              className="dash-refresh-btn"
              onClick={() => load(true)}
              disabled={refreshing || loading}
              aria-label="Atualizar dados do dashboard"
              style={{
                background: 'transparent',
                border: '1px solid #295D8650',
                borderRadius: 8,
                padding: '8px 16px',
                color: '#74FAA5',
                fontSize: 13,
                fontWeight: 500,
                cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                opacity: refreshing ? 0.5 : 1,
                transition: 'background 0.15s, opacity 0.15s',
                minHeight: 44,
              }}
            >
              <RefreshCw
                size={13}
                aria-hidden="true"
                style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}
              />
              {refreshing ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px' }}
      >
        {/* Loading skeleton */}
        {loading && (
          <div className="dash-section" aria-busy="true" aria-label="Carregando dados do CRM">
            <div style={{ marginBottom: 24 }}>
              <div style={{ width: 180, height: 24, borderRadius: 6, background: '#1a2a3a', marginBottom: 8 }} />
              <div style={{ width: 240, height: 14, borderRadius: 4, background: '#141f30' }} />
            </div>
            <div
              className="kpi-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}
            >
              {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
            </div>
            <div className="chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <ChartSkeleton height={300} />
              <ChartSkeleton height={300} />
            </div>
            <ChartSkeleton height={220} />
            <div style={{ marginTop: 16 }}>
              <TableSkeleton />
            </div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => load()} />
        )}

        {/* Dashboard */}
        {!loading && data && (
          <div className="dash-section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Activity size={18} color="#74FAA5" aria-hidden="true" />
              <div>
                <h1 style={{ color: '#74FAA5', fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                  {data.pipeline.name}
                </h1>
                <p style={{ color: '#4a6478', fontSize: 12, margin: '3px 0 0', lineHeight: 1 }}>
                  {data.pipeline.stages.length} etapas · {data.totalCount.toLocaleString('pt-BR')} candidatos cadastrados
                </p>
              </div>
            </div>

            {/* KPI Cards */}
            <div
              className="kpi-grid"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}
              role="region"
              aria-label="Indicadores de desempenho"
            >
              <KpiCard
                title="Total"
                value={data.totalCount.toLocaleString('pt-BR')}
                subtitle="Candidaturas recebidas"
                icon={<Users size={18} />}
                accent="green"
              />
              <KpiCard
                title="Em Andamento"
                value={data.openCount.toLocaleString('pt-BR')}
                subtitle="Ativos no pipeline"
                icon={<TrendingUp size={18} />}
                accent="blue"
              />
              <KpiCard
                title="Aprovados"
                value={data.wonCount.toLocaleString('pt-BR')}
                subtitle="Contratados"
                icon={<CheckCircle size={18} />}
                accent="teal"
              />
              <KpiCard
                title="Reprovados"
                value={data.lostCount.toLocaleString('pt-BR')}
                subtitle="Não avançaram"
                icon={<XCircle size={18} />}
                accent="red"
              />
              <KpiCard
                title="Conversão"
                value={`${data.conversionRate}%`}
                subtitle="Aprovados / Total"
                icon={<TrendingUp size={18} />}
                accent="yellow"
              />
            </div>

            {/* Charts row */}
            <div
              className="chart-grid"
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
              role="region"
              aria-label="Gráficos do funil de recrutamento"
            >
              <FunnelChart stages={data.stageStats} />
              <StageBarChart stages={data.stageStats} />
            </div>

            {/* Trend */}
            <TrendChart data={data.dailyTrend} />

            {/* Recent candidates */}
            <RecentCandidates opportunities={data.recentOpportunities} />
          </div>
        )}
      </main>
    </div>
  );
}
