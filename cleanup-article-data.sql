-- 文章保存和发布流程修复 - 数据清理脚本
-- 执行日期: 2026-02-10
-- 用途: 清理错误数据（status='published' 但 site_id=NULL 的文章）

-- 1. 查看需要清理的数据
SELECT
  id,
  title,
  status,
  published_at,
  site_id,
  created_at
FROM published_articles
WHERE status = 'published'
  AND site_id IS NULL
ORDER BY created_at DESC;

-- 2. 统计需要清理的数量
SELECT COUNT(*) as need_fix_count
FROM published_articles
WHERE status = 'published'
  AND site_id IS NULL;

-- 3. 执行清理（将错误的 'published' 改回 'draft'）
-- ⚠️ 警告：执行前请先备份数据库！
-- ⚠️ 警告：这会将所有未绑定 site_id 的"已发布"文章改回草稿状态！

-- 取消注释下面的 SQL 来执行清理：
/*
UPDATE published_articles
SET
  status = 'draft',
  published_at = NULL,
  updated_at = NOW()
WHERE status = 'published'
  AND site_id IS NULL;
*/

-- 4. 验证清理结果
SELECT
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN site_id IS NULL THEN 1 END) as without_site_id,
  COUNT(CASE WHEN site_id IS NOT NULL THEN 1 END) as with_site_id
FROM published_articles
GROUP BY status;

-- 预期结果：
-- - draft: 所有未发布的文章（site_id = NULL）
-- - published: 所有已发布的文章（site_id 不为 NULL）
