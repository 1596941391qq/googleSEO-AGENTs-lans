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

#### 本地开发

```bash
npm run dev
```

这将启动前端开发服务器：http://localhost:3000

**注意**: 本地开发时，前端会尝试连接到 `http://localhost:3001` 的后端 API。如果你需要本地后端，可以使用 Vercel CLI：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 启动本地开发环境（模拟 Vercel）
vercel dev
```

### 验证

- 前端应用：http://localhost:3000
- 如果使用 `vercel dev`，API 端点：http://localhost:3000/api/health

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
