const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';

// ─── Mapeamento de stage IDs do Pipeline Recrutamento ───────────────────────
// Fonte: GET /opportunities/pipelines?locationId=... (verificado em 12/03/2026)

export const STAGE_IDS = {
  // Funil ativo (posições 0–12)
  TRIAGEM:         'b3c8265c-ef95-4b59-8a67-3ab2a84f5488',
  EM_CONTATO:      '14870bd2-4fe3-4d33-a59c-72f19911bdbe',
  VE1:             'b7bd8d3c-33a1-416d-88f1-695730394e85',
  FOLLOW_UP_1:     '6e8deb60-0511-4340-860f-3a6de3e6c4b4',
  FOLLOW_UP_2:     '3f949ee6-ba6b-49e2-a0e3-e929ea85281d',
  FOLLOW_UP_3:     '6992a394-3eb2-46f9-9a41-31043aae6b26',
  APS:             '47890891-76bd-4d21-8364-7db498e1fb9a',
  ER1:             'e3a648c0-8f57-41f5-abf0-e75281209adb',
  PPS:             'b5ea8ce8-ca81-4c8e-9c7f-2fdb2ba05082',
  DPS:             'a58290de-b810-46b9-a63e-8021a5550ff1',
  NPS:             'e6400629-ec8a-4287-aa86-8c10d8057324',
  NCPS:            '6921014f-bbf0-4f34-bfb5-8140a1bb9cf2',
  AVALIAR:         '467dfd90-49c0-4821-beba-284aa6900d2f',
  // Reserva (posições 13–15)
  VAGAS_FUTURAS:   'f863f7cd-cba9-44c4-8069-87c7a24ca377',
  BANCO_TALENTOS:  '4f838cb7-3418-499b-a3c1-c49ecb2d109d',
  OCUPACAO:        '18a09a29-e181-4b20-a62e-9413bfa75991',
  // Saída negativa (posições 16–18)
  DECLINOU:        'a2c9dfbf-6bc1-4197-b911-093003eda86b',
  DESCLASSIFICADO: 'bf314d25-8cf2-4a9b-a4cc-c230eb5239d9',
  INCOMPATIVEL:    'a8630528-1fa7-49b3-8778-4b2b4c51126e',
  // Contratado (posição 19)
  CONTRATADOS:     '6576e7d1-9f6e-41ee-aafc-32fbfa8603af',
} as const;

export const ACTIVE_STAGE_IDS: Set<string> = new Set([
  STAGE_IDS.TRIAGEM, STAGE_IDS.EM_CONTATO, STAGE_IDS.VE1,
  STAGE_IDS.FOLLOW_UP_1, STAGE_IDS.FOLLOW_UP_2, STAGE_IDS.FOLLOW_UP_3,
  STAGE_IDS.APS, STAGE_IDS.ER1, STAGE_IDS.PPS, STAGE_IDS.DPS,
  STAGE_IDS.NPS, STAGE_IDS.NCPS, STAGE_IDS.AVALIAR,
]);

export const RESERVE_STAGE_IDS: Set<string> = new Set([
  STAGE_IDS.VAGAS_FUTURAS, STAGE_IDS.BANCO_TALENTOS, STAGE_IDS.OCUPACAO,
]);

export const NEGATIVE_STAGE_IDS: Set<string> = new Set([
  STAGE_IDS.DECLINOU, STAGE_IDS.DESCLASSIFICADO, STAGE_IDS.INCOMPATIVEL,
]);

// ─── Tipos ──────────────────────────────────────────────────────────────────

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
  stageCategory?: 'active' | 'reserve' | 'negative' | 'hired';
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

export interface StageStatItem {
  stageId: string;
  stageName: string;
  count: number;
  position: number;
}

export interface DashboardData {
  pipeline: Pipeline;
  opportunities: Opportunity[];
  // KPIs corretos (baseados em stage ID, não em status GHL)
  totalCount: number;
  activeFunnelCount: number;  // etapas 0-12
  hiredCount: number;         // etapa Contratados
  exitCount: number;          // Declinou + Desclassificado + Incompatível
  reserveCount: number;       // Vagas Futuras + Banco de Talentos + Ocupação
  conversionRate: number;     // hiredCount / totalCount * 100
  exitBreakdown: {
    declinou: number;
    desclassificado: number;
    incompativel: number;
  };
  // Stats segmentados por categoria
  activeFunnelStats: StageStatItem[];
  exitStats: StageStatItem[];
  reserveStats: StageStatItem[];
  // Para o gráfico overview completo
  allStageStats: StageStatItem[];
  recentOpportunities: Opportunity[];
  dailyTrend: { date: string; count: number }[];
}

// ─── Funções de API ──────────────────────────────────────────────────────────

export async function getPipeline(): Promise<Pipeline> {
  const locationId = process.env.GHL_LOCATION_ID;
  const pipelineId = process.env.GHL_PIPELINE_ID;

  const res = await fetch(
    `${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`,
    { method: 'GET', headers: headers() }
  );
  const data = await checkResponse<{
    pipelines: (Pipeline & { stages: (Stage & { showInFunnel?: boolean })[] })[];
  }>(res, 'buscar pipelines');
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

function classifyStage(stageId: string): Opportunity['stageCategory'] {
  if (stageId === STAGE_IDS.CONTRATADOS) return 'hired';
  if (ACTIVE_STAGE_IDS.has(stageId)) return 'active';
  if (RESERVE_STAGE_IDS.has(stageId)) return 'reserve';
  if (NEGATIVE_STAGE_IDS.has(stageId)) return 'negative';
  return 'active'; // fallback para etapas desconhecidas
}

export async function getDashboardData(): Promise<DashboardData> {
  const [pipeline, opportunities] = await Promise.all([getPipeline(), getAllOpportunities()]);

  // Mapa de stage ID → Stage
  const stageMap = new Map<string, Stage>();
  for (const s of pipeline.stages) stageMap.set(s.id, s);

  // Enriquecer oportunidades com nome da etapa e categoria
  const enriched = opportunities.map((o) => ({
    ...o,
    pipelineStageName: stageMap.get(o.pipelineStageId)?.name ?? 'Desconhecido',
    stageCategory: classifyStage(o.pipelineStageId),
  }));

  // Contagem por stage
  const stageCounts = new Map<string, number>();
  for (const o of enriched) {
    stageCounts.set(o.pipelineStageId, (stageCounts.get(o.pipelineStageId) ?? 0) + 1);
  }

  // Stats completos ordenados por posição
  const allStageStats: StageStatItem[] = pipeline.stages
    .sort((a, b) => a.position - b.position)
    .map((s) => ({
      stageId: s.id,
      stageName: s.name,
      count: stageCounts.get(s.id) ?? 0,
      position: s.position,
    }));

  // Stats segmentados
  const activeFunnelStats = allStageStats.filter((s) => ACTIVE_STAGE_IDS.has(s.stageId));
  const exitStats         = allStageStats.filter((s) => NEGATIVE_STAGE_IDS.has(s.stageId));
  const reserveStats      = allStageStats.filter((s) => RESERVE_STAGE_IDS.has(s.stageId));

  // KPIs corretos — baseados em stage ID, não em status GHL
  const totalCount        = enriched.length;
  const hiredCount        = enriched.filter((o) => o.pipelineStageId === STAGE_IDS.CONTRATADOS).length;
  const activeFunnelCount = enriched.filter((o) => ACTIVE_STAGE_IDS.has(o.pipelineStageId)).length;
  const exitCount         = enriched.filter((o) => NEGATIVE_STAGE_IDS.has(o.pipelineStageId)).length;
  const reserveCount      = enriched.filter((o) => RESERVE_STAGE_IDS.has(o.pipelineStageId)).length;
  const conversionRate    = totalCount > 0 ? Math.round((hiredCount / totalCount) * 100) : 0;

  const exitBreakdown = {
    declinou:        stageCounts.get(STAGE_IDS.DECLINOU) ?? 0,
    desclassificado: stageCounts.get(STAGE_IDS.DESCLASSIFICADO) ?? 0,
    incompativel:    stageCounts.get(STAGE_IDS.INCOMPATIVEL) ?? 0,
  };

  // Candidatos recentes (10 mais recentes)
  const recentOpportunities = [...enriched]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  // Tendência diária — últimos 14 dias
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
  const dailyTrend = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

  return {
    pipeline,
    opportunities: enriched,
    totalCount,
    activeFunnelCount,
    hiredCount,
    exitCount,
    reserveCount,
    conversionRate,
    exitBreakdown,
    activeFunnelStats,
    exitStats,
    reserveStats,
    allStageStats,
    recentOpportunities,
    dailyTrend,
  };
}
