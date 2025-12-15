# 跨项目认证集成实施指南
## Google/Yandex/Bing Agent 对接指南

---

## 📋 总览

本文档指导如何将 `niche-mining` (父项目) 的登录状态共享到 `google-agent`、`yandex-agent`、`bing-agent` (子项目)。

**认证机制**: 共享数据库 + 一次性 Transfer Token

**完整流程**:
1. 用户在主应用登录 (Google OAuth)
2. 点击 Agent 卡片时，主应用生成 Transfer Token
3. 子项目接收 Token，验证后创建本地 Session
4. 子项目使用 JWT 维持登录状态

---

## 🎯 第一步：父项目（niche-mining）实施

### 1.1 创建 Transfer Token API

**文件**: `api/auth/create-transfer-token.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../lib/auth.js';
import { sql } from '../lib/db.js';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. 验证用户的主 JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 2. 生成随机 Transfer Token (64位十六进制字符串)
    const transferToken = crypto.randomBytes(32).toString('hex');

    // 3. 计算 SHA256 哈希值
    const tokenHash = crypto
      .createHash('sha256')
      .update(transferToken)
      .digest('hex');

    // 4. 存入数据库 (5分钟过期)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后

    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${payload.userId}, ${tokenHash}, ${expiresAt})
    `;

    // 5. 返回明文 transfer token（仅此一次）
    return res.status(200).json({
      transferToken,
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('Create transfer token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 1.2 更新数据库 Schema

**文件**: `api/init-db.ts`

在现有的 `users` 表基础上，添加 `sessions` 表：

```typescript
// 添加到 init-db.ts 的表创建部分
await sql`
  CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
      REFERENCES users(user_id) ON DELETE CASCADE
  )
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_sessions_token_hash
  ON sessions(token_hash)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id
  ON sessions(user_id)
`;

await sql`
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON sessions(expires_at)
`;
```

### 1.3 更新 Agents 跳转逻辑

**文件**: `components/console/ConsoleAgents.tsx`

修改启动 Agent 的按钮逻辑：

```typescript
import { useAuth } from '../../contexts/AuthContext';

const ConsoleAgents: React.FC = () => {
  const { getToken } = useAuth(); // 假设 AuthContext 提供 getToken 方法

  const handleLaunchAgent = async (agentUrl: string) => {
    try {
      // 1. 获取当前用户的 JWT token
      const token = getToken();
      if (!token) {
        alert('请先登录');
        return;
      }

      // 2. 调用 API 生成 Transfer Token
      const response = await fetch('/api/auth/create-transfer-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create transfer token');
      }

      const { transferToken } = await response.json();

      // 3. 在新标签页打开子项目，传递 Transfer Token
      const url = `${agentUrl}?tt=${transferToken}`;
      window.open(url, '_blank');

    } catch (error) {
      console.error('Launch agent error:', error);
      alert('启动失败，请稍后重试');
    }
  };

  return (
    // ...现有代码...
    <button onClick={() => handleLaunchAgent(agent.url)}>
      启动 Agent
    </button>
  );
};
```

### 1.4 更新 AuthContext 提供 getToken

**文件**: `contexts/AuthContext.tsx`

```typescript
// 添加 getToken 方法
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ...现有代码...

  const getToken = () => {
    return localStorage.getItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, authenticated, loading, login, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## 🚀 第二步：子项目（google-agent 等）实施

### 2.1 环境配置

**文件**: `.env.local`

```bash
# 数据库连接 (与主项目使用相同的数据库)
POSTGRES_URL=postgres://default:xxx@xxx.postgres.vercel-storage.com:5432/verceldb

# JWT 密钥 (与主项目使用相同的密钥)
JWT_SECRET=your-jwt-secret-key-must-match-main-app

# 主应用 URL (用于验证来源)
MAIN_APP_URL=https://niche-mining-web.vercel.app
```

### 2.2 创建数据库连接工具

**文件**: `api/lib/db.ts`

```typescript
import { sql } from '@vercel/postgres';

export { sql };

// 测试数据库连接
export async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`;
    console.log('Database connected:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
```

### 2.3 创建 JWT 工具

**文件**: `api/lib/auth.ts`

```typescript
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export interface AppJWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// 生成 JWT Token (24小时有效期)
export async function generateToken(userId: string, email: string): Promise<string> {
  const token = await new SignJWT({ userId, email })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  return token;
}

// 验证 JWT Token
export async function verifyToken(token: string): Promise<AppJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AppJWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}
```

### 2.4 创建 Verify Transfer Token API

**文件**: `api/auth/verify-transfer.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';
import { generateToken } from '../lib/auth.js';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transferToken } = req.body;

    if (!transferToken) {
      return res.status(400).json({ error: 'Transfer token required' });
    }

    // 1. 计算 SHA256 哈希值
    const tokenHash = crypto
      .createHash('sha256')
      .update(transferToken)
      .digest('hex');

    // 2. 在共享数据库中查询 session
    const sessionResult = await sql`
      SELECT id, user_id, created_at, expires_at, last_used_at
      FROM sessions
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
    `;

    if (sessionResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid or expired transfer token' });
    }

    const session = sessionResult.rows[0];

    // 3. 验证一次性使用 (created_at === last_used_at)
    if (session.created_at.getTime() !== session.last_used_at.getTime()) {
      return res.status(401).json({ error: 'Transfer token already used' });
    }

    // 4. 获取用户信息
    const userResult = await sql`
      SELECT user_id, email, name, picture
      FROM users
      WHERE user_id = ${session.user_id}
    `;

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // 5. 删除 transfer token (一次性使用)
    await sql`DELETE FROM sessions WHERE id = ${session.id}`;

    // 6. 生成长期 JWT token (24小时)
    const jwtToken = await generateToken(user.user_id, user.email);

    // 7. 返回用户数据和 JWT
    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });

  } catch (error) {
    console.error('Verify transfer token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 2.5 创建或更新 AuthContext

**文件**: `contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  userId: string;
  email: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  authenticated: false,
  loading: true,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      // 1. 检查 URL 中是否有 Transfer Token
      const urlParams = new URLSearchParams(window.location.search);
      const transferToken = urlParams.get('tt');

      if (transferToken) {
        // 立即清除 URL 参数（防止被记录）
        window.history.replaceState({}, '', window.location.pathname);

        // 验证 Transfer Token
        const response = await fetch('/api/auth/verify-transfer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transferToken }),
        });

        if (response.ok) {
          const data = await response.json();

          // 保存长期 JWT 到 localStorage
          localStorage.setItem('auth_token', data.token);
          setUser(data.user);
          setLoading(false);
          return;
        }
      }

      // 2. 检查本地是否已有 JWT Token
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        // 验证本地 Token
        const response = await fetch('/api/auth/session', {
          headers: { 'Authorization': `Bearer ${storedToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Token 无效，清除
          localStorage.removeItem('auth_token');
        }
      }

    } catch (error) {
      console.error('Auth initialization error:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    window.location.href = process.env.MAIN_APP_URL || 'https://niche-mining-web.vercel.app';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authenticated: !!user,
        loading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

### 2.6 创建 Session 验证 API (可选)

**文件**: `api/auth/session.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken } from '../lib/auth.js';
import { sql } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const payload = await verifyToken(token);

    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // 从数据库获取最新用户信息
    const result = await sql`
      SELECT user_id, email, name, picture
      FROM users
      WHERE user_id = ${payload.userId}
    `;

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    return res.status(200).json({
      user: {
        userId: user.user_id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });

  } catch (error) {
    console.error('Session verification error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## 🧪 第三步：测试流程

### 3.1 本地测试

1. **启动主应用** (niche-mining)
   ```bash
   npm run dev  # localhost:3000
   ```

2. **启动子项目** (google-agent)
   ```bash
   npm run dev  # localhost:3001
   ```

3. **测试流程**:
   - 在主应用登录
   - 访问 Console → Agents
   - 点击"启动 Google Agent"
   - 新标签页应该自动登录

### 3.2 生产环境部署

1. **部署主应用**
   ```bash
   vercel --prod
   ```

2. **部署子项目并配置环境变量**
   ```bash
   cd google-agent
   vercel env add POSTGRES_URL production
   vercel env add JWT_SECRET production
   vercel env add MAIN_APP_URL production
   vercel --prod
   ```

3. **验证环境变量**:
   - 确保所有项目使用相同的 `POSTGRES_URL`
   - 确保所有项目使用相同的 `JWT_SECRET`

---

## 📊 第四步：数据库维护

### 4.1 清理过期 Sessions

**文件**: `api/cron/cleanup-sessions.ts`

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1. 删除过期的 sessions
    const expiredResult = await sql`
      DELETE FROM sessions
      WHERE expires_at < NOW()
    `;

    // 2. 删除超过 30 天的旧 sessions
    const oldResult = await sql`
      DELETE FROM sessions
      WHERE created_at < NOW() - INTERVAL '30 days'
    `;

    return res.status(200).json({
      success: true,
      expiredDeleted: expiredResult.rowCount,
      oldDeleted: oldResult.rowCount,
    });

  } catch (error) {
    console.error('Cleanup sessions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**配置 Vercel Cron Job**:

**文件**: `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/cleanup-sessions",
    "schedule": "0 */6 * * *"
  }]
}
```

---

## ✅ 检查清单

### 父项目 (niche-mining)

- [ ] 创建 `api/auth/create-transfer-token.ts`
- [ ] 更新 `api/init-db.ts` (添加 sessions 表)
- [ ] 运行数据库初始化: `curl https://niche-mining-web.vercel.app/api/init-db`
- [ ] 更新 `components/console/ConsoleAgents.tsx` (修改跳转逻辑)
- [ ] 更新 `contexts/AuthContext.tsx` (添加 getToken 方法)
- [ ] 部署到 Vercel

### 子项目 (google-agent, yandex-agent, bing-agent)

- [ ] 配置环境变量 (POSTGRES_URL, JWT_SECRET, MAIN_APP_URL)
- [ ] 创建 `api/lib/db.ts`
- [ ] 创建 `api/lib/auth.ts`
- [ ] 创建 `api/auth/verify-transfer.ts`
- [ ] 创建 `api/auth/session.ts`
- [ ] 创建或更新 `contexts/AuthContext.tsx`
- [ ] 测试本地登录流程
- [ ] 部署到 Vercel

### 数据库维护

- [ ] 创建 `api/cron/cleanup-sessions.ts`
- [ ] 配置 `vercel.json` Cron Job
- [ ] 验证定时任务执行

---

## 🔒 安全注意事项

1. **JWT_SECRET 必须相同**
   - 所有项目(主应用+子项目)使用相同的 JWT_SECRET
   - 使用强随机字符串 (至少32字符)

2. **POSTGRES_URL 必须相同**
   - 所有项目连接同一个 Vercel Postgres 数据库
   - 确保在 Vercel Team 中共享数据库访问权限

3. **Transfer Token 安全**
   - 5分钟自动过期
   - 一次性使用后立即删除
   - 存储哈希值而非明文

4. **URL 清理**
   - 子项目接收到 Transfer Token 后立即清除 URL
   - 使用 `window.history.replaceState()` 而非 `window.location.replace()`

---

## 📞 问题排查

### 问题1: "Invalid or expired transfer token"

**可能原因**:
- Transfer Token 已过期 (超过5分钟)
- Transfer Token 已被使用
- 网络延迟导致请求失败

**解决方案**:
- 重新点击 Agent 卡片
- 检查系统时间是否正确
- 查看浏览器控制台错误

### 问题2: "User not found"

**可能原因**:
- 数据库连接不正确
- 使用了不同的数据库
- 用户数据未同步

**解决方案**:
- 检查 `POSTGRES_URL` 环境变量
- 确认主应用和子项目使用同一数据库
- 在主应用重新登录

### 问题3: JWT Token 无法验证

**可能原因**:
- `JWT_SECRET` 不一致
- Token 格式错误

**解决方案**:
- 检查所有项目的 `JWT_SECRET` 是否相同
- 清除 localStorage 重新登录
- 检查 jose 库版本是否一致

---

## 🎉 完成！

按照以上步骤，您的 Google/Yandex/Bing Agent 子项目应该能够成功对接主应用的登录状态了。

**下一步**:
1. 测试完整的登录流程
2. 监控数据库 sessions 表
3. 配置 Cron Job 定期清理
4. 根据需要扩展到更多子项目

---

**文档版本**: 1.0
**创建日期**: 2025-12-16
**维护者**: Niche Mining Team
