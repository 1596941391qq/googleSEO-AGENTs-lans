# Vercel 函数调用失败故障排除

## 错误：FUNCTION_INVOCATION_FAILED

如果遇到 `FUNCTION_INVOCATION_FAILED` 错误，请按照以下步骤排查：

## 🔍 常见原因和解决方案

### 1. 环境变量未配置

**症状**: 函数调用失败，日志显示 "GEMINI_API_KEY is not configured"

**解决方案**:
1. 登录 Vercel 控制台
2. 进入项目设置 → Environment Variables
3. 添加以下环境变量：
   - `GEMINI_API_KEY`: 你的 Gemini API 密钥（必需）
   - `GEMINI_PROXY_URL`: （可选）默认: `https://api.302.ai`
   - `GEMINI_MODEL`: （可选）默认: `gemini-2.5-flash`
4. 重新部署项目

### 2. 模块导入错误

**症状**: 函数无法启动，导入错误

**解决方案**:
- 确保所有导入路径正确
- 检查 `api/_shared/gemini.ts` 中的导入是否使用相对路径（不带 `.js` 扩展名）
- 确保 `types.ts` 文件在项目根目录

### 3. 依赖缺失

**症状**: 函数启动时找不到模块

**解决方案**:
```bash
# 确保安装了所有依赖
npm install

# 特别检查 @vercel/node 是否安装
npm list @vercel/node
```

### 4. 函数超时

**症状**: 函数执行时间过长，超过限制

**解决方案**:
- 检查 `vercel.json` 中的 `maxDuration` 设置（当前为 60 秒）
- 考虑优化 API 调用逻辑
- 升级到 Vercel Pro 计划以获得更长的执行时间

### 5. 类型错误

**症状**: TypeScript 编译错误

**解决方案**:
- 确保 `tsconfig.json` 配置正确
- 检查所有类型导入是否正确
- 运行 `npm run build` 检查是否有编译错误

## 🔧 诊断步骤

### 步骤 1: 检查健康检查端点

访问 `/api/health` 端点，查看环境变量配置：

```bash
curl https://your-project.vercel.app/api/health
```

应该返回：
```json
{
  "status": "ok",
  "message": "Vercel serverless function is running",
  "environment": {
    "GEMINI_API_KEY": "✓ Set",
    "GEMINI_PROXY_URL": "Using default: https://api.302.ai",
    "GEMINI_MODEL": "Using default: gemini-2.5-flash",
    "NODE_ENV": "production"
  }
}
```

如果 `GEMINI_API_KEY` 显示 "✗ Missing"，说明环境变量未配置。

### 步骤 2: 查看 Vercel 函数日志

1. 登录 Vercel 控制台
2. 进入项目 → Functions 标签
3. 点击失败的函数
4. 查看日志输出，查找错误信息

### 步骤 3: 本地测试

使用 Vercel CLI 在本地测试：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 启动本地开发环境
vercel dev
```

这将模拟 Vercel 环境，帮助发现本地问题。

### 步骤 4: 检查构建日志

在 Vercel 控制台查看构建日志：
1. 进入项目 → Deployments
2. 点击最新的部署
3. 查看 Build Logs，查找编译错误

## 📝 常见错误消息

### "GEMINI_API_KEY is not configured"

**原因**: 环境变量未设置

**解决**: 在 Vercel 项目设置中添加 `GEMINI_API_KEY` 环境变量

### "Cannot find module '../../types'"

**原因**: 导入路径错误或文件不存在

**解决**: 
- 检查 `types.ts` 文件是否在项目根目录
- 确保导入路径使用相对路径，不带 `.js` 扩展名

### "Function execution timeout"

**原因**: 函数执行时间超过限制

**解决**:
- 优化 API 调用逻辑
- 增加 `vercel.json` 中的 `maxDuration`
- 考虑使用异步处理或队列

### "Module not found: @vercel/node"

**原因**: 依赖未安装

**解决**: 运行 `npm install` 安装依赖

## 🚀 快速修复清单

- [ ] 检查 Vercel 环境变量是否配置
- [ ] 确认 `GEMINI_API_KEY` 已设置且有效
- [ ] 运行 `npm install` 确保依赖已安装
- [ ] 检查 `vercel.json` 配置是否正确
- [ ] 查看 Vercel 函数日志获取详细错误信息
- [ ] 测试 `/api/health` 端点
- [ ] 使用 `vercel dev` 本地测试

## 📞 获取帮助

如果以上步骤都无法解决问题：

1. 查看 Vercel 函数日志获取详细错误信息
2. 检查 Vercel 状态页面：https://www.vercel-status.com/
3. 查看 Vercel 文档：https://vercel.com/docs
4. 联系 Vercel 支持

## 🔄 重新部署

修复问题后，重新部署：

```bash
# 使用 Vercel CLI
vercel --prod

# 或通过 Git 推送触发自动部署
git push origin main
```

