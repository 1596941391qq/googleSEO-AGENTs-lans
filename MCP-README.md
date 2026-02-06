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

### 3. pencil ⚠️
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
