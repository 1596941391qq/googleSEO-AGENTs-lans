# 后端服务器启动指南

本项目已改为前后端分离架构，后端使用 Node.js + Express，前端使用 React + Vite。

## 📋 前置要求

- Node.js 18+ 
- npm 或 yarn

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件（或 `.env.local`），添加以下内容：

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

**重要**: 请将 `your_gemini_api_key_here` 替换为你的实际 Gemini API Key。

### 3. 启动后端服务器

#### 方式一：仅启动后端（开发模式，支持热重载）

```bash
npm run server
```

后端将在 `http://localhost:3001` 启动。

#### 方式二：同时启动前端和后端

```bash
npm run dev:all
```

这将同时启动：
- 后端服务器：`http://localhost:3001`
- 前端开发服务器：`http://localhost:3000`

#### 方式三：生产模式启动后端

```bash
npm run server:prod
```

### 4. 验证服务器运行

打开浏览器访问：
- 健康检查：http://localhost:3001/health

如果看到 `{"status":"ok","message":"Server is running"}`，说明服务器启动成功！

## 📁 项目结构

```
google-seo-agent/
├── server/                 # 后端代码
│   ├── index.ts           # Express 服务器入口
│   ├── services/          # 业务逻辑
│   │   └── gemini.ts     # Gemini API 调用
│   └── tsconfig.json      # TypeScript 配置
├── services/              # 前端服务（调用后端 API）
│   └── gemini.ts         # 前端 API 客户端
├── App.tsx               # React 主组件
└── package.json          # 项目依赖和脚本
```

## 🔌 API 端点

后端提供以下 API 端点：

- `POST /api/generate-keywords` - 生成关键词
- `POST /api/analyze-ranking` - 分析排名概率
- `POST /api/deep-dive-strategy` - 生成深度策略报告
- `POST /api/translate-prompt` - 优化提示词
- `POST /api/translate-text` - 翻译文本
- `GET /health` - 健康检查

## 🛠️ 开发说明

### 后端开发

- 后端代码位于 `server/` 目录
- 使用 TypeScript + Express
- 使用 `tsx` 进行开发（支持热重载）
- API Key 通过环境变量 `GEMINI_API_KEY` 配置

### 前端开发

- 前端代码位于项目根目录
- 使用 React + TypeScript + Vite
- 前端通过 `services/gemini.ts` 调用后端 API
- API 地址通过环境变量 `VITE_API_URL` 配置（默认：`http://localhost:3001`）

## 🔧 故障排除

### 问题：fetch failed / 网络连接错误

如果遇到 `fetch failed sending request` 错误，这通常是网络连接问题。

**原因：**
- 无法连接到 Google API 服务器（在中国大陆很常见）
- 防火墙或代理设置问题

**解决方案：**

1. **配置代理（推荐）**
   
   在 `.env` 文件中添加代理设置：
   ```env
   HTTPS_PROXY=http://your-proxy-server:port
   HTTP_PROXY=http://your-proxy-server:port
   ```
   
   或者在启动前设置环境变量：
   ```bash
   # Windows PowerShell
   $env:HTTPS_PROXY="http://your-proxy-server:port"
   npm run server
   
   # Windows CMD
   set HTTPS_PROXY=http://your-proxy-server:port
   npm run server
   ```

2. **使用 VPN**
   
   确保 VPN 已连接并可以访问 Google 服务。

3. **测试网络连接**
   
   运行网络测试脚本：
   ```bash
   npm run test:network
   ```
   
   这会检查：
   - 是否能访问 Google
   - 是否能访问 Gemini API
   - 代理设置是否正确
   - API Key 是否配置

4. **验证 API Key**
   
   确保 `.env` 文件中的 `GEMINI_API_KEY` 是正确的，并且：
   - 没有多余的空格
   - 完整且有效
   - 通常以 `AIza` 开头

### 问题：后端启动失败

1. **检查 Node.js 版本**
   ```bash
   node --version  # 应该 >= 18
   ```

2. **检查依赖是否安装**
   ```bash
   npm install
   ```

3. **检查环境变量**
   - 确保 `.env` 文件存在
   - 确保 `GEMINI_API_KEY` 已设置

### 问题：前端无法连接后端

1. **检查后端是否运行**
   - 访问 http://localhost:3001/health

2. **检查 CORS 设置**
   - 后端已配置 CORS，允许所有来源（开发环境）

3. **检查 API URL**
   - 前端默认使用 `http://localhost:3001`
   - 如需修改，在 `.env` 中设置 `VITE_API_URL`

### 问题：API Key 错误

- 确保 `.env` 文件中的 `GEMINI_API_KEY` 是正确的
- 确保后端服务器读取到了环境变量
- 重启服务器使环境变量生效

## 📝 环境变量说明

| 变量名 | 说明 | 必需 | 默认值 |
|--------|------|------|--------|
| `GEMINI_API_KEY` | Gemini API 密钥 | ✅ 是 | - |
| `PORT` | 后端服务器端口 | ❌ 否 | 3001 |
| `VITE_API_URL` | 前端 API 地址 | ❌ 否 | http://localhost:3001 |

## 🎯 下一步

1. 启动后端：`npm run server`
2. 启动前端：`npm run dev`（在另一个终端）
3. 访问前端：http://localhost:3000

或者使用 `npm run dev:all` 同时启动前后端！

