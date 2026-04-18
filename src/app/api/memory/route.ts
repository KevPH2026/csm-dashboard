import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const snapshots = await db.metricSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    return NextResponse.json({ snapshots });
  } catch {
    return NextResponse.json({ snapshots: [] });
  }
}
