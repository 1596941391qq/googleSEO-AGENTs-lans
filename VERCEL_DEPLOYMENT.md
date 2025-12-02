# Vercel 部署指南

本项目已配置为支持 Vercel 部署，使用 Vercel Serverless Functions 作为后端 API。

## 📋 项目结构

```
google-seo-agent/
├── api/                    # Vercel Serverless Functions
│   ├── _shared/           # 共享的 Gemini API 服务
│   │   └── gemini.ts
│   ├── generate-keywords.ts
│   ├── analyze-ranking.ts
│   ├── deep-dive-strategy.ts
│   ├── translate-prompt.ts
│   ├── translate-text.ts
│   └── health.ts
├── vercel.json            # Vercel 配置文件
└── ...
```

## 🚀 部署步骤

### 1. 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

- `GEMINI_API_KEY`: 你的 Gemini API 密钥（必需）
- `GEMINI_PROXY_URL`: Gemini API 代理地址（可选，默认：`https://api.302.ai`）
- `GEMINI_MODEL`: 使用的模型（可选，默认：`gemini-2.5-flash`）

### 2. 部署到 Vercel

#### 方式一：通过 Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel

# 生产环境部署
vercel --prod
```

#### 方式二：通过 GitHub 集成

1. 将代码推送到 GitHub
2. 在 Vercel 控制台导入项目
3. Vercel 会自动检测配置并部署

### 3. 本地开发

#### 前端开发（使用本地后端）

```bash
# 启动本地 Express 后端（如果还在使用）
npm run server

# 在另一个终端启动前端
npm run dev
```

#### 使用 Vercel 本地开发环境

```bash
# 安装 Vercel CLI
npm i -g vercel

# 启动本地开发环境（模拟 Vercel）
vercel dev
```

## 🔧 API 地址配置

### 前端 API 配置逻辑

前端代码（`services/gemini.ts`）会自动根据环境选择正确的 API 地址：

1. **生产环境（Vercel）**: 使用相对路径 `/api/...`，自动使用当前域名
2. **开发环境**: 默认使用 `http://localhost:3001`（如果设置了 `VITE_API_URL` 则使用该值）
3. **自定义部署**: 通过设置 `VITE_API_URL` 环境变量可以指定自定义 API 地址

### API 端点

所有 API 端点都位于 `/api/` 路径下：

- `POST /api/generate-keywords` - 生成关键词
- `POST /api/analyze-ranking` - 分析排名概率
- `POST /api/deep-dive-strategy` - 生成深度策略报告
- `POST /api/translate-prompt` - 优化提示词
- `POST /api/translate-text` - 翻译文本
- `GET /api/health` - 健康检查

## 📝 配置说明

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

- `buildCommand`: 构建命令
- `outputDirectory`: 前端构建输出目录
- `framework`: 使用 Vite 框架
- `rewrites`: SPA 路由重写规则
- `functions`: Serverless Functions 配置（最大执行时间 60 秒）

## 🔍 验证部署

部署完成后，访问以下 URL 验证：

1. **前端应用**: `https://your-project.vercel.app`
2. **健康检查**: `https://your-project.vercel.app/api/health`
3. **API 端点**: 通过前端应用测试各个功能

## 🐛 故障排除

### 问题：API 调用失败

**可能原因**:
- 环境变量未正确配置
- CORS 配置问题

**解决方案**:
1. 检查 Vercel 项目设置中的环境变量
2. 确认 `GEMINI_API_KEY` 已设置
3. 查看 Vercel 函数日志

### 问题：前端无法加载

**可能原因**:
- 构建失败
- 路由配置问题

**解决方案**:
1. 检查 Vercel 构建日志
2. 确认 `vercel.json` 中的 `rewrites` 配置正确
3. 检查 `dist` 目录是否包含构建文件

### 问题：函数超时

**可能原因**:
- Gemini API 响应慢
- 函数执行时间超过限制

**解决方案**:
1. 检查 `vercel.json` 中的 `maxDuration` 设置
2. 优化 API 调用逻辑
3. 考虑使用 Vercel Pro 计划（支持更长的执行时间）

## 📚 相关文档

- [Vercel 文档](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)

