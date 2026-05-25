# Vercel 部署指南

## 前置条件

- GitHub 账号
- Vercel 账号（可使用 GitHub 登录 https://vercel.com）
- 一个 LLM API Key（如 OpenAI / DeepSeek / 智谱 等）

## 快速部署步骤

### 1. Fork 或 Clone 项目到你的 GitHub

项目地址：https://github.com/KevPH2026/csm-dashboard

### 2. 在 Vercel 导入项目

1. 登录 https://vercel.com
2. 点击 **"Add New" → "Project"**
3. 选择 GitHub 仓库 `KevPH2026/csm-dashboard`
4. Framework Preset 会自动检测为 **Next.js**

### 3. 配置环境变量

在 Vercel 部署设置页的 **Environment Variables** 中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `file:./db/custom.db` | 使用内置 SQLite（Demo 模式）|
| `LLM_API_KEY` | 你的 API Key | OpenAI 兼容 API 密钥 |
| `LLM_BASE_URL` | API 地址 | 如 `https://api.openai.com/v1/chat/completions` |
| `LLM_MODEL_NAME` | 模型名称 | 如 `gpt-4o-mini` |

> **注意**：SQLite 在 Vercel 上为只读模式，数据上传功能不可用。Dashboard 会自动使用 Demo 数据展示。如需完整功能，请切换到 Vercel Postgres。

### 4. 部署

点击 **"Deploy"** 按钮，等待构建完成（约 1-2 分钟）。

### 5. 访问

部署成功后，Vercel 会分配一个 `xxx.vercel.app` 域名。

---

## 使用 PostgreSQL（推荐生产环境）

### 1. 创建 Vercel Postgres

在 Vercel 项目中：**Storage → Create Database → Postgres**

### 2. 修改 Prisma Schema

将 `prisma/schema.prisma` 中的：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

改为：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 3. 更新环境变量

Vercel 会自动注入 `POSTGRES_PRISMA_URL` 等变量，将 `DATABASE_URL` 设为 Vercel Postgres 提供的连接字符串。

### 4. 初始化数据库

在本地运行：
```bash
npx prisma db push
```

### 5. 重新部署

推送代码到 GitHub，Vercel 自动重新部署。

---

## 常见问题

### Q: 构建失败 "prisma generate"
A: 确保 `postinstall` 脚本包含 `prisma generate`（已配置）。

### Q: Dashboard 显示 Demo 数据
A: 这是正常的。SQLite 在 Vercel Serverless 环境下为只读。切换到 PostgreSQL 后可上传真实数据。

### Q: AI 对话功能不可用
A: 需要配置 `LLM_API_KEY`、`LLM_BASE_URL`、`LLM_MODEL_NAME` 环境变量。z-ai-web-dev-sdk 仅在 z.ai 平台环境可用。

### Q: maxDuration 报错
A: `maxDuration = 120` 需要 Vercel Pro 计划。免费计划最长 10 秒。可在 API 路由中降低此值或升级计划。
