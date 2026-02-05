# 数据库迁移执行指南

## 问题描述
旧文章点击更新后，发布平台信息丢失。原因是旧文章使用的是已弃用的 `github_pages` 平台，需要迁移到新平台（CF Pages/Netlify/Vercel）。

## 解决方案
执行数据库迁移，清理旧的 `github_pages` 平台绑定，下次更新文章时系统会自动创建新平台绑定。

---

## 执行方式（3选1）

### 方式1：Vercel Postgres 控制台（推荐）✅

**步骤：**

1. **登录 Vercel Dashboard**
   - 访问：https://vercel.com/dashboard
   - 进入你的项目

2. **打开 Postgres 数据库**
   - 点击 Storage 标签
   - 选择你的 Postgres 数据库
   - 点击 "Query" 或 "Data" 标签

3. **执行 SQL 脚本**
   - 打开文件：`scripts/migrate-step-by-step.sql`
   - 按照文件中的步骤说明，依次复制执行：
     - 第一步：查看影响范围（只读）
     - 第二步：执行迁移（修改数据）
     - 第三步：验证结果（只读）

4. **验证成功**
   - 第三步的查询应该显示：
     - `remaining_active_github_pages = 0`
     - `remaining_github_pages_bindings = 0`

---

### 方式2：使用 psql 命令行工具

**前提条件：**
- 已安装 PostgreSQL 客户端工具
- 有数据库连接字符串

**步骤：**

```bash
# 1. 从 Vercel 获取数据库连接字符串
# Dashboard -> Storage -> Postgres -> .env.local -> 复制 POSTGRES_URL

# 2. 连接数据库
psql "postgres://username:password@host/database?sslmode=require"

# 3. 执行迁移脚本
\i scripts/migrate-step-by-step.sql

# 或者直接执行
psql "postgres://..." -f scripts/migrate-step-by-step.sql
```

---

### 方式3：使用 Node.js 脚本

**步骤：**

```powershell
# Windows PowerShell

# 1. 设置环境变量（从 Vercel 复制）
$env:POSTGRES_URL="postgres://username:password@host/database?sslmode=require"

# 2. 执行迁移脚本
npx tsx scripts/execute-migration.ts
```

```bash
# macOS/Linux

# 1. 设置环境变量
export POSTGRES_URL="postgres://username:password@host/database?sslmode=require"

# 2. 执行迁移脚本
npx tsx scripts/execute-migration.ts
```

---

## 验证迁移效果

### 1. 数据库验证
执行以下查询，确认结果：

```sql
-- 应该返回 0
SELECT COUNT(*) FROM platform_sites 
WHERE platform = 'github_pages' AND status = 'active';

-- 应该返回 0
SELECT COUNT(*) FROM website_site_bindings 
WHERE site_id IN (
    SELECT id FROM platform_sites WHERE platform = 'github_pages'
);
```

### 2. 应用验证

1. **打开应用**
2. **找一篇旧文章**（之前发布过的）
3. **点击"更新"按钮**
4. **观察结果**：
   - ✅ 系统自动检测到没有可用平台
   - ✅ 自动重新发布到新平台（CF Pages/Netlify/Vercel）
   - ✅ 文章成功更新
   - ✅ 平台信息正常显示（不再丢失）

---

## 迁移影响说明

### ✅ 不会影响的内容
- 用户的文章数据（标题、内容、关键词等）
- 文章的发布状态
- 用户的网站配置
- 旧的 GitHub 仓库（保留，不删除）

### 🔄 会改变的内容
- `platform_sites` 表中 `github_pages` 平台的站点状态改为 `deprecated`
- `website_site_bindings` 表中 `github_pages` 的绑定关系被删除
- 下次更新文章时，会自动创建新的平台绑定（CF Pages/Netlify/Vercel）

### 📝 用户体验
- 用户无感知
- 下次更新文章时，可能需要等待稍长时间（因为要创建新平台项目）
- 更新成功后，文章会发布到新平台，URL 可能会改变

---

## 回滚方案

如果迁移后发现问题，可以执行以下 SQL 回滚：

```sql
-- 恢复 github_pages 站点状态
UPDATE platform_sites 
SET status = 'active', updated_at = NOW() 
WHERE platform = 'github_pages' AND status = 'deprecated';

-- 注意：绑定关系已删除，无法自动恢复
-- 需要手动重新创建绑定或让用户重新发布文章
```

**建议**：迁移前先在测试环境执行，确认无误后再在生产环境执行。

---

## 常见问题

### Q1: 迁移后旧文章的 URL 会改变吗？
A: 会。因为文章会重新发布到新平台（CF Pages/Netlify/Vercel），URL 会改变。但文章内容和数据不受影响。

### Q2: 迁移需要多长时间？
A: SQL 执行只需几秒钟。但用户下次更新文章时，需要等待新平台项目创建（约 1-2 分钟）。

### Q3: 如果迁移失败怎么办？
A: 可以执行回滚 SQL，或者联系技术支持。迁移脚本是幂等的，可以重复执行。

### Q4: 需要通知用户吗？
A: 建议在应用中添加一个提示，告知用户旧文章更新时可能需要稍长时间。

---

## 执行清单

- [ ] 备份数据库（可选，Vercel 有自动备份）
- [ ] 选择执行方式（推荐方式1）
- [ ] 执行第一步：查看影响范围
- [ ] 确认影响范围可接受
- [ ] 执行第二步：执行迁移
- [ ] 执行第三步：验证结果
- [ ] 在应用中测试旧文章更新功能
- [ ] 确认平台信息不再丢失
- [ ] 完成 ✅

---

## 技术细节

### 迁移原理
1. 将所有 `github_pages` 平台的站点标记为 `deprecated`
2. 删除这些站点与用户网站的绑定关系
3. 下次更新文章时，`updatePublishedArticle` 函数会检测到没有可用绑定
4. 返回 `FORCE_REPUBLISH` 错误
5. 前端捕获错误，自动调用 `publishArticle` 重新发布
6. `publishArticle` 会自动创建新的平台绑定（CF Pages/Netlify/Vercel）

### 相关代码文件
- `api/articles/update-published.ts` - 更新已发布文章的 API
- `api/_shared/services/pseo-publisher.ts` - 发布服务核心逻辑
- `api/lib/database.ts` - 数据库操作

---

**执行建议**：使用方式1（Vercel Postgres 控制台），最简单、最安全。

