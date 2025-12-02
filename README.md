<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Google SEO Agent

这是一个基于 React + Node.js + Gemini API 的 SEO 关键词挖掘和分析工具。

## 📋 项目架构

- **前端**: React + TypeScript + Vite
- **后端**: Vercel Serverless Functions (Node.js + TypeScript)
- **AI**: Google Gemini API

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Gemini API Key

### 安装依赖

```bash
npm install
```

### 配置环境变量

**本地开发**（使用 `vercel dev`）:

在项目根目录创建 `.env` 文件：

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_PROXY_URL=https://api.302.ai
GEMINI_MODEL=gemini-2.5-flash
```

**Vercel 部署**:

在 Vercel 项目设置中配置环境变量（见下方部署部分）。

### 启动项目

#### 方式一：使用 Vercel CLI（推荐，包含前后端）

```bash
# 1. 安装 Vercel CLI（如果还没安装）
npm i -g vercel

# 2. 启动本地开发环境（会自动运行前端和 API）
npm run dev:vercel
# 或者直接运行
vercel dev
```

这将同时启动：
- 前端：http://localhost:3000
- API：http://localhost:3000/api/*

#### 方式二：只运行前端（连接远程 Vercel API）

```bash
npm run dev
```

前端运行在：http://localhost:3000

**注意**: 这种方式需要将前端配置为连接到已部署的 Vercel API，或设置 `VITE_API_URL` 环境变量。

### 验证

- 前端应用：http://localhost:3000
- API 健康检查：http://localhost:3000/api/health（使用 vercel dev 时）

## 🚀 Vercel 部署

项目已配置支持 Vercel 部署。详细部署指南请查看 [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)

### 快速部署

1. 在 Vercel 项目设置中配置环境变量：
   - `GEMINI_API_KEY`: 你的 Gemini API 密钥
   - `GEMINI_PROXY_URL`: （可选）API 代理地址
   - `GEMINI_MODEL`: （可选）使用的模型

2. 部署到 Vercel：
   ```bash
   npm i -g vercel
   vercel
   ```

## 📚 详细文档

- [Vercel 部署指南](./VERCEL_DEPLOYMENT.md) - 完整的 Vercel 部署说明

## 🛠️ 开发脚本

- `npm run dev` - 启动前端开发服务器
- `npm run build` - 构建前端生产版本
- `npm run preview` - 预览构建后的生产版本

**注意**: 后端 API 使用 Vercel Serverless Functions，部署到 Vercel 后自动可用。本地开发可以使用 `vercel dev` 来模拟 Vercel 环境。
