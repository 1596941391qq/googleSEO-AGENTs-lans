# /signin 重定向问题 - 解决方案

## 🔍 问题原因

主应用的 Agent URL 配置中包含了 `/signin` 路径：
```
https://google-agent.vercel.app/signin?callbackUrl=https://google-agent.vercel.app/?tt=xxx
```

这导致：
1. 用户访问 `/signin` 页面（该页面不存在）
2. Transfer token 在 `callbackUrl` 参数中，无法被 AuthContext 处理
3. 用户看到错误页面

---

## ✅ 解决方案

创建了 `/signin` 页面（`public/signin.html`）自动处理重定向：

### 工作流程
1. 用户访问 `/signin?callbackUrl=https://google-agent.vercel.app/?tt=xxx`
2. signin.html 提取 `callbackUrl` 中的 `tt` 参数
3. 自动重定向到 `/?tt=xxx`
4. AuthContext 接管，验证 transfer token，完成登录

### 配置文件
- `public/signin.html` - 重定向页面
- `vercel.json` - 添加了 `/signin` 的rewrite规则

---

## 🚀 部署

```bash
# 提交更改
git add public/signin.html vercel.json
git commit -m "Add /signin redirect handler for cross-project auth"

# 部署
vercel --prod
```

---

## ✅ 验证

部署后，从主应用点击"启动 Google Agent"：
1. 应该看到短暂的"正在跳转..."页面
2. 然后自动跳转到首页
3. 顶部显示绿色登录状态条

---

## 💡 根本解决方案（可选）

如果可以修改主应用，建议修改 Agent URL 配置：
```typescript
// 推荐配置
{
  url: 'https://google-agent.vercel.app'  // 不带 /signin
}
```

这样就不需要中间的重定向步骤了。

---

**创建时间**: 2025-12-16
**问题**: Transfer token 被包在 callbackUrl 中，无法直接处理
**解决**: 创建 signin.html 提取并重定向
