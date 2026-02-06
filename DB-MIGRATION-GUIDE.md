# 数据库迁移自动化指南

## 概述

利用 PostgreSQL MCP，我们可以实现本地和线上数据库的自动对比和迁移脚本生成。

## 已安装的 MCP

- ✅ **postgres-local** - 本地开发数据库 (127.0.0.1:5432)
- ✅ **postgres-prod** - 线上生产数据库 (Prisma db.prisma.io)

## 使用方法

### 方式 1：通过 Claude Code 对话（推荐）

直接在 Claude Code 中说：

```
"对比本地和线上数据库的差异，生成迁移 SQL"
```

Claude Code 会自动：
1. 使用 `postgres-local` MCP 读取本地数据库结构
2. 使用 `postgres-prod` MCP 读取线上数据库结构
3. 对比差异（表、列、索引、约束）
4. 生成迁移 SQL 文件到 `migrations/` 目录

### 方式 2：手动步骤

#### 步骤 1：检查本地数据库结构

```
"使用 postgres-local 查询所有表的结构"
```

Claude Code 会执行：
```sql
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

#### 步骤 2：检查线上数据库结构

```
"使用 postgres-prod 查询所有表的结构"
```

#### 步骤 3：对比差异

```
"对比两个数据库的差异，列出所有不同的表和列"
```

#### 步骤 4：生成迁移 SQL

```
"根据差异生成迁移 SQL 脚本"
```

## 迁移类型

### 1. 新增表

```sql
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 新增列

```sql
ALTER TABLE existing_table
ADD COLUMN new_column VARCHAR(100);
```

### 3. 修改列类型

```sql
ALTER TABLE existing_table
ALTER COLUMN column_name TYPE TEXT;
```

### 4. 删除列（谨慎）

```sql
-- 删除操作默认被注释，需要手动确认
-- ALTER TABLE existing_table DROP COLUMN old_column;
```

### 5. 新增索引

```sql
CREATE INDEX idx_table_column ON table_name(column_name);
```

### 6. 新增约束

```sql
ALTER TABLE table_name
ADD CONSTRAINT fk_constraint
FOREIGN KEY (column_id) REFERENCES other_table(id);
```

## 安全检查清单

在执行迁移前，请确认：

- [ ] 已备份生产数据库
- [ ] 已在本地测试迁移脚本
- [ ] 已检查所有 SQL 语句的正确性
- [ ] 已确认删除操作的必要性
- [ ] 已准备回滚方案
- [ ] 已通知团队成员
- [ ] 已选择低流量时段执行

## 执行迁移

### 在本地测试

```bash
# 连接到本地数据库
psql postgres://postgres:123456@127.0.0.1:5432/postgres

# 执行迁移
\i migrations/2026-02-06_auto_migration.sql

# 验证结果
\dt  # 查看所有表
\d table_name  # 查看表结构
```

### 在线上执行

```bash
# 1. 备份数据库
pg_dump "postgres://..." > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 连接到线上数据库
psql "postgres://a214f995500e9883025fe7b472115e6688d0e8349a02bef1d139878f294c1f1e:sk_uK0a2fZGrPNTLp8EFtx-s@db.prisma.io:5432/postgres?sslmode=require"

# 3. 执行迁移
\i migrations/2026-02-06_auto_migration.sql

# 4. 验证结果
SELECT * FROM information_schema.tables WHERE table_schema = 'public';
```

## 常见场景

### 场景 1：本地新增了表，需要同步到线上

```
用户: "我在本地新增了 article_tags 表，帮我生成迁移 SQL"
Claude: 使用 postgres-local 读取 article_tags 表结构 → 生成 CREATE TABLE 语句
```

### 场景 2：修改了列类型

```
用户: "我把 published_articles.content 从 VARCHAR 改成了 TEXT，生成迁移 SQL"
Claude: 生成 ALTER TABLE ... ALTER COLUMN ... TYPE TEXT 语句
```

### 场景 3：全量对比

```
用户: "对比本地和线上的所有差异"
Claude: 读取两边的完整结构 → 对比 → 生成完整迁移脚本
```

### 场景 4：只检查特定表

```
用户: "检查 platform_sites 表在本地和线上的差异"
Claude: 只对比这一个表的结构
```

## 高级功能

### 1. 生成回滚脚本

```
"生成迁移脚本的同时，也生成回滚脚本"
```

### 2. 数据迁移

```
"除了结构迁移，还需要迁移 platform_tokens 表的数据"
```

### 3. 批量迁移

```
"生成最近一周所有本地修改的迁移脚本"
```

### 4. 迁移验证

```
"执行迁移后，验证线上数据库结构是否正确"
```

## 最佳实践

### 1. 使用版本控制

所有迁移文件都应该提交到 Git：

```bash
git add migrations/2026-02-06_auto_migration.sql
git commit -m "feat: add article_tags table migration"
```

### 2. 命名规范

迁移文件命名格式：
```
YYYYMMDD_HHMMSS_description.sql
```

例如：
- `20260206_143022_add_article_tags_table.sql`
- `20260206_150000_alter_content_column_type.sql`

### 3. 迁移文件结构

```sql
-- 迁移说明
-- 作者: Claude Code
-- 日期: 2026-02-06
-- 描述: 新增 article_tags 表

BEGIN;

-- 迁移语句
CREATE TABLE article_tags (...);

COMMIT;

-- 回滚脚本
-- BEGIN;
-- DROP TABLE article_tags;
-- COMMIT;
```

### 4. 测试流程

1. 本地开发 → 修改数据库
2. 生成迁移脚本
3. 在本地测试迁移
4. 提交到 Git
5. 在 staging 环境测试
6. 在生产环境执行

## 故障排查

### 问题 1：MCP 连接失败

```bash
# 检查 MCP 状态
claude mcp list

# 重新安装
claude mcp remove postgres-local
claude mcp add postgres-local -- npx -y @modelcontextprotocol/server-postgres "postgres://..."
```

### 问题 2：权限不足

确保数据库用户有足够的权限：

```sql
-- 查看当前用户权限
SELECT * FROM information_schema.role_table_grants WHERE grantee = current_user;

-- 授予权限（如果需要）
GRANT ALL PRIVILEGES ON DATABASE postgres TO your_user;
```

### 问题 3：迁移执行失败

```sql
-- 回滚事务
ROLLBACK;

-- 检查错误日志
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## 示例对话

### 完整迁移流程

```
用户: "对比本地和线上数据库，生成迁移 SQL"

Claude:
1. 正在读取本地数据库结构...
   - 发现 25 个表
   - 发现 180 个列
   - 发现 45 个索引

2. 正在读取线上数据库结构...
   - 发现 23 个表
   - 发现 165 个列
   - 发现 40 个索引

3. 对比差异...
   - 新增表: article_tags, article_categories
   - 新增列: published_articles.seo_score
   - 修改列: published_articles.content (VARCHAR → TEXT)
   - 新增索引: idx_articles_created_at

4. 生成迁移文件...
   ✅ 已生成: migrations/20260206_143022_auto_migration.sql

5. 迁移预览:
   ```sql
   -- 新增表: article_tags
   CREATE TABLE article_tags (...);

   -- 新增列
   ALTER TABLE published_articles ADD COLUMN seo_score INTEGER;

   -- 修改列类型
   ALTER TABLE published_articles ALTER COLUMN content TYPE TEXT;

   -- 新增索引
   CREATE INDEX idx_articles_created_at ON published_articles(created_at);
   ```

请检查迁移文件，确认无误后执行。
```

## 相关文档

- [MCP-README.md](./MCP-README.md) - MCP 使用指南
- [POSTGRES-MCP-SETUP.md](./POSTGRES-MCP-SETUP.md) - PostgreSQL MCP 安装指南
- [CLAUDE.md](./CLAUDE.md) - 项目开发指南

---

**更新时间**: 2026-02-06
**维护者**: Claude Code
