'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, CheckCircle, XCircle, TrendingUp, RefreshCw, Clock } from 'lucide-react';
import { OrbionLogo } from './OrbionLogo';
import { KpiCard } from './KpiCard';
import { FunnelChart } from './FunnelChart';
import { TrendChart } from './TrendChart';
import { StageBarChart } from './StageBarChart';
import { RecentCandidates } from './RecentCandidates';
import type { DashboardData } from '@/lib/ghl';

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

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ minHeight: '100vh', background: '#0A1123', color: '#f0f4f8' }}>
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid #295D8630',
          background: 'linear-gradient(180deg, #0d1829 0%, #0A1123 100%)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '16px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <OrbionLogo height={32} />
            <div
              style={{
                width: 1,
                height: 28,
                background: '#295D86',
                opacity: 0.5,
              }}
            />
            <span style={{ color: '#8ca0b8', fontSize: 14 }}>Dashboard Processo Seletivo</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {lastUpdated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b84a0', fontSize: 12 }}>
                <Clock size={13} />
                <span>
                  Atualizado às{' '}
                  {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            <button
              onClick={() => load(true)}
              disabled={refreshing || loading}
              style={{
                background: 'transparent',
                border: '1px solid #295D86',
                borderRadius: 8,
                padding: '7px 14px',
                color: '#74FAA5',
                fontSize: 13,
                cursor: refreshing || loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                opacity: refreshing ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '32px' }}>
        {/* Loading state */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 400,
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                border: '3px solid #295D86',
                borderTopColor: '#74FAA5',
                borderRadius: '50%',
                animation: 'spin 0.9s linear infinite',
              }}
            />
            <p style={{ color: '#6b84a0', fontSize: 14 }}>Carregando dados do CRM...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            style={{
              background: '#e0555518',
              border: '1px solid #e0555540',
              borderRadius: 12,
              padding: '24px',
              textAlign: 'center',
              maxWidth: 500,
              margin: '80px auto',
            }}
          >
            <p style={{ color: '#e08888', fontWeight: 600, marginBottom: 8 }}>Erro ao carregar dados</p>
            <p style={{ color: '#8ca0b8', fontSize: 13, marginBottom: 16 }}>{error}</p>
            <button
              onClick={() => load()}
              style={{
                background: '#e05555',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Dashboard content */}
        {!loading && data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Pipeline name */}
            <div>
              <h1 style={{ color: '#74FAA5', fontSize: 22, fontWeight: 700, margin: 0 }}>
                {data.pipeline.name}
              </h1>
              <p style={{ color: '#6b84a0', fontSize: 13, margin: '4px 0 0' }}>
                {data.pipeline.stages.length} etapas · {data.totalCount} candidatos no total
              </p>
            </div>

            {/* KPI Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 16,
              }}
            >
              <KpiCard
                title="Total de Candidatos"
                value={data.totalCount}
                subtitle="Todas as candidaturas"
                icon={<Users size={20} />}
                accent="green"
              />
              <KpiCard
                title="Em Andamento"
                value={data.openCount}
                subtitle="Ativos no pipeline"
                icon={<TrendingUp size={20} />}
                accent="blue"
              />
              <KpiCard
                title="Aprovados"
                value={data.wonCount}
                subtitle="Candidatos ganhos"
                icon={<CheckCircle size={20} />}
                accent="teal"
              />
              <KpiCard
                title="Reprovados"
                value={data.lostCount}
                subtitle="Candidatos perdidos"
                icon={<XCircle size={20} />}
                accent="red"
              />
              <KpiCard
                title="Taxa de Conversão"
                value={`${data.conversionRate}%`}
                subtitle="Aprovados / Total"
                icon={<TrendingUp size={20} />}
                accent="yellow"
              />
            </div>

            {/* Charts row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
              }}
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
