# 数据库迁移报告

**生成时间**: 2026-02-06 14:28:31
**迁移文件**: `migrations/2026-02-06T14-28-31_auto_migration.sql`

---

## 📊 对比结果

### 数据库概览

| 数据库 | 表数量 |
|--------|--------|
| 本地开发 | 36 个表 |
| 线上生产 | 39 个表 |

### 差异统计

| 类型 | 数量 |
|------|------|
| 新增表 | 1 个 |
| 线上独有表 | 4 个 |
| 表结构变更 | 5 个表 |
| 总迁移语句 | 46 条 |
| 警告信息 | 16 条 |

---

## 🆕 新增表（本地 → 线上）

### 1. netlify_tokens
**说明**: Netlify 平台 Token 管理表

**列定义**:
- `id` - UUID 主键
- `name` - Token ���称 (VARCHAR 100)
- `token_encrypted` - 加密的 Token (TEXT)
- `github_token_id` - 关联的 GitHub Token (UUID, 可空)
- `usage_count` - 使用次数 (INTEGER, 默认 0)
- `status` - 状态 (VARCHAR 20, 默认 'active')
- `created_at` - 创建时间
- `updated_at` - 更新时间

**迁移 SQL**:
```sql
CREATE TABLE IF NOT EXISTS netlify_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying(100) NOT NULL,
  token_encrypted text NOT NULL,
  github_token_id uuid,
  usage_count integer DEFAULT 0,
  status character varying(20) DEFAULT 'active'::character varying,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now()
);
```

---

## ⚠️ 线上独有表（本地缺失）

### 1. content_drafts
**说明**: 内容草稿表（线上有，本地没有）
**建议**:
- 如果这是旧表，可以删除
- 如果需要保留，需要在本地创建

### 2. images
**说明**: 图片资源表（线上有，本地没有）
**建议**:
- 检查是否还在使用
- 如果不用，可以删除

### 3. project_site_bindings_v2
**说明**: 项目站点绑定表 v2（线上有，本地没有）
**建议**:
- 可能是旧版本表
- 检查是否已被 `website_site_bindings` 替代

### 4. publications
**说明**: 发布记录表（线上有，本地没有）
**建议**:
- 检查是否还在使用
- 如果不用，可以删除

**删除 SQL**（已注释，需要手动确认）:
```sql
-- DROP TABLE IF EXISTS content_drafts CASCADE;
-- DROP TABLE IF EXISTS images CASCADE;
-- DROP TABLE IF EXISTS project_site_bindings_v2 CASCADE;
-- DROP TABLE IF EXISTS publications CASCADE;
```

---

## 🔄 表结构变更

### 1. github_tokens (1 个变更)

#### 新增列:
- `netlify_token_id` (UUID) - 关联的 Netlify Token

```sql
ALTER TABLE github_tokens ADD COLUMN netlify_token_id uuid;
```

---

### 2. keywords (24 个变更)

#### 新增列:
- `user_id` (UUID, NOT NULL) - 用户 ID
- `website_id` (UUID) - 网站 ID
- `difficulty` (INTEGER) - 关键词难度
- `cpc` (NUMERIC) - 每次点击成本
- `competition` (NUMERIC) - 竞争度
- `reasoning` (TEXT) - 推理说明
- `top_domain_type` (TEXT) - 顶级域名类型
- `top_serp_snippets` (JSONB) - SERP 摘要
- `source` (TEXT, 默认 'manual') - 来源
- `is_favorited` (BOOLEAN, 默认 false) - 是否收藏
- `content_status` (TEXT) - 内容状态
- `updated_at` (TIMESTAMP WITH TIME ZONE) - 更新时间

#### 列类型变更:
- `keyword`: VARCHAR(500) → TEXT
- `translation`: VARCHAR(500) → TEXT
- `intent`: VARCHAR(50) → TEXT
- `probability`: VARCHAR(20) → TEXT
- `status`: VARCHAR(50) → TEXT
- `created_at`: TIMESTAMP → TIMESTAMP WITH TIME ZONE

```sql
ALTER TABLE keywords ADD COLUMN user_id uuid NOT NULL;
ALTER TABLE keywords ADD COLUMN website_id uuid;
ALTER TABLE keywords ADD COLUMN difficulty integer;
ALTER TABLE keywords ADD COLUMN cpc numeric;
ALTER TABLE keywords ADD COLUMN competition numeric;
ALTER TABLE keywords ADD COLUMN reasoning text;
ALTER TABLE keywords ADD COLUMN top_domain_type text;
ALTER TABLE keywords ADD COLUMN top_serp_snippets jsonb;
ALTER TABLE keywords ADD COLUMN source text DEFAULT 'manual'::text;
ALTER TABLE keywords ADD COLUMN is_favorited boolean DEFAULT false;
ALTER TABLE keywords ADD COLUMN content_status text;
ALTER TABLE keywords ADD COLUMN updated_at timestamp with time zone DEFAULT now();

ALTER TABLE keywords ALTER COLUMN keyword TYPE text;
ALTER TABLE keywords ALTER COLUMN translation TYPE text;
ALTER TABLE keywords ALTER COLUMN intent TYPE text;
ALTER TABLE keywords ALTER COLUMN probability TYPE text;
ALTER TABLE keywords ALTER COLUMN status TYPE text;
ALTER TABLE keywords ALTER COLUMN created_at TYPE timestamp with time zone;
```

---

### 3. platform_sites (11 个变更)

#### 新增列:
- `github_token_id` (UUID, NOT NULL) - GitHub Token ID
- `platform_token_id` (UUID) - 平台 Token ID
- `platform` (VARCHAR 50, NOT NULL) - 平台类型
- `content_type` (VARCHAR 20, NOT NULL) - 内容类型
- `platform_project_id` (VARCHAR 200) - 平台项目 ID

#### 删除列（线上独有）:
- `token_id` - 旧的 Token ID 字段
- `repo_owner` - 仓库所有者字段

#### 约束变更:
- `site_url`: NOT NULL → 可空
- `repo_name`: 可空 → NOT NULL

```sql
ALTER TABLE platform_sites ADD COLUMN github_token_id uuid NOT NULL;
ALTER TABLE platform_sites ADD COLUMN platform_token_id uuid;
ALTER TABLE platform_sites ADD COLUMN platform character varying(50) NOT NULL;
ALTER TABLE platform_sites ADD COLUMN content_type character varying(20) NOT NULL;
ALTER TABLE platform_sites ADD COLUMN platform_project_id character varying(200);

-- 警告: 线上有列 platform_sites.token_id，但本地没有
-- ALTER TABLE platform_sites DROP COLUMN token_id;

-- 警告: 线上有列 platform_sites.repo_owner，但本地没有
-- ALTER TABLE platform_sites DROP COLUMN repo_owner;

ALTER TABLE platform_sites ALTER COLUMN site_url DROP NOT NULL;
ALTER TABLE platform_sites ALTER COLUMN repo_name SET NOT NULL;
```

---

### 4. platform_tokens (3 个变更)

#### 新增列:
- `metadata` (JSONB) - 元数据

#### 删除列（线上独有）:
- `content_type` - 内容类型字段

```sql
ALTER TABLE platform_tokens ADD COLUMN metadata jsonb;

-- 警告: 线上有列 platform_tokens.content_type，但本地没有
-- ALTER TABLE platform_tokens DROP COLUMN content_type;
```

---

### 5. published_articles (6 个变更)

#### 新增列:
- `deepsearch_share_url` (TEXT) - DeepSearch 分享链接
- `deepsearch_status` (VARCHAR 50, 默认 'pending') - DeepSearch 状态
- `deepsearch_indexed_at` (TIMESTAMP) - DeepSearch 索引时间
- `deepsearch_processing_time` (INTEGER) - DeepSearch 处理时间
- `deepsearch_error` (TEXT) - DeepSearch 错误信息
- `platform_project_id` (VARCHAR 200) - 平台项目 ID

```sql
ALTER TABLE published_articles ADD COLUMN deepsearch_share_url text;
ALTER TABLE published_articles ADD COLUMN deepsearch_status character varying(50) DEFAULT 'pending'::character varying;
ALTER TABLE published_articles ADD COLUMN deepsearch_indexed_at timestamp without time zone;
ALTER TABLE published_articles ADD COLUMN deepsearch_processing_time integer;
ALTER TABLE published_articles ADD COLUMN deepsearch_error text;
ALTER TABLE published_articles ADD COLUMN platform_project_id character varying(200);
```

---

## ✅ 执行建议

### 1. 立即执行（低风险）

以下变更可以安全执行：

- ✅ 创建 `netlify_tokens` 表
- ✅ 新增 `github_tokens.netlify_token_id` 列
- ✅ 新增 `published_articles` 的 DeepSearch 相关列
- ✅ 新增 `platform_tokens.metadata` 列

### 2. 需要数据迁移（中风险）

以下变更需要先迁移数据：

- ⚠️ `keywords` 表的大量变更
  - 新增 `user_id` (NOT NULL) - **需要先填充数据**
  - 列类型变更 - 需要验证数据兼容性

- ⚠️ `platform_sites` 表的变更
  - 新增 `github_token_id` (NOT NULL) - **需要先填充数据**
  - 新增 `platform` (NOT NULL) - **需要先填充数据**
  - 新增 `content_type` (NOT NULL) - **需要先填充数据**

### 3. 需要手动确认（高风险）

以下操作已被注释，需要手动确认后执行：

- 🔴 删除线上独有的表（content_drafts, images, publications, project_site_bindings_v2）
- 🔴 删除线上独有的列（platform_sites.token_id, platform_sites.repo_owner, platform_tokens.content_type）

---

## 🚀 执行步骤

### 步骤 1：备份数据库

```bash
# 备份线上数据库
pg_dump "postgres://a214f995500e9883025fe7b472115e6688d0e8349a02bef1d139878f294c1f1e:sk_uK0a2fZGrPNTLp8EFtx-s@db.prisma.io:5432/postgres?sslmode=require" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步骤 2：在本地测试迁移

```bash
# 连接到本地数据库
psql "postgres://postgres:123456@127.0.0.1:5432/postgres"

# 执行迁移（测试）
\i migrations/2026-02-06T14-28-31_auto_migration.sql

# 验证结果
\dt  # 查看所有表
\d keywords  # 查看 keywords 表结构
```

### 步骤 3：处理 NOT NULL 约束

在执行迁移前，需要先填充以下 NOT NULL 列的数据：

```sql
-- 为 keywords 表填充 user_id
UPDATE keywords SET user_id = (SELECT id FROM users LIMIT 1) WHERE user_id IS NULL;

-- 为 platform_sites 表填充必需字段
UPDATE platform_sites
SET
  github_token_id = (SELECT id FROM github_tokens LIMIT 1),
  platform = 'netlify',
  content_type = 'informational'
WHERE github_token_id IS NULL;
```

### 步骤 4：在线上执行迁移

```bash
# 连接到线上数据库
psql "postgres://a214f995500e9883025fe7b472115e6688d0e8349a02bef1d139878f294c1f1e:sk_uK0a2fZGrPNTLp8EFtx-s@db.prisma.io:5432/postgres?sslmode=require"

# 执行迁移
\i migrations/2026-02-06T14-28-31_auto_migration.sql

# 验证结果
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

### 步骤 5：验证应用功能

- 测试关键词管理功能
- 测试平台站点管理功能
- 测试文章发布功能
- 测试 Netlify Token 管理功能

---

## 📝 注意事项

1. **NOT NULL 约束**: `keywords.user_id` 和 `platform_sites` 的多个字段需要先填充数据
2. **列类型变更**: `keywords` 表的多个列从 VARCHAR 改为 TEXT，需要验证数据兼容性
3. **删除操作**: 线上独有的表和列已被注释，需要手动确认后再删除
4. **外键约束**: 新增的关联字段可能需要添加外键约束
5. **索引优化**: 新增列可能需要添加索引以提升查询性能

---

## 🔗 相关文件

- 迁移 SQL: `migrations/2026-02-06T14-28-31_auto_migration.sql`
- 本地结构: `db-structure-local.json`
- 线上结构: `db-structure-prod.json`
- 对比脚本: `generate-migration.mjs`

---

**生成工具**: Claude Code + PostgreSQL MCP
**文档版本**: 1.0
