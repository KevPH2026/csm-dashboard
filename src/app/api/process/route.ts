import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { generateCSValueDataFromReal, generateCSValueDashboardData } from '@/lib/demo-data';
import type { CSImplementationRecord, SalesRecord, UserActivityRecord } from '@/lib/data-processor';
import { getWeekRange } from '@/lib/data-processor';
import { db } from '@/lib/db';

export const maxDuration = 60;

// ============ Direct Excel Parsing (No LLM) ============

const CS_FIELDS: Record<string, string[]> = {
  '客户名称': ['客户名称', '客户', '公司名称', '客户名', 'company', 'customer'],
  '客成经理': ['客成经理', 'CSM', '客户经理', '负责人', 'csm', 'manager'],
  '产品类型': ['产品类型', '产品', '产品线', '业务类型', 'product', '业务'],
  '版本': ['版本', '套餐', '版本类型', '产品版本', 'version', '类型'],
  '培训状态': ['培训状态', '培训', '是否培训', '培训情况', 'training'],
  '服务状态': ['服务状态', '状态', '服务情况', '当前状态', 'status'],
  '客诉标记': ['客诉标记', '客诉', '投诉', '是否投诉', 'complaint'],
  '赔偿标记': ['赔偿标记', '赔偿', '是否赔偿', 'compensation'],
  '备注': ['备注', '说明', '备注信息', 'remark', 'note'],
  '签约日期': ['签约日期', '签订日期', '合同日期', '日期', 'sign_date', 'date'],
};

const SALES_FIELDS: Record<string, string[]> = {
  '订单编号': ['订单编号', '订单号', '编号', 'order_id', 'order'],
  '客户名称': ['客户名称', '客户', '公司名称', 'customer'],
  '订单来源': ['订单来源', '来源', '渠道', 'source'],
  '产品类型': ['产品类型', '产品', '产品线', 'product'],
  '版本': ['版本', '套餐', 'version'],
  '签约日期': ['签约日期', '日期', 'date'],
  '订单金额': ['订单金额', '金额', '费用', 'amount', 'revenue', '收入'],
  '订单时长': ['订单时长', '时长', '周期', 'duration', 'months'],
};

const USER_FIELDS: Record<string, string[]> = {
  '客户名称': ['客户名称', '客户', '公司名称', 'customer'],
  '帖子内容类型': ['帖子内容类型', '内容类型', '类型', 'content_type', '帖子类型'],
  '社媒类型': ['社媒类型', '平台', '社交媒体', 'platform', 'social'],
  '是否AI生成': ['是否AI生成', 'AI生成', 'AI', 'is_ai', 'ai_generated'],
  '曝光数': ['曝光数', '曝光量', '展示', 'impressions', 'views'],
  '互动数': ['互动数', '互动量', '交互', 'interactions', 'engagement'],
  '点赞数': ['点赞数', '点赞', 'likes'],
  '评论数': ['评论数', '评论', 'comments'],
  '发帖日期': ['发帖日期', '日期', 'post_date', 'date'],
};

const VOC_FIELDS: Record<string, string[]> = {
  '客户名称': ['客户名称', '客户', '公司名称', 'customer'],
  '反馈类型': ['反馈类型', '类型', 'feedback_type', 'type'],
  '反馈内容': ['反馈内容', '内容', '反馈', 'content', 'feedback'],
  '产品线': ['产品线', '产品', '产品类型', 'product_line', 'product'],
  '日期': ['日期', '反馈日期', 'date'],
};

function mapHeaders(actualHeaders: string[], fieldMap: Record<string, string[]>): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const header of actualHeaders) {
    const trimmed = header.trim().toLowerCase();
    for (const [standard, aliases] of Object.entries(fieldMap)) {
      const matched = aliases.some(alias =>
        trimmed === alias.toLowerCase() ||
        trimmed.includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(trimmed)
      );
      if (matched) {
        mapping[header] = standard;
        break;
      }
    }
  }
  return mapping;
}

function applyMapping(rawRows: Record<string, unknown>[], mapping: Record<string, string>): Record<string, unknown>[] {
  return rawRows.map(row => {
    const newRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = mapping[key];
      if (mappedKey) newRow[mappedKey] = value;
    }
    return newRow;
  });
}

function parseExcelBuffer(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
}

function determineTrainingStatus(value: string): boolean {
  const v = String(value || '').trim().toLowerCase();
  const positive = ['已完成', '已培训', '完成', '是', 'done', 'yes', '✓', '√'];
  const negative = ['未完成', '未培训', '否', 'no', '待培训', '未安排'];
  for (const kw of positive) { if (v.includes(kw.toLowerCase())) return true; }
  for (const kw of negative) { if (v.includes(kw.toLowerCase())) return false; }
  return false;
}

function determineServiceBlocked(status: string): boolean {
  const s = String(status || '');
  return ['受阻', '延迟', '待协调', '暂停', '未开通', '未拉群'].some(kw => s.includes(kw));
}

function hasComplaint(field: string, remarks: string): boolean {
  const c = String(field || '').trim();
  if (c && c !== '无' && c !== '否' && c !== '0') return true;
  const r = String(remarks || '');
  return ['客诉', '投诉', '不满', '退款', '赔偿'].some(kw => r.includes(kw));
}

function hasCompensation(field: string, remarks: string): boolean {
  const c = String(field || '').trim();
  if (c && c !== '无' && c !== '否' && c !== '0') return true;
  const r = String(remarks || '');
  return ['已赔偿', '已退款', '赔偿完成'].some(kw => r.includes(kw));
}

function determineAIGenerated(value: string): boolean {
  const v = String(value || '').trim().toLowerCase();
  const positive = ['是', 'yes', 'ai', 'true', '1', '✓'];
  const negative = ['否', 'no', '非ai', 'false', '0'];
  for (const kw of positive) { if (v.includes(kw)) return true; }
  for (const kw of negative) { if (v.includes(kw)) return false; }
  return false;
}

// ============ Main Process API ============

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const formData = await request.formData();
    const csFile = formData.get('cs_implementation') as File | null;
    const salesFile = formData.get('sales') as File | null;
    const userFile = formData.get('user_activity') as File | null;
    const vocFile = formData.get('voc') as File | null;

    console.log(`[Process] Received files: cs=${!!csFile} sales=${!!salesFile} user=${!!userFile} voc=${!!vocFile}`);

    // ============ Parse CS Implementation Data ============
    let csData: CSImplementationRecord[] = [];
    if (csFile) {
      try {
        const buffer = Buffer.from(await csFile.arrayBuffer());
        const rawRows = parseExcelBuffer(buffer);
        if (rawRows.length > 0) {
          const headers = Object.keys(rawRows[0]);
          const mapping = mapHeaders(headers, CS_FIELDS);
          const mapped = applyMapping(rawRows, mapping);
          csData = mapped.map(row => {
            const record: CSImplementationRecord = {
              客户名称: String(row['客户名称'] || ''),
              客成经理: String(row['客成经理'] || ''),
              产品类型: String(row['产品类型'] || ''),
              版本: String(row['版本'] || ''),
              培训状态: String(row['培训状态'] || ''),
              服务状态: String(row['服务状态'] || ''),
              客诉标记: String(row['客诉标记'] || ''),
              赔偿标记: String(row['赔偿标记'] || ''),
              备注: String(row['备注'] || ''),
              签约日期: String(row['签约日期'] || ''),
            };
            record.已培训 = determineTrainingStatus(record.培训状态);
            record.有客诉 = hasComplaint(record.客诉标记, record.备注);
            record.已赔偿 = hasCompensation(record.赔偿标记, record.备注);
            record.服务受阻 = determineServiceBlocked(record.服务状态);
            return record;
          }).filter(r => r.客户名称); // filter out rows without customer name
        }
        console.log(`[Process] CS data parsed: ${csData.length} records`);
        console.log(`[Process] CS data header mapping:`, { originalHeaders: rawRows.length > 0 ? Object.keys(rawRows[0]) : [], mappedFields: Object.keys(mapping) });
      } catch (err) {
        console.error('[Process] CS data parsing error:', err);
      }
    }

    // ============ Parse Sales Data ============
    let salesData: SalesRecord[] = [];
    if (salesFile) {
      try {
        const buffer = Buffer.from(await salesFile.arrayBuffer());
        const rawRows = parseExcelBuffer(buffer);
        if (rawRows.length > 0) {
          const headers = Object.keys(rawRows[0]);
          const mapping = mapHeaders(headers, SALES_FIELDS);
          const mapped = applyMapping(rawRows, mapping);
          salesData = mapped.map(row => ({
            订单编号: String(row['订单编号'] || ''),
            客户名称: String(row['客户名称'] || ''),
            订单来源: String(row['订单来源'] || ''),
            产品类型: String(row['产品类型'] || ''),
            版本: String(row['版本'] || ''),
            签约日期: String(row['签约日期'] || ''),
            订单金额: Number(row['订单金额'] || 0),
            订单时长: String(row['订单时长'] || ''),
          })).filter(r => r.客户名称);
        }
        console.log(`[Process] Sales data parsed: ${salesData.length} records`);
        console.log(`[Process] Sales data header mapping:`, { originalHeaders: rawRows.length > 0 ? Object.keys(rawRows[0]) : [], mappedFields: Object.keys(mapping) });
      } catch (err) {
        console.error('[Process] Sales data parsing error:', err);
      }
    }

    // ============ Parse User Activity Data ============
    let userData: UserActivityRecord[] = [];
    if (userFile) {
      try {
        const buffer = Buffer.from(await userFile.arrayBuffer());
        const rawRows = parseExcelBuffer(buffer);
        if (rawRows.length > 0) {
          const headers = Object.keys(rawRows[0]);
          const mapping = mapHeaders(headers, USER_FIELDS);
          const mapped = applyMapping(rawRows, mapping);
          userData = mapped.map(row => {
            const record: UserActivityRecord = {
              客户名称: String(row['客户名称'] || ''),
              帖子内容类型: String(row['帖子内容类型'] || ''),
              社媒类型: String(row['社媒类型'] || ''),
              是否AI生成: String(row['是否AI生成'] || ''),
              曝光数: Number(row['曝光数'] || 0),
              互动数: Number(row['互动数'] || 0),
              点赞数: Number(row['点赞数'] || 0),
              评论数: Number(row['评论数'] || 0),
              发帖日期: String(row['发帖日期'] || ''),
            };
            record.AI生成 = determineAIGenerated(record.是否AI生成);
            return record;
          }).filter(r => r.客户名称);
        }
        console.log(`[Process] User data parsed: ${userData.length} records`);
        console.log(`[Process] User data header mapping:`, { originalHeaders: rawRows.length > 0 ? Object.keys(rawRows[0]) : [], mappedFields: Object.keys(mapping) });
      } catch (err) {
        console.error('[Process] User data parsing error:', err);
      }
    }

    // ============ Parse VOC Data ============
    let vocRecords: Array<{ customerName: string; feedbackType: string; content: string; productLine: string; date: string }> = [];
    if (vocFile) {
      try {
        const buffer = Buffer.from(await vocFile.arrayBuffer());
        const rawRows = parseExcelBuffer(buffer);
        if (rawRows.length > 0) {
          const headers = Object.keys(rawRows[0]);
          const mapping = mapHeaders(headers, VOC_FIELDS);
          const mapped = applyMapping(rawRows, mapping);
          vocRecords = mapped.map(row => ({
            customerName: String(row['客户名称'] || ''),
            feedbackType: String(row['反馈类型'] || ''),
            content: String(row['反馈内容'] || ''),
            productLine: String(row['产品线'] || ''),
            date: String(row['日期'] || ''),
          })).filter(r => r.customerName || r.content);
        }
        console.log(`[Process] VOC data parsed: ${vocRecords.length} records`);
        console.log(`[Process] VOC data header mapping:`, { originalHeaders: rawRows.length > 0 ? Object.keys(rawRows[0]) : [], mappedFields: Object.keys(mapping) });
      } catch (err) {
        console.error('[Process] VOC data parsing error:', err);
      }
    }

    // ============ Build csValueData ============
    let csValueData;
    let isDemo = false;

    const hasRealData = csData.length > 0 || salesData.length > 0 || userData.length > 0;

    if (hasRealData) {
      console.log(`[Process] Building csValueData from real data: cs=${csData.length} sales=${salesData.length} user=${userData.length} voc=${vocRecords.length}`);
      try {
        csValueData = generateCSValueDataFromReal(csData, salesData, userData, vocRecords);
        isDemo = false;
        console.log(`[Process] generateCSValueDataFromReal succeeded, totalCustomers=${csValueData.healthOverview.totalCustomers}`);
      } catch (err) {
        console.error('[Process] generateCSValueDataFromReal error:', err);
        csValueData = generateCSValueDashboardData();
        isDemo = true;
        console.log('[Process] Fell back to demo data due to error');
      }
    } else {
      console.log('[Process] No real data parsed from any file, using demo data');
      csValueData = generateCSValueDashboardData();
      isDemo = true;
      // Still overlay VOC data even if base is demo
      if (vocRecords.length > 0) {
        csValueData.vocData = vocRecords;
      }
    }

    console.log(`[Process] csValueData built in ${Date.now() - startTime}ms, isDemo=${isDemo}`);

    // ============ Save to DB (blocking to ensure persistence) ============
    try {
      const { weekNumber, year, label } = getWeekRange();
      await db.cSValueData.deleteMany({ where: { weekNumber, year } });
      await db.cSValueData.create({
        data: { weekNumber, year, weekLabel: label, csValueJSON: JSON.stringify(csValueData), isDemo },
      });
      console.log(`[Process] Saved to DB successfully, isDemo=${isDemo}`);
    } catch (dbErr) {
      console.error('[Process] DB save error:', dbErr);
    }

    // ============ Build response ============
    // Collect unique product types for debugging
    const productTypes = [...new Set(csData.map(c => c.产品类型).filter(Boolean))];

    const fileSummary = {
      cs_implementation: csFile ? { name: csFile.name, size: csFile.size, records: csData.length, productTypes } : null,
      sales: salesFile ? { name: salesFile.name, size: salesFile.size, records: salesData.length } : null,
      user_activity: userFile ? { name: userFile.name, size: userFile.size, records: userData.length } : null,
      voc: vocFile ? { name: vocFile.name, size: vocFile.size, records: vocRecords.length } : null,
    };

    console.log(`[Process] Complete in ${Date.now() - startTime}ms. Files:`, JSON.stringify(fileSummary));
    console.log(`[Process] Product types found:`, productTypes);

    // Also compute legacy healthDistribution for compatibility
    const healthDistribution = csValueData.healthOverview.healthDistribution;

    return NextResponse.json({
      success: true,
      csValueData,
      isDemo,
      healthDistribution,
      metrics: [],
      anomalies: [],
      orderAnalysis: { bySource: {}, byProductType: {}, byVersion: {}, byCSM: {} },
      usageAnalysis: { byContentType: {}, byPlatform: {}, aiVsNonAI: { ai: { count: 0, exposure: 0, engagement: 0 }, nonAI: { count: 0, exposure: 0, engagement: 0 } }, topActiveCustomers: [] },
      dangerDetails: [],
      qualityReports: [],
      uploadedFileSummary: fileSummary,
      productTypes,
    });
  } catch (error) {
    console.error('[Process] API error:', error);
    return NextResponse.json({
      success: false,
      error: `数据处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
    }, { status: 500 });
  }
}
