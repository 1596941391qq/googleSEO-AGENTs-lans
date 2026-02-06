# PostgreSQL MCP 安装指南

## 为什么需要单独安装？

PostgreSQL MCP 需要你的数据库连接字符串，这是敏感信息，不能硬编码在脚本中。

## 安装步骤

### 1. 获取数据库连接字符串

从你的 `.env` 文件或 Vercel 环境变量中获取 `POSTGRES_URL`：

```
postgresql://username:password@host:port/database
```

### 2. 安装 PostgreSQL MCP

**方式 A：使用环境变量（推荐）**

```bash
# 在命令行中设置环境变量
set POSTGRES_URL=postgresql://username:password@host:port/database

# 安装 MCP
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres %POSTGRES_URL%
```

**方式 B：直接使用连接字符串**

```bash
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres "postgresql://username:password@host:port/database"
```

### 3. 验证安装

```bash
claude mcp list
```

你应该看到 `postgres` 在列表中。

## 安全提示

⚠️ **重要**：
- 不要在脚本或代码中硬编码数据库凭证
- 使用环境变量存储敏感信息
- 考虑使用只读数据库用户（如果只需要查询）
- 生产环境使用独立的数据库连接

## 创建只读数据库用户（可选）

如果你只需要查询数据，建议创建一个只读用户：

```sql
-- 连接到你的数据库
-- 创建只读用户
CREATE USER readonly_user WITH PASSWORD 'your_password';

-- 授予只读权限
GRANT CONNECT ON DATABASE your_database TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
```

然后使用只读用户的连接字符串安装 MCP：

```bash
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres "postgresql://readonly_user:your_password@host:port/database"
```

## 常见问题

### Q: 安装后显示 "Failed to connect"？

**可能原因**：
1. 数据库连接字符串格式错误
2. 数据库服务器不可访问
3. 防火墙阻止连接
4. 用户名或密码错误

**解决方案**：
```bash
# 1. 测试数据库连接
psql "postgresql://username:password@host:port/database"

# 2. 检查 MCP 配置
claude mcp get postgres

# 3. 重新安装
claude mcp remove postgres
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres "your_connection_string"
```

### Q: 如何切换到只读用户？

```bash
# 移除现有配置
claude mcp remove postgres

# 使用只读用户重新安装
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres "postgresql://readonly_user:password@host:port/database"
```

### Q: 可以同时连接多个数据库吗？

可以，但需要使用不同的名称：

```bash
# 开发数据库
claude mcp add postgres-dev -- npx -y @modelcontextprotocol/server-postgres "postgresql://user:pass@localhost:5432/dev_db"

# 生产数据库（只读）
claude mcp add postgres-prod -- npx -y @modelcontextprotocol/server-postgres "postgresql://readonly:pass@prod-host:5432/prod_db"
```

## 使用示例

安装后，你可以通过 Claude Code 执行数据库操作：

```
用户: "查询最近 10 条发布的文章"
Claude: 使用 postgres MCP 执行 SELECT * FROM published_articles ORDER BY created_at DESC LIMIT 10

用户: "检查 platform_sites 表结构"
Claude: 使用 postgres MCP 执行 \d platform_sites

用户: "统计每个平台的站点数量"
Claude: 使用 postgres MCP 执行 SELECT platform, COUNT(*) FROM platform_sites GROUP BY platform
```

---

**更新时间**: 2026-02-06
