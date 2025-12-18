# 子项目 Credits 集成指南

本指南帮助子应用（如 SEO Agent、Translation Service 等）快速集成主应用的 Credits 计费系统。

---

## 📋 目录

1. [快速开始](#快速开始)
2. [集成步骤](#集成步骤)
3. [API 使用](#api-使用)
4. [错误处理](#错误处理)
5. [最佳实践](#最佳实践)
6. [示例代码](#示例代码)

---

## 🚀 快速开始

### 前置要求

- 用户已在主应用登录并获得 JWT Token
- 子应用可以访问主应用的 API 端点（如 `https://main-app.com/api`）
- 了解要使用的挖掘模式 ID

### 三种挖掘模式

| Mode ID             | 中文名称   | Credits/次 | 适用场景                     |
| ------------------- | ---------- | ---------- | ---------------------------- |
| `keyword_mining`    | 关键词挖掘 | 20         | SEO 关键词发现、搜索意图分析 |
| `batch_translation` | 批量翻译   | 20         | 多语言关键词翻译、本地化     |
| `deep_mining`       | 深度挖掘   | 30         | 竞争分析、内容策略、趋势预测 |

---

## 🔧 集成步骤

### 第一步：获取用户 Token

这一步你已经有了 有 `auth_token`

## 💰 第二步：创建 Credits 查询函数

在子项目中创建一个工具函数：

**文件**: `utils/credits.ts` (或 `utils/credits.js`)

```typescript
export async function getUserCredits() {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    console.error("No auth token found");
    return null;
  }

  try {
    const response = await fetch(
      "https://niche-mining-web.vercel.app/api/user/credits",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch credits");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching credits:", error);
    return null;
  }
}
```

---

## 📊 第三步：在组件中使用

在你的任意 React 组件中使用（比如顶部导航栏）：

```tsx
import { useState, useEffect } from "react";
import { getUserCredits } from "./utils/credits";

export default function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      const data = await getUserCredits();
      if (data && data.credits) {
        setCredits(data.credits.remaining);
      }
      setLoading(false);
    };

    fetchCredits();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (credits === null) {
    return <div>Credits: --</div>;
  }

  return (
    <div className="credits-badge">
      <span>💎 Credits: {credits.toLocaleString()}</span>
    </div>
  );
}
```

---

## 🎨 示例：在导航栏显示

```tsx
import CreditsDisplay from "./CreditsDisplay";

export default function Navbar() {
  return (
    <nav>
      <div className="logo">Your App</div>
      <div className="user-info">
        <CreditsDisplay />
        <UserMenu />
      </div>
    </nav>
  );
}
```

---

## 🧪 测试

1. **确认登录状态**：从主应用跳转到子项目，应该自动登录
2. **打开浏览器控制台**：应该能看到 Credits 数据被请求
3. **查看 UI**：应该显示 Credits 余额

---

## 📝 返回的数据格式

```json
{
  "userId": "uuid",
  "credits": {
    "total": 10000,
    "used": 1500,
    "remaining": 8500,
    "bonus": 0
  },
  "subscription": {
    "plan": "pro",
    "planName": "Professional",
    "status": "active",
    "creditsMonthly": 50000
  }
}
```

**你需要的字段**：

- `data.credits.remaining` - 剩余 Credits
- `data.credits.total` - 总 Credits
- `data.subscription.plan` - 订阅计划

---

### 第二步：检查用户 Credits 余额

在执行消耗 Credits 的操作前，先检查余额：

```javascript
async function checkCreditsBalance(token) {
  const response = await fetch("https://main-app.com/api/user/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch credits");
  }

  const data = await response.json();
  return {
    remaining: data.credits.remaining,
    total: data.credits.total,
    used: data.credits.used,
  };
}

// 使用示例
try {
  const credits = await checkCreditsBalance(token);
  if (credits.remaining < 20) {
    alert("Credits 不足，请充值");
    return;
  }
  console.log(`剩余 ${credits.remaining} Credits`);
} catch (error) {
  console.error("无法获取 Credits 信息:", error);
}
```

---

### 第三步：消费 Credits

当用户执行挖掘操作时，调用 Credits 消费 API：

```javascript
async function consumeCredits(token, modeId, description) {
  // 获取对应模式的 Credits 消耗量
  const creditsMap = {
    keyword_mining: 20,
    batch_translation: 20,
    deep_mining: 30,
  };

  const credits = creditsMap[modeId];
  if (!credits) {
    throw new Error(`Invalid mode ID: ${modeId}`);
  }

  const response = await fetch("https://main-app.com/api/credits/consume", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      credits: credits,
      description: description,
      relatedEntity: "subapp_name", // 你的子应用名称
      modeId: modeId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to consume credits");
  }

  return await response.json();
}

// 使用示例
try {
  const result = await consumeCredits(
    token,
    "keyword_mining",
    'SEO Agent - Keyword Research for "coffee shop"'
  );
  console.log("✅ Credits 已扣除:", result);
  console.log("剩余:", result.remaining);
} catch (error) {
  console.error("❌ Credits 扣除失败:", error.message);
  // 处理错误（如余额不足、网络错误等）
}
```

---

## 📡 API 使用

### API 1: 获取用户 Dashboard 数据

**端点**: `GET /api/user/dashboard`

**请求头**:

```http
Authorization: Bearer <JWT_TOKEN>
```

**响应示例**:

```json
{
  "userId": "7e23b466-4c18-455a-97fa-cb5290a5000a",
  "credits": {
    "total": 10000,
    "used": 1240,
    "remaining": 8760,
    "bonus": 500,
    "lastResetAt": "2024-01-01T00:00:00Z",
    "nextResetAt": "2024-02-01T00:00:00Z"
  },
  "subscription": {
    "plan": "pro",
    "planName": "Professional",
    "status": "active",
    "creditsMonthly": 10000
  },
  "modeStats": {
    "keyword_mining": {
      "usageCount": 15,
      "totalCredits": 300
    },
    "batch_translation": {
      "usageCount": 8,
      "totalCredits": 160
    },
    "deep_mining": {
      "usageCount": 12,
      "totalCredits": 360
    }
  }
}
```

---

### API 2: 消费 Credits

**端点**: `POST /api/credits/consume`

**请求头**:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**请求体**:

```json
{
  "credits": 20,
  "description": "Keyword Mining - coffee shop",
  "relatedEntity": "seo_agent",
  "modeId": "keyword_mining"
}
```

**响应示例（成功）**:

```json
{
  "success": true,
  "remaining": 8740,
  "used": 1260,
  "transaction": {
    "id": "tx_abc123",
    "credits": -20,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**响应示例（余额不足）**:

```json
{
  "error": "Insufficient credits",
  "remaining": 15,
  "required": 20
}
```

---

## ⚠️ 错误处理

### 常见错误及处理

#### 1. Token 无效或过期

**错误码**: 401 Unauthorized

**错误信息**: `"Invalid token"` 或 `"Unauthorized"`

**处理方式**:

```javascript
if (response.status === 401) {
  // Token 失效，引导用户重新登录
  alert("登录已过期，请重新登录");
  window.location.href =
    "https://main-app.com/login?redirect=" +
    encodeURIComponent(window.location.href);
}
```

---

#### 2. Credits 余额不足

**错误码**: 400 Bad Request

**错误信息**: `"Insufficient credits"`

**处理方式**:

```javascript
try {
  await consumeCredits(token, modeId, description);
} catch (error) {
  if (error.message.includes("Insufficient credits")) {
    // 引导用户充值
    const confirmRecharge = confirm("Credits 余额不足，是否前往充值？");
    if (confirmRecharge) {
      window.location.href = "https://main-app.com/console/pricing";
    }
  }
}
```

---

#### 3. 网络错误

**处理方式**:

```javascript
async function consumeCreditsWithRetry(
  token,
  modeId,
  description,
  retries = 3
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await consumeCredits(token, modeId, description);
    } catch (error) {
      if (i === retries - 1) throw error;

      // 网络错误，等待后重试
      console.log(`重试 ${i + 1}/${retries}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

#### 4. Mode ID 不存在

**错误码**: 400 Bad Request

**错误信息**: `"Invalid mode ID"`

**处理方式**:

```javascript
const VALID_MODES = ["keyword_mining", "batch_translation", "deep_mining"];

function validateModeId(modeId) {
  if (!VALID_MODES.includes(modeId)) {
    throw new Error(
      `Invalid mode ID: ${modeId}. Valid modes: ${VALID_MODES.join(", ")}`
    );
  }
}
```

---

## 💡 最佳实践

### 1. 在操作前先检查余额

```javascript
async function executeMiningTask(token, modeId) {
  // ✅ 先检查余额
  const credits = await checkCreditsBalance(token);
  const required = modeId === "deep_mining" ? 30 : 20;

  if (credits.remaining < required) {
    throw new Error("Insufficient credits");
  }

  // 执行任务
  const result = await performMining();

  // 扣除 Credits
  await consumeCredits(token, modeId, `Mining: ${result.keyword}`);

  return result;
}
```

---

### 2. 使用乐观 UI 更新

```javascript
async function performMiningWithOptimisticUI(token, modeId) {
  // 1. 立即更新 UI（乐观更新）
  const requiredCredits = modeId === "deep_mining" ? 30 : 20;
  updateLocalCreditsDisplay(-requiredCredits);

  try {
    // 2. 执行任务
    const result = await performMining();

    // 3. 扣除 Credits
    const response = await consumeCredits(token, modeId, description);

    // 4. 使用真实数据更新 UI
    updateLocalCreditsDisplay(null, response.remaining);

    return result;
  } catch (error) {
    // 5. 失败时回滚 UI
    updateLocalCreditsDisplay(+requiredCredits);
    throw error;
  }
}
```

---

### 3. 缓存用户 Credits 信息

```javascript
class CreditsManager {
  constructor(token) {
    this.token = token;
    this.cache = null;
    this.cacheTime = null;
    this.cacheDuration = 30000; // 30秒缓存
  }

  async getCredits(forceRefresh = false) {
    const now = Date.now();

    // 使用缓存
    if (
      !forceRefresh &&
      this.cache &&
      this.cacheTime &&
      now - this.cacheTime < this.cacheDuration
    ) {
      return this.cache;
    }

    // 刷新数据
    const credits = await checkCreditsBalance(this.token);
    this.cache = credits;
    this.cacheTime = now;
    return credits;
  }

  invalidateCache() {
    this.cache = null;
    this.cacheTime = null;
  }
}

// 使用
const creditsManager = new CreditsManager(token);
const credits = await creditsManager.getCredits(); // 使用缓存
await consumeCredits(token, modeId, description);
creditsManager.invalidateCache(); // 消费后清除缓存
```

---

### 4. 批量操作时合理消费

```javascript
async function batchTranslation(token, keywords, languages) {
  // ❌ 错误：每次翻译都扣费
  for (const keyword of keywords) {
    for (const lang of languages) {
      await consumeCredits(
        token,
        "batch_translation",
        `Translate: ${keyword} to ${lang}`
      );
      await translate(keyword, lang);
    }
  }

  // ✅ 正确：批量操作只扣一次费
  const totalKeywords = keywords.length * languages.length;
  await consumeCredits(
    token,
    "batch_translation",
    `Batch Translation: ${totalKeywords} keywords to ${languages.length} languages`
  );

  for (const keyword of keywords) {
    for (const lang of languages) {
      await translate(keyword, lang);
    }
  }
}
```

---

### 5. 显示 Credits 消耗提示

```javascript
function showCreditsConfirmation(modeId, description) {
  const creditsMap = {
    keyword_mining: 20,
    batch_translation: 20,
    deep_mining: 30,
  };

  const required = creditsMap[modeId];

  return confirm(
    `此操作将消耗 ${required} Credits\n` +
      `操作: ${description}\n` +
      `是否继续？`
  );
}

// 使用
if (showCreditsConfirmation("keyword_mining", "关键词挖掘")) {
  await executeTask();
}
```

---

## 📦 示例代码

### 完整的 React Hook 示例

```javascript
import { useState, useEffect, useCallback } from "react";

export function useCredits(token) {
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取 Credits 信息
  const fetchCredits = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://main-app.com/api/user/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch credits");
      }

      const data = await response.json();
      setCredits(data.credits);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // 消费 Credits
  const consumeCredits = useCallback(
    async (modeId, description) => {
      const creditsMap = {
        keyword_mining: 20,
        batch_translation: 20,
        deep_mining: 30,
      };

      const amount = creditsMap[modeId];
      if (!amount) {
        throw new Error(`Invalid mode ID: ${modeId}`);
      }

      // 检查余额
      if (credits && credits.remaining < amount) {
        throw new Error("Insufficient credits");
      }

      try {
        const response = await fetch(
          "https://main-app.com/api/credits/consume",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              credits: amount,
              description,
              relatedEntity: "subapp",
              modeId,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to consume credits");
        }

        const result = await response.json();

        // 更新本地状态
        setCredits((prev) => ({
          ...prev,
          remaining: result.remaining,
          used: result.used,
        }));

        return result;
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [token, credits]
  );

  // 初始加载
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    credits,
    loading,
    error,
    refetch: fetchCredits,
    consume: consumeCredits,
  };
}

// 使用示例
function MyComponent() {
  const token = localStorage.getItem("main_app_token");
  const { credits, loading, error, consume } = useCredits(token);

  const handleMining = async () => {
    try {
      await consume("keyword_mining", 'Keyword research for "coffee"');
      alert("✅ 挖掘成功！");
    } catch (error) {
      if (error.message.includes("Insufficient")) {
        alert("❌ Credits 不足，请充值");
      } else {
        alert("❌ 操作失败: " + error.message);
      }
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div>剩余 Credits: {credits?.remaining}</div>
      <button onClick={handleMining}>开始挖掘 (消耗 20 Credits)</button>
    </div>
  );
}
```

---

### Vue 3 Composition API 示例

```javascript
import { ref, onMounted } from "vue";

export function useCredits(token) {
  const credits = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const fetchCredits = async () => {
    if (!token.value) return;

    loading.value = true;
    error.value = null;

    try {
      const response = await fetch("https://main-app.com/api/user/dashboard", {
        headers: {
          Authorization: `Bearer ${token.value}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch credits");

      const data = await response.json();
      credits.value = data.credits;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const consumeCredits = async (modeId, description) => {
    const creditsMap = {
      keyword_mining: 20,
      batch_translation: 20,
      deep_mining: 30,
    };

    const amount = creditsMap[modeId];
    if (!amount) throw new Error(`Invalid mode ID: ${modeId}`);

    if (credits.value && credits.value.remaining < amount) {
      throw new Error("Insufficient credits");
    }

    const response = await fetch("https://main-app.com/api/credits/consume", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        credits: amount,
        description,
        relatedEntity: "subapp",
        modeId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to consume credits");
    }

    const result = await response.json();
    credits.value.remaining = result.remaining;
    credits.value.used = result.used;

    return result;
  };

  onMounted(() => {
    fetchCredits();
  });

  return {
    credits,
    loading,
    error,
    refetch: fetchCredits,
    consume: consumeCredits,
  };
}
```

---

## 🔒 安全注意事项

### 1. Token 存储安全

```javascript
// ✅ 推荐：使用 HttpOnly Cookie（如果同域）
// ✅ 可接受：localStorage（注意 XSS 风险）
localStorage.setItem("main_app_token", token);

// ❌ 不推荐：明文存储在 URL 或 sessionStorage
```

### 2. HTTPS 通信

```javascript
// ✅ 生产环境必须使用 HTTPS
const API_BASE =
  process.env.NODE_ENV === "production"
    ? "https://main-app.com/api"
    : "http://localhost:3000/api";
```

### 3. Token 验证

```javascript
// 定期验证 token 是否有效
async function validateToken(token) {
  try {
    await checkCreditsBalance(token);
    return true;
  } catch (error) {
    if (
      error.message.includes("401") ||
      error.message.includes("Unauthorized")
    ) {
      return false;
    }
    throw error;
  }
}
```

---

## 📞 技术支持

遇到问题？

1. **查看文档**: [完整 API 文档](../docs/API.md)
2. **检查状态**: 访问 `/api/health` 检查服务状态
3. **开发者工具**: 使用浏览器 Network 面板查看请求详情
4. **联系支持**: support@example.com

---

## 🎯 快速检查清单

集成前请确认：

- [ ] 已获取用户 JWT Token
- [ ] 已配置正确的 API Base URL
- [ ] 已了解三种模式的 Credits 消耗
- [ ] 已实现余额检查逻辑
- [ ] 已实现错误处理（401、400、网络错误）
- [ ] 已测试 Credits 不足的情况
- [ ] 已在 UI 中显示剩余 Credits
- [ ] 已实现操作前的确认提示

完成以上检查，即可开始集成！🚀
