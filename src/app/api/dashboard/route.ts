import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateCSValueDashboardData, generateDemoCSRecords, generateDemoSalesRecords } from '@/lib/demo-data';
import { getWeekRange } from '@/lib/data-processor';
import { calculateCoreMetrics, calculateHealthDistribution, buildMetricCards, type CoreMetrics } from '@/lib/metrics';
import type { CleanedCSRecord, CleanedSalesRecord } from '@/lib/data-processor';

// ============ Helper functions for legacy data ============

function generateAnomalies(metrics: CoreMetrics): Array<{ metric: string; change: string; description: string }> {
  const anomalies: Array<{ metric: string; change: string; description: string }> = [];
  if (metrics.productUsageRate < 60) anomalies.push({ metric: '产品使用率', change: `${metrics.productUsageRate.toFixed(1)}%`, description: '低于健康阈值60%，需关注低活跃客户' });
  if (metrics.renewalRate < 70) anomalies.push({ metric: '续约率', change: `${metrics.renewalRate.toFixed(1)}%`, description: '续约率偏低，需加强续费跟进' });
  if (metrics.npsScore < 50) anomalies.push({ metric: 'NPS满意度', change: `${metrics.npsScore}`, description: 'NPS低于50，客户满意度需改善' });
  if (metrics.customerCoverageRate < 70) anomalies.push({ metric: '客户覆盖率', change: `${metrics.customerCoverageRate.toFixed(1)}%`, description: '覆盖率不足，部分客户缺少定期跟进' });
  if (metrics.followerGrowthRate < 5) anomalies.push({ metric: '粉丝增长率', change: `${metrics.followerGrowthRate.toFixed(1)}%`, description: '粉丝增长缓慢，需优化内容策略' });
  if (anomalies.length === 0) anomalies.push({ metric: '整体', change: '正常', description: '本周各项指标均在正常范围' });
  return anomalies;
}

function generateOrderAnalysis(salesRecords: CleanedSalesRecord[]): Record<string, unknown> {
  const bySource: Record<string, number> = {};
  const byProductType: Record<string, number> = {};
  const byVersion: Record<string, number> = {};
  const byCSM: Record<string, number> = {};

  salesRecords.forEach(r => {
    bySource[r.orderSource] = (bySource[r.orderSource] || 0) + 1;
    byProductType[r.productType] = (byProductType[r.productType] || 0) + 1;
    byVersion[r.version] = (byVersion[r.version] || 0) + 1;
  });

  return { bySource, byProductType, byVersion, byCSM };
}

function generateUsageAnalysis(csRecords: CleanedCSRecord[]): Record<string, unknown> {
  const byContentType: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  const topActiveCustomers: Array<{ name: string; posts: number; engagement: number }> = [];

  const contentTypes = ['产品评测', '使用教程', '案例分享', '行业洞察', '活动推广'];
  const platforms = ['LinkedIn', 'Facebook', 'Instagram', 'Twitter', 'TikTok'];
  contentTypes.forEach(ct => { byContentType[ct] = Math.floor(Math.random() * 30) + 5; });
  platforms.forEach(p => { byPlatform[p] = Math.floor(Math.random() * 50) + 10; });

  csRecords.slice(0, 5).forEach(cs => {
    topActiveCustomers.push({ name: cs.customerName, posts: Math.floor(Math.random() * 100) + 20, engagement: Math.floor(Math.random() * 5000) + 500 });
  });

  return {
    byContentType, byPlatform,
    aiVsNonAI: { ai: { count: 65, exposure: 85000, engagement: 4200 }, nonAI: { count: 35, exposure: 32000, engagement: 1800 } },
    topActiveCustomers,
  };
}

function generateDangerDetails(csRecords: CleanedCSRecord[]): Array<{ customer: string; issue: string; status: string; action: string }> {
  const dangerCustomers = csRecords.filter(cs => cs.healthTier === 'danger').slice(0, 8);
  const actions = ['安排1对1沟通', '制定挽留方案', '产品培训跟进', '服务升级建议', '高级功能引导'];
  const issues = ['使用率持续下降', '多次投诉未解决', '续费意向不明', '效果未达预期', '服务受阻'];
  return dangerCustomers.map(cs => ({
    customer: cs.customerName,
    issue: issues[Math.floor(Math.random() * issues.length)],
    status: Math.random() > 0.5 ? '跟进中' : '待处理',
    action: actions[Math.floor(Math.random() * actions.length)],
  }));
}

// ============ API Route ============

export async function GET() {
  try {
    const { weekNumber, year, label } = getWeekRange();

    // 1. Always generate demo data
    const demoCSValueData = generateCSValueDashboardData();

    // 2. Try to load real data from database (separate from demo)
    let realCSValueData: ReturnType<typeof generateCSValueDashboardData> | null = null;
    let hasRealData = false;

    try {
      const dbTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const savedRealData = await Promise.race([
        db.cSValueData.findFirst({
          where: { weekNumber, year, isDemo: false },
          orderBy: { createdAt: 'desc' },
        }),
        dbTimeout,
      ]);

      if (savedRealData) {
        realCSValueData = JSON.parse(savedRealData.csValueJSON) as ReturnType<typeof generateCSValueDashboardData>;
        hasRealData = true;
        console.log(`[Dashboard] Loaded REAL data from DB`);
      }
    } catch (err) {
      console.log('[Dashboard] DB lookup for real data failed:', err);
    }

    // 3. Generate legacy compat data (always from demo)
    const csRecords = generateDemoCSRecords();
    const salesRecords = generateDemoSalesRecords(csRecords);
    const legacyMetrics = calculateCoreMetrics(csRecords, salesRecords, []);
    const legacyHealthDist = calculateHealthDistribution(csRecords);
    const metricCards = buildMetricCards(legacyMetrics, null);

    const legacyCompat = {
      metrics: metricCards,
      healthDistribution: demoCSValueData?.healthOverview?.healthDistribution || legacyHealthDist,
      anomalies: generateAnomalies(legacyMetrics),
      orderAnalysis: generateOrderAnalysis(salesRecords),
      usageAnalysis: generateUsageAnalysis(csRecords),
      dangerDetails: generateDangerDetails(csRecords),
      qualityReports: [],
    };

    return NextResponse.json({
      weekNumber,
      year,
      weekLabel: label,
      // Demo data (always available)
      demoData: {
        ...legacyCompat,
        csValueData: demoCSValueData,
        isDemo: true,
      },
      // Real data (may be null if never uploaded)
      realData: hasRealData ? {
        ...legacyCompat,
        csValueData: realCSValueData,
        isDemo: false,
      } : null,
      hasRealData,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 });
  }
}

// POST: Save REAL data (from Excel processing). Demo data is always generated on-the-fly.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csValueData, isDemo = false } = body;
    const { weekNumber, year, label } = getWeekRange();

    if (!csValueData) {
      return NextResponse.json({ error: 'csValueData is required' }, { status: 400 });
    }

    // Only save real data (isDemo=false) to DB. Demo data is generated on-the-fly.
    if (isDemo) {
      return NextResponse.json({ success: true, message: 'Demo data not persisted' });
    }

    // Delete existing REAL data for this week (keep demo separate)
    try {
      await db.cSValueData.deleteMany({
        where: { weekNumber, year, isDemo: false },
      });
    } catch {
      // Continue
    }

    // Save new real data
    const saved = await db.cSValueData.create({
      data: {
        weekNumber,
        year,
        weekLabel: label,
        csValueJSON: JSON.stringify(csValueData),
        isDemo: false,
      },
    });

    console.log(`[Dashboard] Saved REAL data to DB, id=${saved.id}`);
    return NextResponse.json({ success: true, id: saved.id });
  } catch (error) {
    console.error('Save CS Value data error:', error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}
