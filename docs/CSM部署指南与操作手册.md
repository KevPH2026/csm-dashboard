# CSM 客户成功价值驾驶舱 — 部署指南与操作手册

> **版本：** v1.1 | **更新日期：** 2026-05-25  
> **项目仓库：** https://github.com/KevPH2026/csm-dashboard  
> **GitHub Pages：** https://kevph2026.github.io/csm-dashboard/  
> **项目版本：** v0.2.0

---

## 目录

1. [项目概述](#1-项目概述)
2. [系统架构](#2-系统架构)
3. [本地开发环境搭建](#3-本地开发环境搭建)
4. [GitHub Pages 部署（静态预览模式）](#4-github-pages-部署静态预览模式)
5. [Vercel 部署（完整功能模式）](#5-vercel-部署完整功能模式)
6. [z.ai 平台部署说明](#6-zai-平台部署说明)
7. [环境变量说明](#7-环境变量说明)
8. [数据库管理](#8-数据库管理)
9. [API 接口文档](#9-api-接口文档)
10. [AI 功能配置与使用](#10-ai-功能配置与使用)
11. [数据上传与处理](#11-数据上传与处理)
12. [前端功能操作指南](#12-前端功能操作指南)
13. [常见问题排查](#13-常见问题排查)
14. [运维监控](#14-运维监控)
15. [项目目录结构](#15-项目目录结构)

---

## 1. 项目概述

### 1.1 项目定位

CSM 客户成功价值驾驶舱（CSM Value Cockpit）是一个基于 Next.js 的 BI 数据可视化与智能分析平台，专为跨境电商客户成功团队设计。系统采用 4 层色块架构（价值总览 → 增长与留存 → 客户购买旅程 → 客户成效 → 运营保障），将客户价值数据转化为可执行的商业洞察。

### 1.2 功能模块清单

| 功能模块 | 说明 | 需要后端 | 静态可用 |
|---------|------|---------|---------|
| 仪表盘展示 | 4 层色块架构数据可视化、KPI 卡片、趋势图 | ❌ | ✅ |
| 健康分布图 | 客户健康度分布（健康/关注/预警/危险）与趋势 | ❌ | ✅ |
| 续约留存分析 | 续约率、留存率、流失原因分析 | ❌ | ✅ |
| 客户购买旅程 | 单产品→双产品→全链路转化漏斗与价值路径 | ❌ | ✅ |
| AI 智能对话 | 对话式数据钻取分析、调教助手 | ✅ | ❌ |
| 周报自动生成 | AI 驱动的客户成功周报自动撰写 | ✅ | ❌ |
| Excel 数据上传 | 上传 CS 实施/销售数据，自动解析入库 | ✅ | ❌ |
| 模型配置 | 前端配置 LLM 提供商、API Key、模型参数 | ✅ | ❌ |
| 调教规则 | 自然语言调教 AI 报告生成逻辑 | ✅ | ❌ |
| 企微通知 | 企业微信 Webhook 推送周报 | ✅ | ❌ |

### 1.3 三种部署模式对比

| 特性 | 本地开发 | GitHub Pages | Vercel 部署 |
|------|---------|-------------|------------|
| 数据可视化 | ✅ | ✅ | ✅ |
| AI 对话/调教 | ✅ | ❌ | ✅ |
| 报告生成 | ✅ | ❌ | ✅ |
| 数据上传 | ✅ | ❌ | ✅ |
| 数据库 | ✅ SQLite | ❌ 内置数据 | ⚠️ Demo 模式 |
| 模型配置 | ✅ SDK + 自定义 | ❌ | ✅ 自定义 API |
| 访问地址 | localhost:3000 | kevph2026.github.io | xxx.vercel.app |
| 费用 | 免费 | 免费 | 免费套餐可用 |
| 部署难度 | 简单 | 自动 | 简单 |

---

## 2. 系统架构

### 2.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | Next.js (App Router) | 16.x | React 全栈框架 |
| UI 组件 | Tailwind CSS + shadcn/ui | 4.x / latest | 样式与组件库 |
| 图表库 | Recharts | 2.15+ | 数据可视化 |
| 状态管理 | Zustand | 5.x | 轻量状态管理 |
| 后端 | Next.js API Routes | — | Serverless 函数 |
| 数据库 | SQLite (Prisma ORM) | 6.x | 本地开发用 |
| AI 引擎 | z-ai-web-dev-sdk / OpenAI 兼容 | 0.0.17+ | 多提供商支持 |
| 部署 | GitHub Pages / Vercel | — | 静态 / 全功能 |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                      用户浏览器                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│  │ 4层仪表盘  │ │ AI对话    │ │ 报告生成  │ │ 数据上传 │ │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────┬────┘ │
└────────┼─────────────┼─────────────┼─────────────┼──────┘
         │             │             │             │
┌────────▼─────────────▼─────────────▼─────────────▼──────┐
│                  Next.js API Routes                      │
│  ┌─────────┐ ┌─────┐ ┌──────┐ ┌──────┐ ┌───────────┐  │
│  │dashboard│ │chat │ │report│ │process│ │model-config│  │
│  └────┬────┘ └──┬──┘ └───┬──┘ └───┬──┘ └─────┬─────┘  │
└───────┼──────────┼────────┼────────┼───────────┼────────┘
        │          │        │        │           │
┌───────▼──────────▼────────▼────────▼───────────▼────────┐
│                    核心服务层                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Prisma   │ │ minimax  │ │ data-    │ │ demo-     │  │
│  │ SQLite   │ │ LLM引擎  │ │ processor│ │ data      │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└──────────────────────┬───────────────────────────────────┘
                       │
           ┌───────────▼───────────┐
           │    LLM API 服务       │
           │  ┌───────┐ ┌───────┐ │
           │  │z-ai   │ │OpenAI │ │
           │  │SDK    │ │Compat │ │
           │  └───────┘ └───────┘ │
           │  ┌───────┐ ┌───────┐ │
           │  │DeepSeek│ │智谱GLM│ │
           │  └───────┘ └───────┘ │
           └───────────────────────┘
```

### 2.3 数据流架构

```
方式 A: 本地开发（完整功能）
  Excel文件 → /api/process → data-processor → Prisma → SQLite
  SQLite → /api/dashboard → 前端展示
  用户提问 → /api/chat → minimax(LLM) → AI回复
  生成报告 → /api/generate-report → minimax(LLM) → Markdown报告

方式 B: GitHub Pages（静态预览）
  内置 demo-data.ts → generateCSValueDashboardData() → 前端直接渲染
  （无 API、无数据库、无 AI 功能）

方式 C: Vercel（完整功能 + Demo 数据）
  内置 demo-data.ts → 前端展示（数据库不可用时的降级方案）
  用户提问 → /api/chat → minimax(LLM, 使用自定义API) → AI回复
  生成报告 → /api/generate-report → minimax(LLM) → Markdown报告
```

---

## 3. 本地开发环境搭建

### 3.1 前置条件

| 工具 | 版本要求 | 安装方式 | 验证命令 |
|------|---------|----------|---------|
| Node.js | ≥ 18.x | https://nodejs.org/ | `node -v` |
| npm | ≥ 9.x | 随 Node.js 安装 | `npm -v` |
| Git | ≥ 2.x | https://git-scm.com/ | `git --version` |

### 3.2 完整安装步骤

```bash
# 1. 克隆仓库
git clone https://github.com/KevPH2026/csm-dashboard.git
cd csm-dashboard

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置（详见第 7 节）

# 4. 初始化 Prisma 客户端
npx prisma generate

# 5. 创建 SQLite 数据库并同步表结构
npx prisma db push

# 6. 启动开发服务器
npm run dev

# 7. 打开浏览器访问
# http://localhost:3000
```

### 3.3 验证安装

```bash
# 健康检查
curl http://localhost:3000/api/health
# 应返回:
# {"status":"healthy","checks":{"database":"ok","llm":"sdk-available"}}

# 获取仪表盘数据
curl http://localhost:3000/api/dashboard | head -c 500
# 应返回 JSON 数据

# 测试 AI 对话
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好"}'
# 应返回 AI 回复
```

### 3.4 常用开发命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（端口 3000） |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 运行代码检查 |
| `npx prisma studio` | 打开数据库可视化管理（localhost:5555） |
| `npx prisma db push` | 同步数据库表结构 |
| `npx prisma db push --force-reset` | 重置数据库（清空所有数据） |
| `npx prisma generate` | 重新生成 Prisma 客户端 |

---

## 4. GitHub Pages 部署（静态预览模式）

### 4.1 当前状态

✅ **已部署成功**  
访问地址：**https://kevph2026.github.io/csm-dashboard/**

### 4.2 自动部署机制

项目配置了 GitHub Actions 工作流（`.github/workflows/deploy.yml`），每次推送到 `main` 分支时自动构建部署。

**工作流完整步骤：**

1. **Checkout** — 检出代码
2. **Setup Node.js** — 安装 Node.js 20
3. **Install dependencies** — 执行 `npm ci` 安装依赖
4. **Generate Prisma Client** — 执行 `npx prisma generate`
5. **Remove API routes** — 删除 `src/app/api` 目录（静态模式不需要后端）
6. **Build static site** — 设置 `NEXT_STATIC_EXPORT=1`，执行 `npm run build`
7. **Add .nojekyll** — 添加 `.nojekyll` 文件防止 GitHub 忽略下划线目录
8. **Upload artifact** — 上传构建产物
9. **Deploy to GitHub Pages** — 部署到 GitHub Pages

### 4.3 触发部署的方式

```bash
# 方式1: 推送代码到 main 分支（自动触发）
git push origin main

# 方式2: 通过 GitHub CLI 手动触发工作流
gh workflow run deploy.yml --ref main

# 方式3: 通过 GitHub 网页手动触发
# 进入仓库 → Actions → Deploy to GitHub Pages → Run workflow
```

### 4.4 部署前置条件检查清单

- [ ] 仓库必须为 **Public**（公开）
- [ ] GitHub Pages 必须启用，Source 设置为 **GitHub Actions**
- [ ] 工作流文件存在：`.github/workflows/deploy.yml`
- [ ] `next.config.ts` 中包含静态导出配置（`output: 'export'` when `NEXT_STATIC_EXPORT=1`）
- [ ] `package.json` 中 `build` 脚本包含 `prisma generate && next build`

### 4.5 检查/修复 Pages 状态

```bash
# 查看当前 Pages 状态
gh api repos/KevPH2026/csm-dashboard/pages

# 启用 Pages（如果未启用）
gh api repos/KevPH2026/csm-dashboard/pages -X POST -f build_type=workflow

# 将仓库设为公开
gh api repos/KevPH2026/csm-dashboard -X PATCH -f visibility=public

# 查看最近的工作流运行状态
gh run list --repo KevPH2026/csm-dashboard --limit 5

# 查看特定运行的详细日志
gh run view <RUN_ID> --repo KevPH2026/csm-dashboard --log
```

### 4.6 局限性说明

| 局限 | 原因 | 影响 |
|------|------|------|
| 无 AI 对话 | 无后端 API 路由 | AI 钻取、调教功能不可用 |
| 无报告生成 | 无后端 LLM 调用 | 自动周报功能不可用 |
| 无数据上传 | 无后端处理能力 | 无法导入 Excel 数据 |
| 内置演示数据 | 无数据库 | 数据为 `demo-data.ts` 生成的模拟数据 |
| 页面刷新可能 404 | SPA 路由问题 | 需从首页进入再导航 |

### 4.7 自定义域名（可选）

```bash
# 在仓库设置中添加自定义域名
gh api repos/KevPH2026/csm-dashboard/pages -X POST \
  -f cname=your-domain.com

# 在域名注册商处添加 CNAME 记录
# CNAME your-domain.com → kevph2026.github.io
```

---

## 5. Vercel 部署（完整功能模式）

### 5.1 前提条件

- GitHub 账号
- Vercel 账号（可用 GitHub 登录，免费套餐即可）
- LLM API 密钥（至少一种：OpenAI / DeepSeek / 智谱 / 通义千问等）

### 5.2 网页端部署步骤（推荐）

#### 步骤1：登录 Vercel

1. 访问 https://vercel.com
2. 点击 **"Sign Up"** 或 **"Log In"**
3. 选择 **"Continue with GitHub"**

#### 步骤2：导入项目

1. 点击 **"Add New..."** → **"Project"**
2. 在列表中找到 **KevPH2026/csm-dashboard**
3. 点击 **"Import"**

#### 步骤3：配置项目

| 配置项 | 值 | 说明 |
|-------|----|----|
| Framework Preset | Next.js | 自动检测 |
| Root Directory | ./ | 默认 |
| Build Command | npm run build | 默认 |
| Output Directory | .next | 默认 |

#### 步骤4：设置环境变量（关键！）

点击 "Environment Variables" 展开，添加以下变量：

| 变量名 | 示例值 | 必填 | 说明 |
|--------|-------|------|------|
| `LLM_API_KEY` | `sk-xxxxxxxxxx` | ✅ | AI 大模型 API 密钥 |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1/chat/completions` | ✅ | AI API 接口地址 |
| `LLM_MODEL_NAME` | `deepseek-chat` | ✅ | AI 模型名称 |
| `DATABASE_URL` | `file:./db/custom.db` | ❌ | 数据库连接串（Vercel 无持久化） |

#### 步骤5：部署

1. 点击 **"Deploy"** 按钮
2. 等待构建完成（约 2-3 分钟）
3. 部署成功后会获得访问地址，如：`https://csm-dashboard-xxxx.vercel.app`

### 5.3 CLI 端部署步骤

```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 登录（会打开浏览器授权）
vercel login

# 3. 链接项目
cd /path/to/csm-dashboard
vercel link

# 4. 设置环境变量
vercel env add LLM_API_KEY
vercel env add LLM_BASE_URL
vercel env add LLM_MODEL_NAME

# 5. 部署到生产环境
vercel --prod
```

### 5.4 部署后验证

```bash
# 健康检查
curl https://your-app.vercel.app/api/health

# 测试 AI 对话
curl -X POST https://your-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好，请分析一下客户健康度"}'

# 测试仪表盘数据
curl https://your-app.vercel.app/api/dashboard | head -c 500
```

### 5.5 Vercel 注意事项

| 项目 | 说明 |
|------|------|
| 数据库 | Vercel Serverless 无持久化文件系统，SQLite 不可用，自动降级为 Demo 数据 |
| AI 功能 | 完全可用，需配置 `LLM_API_KEY` 等环境变量 |
| 自动部署 | 每次推送到 GitHub 自动触发重新部署 |
| 带宽限制 | 免费套餐每月 100GB |
| 函数超时 | 免费套餐 API 路由最长 10 秒，Pro 套餐 60 秒 |
| 报告生成 | 可能因超时失败，已设置 `maxDuration = 120`（需 Pro 套餐） |

### 5.6 自定义域名

1. Vercel 项目设置 → Domains
2. 添加自定义域名
3. 在域名注册商处添加 CNAME 记录指向 `cname.vercel-dns.com`

---

## 6. z.ai 平台部署说明

### 6.1 当前状态

❌ **z.ai 平台部署功能已失效**

### 6.2 问题说明

z.ai 平台目前存在以下故障：

| 故障现象 | 详情 |
|---------|------|
| 部署 API 返回 410 Gone | 平台部署接口已下线 |
| DNS 解析失败 | 部分 z.ai 域名无法解析 |
| 部署页面无限转圈 | 显示"正在努力部署中"但永远无法完成 |

### 6.3 替代方案

- **静态预览**：使用 GitHub Pages（已部署）
- **完整功能**：使用 Vercel 部署
- **本地开发**：使用 `npm run dev`（z-ai-web-dev-sdk 在 z.ai 环境外也可使用）

---

## 7. 环境变量说明

### 7.1 完整环境变量清单

| 变量名 | 默认值 | 说明 | 必填 | 适用环境 |
|--------|-------|------|------|---------|
| `DATABASE_URL` | `file:./db/custom.db` | SQLite 数据库路径 | 本地 | 本地开发 |
| `LLM_API_KEY` | 无 | AI 大模型 API 密钥 | AI 功能必填 | Vercel/本地 |
| `LLM_BASE_URL` | 无 | AI API 接口完整地址 | AI 功能必填 | Vercel/本地 |
| `LLM_MODEL_NAME` | 无 | AI 模型名称 | AI 功能必填 | Vercel/本地 |
| `NEXT_STATIC_EXPORT` | 无 | 设为 `1` 时启用静态导出模式 | 仅 CI | GitHub Actions |
| `NEXTAUTH_SECRET` | 无 | NextAuth 认证密钥 | 可选 | 如需认证 |
| `NEXTAUTH_URL` | 无 | NextAuth 回调 URL | 可选 | 如需认证 |

### 7.2 .env 配置模板

```bash
# .env 文件模板

# ---------- 数据库 ----------
# SQLite（本地开发默认）
DATABASE_URL="file:./db/custom.db"

# PostgreSQL（Vercel 生产环境推荐，需修改 prisma/schema.prisma）
# DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"

# ---------- LLM API ----------
# 方式1: 使用 OpenAI 兼容 API（推荐用于 Vercel）
LLM_API_KEY="sk-your-api-key-here"
LLM_BASE_URL="https://api.deepseek.com/v1/chat/completions"
LLM_MODEL_NAME="deepseek-chat"

# 方式2: 使用 z-ai-web-dev-sdk（z.ai 平台自动可用，无需配置）
# 方式3: 在前端"模型配置"页面动态设置（存储在 localStorage）
```

### 7.3 支持的 LLM 提供商

| 提供商 | LLM_BASE_URL | 推荐模型 | 特点 |
|--------|-------------|---------|------|
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | `deepseek-chat` | 性价比最高，中文优秀 |
| 智谱 GLM | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | `glm-4-flash` | 国内部署，速度快 |
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` | 最强，但需海外网络 |
| 月之暗面 | `https://api.moonshot.cn/v1/chat/completions` | `moonshot-v1-8k` | 长上下文 |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-plus` | 阿里云生态 |
| Azure OpenAI | `https://YOUR.openai.azure.com/openai/deployments/YOUR/chat/completions?api-version=2024-02-15-preview` | 自定义 | 企业级 |
| Ollama 本地 | `http://localhost:11434/v1/chat/completions` | 自定义 | 完全本地部署 |

### 7.4 LLM 优先级机制

系统使用 `minimax.ts` 中的 `callLLM()` 函数调用 AI，优先级逻辑如下：

```
1. 如果 provider = "zai-sdk" 或未配置 API Key
   → 优先使用 z-ai-web-dev-sdk（z.ai 环境自动可用）
   → 如果 SDK 失败且配置了自定义 API → 降级使用自定义 API

2. 如果 provider = "openai"/"custom"/"minimax" 且配置了 API Key
   → 优先使用自定义 API（OpenAI 兼容接口）
   → 如果 API 失败 → 降级使用 z-ai-web-dev-sdk

3. 两者都失败 → 返回错误信息
```

### 7.5 前端模型配置

除了环境变量，用户还可以在前端 **"模型配置"** 页面动态设置 LLM 参数：

- 访问路径：仪表盘 → 模型配置（齿轮图标）
- 存储位置：`localStorage` 中的 `csm_model_config`
- 配置项：提供商、API Key、Base URL、模型名称、温度、最大 Token 数
- 支持连接测试：点击"测试连接"验证配置是否正确

---

## 8. 数据库管理

### 8.1 数据库架构

项目使用 Prisma ORM + SQLite，数据模型定义在 `prisma/schema.prisma` 中。

#### 数据模型清单

| 模型 | 说明 | 核心字段 |
|------|------|---------|
| `DataSource` | 上传的数据源文件 | type, fileName, weekNumber, rawData |
| `MetricSnapshot` | 周度指标快照 | weekNumber, totalOrders, trainingRate 等 |
| `WeeklyReport` | 生成的周报 | weekNumber, title, content |
| `BoardMemory` | 看板键值存储 | key, value |
| `UnresolvedItem` | 未解决问题跟踪 | description, status, weekNumber |
| `ModelConfig` | LLM 模型配置 | provider, apiKey, baseUrl, modelName |
| `SkillConfig` | Skill 技能配置 | skillKey, parameters |
| `ChatMessage` | AI 对话历史 | role, content, timestamp |
| `AgentRule` | AI 调教规则 | ruleContent, category, source |
| `CSValueData` | CS 价值仪表盘数据 | weekNumber, csValueJSON, isDemo |

### 8.2 数据库操作命令

```bash
# 打开 Prisma Studio（可视化管理）
npx prisma studio
# 浏览器访问 http://localhost:5555

# 同步表结构（开发模式，不会删除数据）
npx prisma db push

# 强制重置数据库（清空所有数据！）
npx prisma db push --force-reset

# 生成 Prisma 客户端
npx prisma generate

# 查看数据库文件
ls -la prisma/db/
```

### 8.3 数据库备份与恢复

```bash
# 备份
cp prisma/db/custom.db prisma/db/custom.db.bak.$(date +%Y%m%d)

# 恢复
cp prisma/db/custom.db.bak.YYYYMMDD prisma/db/custom.db
```

### 8.4 数据模式说明

系统采用双模式数据架构：

- **Demo 模式**：使用 `demo-data.ts` 中 `generateCSValueDashboardData()` 生成的模拟数据，在数据库不可用时自动启用
- **真实模式**：用户上传 Excel 后，经过 `data-processor.ts` 处理存入 SQLite，前端通过 `/api/dashboard` 读取

判断逻辑：
```
1. 优先从 DB 查询 isDemo=false 的真实数据
2. 如无真实数据，使用 demo-data.ts 生成的演示数据
3. /api/dashboard 返回中 hasRealData 字段标识是否有真实数据
```

---

## 9. API 接口文档

### 9.1 API 清单

| 端点 | 方法 | 说明 | 静态模式 |
|------|------|------|---------|
| `/api/health` | GET | 健康检查 | ❌ |
| `/api/dashboard` | GET | 获取仪表盘数据 | ❌ |
| `/api/dashboard` | POST | 保存仪表盘数据 | ❌ |
| `/api/chat` | POST | AI 对话 | ❌ |
| `/api/chat` | GET | 获取对话历史 | ❌ |
| `/api/generate-report` | POST | 生成周报 | ❌ |
| `/api/process` | POST | 处理上传的 Excel | ❌ |
| `/api/excel-preview` | POST | 预览 Excel 数据 | ❌ |
| `/api/flow-data` | GET | 获取流程数据 | ❌ |
| `/api/model-config` | GET | 获取模型配置 | ❌ |
| `/api/model-config` | POST | 保存模型配置 | ❌ |
| `/api/agent-rules` | GET | 获取调教规则 | ❌ |
| `/api/agent-rules` | POST | 添加调教规则 | ❌ |
| `/api/skills` | GET | 获取 Skill 列表 | ❌ |
| `/api/memory` | GET | 获取记忆数据 | ❌ |
| `/api/reports` | GET | 获取历史报告 | ❌ |
| `/api/notify` | POST | 发送通知 | ❌ |

### 9.2 核心接口详细说明

#### `/api/health` — 健康检查

```
GET /api/health

Response 200:
{
  "status": "healthy",
  "timestamp": "2026-05-25T12:00:00.000Z",
  "uptime": 3600,
  "responseTime": "52ms",
  "checks": {
    "database": "ok",        // "ok" | "error"
    "llm": "sdk-available"   // "sdk-available" | "configured" | "not-configured"
  },
  "version": "0.2.0"
}
```

#### `/api/dashboard` — 仪表盘数据

```
GET /api/dashboard

Response 200:
{
  "weekNumber": 21,
  "year": 2026,
  "weekLabel": "W21 2026 (5/19-5/25)",
  "demoData": {
    "metrics": [...],            // KPI 卡片数据
    "healthDistribution": {...}, // 健康度分布
    "anomalies": [...],          // 异常指标
    "csValueData": {...},        // 4层仪表盘完整数据
    "isDemo": true
  },
  "realData": null,              // 真实数据（上传后才有）
  "hasRealData": false           // 是否有真实数据
}

POST /api/dashboard
Body: { "csValueData": {...}, "isDemo": false }
Response: { "success": true, "id": "xxx" }
```

#### `/api/chat` — AI 对话

```
POST /api/chat
Body: {
  "message": "分析一下健康度分布",          // 用户消息（必填）
  "chatHistory": [                         // 对话历史
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "reportContext": "...",                   // 报告上下文（可选）
  "skillContext": "...",                    // Skill 上下文（可选）
  "agentRules": ["规则1", "规则2"]          // 调教规则（可选）
}

Response 200:
{ "reply": "根据数据分析，客户健康度分布如下..." }
```

#### `/api/generate-report` — 生成周报

```
POST /api/generate-report
Body: {
  "weekLabel": "W21 2026",      // 周标签（可选，默认当前周）
  "weeklySummary": "...",        // 一线补充信息（可选）
  "agentRules": "规则1\n规则2"   // 调教规则（可选，换行分隔）
}

Response 200:
{
  "success": true,
  "report": "# 客户成功价值分析报告（W21 2026）\n\n## 一、价值总览\n...",
  "weekLabel": "W21 2026"
}

注意：此接口耗时较长（10-60秒），取决于 LLM 响应速度。
已设置 maxDuration = 120（需 Vercel Pro 套餐支持）。
```

#### `/api/process` — 处理 Excel 数据

```
POST /api/process
Body: multipart/form-data
  - file: Excel 文件（.xlsx/.xls/.csv）

Response 200:
{
  "success": true,
  "message": "数据处理完成",
  "stats": {
    "totalRows": 42,
    "validRows": 38,
    "skippedRows": 4
  }
}
```

#### `/api/model-config` — 模型配置

```
GET /api/model-config
Response: { "config": { "provider": "zai-sdk", "apiKey": "***", "baseUrl": "...", ... } }

POST /api/model-config
Body: {
  "provider": "openai",
  "apiKey": "sk-xxx",
  "baseUrl": "https://api.deepseek.com/v1/chat/completions",
  "modelName": "deepseek-chat",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

---

## 10. AI 功能配置与使用

### 10.1 配置步骤

#### 方式1：环境变量配置（推荐用于 Vercel）

在 Vercel 项目设置 → Environment Variables 中添加：

```
LLM_API_KEY=sk-your-key
LLM_BASE_URL=https://api.deepseek.com/v1/chat/completions
LLM_MODEL_NAME=deepseek-chat
```

#### 方式2：前端动态配置

1. 打开仪表盘页面
2. 点击右上角 **齿轮图标** → **模型配置**
3. 选择提供商、输入 API Key、Base URL、模型名称
4. 点击 **"测试连接"** 验证配置
5. 保存后立即生效

#### 方式3：.env 文件配置（本地开发）

```bash
# 编辑 .env 文件
LLM_API_KEY=sk-your-key
LLM_BASE_URL=https://api.deepseek.com/v1/chat/completions
LLM_MODEL_NAME=deepseek-chat
```

### 10.2 AI 功能使用

#### 智能对话钻取

1. 打开仪表盘页面
2. 点击任意指标卡片或图表区域
3. 在弹出的对话窗口中输入问题，例如：
   - "分析一下危险层客户特征"
   - "续约率为什么下降？"
   - "AIMI 产品的使用深度如何？"
4. AI 会结合当前仪表盘数据给出分析

#### 周报自动生成

1. 打开仪表盘页面
2. 点击 **"生成报告"** 按钮
3. 可选择报告类型（周报/月报）
4. 可附加"一线补充信息"
5. AI 自动生成结构化的客户成功价值分析报告
6. 报告保存到数据库，可在"历史报告"中查看

#### 自然语言调教

1. 在 AI 对话中输入调教指令，例如：
   - "以后报告里不要用投资人术语"
   - "危险层客户分析要更详细"
   - "每条建议必须包含责任人和截止日期"
2. AI 会理解意图并生成规则
3. 规则以 `[规则]` 标记输出，确认后保存到 `AgentRule` 表
4. 后续报告生成会自动遵守这些规则

### 10.3 AI 提示词架构

```
用户提问
  → System Prompt（你是一位资深 CSM 分析师/周报撰写专家）
  → 注入仪表盘数据上下文（csValueData）
  → 注入调教规则（agentRules）
  → 注入对话历史（chatHistory, 最近10轮）
  → LLM 生成回复
  → 前端渲染 Markdown
```

报告生成遵循"价值总览→增长与留存→客户购买旅程→客户成效→运营保障"5层递进结构，每个模块采用"结论先行→数据论证→行动建议"的倒金字塔写法。

---

## 11. 数据上传与处理

### 11.1 支持的文件格式

| 格式 | 扩展名 | 说明 |
|------|-------|------|
| Excel | `.xlsx`, `.xls` | 推荐格式 |
| CSV | `.csv` | 逗号分隔 |

### 11.2 上传步骤

1. 打开仪表盘页面
2. 点击 **"数据上传"** 按钮
3. 选择 Excel/CSV 文件
4. 系统自动解析并显示预览
5. 确认后数据导入数据库

### 11.3 数据处理流程

```
Excel 文件上传
  → /api/excel-preview（预览解析结果）
  → 用户确认
  → /api/process
    → xlsx 库解析文件
    → data-processor.ts 清洗数据
    → AI 智能表头映射（mapHeadersWithLLM）
    → 存入 DataSource 表
    → 计算核心指标 → 存入 CSValueData 表
  → 刷新仪表盘
```

### 11.4 数据字段映射

系统使用 AI 智能映射 Excel 表头到标准字段，容忍字段名的微小区别：

- "客户名称" / "客户名" / "company_name" → 都能映射到 `customerName`
- "续约率(%)" / "续费率" / "renewal_rate" → 都能映射到 `renewalRate`

### 11.5 内置演示数据

当数据库不可用时（GitHub Pages / Vercel / 未上传数据），系统自动使用 `generateCSValueDashboardData()` 函数生成的内置数据，包含：

- **健康度概览**：总客户 237 家，健康 40%/关注 25%/预警 20%/危险 15%
- **产品线价值**：AIMI/广告/独立站 3 条产品线指标
- **多产品价值**：单产品/双产品/全链路客户对比
- **续费增购流失**：各产品线续费/增购/流失详情
- **团队效能**：人均服务/覆盖率/响应时间
- **关键问题**：未解决问题跟踪

---

## 12. 前端功能操作指南

### 12.1 仪表盘 4 层架构

| 层级 | 名称 | 核心指标 | 色块 |
|------|------|---------|------|
| L1 | 价值总览 | 总客户数、续约率、增购率、NPS、ARR | 🔵 |
| L2 | 增长与留存 | 客户净增、健康度分布、ARPU/LTV | 🟢 |
| L3 | 客户购买旅程 | 转化漏斗、产品组合、续费增购 | 🟡 |
| L4 | 运营保障 | 人效、风险预警、关键问题 | 🟠 |

### 12.2 交互操作

| 操作 | 效果 |
|------|------|
| 点击 KPI 卡片 | 展开 AI 对话，针对该指标进行分析 |
| 悬停图表 | 显示详细数据 Tooltip |
| 点击"生成报告" | AI 自动生成结构化周报 |
| 点击"数据上传" | 上传 Excel 文件 |
| 点击齿轮图标 | 配置 LLM 模型参数 |
| 拖拽面板 | 自定义仪表盘布局 |

### 12.3 报告查看

- 生成的报告以 Markdown 格式渲染
- 支持复制、导出
- 历史报告在"历史报告"页面查看
- 可通过企微 Webhook 推送

---

## 13. 常见问题排查

### Q1: GitHub Pages 打不开 / 404

```bash
# 检查 Pages 是否启用
gh api repos/KevPH2026/csm-dashboard/pages

# 重新启用 Pages
gh api repos/KevPH2026/csm-dashboard/pages -X POST -f build_type=workflow

# 触发重新部署
gh workflow run deploy.yml --ref main

# 确认仓库为公开
gh api repos/KevPH2026/csm-dashboard -X PATCH -f visibility=public

# 查看构建日志
gh run list --repo KevPH2026/csm-dashboard --limit 3
```

### Q2: GitHub Actions 构建失败

1. 进入 GitHub → Actions → 查看失败的 run → 展开日志
2. 常见原因：
   - `npm ci` 失败：检查 `package-lock.json` 是否与 `package.json` 一致
   - 构建失败：本地执行 `NEXT_STATIC_EXPORT=1 npm run build` 复现
   - 部署失败：检查 Pages 是否启用

### Q3: Vercel 部署失败

1. 检查 Vercel 构建日志中的错误信息
2. 确认 Node.js 版本 ≥ 18
3. 本地测试构建：`npm run build`，确保本地能成功
4. 常见错误：
   - TypeScript 类型错误：已在 `next.config.ts` 设置 `ignoreBuildErrors: true`
   - Prisma 生成失败：确认 `package.json` 中 `build` 脚本包含 `prisma generate`

### Q4: AI 对话不工作 / 报错

1. 检查环境变量：`LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL_NAME`
2. 手动测试 API 连通性：
   ```bash
   curl -X POST "$LLM_BASE_URL" \
     -H "Authorization: Bearer $LLM_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"'"$LLM_MODEL_NAME"'","messages":[{"role":"user","content":"你好"}]}'
   ```
3. 检查 Vercel 函数日志是否有超时或认证错误
4. 在前端"模型配置"页面使用"测试连接"功能

### Q5: 数据不显示 / 显示 Demo 数据

| 环境 | 预期行为 | 解决方案 |
|------|---------|---------|
| GitHub Pages | 始终显示 Demo 数据 | 正常，无需处理 |
| Vercel | 默认显示 Demo 数据 | 正常，上传数据后显示真实数据 |
| 本地 | 可能未初始化数据库 | 执行 `npx prisma db push` |

### Q6: 报告生成超时

- Vercel 免费套餐 API 路由最长 10 秒
- 报告生成通常需要 10-60 秒
- 解决方案：升级 Vercel Pro（60 秒），或使用本地部署

### Q7: 页面刷新 404（GitHub Pages）

- 原因：SPA 路由问题，GitHub Pages 不支持前端路由回退
- 解决方案：始终从首页进入，再导航到子页面
- Vercel 不存在此问题（自动处理）

### Q8: 本地构建失败

```bash
# 完整清理并重建
rm -rf .next node_modules package-lock.json
npm install
npx prisma generate
npx prisma db push
npm run build
```

### Q9: z.ai 平台部署一直转圈

- z.ai 平台部署功能已失效，详见第 6 节
- 替代方案：Vercel 或 GitHub Pages

---

## 14. 运维监控

### 14.1 健康检查

```bash
# 本地
curl http://localhost:3000/api/health

# Vercel
curl https://your-app.vercel.app/api/health
```

返回字段说明：

| 字段 | 含义 | 正常值 |
|------|------|-------|
| `status` | 整体状态 | `healthy` |
| `checks.database` | 数据库连接 | `ok` |
| `checks.llm` | LLM 可用性 | `sdk-available` 或 `configured` |
| `uptime` | 运行时长（秒） | — |
| `responseTime` | 响应时间 | < 100ms |

### 14.2 监控建议

| 监控项 | 方式 | 频率 |
|--------|------|------|
| 健康检查 | `GET /api/health` | 每 5 分钟 |
| 构建状态 | GitHub Actions 通知 | 每次推送 |
| Vercel 部署 | Vercel 通知 | 每次部署 |
| 错误日志 | Vercel Dashboard → Logs | 实时 |

### 14.3 日志查看

```bash
# GitHub Actions 构建日志
gh run view <RUN_ID> --log

# Vercel 函数日志
vercel logs https://your-app.vercel.app

# 本地开发日志
# 直接在终端查看 npm run dev 的输出
```

---

## 15. 项目目录结构

```
csm-dashboard/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions 部署配置
├── .env.example                  # 环境变量模板
├── next.config.ts                # Next.js 配置
├── package.json                  # 项目依赖与脚本
├── prisma/
│   ├── schema.prisma             # 数据模型定义（10 个 Model）
│   └── db/                       # SQLite 数据库文件
│       └── custom.db
├── src/
│   ├── app/
│   │   ├── page.tsx              # 主页面入口
│   │   ├── layout.tsx            # 根布局
│   │   ├── globals.css           # 全局样式
│   │   └── api/                  # API 路由（13 个端点）
│   │       ├── route.ts          # 根 API
│   │       ├── health/           # 健康检查
│   │       ├── dashboard/        # 仪表盘数据
│   │       ├── chat/             # AI 对话
│   │       ├── generate-report/  # 报告生成
│   │       ├── process/          # Excel 数据处理
│   │       ├── excel-preview/    # Excel 预览
│   │       ├── flow-data/        # 流程数据
│   │       ├── model-config/     # 模型配置
│   │       ├── agent-rules/      # 调教规则
│   │       ├── skills/           # Skill 管理
│   │       ├── memory/           # 记忆存储
│   │       ├── reports/          # 历史报告
│   │       └── notify/           # 通知推送
│   ├── components/
│   │   ├── report-viewer.tsx     # 报告查看器
│   │   ├── sankey-diagram.tsx    # 桑基图
│   │   └── ui/                   # shadcn/ui 组件（52 个）
│   └── lib/
│       ├── data-processor.ts     # 数据清洗与处理（1229 行）
│       ├── demo-data.ts          # 内置演示数据（1433 行）
│       ├── minimax.ts            # LLM 引擎与 AI 功能（474 行）
│       ├── real-data.ts          # 真实数据处理（544 行）
│       ├── metrics.ts            # 指标计算（351 行）
│       ├── wechat-work.ts        # 企业微信通知（97 行）
│       ├── db.ts                 # 数据库连接
│       └── utils.ts              # 工具函数
└── docs/
    ├── CSM部署指南与操作手册.md   # 本文档
    ├── CSM业务逻辑文档.docx      # 业务逻辑文档
    └── CSM运维手册.docx          # 运维手册
```

---

## 附录 A：快速操作速查表

| 操作 | 命令/步骤 |
|------|----------|
| 本地启动 | `npm run dev` |
| 本地构建 | `npm run build` |
| 推送触发部署 | `git push origin main` |
| 手动触发 Pages 部署 | `gh workflow run deploy.yml` |
| Vercel 导入 | vercel.com → Import → KevPH2026/csm-dashboard |
| 检查 Pages 状态 | `gh api repos/KevPH2026/csm-dashboard/pages` |
| 健康检查 | `curl https://YOUR_DOMAIN/api/health` |
| 数据库管理 | `npx prisma studio` |
| 重置数据库 | `npx prisma db push --force-reset` |
| 清理重建 | `rm -rf .next node_modules && npm install && npm run build` |
| 查看 GitHub Actions | `gh run list --repo KevPH2026/csm-dashboard` |

## 附录 B：LLM 提供商推荐排序

| 排序 | 提供商 | 月费用（参考） | 推荐场景 |
|------|--------|-------------|---------|
| 1 | DeepSeek | ~¥10-50 | 性价比最高，日常使用首选 |
| 2 | 智谱 GLM | ~¥20-100 | 国内网络直连，速度快 |
| 3 | 通义千问 | ~¥20-100 | 阿里云生态集成 |
| 4 | 月之暗面 | ~¥20-80 | 需要长上下文分析 |
| 5 | OpenAI | ~$5-30 | 最高质量，需海外网络 |
| 6 | Ollama 本地 | 免费 | 数据安全要求高 |

## 附录 C：Vercel 免费套餐限制

| 限制项 | 免费套餐 | Pro 套餐 |
|--------|---------|---------|
| 带宽 | 100GB/月 | 1TB/月 |
| Serverless 执行时间 | 10 秒 | 60 秒 |
| 构建时长 | 6000 分钟/月 | 无限 |
| 部署次数 | 100 次/天 | 无限 |
| 并发构建 | 1 | 3 |
| 团队成员 | 1 | 多人 |

---

> 📧 如有问题，请在 GitHub 仓库提交 Issue：https://github.com/KevPH2026/csm-dashboard/issues
