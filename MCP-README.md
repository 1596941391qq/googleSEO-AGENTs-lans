# MCP 服务使用指南

> Model Context Protocol (MCP) 服务配置与使用文档
> 项目：NicheDigger - AI + PSEO Agent
> 更新时间：2026-02-06

---
pgsql本地配置：DATABASE_URL="postgres://postgres:123456@127.0.0.1:5432/postgres"
POSTGRES_URL=postgres://postgres:123456@127.0.0.1:5432/postgres
PRISMA_DATABASE_URL="postgres://postgres:123456@127.0.0.1:5432/postgres"
pgsql线上配置：DATABASE_URL="postgres://a214f995500e9883025fe7b472115e6688d0e8349a02bef1d139878f294c1f1e:sk_uK0a2fZGrPNTLp8EFtx-s@db.prisma.io:5432/postgres?sslmode=require"
POSTGRES_URL="postgres://a214f995500e9883025fe7b472115e6688d0e8349a02bef1d139878f294c1f1e:sk_uK0a2fZGrPNTLp8EFtx-s@db.prisma.io:5432/postgres?sslmode=require"
PRISMA_DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza191SzBhMmZaR3JQTlRMcDhFRnR4LXMiLCJhcGlfa2V5IjoiMDFLQ0M5SEczQlQwREVSNUJIQjIwSEhXSEoiLCJ0ZW5hbnRfaWQiOiJhMjE0Zjk5NTUwMGU5ODgzMDI1ZmU3YjQ3MjExNWU2Njg4ZDBlODM0OWEwMmJlZjFkMTM5ODc4ZjI5NGMxZjFlIiwiaW50ZXJuYWxfc2VjcmV0IjoiM2RmN2M3MzUtMDQ2ZC00MDY2LTljNGItOGY5M2I0ZmQ2ZWE3In0.pLA0b1U34do5xFLQ-Sz7TDhpmpTFS0hqb_VCuRG9htI"


## 📋 目录

- [已安装的 MCP](#已安装的-mcp)
- [推荐的 MCP](#推荐的-mcp)
- [安装指南](#安装指南)
- [详细说明](#详细说明)
- [常见问题](#常见问题)

---

## 已安装的 MCP

### 1. browsermcp ✅
**状态**: 已安装（未连接）
**用途**: 浏览器自动化测试和页面验证

**主要功能**:
- 打开网页并截图
- 填写表单和点击按钮
- 提取页面数据
- 测试 UI 交互
- 验证页面渲染效果

**典型命令**:
```bash
# 通过 Claude Code 调用（自动）
# 打开页面: "打开 http://localhost:3002"
# 截图: "截图当前页面"
# 点击: "点击登录按钮"
```

**典型风险**:
- ⚠️ 可能触发真实的表单提交（测试时注意）
- ⚠️ 浏览器进程可能占用资源
- ⚠️ 需要确保开发服务器运行在 localhost:3002

**使用场景**:
- ✅ 验证 UI 改动后的页面效果
- ✅ 测试表单提交流程
- ✅ 检查响应式布局
- ✅ 调试前端 bug

---

### 2. context7 ✅
**状态**: 已安装（未连接）
**用途**: 长期上下文管理和知识库

**主要功能**:
- 存储和检索长期上下文
- 跨会话知识共享
- 项目文档管理
- 代码片段存储

**典型命令**:
```bash
# 通过 Claude Code 调用（自动）
# 存储上下文: "记住这个配置"
# 检索上下文: "之前我们讨论的配置是什么"
```

**典型风险**:
- ⚠️ 需要 Upstash 账号和 API key
- ⚠️ 存储的数据可能有大小限制
- ⚠️ 网络连接问题可能导致失败

**使用场景**:
- ✅ 记录项目配置和决策
- ✅ 存储常用代码模板
- ✅ 跨会话保持上下文

---

### 3. postgres-local ✅
**状态**: 已安装
**用途**: 本地开发数据库操作

**连接信息**:
- 数据库: PostgreSQL 127.0.0.1:5432
- 用途: 本地开发和测试

**主要功能**:
- 执行 SQL 查询
- 查看表结构
- 数据库调试
- 迁移脚本测试

**典型命令**:
```
"使用 postgres-local 查询 published_articles 表"
"查看本地数据库的所有表"
"检查 platform_sites 表结构"
```

**典型风险**:
- 🔴 **高风险**: 可以执行 DELETE/DROP 等破坏性操作
- ⚠️ 仅限本地开发环境使用

**使用场景**:
- ✅ 本地数据库调试
- ✅ 测试迁移脚本
- ✅ 开发环境数据查询

---

### 4. postgres-prod ✅
**状态**: 已安装
**用途**: 线上生产数据库操作

**连接信息**:
- 数据库: Prisma db.prisma.io:5432
- 用途: 生产环境数据库

**主要功能**:
- 执行只读查询（推荐）
- 查看线上表结构
- 生产数据分析
- 迁移脚本执行

**典型命令**:
```
"使用 postgres-prod 查询最近发布的文章"
"检查线上数据库的表结构"
"统计生产环境的用户数量"
```

**典型风险**:
- 🔴 **极高风险**: 直接操作生产数据库
- 🔴 可能影响线上服务
- 🔴 数据删除无法恢复

**使用场景**:
- ✅ 生产数据分析
- ✅ 迁移脚本执行（谨慎）
- ✅ 数据库结构对比
- ❌ 避免直接修改数据

**安全建议**:
- 仅执行只读查询
- 修改操作需要明确确认
- 定期备份数据库
- 使用事务保护

---

### 5. pencil ⚠️
**状态**: 已安装（Cursor 扩展相关）
**用途**: Cursor IDE 集成功能

**主要功能**:
- Cursor 编辑器增强功能
- 代码补全和建议

**典型风险**:
- ⚠️ 仅在 Cursor IDE 中有效
- ⚠️ 可能与 Claude Code 冲突

**建议**: 如果不使用 Cursor，可以移除此 MCP

---

## 推荐的 MCP

### 4. postgres 🔧 (推荐安装)
**用途**: PostgreSQL 数据库操作

**主要功能**:
- 执行 SQL 查询
- 查看表结构
- 数据库迁移
- 数据导入导出

**安装命令**:
```bash
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://user:password@localhost:5432/dbname
```

**典型风险**:
- 🔴 **高风险**: 可以执行 DELETE/DROP 等破坏性操作
- 🔴 需要数据库凭证（敏感信息）
- ⚠️ 生产环境使用需谨慎

**使用场景**:
- ✅ 查询用户数据
- ✅ 检查表结构
- ✅ 调试数据库问题
- ❌ 避免在生产环境直接操作

---

### 5. github 🔧 (推荐安装)
**用途**: GitHub 仓库管理和自动化

**主要功能**:
- 创建和管理仓库
- 提交代码和创建 PR
- 管理 Issues 和 Projects
- 触发 GitHub Actions

**安装命令**:
```bash
claude mcp add github -- npx -y @modelcontextprotocol/server-github
```

**环境变量**:
```bash
GITHUB_PERSONAL_ACCESS_TOKEN=your_token_here
```

**典型风险**:
- 🔴 **高风险**: 可以删除仓库和分支
- 🔴 可以推送代码到远程仓库
- ⚠️ 需要 GitHub Personal Access Token

**使用场景**:
- ✅ 自动创建发布仓库（Read the Docs）
- ✅ 管理 GitHub Pages 部署
- ✅ 自动化 PR 创建
- ❌ 避免删除重要分支

---

### 6. filesystem 🔧 (推荐安装)
**用途**: 文件系统操作增强

**主要功能**:
- 批量文件操作
- 文件搜索和过滤
- 目录树生成
- 文件监听

**安装命令**:
```bash
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/allowed/directory
```

**典型风险**:
- 🔴 **高风险**: 可以删除文件
- ⚠️ 仅限指定目录访问
- ⚠️ 大文件操作可能耗时

**使用场景**:
- ✅ 批量重命名文件
- ✅ 生成项目结构文档
- ✅ 文件内容搜索

---

### 7. fetch 🔧 (可选)
**用途**: HTTP 请求测试

**主要功能**:
- 发送 HTTP 请求
- 测试 API 端点
- 查看响应头和状态码

**安装命令**:
```bash
claude mcp add fetch -- npx -y @modelcontextprotocol/server-fetch
```

**典型风险**:
- ⚠️ 可能触发真实的 API 调用
- ⚠️ 需要注意 API 限流

**使用场景**:
- ✅ 测试 Vercel API 端点
- ✅ 验证第三方 API 集成
- ✅ 调试网络请求

---

## 安装指南

### 快速安装推荐的 MCP

```bash
# 1. 安装 GitHub MCP（用于发布系统）
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=your_token -- npx -y @modelcontextprotocol/server-github

# 2. 安装 PostgreSQL MCP（用于数据库操作）
# 替换为你的实际数据库连接字符串
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://user:password@localhost:5432/dbname

# 3. 安装 Filesystem MCP（限制在项目目录）
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem D:\google-seo-agent

# 4. 安装 Fetch MCP（可选）
claude mcp add fetch -- npx -y @modelcontextprotocol/server-fetch
```

### 验证安装

```bash
# 查看所有已安装的 MCP
claude mcp list

# 查看特定 MCP 的详细信息
claude mcp get github
```

### 移除不需要的 MCP

```bash
# 移除 pencil（如果不使用 Cursor）
claude mcp remove pencil
```

---

## 详细说明

### MCP 工作原理

MCP (Model Context Protocol) 是一种标准化协议，允许 AI 助手（如 Claude Code）与外部工具和服务交互。

**工作流程**:
1. Claude Code 识别需要外部工具的任务
2. 通过 MCP 协议调用相应的服务
3. MCP 服务执行操作并返回结果
4. Claude Code 处理结果并继续任务

### 安全最佳实践

1. **最小权限原则**
   - 仅安装必需的 MCP
   - 限制文件系统访问范围
   - 使用只读数据库连接（如果可能）

2. **敏感信息保护**
   - 使用环境变量存储 API keys
   - 不要在代码中硬编码凭证
   - 定期轮换 tokens

3. **生产环境隔离**
   - 开发环境使用测试数据库
   - 避免在生产环境直接操作
   - 使用 staging 环境验证

4. **操作审计**
   - 记录所有破坏性操作
   - 定期备份重要数据
   - 使用版本控制

---

## 常见问题

### Q1: MCP 显示 "Failed to connect" 怎么办？

**原因**:
- MCP 服务未启动
- 网络连接问题
- 配置错误

**解决方案**:
```bash
# 1. 检查 MCP 配置
claude mcp get <mcp-name>

# 2. 重新安装 MCP
claude mcp remove <mcp-name>
claude mcp add <mcp-name> ...

# 3. 检查网络连接
# 确保可以访问 npm registry
```

### Q2: 如何临时禁用某个 MCP？

```bash
# 移除 MCP
claude mcp remove <mcp-name>

# 需要时重新添加
claude mcp add <mcp-name> ...
```

### Q3: MCP 会自动执行操作吗？

**不会**。Claude Code 会：
1. 先询问你是否允许执行
2. 显示将要执行的操作
3. 等待你的确认

你可以在 `.claude/settings.local.json` 中配置自动允许的操作。

### Q4: 如何查看 MCP 的日志？

```bash
# MCP 日志通常在 Claude Code 的输出中
# 查看详细信息
claude mcp get <mcp-name>
```

---

## 项目特定配置

### 针对 NicheDigger 项目的 MCP 配置

**必需 MCP**:
1. ✅ **browsermcp** - 验证 UI 和测试页面（已安装）
2. 🔧 **github** - 自动化发布系统（Read the Docs, GitHub Pages）
3. 🔧 **postgres** - 数据库管理和调试

**推荐配置**:
```bash
# 1. GitHub MCP（用于发布系统）
claude mcp add github -e GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN -- npx -y @modelcontextprotocol/server-github

# 2. PostgreSQL MCP（使用项目数据库）
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres $POSTGRES_URL

# 3. Filesystem MCP（限制在项目目录）
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem D:\google-seo-agent
```

**使用场景示例**:

1. **发布内容到 Read the Docs**
   ```
   用户: "发布这篇文章到 Read the Docs"
   Claude: 使用 github MCP 创建仓库 → 推送内容 → 触发部署
   ```

2. **验证页面效果**
   ```
   用户: "检查登录页面是否正常"
   Claude: 使用 browsermcp 打开 localhost:3002 → 截图 → 验证
   ```

3. **查询数据库**
   ```
   用户: "查看最近发布的文章"
   Claude: 使用 postgres MCP 查询 published_articles 表
   ```

---

## 更新日志

- **2026-02-06**: 初始版本
  - 记录已安装的 MCP（browsermcp, context7, pencil）
  - 推荐项目所需的 MCP（github, postgres, filesystem）
  - 添加详细的使用说明和风险提示

---

## 参考资源

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [Claude Code 文档](https://docs.anthropic.com/claude/docs)
- [MCP 服务器列表](https://github.com/modelcontextprotocol/servers)

---

**注意**: 本文档会随着项目需求变化而更新。如有问题，请查看 `.claude/settings.local.json` 中的实际配置。

---

## 🔄 数据库迁移自动化

### 核心功能

利用 `postgres-local` 和 `postgres-prod` 两个 MCP，可以实现：

1. **自动对比数据库差异**
   - 对比表结构（新增/删除/修改）
   - 对比列定义（类型/约束/默认值）
   - 对比索引和约束

2. **自动生成迁移 SQL**
   - CREATE TABLE 语句
   - ALTER TABLE 语句
   - CREATE INDEX 语句
   - 回滚脚本

3. **安全执行迁移**
   - 本地测试验证
   - 事务保护
   - 备份建议

### 快速开始

#### 1. 全量对比并生成迁移

```
用户: "对比本地和线上数据库，生成迁移 SQL"
```

Claude Code 会：
- 读取本地数据库结构（postgres-local）
- 读取线上数据库结构（postgres-prod）
- 对比差异
- 生成迁移文件到 `migrations/` 目录

#### 2. 检查特定表的差异

```
用户: "检查 platform_sites 表在本地和线上的差异"
```

#### 3. 生成迁移并执行

```
用户: "生成迁移 SQL 并在本地测试"
```

### 迁移示例

#### 场景 1：新增表

```sql
-- 本地新增了 article_tags 表
CREATE TABLE IF NOT EXISTS article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES published_articles(id),
  tag_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 场景 2：新增列

```sql
-- 给 published_articles 表新增 seo_score 列
ALTER TABLE published_articles
ADD COLUMN seo_score INTEGER DEFAULT 0;
```

#### 场景 3：修改列类型

```sql
-- 将 content 列从 VARCHAR 改为 TEXT
ALTER TABLE published_articles
ALTER COLUMN content TYPE TEXT;
```

### 安全检查清单

执行迁移前必须确认：

- [ ] ✅ 已备份生产数据库
- [ ] ✅ 已在本地测试迁移脚本
- [ ] ✅ 已检查所有 SQL 语句
- [ ] ✅ 已确认删除操作的必要性
- [ ] ✅ 已准备回滚方案
- [ ] ✅ 已选择低流量时段

### 详细文档

完整的迁移指南请查看：[DB-MIGRATION-GUIDE.md](./DB-MIGRATION-GUIDE.md)

包含：
- 详细使用方法
- 迁移类型说明
- 安全最佳实践
- 故障排查
- 示例对话

---

## 📊 MCP 使用统计

### 当前已安装（8个）

| MCP | 状态 | 用途 | 风险等级 |
|-----|------|------|----------|
| browsermcp | ✅ 已安装 | 浏览器自动化 | ⚠️ 中 |
| context7 | ✅ 已安装 | 上下文管理 | ⚠️ 低 |
| postgres-local | ✅ 已安装 | 本地数据库 | 🔴 高 |
| postgres-prod | ✅ 已安装 | 线上数据库 | 🔴 极高 |
| pencil | ⚠️ 已安装 | Cursor 集成 | ⚠️ 低 |
| github | ✅ 已安装 | GitHub 管理 | 🔴 高 |
| filesystem | ✅ 已安装 | 文件系统 | 🔴 高 |
| fetch | ✅ 已安装 | HTTP 请求 | ⚠️ 中 |

### 推荐配置优先级

**必需（已安装）**:
1. ✅ browsermcp - UI 测试验证
2. ✅ postgres-local - 本地数据库开发
3. ✅ postgres-prod - 生产数据库管理
4. ✅ github - 发布系统自动化

**推荐（已安装）**:
5. ✅ filesystem - 文件批量操作
6. ✅ fetch - API 测试
7. ✅ context7 - 上下文管理

**可选**:
8. ⚠️ pencil - 仅 Cursor 用户需要

---

## 更新日志

- **2026-02-06 v2.0**: 
  - ✅ 新增 postgres-local 和 postgres-prod MCP
  - ✅ 实现数据库迁移自动化功能
  - ✅ 新增 DB-MIGRATION-GUIDE.md 详细文档
  - ✅ 新增 github、filesystem、fetch MCP
  - ✅ 更新 MCP 使用统计表格

- **2026-02-06 v1.0**: 初始版本
  - 记录已安装的 MCP（browsermcp, context7, pencil）
  - 推荐项目所需的 MCP
  - 添加详细的使用说明和风险提示

