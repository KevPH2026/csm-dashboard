// Dynamic LLM API integration for CSM Weekly Report Agent
// Supports z-ai-web-dev-sdk (built-in), Minimax, OpenAI-compatible, and custom providers

import ZAI from 'z-ai-web-dev-sdk';

export interface LLMConfig {
  provider: 'zai-sdk' | 'minimax' | 'openai' | 'custom';
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

// Default to zai-sdk which is guaranteed to work in this environment
export const DEFAULT_CONFIG: LLMConfig = {
  provider: 'zai-sdk',
  apiKey: '',
  baseUrl: '',
  modelName: '',
  temperature: 0.3,
  maxTokens: 4096,
};

export interface MinimaxMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Singleton ZAI SDK instance
let zaiInstance: ZAI | null = null;

async function getZAI(): Promise<ZAI> {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Get config from localStorage (client) or use default (server)
export function getLLMConfig(): LLMConfig {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('csm_model_config');
    if (stored) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      } catch { /* ignore */ }
    }
  }
  return { ...DEFAULT_CONFIG };
}

// Call LLM using z-ai-web-dev-sdk
async function callLLMViaSDK(
  messages: MinimaxMessage[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  const zai = await getZAI();
  const completion = await zai.chat.completions.create({
    messages,
    temperature,
    max_tokens: maxTokens,
  });
  return completion.choices?.[0]?.message?.content || '';
}

// Call LLM using custom API endpoint (OpenAI-compatible)
async function callLLMViaAPI(
  messages: MinimaxMessage[],
  config: LLMConfig,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LLM API error:', response.status, errorText);
    throw new Error(`LLM API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// Call LLM with dynamic config — routes to SDK or API based on provider
export async function callLLM(
  messages: MinimaxMessage[],
  config?: Partial<LLMConfig>,
  temperature?: number
): Promise<string> {
  const fullConfig = { ...getLLMConfig(), ...config };
  const temp = temperature ?? fullConfig.temperature;
  const maxTokens = fullConfig.maxTokens;

  // If provider is zai-sdk or no API key configured, use SDK
  if (fullConfig.provider === 'zai-sdk' || !fullConfig.apiKey) {
    try {
      return await callLLMViaSDK(messages, temp, maxTokens);
    } catch (sdkError) {
      console.error('SDK LLM call failed:', sdkError);
      // If user also configured a custom API, try that as fallback
      if (fullConfig.provider !== 'zai-sdk' && fullConfig.apiKey && fullConfig.baseUrl) {
        console.log('Falling back to custom API...');
        try {
          return await callLLMViaAPI(messages, fullConfig, temp, maxTokens);
        } catch (apiError) {
          console.error('Fallback API also failed:', apiError);
          throw new Error(`SDK 和自定义 API 均调用失败。SDK: ${sdkError instanceof Error ? sdkError.message : '未知错误'}`);
        }
      }
      throw sdkError;
    }
  }

  // Use custom API endpoint
  try {
    return await callLLMViaAPI(messages, fullConfig, temp, maxTokens);
  } catch (apiError) {
    console.error('Custom API call failed, trying SDK fallback:', apiError);
    // Fallback to SDK if custom API fails
    try {
      return await callLLMViaSDK(messages, temp, maxTokens);
    } catch (sdkError) {
      console.error('SDK fallback also failed:', sdkError);
      throw new Error(`自定义 API 和 SDK 均调用失败。API: ${apiError instanceof Error ? apiError.message : '未知错误'}`);
    }
  }
}

// Backward compatible: callMinimax uses callLLM with default config
export async function callMinimax(
  messages: MinimaxMessage[],
  temperature = 0.3
): Promise<string> {
  return callLLM(messages, undefined, temperature);
}

// Test model connection
export async function testModelConnection(config: LLMConfig): Promise<{ success: boolean; message: string; latency?: number }> {
  const start = Date.now();

  // Test zai-sdk provider
  if (config.provider === 'zai-sdk' || !config.apiKey) {
    try {
      const zai = await getZAI();
      const completion = await zai.chat.completions.create({
        messages: [{ role: 'user', content: '你好，请回复"连接成功"' }],
        temperature: 0.1,
        max_tokens: 50,
      });
      const latency = Date.now() - start;
      const content = completion.choices?.[0]?.message?.content;
      if (content) {
        return { success: true, message: `SDK模型响应正常，延迟 ${latency}ms`, latency };
      }
      return { success: false, message: 'SDK模型返回内容为空' };
    } catch (error) {
      return { success: false, message: `SDK连接失败: ${error instanceof Error ? error.message : '未知错误'}` };
    }
  }

  // Test custom API endpoint
  try {
    const response = await fetch(config.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: 'user', content: '你好，请回复"连接成功"' },
        ],
        temperature: 0.1,
        max_tokens: 50,
      }),
    });

    const latency = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `HTTP ${response.status}: ${errorText.substring(0, 200)}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return { success: true, message: `模型响应正常，延迟 ${latency}ms`, latency };
    }
    return { success: false, message: '模型返回内容为空' };
  } catch (error) {
    return { success: false, message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

// Smart header mapping using LLM
export async function mapHeadersWithLLM(
  actualHeaders: string[],
  standardFields: string[]
): Promise<Record<string, string>> {
  const systemPrompt = `你是一个数据字段映射专家。你需要将Excel中实际的表头字段名映射到标准字段名。
规则：
1. 根据语义进行匹配，容忍字段名的微小变化
2. 返回JSON格式：{"实际字段名": "标准字段名"}
3. 无法识别的字段映射为null
4. 只返回JSON，不要其他内容`;

  const userPrompt = `实际表头: ${JSON.stringify(actualHeaders)}
标准字段: ${JSON.stringify(standardFields)}
请返回映射关系JSON。`;

  try {
    const result = await callLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], undefined, 0.1);

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {};
  } catch {
    return {};
  }
}

// Generate deep analysis using LLM
export async function generateDeepAnalysis(
  metricsData: string,
  healthData: string,
  anomaliesData: string,
  weeklySummary?: string,
  agentRules?: string[]
): Promise<string> {
  const rulesSection = agentRules && agentRules.length > 0
    ? `\n\n当前调教规则（必须遵守）：\n${agentRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';

  const systemPrompt = `你是一位资深客户成功（CSM）分析师。基于提供的数据，生成深度分析报告。
核心原则：从客户价值和使用视角出发，而非交付视角。
要求：
1. 必须引用具体数据，禁止空泛描述
2. 使用叙事风格，不堆砌bullet points
3. 异常波动（≥20%环比变化）需分析可能原因
4. 给出具体可执行的决策建议，分P0（立即行动）、P1（本周内）、P2（持续关注）三级
5. P0建议不超过3条
6. 深入分析客户使用深度（浅/中/深三层）
7. 分析产品价值达成情况（客户是否达成了业务目标）
8. 对危险层和预警层客户做续费风险预测
9. 关注续费、增购、流失等商业指标背后的客户价值逻辑${rulesSection}`;

  const userPrompt = `以下是本周CSM数据：

核心指标：
${metricsData}

客户健康度分布：
${healthData}

异常指标：
${anomaliesData}

${weeklySummary ? `一线补充信息：\n${weeklySummary}` : ''}

请生成深度分析，包括：
1. 执行摘要（3-5句话，必须包含危险层客户总体描述）
2. 客户使用深度分析（浅层使用/中度使用/深度使用的客户分布和特征）
3. 产品价值达成分析（客户是否通过产品实现了业务目标，哪些维度达标、哪些不足）
4. 续费风险预测（按产品线拆分，预判未来30天可能流失的客户及原因）
5. 异常指标归因分析（推测1-2个可能原因 + 验证建议）
6. 趋势预测（基于已有数据判断方向）
7. 决策建议（P0/P1/P2，每条必须具体到"谁做什么、什么时候、预期效果"）`;

  return callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], undefined, 0.3);
}

// Chat with the agent for natural language tuning
export async function chatWithAgent(
  userMessage: string,
  chatHistory: MinimaxMessage[],
  reportContext?: string,
  skillContext?: string,
  agentRules?: string[]
): Promise<string> {
  const rulesSection = agentRules && agentRules.length > 0
    ? `\n\n当前调教规则：\n${agentRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';

  const systemPrompt = `你是CSM周报智能体的调教助手。用户可以通过自然语言来调整你的行为和报告生成逻辑。

当前能力：
1. 数据清洗与处理
2. 客户健康度分层分析
3. 异常检测与归因
4. 趋势预测
5. 决策建议生成
6. 客户价值分析
7. 续费流失分析
8. 多产品交叉分析
9. 团队效能分析
10. AI效果对比分析
11. 自然语言调教
12. 语义报告调整

${skillContext ? `当前Skill配置：\n${skillContext}` : ''}
${rulesSection}

${reportContext ? `当前报告上下文：\n${reportContext.substring(0, 3000)}` : ''}

当用户要求调整报告逻辑、结构或呈现方式时，你需要：
1. 理解用户意图
2. 说明你将如何调整
3. 给出具体的调整方案（以规则形式呈现，方便用户确认后应用为调教规则）
4. 如果涉及参数变更，明确列出变更项
5. 如果用户的话可以提取为调教规则，请在回复末尾单独一行输出: [规则] 规则内容

回复使用中文，简洁专业。`;

  const messages: MinimaxMessage[] = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-10),
    { role: 'user', content: userMessage },
  ];

  return callLLM(messages, undefined, 0.5);
}

// Generate full weekly report
export async function generateWeeklyReport(
  data: {
    weekLabel: string;
    metrics: Record<string, unknown>;
    healthDistribution: Record<string, number>;
    anomalies: unknown[];
    recommendations: unknown[];
    unresolvedItems: unknown[];
    orderAnalysis: string;
    serviceDelivery: string;
    customerFeedback: string;
    productIssues: string;
    usageData: string;
    weeklySummary?: string;
    agentRules?: string[];
  }
): Promise<string> {
  const rulesSection = data.agentRules && data.agentRules.length > 0
    ? `\n\n当前调教规则（必须遵守）：\n${data.agentRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';

  const systemPrompt = `你是一位专业的客户成功周报撰写专家。请基于提供的数据，生成一份结构化的客户成功周报。

核心原则：
1. 【从价值和结果切入】报告必须以商业价值结果开篇，管理层30秒内就能看到核心结论和关键指标，再逐步深入细节
2. 报告结构与仪表盘完全一致：价值总览 → 增长与留存 → 客户购买旅程 → 客户成效 → 运营保障
3. 逻辑链路：价值总览呈现核心结果 → 增长与留存验证商业基础 → 客户购买旅程拓展价值边界 → 客户成效验证价值交付 → 运营保障持续支撑
4. 每个模块遵循"结论先行→数据论证→行动建议"的倒金字塔写法

写作规范：
1. 每个章节必须引用具体数据，禁止空泛描述
2. 环比使用 ↑↓→ 箭头 + 百分比
3. 分析段落采用叙事风格，注重洞察而非数据罗列
4. 每个模块先给结论（1-2句话），再用数据论证，最后给行动建议
5. 客户健康度分层和异常检测是核心差异化内容，必须深入展开
6. 决策建议必须具体到"谁做什么、什么时候、预期效果"
7. 客户使用深度分为浅层/中度/深度三档进行分析
8. 危险层客户必须给出续费风险预判
9. 不要使用"投资人/上市/资本"等术语，使用"商业/价值/增长"替代${rulesSection}`;

  const userPrompt = `请生成以下周报，周次：${data.weekLabel}

数据概要：
${JSON.stringify(data, null, 2).substring(0, 8000)}

请严格按照以下"价值总览→增长与留存→客户购买旅程→客户成效→运营保障"递进结构生成Markdown格式周报。注意：第一部分"价值总览"是管理层速览区，必须最优先呈现核心商业结果，后续四部分才是详细分析。

# 客户成功价值分析报告（${data.weekLabel}）

## 一、价值总览
【写作要求】这是管理层30秒速览区。用最精炼的语言呈现本周核心商业结果，只说结论，不做论证。所有数字必须是本期实际值，不做模糊描述。

### 商业核心指标
用表格呈现5-7个最关键的商业指标（总客户数、续约率、增购率、客户净增、总ARR/收入、NPS、整体健康度），每项包含：本期值、环比变化、健康度判定(🟢🟡🟠🔴)。这张表是整份报告的"封面"。

### 核心结论
3句话概括本周商业表现：(1)增长态势（客户盘子是扩大还是缩小）(2)价值质量（续费率和客户贡献是否健康）(3)最大风险（最需要关注的问题是什么）。

### 关键风险信号
列出本周需要管理层关注的1-3个风险信号，每个用一句话说明影响面和紧迫度。

## 二、增长与留存
【写作要求】先给出1-2句核心结论（客户盘子的增减趋势和商业健康度），再用数据论证。

### 客户增长看板
客户净增（新增-流失）、各产品线客户数及增长趋势。用表格呈现本期vs上期对比。

### 客户贡献
ARPU、LTV、LTV/ARPU比值分析，按单产品/双产品/全链路拆分，论证商业健康度。LTV/ARPU>3为健康，<3需预警。

### 健康度分布
健康/关注/预警/危险客户分层及占比，重点分析危险层和预警层客户的特征与风险。

## 三、客户购买旅程
【写作要求】先给结论（交叉扩展的转化效率和商业增量），再展开各环节分析。

### 客户购买旅程与价值路径
客户从单产品→双产品→全链路的转化路径、转化率和ARPU跃升，论证每一步跨越的商业价值。

### 产品组合价值
7种客户组合的ARPU、LTV、续费率对比，含AIMI客户占比越高价值越高的论证。

### 续费增购流失
按产品线拆分续费/增购/流失，TOP3流失原因，续费风险预测。

## 四、客户成效
【写作要求】先给结论（客户是否真正从产品中获得了业务价值），再用使用数据和效果数据论证。

### AIMI核心成效
产品侧指标（使用率/活跃度/使用深度）+ 效果侧指标（粉丝增长/互动率/询盘率），论证客户使用产品后的实际业务效果。

### AIMI用户使用旅程
从签约Onboarding→账号绑定→首次发帖→持续发帖→高级功能使用的全链路转化漏斗，识别关键卡点与流失环节，给出破局建议。

### 产品线价值兑现
AIMI/广告/独立站分别的核心成效达成情况、客户获得了什么价值、哪些维度达标、哪些不足。

### 多产品协同价值
单产品 vs 双产品 vs 全链路客户的成效对比，交叉扩展的商业价值论证。

## 五、运营保障
【写作要求】先给结论（团队效能是否能支撑上述商业目标），再展开分析。

### 客成经理人效
人均服务量/覆盖率/响应时间/续费达成率/人均续费ARR，按产品线拆分，标注超负荷和效能瓶颈。

### 风险预警矩阵
按影响面×紧迫度排列，每项给出具体行动建议。

### 关键问题追踪
当前周期关键问题及解决进度。

## 六、决策建议与行动项
### P0 立即行动（不超过3条）
每条必须包含：谁做什么、什么时候完成、预期效果
### P1 本周内
### P2 持续关注

## 七、本周结论 & 下周重点
3句话总结本周核心发现 + 下周3个核心关注点`;

  return callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], undefined, 0.3);
}
