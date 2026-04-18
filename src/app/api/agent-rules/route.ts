import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rules = await db.agentRule.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ rules });
  } catch {
    return NextResponse.json({ rules: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleContent, category, source } = body;

    if (!ruleContent) {
      return NextResponse.json({ error: 'Rule content is required' }, { status: 400 });
    }

    const rule = await db.agentRule.create({
      data: {
        ruleContent,
        category: category || 'general',
        source: source || 'manual',
        isActive: true,
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Agent rules API error:', error);
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    await db.agentRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agent rules delete error:', error);
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 });
  }
}
