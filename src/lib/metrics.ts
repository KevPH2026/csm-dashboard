// Customer Success Value Metrics (restructured from service delivery to CS value perspective)
// Based on Part 4 of 跨境月度经营分析报告: 客户成功体系分析
// 6 Modules: Health → Product Value → Multi-Product → Renewal/Churn → Team → Issues

import type { CleanedCSRecord, CleanedSalesRecord, CleanedUserActivityRecord } from './data-processor';

// ============ Type Definitions ============

export interface HealthOverviewMetrics {
  totalCustomers: number;
  healthDistribution: { healthy: number; attention: number; warning: number; danger: number };
  // Product side (AIMI only)
  productUsageRate: number;       // 产品使用率: at least 1 core feature / total paid
  coreFeatureActivity: number;    // 核心功能活跃度: avg monthly logins/posts
  productUsageDepth: number;      // 产品使用深度: avg feature modules used
  // Effect side (AIMI only)
  followerGrowthRate: number;     // 粉丝增长率: week over week
  contentInteractionRate: number; // 内容互动率: interactions / posts
  inquiryRate: number;            // 询盘率: inquiries / posts
  // Business side
  npsScore: number;               // 客户满意度 NPS
  renewalRate: number;            // 续约率
  upsellRate: number;             // 增购率
}

export interface ProductLineValueMetrics {
  aimi: {
    followerGrowthAvg: number;
    monthlyPostsAvg: number;
    avgInquiries: number;
    highlights: string[];
    issues: string[];
  };
  ads: {
    avgSpendPerAccount: number;
    avgROAS: number;
    renewalRate: number;
    highlights: string[];
    issues: string[];
  };
  site: {
    avgInquiryConversion: number;
    avgMargin: number;
    highlights: string[];
    issues: string[];
  };
}

export interface CustomerTypeValue {
  count: number;
  ratio: number;
  arpu: number;
  renewalRate: number;
  ltv: number;
  insight: string;
}

export interface MultiProductValueMetrics {
  single: CustomerTypeValue;
  dual: CustomerTypeValue;
  fullChain: CustomerTypeValue;
}

export interface RenewalChurnMetrics {
  aimi: RenewalChurnDetail;
  ads: RenewalChurnDetail;
  site: RenewalChurnDetail;
  overall: RenewalChurnDetail;
}

export interface RenewalChurnDetail {
  upForRenewal: number;
  renewed: number;
  renewalRate: number;
  upsellAmount: number;
  topChurnReasons: string[];
}

export interface CSMTeamMetrics {
  customersPerCSM: number;
  customerCoverageRate: number;
  avgResponseTimeHours: number;
  renewalTargetRate: number;
  csmDetails: Array<{
    name: string;
    customerCount: number;
    coverageRate: number;
    avgResponseHours: number;
    renewalAchievementRate: number;
  }>;
}

export interface KeyIssue {
  issue: string;
  rootCause: string;
  solution: string;
  owner: string;
  deadline: string;
}

export interface CSValueDashboardData {
  healthOverview: HealthOverviewMetrics;
  productLineValue: ProductLineValueMetrics;
  multiProductValue: MultiProductValueMetrics;
  renewalChurn: RenewalChurnMetrics;
  teamEfficiency: CSMTeamMetrics;
  keyIssues: KeyIssue[];
}

// ============ Week Calculation ============

export function getCurrentWeekRange(): { start: Date; end: Date; weekNumber: number; year: number; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const janFirst = new Date(monday.getFullYear(), 0, 1);
  const daysSinceJanFirst = Math.floor((monday.getTime() - janFirst.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((daysSinceJanFirst + janFirst.getDay() + 1) / 7);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  return { start: monday, end: sunday, weekNumber, year: monday.getFullYear(), label: `W${weekNumber} (${formatDate(monday)} - ${formatDate(sunday)})` };
}

// ============ Legacy Types (for backward compat) ============

export interface CoreMetrics {
  totalOrders: number;
  newOrders: number;
  productUsageRate: number;
  contentInteractionRate: number;
  renewalRate: number;
  npsScore: number;
  customersPerCSM: number;
  customerCoverageRate: number;
  upsellRate: number;
  followerGrowthRate: number;
  inquiryRate: number;
  productUsageDepth: number;
}

export interface HealthDistribution {
  healthy: number;
  attention: number;
  warning: number;
  danger: number;
}

export interface MetricWithHealth {
  key: string;
  name: string;
  value: number;
  display: string;
  unit: string;
  lastWeekValue: number | null;
  healthStatus: 'green' | 'yellow' | 'red' | 'neutral';
  healthEmoji: string;
  threshold: string;
  direction: '↑' | '↓' | '→' | '—';
  changePercent: string | null;
}

// ============ Calculate CS Value Metrics ============

export function calculateCoreMetrics(
  csRecords: CleanedCSRecord[],
  salesRecords: CleanedSalesRecord[],
  userActivityRecords: CleanedUserActivityRecord[]
): CoreMetrics {
  const totalCustomers = csRecords.length;
  const aimiCustomers = csRecords.filter(cs => {
    const products = (cs as Record<string, unknown>).products as string[] | undefined;
    return products?.includes('AIMI');
  });

  // Product-side (AIMI only)
  const productUsageRate = aimiCustomers.length > 0
    ? aimiCustomers.filter(cs => ((cs as Record<string, unknown>).productUsageRate as number || 0) > 30).length / aimiCustomers.length * 100
    : 0;

  const productUsageDepth = aimiCustomers.length > 0
    ? aimiCustomers.reduce((acc, cs) => acc + ((cs as Record<string, unknown>).usageDepth as number || 0), 0) / aimiCustomers.length
    : 0;

  // Effect-side (AIMI only)
  const followerGrowthRate = aimiCustomers.length > 0
    ? aimiCustomers.reduce((acc, cs) => acc + ((cs as Record<string, unknown>).followerGrowthRate as number || 0), 0) / aimiCustomers.length
    : 0;

  const contentInteractionRate = aimiCustomers.length > 0
    ? aimiCustomers.reduce((acc, cs) => acc + ((cs as Record<string, unknown>).contentInteractionRate as number || 0), 0) / aimiCustomers.length
    : 0;

  const inquiryRate = aimiCustomers.length > 0
    ? aimiCustomers.reduce((acc, cs) => acc + ((cs as Record<string, unknown>).inquiryRate as number || 0), 0) / aimiCustomers.length
    : 0;

  // Business-side
  const npsScore = totalCustomers > 0
    ? csRecords.reduce((acc, cs) => acc + ((cs as Record<string, unknown>).npsScore as number || 50), 0) / totalCustomers
    : 50;

  const renewedCount = csRecords.filter(cs => cs.isRenewed).length;
  const renewalRate = totalCustomers > 0 ? (renewedCount / totalCustomers) * 100 : 0;

  const upsoldCount = csRecords.filter(cs => cs.isUpsold).length;
  const upsellRate = totalCustomers > 0 ? (upsoldCount / totalCustomers) * 100 : 0;

  // Team
  const distinctCSMs = new Set(csRecords.map(r => r.csmName).filter(n => n));
  const customersPerCSM = distinctCSMs.size > 0 ? totalCustomers / distinctCSMs.size : 0;
  const customerCoverageRate = distinctCSMs.size > 0
    ? csRecords.filter(cs => {
        const tm = (cs as Record<string, unknown>).teamMetrics as { lastContactDate: string } | undefined;
        if (!tm?.lastContactDate) return false;
        return new Date(tm.lastContactDate) >= new Date('2026-03-15');
      }).length / totalCustomers * 100
    : 0;

  // Sales
  const totalOrders = salesRecords.length;
  const { start, end } = getCurrentWeekRange();
  const newOrders = salesRecords.filter(r => {
    const d = new Date(r.signDate);
    return d >= start && d <= end;
  }).length;

  return {
    totalOrders,
    newOrders,
    productUsageRate: parseFloat(productUsageRate.toFixed(1)),
    contentInteractionRate: parseFloat(contentInteractionRate.toFixed(1)),
    renewalRate: parseFloat(renewalRate.toFixed(1)),
    npsScore: parseFloat(npsScore.toFixed(0)),
    customersPerCSM: parseFloat(customersPerCSM.toFixed(0)),
    customerCoverageRate: parseFloat(customerCoverageRate.toFixed(1)),
    upsellRate: parseFloat(upsellRate.toFixed(1)),
    followerGrowthRate: parseFloat(followerGrowthRate.toFixed(1)),
    inquiryRate: parseFloat(inquiryRate.toFixed(1)),
    productUsageDepth: parseFloat(productUsageDepth.toFixed(1)),
  };
}

export function calculateHealthDistribution(csRecords: CleanedCSRecord[]): HealthDistribution {
  return {
    healthy: csRecords.filter(r => r.healthTier === 'healthy').length,
    attention: csRecords.filter(r => r.healthTier === 'attention').length,
    warning: csRecords.filter(r => r.healthTier === 'warning').length,
    danger: csRecords.filter(r => r.healthTier === 'danger').length,
  };
}

export function getMetricHealth(key: string, value: number): {
  status: 'green' | 'yellow' | 'red' | 'neutral';
  emoji: string;
  threshold: string;
} {
  switch (key) {
    case 'productUsageRate':
      if (value >= 70) return { status: 'green', emoji: '🟢', threshold: '≥70%' };
      if (value >= 50) return { status: 'yellow', emoji: '🟡', threshold: '50-69%' };
      return { status: 'red', emoji: '🔴', threshold: '<50%' };
    case 'contentInteractionRate':
      if (value >= 8) return { status: 'green', emoji: '🟢', threshold: '≥8%' };
      if (value >= 4) return { status: 'yellow', emoji: '🟡', threshold: '4-7%' };
      return { status: 'red', emoji: '🔴', threshold: '<4%' };
    case 'renewalRate':
      if (value >= 80) return { status: 'green', emoji: '🟢', threshold: '≥80%' };
      if (value >= 60) return { status: 'yellow', emoji: '🟡', threshold: '60-79%' };
      return { status: 'red', emoji: '🔴', threshold: '<60%' };
    case 'npsScore':
      if (value >= 60) return { status: 'green', emoji: '🟢', threshold: '≥60' };
      if (value >= 40) return { status: 'yellow', emoji: '🟡', threshold: '40-59' };
      return { status: 'red', emoji: '🔴', threshold: '<40' };
    case 'upsellRate':
      if (value >= 15) return { status: 'green', emoji: '🟢', threshold: '≥15%' };
      if (value >= 8) return { status: 'yellow', emoji: '🟡', threshold: '8-14%' };
      return { status: 'red', emoji: '🔴', threshold: '<8%' };
    case 'followerGrowthRate':
      if (value >= 10) return { status: 'green', emoji: '🟢', threshold: '≥10%' };
      if (value >= 3) return { status: 'yellow', emoji: '🟡', threshold: '3-9%' };
      return { status: 'red', emoji: '🔴', threshold: '<3%' };
    case 'inquiryRate':
      if (value >= 5) return { status: 'green', emoji: '🟢', threshold: '≥5%' };
      if (value >= 2) return { status: 'yellow', emoji: '🟡', threshold: '2-4%' };
      return { status: 'red', emoji: '🔴', threshold: '<2%' };
    case 'customersPerCSM':
      if (value <= 50) return { status: 'green', emoji: '🟢', threshold: '≤50' };
      if (value <= 70) return { status: 'yellow', emoji: '🟡', threshold: '50-70' };
      return { status: 'red', emoji: '🔴', threshold: '>70' };
    case 'customerCoverageRate':
      if (value >= 80) return { status: 'green', emoji: '🟢', threshold: '≥80%' };
      if (value >= 60) return { status: 'yellow', emoji: '🟡', threshold: '60-79%' };
      return { status: 'red', emoji: '🔴', threshold: '<60%' };
    case 'productUsageDepth':
      if (value >= 4) return { status: 'green', emoji: '🟢', threshold: '≥4模块' };
      if (value >= 2) return { status: 'yellow', emoji: '🟡', threshold: '2-3模块' };
      return { status: 'red', emoji: '🔴', threshold: '<2模块' };
    default:
      return { status: 'neutral', emoji: '→', threshold: '趋势指标' };
  }
}

export function buildMetricCards(current: CoreMetrics, _previous: CoreMetrics | null): MetricWithHealth[] {
  const metricDefs: Array<{ key: keyof CoreMetrics; name: string; unit: string; fmt: (v: number) => string }> = [
    { key: 'productUsageRate', name: '产品使用率', unit: '%', fmt: v => `${v.toFixed(1)}%` },
    { key: 'followerGrowthRate', name: '粉丝增长率', unit: '%', fmt: v => `${v.toFixed(1)}%` },
    { key: 'contentInteractionRate', name: '内容互动率', unit: '%', fmt: v => `${v.toFixed(1)}%` },
    { key: 'inquiryRate', name: '询盘率', unit: '%', fmt: v => `${v.toFixed(1)}%` },
    { key: 'npsScore', name: 'NPS满意度', unit: '分', fmt: v => `${v.toFixed(0)}` },
    { key: 'renewalRate', name: '续约率', unit: '%', fmt: v => `${v.toFixed(1)}%` },
    { key: 'upsellRate', name: '增购率', unit: '%', fmt: v => `${v.toFixed(1)}%` },
    { key: 'customerCoverageRate', name: '客户覆盖率', unit: '%', fmt: v => `${v.toFixed(1)}%` },
    { key: 'productUsageDepth', name: '产品使用深度', unit: '模块', fmt: v => `${v.toFixed(1)}` },
    { key: 'customersPerCSM', name: '人均服务客户', unit: '家/人', fmt: v => `${v.toFixed(0)}` },
    { key: 'totalOrders', name: '累计订单', unit: '单', fmt: v => `${v}` },
    { key: 'newOrders', name: '本周新增订单', unit: '单', fmt: v => `${v}` },
  ];

  return metricDefs.map(({ key, name, unit, fmt }) => {
    const value = current[key];
    const health = getMetricHealth(key, value as number);
    return {
      key,
      name,
      value: value as number,
      display: fmt(value as number),
      unit,
      lastWeekValue: null,
      healthStatus: health.status,
      healthEmoji: health.emoji,
      threshold: health.threshold,
      direction: '—' as const,
      changePercent: null,
    };
  });
}
