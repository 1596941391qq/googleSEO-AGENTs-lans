-- =====================================================
-- 关键词表重构 - 创建独立的 keywords 表
-- =====================================================
-- 目的：将关键词从缓存表迁移到独立的持久化表
-- 日期：2026-02-06
-- =====================================================

-- 1. 创建 keywords 表
CREATE TABLE IF NOT EXISTS keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  website_id UUID REFERENCES user_websites(id) ON DELETE SET NULL,
  
  -- 关键词基础信息
  keyword TEXT NOT NULL,
  translation TEXT,
  intent TEXT DEFAULT 'Informational',
  
  -- SEO指标 (来自 DataForSEO)
  volume INTEGER,
  difficulty INTEGER,
  cpc DECIMAL(10,2),
  competition DECIMAL(3,2), -- 0.00 - 1.00
  
  -- 分析结果 (来自 Agent2)
  probability TEXT CHECK (probability IN ('High', 'Medium', 'Low')),
  reasoning TEXT,
  top_domain_type TEXT,
  top_serp_snippets JSONB,
  
  -- 元数据
  source TEXT DEFAULT 'manual' CHECK (source IN ('website-audit', 'manual', 'mining', 'batch')),
  is_favorited BOOLEAN DEFAULT false,
  is_selected BOOLEAN DEFAULT false,
  
  -- 状态管理
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'analyzing', 'completed', 'failed')),
  content_status TEXT CHECK (content_status IN ('none', 'draft', 'published')),
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 唯一约束：同一用户不能有重复的关键词
  UNIQUE(user_id, keyword)
);

-- 2. 创建索引
CREATE INDEX idx_keywords_user ON keywords(user_id);
CREATE INDEX idx_keywords_project ON keywords(project_id);
CREATE INDEX idx_keywords_website ON keywords(website_id);
CREATE INDEX idx_keywords_source ON keywords(source);
CREATE INDEX idx_keywords_probability ON keywords(probability);
CREATE INDEX idx_keywords_status ON keywords(status);
CREATE INDEX idx_keywords_favorited ON keywords(user_id, is_favorited) WHERE is_favorited = true;
CREATE INDEX idx_keywords_created ON keywords(created_at DESC);

-- 3. 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_keywords_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_keywords_updated_at
  BEFORE UPDATE ON keywords
  FOR EACH ROW
  EXECUTE FUNCTION update_keywords_updated_at();

-- 4. 创建统计函数
CREATE OR REPLACE FUNCTION keywords_statistics()
RETURNS TABLE (
  total_keywords BIGINT,
  high_probability BIGINT,
  medium_probability BIGINT,
  low_probability BIGINT,
  favorited_count BIGINT,
  by_source JSONB,
  by_status JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*)::BIGINT as total_keywords,
      COUNT(*) FILTER (WHERE k.probability = 'High')::BIGINT as high_probability,
      COUNT(*) FILTER (WHERE k.probability = 'Medium')::BIGINT as medium_probability,
      COUNT(*) FILTER (WHERE k.probability = 'Low')::BIGINT as low_probability,
      COUNT(*) FILTER (WHERE k.is_favorited = true)::BIGINT as favorited_count
    FROM keywords k
  ),
  source_stats AS (
    SELECT jsonb_object_agg(COALESCE(source, 'unknown'), cnt) as by_source
    FROM (
      SELECT source, COUNT(*)::BIGINT as cnt
      FROM keywords
      GROUP BY source
    ) s
  ),
  status_stats AS (
    SELECT jsonb_object_agg(COALESCE(status, 'unknown'), cnt) as by_status
    FROM (
      SELECT status, COUNT(*)::BIGINT as cnt
      FROM keywords
      GROUP BY status
    ) st
  )
  SELECT 
    stats.total_keywords,
    stats.high_probability,
    stats.medium_probability,
    stats.low_probability,
    stats.favorited_count,
    COALESCE(source_stats.by_source, '{}'::jsonb),
    COALESCE(status_stats.by_status, '{}'::jsonb)
  FROM stats
  CROSS JOIN source_stats
  CROSS JOIN status_stats;
END;
$$ LANGUAGE plpgsql;

-- 5. 数据迁移：从 keyword_analysis_cache 迁移到 keywords
-- 注意：这个迁移脚本需要根据实际数据情况调整
INSERT INTO keywords (
  user_id,
  website_id,
  keyword,
  volume,
  difficulty,
  cpc,
  probability,
  intent,
  top_domain_type,
  reasoning,
  top_serp_snippets,
  source,
  created_at
)
SELECT DISTINCT ON (uw.user_id, kac.keyword)
  uw.user_id,
  kac.website_id,
  kac.keyword,
  kac.dataforseo_volume,
  kac.dataforseo_difficulty,
  kac.dataforseo_cpc,
  COALESCE(kac.agent2_probability, 'Medium'),
  COALESCE(kac.agent2_search_intent, 'Informational'),
  kac.agent2_top_domain_type,
  kac.agent2_reasoning,
  kac.agent2_top_serp_snippets,
  COALESCE(kac.source, 'manual'),
  kac.created_at
FROM keyword_analysis_cache kac
LEFT JOIN user_websites uw ON kac.website_id = uw.id
WHERE kac.website_id IS NOT NULL
  AND uw.user_id IS NOT NULL
ON CONFLICT (user_id, keyword) DO NOTHING;

-- 6. 验证迁移结果
DO $$
DECLARE
  cache_count INTEGER;
  keywords_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cache_count FROM keyword_analysis_cache WHERE website_id IS NOT NULL;
  SELECT COUNT(*) INTO keywords_count FROM keywords;
  
  RAISE NOTICE '迁移完成:';
  RAISE NOTICE '  - keyword_analysis_cache 记录数: %', cache_count;
  RAISE NOTICE '  - keywords 表记录数: %', keywords_count;
  RAISE NOTICE '  - 迁移率: %', ROUND((keywords_count::DECIMAL / NULLIF(cache_count, 0) * 100), 2);
END $$;

-- 7. 查看统计信息
SELECT * FROM keywords_statistics();

COMMENT ON TABLE keywords IS '关键词主表 - 存储所有用户的关键词数据';
COMMENT ON COLUMN keywords.source IS '来源: website-audit(存量拓新), manual(手动), mining(蓝海发现), batch(批量导入)';
COMMENT ON COLUMN keywords.probability IS '排名概率: High(高), Medium(中), Low(低)';
COMMENT ON COLUMN keywords.status IS '状态: pending(待处理), selected(已选择), analyzing(分析中), completed(已完成), failed(失败)';

