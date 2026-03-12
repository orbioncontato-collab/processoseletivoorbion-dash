const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

function headers() {
  return {
    Authorization: `Bearer ${process.env.GHL_API_KEY}`,
    'Content-Type': 'application/json',
    Version: GHL_VERSION,
  };
}

async function checkResponse<T>(res: Response, ctx: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GHL ${ctx} falhou (${res.status}): ${body}`);
  }
  return res.json();
}

export interface Stage {
  id: string;
  name: string;
  position: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

export interface Opportunity {
  id: string;
  name: string;
  status: string;
  pipelineStageId: string;
  pipelineStageName?: string;
  monetaryValue?: number;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardData {
  pipeline: Pipeline;
  opportunities: Opportunity[];
  stageStats: { stageId: string; stageName: string; count: number; position: number }[];
  totalCount: number;
  wonCount: number;
  lostCount: number;
  openCount: number;
  recentOpportunities: Opportunity[];
  conversionRate: number;
  dailyTrend: { date: string; count: number }[];
}

export async function getPipeline(): Promise<Pipeline> {
  const locationId = process.env.GHL_LOCATION_ID;
  const pipelineId = process.env.GHL_PIPELINE_ID;

  const res = await fetch(
    `${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`,
    { method: 'GET', headers: headers() }
  );
  const data = await checkResponse<{ pipelines: (Pipeline & { stages: (Stage & { showInFunnel?: boolean })[] })[] }>(res, 'buscar pipelines');
  const pipeline = data.pipelines.find((p) => p.id === pipelineId) ?? data.pipelines[0];
  return pipeline;
}

export async function getAllOpportunities(): Promise<Opportunity[]> {
  const locationId = process.env.GHL_LOCATION_ID;
  const pipelineId = process.env.GHL_PIPELINE_ID;
  const all: Opportunity[] = [];
  let startAfter: string | undefined;
  let startAfterId: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      location_id: locationId!,
      pipeline_id: pipelineId!,
      limit: '100',
    });
    if (startAfter) params.set('startAfter', startAfter);
    if (startAfterId) params.set('startAfterId', startAfterId);

    const res = await fetch(
      `${GHL_API_BASE}/opportunities/search?${params.toString()}`,
      { method: 'GET', headers: headers() }
    );
    const data = await checkResponse<{
      opportunities: Opportunity[];
      meta?: { startAfter?: string; startAfterId?: string; total?: number };
    }>(res, 'buscar oportunidades');

    all.push(...(data.opportunities ?? []));

    const meta = data.meta;
    if (!meta?.startAfter || data.opportunities.length < 100) break;
    startAfter = meta.startAfter;
    startAfterId = meta.startAfterId;
  }

  return all;
}

export async function getDashboardData(): Promise<DashboardData> {
  const [pipeline, opportunities] = await Promise.all([getPipeline(), getAllOpportunities()]);

  // Build stage map for lookups
  const stageMap = new Map<string, Stage>();
  for (const s of pipeline.stages) stageMap.set(s.id, s);

  // Enrich opportunities with stage name from pipeline
  const enriched = opportunities.map((o) => ({
    ...o,
    pipelineStageName: stageMap.get(o.pipelineStageId)?.name ?? 'Desconhecido',
  }));

  // Stage stats
  const stageCounts = new Map<string, number>();
  for (const o of enriched) {
    stageCounts.set(o.pipelineStageId, (stageCounts.get(o.pipelineStageId) ?? 0) + 1);
  }

  const stageStats = pipeline.stages
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      stageId: s.id,
      stageName: s.name,
      count: stageCounts.get(s.id) ?? 0,
      position: s.position,
    }));

  const totalCount = enriched.length;
  const wonCount = enriched.filter((o) => o.status === 'won').length;
  const lostCount = enriched.filter((o) => o.status === 'lost').length;
  const openCount = enriched.filter((o) => o.status === 'open').length;
  const conversionRate = totalCount > 0 ? Math.round((wonCount / totalCount) * 100) : 0;

  // Recent opportunities (last 10 by createdAt)
  const recentOpportunities = [...enriched]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Daily trend last 14 days
  const now = new Date();
  const dailyMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of enriched) {
    const day = o.createdAt?.slice(0, 10);
    if (day && dailyMap.has(day)) {
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }
  }
  const dailyTrend = Array.from(dailyMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  return {
    pipeline,
    opportunities: enriched,
    stageStats,
    totalCount,
    wonCount,
    lostCount,
    openCount,
    recentOpportunities,
    conversionRate,
    dailyTrend,
  };
}
