-- ============================================================
-- 自动生成的数据库迁移脚本
-- ============================================================
-- 生成时间: 2026-02-06T14:28:31.229Z
-- 说明: 此脚本对比了本地和线上数据库的差异
--
-- ⚠️  警告：
-- 1. 请在执行前仔细检查每条 SQL 语句
-- 2. 建议先在测试环境执行
-- 3. 执行前请备份数据库
-- 4. 删除操作已被注释，需要手动取消注释
-- ============================================================

BEGIN;

-- ============================================================
-- 警告信息
-- ============================================================

-- 警告: 线上有表 content_drafts，但本地没有
-- 如果需要删除，取消下面的注释:
-- DROP TABLE IF EXISTS content_drafts CASCADE;

-- 警告: 线上有表 images，但本地没有
-- 如果需要删除，取消下面的注释:
-- DROP TABLE IF EXISTS images CASCADE;

-- 警告: 线上有表 project_site_bindings_v2，但本地没有
-- 如果需要删除，取消下面的注释:
-- DROP TABLE IF EXISTS project_site_bindings_v2 CASCADE;

-- 警告: 线上有表 publications，但本地没有
-- 如果需要删除，取消下面的注释:
-- DROP TABLE IF EXISTS publications CASCADE;


-- ============================================================
-- 迁移语句
-- ============================================================


-- 创建新表: netlify_tokens
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


ALTER TABLE github_tokens ADD COLUMN netlify_token_id uuid;

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

-- 列类型变化: keywords.keyword (character varying(500) → text)

ALTER TABLE keywords ALTER COLUMN keyword TYPE text;

-- 列类型变化: keywords.translation (character varying(500) → text)

ALTER TABLE keywords ALTER COLUMN translation TYPE text;

-- 列类型变化: keywords.intent (character varying(50) → text)

ALTER TABLE keywords ALTER COLUMN intent TYPE text;

-- 列类型变化: keywords.probability (character varying(20) → text)

ALTER TABLE keywords ALTER COLUMN probability TYPE text;

-- 列类型变化: keywords.status (character varying(50) → text)

ALTER TABLE keywords ALTER COLUMN status TYPE text;

-- 列类型变化: keywords.created_at (timestamp without time zone → timestamp with time zone)

ALTER TABLE keywords ALTER COLUMN created_at TYPE timestamp with time zone;

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

ALTER TABLE platform_tokens ADD COLUMN metadata jsonb;

-- 警告: 线上有列 platform_tokens.content_type，但本地没有

-- ALTER TABLE platform_tokens DROP COLUMN content_type;

ALTER TABLE published_articles ADD COLUMN deepsearch_share_url text;

ALTER TABLE published_articles ADD COLUMN deepsearch_status character varying(50) DEFAULT 'pending'::character varying;

ALTER TABLE published_articles ADD COLUMN deepsearch_indexed_at timestamp without time zone;

ALTER TABLE published_articles ADD COLUMN deepsearch_processing_time integer;

ALTER TABLE published_articles ADD COLUMN deepsearch_error text;

ALTER TABLE published_articles ADD COLUMN platform_project_id character varying(200);

COMMIT;

-- ============================================================
-- 回滚脚本（如果需要）
-- ============================================================
-- BEGIN;
-- ... 在这里添加回滚语句 ...
-- COMMIT;
