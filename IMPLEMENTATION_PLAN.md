# 网站数据页功能集成计划

## 📋 概述

本计划旨在将以下 DataForSEO API 功能集成到网站数据页面中：
1. 追踪网站关键词排名（Ranked Keywords）
2. 历史排名概览（Historical Rank Overview）
3. 分析与识别竞争对手（Competitors Domain, SERP Competitors, Domain Intersection）
4. 全局域名概况与监控（Domain Rank Overview, Relevant Pages）

---

## 🎯 功能需求分析

### 1. 追踪网站关键词排名 (Ranked Keywords)

**核心功能：**
- 输入目标域名或特定页面的 URL，获取其在 Google/Bing 中获得排名的所有关键词列表
- 提供每个词的当前位次、历史排名变化、预估点击量 (ETV)、搜索量
- 标识该词是否触发了 AI Overview（AI 摘要）或 Featured Snippets 等 SERP 特性

**DataForSEO API 端点：**
- `GET /v3/dataforseo_labs/google/ranked_keywords/live` - 获取排名关键词
- `GET /v3/domain_analytics/google/keywords/live` - 获取域名关键词（已实现，需增强）

**需要的数据字段：**
- `keyword` - 关键词
- `rank_absolute` - 当前排名
- `previous_rank_absolute` - 历史排名
- `search_volume` - 搜索量
- `etv` - 预估流量值
- `serp_features` - SERP特性（AI Overview, Featured Snippets等）
- `url` - 排名页面URL

### 2. 历史排名概览 (Historical Rank Overview)

**核心功能：**
- 获取指定域名在过去一段时间内的排名走势
- 展示网站在 Top 1, Top 3, Top 10 等不同位次区间的关键词数量分布

**DataForSEO API 端点：**
- `GET /v3/dataforseo_labs/google/historical_rank_overview/live` - 历史排名概览
- 或通过多次调用 `ranked_keywords` API 构建历史数据

**需要的数据字段：**
- `date` - 日期
- `top1_count` - Top 1 关键词数
- `top3_count` - Top 3 关键词数
- `top10_count` - Top 10 关键词数
- `top50_count` - Top 50 关键词数
- `top100_count` - Top 100 关键词数

### 3. 分析与识别竞争对手

#### 3.1 Competitors Domain（已有，需增强）

**核心功能：**
- 输入域名，基于关键词重叠度自动识别最直接的竞争对手
- 返回竞争对手的域名、可见度评分 (Visibility Score)、重合关键词数量

**DataForSEO API 端点：**
- `GET /v3/dataforseo_labs/google/competitors_domain/live` - 域名竞争对手（已实现）

**需要增强：**
- 添加可见度评分 (Visibility Score)
- 添加重合关键词列表

#### 3.2 SERP Competitors（新功能）

**核心功能：**
- 基于关注的关键词列表，找出在这些特定搜索结果中排名靠前的网站
- 用于分析特定 Niche（细分市场）的竞争格局

**DataForSEO API 端点：**
- `GET /v3/dataforseo_labs/google/serp_competitors/live` - SERP竞争对手
- 或通过 `GET /v3/dataforseo_labs/google/serp/live` 获取SERP数据后分析

**需要的数据字段：**
- `keyword` - 关键词
- `competitors` - 竞争对手列表（域名、排名、可见度）

#### 3.3 Domain Intersection（域名重合度分析）（新功能）

**核心功能：**
- 对比你的网站和竞争对手，找出"对手有排名而你没有排名"的关键词（Content Gap）
- 这是 pSEO（程序化 SEO）内容生产的最重要参考

**DataForSEO API 端点：**
- `GET /v3/dataforseo_labs/google/domain_intersection/live` - 域名重合度分析

**需要的数据字段：**
- `common_keywords` - 共同关键词列表
- `gap_keywords` - 对手有而你没有的关键词（Content Gap）
- `gap_traffic` - Gap关键词的预估流量
- `our_keywords` - 你有而对手没有的关键词

### 4. 全局域名概况与监控

#### 4.1 Domain Rank Overview（已有，需增强）

**核心功能：**
- 提供网站的整体"体检报告"
- 包括总预估流量 (ETV)、总关键词数、付费搜索 (PPC) 数据

**DataForSEO API 端点：**
- `GET /v3/domain_analytics/whois/overview/live` - 域名概览（已实现）

**需要增强：**
- 添加更详细的排名分布图表
- 添加趋势对比（与上期对比）

#### 4.2 Relevant Pages（新功能）

**核心功能：**
- 列出目标域名下表现最好的页面（流量最高、排名最好）
- 帮助识别竞争对手的核心资产

**DataForSEO API 端点：**
- `GET /v3/domain_analytics/google/pages/live` - 相关页面
- 或从 `ranked_keywords` API 中提取页面数据

**需要的数据字段：**
- `url` - 页面URL
- `organic_traffic` - 自然流量
- `keywords_count` - 关键词数量
- `avg_position` - 平均排名
- `top_keywords` - 主要关键词列表

---

## 🏗️ 技术实现计划

### 阶段 1: 后端 API 扩展

#### 1.1 扩展 `dataforseo-domain.ts` 工具文件

**新增函数：**

1. **`getRankedKeywords()`** - 获取排名关键词（增强版）
   ```typescript
   export async function getRankedKeywords(
     domain: string,
     locationCode: number = 2840,
     limit: number = 100,
     includeSerpFeatures: boolean = true
   ): Promise<RankedKeyword[]>
   ```

2. **`getHistoricalRankOverview()`** - 获取历史排名概览
   ```typescript
   export async function getHistoricalRankOverview(
     domain: string,
     locationCode: number = 2840,
     days: number = 30
   ): Promise<HistoricalRankOverview[]>
   ```

3. **`getSerpCompetitors()`** - 获取SERP竞争对手
   ```typescript
   export async function getSerpCompetitors(
     keywords: string[],
     locationCode: number = 2840
   ): Promise<SerpCompetitor[]>
   ```

4. **`getDomainIntersection()`** - 获取域名重合度分析
   ```typescript
   export async function getDomainIntersection(
     targetDomain: string,
     competitorDomain: string,
     locationCode: number = 2840
   ): Promise<DomainIntersection>
   ```

5. **`getRelevantPages()`** - 获取相关页面
   ```typescript
   export async function getRelevantPages(
     domain: string,
     locationCode: number = 2840,
     limit: number = 20
   ): Promise<RelevantPage[]>
   ```

#### 1.2 扩展数据库表结构

**新增表：**

1. **`ranked_keywords_cache`** - 缓存排名关键词数据
   ```sql
   CREATE TABLE ranked_keywords_cache (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
     keyword VARCHAR(500) NOT NULL,
     current_position INTEGER,
     previous_position INTEGER,
     search_volume INTEGER,
     etv NUMERIC(20,2),
     serp_features JSONB, -- AI Overview, Featured Snippets等
     ranking_url TEXT,
     data_updated_at TIMESTAMP,
     cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
     UNIQUE(website_id, keyword)
   );
   ```

2. **`historical_rank_overview_cache`** - 缓存历史排名概览
   ```sql
   CREATE TABLE historical_rank_overview_cache (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
     date DATE NOT NULL,
     top1_count INTEGER DEFAULT 0,
     top3_count INTEGER DEFAULT 0,
     top10_count INTEGER DEFAULT 0,
     top50_count INTEGER DEFAULT 0,
     top100_count INTEGER DEFAULT 0,
     data_updated_at TIMESTAMP,
     cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
     UNIQUE(website_id, date)
   );
   ```

3. **`domain_intersection_cache`** - 缓存域名重合度分析
   ```sql
   CREATE TABLE domain_intersection_cache (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
     competitor_domain VARCHAR(255) NOT NULL,
     common_keywords JSONB, -- 共同关键词列表
     gap_keywords JSONB, -- Content Gap关键词列表
     gap_traffic NUMERIC(20,2),
     our_keywords JSONB, -- 我们有而对手没有的关键词
     data_updated_at TIMESTAMP,
     cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',
     UNIQUE(website_id, competitor_domain)
   );
   ```

4. **`relevant_pages_cache`** - 缓存相关页面数据
   ```sql
   CREATE TABLE relevant_pages_cache (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
     page_url TEXT NOT NULL,
     organic_traffic NUMERIC(20,2),
     keywords_count INTEGER,
     avg_position DECIMAL(10,2),
     top_keywords JSONB, -- 主要关键词列表
     data_updated_at TIMESTAMP,
     cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
     UNIQUE(website_id, page_url)
   );
   ```

#### 1.3 创建新的 API 端点

**新增 API 文件：**

1. **`api/website-data/ranked-keywords.ts`** - 获取排名关键词
   - 方法: POST
   - 请求体: `{ websiteId, userId?, limit?, region? }`
   - 返回: `{ success, data: RankedKeyword[], cached }`

2. **`api/website-data/historical-rank.ts`** - 获取历史排名概览
   - 方法: POST
   - 请求体: `{ websiteId, userId?, days?, region? }`
   - 返回: `{ success, data: HistoricalRankOverview[], cached }`

3. **`api/website-data/serp-competitors.ts`** - 获取SERP竞争对手
   - 方法: POST
   - 请求体: `{ websiteId, userId?, keywords[], region? }`
   - 返回: `{ success, data: SerpCompetitor[], cached }`

4. **`api/website-data/domain-intersection.ts`** - 获取域名重合度分析
   - 方法: POST
   - 请求体: `{ websiteId, userId?, competitorDomain, region? }`
   - 返回: `{ success, data: DomainIntersection, cached }`

5. **`api/website-data/relevant-pages.ts`** - 获取相关页面
   - 方法: POST
   - 请求体: `{ websiteId, userId?, limit?, region? }`
   - 返回: `{ success, data: RelevantPage[], cached }`

#### 1.4 更新 `update-metrics.ts`

在 `update-metrics.ts` 中添加对新功能的支持：
- 可选地调用新的 API 函数获取额外数据
- 缓存到对应的数据库表

### 阶段 2: 前端组件开发

#### 2.1 创建新的 React 组件

1. **`components/website-data/RankedKeywordsTable.tsx`** - 排名关键词表格
   - 显示关键词、排名、搜索量、ETV
   - 标识 SERP 特性（AI Overview, Featured Snippets）
   - 支持排序和筛选

2. **`components/website-data/HistoricalRankChart.tsx`** - 历史排名趋势图表
   - 使用 Recharts 或 Chart.js
   - 显示 Top 1/3/10/50/100 的趋势线
   - 支持时间范围选择（7天/30天/90天）

3. **`components/website-data/SerpCompetitorsView.tsx`** - SERP竞争对手视图
   - 基于关键词列表显示竞争对手
   - 显示每个关键词的 Top 10 竞争对手
   - 支持关键词输入和选择

4. **`components/website-data/DomainIntersectionView.tsx`** - 域名重合度分析视图
   - 显示共同关键词
   - 突出显示 Content Gap（对手有而你没有的关键词）
   - 显示 Gap 关键词的预估流量
   - 支持导出为 CSV

5. **`components/website-data/RelevantPagesTable.tsx`** - 相关页面表格
   - 显示页面URL、流量、关键词数、平均排名
   - 显示主要关键词
   - 支持点击跳转到页面

#### 2.2 更新 `WebsiteDataDashboard.tsx`

在 `WebsiteDataDashboard.tsx` 中添加新的视图模式：

```typescript
type ViewMode = 
  | "overview" 
  | "keyword-intelligence"
  | "ranked-keywords"      // 新增
  | "historical-rank"      // 新增
  | "competitors-analysis" // 新增（包含 SERP Competitors 和 Domain Intersection）
  | "relevant-pages";      // 新增
```

添加新的标签页/按钮来切换视图。

#### 2.3 更新 `TopKeywordsTable.tsx`

增强现有的关键词表格：
- 添加 SERP 特性标识
- 添加历史排名变化趋势（小图表）
- 添加 ETV（预估流量值）列

### 阶段 3: 数据集成与优化

#### 3.1 数据缓存策略

- **排名关键词**: 24小时缓存
- **历史排名概览**: 7天缓存（历史数据变化较慢）
- **域名重合度分析**: 7天缓存
- **相关页面**: 24小时缓存

#### 3.2 API 调用优化

- 使用并行请求提高性能
- 实现请求去重（防止重复调用）
- 添加请求队列管理（避免速率限制）

#### 3.3 错误处理

- 添加友好的错误提示
- 实现降级策略（API失败时使用缓存）
- 添加重试机制

---

## 📅 实施时间表

### 第 1 周：后端 API 扩展
- [ ] 扩展 `dataforseo-domain.ts` 添加新函数
- [ ] 创建数据库迁移脚本添加新表
- [ ] 创建新的 API 端点
- [ ] 更新 `update-metrics.ts`
- [ ] 测试 API 端点

### 第 2 周：前端组件开发
- [ ] 创建 `RankedKeywordsTable` 组件
- [ ] 创建 `HistoricalRankChart` 组件
- [ ] 创建 `SerpCompetitorsView` 组件
- [ ] 创建 `DomainIntersectionView` 组件
- [ ] 创建 `RelevantPagesTable` 组件

### 第 3 周：集成与优化
- [ ] 更新 `WebsiteDataDashboard` 添加新视图
- [ ] 集成所有新组件
- [ ] 优化数据加载和缓存策略
- [ ] 添加错误处理和用户反馈
- [ ] UI/UX 优化

### 第 4 周：测试与优化
- [ ] 端到端测试
- [ ] 性能优化
- [ ] 用户体验测试
- [ ] 文档更新

---

## 🔍 技术细节

### DataForSEO API 端点映射

| 功能 | DataForSEO API 端点 | 文档链接 |
|------|-------------------|---------|
| Ranked Keywords | `/v3/dataforseo_labs/google/ranked_keywords/live` | [文档](https://docs.dataforseo.com/v3/dataforseo_labs-google-ranked_keywords-live/) |
| Historical Rank Overview | `/v3/dataforseo_labs/google/historical_rank_overview/live` | [文档](https://docs.dataforseo.com/v3/dataforseo_labs-google-historical_rank_overview-live/) |
| SERP Competitors | `/v3/dataforseo_labs/google/serp_competitors/live` | [文档](https://docs.dataforseo.com/v3/dataforseo_labs-google-serp_competitors-live/) |
| Domain Intersection | `/v3/dataforseo_labs/google/domain_intersection/live` | [文档](https://docs.dataforseo.com/v3/dataforseo_labs-google-domain_intersection-live/) |
| Relevant Pages | `/v3/domain_analytics/google/pages/live` | [文档](https://docs.dataforseo.com/v3/domain_analytics-google-pages-live/) |

### 类型定义

```typescript
// 排名关键词（增强版）
interface RankedKeyword {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  positionChange: number;
  searchVolume: number;
  etv: number; // 预估流量值
  serpFeatures: {
    aiOverview?: boolean;
    featuredSnippet?: boolean;
    peopleAlsoAsk?: boolean;
    relatedQuestions?: boolean;
  };
  url: string;
  cpc?: number;
  competition?: number;
}

// 历史排名概览
interface HistoricalRankOverview {
  date: string; // YYYY-MM-DD
  top1Count: number;
  top3Count: number;
  top10Count: number;
  top50Count: number;
  top100Count: number;
}

// SERP竞争对手
interface SerpCompetitor {
  keyword: string;
  competitors: Array<{
    domain: string;
    position: number;
    visibility: number;
  }>;
}

// 域名重合度分析
interface DomainIntersection {
  targetDomain: string;
  competitorDomain: string;
  commonKeywords: Array<{
    keyword: string;
    ourPosition: number;
    competitorPosition: number;
  }>;
  gapKeywords: Array<{
    keyword: string;
    competitorPosition: number;
    searchVolume: number;
    etv: number;
  }>;
  ourKeywords: Array<{
    keyword: string;
    ourPosition: number;
    searchVolume: number;
  }>;
  gapTraffic: number;
}

// 相关页面
interface RelevantPage {
  url: string;
  organicTraffic: number;
  keywordsCount: number;
  avgPosition: number;
  topKeywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
  }>;
}
```

---

## ✅ 验收标准

1. **功能完整性**
   - 所有新功能都能正常工作
   - 数据准确且实时更新
   - 缓存机制正常工作

2. **性能要求**
   - 页面加载时间 < 3秒
   - API 响应时间 < 5秒
   - 支持并发用户访问

3. **用户体验**
   - UI 直观易用
   - 错误提示友好
   - 支持多语言（中英文）

4. **代码质量**
   - 代码符合项目规范
   - 有适当的注释和文档
   - 通过所有测试

---

## 📝 注意事项

1. **API 速率限制**
   - DataForSEO API 有速率限制，需要实现请求队列和重试机制
   - 优先使用缓存数据，减少 API 调用

2. **数据准确性**
   - 某些 API 端点可能需要特定的 DataForSEO 订阅计划
   - 需要验证 API 端点的可用性和数据格式

3. **成本控制**
   - 合理设置缓存时间，减少 API 调用次数
   - 监控 API 使用量，避免超出配额

4. **向后兼容**
   - 确保新功能不影响现有功能
   - 保持 API 接口的向后兼容性

---

## 🚀 下一步行动

1. 确认 DataForSEO API 订阅计划是否包含所需端点
2. 测试各个 API 端点的可用性和数据格式
3. 开始实施阶段 1：后端 API 扩展
4. 定期更新进度和遇到的问题
