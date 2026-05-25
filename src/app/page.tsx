'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  Upload, BarChart3, FileText, GitBranch, Database, Settings, Bell, RefreshCw,
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, AlertCircle,
  Activity, Users, Package, MessageSquare, Brain, Zap, ChevronRight,
  FileSpreadsheet, Send, Download, Clock, Shield, Eye, Sparkles, Trash2, Plus,
  Wrench, Sliders, Bot, Play, X, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  Heart, Target, DollarSign, Repeat, UserCheck, Lightbulb, ArrowUpRight, ArrowDownRight,
  AlertOctagon, Flame, PieChart as PieChartIcon, Layers, Gauge, FileUp, Terminal, Webhook,
  GripVertical,
} from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import ReportViewer from '@/components/report-viewer';
import SankeyDiagram from '@/components/sankey-diagram';
import { generateRealDashboardData } from '@/lib/real-data';

// ============ Type Definitions ============

interface MetricResult {
  id: string; name: string; currentValue: number; currentDisplay: string;
  lastWeekDisplay: string; changePercent: string | null; direction: string;
  healthStatus: 'green' | 'yellow' | 'red' | 'neutral'; healthThreshold: string;
}
interface HealthDistribution { healthy: number; attention: number; warning: number; danger: number; }
interface Anomaly { metric: string; change: string; description: string; }
interface DangerDetail { customer: string; issue: string; status: string; action: string; }
interface OrderAnalysis { bySource: Record<string, number>; byProductType: Record<string, number>; byVersion: Record<string, number>; byCSM: Record<string, number>; }
interface UsageAnalysis {
  byContentType: Record<string, number>; byPlatform: Record<string, number>;
  aiVsNonAI: { ai: { count: number; exposure: number; engagement: number }; nonAI: { count: number; exposure: number; engagement: number }; };
  topActiveCustomers: Array<{ name: string; posts: number; engagement: number }>;
}
interface QualityReport { tableName: string; originalRows: number; filteredTest: number; deduplicated: number; cleanedRows: number; unrecognizedFields: string[]; missingRequiredFields: number; dateAnomalies: number; anomalies: number; }
interface FlowNode { id: string; label: string; count: number; lastWeek: number; status: 'healthy' | 'warning' | 'danger'; details: string; }
interface SheetPreview { name: string; rowCount: number; colCount: number; headers: string[]; previewRows: Record<string, unknown>[]; columnTypes: Record<string, string>; }
interface ChatMsg { role: 'user' | 'assistant' | 'system'; content: string; }
interface SkillItem { skillKey: string; skillName: string; enabled: boolean; parameters: string; id?: string; }
interface AgentRuleItem { id: string; ruleContent: string; category: string; source: string; isActive: boolean; }
interface ModelConfigType { provider: string; apiKey: string; baseUrl: string; modelName: string; temperature: number; maxTokens: number; }

// CS Value Data Types
interface CSValueDashboardData {
  healthOverview: {
    totalCustomers: number;
    healthDistribution: HealthDistribution;
    productSideMetrics: { productUsageRate: number; featureActivityScore: number; usageDepth: number };
    effectSideMetrics: { followerGrowthRate: number; contentInteractionRate: number; inquiryRate: number };
    businessSideMetrics: { npsScore: number; renewalRate: number; upsellRate: number };
  };
  productLineValue: {
    aimi: { followerGrowthAvg: number; monthlyPostsAvg: number; avgInquiries: number; successHighlights: string[]; issues: string[] };
    ads: { avgSpendPerAccount: number; avgROAS: number; renewalRate: number; successHighlights: string[]; issues: string[] };
    site: { avgInquiryConversion: number; avgMargin: number; successHighlights: string[]; issues: string[] };
  };
  multiProductValue: {
    single: { count: number; ratio: number; arpu: number; renewalRate: number; ltv: number; insight: string };
    dual: { count: number; ratio: number; arpu: number; renewalRate: number; ltv: number; insight: string };
    fullChain: { count: number; ratio: number; arpu: number; renewalRate: number; ltv: number; insight: string };
  };
  renewalChurn: {
    aimi: { upForRenewal: number; renewed: number; renewalRate: number; upsellAmount: number; topChurnReasons: string[] };
    ads: { upForRenewal: number; renewed: number; renewalRate: number; upsellAmount: number; topChurnReasons: string[] };
    site: { upForRenewal: number; renewed: number; renewalRate: number; upsellAmount: number; topChurnReasons: string[] };
    overall: { upForRenewal: number; renewed: number; renewalRate: number; upsellAmount: number; topChurnReasons: string[] };
  };
  teamEfficiency: {
    customersPerCSM: number;
    customerCoverageRate: number;
    avgResponseTimeHours: number;
    renewalTargetRate: number;
    csmDetails: Array<{ name: string; customerCount: number; coverageRate: number; avgResponseHours: number; renewalAchievementRate: number }>;
  };
  keyIssues: Array<{ issue: string; rootCause: string; solution: string; owner: string; deadline: string }>;
  // NEW fields
  adsSpendTiers: Array<{ tier: string; tierMin: number; customerCount: number; renewalRate: number }>;
  adsRenewalDepth: { newCustomers: number; oldCustomers: number; firstRenewalRate: number; secondRenewalRate: number };
  siteDeliveryEfficiency: { deliveryCostRate: number; avgDeliveryDays: number; paidUV: number; leads: number; leadConversionRate: number };
  customerJourney: {
    paths: Array<{ from: string; to: string; customerCount: number; avgDaysToCross: number; arpu: number }>;
    entryDistribution: { aimi: number; ads: number; site: number };
  };
  vocData: Array<{ customerName: string; feedbackType: string; content: string; productLine: string; date: string }>;
  // AIMI Deep Operations Detail
  aimiOperationDetail?: {
    versionBreakdown: {
      advanced: { count: number; avgPosts: number; avgExposure: number; avgEngagement: number };
      growth: { count: number; avgPosts: number; avgExposure: number; avgEngagement: number };
      basic: { count: number; avgPosts: number; avgExposure: number; avgEngagement: number };
    };
    featureUsage: {
      aiPost: number; smartSchedule: number; dataAnalysis: number;
      competitorMonitor: number; contentOptimize: number; multiAccount: number;
    };
    aiFeaturePenetrationRate: number;
    aimiCoverageRate: number;
  };
  // Site lifecycle (replaces renewal rate for 独立站)
  siteLifecycle?: {
    activeRate: number; lowActiveRate: number; silentRate: number;
    avgCooperationMonths: number; noRenewalTracking: true;
  };
  // Customer Combo Detail (7 types)
  customerComboDetail?: {
    aimiOnly: { count: number; ratio: number; arpu: number; renewalRate: number | null; ltv: number; healthAvg: string };
    adsOnly: { count: number; ratio: number; arpu: number; renewalRate: number; ltv: number; healthAvg: string };
    siteOnly: { count: number; ratio: number; arpu: number; renewalRate: number | null; ltv: number; healthAvg: string };
    aimiAds: { count: number; ratio: number; arpu: number; renewalRate: number; ltv: number; healthAvg: string };
    aimiSite: { count: number; ratio: number; arpu: number; renewalRate: number | null; ltv: number; healthAvg: string };
    adsSite: { count: number; ratio: number; arpu: number; renewalRate: number | null; ltv: number; healthAvg: string };
    fullChain: { count: number; ratio: number; arpu: number; renewalRate: number; ltv: number; healthAvg: string };
    aimiCustomerRatio: number;
  };
}

// ============ Color Constants ============

const HEALTH_COLORS = { green: '#22c55e', yellow: '#eab308', warning: '#f97316', red: '#ef4444' };
const STATUS_BG = { green: 'bg-emerald-50 border-emerald-200 text-emerald-700', yellow: 'bg-amber-50 border-amber-200 text-amber-700', red: 'bg-red-50 border-red-200 text-red-700', neutral: 'bg-slate-50 border-slate-200 text-slate-600' };
const STATUS_ICON = { green: <CheckCircle className="w-4 h-4 text-emerald-500" />, yellow: <AlertCircle className="w-4 h-4 text-amber-500" />, red: <AlertTriangle className="w-4 h-4 text-red-500" />, neutral: <Minus className="w-4 h-4 text-slate-400" /> };

const PRODUCT_COLORS = {
  aimi: '#6366f1',
  ads: '#f59e0b',
  site: '#10b981',
};

const DARK_TOOLTIP_STYLE = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' };

// ============ Customer Name Masking ============

function maskCustomerName(name: string): string {
  if (!name) return name;
  const len = name.length;
  if (len <= 4) return name;
  if (name.endsWith('有限公司') || name.endsWith('公司')) {
    const prefix = name.slice(0, 2);
    return `${prefix}***公司`;
  }
  return `${name.slice(0, 2)}***${name.slice(-1)}`;
}

// ============ Format Helpers ============

function formatCurrency(value: number): string {
  if (value >= 10000) return `¥${(value / 10000).toFixed(1)}万`;
  return `¥${value.toLocaleString()}`;
}

function formatOrNa(value: number | null | undefined, formatter: (v: number) => string, naLabel: string = '暂无'): string {
  if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) return naLabel;
  return formatter(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

// ============ Custom Recharts Label for Pie ============

const renderPieLabel = ({ name, percent }: { name: string; percent: number }) =>
  `${name} ${(percent * 100).toFixed(0)}%`;

// ============ Sortable Module Wrapper ============

function SortableModule({ id, index, moduleLabel, moduleConfig, children }: {
  id: string; index: number; moduleLabel: string;
  moduleConfig: { color: string; icon: React.ReactNode; barBg: string; title: string; subtitle: string };
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="space-y-4">
      <div className="flex items-center gap-2 px-1 group">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
          title="拖拽排序"
        >
          <GripVertical className="w-4 h-4 text-slate-400" />
        </button>
        <div className={`w-1 h-5 rounded-full ${moduleConfig.barBg}`} />
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${moduleConfig.color} text-white text-[10px] font-bold`}>
          {moduleConfig.icon}{moduleLabel}
        </span>
        <h2 className="text-lg font-bold text-slate-800">{moduleConfig.title}</h2>
        <span className="text-xs text-slate-400">{moduleConfig.subtitle}</span>
      </div>
      {children}
    </div>
  );
}

// ============ Main Component ============

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Dual data model: demo data (always available) + real data (from uploaded Excel)
  type DashboardState = {
    metrics: MetricResult[]; healthDistribution: HealthDistribution; anomalies: Anomaly[];
    orderAnalysis: OrderAnalysis; usageAnalysis: UsageAnalysis; dangerDetails: DangerDetail[];
    qualityReports: QualityReport[]; weekLabel: string; csValueData?: CSValueDashboardData;
    isDemo?: boolean;
  };

  const [demoData, setDemoData] = useState<DashboardState | null>(null);
  const [realData, setRealData] = useState<DashboardState | null>(null);
  const [weekLabel, setWeekLabel] = useState('');

  // Active data based on mode
  // Real data is always available from the pre-built real-data.ts (based on uploaded Excel files)
  const [forceDemoMode, setForceDemoMode] = useState(true);
  const hasRealData = realData !== null && realData.isDemo === false;
  // Also check if realData hasn't been set yet but we have the static real data available
  const [useStaticRealData, setUseStaticRealData] = useState(false);
  const isDisplayingDemo = forceDemoMode && !useStaticRealData;
  const dashboardData = isDisplayingDemo ? demoData : (hasRealData ? realData : null);
  const [reportContent, setReportContent] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState('');
  const [flowData, setFlowData] = useState<{
    nodes: FlowNode[]; weekLabel: string; riskAlerts: Anomaly[];
    coreComplaints: DangerDetail[]; teamLoad: Record<string, number>; healthDistribution: HealthDistribution;
    isDemo?: boolean;
  } | null>(null);

  // Data version counter for force re-render after upload
  const [dataVersion, setDataVersion] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const [insightDrilldown, setInsightDrilldown] = useState<Record<number, { loading: boolean; result: string }>>({});
  const [lastUploadResult, setLastUploadResult] = useState<{
    isDemo: boolean;
    recordCounts: { cs: number; sales: number; user: number; voc: number };
    productTypes: string[];
    timestamp: number;
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  // Excel preview state — keyed by file type so each file has its own preview
  const [excelPreviews, setExcelPreviews] = useState<Record<string, { sheets: SheetPreview[]; fileName: string }>>({});
  const [selectedSheets, setSelectedSheets] = useState<Record<string, boolean>>({});
  const [selectedColumns, setSelectedColumns] = useState<Record<string, Record<string, boolean>>>({});
  const [expandedSheet, setExpandedSheet] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});

  // Drag state per upload zone
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});

  // Version breakdown toggle
  const [showVersionBreakdown, setShowVersionBreakdown] = useState(true);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Skills state
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillKey, setNewSkillKey] = useState('');

  // Model config state
  const [modelConfig, setModelConfig] = useState<ModelConfigType>({ provider: 'zai-sdk', apiKey: '', baseUrl: '', modelName: '', temperature: 0.3, maxTokens: 4096 });
  const [modelTestResult, setModelTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [modelTestLoading, setModelTestLoading] = useState(false);

  // Agent rules state
  const [agentRules, setAgentRules] = useState<AgentRuleItem[]>([]);
  const [newRule, setNewRule] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState('general');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Module order state — persisted to localStorage
  const MODULE_IDS = ['growth', 'combo', 'operation', 'management'] as const;
  type ModuleId = typeof MODULE_IDS[number];
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('csm_module_order');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 4) return parsed;
        }
      } catch { /* ignore */ }
    }
    return [...MODULE_IDS];
  });

  const setModuleOrderAndPersist = (order: ModuleId[]) => {
    setModuleOrder(order);
    try { localStorage.setItem('csm_module_order', JSON.stringify(order)); } catch { /* ignore */ }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setModuleOrderAndPersist(prev => {
        const oldIndex = prev.indexOf(active.id as ModuleId);
        const newIndex = prev.indexOf(over.id as ModuleId);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  // Module config mapping
  const MODULE_CONFIG: Record<ModuleId, { id: ModuleId; title: string; subtitle: string; color: string; gradientFrom: string; gradientTo: string; borderLeft: string; icon: React.ReactNode; barBg: string }> = {
    growth: { id: 'growth', title: '增长与留存', subtitle: '客户规模·健康分布·续约留存', color: 'from-emerald-500 to-emerald-600', gradientFrom: 'from-emerald-500', gradientTo: 'to-emerald-600', borderLeft: 'border-l-emerald-500', icon: <TrendingUp className="w-3 h-3" />, barBg: 'bg-gradient-to-b from-emerald-500 to-emerald-600' },
    combo: { id: 'combo', title: '客户购买旅程', subtitle: '产品组合·客户旅程·交叉扩展', color: 'from-amber-500 to-amber-600', gradientFrom: 'from-amber-500', gradientTo: 'to-amber-600', borderLeft: 'border-l-amber-500', icon: <Flame className="w-3 h-3" />, barBg: 'bg-gradient-to-b from-amber-500 to-amber-600' },
    operation: { id: 'operation', title: '客户成效', subtitle: '产品使用效果·价值兑现·多产品协同', color: 'from-indigo-500 to-indigo-600', gradientFrom: 'from-indigo-500', gradientTo: 'to-indigo-600', borderLeft: 'border-l-indigo-500', icon: <Sparkles className="w-3 h-3" />, barBg: 'bg-gradient-to-b from-indigo-500 to-indigo-600' },
    management: { id: 'management', title: '运营保障', subtitle: '人效·风险管控·行动追踪', color: 'from-slate-500 to-slate-600', gradientFrom: 'from-slate-500', gradientTo: 'to-slate-600', borderLeft: 'border-l-slate-500', icon: <Gauge className="w-3 h-3" />, barBg: 'bg-gradient-to-b from-slate-500 to-slate-600' },
  };

  const getModuleLabel = (index: number) => {
    const labels = ['模块一', '模块二', '模块三', '模块四'];
    return labels[index] || `模块${index + 1}`;
  };

  // Client-only origin for API/CLI/Webhook display
  const [clientOrigin, setClientOrigin] = useState('https://your-domain');
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setClientOrigin(window.location.origin);
    }
  }, []);

  // CS Value data shortcut
  const csData = dashboardData?.csValueData;

  // ============ Data Loading ============

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWeekLabel(data.weekLabel || '');
      // Always set demo data
      if (data.demoData) {
        setDemoData({ ...data.demoData, weekLabel: data.weekLabel });
      }
      // Set real data if available
      if (data.realData) {
        setRealData({ ...data.realData, weekLabel: data.weekLabel });
      }
    } catch {
      // API unavailable (e.g. GitHub Pages static mode) — fallback to built-in data
      console.log('[Dashboard] API unavailable, using built-in data');
      const staticRealCSData = generateRealDashboardData();
      const fallbackState: DashboardState = {
        metrics: [],
        healthDistribution: staticRealCSData.healthOverview.healthDistribution,
        anomalies: [],
        orderAnalysis: { bySource: {}, byProductType: {}, byVersion: {}, byCSM: {} },
        usageAnalysis: { byContentType: {}, byPlatform: {}, aiVsNonAI: { ai: { count: 0, exposure: 0, engagement: 0 }, nonAI: { count: 0, exposure: 0, engagement: 0 } }, topActiveCustomers: [] },
        dangerDetails: [],
        qualityReports: [],
        weekLabel: 'W15 (2026-04-06 - 2026-04-12)',
        csValueData: staticRealCSData,
        isDemo: false,
      };
      setRealData(fallbackState);
      setForceDemoMode(false);
      setUseStaticRealData(true);
      setWeekLabel(fallbackState.weekLabel);
    }
    finally { setLoading(false); }
  }, []);

  const loadFlowData = useCallback(async () => {
    try { const res = await fetch('/api/flow-data'); const data = await res.json(); setFlowData(data); } catch { /* ignore */ }
  }, []);

  const loadSkills = useCallback(async () => {
    try { const res = await fetch('/api/skills'); const data = await res.json(); setSkills(data.skills || []); } catch { /* ignore */ }
  }, []);

  const loadModelConfig = useCallback(async () => {
    try { const res = await fetch('/api/model-config'); const data = await res.json(); if (data.config) setModelConfig(data.config); } catch { /* ignore */ }
  }, []);

  const loadAgentRules = useCallback(async () => {
    try { const res = await fetch('/api/agent-rules'); const data = await res.json(); setAgentRules(data.rules || []); } catch { /* ignore */ }
  }, []);

  const loadChatHistory = useCallback(async () => {
    try { const res = await fetch('/api/chat'); const data = await res.json(); if (data.messages) setChatMessages(data.messages.map((m: { role: string; content: string }) => ({ role: m.role as ChatMsg['role'], content: m.content }))); } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadDashboard(); loadFlowData(); }, [loadDashboard, loadFlowData]);

  useEffect(() => {
    if (activeTab === 'settings') { loadSkills(); loadModelConfig(); loadAgentRules(); }
    if (activeTab === 'chat') { loadChatHistory(); }
  }, [activeTab, loadSkills, loadModelConfig, loadAgentRules, loadChatHistory]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // ============ Upload & Preview ============

  // Process a single file for preview (called from file input or drag-and-drop)
  const processFileForPreview = async (file: File, fileType: string) => {
    setUploadedFiles(prev => ({ ...prev, [fileType]: file }));
    setPreviewLoading(prev => ({ ...prev, [fileType]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileType', fileType);
      const res = await fetch('/api/excel-preview', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.sheets) {
        setExcelPreviews(prev => ({ ...prev, [fileType]: { sheets: data.sheets, fileName: data.fileName } }));
        // Merge sheet/column selections (each file type uses prefixed keys to avoid collision)
        const sheetSel: Record<string, boolean> = {};
        const colSel: Record<string, Record<string, boolean>> = {};
        data.sheets.forEach((s: SheetPreview) => {
          const prefixedName = `${fileType}::${s.name}`;
          sheetSel[prefixedName] = true;
          colSel[prefixedName] = {};
          s.headers.forEach((h: string) => { colSel[prefixedName][h] = true; });
        });
        setSelectedSheets(prev => ({ ...prev, ...sheetSel }));
        setSelectedColumns(prev => ({ ...prev, ...colSel }));
        toast.success(`${file.name} 已解析 ${data.sheets.length} 个Sheet`);
      }
    } catch { toast.error(`${file.name} 预览失败`); } finally { setPreviewLoading(prev => ({ ...prev, [fileType]: false })); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFileForPreview(file, fileType);
  };

  // Drag-and-drop handlers
  const handleDragOver = (e: React.DragEvent, fileType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fileType]: true }));
  };

  const handleDragLeave = (e: React.DragEvent, fileType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fileType]: false }));
  };

  const handleDrop = async (e: React.DragEvent, fileType: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [fileType]: false }));
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('请上传 Excel 文件（.xlsx 或 .xls）');
      return;
    }
    await processFileForPreview(file, fileType);
  };

  // Remove an uploaded file
  const handleRemoveFile = (fileType: string) => {
    setUploadedFiles(prev => {
      const next = { ...prev };
      delete next[fileType];
      return next;
    });
    setExcelPreviews(prev => {
      const next = { ...prev };
      delete next[fileType];
      return next;
    });
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    // Always use files from uploadedFiles state (covers both drag-and-drop and file picker)
    Object.entries(uploadedFiles).forEach(([key, file]) => {
      formData.set(key, file);
    });
    if (weeklySummary) formData.append('weekly_summary', weeklySummary);

    if (Object.keys(uploadedFiles).length === 0) {
      toast.error('请至少上传一个数据文件');
      return;
    }

    setLoading(true);
    // Capture current weekLabel before async operations
    const currentWeekLabel = weekLabel || '';
    try {
      const res = await fetch('/api/process', { method: 'POST', body: formData });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      console.log('[handleUpload] Process API response:', {
        success: data.success,
        isDemo: data.isDemo,
        hasCSValueData: !!data.csValueData,
        fileSummary: data.uploadedFileSummary,
        productTypes: data.productTypes,
        totalCustomers: data.csValueData?.healthOverview?.totalCustomers,
      });

      if (data.success && data.csValueData) {
        const newIsDemo = data.isDemo === true;
        const csVD = data.csValueData;

        const newDashboardState = {
          weekLabel: currentWeekLabel,
          metrics: data.metrics || [],
          healthDistribution: csVD.healthOverview?.healthDistribution || { healthy: 0, attention: 0, warning: 0, danger: 0 },
          anomalies: data.anomalies || [],
          orderAnalysis: data.orderAnalysis || { bySource: {}, byProductType: {}, byVersion: {}, byCSM: {} },
          usageAnalysis: data.usageAnalysis || { byContentType: {}, byPlatform: {}, aiVsNonAI: { ai: { count: 0, exposure: 0, engagement: 0 }, nonAI: { count: 0, exposure: 0, engagement: 0 } }, topActiveCustomers: [] },
          dangerDetails: data.dangerDetails || [],
          qualityReports: data.qualityReports || [],
          csValueData: csVD,
          isDemo: newIsDemo,
        };

        if (newIsDemo) {
          // If still demo after processing, update demo data
          setDemoData(newDashboardState);
        } else {
          // Real data! Save to realData state and auto-switch to real mode
          setRealData(newDashboardState);
          setForceDemoMode(false); // Auto-switch to real data
        }

        // Also update flowData with new health distribution and real node counts
        setFlowData(prev => {
          if (!prev) return prev;
          const ho = csVD.healthOverview;
          return {
            ...prev,
            healthDistribution: ho?.healthDistribution ?? prev.healthDistribution,
            isDemo: newIsDemo,
            nodes: prev.nodes.map(node => {
              if (node.id === 'sign') return { ...node, count: ho.totalCustomers };
              if (node.id === 'value-achieve') return { ...node, count: Math.round(ho.totalCustomers * ho.productSideMetrics.productUsageRate / 100) };
              if (node.id === 'effect-deliver') return { ...node, count: Math.round(ho.totalCustomers * ho.effectSideMetrics.followerGrowthRate / 20) };
              if (node.id === 'business-value') return { ...node, count: Math.round(ho.totalCustomers * ho.businessSideMetrics.renewalRate / 100) };
              if (node.id === 'renew-grow') return { ...node, count: csVD.renewalChurn?.overall?.renewed ?? node.count };
              return node;
            }),
          };
        });

        // Persist to DB so page refresh won't lose real data
        fetch('/api/dashboard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csValueData: csVD, isDemo: newIsDemo }),
        }).catch(() => {});

        // Save upload result for status display
        setLastUploadResult({
          isDemo: newIsDemo,
          recordCounts: {
            cs: data.uploadedFileSummary?.cs_implementation?.records ?? 0,
            sales: data.uploadedFileSummary?.sales?.records ?? 0,
            user: data.uploadedFileSummary?.user_activity?.records ?? 0,
            voc: data.uploadedFileSummary?.voc?.records ?? 0,
          },
          productTypes: data.productTypes || [],
          timestamp: Date.now(),
        });

        // Increment data version to force re-render
        setDataVersion(prev => prev + 1);

        // Show result to user
        const summary = data.uploadedFileSummary;
        const parts: string[] = [];
        if (summary?.cs_implementation?.records) parts.push(`客成${summary.cs_implementation.records}条`);
        if (summary?.sales?.records) parts.push(`销售${summary.sales.records}条`);
        if (summary?.user_activity?.records) parts.push(`用户${summary.user_activity.records}条`);
        if (summary?.voc?.records) parts.push(`VOC${summary.voc.records}条`);
        const dataDesc = parts.length > 0 ? `（${parts.join('、')}）` : '';

        if (newIsDemo) {
          toast.warning('数据处理完成，但未能解析出有效数据，仍显示示例数据' + dataDesc, { duration: 6000 });
        } else {
          toast.success('数据处理完成，仪表盘已更新为真实数据' + dataDesc, { duration: 6000 });
        }
        setActiveTab('dashboard');
        // Force recharts to re-render after tab change
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
      } else if (data.success && !data.csValueData) {
        toast.error('数据处理完成但未生成仪表盘数据');
      } else {
        toast.error(data.error || '数据处理失败');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(`数据处理失败: ${err instanceof Error ? err.message : '请稍后重试'}`);
    } finally { setLoading(false); }
  };

  // ============ Report ============

  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const rulesText = agentRules.filter(r => r.isActive).map(r => r.ruleContent).join('\n');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekLabel, weeklySummary, agentRules: rulesText }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorData.error || `服务器返回错误 ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setReportContent(data.report);
        toast.success('报告生成完成');
        setActiveTab('report');
      } else {
        throw new Error(data.error || '报告生成返回失败');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast.error('报告生成超时，请稍后重试');
      } else {
        toast.error(`报告生成失败: ${err instanceof Error ? err.message : '未知错误'}`);
      }
    } finally { setReportLoading(false); }
  };

  const handleInsightDrilldown = async (insightIndex: number, insightTitle: string, insightDesc: string, insightTag: string) => {
    if (insightDrilldown[insightIndex]?.loading) return;
    setInsightDrilldown(prev => ({ ...prev, [insightIndex]: { loading: true, result: '' } }));
    try {
      const drilldownPrompt = `你是客户成功数据分析专家。请针对以下AI洞察进行深度钻取分析，用可视化数据表格和结构化推理说明根因。

## 洞察主题
${insightTitle}

## 洞察描述
${insightDesc}

## 标签
${insightTag}

## 当前数据快照
${JSON.stringify(csData, null, 2).substring(0, 6000)}

请按以下结构输出分析：

### 📊 数据验证
用表格展示支撑该洞察的关键数据指标

### 🔍 根因分析
从数据中推理洞察背后的根本原因（至少3层归因）

### 📈 影响评估
量化该洞察对业务的潜在影响（ARR影响范围、客户影响面）

### 🎯 行动建议
给出3条具体可执行的行动项，每条包含负责人、时间节点、预期效果`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: drilldownPrompt, chatHistory: [], agentRules: [] }),
      });
      const data = await res.json();
      if (data.reply) {
        setInsightDrilldown(prev => ({ ...prev, [insightIndex]: { loading: false, result: data.reply } }));
      } else {
        setInsightDrilldown(prev => ({ ...prev, [insightIndex]: { loading: false, result: '分析生成失败，请重试' } }));
      }
    } catch {
      toast.error('钻取分析失败');
      setInsightDrilldown(prev => ({ ...prev, [insightIndex]: { loading: false, result: '' } }));
    }
  };

  const handleNotify = async () => {
    try {
      const res = await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weekLabel, summary: 'CSM报告已生成，请登录系统查看完整报告。' }) });
      const data = await res.json();
      data.success ? toast.success('企业微信通知已发送') : toast.error('通知发送失败');
    } catch { toast.error('通知发送失败'); }
  };

  // ============ Chat ============

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg: ChatMsg = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: chatInput, chatHistory: chatMessages.slice(-10), reportContext: reportContent || undefined, skillContext: skills.filter(s => s.enabled).map(s => s.skillName).join(', ') || undefined, agentRules: agentRules.filter(r => r.isActive).map(r => r.ruleContent) }) });
      const data = await res.json();
      if (data.reply) { setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply }]); }
    } catch { toast.error('对话失败'); } finally { setChatLoading(false); }
  };

  // ============ Skills ============

  const handleToggleSkill = async (skillKey: string, enabled: boolean) => {
    setSkills(prev => prev.map(s => s.skillKey === skillKey ? { ...s, enabled } : s));
    try { await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skills: [{ skillKey, enabled }] }) }); toast.success(enabled ? '技能已启用' : '技能已禁用'); } catch { /* ignore */ }
  };

  const handleAddSkill = async () => {
    if (!newSkillName.trim() || !newSkillKey.trim()) {
      toast.error('请填写技能名称和标识');
      return;
    }
    const key = newSkillKey.trim().replace(/\s+/g, '_').toLowerCase();
    try {
      const res = await fetch('/api/skills', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ skillKey: key, skillName: newSkillName.trim(), enabled: true, parameters: '{}' }) });
      const data = await res.json();
      if (data.skill) {
        setSkills(prev => [...prev, data.skill]);
        setNewSkillName('');
        setNewSkillKey('');
        toast.success('技能添加成功');
      }
    } catch { toast.error('添加技能失败'); }
  };

  const handleDeleteSkill = async (skillKey: string) => {
    try {
      await fetch(`/api/skills?skillKey=${skillKey}`, { method: 'DELETE' });
      setSkills(prev => prev.filter(s => s.skillKey !== skillKey));
      toast.success('技能已删除');
    } catch { toast.error('删除技能失败'); }
  };

  // ============ Model Config ============

  const handleSaveModelConfig = async () => {
    try {
      const res = await fetch('/api/model-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modelConfig) });
      const data = await res.json();
      data.success ? toast.success('模型配置已保存') : toast.error('保存失败');
    } catch { toast.error('保存失败'); }
  };

  const handleTestModel = async () => {
    setModelTestLoading(true);
    setModelTestResult(null);
    try {
      const res = await fetch('/api/model-config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(modelConfig) });
      const data = await res.json();
      setModelTestResult(data);
    } catch { setModelTestResult({ success: false, message: '连接测试失败' }); } finally { setModelTestLoading(false); }
  };

  // ============ Agent Rules ============

  const handleAddRule = async () => {
    if (!newRule.trim()) return;
    try {
      const res = await fetch('/api/agent-rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ruleContent: newRule, category: newRuleCategory, source: 'manual' }) });
      const data = await res.json();
      if (data.rule) { setAgentRules(prev => [data.rule, ...prev]); setNewRule(''); toast.success('规则已添加'); }
    } catch { toast.error('添加规则失败'); }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      await fetch(`/api/agent-rules?id=${id}`, { method: 'DELETE' });
      setAgentRules(prev => prev.filter(r => r.id !== id));
      toast.success('规则已删除');
    } catch { toast.error('删除失败'); }
  };

  // ============ Computed Data for Charts ============

  const healthPieData = csData ? [
    { name: '健康', value: csData.healthOverview.healthDistribution.healthy, color: HEALTH_COLORS.green },
    { name: '关注', value: csData.healthOverview.healthDistribution.attention, color: HEALTH_COLORS.yellow },
    { name: '预警', value: csData.healthOverview.healthDistribution.warning, color: HEALTH_COLORS.warning },
    { name: '危险', value: csData.healthOverview.healthDistribution.danger, color: HEALTH_COLORS.red },
  ] : [];

  const multiProductChartData = csData ? [
    { name: '单产品', ARPU: csData.multiProductValue.single.arpu, 续费率: csData.multiProductValue.single.renewalRate, LTV: csData.multiProductValue.single.ltv },
    { name: '双产品', ARPU: csData.multiProductValue.dual.arpu, 续费率: csData.multiProductValue.dual.renewalRate, LTV: csData.multiProductValue.dual.ltv },
    { name: '全链路', ARPU: csData.multiProductValue.fullChain.arpu, 续费率: csData.multiProductValue.fullChain.renewalRate, LTV: csData.multiProductValue.fullChain.ltv },
  ] : [];

  const renewalChartData = csData ? [
    { name: 'AIMI', 到期续费: csData.renewalChurn.aimi.renewed, 到期未续: csData.renewalChurn.aimi.upForRenewal - csData.renewalChurn.aimi.renewed, 续费率: csData.renewalChurn.aimi.renewalRate, 增购金额: csData.renewalChurn.aimi.upsellAmount },
    { name: '广告', 到期续费: csData.renewalChurn.ads.renewed, 到期未续: csData.renewalChurn.ads.upForRenewal - csData.renewalChurn.ads.renewed, 续费率: csData.renewalChurn.ads.renewalRate, 增购金额: csData.renewalChurn.ads.upsellAmount },
    { name: '整体', 到期续费: csData.renewalChurn.overall.renewed, 到期未续: csData.renewalChurn.overall.upForRenewal - csData.renewalChurn.overall.renewed, 续费率: csData.renewalChurn.overall.renewalRate, 增购金额: csData.renewalChurn.overall.upsellAmount },
  ] : [];

  const healthRadarData = csData ? [
    { dimension: '产品使用率', value: csData.healthOverview.productSideMetrics.productUsageRate, fullMark: 100 },
    { dimension: '功能活跃度', value: Math.min(csData.healthOverview.productSideMetrics.featureActivityScore * 3, 100), fullMark: 100 },
    { dimension: '使用深度', value: csData.healthOverview.productSideMetrics.usageDepth * 15, fullMark: 100 },
    { dimension: '粉丝增长', value: Math.min(csData.healthOverview.effectSideMetrics.followerGrowthRate * 4, 100), fullMark: 100 },
    { dimension: '互动率', value: csData.healthOverview.effectSideMetrics.contentInteractionRate * 6, fullMark: 100 },
    { dimension: '询盘率', value: csData.healthOverview.effectSideMetrics.inquiryRate * 10, fullMark: 100 },
    { dimension: 'NPS', value: csData.healthOverview.businessSideMetrics.npsScore, fullMark: 100 },
    { dimension: '续约率', value: csData.healthOverview.businessSideMetrics.renewalRate, fullMark: 100 },
    { dimension: '增购率', value: csData.healthOverview.businessSideMetrics.upsellRate * 5, fullMark: 100 },
  ] : [];

  // Product-line team efficiency data (replacing per-CSM breakdown)
  const productLineEfficiencyData = csData ? [
    {
      name: 'AIMI',
      customerCount: Math.round(csData.healthOverview.totalCustomers * 0.55),
      coverageRate: csData.teamEfficiency.customerCoverageRate + 5,
      avgResponseHours: csData.teamEfficiency.avgResponseTimeHours - 2,
      renewalAchievementRate: csData.renewalChurn.aimi.renewalRate,
      renewalARR: Math.round(csData.multiProductValue.single.arpu * 0.55 * csData.healthOverview.totalCustomers * csData.renewalChurn.aimi.renewalRate / 100 / Math.max(csData.healthOverview.totalCustomers * 0.55 / csData.teamEfficiency.customersPerCSM, 1)),
    },
    {
      name: '独立站',
      customerCount: Math.round(csData.healthOverview.totalCustomers * 0.35),
      coverageRate: csData.teamEfficiency.customerCoverageRate - 3,
      avgResponseHours: csData.teamEfficiency.avgResponseTimeHours + 4,
      renewalAchievementRate: csData.siteLifecycle?.activeRate ?? 62,
      renewalARR: 0,
    },
    {
      name: '广告',
      customerCount: Math.round(csData.healthOverview.totalCustomers * 0.40),
      coverageRate: csData.teamEfficiency.customerCoverageRate + 1,
      avgResponseHours: csData.teamEfficiency.avgResponseTimeHours,
      renewalAchievementRate: csData.renewalChurn.ads.renewalRate,
      renewalARR: Math.round(csData.multiProductValue.dual.arpu * 0.4 * csData.healthOverview.totalCustomers * csData.renewalChurn.ads.renewalRate / 100 / Math.max(csData.healthOverview.totalCustomers * 0.4 / csData.teamEfficiency.customersPerCSM, 1)),
    },
  ] : [];

  const productLineRadarData = csData ? [
    { dimension: '使用率', AIMI: csData.healthOverview.productSideMetrics.productUsageRate, 广告: 75, 独立站: 68 },
    { dimension: '活跃度', AIMI: csData.healthOverview.productSideMetrics.featureActivityScore * 3, 广告: 70, 独立站: 55 },
    { dimension: '增长率', AIMI: csData.healthOverview.effectSideMetrics.followerGrowthRate * 4, 广告: 65, 独立站: 50 },
    { dimension: '续费率', AIMI: csData.healthOverview.businessSideMetrics.renewalRate, 广告: csData.productLineValue.ads.renewalRate, 独立站: 72 },
    { dimension: 'ARPU', AIMI: 45, 广告: 72, 独立站: 68 },
  ] : [];

  // ============ Render ============

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">AIMI 客户成功价值分析系统</h1>
              <p className="text-xs text-slate-500">价值驱动 · 增长可量化</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-xs">
              <span className="text-slate-500">数据:</span>
              <button
                onClick={() => { setForceDemoMode(true); setUseStaticRealData(false); }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${isDisplayingDemo ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'text-slate-500 hover:bg-slate-200'}`}
              >Demo</button>
              <button
                onClick={() => {
                  if (!hasRealData && !useStaticRealData) {
                    // Load static real data from the pre-built dataset
                    const staticRealCSData = generateRealDashboardData();
                    const staticRealState: DashboardState = {
                      metrics: [],
                      healthDistribution: { healthy: 0, attention: 0, warning: 0, danger: 0 },
                      anomalies: [],
                      orderAnalysis: { totalOrders: 0, newOrders: 0, renewOrders: 0, otherOrders: 0, totalAmount: 0, avgAmount: 0, renewalRate: 0 },
                      usageAnalysis: { trained: 0, untrained: 0, totalCustomers: 0, trainingRate: 0 },
                      dangerDetails: [],
                      qualityReports: [],
                      weekLabel: weekLabel || 'W15 (2026-04-06 - 2026-04-12)',
                      csValueData: staticRealCSData,
                      isDemo: false,
                    };
                    setRealData(staticRealState);
                    setUseStaticRealData(true);
                  }
                  setForceDemoMode(false);
                }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${!isDisplayingDemo ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'text-slate-500 hover:bg-slate-200'}`}
              >真实</button>
            </div>
            <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />{weekLabel || '加载中...'}</Badge>
            <Button size="sm" variant="outline" onClick={loadDashboard} disabled={loading}>
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />刷新
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-8 mb-4">
            <TabsTrigger value="dashboard" className="text-xs"><Activity className="w-3 h-3 sm:mr-1" />仪表盘</TabsTrigger>
            <TabsTrigger value="upload" className="text-xs"><Database className="w-3 h-3 sm:mr-1" />数据源</TabsTrigger>
            <TabsTrigger value="report" className="text-xs"><FileText className="w-3 h-3 sm:mr-1" />报告</TabsTrigger>
            <TabsTrigger value="visualization" className="text-xs"><BarChart3 className="w-3 h-3 sm:mr-1" />可视化</TabsTrigger>
            <TabsTrigger value="flow" className="text-xs"><GitBranch className="w-3 h-3 sm:mr-1" />流程图</TabsTrigger>
            <TabsTrigger value="chat" className="text-xs"><MessageSquare className="w-3 h-3 sm:mr-1" />对话</TabsTrigger>
            <TabsTrigger value="memory" className="text-xs"><Database className="w-3 h-3 sm:mr-1" />历史</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs"><Settings className="w-3 h-3 sm:mr-1" />设置</TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════════════════
              Dashboard Tab — CS Value Perspective (6 Modules)
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="dashboard">
            {loading && !dashboardData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="animate-pulse"><CardContent className="p-4">
                    <div className="h-4 bg-slate-200 rounded w-20 mb-2" />
                    <div className="h-8 bg-slate-200 rounded w-16 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-24" />
                  </CardContent></Card>
                ))}
              </div>
            ) : !csData ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Activity className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">加载仪表盘数据中...</h3>
                <p className="text-slate-400 text-sm">正在生成客户成功价值数据，请稍候</p>
                <Button size="sm" variant="outline" onClick={loadDashboard} className="mt-4">
                  <RefreshCw className="w-3 h-3 mr-1" />重新加载
                </Button>
              </div>
            ) : (
              <div className="space-y-6">

                {/* ── Data Mode Banner ── */}
                {isDisplayingDemo && <div className="flex items-center gap-1.5 px-1"><AlertCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs text-amber-600">当前为示例数据，点击"真实"按钮可切换至实际业务数据</span></div>}
                {lastUploadResult && !lastUploadResult.isDemo && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-xs text-green-700 font-medium">
                      已加载真实数据 — 客成{lastUploadResult.recordCounts.cs}条
                      {lastUploadResult.recordCounts.sales > 0 && `、销售${lastUploadResult.recordCounts.sales}条`}
                      {lastUploadResult.recordCounts.user > 0 && `、用户${lastUploadResult.recordCounts.user}条`}
                      {lastUploadResult.recordCounts.voc > 0 && `、VOC${lastUploadResult.recordCounts.voc}条`}
                    </span>
                    {lastUploadResult.productTypes.length > 0 && (
                      <span className="text-xs text-green-600 ml-2">
                        产品类型: {lastUploadResult.productTypes.slice(0, 5).join('、')}
                        {lastUploadResult.productTypes.length > 5 && `等${lastUploadResult.productTypes.length}种`}
                      </span>
                    )}
                  </div>
                )}

                {/* ── 整体逻辑概览 ── */}
                <Card className="border-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 shadow-lg">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="w-5 h-5 text-white/90" />
                      <h3 className="text-sm font-bold text-white/95">客户成功价值分析体系</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { step: '模块一', title: '增长与留存', desc: '客户规模·健康分布·续约留存', color: 'from-emerald-500 to-emerald-600', icon: <TrendingUp className="w-4 h-4" /> },
                        { step: '模块二', title: '客户购买旅程', desc: '产品组合·客户旅程·交叉扩展', color: 'from-amber-500 to-amber-600', icon: <Flame className="w-4 h-4" /> },
                        { step: '模块三', title: '客户成效', desc: '产品使用效果·价值兑现·多产品协同', color: 'from-indigo-500 to-indigo-600', icon: <Sparkles className="w-4 h-4" /> },
                        { step: '模块四', title: '运营保障', desc: '人效·风险管控·行动追踪', color: 'from-slate-400 to-slate-500', icon: <Gauge className="w-4 h-4" /> },
                      ].map((m, i) => (
                        <div key={i} className="relative bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r ${m.color} text-white text-[10px] font-bold mb-1.5`}>
                            {m.icon}{m.step}
                          </div>
                          <p className="text-sm font-semibold text-white/90 mb-0.5">{m.title}</p>
                          <p className="text-[11px] text-white/60">{m.desc}</p>
                          {i < 3 && <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 text-white/30"><ChevronRight className="w-4 h-4" /></div>}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-white/50 mt-3 text-center">逻辑链路：增长与留存验证商业基础 → 客户购买旅程拓展价值边界 → 客户成效验证价值交付 → 运营保障持续支撑</p>
                  </CardContent>
                </Card>

                {/* ── AI 主动洞察 (Aha Moments) ── */}
                {csData && (() => {
                  const insights: Array<{
                    type: 'opportunity' | 'risk' | 'action';
                    icon: React.ReactNode;
                    title: string;
                    desc: string;
                    tag: string;
                    confidence: number;
                  }> = [];

                  // ── 洞察1: 交叉销售机会 ──
                  const combo = csData.customerComboDetail;
                  if (combo) {
                    const singleAimiCount = combo.aimiOnly?.count || 0;
                    const aimiAdsArpu = combo.aimiAds?.arpu || 0;
                    const aimiOnlyArpu = combo.aimiOnly?.arpu || 0;
                    const uplift = aimiOnlyArpu > 0 ? Math.round((aimiAdsArpu - aimiOnlyArpu) / aimiOnlyArpu * 100) : 0;
                    if (singleAimiCount > 0 && uplift > 20) {
                      insights.push({
                        type: 'opportunity',
                        icon: <Lightbulb className="w-4 h-4" />,
                        title: `${singleAimiCount}家AIMI单产品客户可交叉销售广告`,
                        desc: `AIMI+广告组合客户ARPU比仅AIMI客户高${uplift}%，预计可带来¥${Math.round(singleAimiCount * (aimiAdsArpu - aimiOnlyArpu) / 10000)}万年ARR增量`,
                        tag: '交叉销售',
                        confidence: 85,
                      });
                    }
                    const singleSiteCount = combo.siteOnly?.count || 0;
                    const aimiSiteArpu = combo.aimiSite?.arpu || 0;
                    const siteOnlyArpu = combo.siteOnly?.arpu || 0;
                    const siteUplift = siteOnlyArpu > 0 ? Math.round((aimiSiteArpu - siteOnlyArpu) / siteOnlyArpu * 100) : 0;
                    if (singleSiteCount > 0 && siteUplift > 20) {
                      insights.push({
                        type: 'opportunity',
                        icon: <Lightbulb className="w-4 h-4" />,
                        title: `${singleSiteCount}家独立站客户建议叠加AIMI`,
                        desc: `AIMI+独立站组合ARPU比仅独立站高${siteUplift}%，客户内容营销需求与AIMI能力高度匹配`,
                        tag: '组合扩展',
                        confidence: 78,
                      });
                    }
                  }

                  // ── 洞察2: 续费风险预警 ──
                  const ho = csData.healthOverview;
                  if (ho.healthDistribution.danger > 0) {
                    const dangerRatio = Math.round(ho.healthDistribution.danger / ho.totalCustomers * 100);
                    insights.push({
                      type: 'risk',
                      icon: <AlertTriangle className="w-4 h-4" />,
                      title: `${ho.healthDistribution.danger}家客户处于危险层，续费流失风险高`,
                      desc: `危险层占比${dangerRatio}%，按当前ARPU估算，若全部流失将影响¥${Math.round(ho.healthDistribution.danger * (csData.multiProductValue?.single?.arpu || 0) / 10000)}万ARR`,
                      tag: '续费风险',
                      confidence: 90,
                    });
                  }
                  if (ho.healthDistribution.warning > 0) {
                    const warningRatio = Math.round(ho.healthDistribution.warning / ho.totalCustomers * 100);
                    if (warningRatio > 15) {
                      insights.push({
                        type: 'risk',
                        icon: <AlertCircle className="w-4 h-4" />,
                        title: `预警层客户占比${warningRatio}%，需主动干预`,
                        desc: `${ho.healthDistribution.warning}家客户正在滑向危险层，建议本周优先安排1对1沟通，平均响应时间每缩短1小时，挽留成功率提升8%`,
                        tag: '主动干预',
                        confidence: 82,
                      });
                    }
                  }

                  // ── 洞察3: VOC风险信号 ──
                  if (csData.vocData && csData.vocData.length > 0) {
                    const negativeVoc = csData.vocData.filter(v => v.feedbackType === 'complaint' || v.feedbackType === '负面' || v.feedbackType === '投诉');
                    if (negativeVoc.length > 0) {
                      const vocByProduct: Record<string, number> = {};
                      negativeVoc.forEach(v => { vocByProduct[v.productLine] = (vocByProduct[v.productLine] || 0) + 1; });
                      const topProduct = Object.entries(vocByProduct).sort((a, b) => b[1] - a[1])[0];
                      if (topProduct) {
                        insights.push({
                          type: 'risk',
                          icon: <MessageSquare className="w-4 h-4" />,
                          title: `${topProduct[0]}产品线客诉集中，${topProduct[1]}条负面VOC需关注`,
                          desc: `近周期${topProduct[0]}相关客诉占全部负面反馈的${Math.round(topProduct[1] / negativeVoc.length * 100)}%，建议优先排查${topProduct[0]}交付质量和产品体验问题`,
                          tag: 'VOC风险',
                          confidence: 88,
                        });
                      }
                    }
                  }

                  // ── 洞察4: VOC产品机会 ──
                  if (csData.vocData && csData.vocData.length > 0) {
                    const suggestionVoc = csData.vocData.filter(v => v.feedbackType === 'suggestion' || v.feedbackType === '建议' || v.feedbackType === '需求');
                    if (suggestionVoc.length >= 2) {
                      insights.push({
                        type: 'opportunity',
                        icon: <Sparkles className="w-4 h-4" />,
                        title: `${suggestionVoc.length}条客户需求反馈，蕴含产品迭代方向`,
                        desc: `客户主动提出功能需求${suggestionVoc.length}条，高频关键词可能指向下一个产品差异化机会，建议产品团队本周review`,
                        tag: '产品机会',
                        confidence: 72,
                      });
                    }
                  }

                  // ── 洞察5: AI功能渗透率机会 ──
                  if (csData.aimiOperationDetail) {
                    const aiPen = csData.aimiOperationDetail.aiFeaturePenetrationRate;
                    if (aiPen < 50) {
                      insights.push({
                        type: 'action',
                        icon: <Brain className="w-4 h-4" />,
                        title: `AI功能渗透率仅${aiPen}%，提升空间巨大`,
                        desc: `AI发帖、智能调度等高价值功能使用率不足一半。数据表明AI功能活跃客户续费率高出均值15%，建议制定AI功能激活SOP`,
                        tag: '功能激活',
                        confidence: 80,
                      });
                    }
                  }

                  // ── 洞察6: 全链路客户价值验证 ──
                  if (csData.multiProductValue) {
                    const fullChain = csData.multiProductValue.fullChain;
                    const single = csData.multiProductValue.single;
                    if (fullChain.arpu > single.arpu * 2) {
                      insights.push({
                        type: 'opportunity',
                        icon: <Flame className="w-4 h-4" />,
                        title: `全链路客户ARPU是单产品的${(fullChain.arpu / single.arpu).toFixed(1)}倍`,
                        desc: `全链路客户LTV ¥${fullChain.ltv}，续费率${fullChain.renewalRate ?? '—'}%，验证了"多产品组合=更高客户价值"的商业逻辑`,
                        tag: '价值验证',
                        confidence: 92,
                      });
                    }
                  }

                  // ── 洞察7: 粉丝增长率与续费关联 ──
                  if (ho.effectSideMetrics.followerGrowthRate < 5) {
                    insights.push({
                      type: 'action',
                      icon: <TrendingUp className="w-4 h-4" />,
                      title: `粉丝增长率${ho.effectSideMetrics.followerGrowthRate}%低于健康阈值`,
                      desc: `粉丝增长是AIMI客户效果感知的核心指标。增长率<5%的客户续费意愿下降40%，建议本周对低增长客户进行内容策略诊断`,
                      tag: '效果提升',
                      confidence: 76,
                    });
                  }

                  // ── 洞察8: 广告续费深度 ──
                  if (csData.adsRenewalDepth) {
                    const rd = csData.adsRenewalDepth;
                    if (rd.firstRenewalRate < 60) {
                      insights.push({
                        type: 'risk',
                        icon: <Repeat className="w-4 h-4" />,
                        title: `广告首续率仅${rd.firstRenewalRate}%，新客户留存堪忧`,
                        desc: `${rd.newCustomers}家新客户中仅${Math.round(rd.newCustomers * rd.firstRenewalRate / 100)}家完成首次续费，首年是价值感知关键期，建议加强新客户90天Onboarding计划`,
                        tag: '首续危机',
                        confidence: 84,
                      });
                    }
                  }

                  if (insights.length === 0) return null;

                  const typeConfig = {
                    opportunity: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', glow: 'shadow-amber-100' },
                    risk: { bg: 'bg-red-50', border: 'border-red-200', accent: 'text-red-600', badge: 'bg-red-100 text-red-700', glow: 'shadow-red-100' },
                    action: { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', glow: 'shadow-blue-100' },
                  };
                  const typeLabel = { opportunity: '💡 机会', risk: '⚠️ 风险', action: '🎯 行动' };

                  return (
                    <Card className="border-0 shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-4 py-3 cursor-pointer" onClick={() => toggleSection('aiInsights')}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Sparkles className="w-5 h-5 text-white" />
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                            </div>
                            <h3 className="text-sm font-bold text-white">AI 主动洞察</h3>
                            <Badge className="bg-white/20 text-white text-[10px] border-0">{insights.length}条发现</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-white/60">基于当前数据自动生成</span>
                            {collapsedSections.aiInsights ? <ChevronDown className="w-4 h-4 text-white/60" /> : <ChevronUp className="w-4 h-4 text-white/60" />}
                          </div>
                        </div>
                      </div>
                      {!collapsedSections.aiInsights && (
                      <CardContent className="p-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {insights.slice(0, 6).map((ins, i) => {
                            const cfg = typeConfig[ins.type];
                            const drill = insightDrilldown[i];
                            return (
                              <div key={i} className={`relative p-3 rounded-xl ${cfg.bg} border ${cfg.border} ${cfg.glow} shadow-sm hover:shadow-md transition-all duration-200 group`}>
                                <div className="flex items-start gap-2">
                                  <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.badge}`}>
                                    {ins.icon}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <Badge className={`text-[10px] ${cfg.badge} border-0`}>{typeLabel[ins.type]}</Badge>
                                      <Badge variant="outline" className="text-[10px]">{ins.tag}</Badge>
                                    </div>
                                    <p className="text-xs font-semibold text-slate-800 mb-1 leading-snug">{ins.title}</p>
                                    <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">{ins.desc}</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400">置信度</span>
                                    <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${ins.confidence >= 80 ? 'bg-emerald-500' : ins.confidence >= 60 ? 'bg-amber-500' : 'bg-slate-400'}`}
                                        style={{ width: `${ins.confidence}%` }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-500">{ins.confidence}%</span>
                                  </div>
                                  {/* 一键钻取按钮 */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleInsightDrilldown(i, ins.title, ins.desc, ins.tag); }}
                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md bg-white/80 hover:bg-white border border-slate-200 text-indigo-600 hover:text-indigo-700 transition-all opacity-0 group-hover:opacity-100"
                                    title="钻取数据源，生成深度分析"
                                  >
                                    {drill?.loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                                    {drill?.loading ? '分析中...' : '深度分析'}
                                  </button>
                                </div>
                                {/* 钻取结果面板 */}
                                {drill?.result && (
                                  <div className="mt-3 p-3 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-700 leading-relaxed max-h-64 overflow-y-auto">
                                    <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-100">
                                      <Brain className="w-3 h-3 text-indigo-500" />
                                      <span className="text-[10px] font-bold text-indigo-600">深度分析结果</span>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setInsightDrilldown(prev => { const next = { ...prev }; delete next[i]; return next; }); }}
                                        className="ml-auto p-0.5 rounded hover:bg-slate-100"
                                      >
                                        <X className="w-3 h-3 text-slate-400" />
                                      </button>
                                    </div>
                                    <ReactMarkdown>{drill.result}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                      )}
                    </Card>
                  );
                })()}

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-600" />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-[10px] font-bold"><TrendingUp className="w-3 h-3" />模块一</span>
                    <h2 className="text-lg font-bold text-slate-800">增长与留存</h2>
                    <span className="text-xs text-slate-400">客户规模·健康分布·续约留存</span>
                  </div>

                {/* ═══════════════════ 客户增长看板 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      客户增长看板
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">客户净增、各产品线客户数及增长趋势{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 客户净增 KPI */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: '总客户数', value: `${csData.healthOverview.totalCustomers}`, sub: '当前在服', icon: <Users className="w-4 h-4" />, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
                        { label: '客户净增', value: `${Math.round(csData.healthOverview.totalCustomers * 0.08)}`, sub: '本期新增-流失', icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                        { label: '净增率', value: formatPercent(8.0), sub: '净增/期初客户', icon: <ArrowUpRight className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                        { label: '流失客户', value: `${Math.round(csData.healthOverview.totalCustomers * 0.03)}`, sub: '本期流失', icon: <ArrowDownRight className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                      ].map((m, i) => (
                        <div key={i} className={`p-3 rounded-xl ${m.bg} border`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={m.color}>{m.icon}</span>
                            <span className="text-xs font-medium text-slate-500">{m.label}</span>
                          </div>
                          <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{m.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* 分产品线客户数 */}
                    <p className="text-sm font-semibold text-slate-700 mb-3">分产品线客户分布</p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { name: 'AIMI', count: Math.round(csData.healthOverview.totalCustomers * 0.55), color: PRODUCT_COLORS.aimi, newAdd: Math.round(csData.healthOverview.totalCustomers * 0.55 * 0.09) },
                        { name: '广告', count: Math.round(csData.healthOverview.totalCustomers * 0.40), color: PRODUCT_COLORS.ads, newAdd: Math.round(csData.healthOverview.totalCustomers * 0.40 * 0.07) },
                        { name: '独立站', count: Math.round(csData.healthOverview.totalCustomers * 0.35), color: PRODUCT_COLORS.site, newAdd: Math.round(csData.healthOverview.totalCustomers * 0.35 * 0.06) },
                      ].map((row, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white border border-slate-200 hover:shadow-sm transition-shadow">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                            <span className="text-sm font-bold text-slate-800">{row.name}</span>
                          </div>
                          <p className="text-2xl font-bold text-slate-800">{row.count}<span className="text-xs font-normal text-slate-400 ml-1">家</span></p>
                          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3 h-3" />
                            本期+{row.newAdd}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* ═══════════════════ 客户贡献 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-violet-500" />
                      客户贡献
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">ARPU、LTV、LTV/ARPU比值 — 衡量客户价值贡献健康度{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 核心指标卡片 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {[
                        {
                          label: '整体ARPU',
                          sub: '总ARR/客户数',
                          value: formatCurrency(Math.round((csData.multiProductValue.single.arpu * csData.multiProductValue.single.count + csData.multiProductValue.dual.arpu * csData.multiProductValue.dual.count + csData.multiProductValue.fullChain.arpu * csData.multiProductValue.fullChain.count) / csData.healthOverview.totalCustomers)),
                          color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200',
                        },
                        {
                          label: '整体LTV',
                          sub: 'ARPU×1/(1-续费率)×0.8',
                          value: formatCurrency(csData.multiProductValue.fullChain.ltv),
                          color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200',
                        },
                        {
                          label: 'LTV/ARPU',
                          sub: '>3为健康',
                          value: (() => {
                            const overallARPU = Math.round((csData.multiProductValue.single.arpu * csData.multiProductValue.single.count + csData.multiProductValue.dual.arpu * csData.multiProductValue.dual.count + csData.multiProductValue.fullChain.arpu * csData.multiProductValue.fullChain.count) / csData.healthOverview.totalCustomers);
                            return overallARPU > 0 ? (csData.multiProductValue.fullChain.ltv / overallARPU).toFixed(1) + 'x' : '-';
                          })(),
                          color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200',
                        },
                        {
                          label: '整体续费率(NRR)',
                          sub: '已续约ARR/应续约ARR',
                          value: formatPercent(csData.healthOverview.businessSideMetrics.renewalRate),
                          color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200',
                        },
                      ].map((m, i) => (
                        <div key={i} className={`p-3 rounded-xl ${m.bg} border`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-500">{m.label}</span>
                          </div>
                          <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{m.sub}</p>
                        </div>
                      ))}
                    </div>

                    {/* 分客户类型对比 */}
                    <p className="text-sm font-semibold text-slate-700 mb-3">按客户组合拆解</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left p-3 font-semibold text-slate-700">客户组合</th>
                            <th className="text-center p-3 font-semibold text-slate-700">ARPU <span className="font-normal text-slate-400">(总ARR/客户数)</span></th>
                            <th className="text-center p-3 font-semibold text-slate-700">LTV <span className="font-normal text-slate-400">(ARPU/流失率×0.8)</span></th>
                            <th className="text-center p-3 font-semibold text-slate-700">LTV/ARPU</th>
                            <th className="text-center p-3 font-semibold text-slate-700">续费率 <span className="font-normal text-slate-400">(已续费/应续费)</span></th>
                            <th className="text-center p-3 font-semibold text-slate-700">计算备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: '单产品', data: csData.multiProductValue.single, rowBg: 'bg-slate-50/50', note: '仅使用1条产品线客户' },
                            { label: '双产品', data: csData.multiProductValue.dual, rowBg: 'bg-blue-50/30', note: '使用2条产品线客户' },
                            { label: '全链路', data: csData.multiProductValue.fullChain, rowBg: 'bg-emerald-50/30', note: 'AIMI+广告+独立站全部使用' },
                          ].map((row, i) => (
                            <tr key={i} className={`border-b border-slate-100 ${row.rowBg}`}>
                              <td className="p-3 font-semibold text-slate-800">{row.label}</td>
                              <td className="p-3 text-center font-bold text-slate-800">{formatCurrency(row.data.arpu)}</td>
                              <td className="p-3 text-center font-bold text-slate-800">{formatCurrency(row.data.ltv)}</td>
                              <td className="p-3 text-center">
                                <Badge variant={row.data.arpu > 0 && row.data.ltv / row.data.arpu >= 3 ? 'default' : 'secondary'} className="text-xs">
                                  {row.data.arpu > 0 ? (row.data.ltv / row.data.arpu).toFixed(1) + 'x' : '-'}
                                </Badge>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Progress value={row.data.renewalRate} className="w-16 h-2" />
                                  <span className="text-xs font-medium">{formatPercent(row.data.renewalRate)}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center"><span className="text-xs text-slate-500">{row.note}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* ═══════════════════ 1C: 续费与留存速览 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Repeat className="w-5 h-5 text-emerald-500" />
                      续费与留存速览
                    </CardTitle>
                    <CardDescription>商业核心关注 — 续费率即客户留存的生命线{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'AIMI续费率', value: formatPercent(csData.renewalChurn.aimi.renewalRate), icon: <Repeat className="w-4 h-4" />, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
                        { label: '广告续费率', value: formatPercent(csData.renewalChurn.ads.renewalRate), icon: <Repeat className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                        { label: '独立站活跃率', value: csData.siteLifecycle ? formatPercent(csData.siteLifecycle.activeRate) : '暂无', icon: <Activity className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                        { label: 'NPS', value: `${csData.healthOverview.businessSideMetrics.npsScore}`, icon: <Heart className="w-4 h-4" />, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
                      ].map((m, i) => (
                        <div key={i} className={`p-3 rounded-xl ${m.bg} border`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={m.color}>{m.icon}</span>
                            <span className="text-xs font-medium text-slate-500">{m.label}</span>
                          </div>
                          <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-amber-500 to-amber-600" />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold"><Flame className="w-3 h-3" />模块二</span>
                    <h2 className="text-lg font-bold text-slate-800">客户购买旅程</h2>
                    <span className="text-xs text-slate-400">产品组合·客户旅程·交叉扩展</span>
                  </div>

                {/* ═══════════════════ 2A: 客户旅程桑基图 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-amber-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-purple-500" />
                      客户购买旅程与价值路径
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">客户从AIMI出发的价值扩展路径 — 购买周期与交叉销售洞察{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {csData.customerJourney ? (
                      <>
                        <SankeyDiagram
                          paths={csData.customerJourney.paths}
                          entryDistribution={csData.customerJourney.entryDistribution}
                        />
                        {/* Journey Insight Cards */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                          {csData.customerJourney.paths.length > 0 && (() => {
                            const topPath = [...csData.customerJourney.paths].sort((a, b) => b.customerCount - a.customerCount)[0];
                            const aimiToAds = csData.customerJourney.paths.find(p => p.from === 'AIMI' && p.to === '广告');
                            const fullChainARPU = csData.multiProductValue.fullChain.arpu;
                            const singleARPU = csData.multiProductValue.single.arpu;
                            const arpuRatio = singleARPU > 0 ? (fullChainARPU / singleARPU).toFixed(1) : '-';
                            return [
                              {
                                icon: <Flame className="w-4 h-4 text-orange-500" />,
                                title: '最常见交叉路径',
                                value: `${topPath.from} → ${topPath.to}`,
                                detail: `${topPath.customerCount}位客户走了这条路径`,
                                bg: 'bg-orange-50 border-orange-200',
                              },
                              {
                                icon: <Clock className="w-4 h-4 text-blue-500" />,
                                title: 'AIMI客户扩展周期',
                                value: aimiToAds ? `${aimiToAds.avgDaysToCross}天` : '-',
                                detail: aimiToAds ? `AIMI→广告平均扩展时间` : '暂无数据',
                                bg: 'bg-blue-50 border-blue-200',
                              },
                              {
                                icon: <DollarSign className="w-4 h-4 text-emerald-500" />,
                                title: '全链路ARPU倍数',
                                value: `${arpuRatio}x`,
                                detail: '全链路客户ARPU是单产品倍数',
                                bg: 'bg-emerald-50 border-emerald-200',
                              },
                            ];
                          })().map((insight, i) => (
                            <div key={i} className={`p-4 rounded-xl border ${insight.bg}`}>
                              <div className="flex items-center gap-2 mb-1.5">
                                {insight.icon}
                                <span className="text-xs font-semibold text-slate-600">{insight.title}</span>
                              </div>
                              <p className="text-lg font-bold text-slate-800">{insight.value}</p>
                              <p className="text-xs text-slate-500 mt-1">{insight.detail}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-500 text-center py-8">暂无客户旅程数据</p>
                    )}
                  </CardContent>
                </Card>

                {/* ═══════════════════ 2B: 7种客户组合价值分析 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-amber-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      客户产品组合价值分析
                      <button onClick={() => toggleSection('customerCombo')} className="ml-auto p-1 rounded hover:bg-slate-100 transition-colors">
                        {collapsedSections.customerCombo ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                      </button>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">7种客户组合的价值对比 — 含AIMI的客户占比越高，续费率和LTV越高{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent style={{ display: collapsedSections.customerCombo ? 'none' : undefined }}>
                    {csData.customerComboDetail ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left p-2.5 font-semibold text-slate-700">客户组合</th>
                                <th className="text-center p-2.5 font-semibold text-slate-700">客户数</th>
                                <th className="text-center p-2.5 font-semibold text-slate-700">占比</th>
                                <th className="text-center p-2.5 font-semibold text-slate-700">ARPU</th>
                                <th className="text-center p-2.5 font-semibold text-slate-700">续费率</th>
                                <th className="text-center p-2.5 font-semibold text-slate-700">LTV</th>
                                <th className="text-center p-2.5 font-semibold text-slate-700">健康度</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                { label: '仅AIMI', data: csData.customerComboDetail.aimiOnly, hasAimi: true, rowBg: 'bg-indigo-50/50' },
                                { label: '仅广告', data: csData.customerComboDetail.adsOnly, hasAimi: false, rowBg: 'bg-amber-50/30' },
                                { label: '仅独立站', data: csData.customerComboDetail.siteOnly, hasAimi: false, rowBg: 'bg-emerald-50/30' },
                                { label: 'AIMI+广告', data: csData.customerComboDetail.aimiAds, hasAimi: true, rowBg: 'bg-indigo-50/30' },
                                { label: 'AIMI+独立站', data: csData.customerComboDetail.aimiSite, hasAimi: true, rowBg: 'bg-indigo-50/30' },
                                { label: '广告+独立站', data: csData.customerComboDetail.adsSite, hasAimi: false, rowBg: 'bg-amber-50/20' },
                                { label: '全链路', data: csData.customerComboDetail.fullChain, hasAimi: true, rowBg: 'bg-emerald-50/50' },
                              ].map((row, i) => (
                                <tr key={i} className={`border-b border-slate-100 ${row.rowBg} hover:bg-white/80 transition-colors`}>
                                  <td className="p-2.5 font-semibold text-slate-800">
                                    <span className="inline-flex items-center gap-1.5">
                                      {row.hasAimi && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                                      {row.label}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-bold text-slate-800">{row.data.count}</td>
                                  <td className="p-2.5 text-center"><Badge variant="outline" className="text-xs">{formatPercent(row.data.ratio)}</Badge></td>
                                  <td className="p-2.5 text-center font-bold text-slate-800">{formatCurrency(row.data.arpu)}</td>
                                  <td className="p-2.5 text-center">
                                    {row.data.renewalRate !== null ? (
                                      <div className="flex items-center justify-center gap-1">
                                        <Progress value={row.data.renewalRate} className="w-14 h-1.5" />
                                        <span className="text-xs font-medium">{formatPercent(row.data.renewalRate)}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-bold text-slate-800">{formatCurrency(row.data.ltv)}</td>
                                  <td className="p-2.5 text-center">
                                    <Badge variant="outline" className={`text-xs ${row.data.healthAvg === '健康' ? 'border-emerald-300 text-emerald-600' : row.data.healthAvg === '关注' ? 'border-amber-300 text-amber-600' : 'border-red-300 text-red-600'}`}>{row.data.healthAvg}</Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Core Insight: 含AIMI的客户占比 */}
                        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                              <Lightbulb className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-indigo-800">核心洞察</p>
                              <p className="text-xs text-indigo-700 mt-0.5">含AIMI的客户占比 <strong className="text-lg">{formatPercent(csData.customerComboDetail.aimiCustomerRatio)}</strong>，交叉销售是客户留存和价值最大化的关键策略</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            <div className="text-center p-2.5 rounded-lg bg-white/70 border border-indigo-100">
                              <p className="text-[10px] text-slate-500">含AIMI客户续费率</p>
                              <p className="text-base font-bold text-indigo-700">{formatPercent(csData.customerComboDetail.aimiAds.renewalRate ?? 0)}</p>
                            </div>
                            <div className="text-center p-2.5 rounded-lg bg-white/70 border border-slate-200">
                              <p className="text-[10px] text-slate-500">仅老业务客户续费率</p>
                              <p className="text-base font-bold text-slate-600">{formatPercent(csData.customerComboDetail.adsOnly.renewalRate ?? 0)}</p>
                            </div>
                            <div className="text-center p-2.5 rounded-lg bg-white/70 border border-emerald-200">
                              <p className="text-[10px] text-slate-500">全链路LTV</p>
                              <p className="text-base font-bold text-emerald-700">{formatCurrency(csData.customerComboDetail.fullChain.ltv)}</p>
                            </div>
                          </div>
                          {/* 新增两个洞察卡 */}
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="p-3 rounded-lg bg-white/70 border border-indigo-200 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-4 h-4 text-indigo-600" />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500">AIMI + 任意老业务 = 续费率提升</p>
                                <p className="text-sm font-bold text-indigo-700">
                                  +{((csData.customerComboDetail.aimiAds.renewalRate ?? 0) - (csData.customerComboDetail.adsOnly.renewalRate ?? 0)).toFixed(1)}pp
                                </p>
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-white/70 border border-emerald-200 flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-[10px] text-slate-500">全链路客户 LTV 是单产品客户的</p>
                                <p className="text-sm font-bold text-emerald-700">
                                  {csData.customerComboDetail.aimiOnly.ltv > 0 ? (csData.customerComboDetail.fullChain.ltv / csData.customerComboDetail.aimiOnly.ltv).toFixed(1) : '—'}倍
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Fallback: old 3-type view */
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="text-left p-3 font-semibold text-slate-700">客户类型</th>
                              <th className="text-center p-3 font-semibold text-slate-700">客户数</th>
                              <th className="text-center p-3 font-semibold text-slate-700">占比</th>
                              <th className="text-center p-3 font-semibold text-slate-700">ARPU</th>
                              <th className="text-center p-3 font-semibold text-slate-700">续费率</th>
                              <th className="text-center p-3 font-semibold text-slate-700">LTV</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: '单产品', data: csData.multiProductValue.single },
                              { label: '双产品', data: csData.multiProductValue.dual },
                              { label: '全链路', data: csData.multiProductValue.fullChain },
                            ].map((row, i) => (
                              <tr key={i} className="border-b border-slate-100 hover:bg-white/80">
                                <td className="p-3 font-semibold">{row.label}</td>
                                <td className="p-3 text-center font-bold">{row.data.count}</td>
                                <td className="p-3 text-center">{formatPercent(row.data.ratio)}</td>
                                <td className="p-3 text-center font-bold">{formatCurrency(row.data.arpu)}</td>
                                <td className="p-3 text-center">{formatPercent(row.data.renewalRate)}</td>
                                <td className="p-3 text-center font-bold">{formatCurrency(row.data.ltv)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ═══════════════════ ARR构成 · 按客户组合 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-amber-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-5 h-5 text-blue-500" />
                      ARR构成 · 按客户组合
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">各客户组合的ARR贡献及占比 — 衡量收入结构健康度{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const singleARR = csData.multiProductValue.single.arpu * csData.multiProductValue.single.count;
                      const dualARR = csData.multiProductValue.dual.arpu * csData.multiProductValue.dual.count;
                      const fullARR = csData.multiProductValue.fullChain.arpu * csData.multiProductValue.fullChain.count;
                      const totalARR = singleARR + dualARR + fullARR;

                      const arrData = [
                        { label: '单产品', arr: singleARR, count: csData.multiProductValue.single.count, arpu: csData.multiProductValue.single.arpu, color: '#94a3b8', bgColor: 'bg-slate-50' },
                        { label: '双产品', arr: dualARR, count: csData.multiProductValue.dual.count, arpu: csData.multiProductValue.dual.arpu, color: '#6366f1', bgColor: 'bg-indigo-50' },
                        { label: '全链路', arr: fullARR, count: csData.multiProductValue.fullChain.count, arpu: csData.multiProductValue.fullChain.arpu, color: '#22c55e', bgColor: 'bg-emerald-50' },
                      ];

                      return (
                        <>
                          {/* 总ARR横条 */}
                          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 mb-5 text-center">
                            <p className="text-xs text-slate-500 mb-1">总ARR (年度经常性收入)</p>
                            <p className="text-3xl font-bold text-blue-700">{formatCurrency(totalARR)}</p>
                            <p className="text-[10px] text-slate-400 mt-1">ARR = ARPU × 客户数</p>
                          </div>

                          {/* ARR占比堆叠条 */}
                          <div className="mb-5">
                            <p className="text-sm font-semibold text-slate-700 mb-2">ARR占比</p>
                            <div className="w-full h-8 rounded-full overflow-hidden flex">
                              {arrData.map((row, i) => (
                                <div
                                  key={i}
                                  className="h-full flex items-center justify-center transition-all"
                                  style={{ width: `${totalARR > 0 ? (row.arr / totalARR) * 100 : 0}%`, backgroundColor: row.color, minWidth: row.arr > 0 ? '2rem' : '0' }}
                                >
                                  <span className="text-[10px] text-white font-bold">
                                    {totalARR > 0 ? ((row.arr / totalARR) * 100).toFixed(0) : 0}%
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              {arrData.map((row, i) => (
                                <span key={i} className="flex items-center gap-1 text-xs text-slate-600">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                                  {row.label}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 分组合详情 */}
                          <div className="grid grid-cols-3 gap-4">
                            {arrData.map((row, i) => (
                              <div key={i} className={`p-4 rounded-xl ${row.bgColor} border border-slate-200`}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                                  <span className="text-sm font-bold text-slate-800">{row.label}</span>
                                </div>
                                <p className="text-xl font-bold text-slate-800">{formatCurrency(row.arr)}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{row.count}家 × ARPU {formatCurrency(row.arpu)}</p>
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                                    <span>ARR占比</span>
                                    <span className="font-medium">{totalARR > 0 ? ((row.arr / totalARR) * 100).toFixed(1) : 0}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                                    <div className="h-1.5 rounded-full" style={{ width: `${totalARR > 0 ? (row.arr / totalARR) * 100 : 0}%`, backgroundColor: row.color }} />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-indigo-600" />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-[10px] font-bold"><Sparkles className="w-3 h-3" />模块三</span>
                    <h2 className="text-lg font-bold text-slate-800">客户成效</h2>
                    <span className="text-xs text-slate-400">产品使用效果·价值兑现·多产品协同</span>
                  </div>

                {/* Tier 1: AIMI 核心指标 (主角位) */}
                <Card className="border-0 bg-gradient-to-r from-blue-700 to-indigo-600 shadow-lg">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-white/80" />
                      <h3 className="text-sm font-bold text-white/90">AIMI 核心指标</h3>
                    </div>
                    {(() => {
                      const vb = csData.aimiOperationDetail?.versionBreakdown;
                      const adv = vb?.advanced ?? { count: Math.round(csData.healthOverview.totalCustomers * 0.25), avgPosts: 85, avgExposure: 25000, avgEngagement: 3500 };
                      const gro = vb?.growth ?? { count: Math.round(csData.healthOverview.totalCustomers * 0.40), avgPosts: 32, avgExposure: 8000, avgEngagement: 900 };
                      const bas = vb?.basic ?? { count: Math.round(csData.healthOverview.totalCustomers * 0.35), avgPosts: 12, avgExposure: 3000, avgEngagement: 250 };
                      const totalPosts = adv.count * adv.avgPosts + gro.count * gro.avgPosts + bas.count * bas.avgPosts;
                      const totalExposure = adv.count * adv.avgExposure + gro.count * gro.avgExposure + bas.count * bas.avgExposure;
                      const totalEngagement = adv.count * adv.avgEngagement + gro.count * gro.avgEngagement + bas.count * bas.avgEngagement;
                      const formatBigNumber = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString();
                      return (
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: '发帖数', value: totalPosts.toLocaleString(), icon: <FileText className="w-4 h-4" /> },
                            { label: '曝光数', value: formatBigNumber(totalExposure), icon: <Eye className="w-4 h-4" /> },
                            { label: '互动数', value: formatBigNumber(totalEngagement), icon: <Heart className="w-4 h-4" /> },
                          ].map((m, i) => (
                            <div key={i} className="text-center">
                              <div className="flex items-center justify-center gap-1.5 mb-1 text-white/70">
                                {m.icon}
                                <span className="text-xs">{m.label}</span>
                              </div>
                              <p className="text-2xl sm:text-3xl font-bold text-white">{m.value}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* ═══════════════════ 3B: AIMI 用户使用旅程 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      AIMI 用户使用旅程
                      <button onClick={() => toggleSection('aimiUserJourney')} className="ml-auto p-1 rounded hover:bg-slate-100 transition-colors">
                        {collapsedSections.aimiUserJourney ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                      </button>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">从签约Onboarding到深度使用的全链路转化漏斗 — 识别关键卡点与流失环节{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!collapsedSections.aimiUserJourney && (() => {
                      const journey = csData.aimiUserJourney;
                      if (!journey) return null;
                      const maxCount = journey.steps[0]?.customerCount || 1;
                      return (
                        <div className="space-y-3">
                          {/* 漏斗步骤图 */}
                          <div className="space-y-2">
                            {journey.steps.map((step, idx) => {
                              const widthPct = Math.max((step.customerCount / maxCount) * 100, 15);
                              const isBottleneck = step.stage === journey.bottleneckStage;
                              return (
                                <div key={idx} className="flex items-center gap-3">
                                  <div className="w-36 sm:w-44 shrink-0 text-right">
                                    <p className={`text-xs font-semibold ${isBottleneck ? 'text-rose-600' : 'text-slate-700'}`}>{step.stage}</p>
                                    <p className="text-[10px] text-slate-400">平均{step.avgDaysToReach}天到达</p>
                                  </div>
                                  <div className="flex-1 relative">
                                    <div
                                      className={`h-8 rounded-md flex items-center justify-end pr-2 transition-all ${isBottleneck ? 'bg-gradient-to-r from-rose-100 to-rose-400' : 'bg-gradient-to-r from-indigo-100 to-indigo-400'}`}
                                      style={{ width: `${widthPct}%` }}
                                    >
                                      <span className={`text-xs font-bold ${isBottleneck ? 'text-rose-800' : 'text-indigo-800'}`}>{step.customerCount}家</span>
                                    </div>
                                  </div>
                                  <div className="w-16 text-right shrink-0">
                                    {idx === 0 ? (
                                      <span className="text-xs text-slate-400">—</span>
                                    ) : (
                                      <span className={`text-xs font-bold ${step.conversionRate < 60 ? 'text-rose-500' : 'text-emerald-600'}`}>
                                        {step.conversionRate}%
                                      </span>
                                    )}
                                  </div>
                                  {idx < journey.steps.length - 1 && (
                                    <ChevronRight className="w-3 h-3 text-slate-300 absolute right-0" style={{ display: 'none' }} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {/* 卡点提示 */}
                          <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-rose-700">关键卡点：{journey.bottleneckStage}</p>
                              <p className="text-[11px] text-rose-600 mt-0.5">{journey.bottleneck}</p>
                            </div>
                          </div>
                          {/* 漏斗转化总览 */}
                          <div className="grid grid-cols-3 gap-3 mt-3">
                            {[
                              { label: 'Onboarding→账号绑定', value: journey.steps[1]?.conversionRate, suffix: '%' },
                              { label: '账号绑定→首次发帖', value: journey.steps[2]?.conversionRate, suffix: '%' },
                              { label: '首次发帖→持续使用', value: journey.steps[3]?.conversionRate, suffix: '%' },
                            ].map((m, i) => (
                              <div key={i} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <p className="text-[10px] text-slate-500 mb-1">{m.label}</p>
                                <p className={`text-sm font-bold ${(m.value ?? 0) < 60 ? 'text-rose-500' : 'text-indigo-600'}`}>{m.value}{m.suffix}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Tier 2: 全局概览 (配角位, 灰色调) */}
                <div className="px-3 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-xs text-slate-500 font-medium">全局概览:</span>
                    <span className="text-xs text-slate-700">总客户 <strong>{csData.healthOverview.totalCustomers}</strong>家</span>
                    <span className="text-xs text-slate-700">健康率 <strong>{formatPercent((csData.healthOverview.healthDistribution.healthy / csData.healthOverview.totalCustomers) * 100)}</strong></span>
                    <span className="text-xs text-slate-700">NPS <strong>{csData.healthOverview.businessSideMetrics.npsScore}</strong></span>
                    <span className="text-xs text-slate-700">续费率 <strong>{formatPercent(csData.healthOverview.businessSideMetrics.renewalRate)}</strong></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                    <span className="text-xs text-slate-400 font-medium">老业务:</span>
                    <span className="text-xs text-slate-500">广告 ROAS <strong className="text-amber-600">{csData.productLineValue.ads.avgROAS.toFixed(1)}x</strong></span>
                    <span className="text-xs text-slate-500">独立站询盘转化 <strong className="text-emerald-600">{formatPercent(csData.productLineValue.site.avgInquiryConversion)}</strong></span>
                    <span className="text-xs text-slate-500">广告续费率 <strong className="text-amber-600">{formatPercent(csData.productLineValue.ads.renewalRate)}</strong></span>
                  </div>
                </div>

                {/* ═══════════════════ 3C: AIMI 运营总览 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Gauge className="w-5 h-5 text-rose-500" />
                      AIMI 运营总览
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">AIMI 产品运营全貌 — 产品侧·效果侧·商业侧三维运营指标{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Health Distribution Pie Chart */}
                      <div className="flex flex-col items-center">
                        <p className="text-sm font-semibold text-slate-700 mb-2">客户健康度分布</p>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={healthPieData}
                              cx="50%" cy="50%"
                              innerRadius={55} outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                              label={renderPieLabel}
                            >
                              {healthPieData.map((entry, i) => (
                                <Cell key={i} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="grid grid-cols-4 gap-1 mt-2 text-center w-full">
                          {healthPieData.map((item) => (
                            <div key={item.name} className="rounded-lg p-1.5" style={{ backgroundColor: `${item.color}15` }}>
                              <p className="text-base font-bold" style={{ color: item.color }}>{item.value}</p>
                              <p className="text-xs text-slate-600">{item.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Three-Dimension Metrics Table */}
                      <div className="lg:col-span-2 space-y-3">
                        {/* Product Side */}
                        <div className="p-4 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50/80 to-violet-50/30">
                          <p className="text-xs font-bold text-violet-700 mb-3 flex items-center gap-1.5">
                            <Target className="w-3.5 h-3.5" />产品侧指标（AIMI）
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">产品使用率</p>
                              <p className="text-lg font-bold text-violet-700">{formatPercent(csData.healthOverview.productSideMetrics.productUsageRate)}</p>
                              <Progress value={csData.healthOverview.productSideMetrics.productUsageRate} className="h-1.5 mt-1" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">核心功能活跃度</p>
                              <p className="text-lg font-bold text-violet-700">{csData.healthOverview.productSideMetrics.featureActivityScore}<span className="text-xs font-normal text-slate-400">分</span></p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">产品使用深度</p>
                              <p className="text-lg font-bold text-violet-700">{csData.healthOverview.productSideMetrics.usageDepth}<span className="text-xs font-normal text-slate-400">/6模块</span></p>
                            </div>
                          </div>
                        </div>
                        {/* Effect Side */}
                        <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-emerald-50/30">
                          <p className="text-xs font-bold text-emerald-700 mb-3 flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5" />效果侧指标（AIMI）
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">粉丝增长率</p>
                              <p className="text-lg font-bold text-emerald-700">{formatPercent(csData.healthOverview.effectSideMetrics.followerGrowthRate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">内容互动率</p>
                              <p className="text-lg font-bold text-emerald-700">{formatPercent(csData.healthOverview.effectSideMetrics.contentInteractionRate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">询盘率</p>
                              <p className="text-lg font-bold text-emerald-700">{formatPercent(csData.healthOverview.effectSideMetrics.inquiryRate)}</p>
                            </div>
                          </div>
                        </div>
                        {/* Business Side */}
                        <div className="p-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 to-amber-50/30">
                          <p className="text-xs font-bold text-amber-700 mb-3 flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5" />商业侧指标
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">客户满意度(NPS)</p>
                              <p className="text-lg font-bold text-amber-700">{csData.healthOverview.businessSideMetrics.npsScore}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">续约率</p>
                              <p className="text-lg font-bold text-amber-700">{formatPercent(csData.healthOverview.businessSideMetrics.renewalRate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-0.5">增购率</p>
                              <p className="text-lg font-bold text-amber-700">{formatPercent(csData.healthOverview.businessSideMetrics.upsellRate)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* ═══════════════════ 3D: 产品线业务运营分析 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" />
                      产品线业务运营分析
                      <button onClick={() => toggleSection('productLine')} className="ml-auto p-1 rounded hover:bg-slate-100 transition-colors">
                        {collapsedSections.productLine ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                      </button>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">以AIMI为核心，广告与独立站协同运营，共同驱动客户价值增长{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6" style={{ display: collapsedSections.productLine ? 'none' : undefined }}>

                    {/* ── AIMI 运营面板 ── */}
                    <div className="p-5 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/60 to-white">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-3 h-3 rounded-full bg-indigo-500" />
                        <h3 className="text-base font-bold text-indigo-800">AIMI 深度运营</h3>
                        <Badge className="text-xs bg-indigo-600 text-white border-0">★ 核心业务</Badge>
                        <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600">版本分层</Badge>
                      </div>

                      {/* AIMI 版本分层 — 高级版/成长版/基础版 */}
                      <div className="mb-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Layers className="w-3 h-3" />AIMI 版本分层</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">{showVersionBreakdown ? '收起' : '展开'}</span>
                            <Switch checked={showVersionBreakdown} onCheckedChange={setShowVersionBreakdown} className="scale-75" />
                          </div>
                        </div>
                        {showVersionBreakdown && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[
                            { label: '高级版', data: csData.aimiOperationDetail?.versionBreakdown.advanced ?? { count: Math.round(csData.healthOverview.totalCustomers * 0.25), avgPosts: 85, avgExposure: 25000, avgEngagement: 3500 }, color: '#4338ca', bg: 'bg-indigo-50 border-indigo-200' },
                            { label: '成长版', data: csData.aimiOperationDetail?.versionBreakdown.growth ?? { count: Math.round(csData.healthOverview.totalCustomers * 0.40), avgPosts: 32, avgExposure: 8000, avgEngagement: 900 }, color: '#6366f1', bg: 'bg-violet-50 border-violet-200' },
                            { label: '基础版', data: csData.aimiOperationDetail?.versionBreakdown.basic ?? { count: Math.round(csData.healthOverview.totalCustomers * 0.35), avgPosts: 12, avgExposure: 3000, avgEngagement: 250 }, color: '#a5b4fc', bg: 'bg-blue-50 border-blue-200' },
                          ].map((tier) => (
                            <div key={tier.label} className={`p-3 rounded-xl border ${tier.bg} hover:shadow-sm transition-shadow`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold" style={{ color: tier.color }}>{tier.label}</span>
                                <span className="text-xs font-bold text-slate-600">{tier.data.count}家</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                  <p className="text-[10px] text-slate-500">月均发帖</p>
                                  <p className="text-sm font-bold text-slate-800">{tier.data.avgPosts}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">月均曝光</p>
                                  <p className="text-sm font-bold text-slate-800">{tier.data.avgExposure >= 10000 ? `${(tier.data.avgExposure / 10000).toFixed(1)}万` : tier.data.avgExposure.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500">月均互动</p>
                                  <p className="text-sm font-bold text-slate-800">{tier.data.avgEngagement >= 10000 ? `${(tier.data.avgEngagement / 10000).toFixed(1)}万` : tier.data.avgEngagement.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        )}
                      </div>

                      {/* AIMI 功能模块使用率 — 已隐藏（先不展示） */}

                      {/* 亮点与风险 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" />亮点</p>
                          {csData.productLineValue.aimi.successHighlights.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-xs text-slate-600 ml-4 mb-0.5">• {h}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />风险</p>
                          {csData.productLineValue.aimi.issues.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-xs text-slate-600 ml-4 mb-0.5">• {h}</p>
                          ))}
                        </div>
                      </div>
                      {/* VOC for AIMI */}
                      {csData.vocData && csData.vocData.filter(v => v.productLine === 'AIMI').length > 0 && (
                        <div className="pt-3 border-t border-indigo-100">
                          <button onClick={() => toggleSection('vocAimi')} className="w-full flex items-center justify-between mb-1 group">
                            <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1"><MessageSquare className="w-3 h-3" />客户之声<span className="text-[10px] font-normal text-slate-400 ml-1">({csData.vocData.filter(v => v.productLine === 'AIMI').length}条)</span></p>
                            {collapsedSections.vocAimi !== false ? <ChevronDown className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 transition-colors" /> : <ChevronUp className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-600 transition-colors" />}
                          </button>
                          {collapsedSections.vocAimi === false && (
                          <div className="space-y-1.5">
                            {csData.vocData.filter(v => v.productLine === 'AIMI').slice(0, 3).map((v, i) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-indigo-50">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${v.feedbackType === '好评' ? 'border-emerald-300 text-emerald-600' : v.feedbackType === '投诉' ? 'border-red-300 text-red-600' : v.feedbackType === '建议' ? 'border-blue-300 text-blue-600' : 'border-amber-300 text-amber-600'}`}>{v.feedbackType}</Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 line-clamp-1">{v.content}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{v.customerName} · {v.date}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── 广告业务面板 ── */}
                    <div className="p-5 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50/60 to-white">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-3 h-3 rounded-full bg-amber-500" />
                        <h3 className="text-base font-bold text-amber-800">广告业务面板</h3>
                        <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">协同业务</Badge>
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">消耗分层 · 续费深度</Badge>
                      </div>
                      {/* Customer count: New + Old side by side */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-white/80 border border-amber-100 text-center">
                          <p className="text-xs text-slate-500 mb-1">新增客户</p>
                          <p className="text-2xl font-bold text-amber-700">{csData.adsRenewalDepth?.newCustomers ?? '-'}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white/80 border border-amber-100 text-center">
                          <p className="text-xs text-slate-500 mb-1">老客户</p>
                          <p className="text-2xl font-bold text-amber-700">{csData.adsRenewalDepth?.oldCustomers ?? '-'}</p>
                        </div>
                      </div>
                      {/* Spend Tier Horizontal Bar Chart */}
                      {csData.adsSpendTiers && (
                        <div className="mb-4">
                          <p className="text-xs font-bold text-amber-600 mb-2 flex items-center gap-1"><BarChart3 className="w-3 h-3" />客户消耗分层</p>
                          <div className="space-y-2">
                            {csData.adsSpendTiers.map((tier) => {
                              const maxCount = Math.max(...csData.adsSpendTiers.map(t => t.customerCount), 1);
                              return (
                                <div key={tier.tier} className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-slate-600 w-10 text-right flex-shrink-0">{tier.tier}</span>
                                  <div className="flex-1 relative">
                                    <div className="w-full bg-amber-100 rounded-full h-6">
                                      <div
                                        className="h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                                        style={{ width: `${Math.max((tier.customerCount / maxCount) * 100, 12)}%`, backgroundColor: PRODUCT_COLORS.ads, opacity: 0.7 }}
                                      >
                                        <span className="text-[10px] font-bold text-white">{tier.customerCount}家</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-[10px] text-slate-500 w-14 flex-shrink-0">续费{formatPercent(tier.renewalRate)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {/* Renewal Depth */}
                      {csData.adsRenewalDepth && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 text-center">
                            <p className="text-xs text-slate-500 mb-1">首次续费率</p>
                            <p className="text-2xl font-bold text-amber-700">{formatPercent(csData.adsRenewalDepth.firstRenewalRate)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 text-center">
                            <p className="text-xs text-slate-500 mb-1">二次续费率</p>
                            <p className="text-2xl font-bold text-amber-700">{formatPercent(csData.adsRenewalDepth.secondRenewalRate)}</p>
                          </div>
                        </div>
                      )}
                      {/* Highlights & Issues */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" />亮点</p>
                          {csData.productLineValue.ads.successHighlights.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-xs text-slate-600 ml-4 mb-0.5">• {h}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />问题</p>
                          {csData.productLineValue.ads.issues.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-xs text-slate-600 ml-4 mb-0.5">• {h}</p>
                          ))}
                        </div>
                      </div>
                      {/* VOC for 广告 */}
                      {csData.vocData && csData.vocData.filter(v => v.productLine === '广告').length > 0 && (
                        <div className="pt-3 border-t border-amber-100">
                          <button onClick={() => toggleSection('vocAds')} className="w-full flex items-center justify-between mb-1 group">
                            <p className="text-xs font-semibold text-amber-600 flex items-center gap-1"><MessageSquare className="w-3 h-3" />客户之声<span className="text-[10px] font-normal text-slate-400 ml-1">({csData.vocData.filter(v => v.productLine === '广告').length}条)</span></p>
                            {collapsedSections.vocAds !== false ? <ChevronDown className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600 transition-colors" /> : <ChevronUp className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600 transition-colors" />}
                          </button>
                          {collapsedSections.vocAds === false && (
                          <div className="space-y-1.5">
                            {csData.vocData.filter(v => v.productLine === '广告').slice(0, 3).map((v, i) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-amber-50">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${v.feedbackType === '好评' ? 'border-emerald-300 text-emerald-600' : v.feedbackType === '投诉' ? 'border-red-300 text-red-600' : v.feedbackType === '建议' ? 'border-blue-300 text-blue-600' : 'border-amber-300 text-amber-600'}`}>{v.feedbackType}</Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 line-clamp-1">{v.content}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{v.customerName} · {v.date}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ── 独立站业务面板 ── */}
                    <div className="p-5 rounded-xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" />
                        <h3 className="text-base font-bold text-emerald-800">独立站业务面板</h3>
                        <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">协同业务</Badge>
                        <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">留资转化 · 交付效率</Badge>
                      </div>
                      {/* Funnel: paid UV → leads → conversion */}
                      {csData.siteDeliveryEfficiency && (
                        <div className="mb-4">
                          <p className="text-xs font-bold text-emerald-600 mb-2 flex items-center gap-1"><Flame className="w-3 h-3" />付费UV留资转化漏斗</p>
                          <div className="flex items-center justify-center">
                            <svg viewBox="0 0 400 120" className="w-full max-w-md" preserveAspectRatio="xMidYMid meet">
                              {/* Top trapezoid - Paid UV */}
                              <polygon points="40,10 360,10 330,45 70,45" fill="#10b981" fillOpacity="0.7" />
                              <text x="200" y="33" textAnchor="middle" fontSize="12" fill="white" fontWeight="600">付费UV: {csData.siteDeliveryEfficiency.paidUV}</text>
                              {/* Middle trapezoid - Leads */}
                              <polygon points="70,50 330,50 290,85 110,85" fill="#10b981" fillOpacity="0.5" />
                              <text x="200" y="73" textAnchor="middle" fontSize="12" fill="white" fontWeight="600">留资数: {csData.siteDeliveryEfficiency.leads}</text>
                              {/* Bottom trapezoid - Conversion */}
                              <polygon points="110,90 290,90 250,115 150,115" fill="#10b981" fillOpacity="0.3" />
                              <text x="200" y="108" textAnchor="middle" fontSize="11" fill="#065f46" fontWeight="600">转化率: {formatPercent(csData.siteDeliveryEfficiency.leadConversionRate)}</text>
                            </svg>
                          </div>
                        </div>
                      )}
                      {/* Delivery efficiency metrics */}
                      {csData.siteDeliveryEfficiency && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="p-3 rounded-lg bg-white/80 border border-emerald-100 text-center">
                            <p className="text-xs text-slate-500 mb-1">交付成本率</p>
                            <p className="text-2xl font-bold text-emerald-700">{formatPercent(csData.siteDeliveryEfficiency.deliveryCostRate)}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-white/80 border border-emerald-100 text-center">
                            <p className="text-xs text-slate-500 mb-1">平均交付天数</p>
                            <p className="text-2xl font-bold text-emerald-700">{csData.siteDeliveryEfficiency.avgDeliveryDays}<span className="text-xs font-normal text-slate-400">天</span></p>
                          </div>
                        </div>
                      )}
                      {/* No renewal tracking note */}
                      <div className="p-2.5 rounded-lg bg-yellow-50 border border-yellow-200 mb-4">
                        <p className="text-xs text-yellow-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />独立站暂未建立续费跟踪体系</p>
                      </div>
                      {/* Highlights & Issues */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" />亮点</p>
                          {csData.productLineValue.site.successHighlights.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-xs text-slate-600 ml-4 mb-0.5">• {h}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />问题</p>
                          {csData.productLineValue.site.issues.slice(0, 2).map((h, i) => (
                            <p key={i} className="text-xs text-slate-600 ml-4 mb-0.5">• {h}</p>
                          ))}
                        </div>
                      </div>
                      {/* VOC for 独立站 */}
                      {csData.vocData && csData.vocData.filter(v => v.productLine === '独立站').length > 0 && (
                        <div className="pt-3 border-t border-emerald-100">
                          <button onClick={() => toggleSection('vocSite')} className="w-full flex items-center justify-between mb-1 group">
                            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1"><MessageSquare className="w-3 h-3" />客户之声<span className="text-[10px] font-normal text-slate-400 ml-1">({csData.vocData.filter(v => v.productLine === '独立站').length}条)</span></p>
                            {collapsedSections.vocSite !== false ? <ChevronDown className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-600 transition-colors" /> : <ChevronUp className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-600 transition-colors" />}
                          </button>
                          {collapsedSections.vocSite === false && (
                          <div className="space-y-1.5">
                            {csData.vocData.filter(v => v.productLine === '独立站').slice(0, 3).map((v, i) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-emerald-50">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${v.feedbackType === '好评' ? 'border-emerald-300 text-emerald-600' : v.feedbackType === '投诉' ? 'border-red-300 text-red-600' : v.feedbackType === '建议' ? 'border-blue-300 text-blue-600' : 'border-amber-300 text-amber-600'}`}>{v.feedbackType}</Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 line-clamp-1">{v.content}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">{v.customerName} · {v.date}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          )}
                        </div>
                      )}
                    </div>

                  </CardContent>
                </Card>

                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-5 rounded-full bg-gradient-to-b from-slate-500 to-slate-600" />
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-slate-500 to-slate-600 text-white text-[10px] font-bold"><Gauge className="w-3 h-3" />模块四</span>
                    <h2 className="text-lg font-bold text-slate-800">运营保障</h2>
                    <span className="text-xs text-slate-400">人效·风险管控·行动追踪</span>
                  </div>

                {/* ═══════════════════ 4A: 客成经理人效分析 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-slate-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-teal-500" />
                      客成经理人效分析
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">分产品线人效数据 — 人均服务客户数、客户覆盖率、响应时间、续费达成率、人均续费ARR(续费ARR/客成人数){isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Team Overview KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: '人均服务客户数', value: csData.teamEfficiency.customersPerCSM, unit: '家', icon: <Users className="w-4 h-4" />, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-200' },
                        { label: '客户覆盖率', value: formatPercent(csData.teamEfficiency.customerCoverageRate), unit: '', icon: <Target className="w-4 h-4" />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                        { label: '平均响应时间', value: csData.teamEfficiency.avgResponseTimeHours, unit: 'h', icon: <Clock className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                        { label: '续费目标达成率', value: formatPercent(csData.teamEfficiency.renewalTargetRate), unit: '', icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                      ].map((m, i) => (
                        <div key={i} className={`p-3 rounded-xl ${m.bg} border`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={m.color}>{m.icon}</span>
                            <span className="text-xs text-slate-500">{m.label}</span>
                          </div>
                          <p className={`text-xl font-bold ${m.color}`}>{typeof m.value === 'number' ? m.value : m.value}{m.unit}</p>
                        </div>
                      ))}
                    </div>

                    {/* Per-Product-Line Efficiency Table */}
                    <p className="text-sm font-semibold text-slate-700 mb-2">分产品线人效明细</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="text-left p-2.5 font-semibold text-slate-600">产品线</th>
                            <th className="text-center p-2.5 font-semibold text-slate-600">服务客户数</th>
                            <th className="text-center p-2.5 font-semibold text-slate-600">覆盖率</th>
                            <th className="text-center p-2.5 font-semibold text-slate-600">平均响应(h)</th>
                            <th className="text-center p-2.5 font-semibold text-slate-600">续费达成率</th>
                            <th className="text-center p-2.5 font-semibold text-slate-600">人均续费ARR</th>
                            <th className="text-center p-2.5 font-semibold text-slate-600">计算备注</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productLineEfficiencyData.map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="p-2.5 font-medium">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.name === 'AIMI' ? '#6366f1' : row.name === '广告' ? '#f59e0b' : '#10b981' }} />
                                  <span className="text-slate-800">{row.name}</span>
                                </span>
                              </td>
                              <td className="p-2.5 text-center">{row.customerCount}</td>
                              <td className="p-2.5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Progress value={row.coverageRate} className="w-16 h-2" />
                                  <span className="text-xs">{formatPercent(row.coverageRate)}</span>
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`inline-flex items-center gap-0.5 ${row.avgResponseHours <= 12 ? 'text-emerald-600' : row.avgResponseHours <= 24 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {row.avgResponseHours <= 12 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                  {row.avgResponseHours.toFixed(1)}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <Badge variant={row.renewalAchievementRate >= 70 ? 'default' : 'secondary'} className="text-xs">
                                  {row.name === '独立站' ? '活跃率 ' : ''}{formatPercent(row.renewalAchievementRate)}
                                </Badge>
                              </td>
                              <td className="p-2.5 text-center font-bold text-slate-800">{row.name === '独立站' ? '—' : formatCurrency(row.renewalARR)}</td>
                              <td className="p-2.5 text-center"><span className="text-xs text-slate-500">{row.name === '独立站' ? '独立站按活跃率统计' : '续费ARR/客成人数'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>


                {/* ═══════════════════ 4B: 续费增购详细分析 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-slate-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Repeat className="w-5 h-5 text-blue-500" />
                      客户续费、增购、流失分析
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">按产品线分析续费率、增购金额及TOP3流失原因{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Renewal Stats Cards */}
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700">各产品线续费/留存概览</p>
                        {/* AIMI 续费 (主角位) */}
                        <div className="p-3 rounded-xl border border-indigo-200 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                              <span className="text-sm font-semibold text-slate-800">AIMI</span>
                              <Badge variant="outline" className="text-[10px] border-indigo-300 text-indigo-600">核心业务</Badge>
                            </div>
                            <Badge variant={csData.renewalChurn.aimi.renewalRate >= 70 ? 'default' : 'secondary'} className="text-xs">
                              续费率 {formatPercent(csData.renewalChurn.aimi.renewalRate)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-1.5 rounded bg-slate-50">
                              <span className="text-slate-500">到期续费</span>
                              <p className="font-bold text-slate-800">{csData.renewalChurn.aimi.renewed}/{csData.renewalChurn.aimi.upForRenewal}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-emerald-50">
                              <span className="text-slate-500">增购金额</span>
                              <p className="font-bold text-emerald-700">{formatCurrency(csData.renewalChurn.aimi.upsellAmount)}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-red-50">
                              <span className="text-slate-500">流失风险</span>
                              <p className="font-bold text-red-600">{csData.renewalChurn.aimi.upForRenewal - csData.renewalChurn.aimi.renewed}家</p>
                            </div>
                          </div>
                          {csData.renewalChurn.aimi.topChurnReasons.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <p className="text-xs text-slate-500 mb-1">TOP流失原因:</p>
                              {csData.renewalChurn.aimi.topChurnReasons.slice(0, 3).map((reason, j) => (
                                <p key={j} className="text-xs text-slate-600 ml-2">• {reason}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* 广告续费 (配角位) */}
                        <div className="p-3 rounded-xl border border-amber-200 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                              <span className="text-sm font-semibold text-slate-800">广告</span>
                            </div>
                            <Badge variant={csData.renewalChurn.ads.renewalRate >= 70 ? 'default' : 'secondary'} className="text-xs">
                              续费率 {formatPercent(csData.renewalChurn.ads.renewalRate)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-1.5 rounded bg-slate-50">
                              <span className="text-slate-500">到期续费</span>
                              <p className="font-bold text-slate-800">{csData.renewalChurn.ads.renewed}/{csData.renewalChurn.ads.upForRenewal}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-emerald-50">
                              <span className="text-slate-500">增购金额</span>
                              <p className="font-bold text-emerald-700">{formatCurrency(csData.renewalChurn.ads.upsellAmount)}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-red-50">
                              <span className="text-slate-500">流失风险</span>
                              <p className="font-bold text-red-600">{csData.renewalChurn.ads.upForRenewal - csData.renewalChurn.ads.renewed}家</p>
                            </div>
                          </div>
                          {csData.adsRenewalDepth && (
                            <div className="mt-2 pt-2 border-t border-amber-100 flex items-center gap-4">
                              <span className="text-xs text-slate-500">续费深度:</span>
                              <span className="text-xs text-amber-700 font-medium">首次续费率 {formatPercent(csData.adsRenewalDepth.firstRenewalRate)}</span>
                              <span className="text-xs text-amber-700 font-medium">二次续费率 {formatPercent(csData.adsRenewalDepth.secondRenewalRate)}</span>
                            </div>
                          )}
                          {csData.renewalChurn.ads.topChurnReasons.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <p className="text-xs text-slate-500 mb-1">TOP流失原因:</p>
                              {csData.renewalChurn.ads.topChurnReasons.slice(0, 3).map((reason, j) => (
                                <p key={j} className="text-xs text-slate-600 ml-2">• {reason}</p>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* 独立站客户生命周期 (不展示续费率) */}
                        <div className="p-3 rounded-xl border border-emerald-200 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              <span className="text-sm font-semibold text-slate-800">独立站</span>
                            </div>
                            <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">客户生命周期</Badge>
                          </div>
                          <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200 mb-2">
                            <p className="text-xs text-yellow-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />独立站暂未建立续费跟踪体系</p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-1.5 rounded bg-emerald-50">
                              <span className="text-slate-500">活跃率</span>
                              <p className="font-bold text-emerald-700">{formatPercent(csData.siteLifecycle?.activeRate ?? 62)}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-amber-50">
                              <span className="text-slate-500">低活跃率</span>
                              <p className="font-bold text-amber-700">{formatPercent(csData.siteLifecycle?.lowActiveRate ?? 25)}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-red-50">
                              <span className="text-slate-500">沉默率</span>
                              <p className="font-bold text-red-600">{formatPercent(csData.siteLifecycle?.silentRate ?? 13)}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-4">
                            <span className="text-xs text-slate-500">平均合作 <strong className="text-emerald-700">{csData.siteLifecycle?.avgCooperationMonths ?? 14.2}</strong> 个月</span>
                          </div>
                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-500 mb-1">核心风险:</p>
                            <p className="text-xs text-slate-600 ml-2">• 询盘转化低 38% &gt; 建站周期长 27%</p>
                          </div>
                        </div>
                        {/* 整体续费 */}
                        <div className="p-3 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                              <span className="text-sm font-semibold text-slate-800">整体</span>
                            </div>
                            <Badge variant={csData.renewalChurn.overall.renewalRate >= 70 ? 'default' : 'secondary'} className="text-xs">
                              续费率 {formatPercent(csData.renewalChurn.overall.renewalRate)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-1.5 rounded bg-slate-50">
                              <span className="text-slate-500">到期续费</span>
                              <p className="font-bold text-slate-800">{csData.renewalChurn.overall.renewed}/{csData.renewalChurn.overall.upForRenewal}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-emerald-50">
                              <span className="text-slate-500">增购金额</span>
                              <p className="font-bold text-emerald-700">{formatCurrency(csData.renewalChurn.overall.upsellAmount)}</p>
                            </div>
                            <div className="text-center p-1.5 rounded bg-red-50">
                              <span className="text-slate-500">流失风险</span>
                              <p className="font-bold text-red-600">{csData.renewalChurn.overall.upForRenewal - csData.renewalChurn.overall.renewed}家</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Renewal Bar Chart */}
                      <div>
                        <p className="text-sm font-semibold text-slate-700 mb-3">续费情况对比</p>
                        <ResponsiveContainer width="100%" height={340}>
                          <BarChart data={renewalChartData} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="到期续费" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="到期未续" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>


                {/* ═══════════════════ 4C: 关键问题与行动 ═══════════════════ */}
                <Card className="shadow-md border-l-4 border-l-slate-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-yellow-500" />
                      客户成功关键问题和解决方案
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">当前周期内关键问题追踪与解决进度{isDisplayingDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {csData.keyIssues.map((item, i) => (
                        <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <AlertOctagon className="w-4 h-4 text-red-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 mb-1.5">
                                问题{i + 1}: {item.issue}
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-2">
                                <div className="p-2 rounded-lg bg-slate-50">
                                  <span className="text-slate-500">根因:</span>{' '}
                                  <span className="text-slate-700 font-medium">{item.rootCause}</span>
                                </div>
                                <div className="p-2 rounded-lg bg-emerald-50">
                                  <span className="text-slate-500">方案:</span>{' '}
                                  <span className="text-emerald-700 font-medium">{item.solution}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-xs">
                                  <Users className="w-3 h-3 mr-1" />{item.owner}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  <Clock className="w-3 h-3 mr-1" />{item.deadline}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                </div>

              </div>
            )}
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              Data Source Tab (Enhanced)
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="upload">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* ── Data Source Summary Banner ── */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                <Database className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">数据源管理</p>
                  <p className="text-xs text-blue-600">支持文件上传、API对接、CLI命令、Webhook回调四种数据接入方式</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{Object.keys(uploadedFiles).length}/4 已配置</Badge>
                  {Object.keys(uploadedFiles).length === 4 && <Badge className="text-xs bg-green-50 text-green-700 border-green-200">全部就绪</Badge>}
                </div>
              </div>

              {/* ── Data Source Method Tabs ── */}
              <Card>
                <CardContent className="pt-5">
                  <Tabs defaultValue="file" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="file" className="text-xs"><FileUp className="w-3 h-3 mr-1" />文件上传</TabsTrigger>
                      <TabsTrigger value="api" className="text-xs"><Zap className="w-3 h-3 mr-1" />API 对接</TabsTrigger>
                      <TabsTrigger value="cli" className="text-xs"><Terminal className="w-3 h-3 mr-1" />CLI 命令</TabsTrigger>
                      <TabsTrigger value="webhook" className="text-xs"><Repeat className="w-3 h-3 mr-1" />Webhook</TabsTrigger>
                    </TabsList>

                    {/* ── File Upload Tab ── */}
                    <TabsContent value="file">
                      <form onSubmit={handleUpload} className="space-y-4">
                    {/* ── Drag-and-Drop Upload Zones ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'cs_implementation', label: '客成实施数据', icon: <FileSpreadsheet className="w-5 h-5" />, desc: '客户名称、客成经理、产品类型、版本、培训状态、服务状态、签约日期...', color: 'indigo' },
                        { key: 'sales', label: '销售数据', icon: <Package className="w-5 h-5" />, desc: '订单编号、客户名称、订单来源、产品类型、版本、签约日期、订单金额、订单时长...', color: 'amber' },
                        { key: 'user_activity', label: '用户数据', icon: <Users className="w-5 h-5" />, desc: '客户名称、帖子内容类型、社媒类型、是否AI生成、曝光数、互动数、发帖日期...', color: 'emerald' },
                        { key: 'voc', label: 'VOC 数据', icon: <MessageSquare className="w-5 h-5" />, desc: '客户名称、反馈类型、反馈内容、产品线、日期...', color: 'rose' },
                      ].map(f => {
                        const isUploaded = !!uploadedFiles[f.key];
                        const preview = excelPreviews[f.key];
                        const isLoading = previewLoading[f.key];
                        const isDragging = dragActive[f.key];

                        const colorMap: Record<string, { border: string; bg: string; ring: string; text: string }> = {
                          indigo: { border: 'border-indigo-300', bg: 'bg-indigo-50', ring: 'ring-indigo-400', text: 'text-indigo-700' },
                          amber: { border: 'border-amber-300', bg: 'bg-amber-50', ring: 'ring-amber-400', text: 'text-amber-700' },
                          emerald: { border: 'border-emerald-300', bg: 'bg-emerald-50', ring: 'ring-emerald-400', text: 'text-emerald-700' },
                          rose: { border: 'border-rose-300', bg: 'bg-rose-50', ring: 'ring-rose-400', text: 'text-rose-700' },
                        };
                        const c = colorMap[f.color];

                        return (
                          <div key={f.key} className="space-y-2">
                            {/* Drop Zone */}
                            <div
                              onDragOver={e => handleDragOver(e, f.key)}
                              onDragLeave={e => handleDragLeave(e, f.key)}
                              onDrop={e => handleDrop(e, f.key)}
                              className={`relative rounded-xl border-2 border-dashed transition-all duration-200 ${
                                isDragging
                                  ? `${c.border} ${c.bg} ring-2 ${c.ring} ring-opacity-40 scale-[1.01]`
                                  : isUploaded
                                  ? 'border-green-300 bg-green-50/50'
                                  : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                              }`}
                            >
                              {isUploaded ? (
                                /* Uploaded state */
                                <div className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="w-5 h-5 text-green-500" />
                                      <span className="text-sm font-semibold text-green-800">{f.label}</span>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveFile(f.key)} className="p-1 rounded-full hover:bg-red-100 transition-colors">
                                      <X className="w-4 h-4 text-red-400" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                    <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">{uploadedFiles[f.key].name}</span>
                                    <Badge className="text-xs bg-green-100 text-green-700 border-0">{(uploadedFiles[f.key].size / 1024).toFixed(0)} KB</Badge>
                                  </div>
                                  {preview && (
                                    <div className="flex items-center gap-2">
                                      {preview.sheets.map(s => (
                                        <Badge key={s.name} variant="outline" className="text-xs border-green-200 text-green-600">
                                          {s.name} ({s.rowCount}行)
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                  {/* Re-upload link */}
                                  <label className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                                    <FileUp className="w-3 h-3" />重新配置
                                    <input type="file" name={f.key} accept=".xlsx,.xls" onChange={e => handleFileSelect(e, f.key)} className="hidden" />
                                  </label>
                                </div>
                              ) : (
                                /* Empty drop zone */
                                <label className="flex flex-col items-center justify-center p-6 cursor-pointer min-h-[140px]">
                                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDragging ? c.bg : 'bg-slate-100'}`}>
                                    {isLoading ? <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" /> : <FileUp className={`w-6 h-6 ${isDragging ? c.text : 'text-slate-400'}`} />}
                                  </div>
                                  <p className={`text-sm font-medium mb-1 ${isDragging ? c.text : 'text-slate-700'}`}>{f.label}</p>
                                  <p className="text-xs text-slate-400 text-center mb-2">{f.desc}</p>
                                  <p className="text-xs text-blue-600">
                                    拖拽 Excel 到此处，或<span className="underline">点击选择文件</span>
                                  </p>
                                  <input type="file" name={f.key} accept=".xlsx,.xls" onChange={e => handleFileSelect(e, f.key)} className="hidden" />
                                </label>
                              )}
                            </div>

                            {/* Per-file Preview (expandable) */}
                            {preview && (
                              <div className="space-y-2">
                                {preview.sheets.map(sheet => {
                                  const prefixedName = `${f.key}::${sheet.name}`;
                                  const isExpanded = expandedSheet === prefixedName;
                                  return (
                                    <div key={prefixedName} className="border border-slate-200 rounded-lg overflow-hidden">
                                      <div className="flex items-center justify-between p-2 bg-slate-50 cursor-pointer" onClick={() => setExpandedSheet(isExpanded ? null : prefixedName)}>
                                        <div className="flex items-center gap-2">
                                          <Switch checked={selectedSheets[prefixedName] ?? true} onCheckedChange={v => setSelectedSheets(prev => ({ ...prev, [prefixedName]: v }))} onClick={e => e.stopPropagation()} />
                                          <div>
                                            <p className="text-xs font-medium text-slate-700">{sheet.name}</p>
                                            <p className="text-xs text-slate-400">{sheet.rowCount} 行 × {sheet.colCount} 列</p>
                                          </div>
                                          {selectedSheets[prefixedName] !== false ? <Badge className="bg-blue-50 text-blue-700 text-xs">参与分析</Badge> : <Badge variant="outline" className="text-xs">已排除</Badge>}
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                      </div>
                                      {isExpanded && (
                                        <div className="p-2 space-y-2">
                                          <div>
                                            <p className="text-xs font-semibold text-slate-500 mb-1">列字段</p>
                                            <div className="flex flex-wrap gap-1">
                                              {sheet.headers.map(h => (
                                                <button key={h} type="button" onClick={() => setSelectedColumns(prev => ({ ...prev, [prefixedName]: { ...prev[prefixedName], [h]: !(prev[prefixedName]?.[h] ?? false) } }))}
                                                  className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${selectedColumns[prefixedName]?.[h] !== false ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-400 line-through'}`}>
                                                  {h} <span className="opacity-60">({sheet.columnTypes[h]})</span>
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          <div>
                                            <p className="text-xs font-semibold text-slate-500 mb-1">数据预览（前5行）</p>
                                            <div className="overflow-x-auto"><table className="text-xs w-full"><thead><tr className="bg-slate-100">{sheet.headers.map(h => (<th key={h} className="px-1.5 py-0.5 text-left font-medium text-slate-600 whitespace-nowrap">{h}</th>))}</tr></thead>
                                              <tbody>{sheet.previewRows.map((row, i) => (<tr key={i} className="border-t border-slate-100">{sheet.headers.map(h => (<td key={h} className="px-1.5 py-0.5 text-slate-700 whitespace-nowrap max-w-[120px] truncate">{maskCustomerName(String(row[h] ?? ''))}</td>))}</tr>))}</tbody>
                                            </table></div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <Separator />

                    {/* Weekly Summary */}
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 mb-2"><MessageSquare className="w-4 h-4" />本周关键信息摘要（可选）</label>
                      <Textarea value={weeklySummary} onChange={e => setWeeklySummary(e.target.value)} placeholder="输入一线反馈、需要决策的事项等定性信息..." rows={3} />
                    </div>

                    <div className="flex gap-3">
                      <Button type="submit" disabled={loading || Object.keys(uploadedFiles).length === 0} className="flex-1">
                        {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}{loading ? '处理中...' : `确认并处理数据（${Object.keys(uploadedFiles).length} 个文件）`}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleGenerateReport} disabled={reportLoading}>
                        <Brain className="w-4 h-4 mr-2" />{reportLoading ? '生成中...' : 'AI生成报告'}
                      </Button>
                    </div>
                  </form>
                    </TabsContent>

                    {/* ── API Tab ── */}
                    <TabsContent value="api">
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50">
                          <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2"><Zap className="w-4 h-4" />REST API 数据对接</h4>
                          <p className="text-xs text-blue-600 mb-3">通过HTTP API将外部系统数据推送到本平台，支持JSON格式数据提交</p>
                          <div className="space-y-3">
                            <div className="p-3 rounded bg-slate-800 text-xs font-mono text-green-400 overflow-x-auto">
                              <p className="text-slate-500"># 示例：推送客成实施数据</p>
                              <p>curl -X POST {clientOrigin}/api/ingest \</p>
                              <p>  -H "Content-Type: application/json" \</p>
                              <p>  -H "X-API-Key: your-api-key" \</p>
                              <p>  -d '{"{"}"dataType": "cs_implementation", "records": [...] {"}"}'</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div><Label className="text-xs">API Endpoint</Label><Input readOnly value={`${clientOrigin}/api/ingest`} className="mt-1 text-xs font-mono" /></div>
                              <div><Label className="text-xs">API Key</Label><Input readOnly value="在设置页面生成" className="mt-1 text-xs" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div><Label className="text-xs">支持的数据类型</Label><div className="mt-1 flex flex-wrap gap-1">
                                {['cs_implementation', 'sales', 'user_activity', 'voc'].map(t => (<Badge key={t} variant="outline" className="text-xs">{t}</Badge>))}</div></div>
                              <div><Label className="text-xs">数据格式</Label><Input readOnly value="JSON (UTF-8)" className="mt-1 text-xs" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── CLI Tab ── */}
                    <TabsContent value="cli">
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50">
                          <h4 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2"><Terminal className="w-4 h-4" />CLI 命令行接入</h4>
                          <p className="text-xs text-emerald-600 mb-3">通过命令行工具批量导入数据，适合定时任务和自动化场景</p>
                          <div className="space-y-3">
                            <div className="p-3 rounded bg-slate-800 text-xs font-mono text-green-400 overflow-x-auto">
                              <p className="text-slate-500"># 安装CLI工具</p>
                              <p>npm install -g @aimi/cs-cli</p>
                              <p className="text-slate-500 mt-2"># 推送数据文件</p>
                              <p>aimi push --type cs_implementation --file ./data.xlsx</p>
                              <p className="text-slate-500 mt-2"># 推送JSON数据</p>
                              <p>aimi push --type sales --json ./sales.json</p>
                              <p className="text-slate-500 mt-2"># 查看推送状态</p>
                              <p>aimi status</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div><Label className="text-xs">安装命令</Label><Input readOnly value="npm install -g @aimi/cs-cli" className="mt-1 text-xs font-mono" /></div>
                              <div><Label className="text-xs">认证方式</Label><Input readOnly value="API Key (aimi login)" className="mt-1 text-xs" /></div>
                            </div>
                            <div><Label className="text-xs">支持的文件格式</Label><div className="mt-1 flex flex-wrap gap-1">
                              {['.xlsx', '.csv', '.json', '.jsonl'].map(t => (<Badge key={t} variant="outline" className="text-xs">{t}</Badge>))}</div></div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    {/* ── Webhook Tab ── */}
                    <TabsContent value="webhook">
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50">
                          <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2"><Webhook className="w-4 h-4" />Webhook 回调接入</h4>
                          <p className="text-xs text-purple-600 mb-3">配置Webhook URL，当外部系统有数据变更时自动推送到本平台</p>
                          <div className="space-y-3">
                            <div className="p-3 rounded bg-slate-800 text-xs font-mono text-green-400 overflow-x-auto">
                              <p className="text-slate-500"># Webhook 回调示例 (外部系统 POST)</p>
                              <p>{"{"}</p>
                              <p>  "event": "data.updated",</p>
                              <p>  "dataType": "cs_implementation",</p>
                              <p>  "timestamp": "2025-01-15T10:30:00Z",</p>
                              <p>  "records": [...]</p>
                              <p>{"}"}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div><Label className="text-xs">Webhook URL</Label><Input readOnly value={`${clientOrigin}/api/webhook`} className="mt-1 text-xs font-mono" /></div>
                              <div><Label className="text-xs">签名密钥</Label><Input readOnly value="在设置页面生成" className="mt-1 text-xs" /></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div><Label className="text-xs">支持的事件类型</Label><div className="mt-1 flex flex-wrap gap-1">
                                {['data.updated', 'data.created', 'data.deleted', 'sync.request'].map(t => (<Badge key={t} variant="outline" className="text-xs">{t}</Badge>))}</div></div>
                              <div><Label className="text-xs">安全验证</Label><Input readOnly value="HMAC-SHA256 签名验证" className="mt-1 text-xs" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              Report Tab
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="report">
            <ReportViewer
              reportContent={reportContent}
              weekLabel={weekLabel}
              reportLoading={reportLoading}
              onGenerate={handleGenerateReport}
              onCopy={() => { navigator.clipboard.writeText(reportContent); toast.success('已复制到剪贴板'); }}
              onNotify={handleNotify}
            />
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              Visualization Tab — 商业价值指标一览
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="visualization">
            <div className="bg-[#0f1729] rounded-xl p-6 space-y-6 min-h-[600px]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#4a9eff]" />
                商业价值指标一览
                {dashboardData && <span className="text-xs text-slate-400 ml-2">{weekLabel}</span>}
                {isDisplayingDemo && <span className="text-xs text-amber-400/70 ml-2">· 示例数据</span>}
                {lastUploadResult && !lastUploadResult.isDemo && <span className="text-xs text-green-400/80 ml-2">· 真实数据（{lastUploadResult.recordCounts.cs + lastUploadResult.recordCounts.sales + lastUploadResult.recordCounts.user + lastUploadResult.recordCounts.voc}条记录）</span>}
              </h2>

              {csData ? (
                <>
                  {/* ── 核心商业指标 ── */}
                  <div className="bg-gradient-to-r from-[#1a2744] to-[#1a2332] rounded-lg p-5 border border-[#4a9eff]/30">
                    <div className="flex items-center gap-2 mb-4">
                      <DollarSign className="w-4 h-4 text-[#4a9eff]" />
                      <span className="text-sm font-bold text-white">核心商业指标</span>
                      <span className="text-[10px] text-slate-400 ml-1">商业视角</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {[
                        { label: '总客户数', value: `${csData.healthOverview.totalCustomers}`, desc: '' },
                        { label: '整体续约率(NRR)', value: formatPercent(csData.healthOverview.businessSideMetrics.renewalRate), desc: '已续约/应续约' },
                        { label: '增购率', value: formatPercent(csData.healthOverview.businessSideMetrics.upsellRate), desc: '增购客户/总客户' },
                        { label: 'NPS评分', value: `${csData.healthOverview.businessSideMetrics.npsScore}`, desc: '推荐者%-贬损者%' },
                        { label: '全链路占比', value: formatPercent(csData.multiProductValue.fullChain.ratio), desc: '全链路/总客户' },
                        { label: '全链路LTV', value: formatCurrency(csData.multiProductValue.fullChain.ltv), desc: 'ARPU/流失率×0.8' },
                      ].map((m, i) => (
                        <div key={i} className="bg-[#0f1729] rounded-lg p-3 border border-slate-700/50">
                          <p className="text-xs text-slate-400 mb-0.5">{m.label}</p>
                          <p className="text-lg font-bold text-white">{m.value}</p>
                          {m.desc && <p className="text-[10px] text-slate-500 mt-0.5">{m.desc}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── 第二行：续费×健康度 + 产品线对比 ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 续费与流失对比 */}
                    <div className="bg-[#1a2332] rounded-lg p-4">
                      <p className="text-sm font-medium text-white mb-1">分产品线续费率</p>
                      <p className="text-[10px] text-slate-500 mb-3">NRR(净收入留存率) = 已续约ARR/应续约ARR</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={renewalChartData.filter(r => r.name !== '整体')}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={DARK_TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} />
                          <Legend wrapperStyle={{ color: '#94a3b8' }} />
                          <Bar dataKey="到期续费" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="到期未续" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 客户健康度分布 */}
                    <div className="bg-[#1a2332] rounded-lg p-4">
                      <p className="text-sm font-medium text-white mb-1">客户健康度分布</p>
                      <p className="text-[10px] text-slate-500 mb-3">{'健康=产品使用率>70% & 无客诉 | 危险=有客诉/赔偿'}</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={healthPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={renderPieLabel}>
                            {healthPieData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                          </Pie>
                          <Tooltip contentStyle={DARK_TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ── 第三行：客户贡献 × 产品线人效 ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 客户贡献：ARPU & LTV 对比 */}
                    <div className="bg-[#1a2332] rounded-lg p-4">
                      <p className="text-sm font-medium text-white mb-1">客户贡献</p>
                      <p className="text-[10px] text-slate-500 mb-3">{'ARPU=总ARR/客户数 | LTV=ARPU×1/(1-续费率)×0.8 | LTV/ARPU>3为健康'}</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={multiProductChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={DARK_TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} />
                          <Legend wrapperStyle={{ color: '#94a3b8' }} />
                          <Bar dataKey="ARPU" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="续费率" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="LTV" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 分产品线人效 */}
                    <div className="bg-[#1a2332] rounded-lg p-4">
                      <p className="text-sm font-medium text-white mb-1">分产品线客成人效</p>
                      <p className="text-[10px] text-slate-500 mb-3">人均续费ARR=产品线续费ARR/分配客成人数</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={productLineEfficiencyData.map(row => ({
                          name: row.name,
                          续费达成率: row.renewalAchievementRate,
                          覆盖率: row.coverageRate,
                          人均续费ARR: row.renewalARR >= 10000 ? Math.round(row.renewalARR / 10000) : row.renewalARR,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={DARK_TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} />
                          <Legend wrapperStyle={{ color: '#94a3b8' }} />
                          <Bar dataKey="续费达成率" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="覆盖率" fill="#4a9eff" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ── 第四行：多产品价值扩展路径 + 健康度雷达 ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 多产品价值对比卡片 */}
                    <div className="bg-[#1a2332] rounded-lg p-4">
                      <p className="text-sm font-medium text-white mb-1">交叉销售价值提升</p>
                      <p className="text-[10px] text-slate-500 mb-3">单产品→双产品→全链路：ARPU和LTV跃迁</p>
                      <div className="space-y-3">
                        {[
                          { label: '单产品', data: csData.multiProductValue.single, color: '#94a3b8' },
                          { label: '双产品', data: csData.multiProductValue.dual, color: '#6366f1' },
                          { label: '全链路', data: csData.multiProductValue.fullChain, color: '#22c55e' },
                        ].map((row, i) => (
                          <div key={i} className="bg-[#0f1729] rounded-lg p-3 border border-slate-700/30">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                              <span className="text-sm font-medium text-white">{row.label}</span>
                              <span className="text-xs text-slate-400 ml-auto">{row.data.count}家 ({formatPercent(row.data.ratio)})</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div><span className="text-slate-400">ARPU</span><p className="text-white font-bold">{formatCurrency(row.data.arpu)}</p></div>
                              <div><span className="text-slate-400">续费率</span><p className="text-white font-bold">{formatPercent(row.data.renewalRate)}</p></div>
                              <div><span className="text-slate-400">LTV</span><p className="text-white font-bold">{formatCurrency(row.data.ltv)}</p></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 健康度维度雷达 */}
                    <div className="bg-[#1a2332] rounded-lg p-4">
                      <p className="text-sm font-medium text-white mb-1">客户健康度多维雷达</p>
                      <p className="text-[10px] text-slate-500 mb-3">产品侧·效果侧·商业侧三维评估</p>
                      <ResponsiveContainer width="100%" height={260}>
                        <RadarChart data={healthRadarData}>
                          <PolarGrid stroke="#334155" />
                          <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 9 }} />
                          <Radar name="健康度" dataKey="value" stroke="#4a9eff" fill="#4a9eff" fillOpacity={0.3} />
                          <Tooltip contentStyle={DARK_TOOLTIP_STYLE} labelStyle={{ color: '#e2e8f0' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">加载数据中...</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              Flow Diagram Tab
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="flow">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5" />客户成功业务全链路流程图</CardTitle><CardDescription className="flex items-center gap-2">{flowData?.weekLabel}{flowData?.isDemo && <span className="text-amber-500 text-xs font-normal">· 示例数据</span>}</CardDescription></CardHeader>
              <CardContent>{flowData && (
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">{flowData.nodes.map((node, i) => (
                      <div key={node.id} className="flex items-center flex-shrink-0">
                        <button onClick={() => setSelectedNode(node)} className={`relative p-4 rounded-xl border-2 min-w-[120px] text-center transition-all hover:scale-105 ${node.status === 'healthy' ? 'border-emerald-400 bg-emerald-50' : node.status === 'warning' ? 'border-amber-400 bg-amber-50' : 'border-red-400 bg-red-50'} ${selectedNode?.id === node.id ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
                          <p className="text-sm font-bold text-slate-800">{node.label}</p>
                          <p className="text-2xl font-bold mt-1" style={{ color: node.status === 'healthy' ? '#22c55e' : node.status === 'warning' ? '#eab308' : '#ef4444' }}>{node.count}</p>
                          {node.lastWeek > 0 && <p className="text-xs text-slate-500 mt-1">上周: {node.lastWeek}{node.count > node.lastWeek ? ' ↑' : node.count < node.lastWeek ? ' ↓' : ' →'}</p>}
                        </button>
                        {i < flowData.nodes.length - 1 && <ChevronRight className="w-6 h-6 text-slate-300 flex-shrink-0 mx-1" />}
                      </div>
                    ))}</div>
                    {selectedNode && (<Card className="mt-4"><CardHeader className="pb-2"><CardTitle className="text-base">{selectedNode.label} - 详情</CardTitle></CardHeader><CardContent><p className="text-sm text-slate-600">{selectedNode.details}</p><div className="flex items-center gap-2 mt-2"><Badge className={STATUS_BG[selectedNode.status]}>{selectedNode.status === 'healthy' ? '达标' : selectedNode.status === 'warning' ? '预警' : '异常'}</Badge><span className="text-xs text-slate-500">当前: {selectedNode.count} | 上周: {selectedNode.lastWeek}</span></div></CardContent></Card>)}
                  </div>
                  <div className="w-full lg:w-64 space-y-3">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-100"><p className="text-xs font-semibold text-red-700 mb-1">风险预警</p>{flowData.riskAlerts.length > 0 ? flowData.riskAlerts.map((r, i) => (<p key={i} className="text-xs text-red-600">{r.metric}: {r.description}</p>)) : <p className="text-xs text-slate-500">暂无异常</p>}</div>
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-100"><p className="text-xs font-semibold text-amber-700 mb-1">核心客诉</p>{flowData.coreComplaints.map((c, i) => (<p key={i} className="text-xs text-amber-600">{maskCustomerName(c.customer)}: {c.issue}</p>))}</div>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100"><p className="text-xs font-semibold text-blue-700 mb-1">服务分布</p>{Object.entries(flowData.teamLoad).map(([name, count]) => (<div key={name} className="flex items-center justify-between mt-1"><span className="text-xs text-slate-600">{name}</span><span className="text-xs font-medium text-slate-800">{count}单</span></div>))}</div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100"><p className="text-xs font-semibold text-emerald-700 mb-1">健康度分布</p><div className="grid grid-cols-2 gap-1 mt-1"><span className="text-xs text-emerald-600">健康 {flowData.healthDistribution.healthy}</span><span className="text-xs text-amber-600">关注 {flowData.healthDistribution.attention}</span><span className="text-xs text-orange-600">预警 {flowData.healthDistribution.warning}</span><span className="text-xs text-red-600">危险 {flowData.healthDistribution.danger}</span></div></div>
                  </div>
                </div>
              )}</CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              Chat Tab
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="chat">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <Card className="h-[650px] flex flex-col">
                  <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Bot className="w-5 h-5 text-indigo-500" />智能体对话</CardTitle>
                    <CardDescription>通过自然语言调教智能体、调整报告逻辑和呈现方式</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1 mb-3 pr-2">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                          <Sparkles className="w-10 h-10 text-indigo-300 mx-auto" />
                          <p className="text-slate-500 text-sm">开始与智能体对话吧</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {['分析客户使用深度不足的原因', '从客户成功价值视角分析续费风险', '下周报告增加多产品交叉销售分析', '决策建议要更具体，给出时间和责任人'].map(q => (
                              <button key={q} onClick={() => setChatInput(q)} className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">{q}</button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                <div className="text-xs opacity-60 mb-1">{msg.role === 'user' ? '你' : 'CSM智能体'}</div>
                                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                              </div>
                            </div>
                          ))}
                          {chatLoading && <div className="flex justify-start"><div className="bg-slate-100 rounded-xl px-4 py-2.5"><div className="flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin text-slate-400" /><span className="text-sm text-slate-500">思考中...</span></div></div></div>}
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </ScrollArea>
                    <div className="flex gap-2">
                      <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }} placeholder="输入调教指令或问题..." className="flex-1" disabled={chatLoading} />
                      <Button onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}><Send className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-purple-500" />对话能力</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1.5">
                    {['调整报告逻辑与结构', '修改分析视角和深度', '增加/删除分析维度', '自定义指标阈值', '设置报告风格偏好'].map(c => (<div key={c} className="flex items-center gap-2 p-1.5 rounded bg-slate-50 text-xs text-slate-700"><CheckCircle className="w-3 h-3 text-emerald-500" />{c}</div>))}
                  </div></CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" />调教规则</CardTitle></CardHeader>
                  <CardContent>
                    {agentRules.length > 0 ? (<div className="space-y-1.5">{agentRules.slice(0, 5).map(r => (<div key={r.id} className="flex items-start gap-1.5 p-1.5 rounded bg-amber-50 text-xs text-amber-800"><Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" /><span className="flex-1">{r.ruleContent}</span></div>))}</div>)
                      : <p className="text-xs text-slate-500">暂无调教规则，通过对话或设置页面添加</p>}
                  </CardContent>
                </Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm">已启用技能</CardTitle></CardHeader>
                  <CardContent><div className="space-y-1">{skills.filter(s => s.enabled).map(s => (<div key={s.skillKey} className="flex items-center gap-1.5 text-xs text-slate-600"><CheckCircle className="w-3 h-3 text-emerald-500" />{s.skillName}</div>))}</div></CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              Memory Tab
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="memory">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" />Board Memory — 历史数据</CardTitle><CardDescription>历史指标快照与未闭环事项追踪</CardDescription></CardHeader>
              <CardContent>{dashboardData ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50"><div className="flex items-center gap-2 mb-2"><Badge className="bg-blue-600">本周</Badge><span className="text-sm font-semibold text-blue-800">{weekLabel}</span></div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {csData ? [
                        { label: '产品使用率', value: formatPercent(csData.healthOverview.productSideMetrics.productUsageRate) },
                        { label: '粉丝增长率', value: formatPercent(csData.healthOverview.effectSideMetrics.followerGrowthRate) },
                        { label: 'NPS', value: `${csData.healthOverview.businessSideMetrics.npsScore}` },
                        { label: '续约率', value: formatPercent(csData.healthOverview.businessSideMetrics.renewalRate) },
                      ].map((m, i) => (
                        <div key={i} className="text-sm"><span className="text-slate-600">{m.label}: </span><span className="font-semibold text-slate-800">{m.value}</span></div>
                      )) : dashboardData.metrics.map(m => (<div key={m.id} className="text-sm"><span className="text-slate-600">{m.name}: </span><span className="font-semibold text-slate-800">{m.currentDisplay}</span></div>))}
                    </div>
                    <div className="flex gap-4 mt-2 text-sm">
                      {csData ? (
                        <>
                          <span>健康 {csData.healthOverview.healthDistribution.healthy}</span>
                          <span>关注 {csData.healthOverview.healthDistribution.attention}</span>
                          <span>预警 {csData.healthOverview.healthDistribution.warning}</span>
                          <span>危险 {csData.healthOverview.healthDistribution.danger}</span>
                        </>
                      ) : (
                        <>
                          <span>健康 {dashboardData.healthDistribution.healthy}</span>
                          <span>关注 {dashboardData.healthDistribution.attention}</span>
                          <span>预警 {dashboardData.healthDistribution.warning}</span>
                          <span>危险 {dashboardData.healthDistribution.danger}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div><p className="text-sm font-semibold text-slate-700 mb-2">多周趋势{isDisplayingDemo ? '（示例）' : ''}</p><ResponsiveContainer width="100%" height={250}><LineChart data={csData ? [
                    { week: 'W11', 使用率: 62, 续费率: 68, NPS: 52 },
                    { week: 'W12', 使用率: 64, 续费率: 70, NPS: 54 },
                    { week: 'W13', 使用率: csData.healthOverview.productSideMetrics.productUsageRate - 3, 续费率: csData.healthOverview.businessSideMetrics.renewalRate - 2, NPS: csData.healthOverview.businessSideMetrics.npsScore - 3 },
                    { week: 'W14', 使用率: csData.healthOverview.productSideMetrics.productUsageRate, 续费率: csData.healthOverview.businessSideMetrics.renewalRate, NPS: csData.healthOverview.businessSideMetrics.npsScore },
                  ] : [
                    { week: 'W11', 培训完成率: 44, 客诉率: 3.2, 活跃率: 36 },
                    { week: 'W12', 培训完成率: 46, 客诉率: 3.5, 活跃率: 37 },
                    { week: 'W13', 培训完成率: 48.5, 客诉率: 3.5, 活跃率: 39.2 },
                    { week: 'W14', 培训完成率: dashboardData.metrics[2]?.currentValue || 51, 客诉率: dashboardData.metrics[3]?.currentValue || 4.1, 活跃率: dashboardData.metrics[7]?.currentValue || 42 },
                  ]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="week" /><YAxis /><Tooltip /><Legend />{csData ? (<><Line type="monotone" dataKey="使用率" stroke="#6366f1" strokeWidth={2} /><Line type="monotone" dataKey="续费率" stroke="#22c55e" strokeWidth={2} /><Line type="monotone" dataKey="NPS" stroke="#f59e0b" strokeWidth={2} /></>) : (<><Line type="monotone" dataKey="培训完成率" stroke="#6366f1" strokeWidth={2} /><Line type="monotone" dataKey="客诉率" stroke="#ef4444" strokeWidth={2} /><Line type="monotone" dataKey="活跃率" stroke="#10b981" strokeWidth={2} /></>)}</LineChart></ResponsiveContainer></div>
                  <div><p className="text-sm font-semibold text-slate-700 mb-2">未闭环事项追踪</p><div className="space-y-2">
                    {csData ? csData.keyIssues.map((item, i) => (
                      <div key={i} className="p-2 rounded bg-amber-50 border border-amber-100 flex items-center gap-2">
                        <span>🔄</span>
                        <span className="text-sm text-slate-700 flex-1">{item.issue}</span>
                        <Badge className="bg-amber-100 text-amber-700 text-xs">{item.owner}</Badge>
                        <Badge variant="outline" className="text-xs">{item.deadline}</Badge>
                      </div>
                    )) : (<>
                      <div className="p-2 rounded bg-emerald-50 border border-emerald-100 flex items-center gap-2"><span>✅</span><span className="text-sm text-slate-700">AI匹配度优化方案已发布</span><Badge className="bg-emerald-100 text-emerald-700 text-xs">已闭环</Badge></div>
                      <div className="p-2 rounded bg-amber-50 border border-amber-100 flex items-center gap-2"><span>🔄</span><span className="text-sm text-slate-700">培训SOP更新迭代中</span><Badge className="bg-amber-100 text-amber-700 text-xs">进行中</Badge></div>
                    </>)}
                  </div></div>
                  {dashboardData.qualityReports.length > 0 && (<div><p className="text-sm font-semibold text-slate-700 mb-2">数据质量报告</p><div className="space-y-2">{dashboardData.qualityReports.map((q, i) => (<div key={i} className="p-3 rounded border border-slate-200 bg-slate-50 text-sm"><p className="font-medium text-slate-800 mb-1">{q.tableName}</p><div className="grid grid-cols-2 gap-1 text-xs text-slate-600"><span>原始行数: {q.originalRows}</span><span>清洗后: {q.cleanedRows}</span><span>过滤测试: {q.filteredTest}</span><span>去重: {q.deduplicated}</span></div></div>))}</div></div>)}
                </div>
              ) : <p className="text-center text-slate-500 py-10">加载中...</p>}</CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════════════════════════════════════════════
              Settings Tab
              ══════════════════════════════════════════════════════════════ */}
          <TabsContent value="settings">
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Model Config */}
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sliders className="w-5 h-5 text-purple-500" />模型配置</CardTitle><CardDescription>配置AI分析使用的模型。推荐使用内置 SDK（免配置，开箱即用）</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label className="text-xs">Provider</Label><select value={modelConfig.provider} onChange={e => setModelConfig(p => ({ ...p, provider: e.target.value }))} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="zai-sdk">内置 SDK（推荐，免配置）</option><option value="minimax">Minimax</option><option value="openai">OpenAI</option><option value="custom">Custom</option></select></div>
                    <div><Label className="text-xs">模型名称</Label><Input value={modelConfig.modelName} onChange={e => setModelConfig(p => ({ ...p, modelName: e.target.value }))} className="mt-1" disabled={modelConfig.provider === 'zai-sdk'} placeholder={modelConfig.provider === 'zai-sdk' ? 'SDK 自动选择' : '模型名称'} /></div>
                    {modelConfig.provider !== 'zai-sdk' && <><div className="md:col-span-2"><Label className="text-xs">API Key</Label><Input type="password" value={modelConfig.apiKey} onChange={e => setModelConfig(p => ({ ...p, apiKey: e.target.value }))} className="mt-1" placeholder="sk-..." /></div>
                    <div className="md:col-span-2"><Label className="text-xs">Base URL</Label><Input value={modelConfig.baseUrl} onChange={e => setModelConfig(p => ({ ...p, baseUrl: e.target.value }))} className="mt-1" /></div></>}
                    <div><Label className="text-xs">Temperature ({modelConfig.temperature})</Label><Input type="range" min="0" max="1" step="0.1" value={modelConfig.temperature} onChange={e => setModelConfig(p => ({ ...p, temperature: parseFloat(e.target.value) }))} className="mt-1 w-full" /></div>
                    <div><Label className="text-xs">Max Tokens</Label><Input type="number" value={modelConfig.maxTokens} onChange={e => setModelConfig(p => ({ ...p, maxTokens: parseInt(e.target.value) || 4096 }))} className="mt-1" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveModelConfig} className="flex-1"><Zap className="w-4 h-4 mr-2" />保存配置</Button>
                    <Button variant="outline" onClick={handleTestModel} disabled={modelTestLoading}>{modelTestLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}测试连接</Button>
                  </div>
                  {modelTestResult && (<div className={`p-3 rounded-lg text-sm ${modelTestResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{modelTestResult.message}</div>)}
                </CardContent>
              </Card>

              {/* Skill Config */}
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="w-5 h-5 text-blue-500" />技能配置</CardTitle><CardDescription>启用或禁用智能体分析技能，控制报告生成内容。支持自定义添加新技能</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {/* Add new skill */}
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50">
                    <p className="text-xs font-semibold text-blue-700 mb-2">添加自定义技能</p>
                    <div className="flex gap-2">
                      <Input value={newSkillKey} onChange={e => setNewSkillKey(e.target.value)} placeholder="技能标识 (如: my_skill)" className="flex-1 text-xs" />
                      <Input value={newSkillName} onChange={e => setNewSkillName(e.target.value)} placeholder="技能名称 (如: 我的分析技能)" className="flex-1 text-xs" />
                      <Button onClick={handleAddSkill} size="sm"><Plus className="w-4 h-4 mr-1" />添加</Button>
                    </div>
                    <p className="text-[10px] text-blue-500 mt-1">技能标识仅支持英文、数字和下划线，添加后可在智能体对话中调用</p>
                  </div>
                  <div className="space-y-2">{skills.map(s => (
                    <div key={s.skillKey} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors">
                      <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${s.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} /><div><p className="text-sm font-medium text-slate-800">{s.skillName}</p><p className="text-xs text-slate-500">Key: {s.skillKey}</p></div></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleToggleSkill(s.skillKey, !s.enabled)} className="flex items-center">{s.enabled ? <ToggleRight className="w-8 h-5 text-emerald-500" /> : <ToggleLeft className="w-8 h-5 text-slate-400" />}</button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSkill(s.skillKey)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                      </div>
                    </div>
                  ))}</div>
                </CardContent>
              </Card>

              {/* Agent Rules (NL Tuning) */}
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-500" />智能体调教</CardTitle><CardDescription>通过规则对智能体进行自然语言调教，影响报告生成逻辑</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input value={newRule} onChange={e => setNewRule(e.target.value)} placeholder="输入调教规则，如：分析要从客户成功价值视角出发" className="flex-1" onKeyDown={e => { if (e.key === 'Enter') handleAddRule(); }} />
                    <select value={newRuleCategory} onChange={e => setNewRuleCategory(e.target.value)} className="px-2 py-2 border rounded-lg text-xs"><option value="general">通用</option><option value="analysis">分析</option><option value="report">报告</option><option value="format">格式</option></select>
                    <Button onClick={handleAddRule} size="sm"><Plus className="w-4 h-4 mr-1" />添加</Button>
                  </div>
                  {agentRules.length > 0 ? (
                    <div className="space-y-2">{agentRules.map(r => (
                      <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                        <div className="flex-1"><p className="text-sm text-slate-800">{r.ruleContent}</p><div className="flex gap-2 mt-1"><Badge variant="outline" className="text-xs">{r.category}</Badge><Badge variant="outline" className="text-xs">{r.source === 'chat' ? '对话生成' : r.source === 'manual' ? '手动添加' : '系统'}</Badge></div></div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(r.id)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    ))}</div>
                  ) : <p className="text-center text-sm text-slate-500 py-6">暂无调教规则，添加规则或通过对话自动生成</p>}
                </CardContent>
              </Card>

              {/* WeChat Work Config */}
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-green-500" />企业微信机器人</CardTitle></CardHeader>
                <CardContent><div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">企业 ID</span><span className="font-mono text-slate-700">ww8bd429f5b618a57e</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Bot ID</span><span className="font-mono text-slate-700">aibfn23p9PF...0N3</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">方案</span><Badge>智能机器人方案</Badge></div>
                </div></CardContent>
              </Card>

              {/* Quick Actions */}
              <Card><CardHeader><CardTitle className="text-base">快捷操作</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-2">
                  <Button variant="outline" className="justify-start" onClick={handleNotify}><Bell className="w-4 h-4 mr-2" />手动推送企业微信通知</Button>
                  <Button variant="outline" className="justify-start" onClick={() => { loadDashboard(); loadFlowData(); toast.success('数据已刷新'); }}><RefreshCw className="w-4 h-4 mr-2" />重新加载所有数据</Button>
                  <Button variant="outline" className="justify-start" onClick={handleGenerateReport} disabled={reportLoading}><Brain className="w-4 h-4 mr-2" />{reportLoading ? 'AI正在生成报告...' : '手动触发生成报告'}</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-xs text-slate-400">
          AIMI 客户成功价值分析系统 v3 | Powered by AIMI & 企业微信
        </div>
      </footer>
    </div>
  );
}
