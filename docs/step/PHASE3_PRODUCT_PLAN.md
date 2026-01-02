# 🚀 Google SEO Agent 产品规划方案 v2.0

**日期**: 2026-01-02
**状态**: Phase 3 开始
**版本**: 2.0

---

## 📊 一、现状评估

### ✅ 已完成功能

1. **Phase 1: SEO 基础功能**
   - ✅ 关键词挖掘与生成
   - ✅ 排名概率分析
   - ✅ 内容策略生成
   - ✅ 批量翻译分析
   - ✅ 网站绑定（使用 localStorage）

2. **Phase 2.1: Website Data 基础功能**
   - ✅ 数据库表创建（user_websites, website_pages, website_keywords, article_rankings）
   - ✅ Firecrawl 集成（/map 获取网站结构）
   - ✅ SE-Ranking API 基础集成
   - ✅ Website Data Tab UI
   - ✅ Article Rankings Tab UI
   - ✅ 网站绑定数据保存到数据库

3. **Agent 重构进度**
   - ✅ Phase 1: 工具层提取（SE Ranking, SERP Search, Firecrawl）
   - ✅ Phase 2: Agent 层重构（Agent 1-5 全部实现）
   - ✅ Phase 3: 服务层实现
   - ⏳ Phase 4: API 端点重构（待开始）
   - ⏳ Phase 5: 清理优化（待开始）

### 🎯 用户反馈与问题

1. **My Website 功能不足**
   - 当前只使用 localStorage，不支持数据库持久化
   - 用户刷新或切换设备后丢失绑定状态
   - 没有多个网站管理功能

2. **Website Data 功能单薄**
   - 缺少关键 SEO 指标（类似 Semrush）
   - SE-Ranking 域名 API 未充分利用
   - 缺少可视化的数据分析

3. **GEO 追踪缺失**
   - 没有地理位置维度的排名追踪
   - 缺少本地化 SEO 建议

---

## 🎯 二、产品战略定位

### 核心价值主张

> **Google SEO Agent 是什么？**

一个**轻量化的 AI 驱动 SEO 工作台**，帮助用户：
1. 快速挖掘蓝海关键词
2. 分析竞争对手策略
3. 生成高质量 SEO 内容
4. 追踪网站排名表现
5. 管理多个网站项目

### 目标用户画像

| 用户类型 | 需求痛点 | 核心功能 |
|---------|---------|---------|
| **独立站卖家** | 需要快速找到低竞争关键词 | 关键词挖掘 + 排名追踪 |
| **内容创作者** | 需要批量生成 SEO 优化内容 | AI 内容生成 + 质量检查 |
| **SEO 从业者** | 需要管理多个客户网站 | 多网站管理 + 排名监控 |
| **中小企业** | 预算有限，需要高性价比工具 | 轻量化功能 + 低成本 |

### 竞品差异化

| 功能 | Semrush | Ahrefs | Google SEO Agent |
|-----|---------|--------|-----------------|
| 价格 | $129.95/月 | $129/月 | **~$97/月** (估算) |
| AI 内容生成 | ❌ | ❌ | ✅ |
| 多 Agent 协作 | ❌ | ❌ | ✅ |
| 轻量化 | ❌ | ❌ | ✅ |
| 图像生成 | ❌ | ❌ | ✅ (Nano Banana 2) |
| 关键词挖掘 | ✅ | ✅ | ✅ |
| 排名追踪 | ✅ | ✅ | ✅ |

---

## 📋 三、新功能规划

### 🏆 Priority 1: My Website 功能完善

#### 1.1 多网站管理

**目标**: 用户可以管理多个网站，支持切换

**功能清单**:

- [ ] **网站列表管理**
  - 显示用户绑定的所有网站
  - 网站基本信息（URL、标题、图标、绑定时间）
  - 快速切换当前工作网站

- [ ] **数据库持久化**
  - 从 `user_websites` 表读取用户网站列表
  - 页面加载时自动恢复上次选择的网站
  - 保存用户偏好设置（默认网站）

- [ ] **网站操作**
  - 添加新网站
  - 编辑网站信息
  - 删除/解绑网站
  - 设为默认网站

**数据库设计**:

```sql
-- 修改 user_websites 表
ALTER TABLE user_websites
ADD COLUMN is_default BOOLEAN DEFAULT false,
ADD COLUMN last_accessed_at TIMESTAMP;

-- 用户偏好表
CREATE TABLE user_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  default_website_id UUID REFERENCES user_websites(id),
  last_selected_website_id UUID REFERENCES user_websites(id),
  ui_settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 确保每个用户只有一个默认网站
CREATE UNIQUE INDEX idx_user_default_website
ON user_websites(user_id)
WHERE is_default = true;
```

**API 端点**:

| 端点 | 方法 | 功能 |
|-----|------|------|
| `/api/websites/list` | GET | 获取用户网站列表 |
| `/api/websites/set-default` | POST | 设置默认网站 |
| `/api/websites/delete` | DELETE | 删除网站 |

---

### 📈 Priority 2: Website Data 功能增强

#### 2.1 SE-Ranking 域名分析集成

**目标**: 使用 SE-Ranking 域名 API 获取网站真实 SEO 数据

**新增数据表**:

```sql
-- 域名概览数据缓存
CREATE TABLE domain_overview_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES user_websites(id),

  -- 流量数据
  organic_traffic INTEGER,
  paid_traffic INTEGER,
  total_traffic INTEGER,

  -- 关键词数据
  total_keywords INTEGER,
  new_keywords INTEGER,
  lost_keywords INTEGER,

  -- 排名数据
  avg_position DECIMAL(5,2),

  -- 排名分布
  top3_count INTEGER,
  top10_count INTEGER,
  top50_count INTEGER,
  top100_count INTEGER,

  -- 缓存控制
  data_date DATE,
  data_updated_at TIMESTAMP,
  cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_website_overview UNIQUE (website_id, data_date)
);

-- 域名关键词排名缓存
CREATE TABLE domain_keywords_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES user_websites(id),
  keyword_id UUID REFERENCES website_keywords(id),

  -- SE-Ranking 数据
  current_position INTEGER,
  previous_position INTEGER,
  search_volume INTEGER,
  cpc DECIMAL(10,2),
  competition DECIMAL(5,2),
  difficulty INTEGER,

  -- 趋势数据
  position_change_7d INTEGER,
  position_change_30d INTEGER,

  -- 历史数据
  ranking_history JSONB,

  -- 缓存控制
  data_updated_at TIMESTAMP,
  cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_website_domain_keyword UNIQUE (website_id, keyword_id)
);

-- 竞争对手数据缓存
CREATE TABLE domain_competitors_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES user_websites(id),

  -- 竞争对手信息
  competitor_domain VARCHAR(255),
  competitor_title VARCHAR(500),

  -- 对比数据
  common_keywords INTEGER,
  organic_traffic INTEGER,
  total_keywords INTEGER,

  -- 缓存控制
  data_updated_at TIMESTAMP,
  cache_expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '7 days',

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_website_competitor UNIQUE (website_id, competitor_domain)
);
```

**功能清单**:

| 功能模块 | 数据来源 | 优先级 | 预计工期 |
|---------|---------|--------|---------|
| **概览仪表盘** | SE-Ranking Domain API | P0 | 2 天 |
| **排名分布图** | SE-Ranking Domain API | P0 | 1 天 |
| **Top 关键词列表** | SE-Ranking + website_keywords | P0 | 2 天 |
| **排名历史趋势图** | SE-Ranking History API | P0 | 2 天 |
| **竞争对手对比** | SE-Ranking Competitors API | P1 | 2 天 |
| **页面表现分析** | SE-Ranking + website_pages | P1 | 3 天 |
| **导出报告** | 所有数据源 | P2 | 1 天 |

---

### 🌍 Priority 3: GEO 追踪功能

#### 3.1 地理位置排名追踪

**目标**: 追踪关键词在不同地理位置的排名表现

**数据库设计**:

```sql
-- 地理位置排名表
CREATE TABLE geo_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_ranking_id UUID REFERENCES article_rankings(id) ON DELETE CASCADE,

  -- 地理位置
  country_code VARCHAR(2) DEFAULT 'US',
  region VARCHAR(100),
  city VARCHAR(100),

  -- 排名数据
  current_position INTEGER,
  previous_position INTEGER,
  position_change INTEGER,

  -- 流量估算
  local_traffic INTEGER,

  -- 追踪状态
  is_tracking BOOLEAN DEFAULT true,
  last_tracked_at TIMESTAMP,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_geo_ranking UNIQUE (
    article_ranking_id,
    country_code,
    region,
    city
  )
);

-- GEO 优化机会
CREATE TABLE geo_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES user_websites(id),
  keyword_id UUID REFERENCES website_keywords(id),

  -- 地理位置
  target_country VARCHAR(2),
  target_region VARCHAR(100),
  target_city VARCHAR(100),

  -- 机会分析
  current_position INTEGER,
  potential_position INTEGER,
  position_gap INTEGER,

  estimated_traffic_gain INTEGER,

  -- 难度评估
  difficulty_score INTEGER,
  effort_required VARCHAR(50),

  -- 优化建议
  optimization_suggestions TEXT,

  -- 状态
  status VARCHAR(50) DEFAULT 'pending',

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**API 端点**:

| 端点 | 方法 | 功能 |
|-----|------|------|
| `/api/geo/rankings` | GET | 获取关键词的 GEO 排名数据 |
| `/api/geo/compare` | POST | 对比不同地区的排名表现 |
| `/api/geo/opportunities` | GET | 发现地理排名机会 |

---

## 🚀 四、实施计划

### Phase 3.1: 多网站管理 (3-4 天)

**目标**: 实现用户可以管理多个网站

#### Day 1-2: 数据库和 API

- [ ] 创建 `user_preferences` 表
- [ ] 添加 `user_websites` 表新字段
- [ ] 实现 `/api/websites/list`
- [ ] 实现 `/api/websites/set-default`
- [ ] 实现 `/api/websites/delete`

#### Day 3-4: 前端 UI

- [ ] 创建 `components/WebsiteManager.tsx`
- [ ] 创建 `components/WebsiteCard.tsx`
- [ ] 实现"添加网站"对话框
- [ ] 实现"切换网站"功能
- [ ] 实现"删除网站"确认对话框
- [ ] 更新 `ContentGenerationView` 使用数据库

### Phase 3.2: Website Data 增强 (7-10 天)

**目标**: 集成 SE-Ranking 域名 API

#### Day 1-2: 工具层

- [ ] 创建 `api/_shared/tools/se-ranking-domain.ts`
- [ ] 实现 `getDomainOverview`
- [ ] 实现 `getDomainKeywords`
- [ ] 实现 `getDomainRankingHistory`
- [ ] 实现 `getDomainCompetitors`

#### Day 3-4: 数据库

- [ ] 创建缓存表
- [ ] 创建数据更新 API

#### Day 5-7: API 端点

- [ ] `/api/website-data/overview`
- [ ] `/api/website-data/keywords`
- [ ] `/api/website-data/ranking-history`
- [ ] `/api/website-data/competitors`

#### Day 8-10: 前端 UI

- [ ] 创建仪表盘组件
- [ ] 创建图表组件
- [ ] 实现数据导出功能

### Phase 3.3: GEO 追踪 (5-7 天)

**目标**: 实现地理位置排名追踪

#### Day 1-2: 数据库

- [ ] 创建 `geo_rankings` 表
- [ ] 创建 `geo_opportunities` 表

#### Day 3-4: API

- [ ] `/api/geo/rankings`
- [ ] `/api/geo/compare`
- [ ] `/api/geo/opportunities`

#### Day 5-7: 前端 UI

- [ ] 创建 GEO 排名视图
- [ ] 创建地理分布地图
- [ ] 创建对比图表

---

## 📊 五、成本评估

### 开发成本

| 阶段 | 工期 | 成本 |
|-----|------|------|
| Phase 3.1: 多网站管理 | 3-4 天 | $400-500 |
| Phase 3.2: Website Data 增强 | 7-10 天 | $900-1,300 |
| Phase 3.3: GEO 追踪 | 5-7 天 | $600-800 |
| **总计** | **15-21 天** | **$1,900-2,600** |

### 运营成本（新增）

| 项目 | 月成本 |
|-----|--------|
| SE-Ranking Domain API | $19-39/月 |
| Vercel Hobby Pro | $20/月 |
| **总计** | **~$40-60/月** |

---

## ✅ 六、验收标准

### Phase 3.1: 多网站管理

- [ ] 用户可以添加多个网站
- [ ] 页面加载时自动恢复上次选择的网站
- [ ] 用户可以设置默认网站
- [ ] 用户可以删除不需要的网站
- [ ] 所有操作持久化到数据库

### Phase 3.2: Website Data 增强

- [ ] 显示网站概览数据
- [ ] 显示排名分布图表
- [ ] 显示 Top 关键词列表
- [ ] 显示排名历史趋势图
- [ ] 显示竞争对手对比
- [ ] 数据缓存机制正常

### Phase 3.3: GEO 追踪

- [ ] 可以按国家/地区/城市查看排名
- [ ] 显示地理分布可视化
- [ ] 支持不同地区排名对比
- [ ] 显示 GEO 优化机会

---

**文档版本**: 2.0
**最后更新**: 2026-01-02
