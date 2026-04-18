import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEFAULT_SKILLS = [
  { skillKey: 'data_cleaning', skillName: '数据清洗与处理', enabled: true, parameters: '{}' },
  { skillKey: 'health_scoring', skillName: '客户健康度分层分析', enabled: true, parameters: '{}' },
  { skillKey: 'anomaly_detection', skillName: '异常检测与归因', enabled: true, parameters: '{"threshold": 20}' },
  { skillKey: 'trend_prediction', skillName: '趋势预测', enabled: true, parameters: '{}' },
  { skillKey: 'decision_suggestion', skillName: '决策建议生成', enabled: true, parameters: '{}' },
  { skillKey: 'customer_value', skillName: '客户价值分析', enabled: true, parameters: '{}' },
  { skillKey: 'churn_analysis', skillName: '续费流失分析', enabled: false, parameters: '{}' },
  { skillKey: 'cross_product', skillName: '多产品交叉分析', enabled: true, parameters: '{}' },
  { skillKey: 'team_efficiency', skillName: '团队效能分析', enabled: true, parameters: '{}' },
  { skillKey: 'ai_comparison', skillName: 'AI效果对比分析', enabled: true, parameters: '{}' },
  { skillKey: 'nl_tuning', skillName: '自然语言调教', enabled: true, parameters: '{}' },
  { skillKey: 'semantic_report', skillName: '语义报告调整', enabled: true, parameters: '{}' },
];

async function ensureDefaultSkills() {
  try {
    const existing = await db.skillConfig.findMany();
    if (existing.length === 0) {
      await db.skillConfig.createMany({
        data: DEFAULT_SKILLS.map(s => ({
          skillKey: s.skillKey,
          skillName: s.skillName,
          enabled: s.enabled,
          parameters: s.parameters,
        })),
      });
    }
  } catch {
    // DB not ready
  }
}

export async function GET() {
  try {
    await ensureDefaultSkills();
    const skills = await db.skillConfig.findMany({ orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ skills });
  } catch {
    return NextResponse.json({ skills: DEFAULT_SKILLS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { skillKey, skillName, enabled, parameters } = body;

    if (skillKey && skillName) {
      // Create or update skill
      const skill = await db.skillConfig.upsert({
        where: { skillKey },
        update: { skillName, enabled, parameters: parameters || '{}' },
        create: { skillKey, skillName, enabled: enabled ?? true, parameters: parameters || '{}' },
      });
      return NextResponse.json({ skill });
    }

    // Batch update
    if (Array.isArray(body.skills)) {
      for (const s of body.skills) {
        await db.skillConfig.update({
          where: { skillKey: s.skillKey },
          data: { enabled: s.enabled },
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Skills API error:', error);
    return NextResponse.json({ error: 'Failed to update skills' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skillKey = searchParams.get('skillKey');
    if (!skillKey) {
      return NextResponse.json({ error: 'skillKey is required' }, { status: 400 });
    }
    await db.skillConfig.delete({ where: { skillKey } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Skills DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete skill' }, { status: 500 });
  }
}
