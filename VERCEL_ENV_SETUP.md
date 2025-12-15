# Vercel 环境变量配置指南

## 🚀 必须配置的环境变量

在 Vercel 项目设置中添加以下环境变量：

```bash
# 1. 认证配置（从主应用复制）
POSTGRES_URL=postgres://...
JWT_SECRET=你的JWT密钥

# 2. 主应用URL
MAIN_APP_URL=https://niche-mining-web.vercel.app

# 3. 开发模式（重要！临时启用）
ENABLE_DEV_AUTO_LOGIN=true
NODE_ENV=development

# 4. 前端配置
VITE_MAIN_APP_URL=https://niche-mining-web.vercel.app

# 5. Gemini API（已有）
GEMINI_API_KEY=你的key
GEMINI_PROXY_URL=https://api.302.ai
GEMINI_MODEL=gemini-2.5-flash
```

## 📋 配置步骤

### 使用 Vercel CLI

```bash
# 配置生产环境变量
vercel env add POSTGRES_URL production
vercel env add JWT_SECRET production
vercel env add MAIN_APP_URL production
vercel env add ENABLE_DEV_AUTO_LOGIN production  # 值设为 true
vercel env add NODE_ENV production  # 值设为 development
vercel env add VITE_MAIN_APP_URL production

# 重新部署
vercel --prod
```

### 使用 Vercel Dashboard

1. 访问 https://vercel.com/你的项目/settings/environment-variables
2. 添加上述所有环境变量
3. Environment 选择 "Production"
4. 点击 "Save"
5. 重新部署项目

---

## ⚠️ 重要提示

**临时方案**: `ENABLE_DEV_AUTO_LOGIN=true` 和 `NODE_ENV=development` 仅用于测试。

**生产环境最终方案**:
- 关闭开���模式
- 确保主应用正确实施 transfer token 写入数据库
- 使用真实的认证流程

---

## 🔍 验证配置

部署后访问：
```
https://google-agent.vercel.app/api/init-db
```

应该返回成功。然后从主应用点击启动，应该能自动登录。
