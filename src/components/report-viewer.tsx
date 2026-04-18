'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText, Download, Send, Brain, Gauge, Layers, Repeat,
  Users, AlertTriangle, TrendingUp, Target, Lightbulb,
  CheckCircle, AlertCircle, ArrowUpRight, ArrowDownRight, Minus,
  Clock, ChevronRight, Shield, Zap, Heart, DollarSign,
  Flame, Sparkles, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// ============ Module Color Mapping ============
const MODULE_COLORS: Record<string, { border: string; bg: string; icon: React.ReactNode; label: string }> = {
  '执行摘要': { border: 'border-l-slate-500', bg: 'bg-slate-50', icon: <FileText className="w-4 h-4 text-slate-600" />, label: '执行摘要' },
  '价值总览': { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', icon: <TrendingUp className="w-4 h-4 text-emerald-600" />, label: '价值总览' },
  '商业核心指标': { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', icon: <Gauge className="w-4 h-4 text-emerald-600" />, label: '核心指标' },
  '核心结论': { border: 'border-l-emerald-600', bg: 'bg-emerald-50/50', icon: <Target className="w-4 h-4 text-emerald-700" />, label: '核心结论' },
  '关键风险信号': { border: 'border-l-red-500', bg: 'bg-red-50/50', icon: <AlertTriangle className="w-4 h-4 text-red-600" />, label: '风险信号' },
  '商业价值总览': { border: 'border-l-blue-500', bg: 'bg-blue-50/50', icon: <TrendingUp className="w-4 h-4 text-blue-600" />, label: '商业价值' },
  '商业核心指标': { border: 'border-l-blue-500', bg: 'bg-blue-50/50', icon: <DollarSign className="w-4 h-4 text-blue-600" />, label: '商业指标' },
  '客户增长': { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', icon: <Users className="w-4 h-4 text-emerald-600" />, label: '客户增长' },
  '客户贡献': { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', icon: <Gauge className="w-4 h-4 text-emerald-600" />, label: '客户贡献' },
  '客户购买旅程': { border: 'border-l-amber-500', bg: 'bg-amber-50/50', icon: <Flame className="w-4 h-4 text-amber-600" />, label: '购买旅程' },
  '客户成效': { border: 'border-l-indigo-500', bg: 'bg-indigo-50/50', icon: <Sparkles className="w-4 h-4 text-indigo-600" />, label: '客户成效' },
  'AIMI用户使用旅程': { border: 'border-l-indigo-500', bg: 'bg-indigo-50/50', icon: <Activity className="w-4 h-4 text-indigo-600" />, label: '使用旅程' },
  'ARR构成': { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', icon: <Layers className="w-4 h-4 text-emerald-600" />, label: 'ARR构成' },
  '产品运营': { border: 'border-l-indigo-500', bg: 'bg-indigo-50/50', icon: <Layers className="w-4 h-4 text-indigo-600" />, label: '产品运营' },
  'AIMI运营': { border: 'border-l-indigo-500', bg: 'bg-indigo-50/50', icon: <Zap className="w-4 h-4 text-indigo-600" />, label: 'AIMI运营' },
  '产品线': { border: 'border-l-indigo-500', bg: 'bg-indigo-50/50', icon: <Layers className="w-4 h-4 text-indigo-600" />, label: '产品线' },
  '多产品': { border: 'border-l-purple-500', bg: 'bg-purple-50/50', icon: <Zap className="w-4 h-4 text-purple-600" />, label: '多产品' },
  '客户价值': { border: 'border-l-violet-500', bg: 'bg-violet-50/50', icon: <Heart className="w-4 h-4 text-violet-600" />, label: '客户价值' },
  '购买旅程': { border: 'border-l-violet-500', bg: 'bg-violet-50/50', icon: <ChevronRight className="w-4 h-4 text-violet-600" />, label: '购买旅程' },
  '续费': { border: 'border-l-amber-500', bg: 'bg-amber-50/50', icon: <Repeat className="w-4 h-4 text-amber-600" />, label: '续费' },
  '增购': { border: 'border-l-amber-500', bg: 'bg-amber-50/50', icon: <DollarSign className="w-4 h-4 text-amber-600" />, label: '增购' },
  '流失': { border: 'border-l-red-500', bg: 'bg-red-50/50', icon: <AlertTriangle className="w-4 h-4 text-red-600" />, label: '流失' },
  '异常': { border: 'border-l-orange-500', bg: 'bg-orange-50/50', icon: <AlertCircle className="w-4 h-4 text-orange-600" />, label: '异常' },
  '运营管理': { border: 'border-l-amber-500', bg: 'bg-amber-50/50', icon: <Target className="w-4 h-4 text-amber-600" />, label: '运营管理' },
  '人效': { border: 'border-l-teal-500', bg: 'bg-teal-50/50', icon: <Users className="w-4 h-4 text-teal-600" />, label: '人效' },
  '效能': { border: 'border-l-teal-500', bg: 'bg-teal-50/50', icon: <Target className="w-4 h-4 text-teal-600" />, label: '效能' },
  '风险': { border: 'border-l-red-600', bg: 'bg-red-50/50', icon: <Shield className="w-4 h-4 text-red-600" />, label: '风险' },
  '关键问题': { border: 'border-l-rose-500', bg: 'bg-rose-50/50', icon: <AlertTriangle className="w-4 h-4 text-rose-600" />, label: '关键问题' },
  '决策建议': { border: 'border-l-cyan-500', bg: 'bg-cyan-50/50', icon: <Lightbulb className="w-4 h-4 text-cyan-600" />, label: '决策' },
  '行动项': { border: 'border-l-cyan-500', bg: 'bg-cyan-50/50', icon: <Zap className="w-4 h-4 text-cyan-600" />, label: '行动项' },
  '结论': { border: 'border-l-emerald-600', bg: 'bg-emerald-50/50', icon: <CheckCircle className="w-4 h-4 text-emerald-600" />, label: '结论' },
  '问题': { border: 'border-l-rose-500', bg: 'bg-rose-50/50', icon: <AlertTriangle className="w-4 h-4 text-rose-600" />, label: '问题' },
  '未闭环': { border: 'border-l-violet-500', bg: 'bg-violet-50/50', icon: <Clock className="w-4 h-4 text-violet-600" />, label: '未闭环' },
  '趋势': { border: 'border-l-emerald-500', bg: 'bg-emerald-50/50', icon: <TrendingUp className="w-4 h-4 text-emerald-600" />, label: '趋势' },
};

function getModuleStyle(title: string) {
  const lower = title.toLowerCase();
  for (const [key, style] of Object.entries(MODULE_COLORS)) {
    if (lower.includes(key.toLowerCase())) return style;
  }
  return { border: 'border-l-slate-400', bg: 'bg-slate-50/50', icon: <ChevronRight className="w-4 h-4 text-slate-500" />, label: title };
}

// ============ Inline Style Helpers ============

function stylizeHealthEmoji(text: string): React.ReactNode {
  // Replace health emoji with styled badges
  return text.replace(/🟢/g, '◆健康').replace(/🟡/g, '◆关注').replace(/🟠/g, '◆预警').replace(/🔴/g, '◆危险');
}

function renderTrendArrow(text: string): React.ReactNode {
  if (text.includes('↑')) return <span className="inline-flex items-center text-emerald-600 font-semibold"><ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />{text.replace('↑', '').trim()}</span>;
  if (text.includes('↓')) return <span className="inline-flex items-center text-red-600 font-semibold"><ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />{text.replace('↓', '').trim()}</span>;
  if (text.includes('→')) return <span className="inline-flex items-center text-slate-500 font-semibold"><Minus className="w-3.5 h-3.5 mr-0.5" />{text.replace('→', '').trim()}</span>;
  return text;
}

// ============ Props ============

interface ReportViewerProps {
  reportContent: string;
  weekLabel?: string;
  reportLoading: boolean;
  onGenerate: () => void;
  onCopy: () => void;
  onNotify: () => void;
}

// ============ Main Component ============

export default function ReportViewer({
  reportContent,
  weekLabel,
  reportLoading,
  onGenerate,
  onCopy,
  onNotify,
}: ReportViewerProps) {

  // Parse TOC from markdown
  const tocItems = useMemo(() => {
    if (!reportContent) return [];
    const lines = reportContent.split('\n');
    return lines
      .filter(l => l.startsWith('## ') || l.startsWith('### '))
      .map(l => {
        const level = l.startsWith('### ') ? 3 : 2;
        const text = l.replace(/^#{2,3}\s+/, '').trim();
        const id = text.replace(/[^\w\u4e00-\u9fff]/g, '-').toLowerCase();
        return { level, text, id };
      });
  }, [reportContent]);

  if (!reportContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-6 shadow-sm">
          {reportLoading ? (
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          ) : (
            <FileText className="w-10 h-10 text-emerald-600" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">
          {reportLoading ? 'AI 正在生成周报...' : '暂无周报内容'}
        </h3>
        <p className="text-slate-500 mb-6 text-center max-w-md">
          {reportLoading
            ? '正在调用AI分析数据并撰写报告，通常需要30-60秒，请耐心等待'
            : '上传Excel数据后，点击下方按钮生成客户成功价值分析周报'}
        </p>
        <Button size="lg" onClick={onGenerate} disabled={reportLoading}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md">
          <Brain className="w-5 h-5 mr-2" />
          {reportLoading ? 'AI 正在生成周报...' : '生成客户成功价值周报'}
        </Button>
        {reportLoading && (
          <div className="mt-6 w-72">
            <Progress value={66} className="h-2 animate-pulse" />
            <p className="text-xs text-slate-400 mt-2 text-center">正在分析数据并撰写报告...（约30-60秒）</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* ── Report Header ── */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-emerald-900 rounded-t-xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">客户成功价值分析周报</h2>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className="text-xs text-emerald-300 border-emerald-700 bg-emerald-900/30">
                  <Clock className="w-3 h-3 mr-1" />{weekLabel || '本周'}
                </Badge>
                <span className="text-xs text-slate-400">AI 自动生成</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onCopy}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              <Download className="w-3.5 h-3.5 mr-1.5" />复制
            </Button>
            <Button size="sm" variant="outline" onClick={onNotify}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
              <Send className="w-3.5 h-3.5 mr-1.5" />推送
            </Button>
            <Button size="sm" onClick={onGenerate} disabled={reportLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Brain className="w-3.5 h-3.5 mr-1.5" />{reportLoading ? '重新生成...' : '重新生成'}
            </Button>
          </div>
        </div>
      </div>

      {/* ── TOC + Content ── */}
      <div className="flex border border-t-0 border-slate-200 rounded-b-xl overflow-hidden bg-white">
        {/* Left: Table of Contents */}
        <div className="hidden lg:block w-64 border-r border-slate-200 bg-slate-50/80 shrink-0">
          <div className="p-4 border-b border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">目录导航</p>
          </div>
          <ScrollArea className="h-[700px]">
            <nav className="p-3 space-y-0.5">
              {tocItems.map((item, i) => (
                <a
                  key={i}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(item.id);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors hover:bg-white hover:shadow-sm
                    ${item.level === 2 ? 'font-semibold text-slate-700' : 'font-normal text-slate-500 pl-6'}`}
                >
                  {item.level === 2 && <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />}
                  {item.text}
                </a>
              ))}
            </nav>
          </ScrollArea>
        </div>

        {/* Right: Report Content */}
        <ScrollArea className="flex-1 h-[700px]">
          <div className="max-w-4xl mx-auto px-8 py-8">
            <ReactMarkdown
              components={{
                // ── H1: Report Title ──
                h1: ({ children }) => (
                  <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{children}</h1>
                    <Separator className="mt-3 bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent h-0.5" />
                  </div>
                ),

                // ── H2: Major Section ──
                h2: ({ children }) => {
                  const text = String(children);
                  const style = getModuleStyle(text);
                  const id = text.replace(/[^\w\u4e00-\u9fff]/g, '-').toLowerCase();
                  return (
                    <div id={id} className="mt-10 mb-5 first:mt-0">
                      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border-l-4 ${style.border} ${style.bg} shadow-sm`}>
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                          {style.icon}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">{children}</h2>
                      </div>
                    </div>
                  );
                },

                // ── H3: Sub-section ──
                h3: ({ children }) => (
                  <h3 className="text-base font-semibold text-slate-700 mt-6 mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {children}
                  </h3>
                ),

                // ── H4 ──
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-slate-600 mt-4 mb-2 uppercase tracking-wider">{children}</h4>
                ),

                // ── Paragraph ──
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed text-slate-700 mb-4">{children}</p>
                ),

                // ── Strong ──
                strong: ({ children }) => {
                  const text = String(children);
                  // Check for health indicators
                  if (text.includes('健康') || text.includes('🟢')) {
                    return <strong className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">{children}</strong>;
                  }
                  if (text.includes('危险') || text.includes('🔴')) {
                    return <strong className="text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded">{children}</strong>;
                  }
                  if (text.includes('预警') || text.includes('🟠')) {
                    return <strong className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">{children}</strong>;
                  }
                  if (text.includes('关注') || text.includes('🟡')) {
                    return <strong className="text-yellow-700 font-bold bg-yellow-50 px-1.5 py-0.5 rounded">{children}</strong>;
                  }
                  // Check for P0/P1/P2
                  if (text.includes('P0') || text.includes('立即行动')) {
                    return <strong className="text-red-700 font-bold bg-red-50 px-2 py-0.5 rounded-md border border-red-200">{children}</strong>;
                  }
                  if (text.includes('P1') || text.includes('本周内')) {
                    return <strong className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">{children}</strong>;
                  }
                  if (text.includes('P2') || text.includes('持续关注')) {
                    return <strong className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">{children}</strong>;
                  }
                  return <strong className="text-slate-800 font-semibold">{children}</strong>;
                },

                // ── Table ──
                table: ({ children }) => (
                  <div className="my-5 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),

                thead: ({ children }) => (
                  <thead className="bg-gradient-to-r from-slate-700 to-slate-800">{children}</thead>
                ),

                tbody: ({ children }) => (
                  <tbody className="divide-y divide-slate-100">{children}</tbody>
                ),

                tr: ({ children, ...props }) => {
                  // We can't easily determine row index here, so just apply base style
                  return (
                    <tr className="hover:bg-slate-50/80 transition-colors">{children}</tr>
                  );
                },

                th: ({ children }) => (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider whitespace-nowrap">
                    {children}
                  </th>
                ),

                td: ({ children }) => {
                  // Process children to stylize special content
                  return (
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {children}
                    </td>
                  );
                },

                // ── Unordered List ──
                ul: ({ children }) => (
                  <ul className="my-3 space-y-1.5 pl-5">{children}</ul>
                ),

                li: ({ children, ordered, index }) => {
                  const text = String(children);
                  // Special styling for P0/P1/P2 items
                  if (text.includes('P0') || text.includes('立即行动')) {
                    return (
                      <li className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold shrink-0">!</span>
                        <span>{children}</span>
                      </li>
                    );
                  }
                  if (text.includes('P1') || text.includes('本周内')) {
                    return (
                      <li className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">●</span>
                        <span>{children}</span>
                      </li>
                    );
                  }
                  return (
                    <li className="text-sm text-slate-700 leading-relaxed list-disc marker:text-emerald-500">
                      {children}
                    </li>
                  );
                },

                // ── Ordered List ──
                ol: ({ children }) => (
                  <ol className="my-3 space-y-1.5 pl-5 list-decimal marker:text-emerald-600 marker:font-semibold">{children}</ol>
                ),

                // ── Code ──
                code: ({ children, className }) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-mono">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className={className}>{children}</code>
                  );
                },

                // ── Blockquote ──
                blockquote: ({ children }) => (
                  <blockquote className="my-4 pl-4 border-l-4 border-emerald-400 bg-emerald-50/50 py-3 pr-4 rounded-r-lg">
                    {children}
                  </blockquote>
                ),

                // ── Horizontal Rule ──
                hr: () => (
                  <Separator className="my-6 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
                ),

                // ── Link ──
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="text-emerald-600 hover:text-emerald-800 underline underline-offset-2">
                    {children}
                  </a>
                ),
              }}
            >
              {reportContent}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
