import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const reports = await db.weeklyReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ reports: [] });
  }
}
