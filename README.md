# 客户运营驾驶舱 (CSM BI Dashboard)

## 项目简介

客户运营驾驶舱是一个基于 Next.js 16 的 BI 仪表盘应用，用于客户成功管理团队的日常运营数据监控与分析。

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript 5
- **样式**: Tailwind CSS 4 + shadcn/ui
- **数据库**: Prisma ORM + SQLite
- **可视化**: Recharts
- **AI**: z-ai-web-dev-sdk (AI钻取分析 & 报告生成)

## 架构设计

4层色块架构：
- 🟢 **Emerald (增长与留存)**: 客户增长趋势、留存率、续费分析
- 🟠 **Amber (客户购买旅程)**: 购买转化、使用激活、价值实现
- 🔵 **Indigo (客户成效)**: 客户健康度、NPS、成功指标
- 🟤 **Slate (运营保障)**: 工单处理、响应时效、服务质量

## 功能模块

1. **数据仪表盘**: 4层色块卡片展示核心运营指标
2. **AI钻取分析**: 点击指标卡片，AI自动分析趋势和原因
3. **报告生成**: 一键生成运营分析报告
4. **CS触达任务**: 客户跟进任务管理

## API 端点

- `GET /` - 仪表盘主页
- `POST /api/chat` - AI对话分析
- `POST /api/generate-report` - 报告生成

## 快速开始

```bash
# 安装依赖
bun install

# 初始化数据库
bun run db:push

# 启动开发服务器
bun run dev
```

## 部署

```bash
# 构建
bun run build

# 启动生产服务器
bun run start
```
