// Core data processing engine for CSM Weekly Report Agent
// Handles Excel parsing, data cleaning pipeline (C1-C5), metrics calculation (M1-M8)

import * as XLSX from 'xlsx';
import { mapHeadersWithLLM } from './minimax';

// ============ Type Definitions ============

// Cleaned record types (used by demo-data.ts and metrics.ts)
export interface CleanedCSRecord {
  customerName: string;
  csmName: string;
  productType: string;
  version: string;
  trainingStatus: string;
  trained: boolean;
  serviceStatus: string;
  serviceNormal: boolean;
  serviceBlocked: boolean;
  hasComplaint: boolean;
  complaintSource?: string;
  hasCompensation: boolean;
  compensationSource?: string;
  remarks: string;
  signDate: string;
  healthTier: 'healthy' | 'attention' | 'warning' | 'danger';
  isRenewed: boolean;
  isUpsold: boolean;
  // Extended fields can be added via Record<string, unknown> intersection
}

export interface CleanedSalesRecord {
  orderId: string;
  customerName: string;
  orderSource: string;
  productType: string;
  version: string;
  signDate: string;
  orderAmount: number;
  orderDuration: number;
}

export interface CleanedUserActivityRecord {
  customerName: string;
  contentType: string;
  socialMediaType: string;
  isAIGenerated: boolean;
  impressions: number;
  interactions: number;
  likes: number;
  comments: number;
  postDate: string;
}

// Health tier calculation helper
export function calculateHealthTier(params: {
  hasComplaint: boolean;
  hasCompensation: boolean;
  remarks: string;
  serviceBlocked: boolean;
  trained: boolean | undefined;
  hasActivity: boolean;
  signDate: string;
}): 'healthy' | 'attention' | 'warning' | 'danger' {
  const { hasComplaint, hasCompensation, serviceBlocked, trained, hasActivity } = params;
  if (hasComplaint || hasCompensation) return 'danger';
  if (serviceBlocked) return 'warning';
  if (trained === false || !hasActivity) return 'attention';
  return 'healthy';
}

export interface CSImplementationRecord {
  客户名称: string;
  客成经理: string;
  产品类型: string;
  版本: string;
  培训状态: string;
  服务状态: string;
  客诉标记: string;
  赔偿标记: string;
  备注: string;
  签约日期: string;
  // Derived fields
  已培训?: boolean;
  有客诉?: boolean;
  已赔偿?: boolean;
  服务受阻?: boolean;
  healthLevel?: 'healthy' | 'attention' | 'warning' | 'danger';
  healthReason?: string;
}

export interface SalesRecord {
  订单编号: string;
  客户名称: string;
  订单来源: string;
  产品类型: string;
  版本: string;
  签约日期: string;
  订单金额: number;
  订单时长: string;
}

export interface UserActivityRecord {
  客户名称: string;
  帖子内容类型: string;
  社媒类型: string;
  是否AI生成: string;
  曝光数: number;
  互动数: number;
  点赞数: number;
  评论数: number;
  发帖日期: string;
  AI生成?: boolean;
}

export interface MetricResult {
  id: string;
  name: string;
  currentValue: number;
  currentDisplay: string;
  lastWeekValue: number | null;
  lastWeekDisplay: string;
  changeAbsolute: number | null;
  changePercent: string | null;
  direction: '↑' | '↓' | '→' | '新增' | '—';
  healthStatus: 'green' | 'yellow' | 'red' | 'neutral';
  healthThreshold: string;
}

export interface DataQualityReport {
  tableName: string;
  originalRows: number;
  filteredTest: number;
  deduplicated: number;
  cleanedRows: number;
  unrecognizedFields: string[];
  missingRequiredFields: number;
  dateAnomalies: number;
  anomalies: number;
}

export interface ProcessedData {
  csData: CSImplementationRecord[];
  salesData: SalesRecord[];
  userData: UserActivityRecord[];
  qualityReports: DataQualityReport[];
  metrics: MetricResult[];
  healthDistribution: {
    healthy: number;
    attention: number;
    warning: number;
    danger: number;
  };
  healthChanges: Array<{
    customer: string;
    from: string;
    to: string;
    reason: string;
  }>;
  dangerDetails: Array<{
    customer: string;
    issue: string;
    status: string;
    action: string;
  }>;
  anomalies: Array<{
    metric: string;
    change: string;
    description: string;
  }>;
  orderAnalysis: {
    bySource: Record<string, number>;
    byProductType: Record<string, number>;
    byVersion: Record<string, number>;
    byCSM: Record<string, number>;
  };
  usageAnalysis: {
    byContentType: Record<string, number>;
    byPlatform: Record<string, number>;
    aiVsNonAI: { ai: { count: number; exposure: number; engagement: number }; nonAI: { count: number; exposure: number; engagement: number } };
    topActiveCustomers: Array<{ name: string; posts: number; engagement: number }>;
  };
}

// ============ Standard Field Definitions ============

const CS_STANDARD_FIELDS = [
  '客户名称', '客成经理', '产品类型', '版本', '培训状态',
  '服务状态', '客诉标记', '赔偿标记', '备注', '签约日期'
];

const SALES_STANDARD_FIELDS = [
  '订单编号', '客户名称', '订单来源', '产品类型', '版本',
  '签约日期', '订单金额', '订单时长'
];

const USER_STANDARD_FIELDS = [
  '客户名称', '帖子内容类型', '社媒类型', '是否AI生成',
  '曝光数', '互动数', '点赞数', '评论数', '发帖日期'
];

// ============ Excel Parsing ============

export function parseExcelFile(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
}

// Parse all sheets from Excel file and return preview data
export interface SheetPreview {
  name: string;
  rows: number;
  cols: number;
  headers: string[];
  previewRows: Record<string, unknown>[];
  columnTypes: Record<string, string>;
  rawData: Record<string, unknown>[];
}

export function parseExcelAllSheets(buffer: Buffer): SheetPreview[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheets: SheetPreview[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawData.length === 0) {
      sheets.push({
        name: sheetName,
        rows: 0,
        cols: 0,
        headers: [],
        previewRows: [],
        columnTypes: {},
        rawData: [],
      });
      continue;
    }

    const headers = Object.keys(rawData[0]);
    const previewRows = rawData.slice(0, 3);

    // Infer column types
    const columnTypes: Record<string, string> = {};
    for (const header of headers) {
      const values = rawData.slice(0, 20).map(r => r[header]);
      const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
      if (nonEmpty.length === 0) {
        columnTypes[header] = 'empty';
      } else if (nonEmpty.every(v => typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== ''))) {
        columnTypes[header] = 'number';
      } else if (nonEmpty.every(v => {
        const s = String(v);
        return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) || (Number(v) > 30000 && Number(v) < 60000);
      })) {
        columnTypes[header] = 'date';
      } else {
        columnTypes[header] = 'text';
      }
    }

    sheets.push({
      name: sheetName,
      rows: rawData.length,
      cols: headers.length,
      headers,
      previewRows,
      columnTypes,
      rawData,
    });
  }

  return sheets;
}

// Parse a specific sheet by name
export function parseExcelSheet(buffer: Buffer, sheetName: string): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

// ============ C1: Header Identification ============

export async function identifyHeaders(
  rawData: Record<string, unknown>[],
  standardFields: string[]
): Promise<{ mappedData: Record<string, unknown>[]; mapping: Record<string, string>; unrecognized: string[] }> {
  if (rawData.length === 0) {
    return { mappedData: [], mapping: {}, unrecognized: [] };
  }

  const actualHeaders = Object.keys(rawData[0]);

  // Try simple matching first
  const simpleMapping: Record<string, string> = {};
  const unmatched: string[] = [];

  for (const header of actualHeaders) {
    const trimmed = header.trim();
    if (standardFields.includes(trimmed)) {
      simpleMapping[header] = trimmed;
    } else {
      // Try fuzzy match
      let matched = false;
      for (const standard of standardFields) {
        if (trimmed.includes(standard) || standard.includes(trimmed)) {
          simpleMapping[header] = standard;
          matched = true;
          break;
        }
      }
      if (!matched) {
        unmatched.push(header);
      }
    }
  }

  // If there are unmatched headers, try LLM mapping with timeout
  let llmMapping: Record<string, string> = {};
  if (unmatched.length > 0) {
    try {
      // 5-second timeout for LLM header mapping to avoid hanging
      const timeoutPromise = new Promise<Record<string, string>>((resolve) => {
        setTimeout(() => resolve({}), 5000);
      });
      llmMapping = await Promise.race([
        mapHeadersWithLLM(unmatched, standardFields),
        timeoutPromise,
      ]);
    } catch {
      // LLM failed, keep simple mapping
    }
  }

  const finalMapping = { ...simpleMapping, ...llmMapping };
  const unrecognized = Object.entries(finalMapping)
    .filter(([, v]) => !v || v === 'null')
    .map(([k]) => k);

  // Apply mapping
  const mappedData = rawData.map(row => {
    const newRow: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const mappedKey = finalMapping[key];
      if (mappedKey && mappedKey !== 'null') {
        newRow[mappedKey] = value;
      }
    }
    return newRow;
  });

  return { mappedData, mapping: finalMapping, unrecognized };
}

// ============ C2: Test Data Filtering ============

export function filterTestData(
  data: Record<string, unknown>[],
  nameField = '客户名称'
): { filtered: Record<string, unknown>[]; removedCount: number } {
  const filtered = data.filter(row => {
    const name = String(row[nameField] || '');
    return !name.includes('测试');
  });
  return { filtered, removedCount: data.length - filtered.length };
}

// ============ C3: Deduplication ============

export function deduplicateData(
  data: Record<string, unknown>[],
  keyField = '客户名称',
  dateField = '签约日期'
): { deduplicated: Record<string, unknown>[]; removedCount: number } {
  const seen = new Map<string, number>();
  const deduplicated: Record<string, unknown>[] = [];

  // Process in reverse to keep latest entries
  for (let i = data.length - 1; i >= 0; i--) {
    const key = String(data[i][keyField] || '');
    if (!seen.has(key)) {
      seen.set(key, i);
      deduplicated.unshift(data[i]);
    }
  }

  return { deduplicated, removedCount: data.length - deduplicated.length };
}

// ============ C4: Date Standardization ============

export function standardizeDates(
  data: Record<string, unknown>[],
  dateFields: string[]
): { data: Record<string, unknown>[]; anomalyCount: number } {
  let anomalyCount = 0;

  const processed = data.map(row => {
    const newRow = { ...row };
    for (const field of dateFields) {
      if (newRow[field]) {
        const result = normalizeDate(String(newRow[field]));
        if (result.normalized) {
          newRow[field] = result.normalized;
        } else {
          anomalyCount++;
        }
      }
    }
    return newRow;
  });

  return { data: processed, anomalyCount };
}

function normalizeDate(dateStr: string): { normalized: string | null } {
  if (!dateStr || dateStr.trim() === '') return { normalized: null };

  // Try various formats
  const formats = [
    /^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/, // YYYY-MM-DD, YYYY/MM/DD
    /^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/, // M/D/YY, MM-DD-YYYY
  ];

  for (const fmt of formats) {
    const match = dateStr.trim().match(fmt);
    if (match) {
      let [, p1, p2, p3] = match;
      let year: number, month: number, day: number;

      if (p1.length === 4) {
        year = parseInt(p1);
        month = parseInt(p2);
        day = parseInt(p3);
      } else {
        // Assume MM/DD/YYYY or M/D/YY
        month = parseInt(p1);
        day = parseInt(p2);
        year = parseInt(p3);
        if (year < 100) year += 2000;
      }

      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return {
          normalized: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        };
      }
    }
  }

  // Try Excel serial number date
  const numVal = Number(dateStr);
  if (!isNaN(numVal) && numVal > 30000 && numVal < 60000) {
    const date = new Date((numVal - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return {
        normalized: date.toISOString().split('T')[0],
      };
    }
  }

  return { normalized: null };
}

// ============ C5: Null & Anomaly Annotation ============

export function annotateAnomalies(
  data: Record<string, unknown>[],
  requiredFields: string[]
): { data: Record<string, unknown>[]; missingCount: number; anomalyCount: number } {
  let missingCount = 0;
  let anomalyCount = 0;

  const processed = data.map(row => {
    const newRow = { ...row };

    // Check required fields
    for (const field of requiredFields) {
      const val = row[field];
      if (val === undefined || val === null || String(val).trim() === '') {
        missingCount++;
        newRow[`_missing_${field}`] = true;
      }
    }

    // Check numeric anomalies
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'number' && value < 0) {
        anomalyCount++;
        newRow[`_anomaly_${key}`] = true;
      }
    }

    return newRow;
  });

  return { data: processed, missingCount, anomalyCount };
}

// ============ Field Logic ============

export function determineTrainingStatus(value: string): boolean | undefined {
  const v = String(value || '').trim().toLowerCase();
  const positiveKeywords = ['已完成', '已培训', '完成', '是', 'done', 'yes', '✓', '√'];
  const negativeKeywords = ['未完成', '未培训', '否', 'no', '待培训', '未安排'];

  for (const kw of positiveKeywords) {
    if (v.includes(kw.toLowerCase())) return true;
  }
  for (const kw of negativeKeywords) {
    if (v.includes(kw.toLowerCase())) return false;
  }
  return undefined; // needs LLM judgment
}

export function determineComplaint(complaintField: string, remarks: string): { has: boolean; inferred: boolean } {
  const c = String(complaintField || '').trim();
  if (c && c !== '无' && c !== '否' && c !== '0') {
    return { has: true, inferred: false };
  }
  const r = String(remarks || '');
  const complaintKeywords = ['客诉', '投诉', '不满', '退款', '赔偿'];
  for (const kw of complaintKeywords) {
    if (r.includes(kw)) return { has: true, inferred: true };
  }
  return { has: false, inferred: false };
}

export function determineCompensation(compensationField: string, remarks: string): { has: boolean; inferred: boolean } {
  const c = String(compensationField || '').trim();
  if (c && c !== '无' && c !== '否' && c !== '0') {
    return { has: true, inferred: false };
  }
  const r = String(remarks || '');
  const compensationKeywords = ['已赔偿', '已退款', '赔偿完成'];
  for (const kw of compensationKeywords) {
    if (r.includes(kw)) return { has: true, inferred: true };
  }
  return { has: false, inferred: false };
}

export function determineServiceBlocked(serviceStatus: string): boolean {
  const s = String(serviceStatus || '');
  const blockedKeywords = ['受阻', '延迟', '待协调', '暂停', '未开通', '未拉群'];
  return blockedKeywords.some(kw => s.includes(kw));
}

// ============ AI Generation Logic ============

export function determineAIGenerated(value: string): boolean | undefined {
  const v = String(value || '').trim().toLowerCase();
  const positive = ['是', 'yes', 'ai', 'true', '1', '✓'];
  const negative = ['否', 'no', '非ai', 'false', '0'];

  for (const kw of positive) {
    if (v.includes(kw)) return true;
  }
  for (const kw of negative) {
    if (v.includes(kw)) return false;
  }
  return undefined;
}

// ============ Customer Health Scoring ============

export function calculateCustomerHealth(
  record: CSImplementationRecord,
  hasPostActivity: boolean
): { level: 'healthy' | 'attention' | 'warning' | 'danger'; reason: string } {
  // 🔴 Danger: highest priority
  if (record.有客诉) {
    return { level: 'danger', reason: '有客诉记录' };
  }
  if (record.已赔偿) {
    return { level: 'danger', reason: '有赔偿记录' };
  }
  const remarks = String(record.备注 || '');
  if (['不满', '投诉', '退款要求'].some(kw => remarks.includes(kw))) {
    return { level: 'danger', reason: '备注中包含负面关键词' };
  }

  // 🟠 Warning
  if (record.服务受阻) {
    return { level: 'warning', reason: '服务受阻' };
  }
  if (['已安抚', '潜在投诉', '待协调'].some(kw => remarks.includes(kw))) {
    return { level: 'warning', reason: '备注中包含预警关键词' };
  }

  // 🟡 Attention
  if (!record.已培训) {
    return { level: 'attention', reason: '培训未完成' };
  }
  if (!hasPostActivity) {
    return { level: 'attention', reason: '无发帖记录（沉默客户）' };
  }
  if (record.签约日期) {
    const signDate = new Date(record.签约日期);
    const daysSinceSign = (Date.now() - signDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSign > 14 && !record.已培训) {
      return { level: 'attention', reason: `签约${Math.round(daysSinceSign)}天仍未培训` };
    }
  }

  // 🟢 Healthy
  return { level: 'healthy', reason: '正常使用，无负面信号' };
}

// ============ Week Calculation ============

export function getWeekRange(): { start: Date; end: Date; weekNumber: number; year: number; label: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // ISO week number
  const janFirst = new Date(start.getFullYear(), 0, 1);
  const daysSinceJan1 = Math.floor((start.getTime() - janFirst.getTime()) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil((daysSinceJan1 + janFirst.getDay() + 1) / 7);

  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  return {
    start,
    end,
    weekNumber,
    year: start.getFullYear(),
    label: `W${weekNumber} (${fmt(start)} - ${fmt(end)})`,
  };
}

// ============ Full Processing Pipeline ============

export async function processDataSources(
  csBuffer: Buffer | null,
  salesBuffer: Buffer | null,
  userBuffer: Buffer | null,
  weeklySummary?: string,
  lastWeekMetrics?: Record<string, number> | null
): Promise<ProcessedData> {
  const qualityReports: DataQualityReport[] = [];
  let csData: CSImplementationRecord[] = [];
  let salesData: SalesRecord[] = [];
  let userData: UserActivityRecord[] = [];

  // Process CS Implementation Data
  if (csBuffer) {
    const raw = parseExcelFile(csBuffer);
    const { mappedData } = await identifyHeaders(raw, CS_STANDARD_FIELDS);
    const { filtered, removedCount: testRemoved } = filterTestData(mappedData);
    const { deduplicated, removedCount: dedupRemoved } = deduplicateData(filtered);
    const { data: dateProcessed, anomalyCount: dateAnomalies } = standardizeDates(deduplicated, ['签约日期']);
    const { data: annotated, missingCount, anomalyCount } = annotateAnomalies(dateProcessed, ['客户名称', '客成经理']);

    qualityReports.push({
      tableName: '客成实施数据',
      originalRows: raw.length,
      filteredTest: testRemoved,
      deduplicated: dedupRemoved,
      cleanedRows: annotated.length,
      unrecognizedFields: [],
      missingRequiredFields: missingCount,
      dateAnomalies,
      anomalies,
    });

    csData = annotated.map(row => {
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
      const complaint = determineComplaint(record.客诉标记, record.备注);
      record.有客诉 = complaint.has;
      const compensation = determineCompensation(record.赔偿标记, record.备注);
      record.已赔偿 = compensation.has;
      record.服务受阻 = determineServiceBlocked(record.服务状态);
      return record;
    });
  }

  // Process Sales Data
  if (salesBuffer) {
    const raw = parseExcelFile(salesBuffer);
    const { mappedData } = await identifyHeaders(raw, SALES_STANDARD_FIELDS);
    const { filtered, removedCount: testRemoved } = filterTestData(mappedData);
    const { deduplicated, removedCount: dedupRemoved } = deduplicateData(filtered);
    const { data: dateProcessed, anomalyCount: dateAnomalies } = standardizeDates(deduplicated, ['签约日期']);
    const { data: annotated, missingCount, anomalyCount } = annotateAnomalies(dateProcessed, ['客户名称']);

    qualityReports.push({
      tableName: '销售数据',
      originalRows: raw.length,
      filteredTest: testRemoved,
      deduplicated: dedupRemoved,
      cleanedRows: annotated.length,
      unrecognizedFields: [],
      missingRequiredFields: missingCount,
      dateAnomalies,
      anomalies,
    });

    salesData = annotated.map(row => ({
      订单编号: String(row['订单编号'] || ''),
      客户名称: String(row['客户名称'] || ''),
      订单来源: String(row['订单来源'] || ''),
      产品类型: String(row['产品类型'] || ''),
      版本: String(row['版本'] || ''),
      签约日期: String(row['签约日期'] || ''),
      订单金额: Number(row['订单金额'] || 0),
      订单时长: String(row['订单时长'] || ''),
    }));
  }

  // Process User Activity Data
  if (userBuffer) {
    const raw = parseExcelFile(userBuffer);
    const { mappedData } = await identifyHeaders(raw, USER_STANDARD_FIELDS);
    const { filtered, removedCount: testRemoved } = filterTestData(mappedData);
    const { deduplicated, removedCount: dedupRemoved } = deduplicateData(filtered);
    const { data: dateProcessed, anomalyCount: dateAnomalies } = standardizeDates(deduplicated, ['发帖日期']);
    const { data: annotated, missingCount, anomalyCount } = annotateAnomalies(dateProcessed, ['客户名称']);

    qualityReports.push({
      tableName: '用户数据',
      originalRows: raw.length,
      filteredTest: testRemoved,
      deduplicated: dedupRemoved,
      cleanedRows: annotated.length,
      unrecognizedFields: [],
      missingRequiredFields: missingCount,
      dateAnomalies,
      anomalies,
    });

    userData = annotated.map(row => {
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
    });
  }

  // ============ Calculate Metrics ============

  const { start: weekStart, end: weekEnd } = getWeekRange();
  const activeCustomers = new Set(userData.map(u => u.客户名称));
  const trainedCount = csData.filter(c => c.已培训 === true).length;
  const complaintCount = csData.filter(c => c.有客诉).length;
  const compensationCount = csData.filter(c => c.已赔偿).length;
  const distinctCSMs = new Set(csData.map(c => c.客成经理)).size;
  const totalCustomers = csData.length;

  const newOrders = salesData.filter(s => {
    if (!s.签约日期) return false;
    const d = new Date(s.签约日期);
    return d >= weekStart && d <= weekEnd;
  }).length;

  // M7: Product issue resolution rate (approximate from remarks)
  const issueKeywords = ['问题', 'bug', '故障', '异常', '错误'];
  const resolvedKeywords = ['已解决', '已修复', '已完成', '解决'];
  const totalIssues = csData.filter(c =>
    issueKeywords.some(kw => String(c.备注 || '').includes(kw))
  ).length;
  const resolvedIssues = csData.filter(c =>
    issueKeywords.some(kw => String(c.备注 || '').includes(kw)) &&
    resolvedKeywords.some(kw => String(c.备注 || '').includes(kw))
  ).length;

  const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;

  const currentMetrics: Record<string, number> = {
    totalOrders: salesData.length,
    newOrders,
    trainingRate: safeDiv(trainedCount, totalCustomers) * 100,
    complaintRate: safeDiv(complaintCount, trainedCount) * 100,
    compensationRate: safeDiv(compensationCount, trainedCount) * 100,
    ordersPerCSM: safeDiv(totalCustomers, distinctCSMs),
    issueResolutionRate: safeDiv(resolvedIssues, Math.max(totalIssues, 1)) * 100,
    activityRate: safeDiv(activeCustomers.size, totalCustomers) * 100,
  };

  // Calculate WoW changes
  const metrics: MetricResult[] = [
    {
      id: 'M1', name: '累计订单',
      currentValue: currentMetrics.totalOrders,
      currentDisplay: String(currentMetrics.totalOrders),
      lastWeekValue: lastWeekMetrics?.totalOrders ?? null,
      lastWeekDisplay: lastWeekMetrics?.totalOrders != null ? String(lastWeekMetrics.totalOrders) : '—',
      changeAbsolute: lastWeekMetrics?.totalOrders != null ? currentMetrics.totalOrders - lastWeekMetrics.totalOrders : null,
      changePercent: lastWeekMetrics?.totalOrders != null ? `${((currentMetrics.totalOrders - lastWeekMetrics.totalOrders) / lastWeekMetrics.totalOrders * 100).toFixed(1)}%` : null,
      direction: lastWeekMetrics?.totalOrders != null ? (currentMetrics.totalOrders > lastWeekMetrics.totalOrders ? '↑' : currentMetrics.totalOrders < lastWeekMetrics.totalOrders ? '↓' : '→') : '—',
      healthStatus: 'neutral',
      healthThreshold: '仅观察趋势',
    },
    {
      id: 'M2', name: '本周新增订单',
      currentValue: currentMetrics.newOrders,
      currentDisplay: String(currentMetrics.newOrders),
      lastWeekValue: lastWeekMetrics?.newOrders ?? null,
      lastWeekDisplay: lastWeekMetrics?.newOrders != null ? String(lastWeekMetrics.newOrders) : '—',
      changeAbsolute: lastWeekMetrics?.newOrders != null ? currentMetrics.newOrders - lastWeekMetrics.newOrders : null,
      changePercent: lastWeekMetrics?.newOrders != null && lastWeekMetrics.newOrders > 0 ? `${((currentMetrics.newOrders - lastWeekMetrics.newOrders) / lastWeekMetrics.newOrders * 100).toFixed(1)}%` : null,
      direction: lastWeekMetrics?.newOrders != null ? (currentMetrics.newOrders > (lastWeekMetrics.newOrders || 0) ? '↑' : currentMetrics.newOrders < (lastWeekMetrics.newOrders || 0) ? '↓' : '→') : '—',
      healthStatus: 'neutral',
      healthThreshold: '仅观察趋势',
    },
    {
      id: 'M3', name: '培训完成率',
      currentValue: currentMetrics.trainingRate,
      currentDisplay: `${currentMetrics.trainingRate.toFixed(1)}% (${trainedCount}/${totalCustomers})`,
      lastWeekValue: lastWeekMetrics?.trainingRate ?? null,
      lastWeekDisplay: lastWeekMetrics?.trainingRate != null ? `${lastWeekMetrics.trainingRate.toFixed(1)}%` : '—',
      changeAbsolute: lastWeekMetrics?.trainingRate != null ? currentMetrics.trainingRate - lastWeekMetrics.trainingRate : null,
      changePercent: lastWeekMetrics?.trainingRate != null ? `${(currentMetrics.trainingRate - lastWeekMetrics.trainingRate).toFixed(1)}pp` : null,
      direction: lastWeekMetrics?.trainingRate != null ? (currentMetrics.trainingRate > lastWeekMetrics.trainingRate ? '↑' : currentMetrics.trainingRate < lastWeekMetrics.trainingRate ? '↓' : '→') : '—',
      healthStatus: currentMetrics.trainingRate >= 80 ? 'green' : currentMetrics.trainingRate >= 60 ? 'yellow' : 'red',
      healthThreshold: '🟢≥80% 🟡60-79% 🔴<60%',
    },
    {
      id: 'M4', name: '客诉率',
      currentValue: currentMetrics.complaintRate,
      currentDisplay: `${currentMetrics.complaintRate.toFixed(1)}% (${complaintCount}/${trainedCount})`,
      lastWeekValue: lastWeekMetrics?.complaintRate ?? null,
      lastWeekDisplay: lastWeekMetrics?.complaintRate != null ? `${lastWeekMetrics.complaintRate.toFixed(1)}%` : '—',
      changeAbsolute: lastWeekMetrics?.complaintRate != null ? currentMetrics.complaintRate - lastWeekMetrics.complaintRate : null,
      changePercent: lastWeekMetrics?.complaintRate != null ? `${(currentMetrics.complaintRate - lastWeekMetrics.complaintRate).toFixed(1)}pp` : null,
      direction: lastWeekMetrics?.complaintRate != null ? (currentMetrics.complaintRate > lastWeekMetrics.complaintRate ? '↑' : currentMetrics.complaintRate < lastWeekMetrics.complaintRate ? '↓' : '→') : '—',
      healthStatus: currentMetrics.complaintRate <= 2 ? 'green' : currentMetrics.complaintRate <= 5 ? 'yellow' : 'red',
      healthThreshold: '🟢≤2% 🟡2-5% 🔴>5%',
    },
    {
      id: 'M5', name: '赔偿率',
      currentValue: currentMetrics.compensationRate,
      currentDisplay: `${currentMetrics.compensationRate.toFixed(1)}% (${compensationCount}/${trainedCount})`,
      lastWeekValue: lastWeekMetrics?.compensationRate ?? null,
      lastWeekDisplay: lastWeekMetrics?.compensationRate != null ? `${lastWeekMetrics.compensationRate.toFixed(1)}%` : '—',
      changeAbsolute: lastWeekMetrics?.compensationRate != null ? currentMetrics.compensationRate - lastWeekMetrics.compensationRate : null,
      changePercent: lastWeekMetrics?.compensationRate != null ? `${(currentMetrics.compensationRate - lastWeekMetrics.compensationRate).toFixed(1)}pp` : null,
      direction: lastWeekMetrics?.compensationRate != null ? (currentMetrics.compensationRate > lastWeekMetrics.compensationRate ? '↑' : currentMetrics.compensationRate < lastWeekMetrics.compensationRate ? '↓' : '→') : '—',
      healthStatus: currentMetrics.compensationRate === 0 ? 'green' : currentMetrics.compensationRate <= 1 ? 'yellow' : 'red',
      healthThreshold: '🟢0% 🟡≤1% 🔴>1%',
    },
    {
      id: 'M6', name: '人均持单',
      currentValue: currentMetrics.ordersPerCSM,
      currentDisplay: `${currentMetrics.ordersPerCSM.toFixed(0)} (${totalCustomers}/${distinctCSMs}人)`,
      lastWeekValue: lastWeekMetrics?.ordersPerCSM ?? null,
      lastWeekDisplay: lastWeekMetrics?.ordersPerCSM != null ? `${lastWeekMetrics.ordersPerCSM.toFixed(0)}` : '—',
      changeAbsolute: lastWeekMetrics?.ordersPerCSM != null ? currentMetrics.ordersPerCSM - lastWeekMetrics.ordersPerCSM : null,
      changePercent: lastWeekMetrics?.ordersPerCSM != null ? `${((currentMetrics.ordersPerCSM - lastWeekMetrics.ordersPerCSM) / lastWeekMetrics.ordersPerCSM * 100).toFixed(1)}%` : null,
      direction: lastWeekMetrics?.ordersPerCSM != null ? (currentMetrics.ordersPerCSM > lastWeekMetrics.ordersPerCSM ? '↑' : currentMetrics.ordersPerCSM < lastWeekMetrics.ordersPerCSM ? '↓' : '→') : '—',
      healthStatus: currentMetrics.ordersPerCSM <= 40 ? 'green' : currentMetrics.ordersPerCSM <= 50 ? 'yellow' : 'red',
      healthThreshold: '🟢≤40 🟡40-50 🔴>50',
    },
    {
      id: 'M7', name: '产品问题解决率',
      currentValue: currentMetrics.issueResolutionRate,
      currentDisplay: `${currentMetrics.issueResolutionRate.toFixed(1)}% (${resolvedIssues}/${Math.max(totalIssues, 1)})`,
      lastWeekValue: lastWeekMetrics?.issueResolutionRate ?? null,
      lastWeekDisplay: lastWeekMetrics?.issueResolutionRate != null ? `${lastWeekMetrics.issueResolutionRate.toFixed(1)}%` : '—',
      changeAbsolute: lastWeekMetrics?.issueResolutionRate != null ? currentMetrics.issueResolutionRate - lastWeekMetrics.issueResolutionRate : null,
      changePercent: lastWeekMetrics?.issueResolutionRate != null ? `${(currentMetrics.issueResolutionRate - lastWeekMetrics.issueResolutionRate).toFixed(1)}pp` : null,
      direction: lastWeekMetrics?.issueResolutionRate != null ? (currentMetrics.issueResolutionRate > lastWeekMetrics.issueResolutionRate ? '↑' : currentMetrics.issueResolutionRate < lastWeekMetrics.issueResolutionRate ? '↓' : '→') : '—',
      healthStatus: currentMetrics.issueResolutionRate >= 70 ? 'green' : currentMetrics.issueResolutionRate >= 50 ? 'yellow' : 'red',
      healthThreshold: '🟢≥70% 🟡50-69% 🔴<50%',
    },
    {
      id: 'M8', name: '客户活跃率',
      currentValue: currentMetrics.activityRate,
      currentDisplay: `${currentMetrics.activityRate.toFixed(1)}% (${activeCustomers.size}/${totalCustomers})`,
      lastWeekValue: lastWeekMetrics?.activityRate ?? null,
      lastWeekDisplay: lastWeekMetrics?.activityRate != null ? `${lastWeekMetrics.activityRate.toFixed(1)}%` : '—',
      changeAbsolute: lastWeekMetrics?.activityRate != null ? currentMetrics.activityRate - lastWeekMetrics.activityRate : null,
      changePercent: lastWeekMetrics?.activityRate != null ? `${(currentMetrics.activityRate - lastWeekMetrics.activityRate).toFixed(1)}pp` : null,
      direction: lastWeekMetrics?.activityRate != null ? (currentMetrics.activityRate > lastWeekMetrics.activityRate ? '↑' : currentMetrics.activityRate < lastWeekMetrics.activityRate ? '↓' : '→') : '—',
      healthStatus: currentMetrics.activityRate >= 60 ? 'green' : currentMetrics.activityRate >= 40 ? 'yellow' : 'red',
      healthThreshold: '🟢≥60% 🟡40-59% 🔴<40%',
    },
  ];

  // ============ Customer Health Distribution ============

  const healthDistribution = { healthy: 0, attention: 0, warning: 0, danger: 0 };
  const dangerDetails: ProcessedData['dangerDetails'] = [];

  csData.forEach(record => {
    const hasPost = activeCustomers.has(record.客户名称);
    const { level, reason } = calculateCustomerHealth(record, hasPost);
    record.healthLevel = level;
    record.healthReason = reason;
    healthDistribution[level]++;

    if (level === 'danger') {
      dangerDetails.push({
        customer: record.客户名称,
        issue: record.有客诉 ? '有客诉' : record.已赔偿 ? '有赔偿' : reason,
        status: record.服务状态 || '待处理',
        action: '建议立即安排客成经理跟进',
      });
    }
  });

  // ============ Anomaly Detection ============

  const anomalies: ProcessedData['anomalies'] = [];
  metrics.forEach(m => {
    if (m.changePercent) {
      const numChange = parseFloat(m.changePercent);
      if (!isNaN(numChange) && Math.abs(numChange) >= 20) {
        anomalies.push({
          metric: m.name,
          change: m.changePercent,
          description: `${m.name}环比变化${m.changePercent}，当前值${m.currentDisplay}`,
        });
      }
    }
  });

  // ============ Order Analysis ============

  const orderAnalysis = {
    bySource: {} as Record<string, number>,
    byProductType: {} as Record<string, number>,
    byVersion: {} as Record<string, number>,
    byCSM: {} as Record<string, number>,
  };

  salesData.forEach(s => {
    orderAnalysis.bySource[s.订单来源] = (orderAnalysis.bySource[s.订单来源] || 0) + 1;
    orderAnalysis.byProductType[s.产品类型] = (orderAnalysis.byProductType[s.产品类型] || 0) + 1;
    orderAnalysis.byVersion[s.版本] = (orderAnalysis.byVersion[s.版本] || 0) + 1;
  });

  csData.forEach(c => {
    orderAnalysis.byCSM[c.客成经理] = (orderAnalysis.byCSM[c.客成经理] || 0) + 1;
  });

  // ============ Usage Analysis ============

  const usageAnalysis = {
    byContentType: {} as Record<string, number>,
    byPlatform: {} as Record<string, number>,
    aiVsNonAI: {
      ai: { count: 0, exposure: 0, engagement: 0 },
      nonAI: { count: 0, exposure: 0, engagement: 0 },
    },
    topActiveCustomers: [] as Array<{ name: string; posts: number; engagement: number }>,
  };

  const customerActivity = new Map<string, { posts: number; engagement: number }>();

  userData.forEach(u => {
    usageAnalysis.byContentType[u.帖子内容类型] = (usageAnalysis.byContentType[u.帖子内容类型] || 0) + 1;
    usageAnalysis.byPlatform[u.社媒类型] = (usageAnalysis.byPlatform[u.社媒类型] || 0) + 1;

    const isAI = u.AI生成 === true;
    if (isAI) {
      usageAnalysis.aiVsNonAI.ai.count++;
      usageAnalysis.aiVsNonAI.ai.exposure += u.曝光数;
      usageAnalysis.aiVsNonAI.ai.engagement += u.互动数;
    } else {
      usageAnalysis.aiVsNonAI.nonAI.count++;
      usageAnalysis.aiVsNonAI.nonAI.exposure += u.曝光数;
      usageAnalysis.aiVsNonAI.nonAI.engagement += u.互动数;
    }

    const existing = customerActivity.get(u.客户名称) || { posts: 0, engagement: 0 };
    existing.posts++;
    existing.engagement += u.互动数;
    customerActivity.set(u.客户名称, existing);
  });

  usageAnalysis.topActiveCustomers = Array.from(customerActivity.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.posts - a.posts)
    .slice(0, 10);

  return {
    csData,
    salesData,
    userData,
    qualityReports,
    metrics,
    healthDistribution,
    healthChanges: [], // Will be populated when comparing with previous week
    dangerDetails,
    anomalies,
    orderAnalysis,
    usageAnalysis,
  };
}

// ============ Demo Data Generator ============

export function generateDemoData(): ProcessedData {
  const csmNames = ['张明', '李芳', '王强', '赵婷'];
  const productTypes = ['AIMI 工具', '工具+陪跑', '工具+代运营'];
  const versions = ['基础版', '成长版', '高级版'];
  const serviceStatuses = ['正常', '使用中', '活跃', '受阻', '延迟', '待协调', '已上线'];
  const platforms = ['LinkedIn', 'Facebook', 'Instagram', 'Twitter', 'TikTok'];
  const contentTypes = ['图文', '视频', '纯文字'];

  const REAL_COMPANIES = [
    '深圳市跨境星科技有限公司', '北京博雅智联信息技术有限公司', '上海启明数字营销有限公司',
    '广州汇通智能科技有限公司', '杭州云途信息技术有限公司', '成都领航数据科技有限公司',
    '武汉光谷创新信息技术有限公司', '南京紫金云计算有限公司', '西安丝路数字科技有限公司',
    '重庆天际智能科技有限公司', '苏州工业园区信息技术有限公司', '厦门鹭岛网络科技有限公司',
    '长沙麓谷创新科技有限公司', '青岛海信数据科技有限公司', '大连北方云科技有限公司',
    '合肥讯飞智能科技有限公司', '济南齐鲁数字科技有限公司', '郑州中原信息技术有限公司',
    '昆明春城智能科技有限公司', '福州海峡网络科技有限公司', '天津滨海数据科技有限公司',
    '沈阳东北云科技有限公司', '哈尔滨冰雪数字科技有限公司', '石家庄冀中信息技术有限公司',
    '太原晋商智能科技有限公司', '兰州陇原数据科技有限公司', '贵阳黔云信息技术有限公司',
    '南宁绿城网络科技有限公司', '海口椰风数字科技有限公司', '银川塞上云计算有限公司',
    '西宁高原信息技术有限公司', '拉萨雪域智能数据有限公司', '乌鲁木齐天山云科技有限公司',
    '呼和浩特草原数字科技有限公司', '深圳市前海金融科技有限公司', '北京海淀创新技术有限公司',
    '上海浦东数字科技有限公司', '广州天河智能科技有限公司', '杭州滨江网络技术有限公司',
    '成都高新信息技术有限公司',
  ];

  // Mask customer name for privacy: keep first 2 chars and last char '公司', replace middle with ***
  function maskCustomerName(name: string): string {
    if (!name) return name;
    if (name.endsWith('有限公司')) {
      return name.slice(0, 2) + '***公司';
    }
    if (name.endsWith('公司')) {
      return name.slice(0, 2) + '***公司';
    }
    return name.slice(0, 2) + '***' + name.slice(-1);
  }

  const MASKED_COMPANIES = REAL_COMPANIES.map(maskCustomerName);

  const totalCustomers = 237;
  const csData: CSImplementationRecord[] = [];

  for (let i = 0; i < totalCustomers; i++) {
    const csm = csmNames[i % 4];
    const isTrained = Math.random() < 0.51;
    const hasComplaint = Math.random() < 0.04;
    const hasCompensation = Math.random() < 0.015;
    const isBlocked = Math.random() < 0.08;
    const signMonth = Math.floor(Math.random() * 3) + 2;
    const signDay = Math.floor(Math.random() * 28) + 1;

    const record: CSImplementationRecord = {
      客户名称: MASKED_COMPANIES[i % MASKED_COMPANIES.length],
      客成经理: csm,
      产品类型: productTypes[Math.floor(Math.random() * 3)],
      版本: versions[Math.floor(Math.random() * 3)],
      培训状态: isTrained ? '已完成' : '未完成',
      服务状态: isBlocked ? serviceStatuses[3 + Math.floor(Math.random() * 3)] : serviceStatuses[Math.floor(Math.random() * 3)],
      客诉标记: hasComplaint ? '是' : '无',
      赔偿标记: hasCompensation ? '是' : '无',
      备注: hasComplaint ? 'AI图文不匹配客诉' : isBlocked ? '待协调' : '',
      签约日期: `2026-${String(signMonth).padStart(2, '0')}-${String(signDay).padStart(2, '0')}`,
    };

    record.已培训 = isTrained;
    record.有客诉 = hasComplaint;
    record.已赔偿 = hasCompensation;
    record.服务受阻 = isBlocked;

    const hasPost = Math.random() < 0.42;
    const { level, reason } = calculateCustomerHealth(record, hasPost);
    record.healthLevel = level;
    record.healthReason = reason;

    csData.push(record);
  }

  const activeCustomers = new Set<string>();
  const userData: UserActivityRecord[] = [];
  csData.forEach(c => {
    const hasPost = Math.random() < 0.42;
    if (hasPost) {
      activeCustomers.add(c.客户名称);
      const postCount = Math.floor(Math.random() * 5) + 1;
      for (let j = 0; j < postCount; j++) {
        const isAI = Math.random() < 0.6;
        userData.push({
          客户名称: c.客户名称,
          帖子内容类型: contentTypes[Math.floor(Math.random() * 3)],
          社媒类型: platforms[Math.floor(Math.random() * 5)],
          是否AI生成: isAI ? '是' : '否',
          曝光数: Math.floor(Math.random() * 5000) + 100,
          互动数: Math.floor(Math.random() * 300) + 10,
          点赞数: Math.floor(Math.random() * 200) + 5,
          评论数: Math.floor(Math.random() * 50) + 1,
          发帖日期: `2026-04-${String(Math.floor(Math.random() * 14) + 1).padStart(2, '0')}`,
          AI生成: isAI,
        });
      }
    }
  });

  const salesData: SalesRecord[] = [];
  for (let i = 0; i < totalCustomers; i++) {
    const signMonth = Math.floor(Math.random() * 3) + 2;
    const signDay = Math.floor(Math.random() * 28) + 1;
    salesData.push({
      订单编号: `ORD-${String(i + 1).padStart(4, '0')}`,
      客户名称: MASKED_COMPANIES[i % MASKED_COMPANIES.length],
      订单来源: Math.random() < 0.7 ? '商务签单' : '客户自主下单',
      产品类型: productTypes[Math.floor(Math.random() * 3)],
      版本: versions[Math.floor(Math.random() * 3)],
      签约日期: `2026-${String(signMonth).padStart(2, '0')}-${String(signDay).padStart(2, '0')}`,
      订单金额: Math.floor(Math.random() * 50000) + 5000,
      订单时长: '12个月',
    });
  }

  const trainedCount = csData.filter(c => c.已培训).length;
  const complaintCount = csData.filter(c => c.有客诉).length;
  const compensationCount = csData.filter(c => c.已赔偿).length;
  const distinctCSMs = new Set(csData.map(c => c.客成经理)).size;

  const { weekNumber, year, label } = getWeekRange();
  const newOrders = Math.floor(Math.random() * 15) + 5;

  const healthDistribution = { healthy: 0, attention: 0, warning: 0, danger: 0 };
  const dangerDetails: ProcessedData['dangerDetails'] = [];
  csData.forEach(c => {
    if (c.healthLevel) healthDistribution[c.healthLevel]++;
    if (c.healthLevel === 'danger') {
      dangerDetails.push({
        customer: c.客户名称,
        issue: c.有客诉 ? '有客诉' : c.已赔偿 ? '有赔偿' : c.healthReason || '',
        status: c.服务状态,
        action: '建议立即安排客成经理跟进',
      });
    }
  });

  const safeDiv = (a: number, b: number) => b === 0 ? 0 : a / b;
  const trainingRate = safeDiv(trainedCount, totalCustomers) * 100;
  const complaintRate = safeDiv(complaintCount, trainedCount) * 100;
  const compensationRate = safeDiv(compensationCount, trainedCount) * 100;
  const ordersPerCSM = safeDiv(totalCustomers, distinctCSMs);
  const activityRate = safeDiv(activeCustomers.size, totalCustomers) * 100;

  const metrics: MetricResult[] = [
    { id: 'M1', name: '累计订单', currentValue: totalCustomers, currentDisplay: String(totalCustomers), lastWeekValue: 230, lastWeekDisplay: '230', changeAbsolute: totalCustomers - 230, changePercent: '+3.0%', direction: '↑', healthStatus: 'neutral', healthThreshold: '仅观察趋势' },
    { id: 'M2', name: '本周新增订单', currentValue: newOrders, currentDisplay: String(newOrders), lastWeekValue: 12, lastWeekDisplay: '12', changeAbsolute: newOrders - 12, changePercent: `${((newOrders - 12) / 12 * 100).toFixed(1)}%`, direction: newOrders > 12 ? '↑' : newOrders < 12 ? '↓' : '→', healthStatus: 'neutral', healthThreshold: '仅观察趋势' },
    { id: 'M3', name: '培训完成率', currentValue: trainingRate, currentDisplay: `${trainingRate.toFixed(1)}% (${trainedCount}/${totalCustomers})`, lastWeekValue: 48.5, lastWeekDisplay: '48.5%', changeAbsolute: trainingRate - 48.5, changePercent: '+2.5pp', direction: '↑', healthStatus: trainingRate >= 80 ? 'green' : trainingRate >= 60 ? 'yellow' : 'red', healthThreshold: '🟢≥80% 🟡60-79% 🔴<60%' },
    { id: 'M4', name: '客诉率', currentValue: complaintRate, currentDisplay: `${complaintRate.toFixed(1)}% (${complaintCount}/${trainedCount})`, lastWeekValue: 3.5, lastWeekDisplay: '3.5%', changeAbsolute: complaintRate - 3.5, changePercent: '+0.6pp', direction: '↑', healthStatus: complaintRate <= 2 ? 'green' : complaintRate <= 5 ? 'yellow' : 'red', healthThreshold: '🟢≤2% 🟡2-5% 🔴>5%' },
    { id: 'M5', name: '赔偿率', currentValue: compensationRate, currentDisplay: `${compensationRate.toFixed(1)}% (${compensationCount}/${trainedCount})`, lastWeekValue: 1.2, lastWeekDisplay: '1.2%', changeAbsolute: compensationRate - 1.2, changePercent: '+0.5pp', direction: '↑', healthStatus: compensationRate === 0 ? 'green' : compensationRate <= 1 ? 'yellow' : 'red', healthThreshold: '🟢0% 🟡≤1% 🔴>1%' },
    { id: 'M6', name: '人均持单', currentValue: ordersPerCSM, currentDisplay: `${ordersPerCSM.toFixed(0)} (${totalCustomers}/${distinctCSMs}人)`, lastWeekValue: 57.5, lastWeekDisplay: '57.5', changeAbsolute: ordersPerCSM - 57.5, changePercent: '+2.6%', direction: '↑', healthStatus: ordersPerCSM <= 40 ? 'green' : ordersPerCSM <= 50 ? 'yellow' : 'red', healthThreshold: '🟢≤40 🟡40-50 🔴>50' },
    { id: 'M7', name: '产品问题解决率', currentValue: 41.7, currentDisplay: '41.7% (10/24)', lastWeekValue: 38.5, lastWeekDisplay: '38.5%', changeAbsolute: 3.2, changePercent: '+3.2pp', direction: '↑', healthStatus: 'yellow', healthThreshold: '🟢≥70% 🟡50-69% 🔴<50%' },
    { id: 'M8', name: '客户活跃率', currentValue: activityRate, currentDisplay: `${activityRate.toFixed(1)}% (${activeCustomers.size}/${totalCustomers})`, lastWeekValue: 39.2, lastWeekDisplay: '39.2%', changeAbsolute: activityRate - 39.2, changePercent: '+3.0pp', direction: '↑', healthStatus: activityRate >= 60 ? 'green' : activityRate >= 40 ? 'yellow' : 'red', healthThreshold: '🟢≥60% 🟡40-59% 🔴<40%' },
  ];

  const orderAnalysis = {
    bySource: { '商务签单': 166, '客户自主下单': 71 } as Record<string, number>,
    byProductType: { 'AIMI 工具': 89, '工具+陪跑': 98, '工具+代运营': 50 } as Record<string, number>,
    byVersion: { '基础版': 78, '成长版': 102, '高级版': 57 } as Record<string, number>,
    byCSM: Object.fromEntries(csmNames.map((name, i) => [name, Math.ceil(totalCustomers / 4) + (i % 2 === 0 ? 1 : 0)])) as Record<string, number>,
  };

  const aiCount = userData.filter(u => u.AI生成).length;
  const nonAICount = userData.length - aiCount;

  const usageAnalysis = {
    byContentType: { '图文': 120, '视频': 85, '纯文字': 65 } as Record<string, number>,
    byPlatform: { 'LinkedIn': 95, 'Facebook': 72, 'Instagram': 58, 'Twitter': 35, 'TikTok': 10 } as Record<string, number>,
    aiVsNonAI: {
      ai: { count: aiCount, exposure: aiCount * 2800, engagement: aiCount * 150 },
      nonAI: { count: nonAICount, exposure: nonAICount * 1800, engagement: nonAICount * 90 },
    },
    topActiveCustomers: Array.from(activeCustomers).slice(0, 10).map((name, i) => ({
      name,
      posts: Math.floor(Math.random() * 8) + 2,
      engagement: Math.floor(Math.random() * 500) + 50,
    })),
  };

  return {
    csData,
    salesData,
    userData,
    qualityReports: [
      { tableName: '客成实施数据', originalRows: 240, filteredTest: 3, deduplicated: 0, cleanedRows: 237, unrecognizedFields: [], missingRequiredFields: 2, dateAnomalies: 1, anomalies: 0 },
      { tableName: '销售数据', originalRows: 245, filteredTest: 5, deduplicated: 3, cleanedRows: 237, unrecognizedFields: [], missingRequiredFields: 0, dateAnomalies: 0, anomalies: 0 },
      { tableName: '用户数据', originalRows: 320, filteredTest: 0, deduplicated: 0, cleanedRows: 320, unrecognizedFields: [], missingRequiredFields: 1, dateAnomalies: 2, anomalies: 0 },
    ],
    metrics,
    healthDistribution,
    healthChanges: [],
    dangerDetails: dangerDetails.slice(0, 5),
    anomalies: metrics.filter(m => {
      const num = parseFloat(m.changePercent || '0');
      return !isNaN(num) && Math.abs(num) >= 20;
    }).map(m => ({ metric: m.name, change: m.changePercent || '', description: `${m.name}环比变化${m.changePercent}` })),
    orderAnalysis,
    usageAnalysis,
  };
}
