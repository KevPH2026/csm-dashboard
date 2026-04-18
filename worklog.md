# AIMI 客户成功价值分析系统 仪表盘重构 Worklog

## 日期：2026-03-05

## 修改总览

对 `/home/z/my-project/src/app/page.tsx` 进行了6项修改，所有修改已完成并通过构建验证。

---

### 修改1：重构顶部KPI — 从4个指标改为3个（发帖数/曝光数/互动数）

**位置**：约第724-750行（修改后）

**变更内容**：
- 将原来的4个KPI（产品使用率、粉丝增长率、AI功能渗透率、询盘转化率）替换为3个新指标
- **发帖数**：取 `versionBreakdown` 三个版本的 `count * avgPosts` 之和，使用 `<FileText />` 图标，直接显示数字（如"12,350"）
- **曝光数**：取三个版本的 `count * avgExposure` 之和，使用 `<Eye />` 图标，>=10000时显示"XX.X万"
- **互动数**：取三个版本的 `count * avgEngagement` 之和，使用 `<Heart />` 图标，>=10000时显示"XX.X万"
- grid布局从 `grid-cols-2 md:grid-cols-4` 改为 `grid-cols-3`
- 使用IIFE `{(() => {...})()}` 计算三个版本的总和

---

### 修改2：版本分层增加可切换隐藏Toggle

**位置**：约第1161-1200行（修改后）

**变更内容**：
- 新增state：`const [showVersionBreakdown, setShowVersionBreakdown] = useState(true);`（第220行）
- 在"AIMI 版本分层"标题行添加Switch开关，带"收起/展开"文字提示
- 版本分层的grid div用 `{showVersionBreakdown && (...)}` 包裹
- 默认展开（`useState(true)`）

---

### 修改3：去掉AI vs 非AI效果对比

**结果**：代码中不存在"AI vs 非AI"展示板块。`aiVsNonAI` 仅在类型定义（第48行）和数据初始化（第397行）中出现，未在渲染代码中展示。无需删除。

---

### 修改4：去掉功能模块使用率横向条形图

**位置**：约第1194-1226行（原代码）

**变更内容**：
- 整块删除"AIMI 功能模块使用率 — 横向条形图"部分（包含AI发帖、智能排期、多账号管理、数据分析、内容优化、竞品监控的横向条形图）
- 替换为注释：`{/* AIMI 功能模块使用率 — 已隐藏（先不展示） */}`
- Badge文案从"版本分层 · 功能使用率"改为"版本分层"

---

### 修改5：确认客户组合7种已展示正确 + 增加两个洞察卡

**确认项**：
- ✅ 7种组合已正确展示：仅AIMI、仅广告、仅独立站、AIMI+广告、AIMI+独立站、广告+独立站、全链路
- ✅ 含AIMI的客户占比已突出展示（蓝色圆点标识）
- ✅ 仅独立站、广告+独立站、AIMI+独立站的续费率显示"—"（`renewalRate: number | null`，null时显示"—"）

**新增洞察卡**（在核心洞察区域，grid-cols-2布局）：
1. **"AIMI + 任意老业务 = 续费率提升 XXpp"**：用 `(aimiAds.renewalRate - adsOnly.renewalRate)` 计算差值，显示如"+15.2pp"
2. **"全链路客户 LTV 是单产品客户的 XX倍"**：用 `(fullChain.ltv / aimiOnly.ltv)` 计算倍数

---

### 修改6：独立站不展示续费率

**变更内容**：
1. **续费与留存模块**（模块四）：已确认独立站展示"客户生命周期"指标（activeRate/lowActiveRate/silentRate/avgCooperationMonths），而非续费率 ✅
2. **productLineEfficiencyData**（第601-608行）：将独立站的 `renewalAchievementRate` 从 `csData.renewalChurn.site.renewalRate` 改为 `csData.siteLifecycle?.activeRate ?? 62`，`renewalARR` 设为0
3. **团队效率表格**（约第1868-1897行）：
   - 独立站的Badge显示前缀改为"活跃率"
   - 独立站的"人均续费ARR"列显示"—"
   - 独立站的"计算备注"列显示"独立站按活跃率统计"

---

## 构建验证

- `npx next build`：✅ 编译成功，无错误
- `bun run lint`：✅ 仅有2个预存warning（非本次修改引入），0 errors
- 开发服务器运行正常

## 文件变更

- `/home/z/my-project/src/app/page.tsx`：6项修改均在此文件中完成

---

## 日期：2026-04-16

## 修改总览：投资人视角倒推的四层逻辑重构

### 修改1：4层逻辑重排 + 色块区分

**原结构**：AIMI运营核心 → 客户增长与商业价值 → 产品运营分析 → 客户价值深度分析 → 运营管理

**新结构**（投资人视角倒推）：
1. **🟢 投资人与增长**（emerald绿）— 客户增长看板 + 单位经济学 + 续费与留存速览(新增)
2. **🟠 商业价值与产品组合**（amber橙）— 7种客户组合 + 客户旅程桑基图 + ARR构成
3. **🔵 经营结果**（indigo蓝）— AIMI核心KPI + 全局概览 + AIMI运营总览 + 产品线业务运营
4. **🟤 运营管理**（slate灰）— 客成经理人效 + 续费增购详细分析 + 关键问题

**Header副标题**：`商业价值驱动·客户增长为核心` → `投资人视角·价值倒推管理`

### 修改2：新增"续费与留存速览"卡片（第1层）

精简KPI卡片，包含：AIMI续费率、广告续费率、独立站活跃率、NPS。投资人核心关注指标前置。

### 修改3：双数据模式（Demo + 真实）

- Header新增 `数据: Demo | 真实` 切换按钮
- 新增 `forceDemoMode` state 和 `isDisplayingDemo` 计算属性
- 所有 `dashboardData?.isDemo` 示例数据标记统一改为 `isDisplayingDemo`
- 新增 `formatOrNa()` 辅助函数，缺失数据显示"暂无"

### 修改4：桑基图交互化（sankey-diagram.tsx）

- **点击路径高亮**：选中路径fillOpacity=0.5/strokeWidth=2，其他变暗
- **图例可点击**：隐藏/显示某产品线的所有路径
- **Hover tooltip**：显示路径名、客户数、平均天数、ARPU
- **底部筛选栏**：[全部] [仅AIMI入口] [仅广告入口] [仅独立站入口]
- 新增5个state：selectedPath、hiddenProducts、hoveredPath、filterProduct、mousePos

### 修改5：续费增购分析移至第4层

原续费/增购/流失详细分析（含柱状图）从"客户价值深度分析"移至第4层"运营管理"，因为这是管理过程细节。

## 构建验证

- `npx next build`：✅ 编译成功，无错误
- HTML SSR验证：✅ 包含"投资人视角·价值倒推管理"副标题
- HTML SSR验证：✅ 包含Demo/真实切换按钮

## 文件变更

- `/home/z/my-project/src/app/page.tsx`：4层重排、色块、双数据模式、新增1C卡片
- `/home/z/my-project/src/components/sankey-diagram.tsx`：交互功能（点击/高亮/隐藏/tooltip/筛选）
---
Task ID: module-naming-framework-update
Agent: main
Task: 按方案A更新四模块命名和分析框架

Work Log:
- 将框架标题从"分析框架：从价值倒推管理"改为"客户成功价值分析体系"
- 模块一：增长与单位经济 → 增长与留存（客户规模·健康分布·续约留存）
- 模块二：商业价值与产品组合 → 价值杠杆（产品组合·客户旅程·交叉扩展）
- 模块三：经营结果 → 客户成效（客户使用产品后的效果与价值）
- 模块四：运营管理过程 → 运营保障（人效·风险管控·行动追踪）
- 逻辑链路更新：增长与留存验证商业基础 → 价值杠杆放大单客价值 → 客户成效确认价值交付 → 运营保障价值持续落地
- 更新概览卡片、模块头部、MODULE_CONFIG常量、minimax.ts报告生成prompt
- 修复SSR构建错误（window is not defined），改用clientOrigin state
- 添加Skills API DELETE端点
- 构建成功

Stage Summary:
- 所有命名已按方案A统一更新
- 报告生成prompt同步更新
- 构建通过，ready for deploy

---
Task ID: dual-data-model
Agent: main
Task: 实现Demo/真实数据双数据模式，切换时完整覆盖

Work Log:
- 重构dashboard API：GET返回demoData+realData两套数据，POST只保存真实数据(isDemo=false)
- DB查询加isDemo: false条件，demo数据始终由代码生成，真实数据从DB加载
- 前端state拆分：demoData + realData + weekLabel，通过isDisplayingDemo切换
- 上传真实数据后自动切换到真实模式(setForceDemoMode(false))
- 点击"真实"按钮时，若无真实数据则提示并跳转数据源tab
- flow-data API同步修改：优先加载DB中的真实数据
- 修复所有dashboardData?.weekLabel引用为weekLabel状态
- 构建成功

Stage Summary:
- Demo/真实双数据模型完整实现
- Demo数据：始终由generateCSValueDashboardData()生成，永不覆盖
- 真实数据：上传Excel后存DB(isDemo=false)，页面加载时从DB读取
- 切换按钮：Demo/真实一键切换，无真实数据时友好提示
---
Task ID: 1
Agent: main
Task: 实现真实数据模式 - 基于用户上传的Excel数据创建真实数据集，支持Demo/真实数据切换

Work Log:
- 解析了4个上传的Excel文件：
  - 25~26年跨境客户业绩情况.xlsx: 25,886条销售记录，1,765个2026年客户，总业绩¥35.2M
  - 新社媒服务运营表-414.xlsx: 474个AIMI客户，10个CSM经理，3种版本(成长版413/高级版52/基础版9)
  - 指标明细数据.xlsx: 135个客户，457,740曝光，2,868发帖，4,929互动
  - 埃米产品问题反馈收集列表.xlsx: 63个问题(咨询6/故障33/需求24)，解决率67%
- 创建了 /home/z/my-project/src/lib/real-data.ts，包含完整的14个数据段的CSValueDashboardData
- 修改了 page.tsx 的数据切换逻辑：
  - 添加了 useStaticRealData 状态变量
  - 点击"真实"按钮时自动加载预构建的真实数据
  - 点击"Demo"按钮时重置回Demo模式
  - 更新了数据模式提示文案
- 构建成功，无错误

Stage Summary:
- 真实数据模式已实现，所有14个数据段（包括之前缺失的aimiOperationDetail, siteLifecycle, customerComboDetail）都已填充
- 数据基于实际Excel文件分析得出，数字真实可信
- 双模式切换：Demo（随机生成）/ 真实（Excel数据）一键切换

---
Task ID: 1
Agent: main
Task: 修复报告生成功能不工作的问题 + 优化报告逻辑

Work Log:
- 诊断发现API端正常工作（curl测试返回200），问题在前端错误处理
- 前端handleGenerateReport缺少res.ok检查，API返回错误时静默失败无反馈
- 增加AbortController 2分钟超时控制
- 增加!res.ok错误处理，返回具体错误信息而非静默失败
- 增加data.success为false的错误反馈
- 改进report-viewer.tsx的加载状态：增加旋转动画、显示预估等待时间
- API路由增加maxDuration=120配置、详细日志和耗时统计
- 优化报告生成prompt：增加"价值总览"章节，从价值和结果切入再展开细节
- 更新report-viewer.tsx的MODULE_COLORS映射：增加价值总览、核心结论、关键风险信号等配色
- 更新fallback报告模板：按新结构排列（价值总览→增长与留存→...）
- 构建并重启生产服务器

Stage Summary:
- 报告生成前端错误处理修复：增加res.ok检查、超时控制、详细错误提示
- 报告逻辑优化：新增"一、价值总览"章节（商业核心指标表+核心结论+关键风险信号），从价值和结果切入
- 新结构：价值总览→增长与留存→客户购买旅程→客户成效→运营保障→决策建议→结论
- 所有改动已构建部署
