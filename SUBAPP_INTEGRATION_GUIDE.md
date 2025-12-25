# 子应用对接主应用极简指南

## 🎯 总览

本指南整合了**认证对接**和**支付对接**两大部分，帮助你在**5-10分钟**内完成子应用与主应用(niche-mining)的完整集成。

---

## ⚡ 最快方式：复制共享文件

最省事的方法：直接复制以下5个文件到你的项目，然后配置环境变量即可。

### 📁 必须复制的共通文件（5个）

```
├── api/
│   ├── lib/
│   │   ├── auth.ts              # JWT 工具函数
│   │   └── db.ts                # PostgreSQL 连接
│   └── auth/
│       ├── verify-transfer.ts   # 验证 transfer token
│       └── session.ts           # 验证 session
├── contexts/
│   └── AuthContext.tsx          # React 认证上下文
└── AuthStatusBar.tsx            # 登录状态栏组件
```

**获取方式**：
```bash
# 从本仓库复制这5个文件到你的项目
cp api/lib/auth.ts YOUR_PROJECT/api/lib/
cp api/lib/db.ts YOUR_PROJECT/api/lib/
cp api/auth/verify-transfer.ts YOUR_PROJECT/api/auth/
cp api/auth/session.ts YOUR_PROJECT/api/auth/
cp contexts/AuthContext.tsx YOUR_PROJECT/contexts/
cp AuthStatusBar.tsx YOUR_PROJECT/
```

---

## 🔐 第一步：认证对接（5分钟）

### 1. 安装依赖（1分钟）

```bash
npm install pg jose
```

### 2. 配置环境变量（2分钟）

创建 `.env` 文件，**从主应用完全复制**以下变量：

```bash
# === 从主应用 niche-mining 复制 ===
POSTGRES_URL=主应用的完整URL   # 必须完全相同！
JWT_SECRET=主应用的密钥        # 必须完全相同！
MAIN_APP_URL=http://localhost:3000

# === 开发模式（重要！）===
NODE_ENV=development
ENABLE_DEV_AUTO_LOGIN=true      # 开发模式下自动登录

# === 前端配置 ===
VITE_MAIN_APP_URL=http://localhost:3000
```

### 3. 在应用入口集成（2分钟）

**文件**: `index.tsx`

```tsx
import { AuthProvider } from './contexts/AuthContext';

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

**文件**: `App.tsx` (主组件顶部)

```tsx
import { AuthStatusBar } from './AuthStatusBar';
import { useAuth } from './contexts/AuthContext';

function App() {
  const { user, authenticated } = useAuth();

  // 在需要登录的功能前检查
  const handleProtectedAction = () => {
    if (!authenticated) {
      alert('请先登录');
      return;
    }
    // 执行操作
  };

  return (
    <div>
      <AuthStatusBar />  {/* 显示登录状态 */}
      {/* 你的应用内容 */}
    </div>
  );
}
```

### ✅ 验证认证成功

1. 主应用点击"启动 Google Agent"（或你的应用）
2. 新标签页顶部显示**绿色登录状态条**
3. 显示已登录用户信息
4. 刷新页面保持登录

**完整细节**: 参见 `AUTH_SETUP_SIMPLE.md`

---

## 💳 第二步：支付对接（5分钟）

### 1. 创建 Credits 查询函数（1分钟）

**文件**: `api/credits.ts`

```typescript
export async function getUserCredits() {
  const token = localStorage.getItem('auth_token');
  if (!token) return null;

  try {
    const response = await fetch(
      `${import.meta.env.VITE_MAIN_APP_URL}/api/user/credits`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) throw new Error('Failed');

    const data = await response.json();
    return data.credits.remaining; // 返回剩余 Credits
  } catch (error) {
    console.error('获取 Credits 失败:', error);
    return null;
  }
}
```

### 2. 创建 Credits 消费函数（2分钟）

**文件**: `api/credits.ts` (追加)

```typescript
// 三种模式的消耗
const CREDITS_MAP = {
  keyword_mining: 20,     // 关键词挖掘
  batch_translation: 20,  // 批量翻译
  deep_mining: 30,        // 深度挖掘
} as const;

export async function consumeCredits(
  modeId: keyof typeof CREDITS_MAP,
  description: string
) {
  const token = localStorage.getItem('auth_token');
  if (!token) throw new Error('未登录');

  const credits = CREDITS_MAP[modeId];

  try {
    const response = await fetch(
      `${import.meta.env.VITE_MAIN_APP_URL}/api/credits/consume`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credits,
          description,
          relatedEntity: 'YOUR_APP_NAME', // 你的应用名
          modeId,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || '消费失败');
    }

    return await response.json(); // { success: true, remaining: 8500, ... }
  } catch (error) {
    console.error('Credits 消费失败:', error);
    throw error;
  }
}
```

### 3. 在组件中使用（2分钟）

```tsx
import { getUserCredits, consumeCredits, CREDITS_MAP } from './api/credits';

function MyComponent() {
  const [credits, setCredits] = useState<number | null>(null);

  // 显示余额
  useEffect(() => {
    getUserCredits().then(setCredits);
  }, []);

  // 执行操作前检查并消费
  const handleKeywordMining = async (keyword: string) => {
    try {
      // 检查余额
      const currentCredits = await getUserCredits();
      if (currentCredits < CREDITS_MAP.keyword_mining) {
        alert('Credits 不足，请充值');
        return;
      }

      // 执行操作
      const result = await performKeywordMining(keyword);

      // 消费 Credits
      await consumeCredits(
        'keyword_mining',
        `Keyword mining: ${keyword}`
      );

      // 更新显示
      const newCredits = await getUserCredits();
      setCredits(newCredits);

      alert('操作成功！');
    } catch (error) {
      alert('操作失败: ' + error.message);
    }
  };

  return (
    <div>
      <div>剩余 Credits: {credits ?? '--'}</div>
      <button onClick={() => handleKeywordMining('coffee')}>
        开始挖掘 (消耗 {CREDITS_MAP.keyword_mining} Credits)
      </button>
    </div>
  );
}
```

### ✅ 验证支付成功

1. 确保已登录
2. 执行操作
3. 检查浏览器 Network 面板：
   - 请求 `POST /api/credits/consume`
   - 返回 `{ success: true, remaining: XXXX }`
4. UI 显示 Credits 余额更新

**完整细节**: 参见 `SUBPROJECT_CREDITS_INTEGRATION.md`

---

## 📊 完整集成检查清单

复制以下清单，逐项检查：

### 基础配置
- [ ] 已安装依赖 `pg jose`
- [ ] 已复制5个共通文件
- [ ] 已配置 `.env`（POSTGRES_URL、JWT_SECRET 与主应用完全一致）
- [ ] 已设置 `ENABLE_DEV_AUTO_LOGIN=true`
- [ ] 已集成 `AuthProvider` 到 `index.tsx`
- [ ] 已添加 `AuthStatusBar` 到主组件

### 认证功能
- [ ] 从主应用跳转能自动登录
- [ ] 刷新页面保持登录状态
- [ ] 未登录时禁止访问付费功能
- [ ] 控制台无认证错误

### 支付功能
- [ ] 已创建 `api/credits.ts`
- [ ] 已实现 `getUserCredits()`
- [ ] 已实现 `consumeCredits()`
- [ ] UI 显示 Credits 余额
- [ ] 操作前检查余额
- [ ] 消费后更新显示
- [ ] 正确处理 "余额不足" 错误
- [ ] 测试消费成功（看 Network 面板）

---

## 🔥 最快路径：3步集成

> **时间**: 5-10分钟 | **难度**: ⭐☆☆☆☆

### 第1步：复制文件（1分钟）

```bash
git clone <本仓库地址> temp
cp temp/api/lib/auth.ts YOUR_PROJECT/api/lib/
cp temp/api/lib/db.ts YOUR_PROJECT/api/lib/
cp temp/api/auth/*.ts YOUR_PROJECT/api/auth/
cp temp/contexts/AuthContext.tsx YOUR_PROJECT/contexts/
cp temp/AuthStatusBar.tsx YOUR_PROJECT/
rm -rf temp
```

### 第2步：配置环境（2分钟）

打开主应用的 `.env` 文件，复制以下变量到你的 `.env`：

```bash
POSTGRES_URL=postgres://...
JWT_SECRET=your-secret-key
```

### 第3步：代码集成（2分钟）

在 `App.tsx` 顶部添加：

```tsx
import { AuthStatusBar } from './AuthStatusBar';
import { useAuth } from './contexts/AuthContext';

// 在组件顶部
const { authenticated } = useAuth();

// 在 return 中
return (
  <div>
    <AuthStatusBar />
    {/* 你的内容 */}
  </div>
);
```

创建 `api/credits.ts` 并复制上面的代码。

**完成！** 🎉

---

## 📚 参考文档

1. **认证详细指南**: `AUTH_SETUP_SIMPLE.md` - 包含环境变量、数据库初始化、问题排查
2. **支付详细指南**: `SUBPROJECT_CREDITS_INTEGRATION.md` - 包含完整 API、错误处理、最佳实践

---

## 💡 常见问题

**Q: 提示 "未登录"？**
A: 检查 `ENABLE_DEV_AUTO_LOGIN=true` 并重启服务器

**Q: Credits 显示 "--"？**
A: 确认已登录，检查浏览器 Network 面板看 `/api/user/credits` 是否成功

**Q: 消费失败 "Token 无效"？**
A: JWT_SECRET 必须与主应用完全一致，确认 `POSTGRES_URL` 也一致

**Q: 刷新后掉线？**
A: JWT_SECRET 不一致导致 Token 验证失败

---

## 🎯 对接成功标准

✅ 从主应用点击跳转 → 自动登录并显示用户信息
✅ 顶部显示绿色状态条 → Credits 余额
✅ 执行操作 → 正确扣除 Credits
✅ 刷新页面 → 保持登录
✅ 查看浏览器 Network → 无 401/403 错误

---

**文档版本**: 1.0 极简版
**最后更新**: 2025-12-25
**对接成功案例**: Google SEO Agent ✅
