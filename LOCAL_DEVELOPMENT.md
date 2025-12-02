# 本地开发指南

## 🚀 快速开始

### 方式一：使用 Vercel CLI（推荐）

这是最简单的方式，可以同时运行前端和 API：

```bash
# 1. 安装 Vercel CLI（只需安装一次）
npm i -g vercel

# 2. 启动本地开发环境
npm run dev:vercel
```

或者直接运行：
```bash
vercel dev
```

**效果**：
- ✅ 前端运行在：http://localhost:3000
- ✅ API 运行在：http://localhost:3000/api/*
- ✅ 自动热重载
- ✅ 完全模拟 Vercel 生产环境

### 方式二：只运行前端

如果你只想测试前端，或者后端已经部署到 Vercel：

```bash
npm run dev
```

前端运行在：http://localhost:3000

**注意**：需要确保：
1. 后端已部署到 Vercel，或
2. 设置 `VITE_API_URL` 环境变量指向你的 API 地址

## 📝 环境变量配置

### 使用 Vercel CLI 时

创建 `.env` 文件（在项目根目录）：

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_PROXY_URL=https://api.302.ai
GEMINI_MODEL=gemini-2.5-flash
```

`vercel dev` 会自动读取 `.env` 文件中的环境变量。

### 只运行前端时

创建 `.env` 文件：

```env
VITE_API_URL=http://localhost:3000
# 或者指向已部署的 Vercel API
# VITE_API_URL=https://your-project.vercel.app
```

## 🔍 验证

### 检查 API 是否运行

访问：http://localhost:3000/api/health

应该看到：
```json
{
  "status": "ok",
  "message": "Vercel serverless function is running",
  "environment": {
    "GEMINI_API_KEY": "✓ Set",
    ...
  }
}
```

### 检查前端

访问：http://localhost:3000

## 🐛 常见问题

### 问题：`vercel dev` 命令不存在

**解决**：
```bash
npm i -g vercel
```

### 问题：端口被占用

**解决**：
```bash
# 指定其他端口
vercel dev --listen 3001
```

### 问题：环境变量未生效

**解决**：
1. 确保 `.env` 文件在项目根目录
2. 重启 `vercel dev`
3. 检查 `.env` 文件格式（不要有引号，不要有空格）

## 💡 提示

- 使用 `vercel dev` 时，所有 API 函数都会在本地运行
- 修改 API 代码后，Vercel 会自动重新加载
- 修改前端代码后，Vite 会自动热重载
- 日志会显示在终端中，方便调试

