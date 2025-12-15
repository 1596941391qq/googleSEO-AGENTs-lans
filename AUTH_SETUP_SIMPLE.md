# Google Agent 跨项目认证集成 - 极简指南

## 🎯 成功的关键点

1. **使用 `pg` 库**（与主应用保持一致）
2. **开发模式自动登录**（避免复杂的真实认证流程）
3. **环境变量完全同步**（POSTGRES_URL, JWT_SECRET 必须与主应用一致）
4. **Vite 环境变量需要 VITE_ 前缀**

---

## ⚡ 5分钟快速配置

### 1. 安装依赖

```bash
npm install pg jose @vercel/postgres
```

### 2. 配置环境变量

编辑 `.env` 文件：

```bash
# Gemini API (已有)
GEMINI_API_KEY=你的key
GEMINI_PROXY_URL=https://api.302.ai
GEMINI_MODEL=gemini-2.5-flash

# === 认证配置 (从主应用复制) ===
POSTGRES_URL=从主应用复制完整URL
JWT_SECRET=从主应用复制密钥
MAIN_APP_URL=http://localhost:3000

# === 开发模式 (重要！) ===
NODE_ENV=development
ENABLE_DEV_AUTO_LOGIN=true

# === 前端配置 ===
VITE_MAIN_APP_URL=http://localhost:3000
```

### 3. 初始化数据库

访问一次即可：
```
http://localhost:3002/api/init-db
```

### 4. 集成到 App

在 `index.tsx` 中：
```tsx
import { AuthProvider } from './contexts/AuthContext';

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

在 `App.tsx` 中：
```tsx
import { AuthStatusBar } from './AuthStatusBar';

function App() {
  return (
    <div>
      <AuthStatusBar />  {/* 添加这一行 */}
      {/* 其他内容 */}
    </div>
  );
}
```

---

## ✅ 验证成功

1. 从主应用点击"启动 Google Agent"
2. 新标签页顶部显示**绿色状态条**
3. 显示 "Development User" 或真实用户信息
4. 刷新页面仍然保持登录

---

## 📁 已创建的文件

```
api/
├── lib/
│   ├── db.ts              # pg 数据库连接
│   └── auth.ts            # JWT 工具
├── auth/
│   ├── verify-transfer.ts # 验证 transfer token
│   └── session.ts         # 验证 session
└── init-db.ts             # 数据库初始化

contexts/
└── AuthContext.tsx        # React 认证上下文

AuthStatusBar.tsx          # 登录状态栏组件
.env.example               # 环境变量示例
```

---

## 🚀 生产环境部署

在 Vercel 项目设置中添加环境变量：

```bash
vercel env add POSTGRES_URL production
vercel env add JWT_SECRET production
vercel env add MAIN_APP_URL production

# 禁用开发模式
vercel env add ENABLE_DEV_AUTO_LOGIN production
# 值设为: false

vercel --prod
```

---

## 💡 常见问题

**Q: 点击启动后显示 "未登录"？**
- 确认 `ENABLE_DEV_AUTO_LOGIN=true`
- 重启服务器

**Q: 数据库连接失败？**
- 确认 `POSTGRES_URL` 与主应用完全一致
- 使用 `pg` 库，不是 `@vercel/postgres`

**Q: 刷新后掉线？**
- 检查 `JWT_SECRET` 是否与主应用一致

---

**配置完成时间**: 2025-12-16
**版本**: 1.0（极简版）
