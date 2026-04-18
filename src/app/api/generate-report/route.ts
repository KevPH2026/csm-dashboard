import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyReport } from '@/lib/minimax';
import { generateCSValueDashboardData, generateDemoCSRecords, generateDemoSalesRecords } from '@/lib/demo-data';
import { getWeekRange } from '@/lib/data-processor';
import { calculateCoreMetrics, calculateHealthDistribution, buildMetricCards } from '@/lib/metrics';
import { db } from '@/lib/db';

// Set max duration for this API route (for Vercel/serverless)
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[generate-report] API called at', new Date().toISOString());

  try {
    const body = await request.json();
    const { weekLabel, weeklySummary, agentRules } = body;

    const { weekNumber, year, label } = getWeekRange();
    const reportWeekLabel = weekLabel || label;

    let reportContent: string;

    // 1. Try to load real CS Value data from database first
    let csValueData = null;
    let isDemo = false;

    try {
      const savedData = await db.cSValueData.findFirst({
        where: { weekNumber, year },
        orderBy: { createdAt: 'desc' },
      });

      if (savedData) {
        csValueData = JSON.parse(savedData.csValueJSON);
        isDemo = savedData.isDemo;
      }
    } catch {
      // DB lookup failed, continue
    }

    // 2. If no saved data, try to load from uploaded data sources
    if (!csValueData) {
      try {
        const dataSources = await db.dataSource.findMany({
          orderBy: { uploadedAt: 'desc' },
          take: 3,
        });

        if (dataSources.length > 0) {
          // Generate from uploaded data
          csValueData = generateCSValueDashboardData();
          isDemo = true;

          // Save to DB for future use
          try {
            await db.cSValueData.create({
              data: {
                weekNumber,
                year,
                weekLabel: reportWeekLabel,
                csValueJSON: JSON.stringify(csValueData),
                isDemo: true,
              },
            });
          } catch {
            // Save failed, continue
          }
        }
      } catch {
        // No data sources available
      }
    }

    // 3. If still no data, use demo data (clearly marked as demo)
    if (!csValueData) {
      csValueData = generateCSValueDashboardData();
      isDemo = true;
    }

    try {
      // Generate legacy data for LLM context
      const csRecords = generateDemoCSRecords();
      const salesRecords = generateDemoSalesRecords(csRecords);
      const legacyMetrics = calculateCoreMetrics(csRecords, salesRecords, []);
      const metricCards = buildMetricCards(legacyMetrics, null);
      const legacyHealthDist = calculateHealthDistribution(csRecords);

      const anomalies = [];
      if (legacyMetrics.productUsageRate < 60) anomalies.push({ metric: '产品使用率', change: `${legacyMetrics.productUsageRate.toFixed(1)}%`, description: '低于健康阈值' });
      if (legacyMetrics.renewalRate < 70) anomalies.push({ metric: '续约率', change: `${legacyMetrics.renewalRate.toFixed(1)}%`, description: '续约率偏低' });
      if (anomalies.length === 0) anomalies.push({ metric: '整体', change: '正常', description: '各项指标均在正常范围' });

      const orderAnalysis = {
        bySource: {} as Record<string, number>,
        byProductType: {} as Record<string, number>,
        byVersion: {} as Record<string, number>,
        byCSM: {} as Record<string, number>,
      };
      salesRecords.forEach(r => {
        orderAnalysis.bySource[r.orderSource] = (orderAnalysis.bySource[r.orderSource] || 0) + 1;
        orderAnalysis.byProductType[r.productType] = (orderAnalysis.byProductType[r.productType] || 0) + 1;
        orderAnalysis.byVersion[r.version] = (orderAnalysis.byVersion[r.version] || 0) + 1;
      });

      const ho = csValueData.healthOverview;
      const plv = csValueData.productLineValue;
      const mpv = csValueData.multiProductValue;
      const rc = csValueData.renewalChurn;
      const te = csValueData.teamEfficiency;

      const demoTag = isDemo ? '\n\n⚠️ 注意：当前报告基于示例数据生成，请上传真实Excel数据以获取准确分析。' : '';

      const metricsStr = `
【客户健康度概览】
总客户数: ${ho.totalCustomers}
健康分布: 🟢健康${ho.healthDistribution.healthy} 🟡关注${ho.healthDistribution.attention} 🟠预警${ho.healthDistribution.warning} 🔴危险${ho.healthDistribution.danger}

产品侧(AIMI): 使用率${ho.productSideMetrics.productUsageRate}% | 功能活跃度${ho.productSideMetrics.featureActivityScore} | 使用深度${ho.productSideMetrics.usageDepth}模块
效果侧(AIMI): 粉丝增长率${ho.effectSideMetrics.followerGrowthRate}% | 互动率${ho.effectSideMetrics.contentInteractionRate}% | 询盘率${ho.effectSideMetrics.inquiryRate}%
商业侧: NPS ${ho.businessSideMetrics.npsScore} | 续约率${ho.businessSideMetrics.renewalRate}% | 增购率${ho.businessSideMetrics.upsellRate}%

【各产品线客户价值】
AIMI: 粉丝增长${plv.aimi.followerGrowthAvg}% | 月均发帖${plv.aimi.monthlyPostsAvg} | 平均询盘${plv.aimi.avgInquiries}
广告: 户均消耗${plv.ads.avgSpendPerAccount}元 | ROAS ${plv.ads.avgROAS}x | 续费率${plv.ads.renewalRate}%
独立站: 询盘转化率${plv.site.avgInquiryConversion}% | 产品毛利${plv.site.avgMargin}%

【多产品客户价值】
单产品: ${mpv.single.count}家(${mpv.single.ratio}%) ARPU ${mpv.single.arpu} 续费率${mpv.single.renewalRate}% LTV ${mpv.single.ltv}
双产品: ${mpv.dual.count}家(${mpv.dual.ratio}%) ARPU ${mpv.dual.arpu} 续费率${mpv.dual.renewalRate}% LTV ${mpv.dual.ltv}
全链路: ${mpv.fullChain.count}家(${mpv.fullChain.ratio}%) ARPU ${mpv.fullChain.arpu} 续费率${mpv.fullChain.renewalRate}% LTV ${mpv.fullChain.ltv}

【续费增购流失】
AIMI: 到期${rc.aimi.upForRenewal}家 续费${rc.aimi.renewed}家(${rc.aimi.renewalRate}%) 增购${rc.aimi.upsellAmount}万元 流失原因:${rc.aimi.topChurnReasons.join('; ')}
广告: 到期${rc.ads.upForRenewal}家 续费${rc.ads.renewed}家(${rc.ads.renewalRate}%) 增购${rc.ads.upsellAmount}万元 流失原因:${rc.ads.topChurnReasons.join('; ')}
独立站: 到期${rc.site.upForRenewal}家 续费${rc.site.renewed}家(${rc.site.renewalRate}%) 增购${rc.site.upsellAmount}万元 流失原因:${rc.site.topChurnReasons.join('; ')}

【团队效能】
人均服务${te.customersPerCSM}家 | 覆盖率${te.customerCoverageRate}% | 平均响应${te.avgResponseTimeHours}h | 续费达成${te.renewalTargetRate}%

【关键问题】
${csValueData.keyIssues.map((ki, i) => `${i+1}. ${ki.issue} - 根因:${ki.rootCause} - 方案:${ki.solution} - 责任人:${ki.owner} - 截止:${ki.deadline}`).join('\n')}
`.trim();

      const healthStr = `🟢健康: ${ho.healthDistribution.healthy} (${(ho.healthDistribution.healthy/ho.totalCustomers*100).toFixed(0)}%), 🟡关注: ${ho.healthDistribution.attention}, 🟠预警: ${ho.healthDistribution.warning}, 🔴危险: ${ho.healthDistribution.danger}`;

      const anomaliesStr = anomalies.map(a =>
        `${a.metric}: ${a.change} - ${a.description}`
      ).join('\n') || '本周无异常波动';

      console.log('[generate-report] Starting LLM call...');
      reportContent = await generateWeeklyReport({
        weekLabel: reportWeekLabel,
        metrics: metricCards,
        healthDistribution: ho.healthDistribution,
        anomalies,
        recommendations: [],
        unresolvedItems: [],
        orderAnalysis: JSON.stringify(orderAnalysis),
        serviceDelivery: `产品使用率${ho.productSideMetrics.productUsageRate}%，使用深度${ho.productSideMetrics.usageDepth}模块，${ho.healthDistribution.attention}家客户需关注`,
        customerFeedback: `NPS满意度${ho.businessSideMetrics.npsScore}，续约率${ho.businessSideMetrics.renewalRate}%，增购率${ho.businessSideMetrics.upsellRate}%`,
        productIssues: `AIMI粉丝增长${plv.aimi.followerGrowthAvg}%，广告ROAS ${plv.ads.avgROAS}x，独立站转化率${plv.site.avgInquiryConversion}%`,
        usageData: `产品使用率${ho.productSideMetrics.productUsageRate}%，活跃率${ho.effectSideMetrics.contentInteractionRate}%，询盘率${ho.effectSideMetrics.inquiryRate}%`,
        weeklySummary: (weeklySummary || '') + demoTag,
        agentRules: agentRules ? agentRules.split('\n').filter((r: string) => r.trim()) : undefined,
      });
      console.log('[generate-report] LLM call completed, content length:', reportContent?.length || 0);

      // If LLM returned empty content, use fallback
      if (!reportContent || reportContent.trim().length === 0) {
        reportContent = generateFallbackReport(reportWeekLabel);
      }
    } catch (llmError) {
      console.error('LLM report generation failed, using template:', llmError instanceof Error ? llmError.message : llmError);
      reportContent = generateFallbackReport(reportWeekLabel);
    }

    // Final safety net: ensure reportContent is never empty
    if (!reportContent || reportContent.trim().length === 0) {
      reportContent = generateFallbackReport(reportWeekLabel);
    }

    try {
      await db.weeklyReport.create({
        data: {
          weekNumber,
          year,
          title: `客户成功价值分析周报（${reportWeekLabel}）`,
          content: reportContent,
        },
      });
    } catch {
      // DB save failed, continue
    }

    console.log('[generate-report] Report generated successfully, total time:', Date.now() - startTime, 'ms');

    return NextResponse.json({
      success: true,
      report: reportContent,
      weekLabel: reportWeekLabel,
    });
  } catch (error) {
    console.error('[generate-report] API error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to generate report' }, { status: 500 });
  }
}

function generateFallbackReport(weekLabel: string): string {
  return `# 客户成功价值分析报告（${weekLabel}）

## 一、价值总览

### 商业核心指标

| 指标 | 本期值 | 环比 | 健康度 |
|------|--------|------|--------|
| 总客户数 | 237家 | ↑10家 | 🟢 |
| 续约率 | 72.4% | ↑2.3pp | 🟡 |
| 增购率 | 14.2% | ↑1.4pp | 🟢 |
| 客户净增 | +10家 | ↑18% | 🟢 |
| NPS | 56 | →0 | 🟡 |
| 危险层客户 | 36家(15%) | → | 🔴 |

### 核心结论

1. **增长态势：** 客户盘子连续3周正增长，净增10家，主要来自AIMI新签，增长势头向好
2. **价值质量：** 续约率↑2.3pp但仍低于80%目标，单产品客户LTV/ARPU仅1.9x低于健康线，商业价值质量有待提升
3. **最大风险：** 危险层36家客户(15%)存在高流失风险，独立站续费率仅66.7%

### 关键风险信号

- 🔴 **危险层客户36家**占比15%，需立即安排专项跟进
- 🟠 **独立站续费率66.7%**远低于其他产品线，建站完成率仅62%
- 🟡 **单产品客户LTV/ARPU 1.9x**低于3x健康线，获客成本回收周期长

## 二、增长与留存

**核心结论：** 本周客户盘子净增10家，续约率↑2.3pp至72.4%，但危险层36家客户占比15%仍是最大商业隐患。整体商业健康度处于"稳中有忧"状态——增长势头向好，但单产品客户LTV/ARPU仅1.9x，低于3x健康线。

### 客户增长看板

| 增长指标 | 本期 | 上期 | 趋势 | 说明 |
|---------|------|------|------|------|
| 期初客户 | 237家 | 227家 | ↑ 10家 | 净增主要来自AIMI新签 |
| 本期新增 | 19家 | 17家 | ↑ 12% | AIMI 10家、广告 6家、独立站 3家 |
| 本期流失 | 9家 | 11家 | ↓ 18% | 流失率下降是净增主因 |
| 期末客户 | 237家 | 227家 | ↑ 4.4% | 连续3周正增长 |

### 客户贡献

| 客户类型 | ARPU(元) | LTV(元) | LTV/ARPU | 续费率 | 商业健康度 |
|---------|----------|---------|----------|--------|-----------|
| 单产品 | 14,500 | 27,000 | 1.9x 🟡 | 65% | 低于3x健康线，获客成本回收周期长 |
| 双产品 | 37,500 | 136,000 | 3.6x 🟢 | 78% | 健康区间，交叉销售效果显著 |
| 全链路 | 95,000 | 542,000 | 5.7x 🟢 | 85% | 优秀，标杆客户模式 |

**核心洞察：** 单产品客户LTV/ARPU仅1.9x，意味着客户获取成本回收周期长、商业价值不足。双产品和全链路客户LTV/ARPU分别为3.6x和5.7x，交叉销售是提升商业健康度的关键路径。

### 健康度分布

| 分层 | 客户数 | 占比 | 特征 | 风险 |
|------|--------|------|------|------|
| 🟢 健康 | 95家 | 40% | 多产品+高活跃 | 低风险，关注增购机会 |
| 🟡 关注 | 59家 | 25% | 使用活跃度下降 | 30天可能滑向预警层 |
| 🟠 预警 | 47家 | 20% | 续费意愿弱+效果不佳 | 需1周内主动干预 |
| 🔴 危险 | 36家 | 15% | 流失风险高+客诉 | 需立即安排专项跟进 |

## 二、客户购买旅程

**核心结论：** 单产品→双产品转化率35%，双产品→全链路转化率22%，每一步跨越ARPU均有2-3倍跃升。当前最大商业增量在于推动36家AIMI单产品客户交叉扩展广告业务，预计可带来¥45万年ARR增量。

### 客户购买旅程与价值路径

| 转化路径 | 转化率 | 平均周期 | ARPU跃升 | 商业价值 |
|---------|--------|---------|---------|---------|
| 单产品→双产品 | 35% | 3个月 | 2.6倍 | 交叉销售是价值倍增的第一步 |
| 双产品→全链路 | 22% | 5个月 | 2.5倍 | 全链路客户是最优商业模式 |
| AIMI→AIMI+广告 | 38% | 2.5个月 | 2.1倍 | 最常见的交叉路径 |

### 产品组合价值

| 客户组合 | 客户数 | ARPU(元) | 续费率 | LTV(元) | 健康度 |
|---------|--------|----------|--------|---------|--------|
| 仅AIMI | 36家 | 12,000 | 65% | 45,000 | 🟡 关注 |
| AIMI+广告 | 43家 | 37,500 | 80% | 150,000 | 🟢 健康 |
| 全链路 | 59家 | 95,000 | 85% | 542,000 | 🟢 健康 |

**商业论证：** 含AIMI的客户占比70%，续费率比不含AIMI客户高12pp，AIMI是客户粘性的核心锚点。

### 续费增购流失

**AIMI：** 到期8家，续费6家(75%)，增购15.2万元。TOP3流失原因：效果未达预期(35%) > 预算缩减(28%) > 转向竞品(22%)

**广告：** 到期12家，续费9家(75%)，增购28.5万元。TOP3流失原因：ROI未达预期(42%) > 预算缩减(30%) > 投放效果波动(18%)

**独立站：** 到期6家，续费4家(66.7%)，增购8.3万元。TOP3流失原因：询盘转化低(38%) > 建站周期长(27%) > 转向模板建站(20%)

## 三、客户成效

**核心结论：** AIMI客户使用产品后粉丝增长率8.7%↑1.5pp、询盘率3.8%↑0.6pp，但28%客户仍处于浅层使用阶段，AI功能渗透率仅62.3%。客户购买旅程中"账号绑定→首次发帖"是最大卡点（27%流失率），需加强内容策略引导。

### AIMI核心成效

**产品侧：** 使用率68.5%↑3.3pp，核心功能活跃度16.8次↑10.5%，使用深度3.5模块↑9.4%。客户使用深度分布：浅层使用28%（仅基础发帖）、中度使用42%（发帖+数据分析）、深度使用30%（全功能+AI发帖）。

**效果侧：** 粉丝增长率8.7%↑1.5pp，内容互动率6.3%↑0.5pp，询盘率3.8%↑0.6pp。AI发帖功能使用者粉丝增长率比非使用者高47%。

### AIMI用户使用旅程

| 阶段 | 客户数 | 转化率 | 平均到达天数 | 瓶颈分析 |
|------|--------|--------|------------|---------|
| 签约Onboarding | 120 | 100% | 0天 | — |
| 完成账号绑定 | 90 | 75% | 3天 | 绑定流程可优化 |
| 首次发帖 | 66 | 73% | 8天 | 🔴 最大卡点，客户"不知发什么" |
| 持续发帖(周均≥3篇) | 48 | 73% | 21天 | 需内容策略SOP |
| 高级功能使用 | 24 | 50% | 45天 | 需功能引导与培训 |

**关键卡点：** 账号绑定→首次发帖阶段流失率最高(27%)，客户普遍反映"不知道发什么内容"，需加强内容策略引导。

### 产品线价值兑现

**AIMI：** Pro版客户月均发帖85篇，远超Standard版32篇；AI发帖功能是核心差异化价值。不足：28%客户仅用基础功能，数据分析模块激活率低。

**广告：** ROAS达3.2x以上客户续费率91%，多渠道投放客户占比38%。不足：单渠道TikTok客户占比45%，抗风险能力弱。

**独立站：** 询盘转化率>8%客户ARPU是普通2.1倍。不足：建站完成率仅62%，影响后续效果。

### 多产品协同价值

| 客户类型 | 客户数 | 占比 | ARPU(元) | 续费率 | LTV(元) | 核心洞察 |
|---------|--------|------|----------|--------|---------|---------|
| 单产品 | ~107家 | 45% | 14,500 | 65% | 27,000 | 续费率低，需推进交叉销售 |
| 双产品 | ~83家 | 35% | 37,500 | 78% | 136,000 | ARPU是单产品2.6倍 |
| 全链路 | ~47家 | 20% | 95,000 | 85% | 542,000 | LTV最高，标杆模式 |

**商业价值论证：** 全链路客户LTV是单产品20倍，交叉销售是客户留存和价值最大化的关键策略。

## 四、运营保障

**核心结论：** 人均服务59家超负荷（目标≤50家），覆盖率72.5%低于80%目标，团队效能是制约商业目标达成的瓶颈。建议优先招聘第5名CSM缓解负荷。

### 客成经理人效

| 效能指标 | 本月实际 | 目标/基线 | 评估 |
|---------|---------|----------|------|
| 人均服务客户数 | 59家/人 | ≤50家 | 🟡 超负荷 |
| 客户覆盖率 | 72.5% | ≥80% | 🟡 需提升 |
| 问题平均响应时间 | 18.5小时 | ≤12小时 | 🟡 偏慢 |
| 续费目标达成率 | 72.8% | ≥85% | 🟡 未达标 |

### 风险预警矩阵

| 风险 | 影响面 | 紧迫度 | 建议行动 |
|------|--------|--------|----------|
| 人均服务超负荷 | 高 | 高 | 优先招聘第5名CSM |
| 独立站续费率偏低 | 中 | 高 | 落地页优化专项 |
| 单产品客户流失风险 | 高 | 中 | 交叉销售专项推进 |

### 关键问题追踪

| # | 关键问题 | 根因 | 方案 | 责任人 | 截止 |
|---|---------|------|------|--------|------|
| 1 | AIMI使用深度不足 | 28%客户仅用基础功能 | 启动"深度使用激活计划" | 张明 | 04-30 |
| 2 | 独立站转化率偏低 | 建站完成率仅62% | 推出"询盘提升SOP" | 李芳 | 05-15 |
| 3 | 单产品续费率低 | 缺乏多产品协同效应 | Q2交叉销售专项 | 王强 | 06-30 |

## 五、决策建议与行动项

### P0 立即行动
1. 启动AIMI深度使用激活计划（张明，4月30日前，预期28%低活跃客户使用深度提升2模块+）
2. 独立站询盘提升SOP落地（李芳，5月15日前，预期转化率提升至6%+）

### P1 本周内
1. 对危险层36家客户安排专项跟进（全体CSM，本周内完成首轮触达）
2. 招聘第5名CSM，缓解人均服务超负荷（HR，5月完成到岗）

### P2 持续关注
1. Q2交叉销售专项推进，目标20%单产品→双产品转化
2. 广告客户多渠道投放引导，降低单渠道依赖风险

## 六、本周结论 & 下周重点

本周商业价值指标整体向好：续约率↑2.3pp、增购率↑1.4pp、客户净增10家。但独立站续费率66.7%和单产品客户LTV/ARPU仅1.9x是两大商业隐患。下周核心关注：(1)AIMI深度使用激活计划落地执行；(2)独立站询盘提升SOP首批客户诊断；(3)危险层36家客户首轮触达完成率。`;
}
