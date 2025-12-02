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

在项目根目录创建 `.env` 文件：

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

### 启动项目

#### 方式一：同时启动前端和后端（推荐）

```bash
npm run dev:all
```

这将启动：
- 后端服务器：http://localhost:3001
- 前端开发服务器：http://localhost:3000

#### 方式二：分别启动

**终端 1 - 启动后端：**
```bash
npm run server
```

**终端 2 - 启动前端：**
```bash
npm run dev
```

### 验证

- 后端健康检查：http://localhost:3001/health
- 前端应用：http://localhost:3000

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
- `npm run server` - 启动后端服务器（开发模式，支持热重载）
- `npm run server:prod` - 启动后端服务器（生产模式）
- `npm run dev:all` - 同时启动前端和后端
- `npm run build` - 构建前端生产版本
