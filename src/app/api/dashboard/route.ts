import { NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/ghl';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Dashboard API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
