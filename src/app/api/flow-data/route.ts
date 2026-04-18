import { NextResponse } from 'next/server';
import { generateCSValueDashboardData } from '@/lib/demo-data';
import { generateDemoData, getWeekRange } from '@/lib/data-processor';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const { weekNumber, year, label } = getWeekRange();

    // Try to load real data from DB first
    let csValueData = generateCSValueDashboardData(); // Default: demo
    let isDemo = true;

    try {
      const savedRealData = await db.cSValueData.findFirst({
        where: { weekNumber, year, isDemo: false },
        orderBy: { createdAt: 'desc' },
      });
      if (savedRealData) {
        csValueData = JSON.parse(savedRealData.csValueJSON) as ReturnType<typeof generateCSValueDashboardData>;
        isDemo = false;
        console.log('[FlowData] Using REAL data from DB');
      }
    } catch {
      // DB not available, use demo
    }

    const legacyData = generateDemoData();
    const ho = csValueData.healthOverview;

    // Customer Success Value Chain Flow
    const nodes = [
      {
        id: 'sign',
        label: '签约入驻',
        count: ho.totalCustomers,
        lastWeek: 230,
        status: 'healthy' as const,
        details: `累计签约${ho.totalCustomers}家客户，AIMI/广告/独立站产品覆盖`,
      },
      {
        id: 'value-achieve',
        label: '价值达成',
        count: Math.round(ho.totalCustomers * ho.productSideMetrics.productUsageRate / 100),
        lastWeek: Math.round(ho.totalCustomers * 62 / 100),
        status: ho.productSideMetrics.productUsageRate >= 70 ? 'healthy' as const : ho.productSideMetrics.productUsageRate >= 50 ? 'warning' as const : 'danger' as const,
        details: `产品使用率${ho.productSideMetrics.productUsageRate}%，使用深度${ho.productSideMetrics.usageDepth}模块，功能活跃度${ho.productSideMetrics.featureActivityScore}`,
      },
      {
        id: 'effect-deliver',
        label: '效果交付',
        count: Math.round(ho.totalCustomers * ho.effectSideMetrics.followerGrowthRate / 20),
        lastWeek: Math.round(ho.totalCustomers * 7 / 20),
        status: ho.effectSideMetrics.followerGrowthRate >= 10 ? 'healthy' as const : ho.effectSideMetrics.followerGrowthRate >= 3 ? 'warning' as const : 'danger' as const,
        details: `粉丝增长率${ho.effectSideMetrics.followerGrowthRate}%，互动率${ho.effectSideMetrics.contentInteractionRate}%，询盘率${ho.effectSideMetrics.inquiryRate}%`,
      },
      {
        id: 'business-value',
        label: '商业价值',
        count: Math.round(ho.totalCustomers * ho.businessSideMetrics.renewalRate / 100),
        lastWeek: Math.round(ho.totalCustomers * 68 / 100),
        status: ho.businessSideMetrics.renewalRate >= 80 ? 'healthy' as const : ho.businessSideMetrics.renewalRate >= 60 ? 'warning' as const : 'danger' as const,
        details: `NPS ${ho.businessSideMetrics.npsScore}，续约率${ho.businessSideMetrics.renewalRate}%，增购率${ho.businessSideMetrics.upsellRate}%`,
      },
      {
        id: 'renew-grow',
        label: '续费增购',
        count: csValueData.renewalChurn.overall.renewed,
        lastWeek: Math.round(csValueData.renewalChurn.overall.renewed * 0.9),
        status: csValueData.renewalChurn.overall.renewalRate >= 75 ? 'healthy' as const : csValueData.renewalChurn.overall.renewalRate >= 50 ? 'warning' as const : 'danger' as const,
        details: `到期${csValueData.renewalChurn.overall.upForRenewal}家，续费${csValueData.renewalChurn.overall.renewed}家(${csValueData.renewalChurn.overall.renewalRate}%)，增购${csValueData.renewalChurn.overall.upsellAmount}万元`,
      },
    ];

    return NextResponse.json({
      nodes,
      weekLabel: label,
      riskAlerts: legacyData.anomalies,
      coreComplaints: csValueData.keyIssues.map(ki => ({
        customer: ki.issue,
        issue: ki.rootCause,
        status: '待解决',
        action: ki.solution,
      })),
      teamLoad: Object.fromEntries(csValueData.teamEfficiency.csmDetails.map(c => [c.name, c.customerCount])),
      healthDistribution: ho.healthDistribution,
      isDemo,
    });
  } catch (error) {
    console.error('Flow data API error:', error);
    return NextResponse.json({ error: 'Failed to load flow data' }, { status: 500 });
  }
}
