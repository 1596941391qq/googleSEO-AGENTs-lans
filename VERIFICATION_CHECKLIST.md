# Vercel 部署验证清单

## ✅ 步骤 1: 项目结构和后端配置检查

### 项目结构
- [x] `api/` 目录存在，包含所有 serverless functions
- [x] `api/_shared/` 目录包含共享代码
- [x] `vercel.json` 配置文件存在且正确
- [x] 所有 API 端点已创建：
  - [x] `api/generate-keywords.ts`
  - [x] `api/analyze-ranking.ts`
  - [x] `api/deep-dive-strategy.ts`
  - [x] `api/translate-prompt.ts`
  - [x] `api/translate-text.ts`
  - [x] `api/health.ts`

### 后端配置
- [x] 使用 `@vercel/node` 类型定义
- [x] 所有函数使用标准的 `handler(req, res)` 格式
- [x] 环境变量通过 `process.env` 访问
- [x] 类型定义在 `api/_shared/types.ts`（避免导入路径问题）

## ✅ 步骤 2: Vercel Serverless Functions 最佳实践

### 代码结构
- [x] 统一的错误处理（`api/_shared/request-handler.ts`）
- [x] CORS 处理统一实现
- [x] 请求体解析处理（支持字符串和对象）
- [x] OPTIONS 请求处理
- [x] 详细的错误日志记录

### 最佳实践
- [x] 使用 TypeScript 类型安全
- [x] 模块化代码组织（共享代码在 `_shared/`）
- [x] 避免跨目录导入（类型定义在 API 目录内）
- [x] 错误处理包含堆栈跟踪（开发环境）
- [x] 函数超时配置（60秒）

### vercel.json 配置
- [x] 构建命令配置
- [x] 输出目录配置
- [x] SPA 路由重写规则
- [x] 函数超时配置

## ✅ 步骤 3: 前端 API 地址配置

### API 地址逻辑
- [x] 生产环境（Vercel）：使用相对路径 `/api/*`
- [x] 开发环境（vercel dev）：使用相对路径 `/api/*`（同一端口）
- [x] 支持通过 `VITE_API_URL` 环境变量自定义
- [x] 错误处理改进，能正确显示错误信息

### 配置验证
- [x] `services/gemini.ts` 中的 `getApiBaseUrl()` 函数正确
- [x] 所有 API 调用使用统一的 `apiCall` 函数
- [x] 错误响应能正确解析和显示

## 📋 部署前检查清单

### 环境变量
- [ ] 在 Vercel 中配置 `GEMINI_API_KEY`
- [ ] （可选）配置 `GEMINI_PROXY_URL`
- [ ] （可选）配置 `GEMINI_MODEL`

### 测试
- [ ] 本地使用 `vercel dev` 测试所有 API
- [ ] 测试健康检查端点：`/api/health`
- [ ] 测试所有 API 端点
- [ ] 检查 Vercel 函数日志

### 文档
- [x] `VERCEL_DEPLOYMENT.md` - 部署指南
- [x] `LOCAL_DEVELOPMENT.md` - 本地开发指南
- [x] `TROUBLESHOOTING.md` - 故障排除指南
- [x] `README.md` - 更新了部署说明

## 🔍 潜在问题检查

### 已修复
- [x] 模块导入路径问题（使用 `api/_shared/types.ts`）
- [x] 请求体解析问题
- [x] 错误处理问题
- [x] CORS 配置问题
- [x] 前端 API 地址配置问题

### 需要验证
- [ ] 环境变量是否正确配置
- [ ] 函数日志中是否有错误
- [ ] API 调用是否成功

