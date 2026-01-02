# Website Data & Article Rankings 实施计划

**创建日期**: 2026-01-02  
**目标**: 实现 Website Data Tab 和 Article Rankings Tab，利用已有数据和 SE-Ranking API

---

## 📊 数据库表设计

### 1. `user_websites` - 用户绑定的网站表

```sql
CREATE TABLE user_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- 网站基本信息（来自Firecrawl）
  website_url VARCHAR(500) NOT NULL,
  website_domain VARCHAR(255) NOT NULL,
  website_title VARCHAR(500), -- 来自Firecrawl
  website_description TEXT, -- 来自Firecrawl meta description
  website_screenshot TEXT, -- Base64 screenshot from Firecrawl
  
  -- 网站分析数据
  raw_content TEXT, -- Firecrawl抓取的markdown内容
  content_updated_at TIMESTAMP,
  
  -- 绑定信息
  bound_at TIMESTAMP DEFAULT NOW(),
  industry VARCHAR(100),
  monthly_visits INTEGER,
  monthly_revenue VARCHAR(50),
  marketing_tools TEXT[], -- Array of tools
  additional_info TEXT,
  
  -- 状态
  is_active BOOLEAN DEFAULT true,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_user_website UNIQUE (user_id, website_url)
);

CREATE INDEX idx_user_websites_user ON user_websites(user_id);
CREATE INDEX idx_user_websites_domain ON user_websites(website_domain);
CREATE INDEX idx_user_websites_active ON user_websites(is_active);
```

### 2. `website_pages` - 网站页面表（来自Firecrawl /map）

```sql
CREATE TABLE website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES user_websites(id) ON DELETE CASCADE,
  
  -- 页面信息
  page_url VARCHAR(1000) NOT NULL,
  page_title VARCHAR(500),
  page_description TEXT,
  page_type VARCHAR(50), -- 'homepage', 'blog', 'product', 'category', etc.
  
  -- 内容数据
  content_markdown TEXT, -- 如果已抓取
  content_length INTEGER,
  
  -- 主题集群信息（来自Firecrawl /map）
  topic_cluster VARCHAR(255), -- 主题集群名称
  cluster_priority INTEGER, -- 在集群中的优先级
  
  -- 抓取状态
  is_scraped BOOLEAN DEFAULT false,
  scraped_at TIMESTAMP,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_website_page UNIQUE (website_id, page_url)
);

CREATE INDEX idx_website_pages_website ON website_pages(website_id);
CREATE INDEX idx_website_pages_cluster ON website_pages(topic_cluster);
CREATE INDEX idx_website_pages_scraped ON website_pages(is_scraped);
```

### 3. `website_keywords` - 网站关键词表（来自extract-keywords API）

```sql
CREATE TABLE website_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES user_websites(id) ON DELETE CASCADE,
  page_id UUID REFERENCES website_pages(id) ON DELETE SET NULL, -- 可选，关联到具体页面
  
  -- 关键词信息（来自extract-keywords API）
  keyword VARCHAR(500) NOT NULL,
  translation VARCHAR(500), -- 中文解释
  intent VARCHAR(50), -- 'Informational', 'Transactional', 'Commercial', 'Local'
  estimated_volume INTEGER, -- AI估算的搜索量
  
  -- SE-Ranking数据（真实数据，高优先级）
  seranking_volume INTEGER, -- 真实搜索量
  seranking_cpc DECIMAL(10,2), -- 每次点击成本
  seranking_competition DECIMAL(5,2), -- 竞争度 0-1
  seranking_difficulty INTEGER, -- 关键词难度 0-100
  seranking_history_trend JSONB, -- 历史趋势数据 {date: volume}
  seranking_data_found BOOLEAN DEFAULT false, -- SE-Ranking是否有数据
  seranking_updated_at TIMESTAMP,
  
  -- 排名机会分析（AI生成）
  ranking_opportunity_score INTEGER, -- 0-100，排名机会评分
  opportunity_reasoning TEXT, -- 为什么有机会排名的原因
  suggested_optimization TEXT, -- 优化建议
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_website_keyword UNIQUE (website_id, keyword)
);

CREATE INDEX idx_website_keywords_website ON website_keywords(website_id);
CREATE INDEX idx_website_keywords_page ON website_keywords(page_id);
CREATE INDEX idx_website_keywords_opportunity ON website_keywords(ranking_opportunity_score DESC);
CREATE INDEX idx_website_keywords_seranking ON website_keywords(seranking_data_found);
```

### 4. `article_rankings` - 文章排名追踪表（SE-Ranking真实数据）

```sql
CREATE TABLE article_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES user_websites(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES website_keywords(id) ON DELETE CASCADE,
  
  -- 排名数据（来自SE-Ranking API）
  current_position INTEGER, -- 当前排名位置（1-100）
  previous_position INTEGER, -- 上次排名位置
  position_change INTEGER, -- 排名变化（正数上升，负数下降）
  
  -- 搜索引擎信息
  search_engine VARCHAR(50) DEFAULT 'google', -- google, bing, yahoo
  search_location VARCHAR(50) DEFAULT 'us', -- 搜索地区
  search_device VARCHAR(50) DEFAULT 'desktop', -- desktop, mobile
  
  -- 历史数据
  ranking_history JSONB, -- [{date: '2026-01-01', position: 5}, ...]
  
  -- 追踪状态
  is_tracking BOOLEAN DEFAULT true,
  last_tracked_at TIMESTAMP,
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_ranking UNIQUE (keyword_id, search_engine, search_location, search_device)
);

CREATE INDEX idx_article_rankings_website ON article_rankings(website_id);
CREATE INDEX idx_article_rankings_keyword ON article_rankings(keyword_id);
CREATE INDEX idx_article_rankings_position ON article_rankings(current_position);
CREATE INDEX idx_article_rankings_tracking ON article_rankings(is_tracking, last_tracked_at);
```

---

## 🔌 API 使用方案

### 1. Firecrawl API - `/map` 端点

**用途**: 获取网站所有子页面和主题集群

**实现位置**: `api/_shared/firecrawl.ts`

```typescript
/**
 * Get website sitemap and topic clusters using Firecrawl /map endpoint
 */
export async function getWebsiteMap(url: string): Promise<{
  pages: Array<{
    url: string;
    title?: string;
    description?: string;
    type?: string;
  }>;
  topicClusters: Array<{
    name: string;
    pages: string[]; // URLs in this cluster
    priority: number;
  }>;
}> {
  const response = await fetch(`${FIRECRAWL_BASE_URL}/firecrawl/v1/map`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      includeSubdomains: true,
      limit: 1000, // 最多1000个页面
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl /map API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Parse response and return structured data
  return {
    pages: data.pages || [],
    topicClusters: data.topicClusters || [],
  };
}
```

### 2. SE-Ranking API - 关键词数据

**已实现**: `api/_shared/gemini.ts` 中的 `fetchSErankingData`

**用途**:
- ✅ **Website Data Tab**: 获取关键词的真实搜索量、难度、CPC、竞争度
- ✅ **Article Rankings Tab**: 获取关键词的历史排名趋势

**API端点**:
- `POST /api.seranking.com/v1/keywords/export` - 获取关键词数据
- `GET /api.seranking.com/v1/rankings` - 获取排名数据（需要实现）

### 3. 新增 API 端点

#### `/api/website-data/get-pages` - 获取网站页面列表

```typescript
// api/website-data/get-pages.ts
// 调用Firecrawl /map，返回所有页面和主题集群
```

#### `/api/website-data/analyze-opportunities` - 分析排名机会

```typescript
// api/website-data/analyze-opportunities.ts
// 1. 获取网站关键词（从website_keywords表）
// 2. 调用SE-Ranking API获取真实数据
// 3. AI分析排名机会（使用Gemini）
// 4. 返回排名机会列表
```

#### `/api/article-rankings/get-rankings` - 获取文章排名

```typescript
// api/article-rankings/get-rankings.ts
// 1. 从article_rankings表获取排名数据
// 2. 调用SE-Ranking API更新排名（如果启用追踪）
// 3. 返回排名概览、表格、趋势图数据
```

---

## 🎯 功能优先级评估

### Website Data Tab

#### ✅ **高优先级（真实数据）**

1. **显示抓取的网站内容** ⭐⭐⭐⭐⭐
   - **数据来源**: `user_websites.raw_content`（已有）
   - **实现难度**: 简单
   - **优先级**: 最高

2. **提取的关键词列表** ⭐⭐⭐⭐⭐
   - **数据来源**: `website_keywords`表（已有）
   - **SE-Ranking数据**: ✅ 真实搜索量、难度、CPC、竞争度
   - **实现难度**: 简单
   - **优先级**: 最高

3. **排名机会分析** ⭐⭐⭐⭐
   - **数据来源**: 
     - SE-Ranking真实数据（搜索量、难度）
     - AI分析（Gemini生成机会评分和优化建议）
   - **实现难度**: 中等
   - **优先级**: 高

4. **网站页面列表（Firecrawl /map）** ⭐⭐⭐⭐
   - **数据来源**: Firecrawl `/map` API
   - **实现难度**: 中等
   - **优先级**: 高（展示网站结构）

5. **主题集群展示** ⭐⭐⭐
   - **数据来源**: Firecrawl `/map` 返回的topicClusters
   - **实现难度**: 简单
   - **优先级**: 中

#### ⚠️ **低优先级（模拟数据）**

6. **网站健康度评分** ⭐⭐
   - **数据来源**: AI估算（无真实API）
   - **实现难度**: 中等
   - **优先级**: 低（可以后续添加）

### Article Rankings Tab

#### ✅ **高优先级（真实数据）**

1. **关键词排名表格** ⭐⭐⭐⭐⭐
   - **数据来源**: 
     - `article_rankings`表（存储SE-Ranking数据）
     - SE-Ranking API实时查询
   - **实现难度**: 中等
   - **优先级**: 最高

2. **排名趋势图** ⭐⭐⭐⭐⭐
   - **数据来源**: 
     - `article_rankings.ranking_history`（历史数据）
     - SE-Ranking `history_trend`字段
   - **实现难度**: 中等
   - **优先级**: 最高

3. **排名概览数据** ⭐⭐⭐⭐
   - **数据来源**: 
     - 统计`article_rankings`表数据
     - 总关键词数、平均排名、排名变化等
   - **实现难度**: 简单
   - **优先级**: 高

#### ⚠️ **中优先级（需要SE-Ranking追踪功能）**

4. **实时排名追踪** ⭐⭐⭐
   - **数据来源**: SE-Ranking API（需要配置追踪）
   - **实现难度**: 高（需要SE-Ranking账户配置）
   - **优先级**: 中（可以先显示已有数据）

5. **竞争对手对比** ⭐⭐
   - **数据来源**: SE-Ranking API（需要高级功能）
   - **实现难度**: 高
   - **优先级**: 低（后续功能）

---

## 📋 实施步骤

### Phase 1: 数据库和基础API（1-2天）

1. ✅ 创建数据库表
   - `user_websites`
   - `website_pages`
   - `website_keywords`
   - `article_rankings`

2. ✅ 保存绑定时的数据
   - 修改`handleUrlSubmit`，保存到数据库
   - 保存：rawContent, extractedKeywords, screenshot, title, description

3. ✅ 实现Firecrawl /map集成
   - 添加`getWebsiteMap`函数
   - 创建`/api/website-data/get-pages`端点

### Phase 2: Website Data Tab（2-3天）

1. ✅ 显示网站基本信息
   - 从`user_websites`表读取
   - 显示：标题、描述、截图

2. ✅ 显示关键词列表
   - 从`website_keywords`表读取
   - 调用SE-Ranking API获取真实数据
   - 显示：关键词、搜索量、难度、CPC、竞争度

3. ✅ 排名机会分析
   - AI分析（Gemini）生成机会评分
   - 显示优化建议

4. ✅ 网站页面列表
   - 调用Firecrawl /map
   - 显示所有页面和主题集群

### Phase 3: Article Rankings Tab（2-3天）

1. ✅ 排名概览
   - 统计总关键词数、平均排名等

2. ✅ 关键词排名表格
   - 从`article_rankings`表读取
   - 显示：关键词、当前排名、排名变化

3. ✅ 排名趋势图
   - 使用`ranking_history`数据
   - 使用Chart.js或Recharts绘制趋势图

---

## 🔑 关键实现点

### 1. 数据保存时机

在`ContentGenerationView.tsx`的`handleUrlSubmit`中：

```typescript
// 绑定完成后，保存数据到数据库
const saveWebsiteData = async () => {
  await fetch('/api/website-data/save', {
    method: 'POST',
    body: JSON.stringify({
      websiteUrl: tempUrl,
      rawContent: state.websiteData.rawContent,
      keywords: state.websiteData.extractedKeywords,
      screenshot: state.demoContent.screenshot,
      title: state.demoContent.articleDemo?.article?.title,
      // ... 其他数据
    }),
  });
};
```

### 2. SE-Ranking数据获取

```typescript
// 在Website Data Tab加载时
const loadWebsiteData = async () => {
  // 1. 从数据库获取关键词
  const keywords = await fetch(`/api/website-data/keywords?websiteId=${websiteId}`);
  
  // 2. 批量调用SE-Ranking API
  const keywordStrings = keywords.map(k => k.keyword);
  const serankingData = await fetchSErankingData(keywordStrings, 'us');
  
  // 3. 更新数据库
  await updateKeywordsWithSEranking(keywords, serankingData);
};
```

### 3. 排名追踪设置

```typescript
// 用户可以选择启用排名追踪
const enableRankingTracking = async (keywordIds: string[]) => {
  // 调用SE-Ranking API设置追踪
  // 定期（每天）更新排名数据
};
```

---

## 📊 数据流图

```
绑定网站
  ↓
Firecrawl抓取 (已有)
  ↓
保存到 user_websites 表
  ↓
提取关键词 (已有)
  ↓
保存到 website_keywords 表
  ↓
调用SE-Ranking API获取真实数据
  ↓
更新 website_keywords.seranking_* 字段
  ↓
AI分析排名机会
  ↓
显示在Website Data Tab

Firecrawl /map
  ↓
获取所有页面和主题集群
  ↓
保存到 website_pages 表
  ↓
显示在Website Data Tab

SE-Ranking排名追踪
  ↓
保存到 article_rankings 表
  ↓
显示在Article Rankings Tab
```

---

## ✅ 验收标准

### Website Data Tab
- [ ] 显示网站基本信息（标题、描述、截图）
- [ ] 显示关键词列表（带SE-Ranking真实数据）
- [ ] 显示排名机会分析
- [ ] 显示网站页面列表
- [ ] 显示主题集群

### Article Rankings Tab
- [ ] 显示排名概览数据
- [ ] 显示关键词排名表格
- [ ] 显示排名趋势图
- [ ] 支持筛选和排序

---

**准备开始实施吗？**

