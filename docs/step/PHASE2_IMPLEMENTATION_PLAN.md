# Google SEO Agent - Phase 2 实施计划

> **Multi-Agent AI Content Creation System**
> 创建时间: 2026-01-01
> 预计工期: 6-8 周

---

## 📋 目录

1. [项目概述](#项目概述)
2. [核心目标](#核心目标)
3. [我们要做什么](#我们要做什么)
4. [我们需要什么](#我们需要什么)
5. [后端架构设计](#后端架构设计)
6. [关键 API 端点](#关键api端点)
7. [数据库设计](#数据库设计)
8. [实施阶段](#实施阶段)
9. [技术风险与挑战](#技术风险与挑战)
10. [成本预估](#成本预估)

---

## 项目概述

### 当前状态（Phase 1 - 已完成）

✅ 关键词生成与挖掘
✅ 排名概率分析
✅ SEO 内容策略生成
✅ 批量翻译分析
✅ 积分系统集成
✅ 跨项目认证

### Phase 2 目标（待实施）

构建完整的**多代理 AI 内容创作系统**，实现从关键词挖掘到内容发布和追踪的全自动化流程。

**核心创新点**：

- 4 个专业 AI 代理协同工作
- 8 步完整内容优化流程
- 一键发布到多个平台
- 自动排名追踪

---

## 核心目标

### 主要功能

1. **多代理 AI 系统** - 4 个专业代理（SEO 研究员、内容写手、质量审查、图像创意）
2. **完整内容管道** - 从研究到发布的 8 步自动化流程
3. **图像自动生成** - Nano Banana 2 集成（4K 高质量，5-10 秒/图）
4. **多平台发布** - WordPress、Medium、Ghost 等一键发布
5. **智能追踪系统** - 关键词排名和流量监控

### 技术指标

- 单篇文章生成时间: < 3 分钟（含图像）
- 内容质量评分: > 80 分
- AI 检测通过率: > 90%
- SEO 优化覆盖率: 100%

---

## 我们要做什么

### 🤖 Part 1: 多代理 AI 系统（4 个代理）

#### Agent 1: SEO 研究官 (SEO Researcher)

**文件**: `api/agents/seo-researcher.ts`

**职责**:

- 搜索引擎偏好分析
  - Google ranking factors
  - ChatGPT citation patterns
  - Claude reference behavior
  - Perplexity answer format
- 竞争对手分析
  - Top 10 SERP 抓取
  - 内容结构提取 (H1-H3 hierarchy)
  - 内容框架识别
  - 内容缺口发现
- 关键词研究
  - 主关键词优化建议
  - LSI 关键词提取
  - 关键词布局规划
- GEO/AIO 优化建议

**输入**:

```typescript
{
  keyword: string;
  targetLanguage: string;
  targetEngines: ['google', 'chatgpt', 'claude', 'perplexity'];
  location?: string; // For GEO optimization
}
```

**输出**:

```typescript
{
  searchPreferences: Record<string, OptimizationStrategy>;
  competitorAnalysis: {
    top10: CompetitorData[];
    structurePatterns: StructurePattern[];
    contentGaps: string[];
  };
  keywords: {
    primary: string;
    lsi: string[];
    density: number; // 1-2%
    placement: KeywordPlacement[];
  };
  geoRecommendations: GeoOptimization[];
  aioRecommendations: AIOOptimization[];
}
```

---

#### Agent 2: 内容写手 (Content Writer)

**文件**: `api/agents/content-writer.ts`

**职责**:

- 根据 SEO 研究生成初稿
- 遵循竞争对手结构
- 关键词注入（按优化位置）
- GEO 优化应用
- AIO 优化应用

**输入**:

```typescript
{
  seoResearch: Agent1Output; // 来自Agent 1
  targetLanguage: string;
  tone: "professional" | "casual" | "academic";
  wordCount: number;
}
```

**输出**:

```typescript
{
  title: string;
  metaDescription: string;
  content: string; // Markdown format
  structure: ContentStructure;
  appliedOptimizations: {
    keywords: KeywordPlacement[];
    geo: GeoOptimization[];
    aio: AIOOptimization[];
  };
}
```

---

#### Agent 3: 质量把关官 (Quality Reviewer)

**文件**: `api/agents/quality-reviewer.ts`

**职责**:

- 关键词密度验证 (目标: 1-2%)
- AI 概率检测
- GEO/AIO 合规性检查
- 可读性评分 (Flesch Reading Ease)
- 整体质量评分 (0-100)
- 改进建议生成

**输入**:

```typescript
{
  content: Agent2Output;
  seoResearch: Agent1Output;
  qualityThresholds: {
    minScore: number; // Default: 80
    maxAIDetection: number; // Default: 30%
  }
}
```

**输出**:

```typescript
{
  keywordDensity: {
    score: number; // 0-100
    details: DensityCheck[];
  };
  aiDetection: {
    probability: number; // 0-100%
    details: AIDetectionResult[];
  };
  geoCompliance: ComplianceCheck;
  aioCompliance: ComplianceCheck;
  readability: {
    fleschScore: number;
    gradeLevel: string;
  };
  overallScore: number; // 0-100
  passed: boolean;
  suggestions: ImprovementSuggestion[];
}
```

---

#### Agent 4: 图文创意官 (Image Creative Director)

**文件**: `api/agents/image-creative.ts`

**职责**:

- 从内容提取 4-6 个视觉主题
- 为每个主题生成 Nano Banana 2 prompt
- 调用图像生成 API（并行请求）
- 下载并添加元数据
- 规划图像在文章中的位置

**输入**:

```typescript
{
  content: Agent2Output;
  imageCount: number; // Default: 4-6
  style: "realistic" | "illustration" | "abstract";
}
```

**输出**:

```typescript
{
  themes: ExtractedTheme[];
  images: {
    id: string;
    prompt: string;
    url: string;
    altText: string;
    position: number; // 在文章中的位置
    metadata: {
      width: number;
      height: number;
      format: string;
      exif: Record<string, any>;
    };
  }[];
  totalCost: number; // USD
}
```

---

### 🔄 Part 2: 内容创作管道（8 步流程）

#### Step 1: 搜索引擎偏好分析

**文件**: `api/pipeline/search-preferences.ts`

分析不同搜索引擎的排名因素差异。

**API**: `POST /api/pipeline/search-preferences`

#### Step 2: 竞争对手分析

**文件**: `api/pipeline/competitor-analysis.ts`

深度 SERP 分析，提取 Top 10 内容结构。

**API**: `POST /api/pipeline/competitor-analysis`

#### Step 3: 关键词优化

**文件**: `api/pipeline/keyword-optimization.ts`

关键词密度计算、LSI 关键词识别、位置规划。

**API**: `POST /api/pipeline/keyword-optimization`

#### Step 4: GEO 优化

**文件**: `api/pipeline/geo-optimization.ts`

地理位置内容优化（本地案例、地区数据、本地化措辞）。

**API**: `POST /api/pipeline/geo-optimization`

#### Step 5: AIO 优化

**文件**: `api/pipeline/aio-optimization.ts`

AI 引擎优化（Q&A 格式、结构化数据、引用优化）。

**API**: `POST /api/pipeline/aio-optimization`

#### Step 6: 内容生成

**文件**: `api/pipeline/content-generation.ts`

综合所有优化建议生成最终文章。

**API**: `POST /api/pipeline/content-generation`

#### Step 7: 质量检查

**文件**: `api/pipeline/quality-check.ts`

全面质量检查和评分。

**API**: `POST /api/pipeline/quality-check`

#### Step 8: 图像生成

**文件**: `api/pipeline/image-generation.ts`

Nano Banana 2 图像生成和集成。

**API**: `POST /api/pipeline/image-generation`

---

### 📤 Part 3: 发布系统

#### 平台配置

**文件**: `api/publish/configure.ts`

**支持平台**:

- WordPress (REST API)
- Medium (Official API)
- Ghost (Admin API)
- Webflow (API)
- Custom Webhooks

**API**: `POST /api/publish/configure`

```typescript
{
  platform: 'wordpress' | 'medium' | 'ghost';
  credentials: {
    url?: string; // For WordPress
    username?: string;
    password?: string; // Application password
    apiToken?: string; // For Medium/Ghost
  };
  contentConfig: {
    categories?: string[];
    tags?: string[];
    featuredImage?: boolean;
    status?: 'draft' | 'publish';
  };
}
```

#### 一键发布

**文件**: `api/publish/execute.ts`

**API**: `POST /api/publish/execute`

```typescript
{
  contentDraftId: string;
  platformConfigId: string;
  scheduledAt?: Date; // Optional scheduling
}
```

---

### 📊 Part 4: 追踪系统

#### 排名追踪

**文件**: `api/track/rankings.ts`

**追踪指标**:

- Google 排名位置
- ChatGPT 引用次数
- Claude 引用次数
- Perplexity 可见度
- 有机流量估算

**API**: `POST /api/track/rankings`

```typescript
{
  keywordIds: string[];
  searchEngines: string[];
  publicationId: string;
}
```

---

## 我们需要什么

### 🔧 技术依赖

#### 1. AI & APIs

- ✅ **Gemini API** (已有) - 主要 AI 引擎

  - 用途: 所有 4 个代理的核心 AI 能力
  - 模型: gemini-2.5-flash
  - 代理: https://api.302.ai

- 🆕 **Nano Banana 2 API** (需要)

  - 用途: 高质量图像生成
  - 成本: $0.05-0.08/image
  - 规格: 4K 分辨率，5-10 秒生成
  - 注册: https://nanobanana.com

- 🆕 **SERP APIs** (可选，建议配置)

  - Serper API (Google SERP)
  - SERPAPI (备用)
  - 用途: 竞争对手分析

- 🆕 **Publication APIs** (按需配置)
  - WordPress REST API (开源)
  - Medium API (免费)
  - Ghost Admin API (免费)

#### 2. 数据库扩展

- ✅ PostgreSQL (已有)
- 🆕 需要添加新表:
  - `projects` - 项目管理
  - `keywords` - 关键词存储
  - `content_drafts` - 内容草稿
  - `images` - 图像资源
  - `publications` - 发布记录
  - `ranking_records` - 排名追踪

#### 3. 存储

- 🆕 **Vercel Blob** 或 **Cloudflare R2**
  - 用途: 存储生成的图像
  - 成本: ~$0.015/GB/month (R2)

#### 4. 前端库

- 🆕 **状态管理**: Zustand 或 Redux Toolkit
- 🆕 **UI 组件库**:
  - Shadcn/ui (推荐)
  - 或继续使用 Lucide React
- 🆕 **实时更新**: WebSocket 或 Server-Sent Events
  - 用于: 管道进度流式传输

---

## 后端架构设计

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │挖词界面  │  │生成界面  │  │发布界面  │  │追踪界面  │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       └──────────────┴──────────────┴──────────────┘         │
│                        ↓                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Serverless API                     │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │         Orchestrator (编排器)                     │      │
│  │  api/agents/_shared/orchestrator.ts              │      │
│  └────┬──────────┬──────────┬──────────┬────────────┘      │
│       ↓          ↓          ↓          ↓                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │Agent 1  │ │Agent 2  │ │Agent 3  │ │Agent 4  │         │
│  │SEO      │ │Content  │ │Quality  │ │Image    │         │
│  │Research │ │Writer   │ │Reviewer │ │Creative │         │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘         │
│       └──────────┴──────────┴──────────┘                  │
│                    ↓                                       │
│  ┌──────────────────────────────────────────────┐        │
│  │     Pipeline Manager (管道管理器)             │        │
│  │  8 Steps: Search → Competitor → Keywords     │        │
│  │    → GEO → AIO → Generate → Check → Images  │        │
│  └──────────────────┬───────────────────────────┘        │
│                     ↓                                      │
│  ┌──────────────────────────────────────────────┐        │
│  │     Publisher (发布器)                        │        │
│  │  WordPress │ Medium │ Ghost │ Webhook        │        │
│  └──────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services                        │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐              │
│  │Gemini API│ │Nano Banana 2 │ │SERP APIs │              │
│  └──────────┘ └──────────────┘ └──────────┘              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  projects │ keywords │ content_drafts │ images │           │
│  publications │ ranking_records │ users (shared)          │
└─────────────────────────────────────────────────────────────┘
```

### 代码组织结构

```
api/
├── agents/                          # AI代理系统
│   ├── _shared/
│   │   ├── orchestrator.ts         # 代理编排器
│   │   ├── agent-base.ts           # 代理基类
│   │   └── types.ts                # 代理类型定义
│   ├── seo-researcher.ts           # Agent 1
│   ├── content-writer.ts           # Agent 2
│   ├── quality-reviewer.ts         # Agent 3
│   └── image-creative.ts           # Agent 4
│
├── pipeline/                        # 内容管道
│   ├── _shared/
│   │   ├── pipeline-manager.ts     # 管道状态管理
│   │   ├── checkpoint.ts           # 检查点/恢复机制
│   │   └── types.ts                # 管道类型
│   ├── search-preferences.ts       # Step 1
│   ├── competitor-analysis.ts      # Step 2
│   ├── keyword-optimization.ts     # Step 3
│   ├── geo-optimization.ts         # Step 4
│   ├── aio-optimization.ts         # Step 5
│   ├── content-generation.ts       # Step 6
│   ├── quality-check.ts            # Step 7
│   └── image-generation.ts         # Step 8
│
├── publish/                         # 发布系统
│   ├── configure.ts                # 平台配置
│   ├── execute.ts                  # 执行发布
│   ├── history.ts                  # 发布历史
│   ├── platforms/
│   │   ├── wordpress.ts            # WordPress适配器
│   │   ├── medium.ts               # Medium适配器
│   │   └── ghost.ts                # Ghost适配器
│   └── _shared/
│       └── publisher-base.ts       # 发布器基类
│
├── track/                           # 追踪系统
│   ├── rankings.ts                 # 排名追踪
│   ├── traffic.ts                  # 流量统计
│   └── citations.ts                # 引用监控
│
├── lib/                             # 核心库
│   ├── db.ts                       # 数据库连接
│   ├── auth.ts                     # 认证
│   ├── storage.ts                  # 文件存储 (Blob/R2)
│   └── queue.ts                    # 任务队列 (可选)
│
├── _shared/                         # 共享工具
│   ├── gemini.ts                   # Gemini API
│   ├── nanobanana.ts               # Nano Banana 2 API
│   ├── serp.ts                     # SERP API
│   ├── request-handler.ts          # 请求处理
│   └── types.ts                    # 共享类型
│
├── agents-orchestrate.ts           # 主入口API
└── pipeline-execute.ts             # 管道执行API
```

---

## 关键 API 端点

### 1. 代理系统

#### `POST /api/agents/orchestrate`

主编排 API，执行完整的多代理工作流。

**Request**:

```json
{
  "keyword": "coffee shop marketing",
  "targetLanguage": "en",
  "uiLanguage": "zh",
  "agents": [
    "seo-researcher",
    "content-writer",
    "quality-reviewer",
    "image-creative"
  ],
  "options": {
    "imageCount": 6,
    "qualityThreshold": 80,
    "tone": "professional",
    "wordCount": 2000
  }
}
```

**Response**:

```json
{
  "success": true,
  "pipelineId": "pipe_123abc",
  "status": "completed",
  "results": {
    "seoResearch": { ... },
    "content": { ... },
    "qualityCheck": { ... },
    "images": [ ... ]
  },
  "metrics": {
    "duration": 145, // seconds
    "cost": 0.85, // USD
    "agentCalls": 12
  }
}
```

---

#### `POST /api/agents/seo-researcher`

单独调用 Agent 1

**Request**:

```json
{
  "keyword": "coffee shop marketing",
  "targetLanguage": "en",
  "targetEngines": ["google", "chatgpt"],
  "location": "New York"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "searchPreferences": {
      "google": {
        "rankingFactors": ["backlinks", "content-depth", "page-speed"],
        "optimizationStrategy": "..."
      },
      "chatgpt": {
        "citationPatterns": ["structured-data", "q&a-format"],
        "optimizationStrategy": "..."
      }
    },
    "competitorAnalysis": {
      "top10": [
        {
          "url": "example.com/article",
          "title": "...",
          "structure": ["H1", "H2", "H3"],
          "wordCount": 2500
        }
      ],
      "contentGaps": ["missing local case studies", "no statistics from 2024"]
    },
    "keywords": {
      "primary": "coffee shop marketing",
      "lsi": ["cafe promotion", "coffee advertising"],
      "density": 0.015,
      "placement": [
        { "position": "title", "keyword": "coffee shop marketing" },
        { "position": "h1", "keyword": "coffee shop marketing" }
      ]
    }
  }
}
```

---

#### `POST /api/agents/content-writer`

单独调用 Agent 2

#### `POST /api/agents/quality-reviewer`

单独调用 Agent 3

#### `POST /api/agents/image-creative`

单独调用 Agent 4

---

### 2. 内容管道

#### `POST /api/pipeline/execute`

执行完整的 8 步管道

**Request**:

```json
{
  "keyword": "coffee shop marketing",
  "targetLanguage": "en",
  "uiLanguage": "zh",
  "options": {
    "steps": "all", // or [1, 2, 3, 6, 8] for selective steps
    "checkpoint": true, // Enable checkpoint/resume
    "streamProgress": true // SSE for real-time updates
  }
}
```

**Response** (Streaming):

```
data: {"step": 1, "status": "started", "message": "Analyzing search preferences..."}
data: {"step": 1, "status": "completed", "duration": 12}
data: {"step": 2, "status": "started", "message": "Fetching SERP data..."}
...
data: {"step": 8, "status": "completed", "duration": 45}
data: {"status": "completed", "totalDuration": 165, "cost": 0.92}
```

---

### 3. 发布系 ���

#### `POST /api/publish/configure`

保存发布平台配置

**Request**:

```json
{
  "platform": "wordpress",
  "name": "My WordPress Blog",
  "credentials": {
    "url": "https://myblog.com",
    "username": "admin",
    "password": "app_password_here"
  },
  "defaults": {
    "status": "draft",
    "categories": ["Marketing"],
    "featuredImage": true
  }
}
```

**Response**:

```json
{
  "success": true,
  "configId": "config_abc123",
  "testConnection": true
}
```

---

#### `POST /api/publish/execute`

执行发布

**Request**:

```json
{
  "contentDraftId": "draft_xyz",
  "platformConfigId": "config_abc123",
  "options": {
    "status": "publish",
    "scheduledAt": null
  }
}
```

**Response**:

```json
{
  "success": true,
  "publicationId": "pub_456",
  "postUrl": "https://myblog.com/coffee-shop-marketing",
  "platformPostId": "12345"
}
```

---

### 4. 追踪系统

#### `POST /api/track/rankings`

追踪关键词排名

**Request**:

```json
{
  "keywordIds": ["kw_1", "kw_2"],
  "searchEngines": ["google", "chatgpt"],
  "publicationId": "pub_456"
}
```

**Response**:

```json
{
  "success": true,
  "trackingId": "track_789",
  "results": [
    {
      "keywordId": "kw_1",
      "keyword": "coffee shop marketing",
      "rankings": {
        "google": {
          "position": 12,
          "change": "+3",
          "traffic": 450
        },
        "chatgpt": {
          "citations": 5,
          "change": "+2"
        }
      }
    }
  ]
}
```

---

## 数据库设计

### 新增表结构

```sql
-- =============================================
-- 1. Projects Table (项目管理)
-- =============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),

  -- 基本信息
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- 关键词配置
  seed_keyword VARCHAR(500),
  target_language VARCHAR(10) DEFAULT 'en',
  location VARCHAR(255), -- For GEO optimization

  -- 状态
  status VARCHAR(50) DEFAULT 'active', -- active, archived, completed

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- =============================================
-- 2. Keywords Table (关键词存储)
-- =============================================
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- 关键词信息
  keyword VARCHAR(500) NOT NULL,
  translation VARCHAR(500), -- 原始关键词（如中文）
  intent VARCHAR(50), -- informational, transactional, commercial, local

  -- SEO数据
  volume INTEGER DEFAULT 0,
  difficulty INTEGER, -- 0-100
  probability VARCHAR(20), -- High, Medium, Low

  -- 用户选择
  is_selected BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0, -- 优先级排序

  -- 分析结果 (JSON)
  serp_result_count INTEGER,
  top_domain_type VARCHAR(100),
  reasoning TEXT,
  serp_snippets JSONB,

  -- SE Ranking数据
  seranking_data JSONB,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_project_keyword UNIQUE (project_id, keyword)
);

CREATE INDEX idx_keywords_project ON keywords(project_id);
CREATE INDEX idx_keywords_selected ON keywords(is_selected);
CREATE INDEX idx_keywords_probability ON keywords(probability);

-- =============================================
-- 3. Content Drafts Table (内容草稿)
-- =============================================
CREATE TABLE content_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES keywords(id),

  -- 基本信息
  title VARCHAR(500),
  slug VARCHAR(500),
  meta_description TEXT,

  -- 内容
  content TEXT, -- Markdown格式
  html_content TEXT, -- 渲染后的HTML

  -- SEO优化记录
  seo_optimizations JSONB, -- 关键词位置、GEO、AIO等

  -- 版本控制
  version INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES content_drafts(id),

  -- 状态
  status VARCHAR(50) DEFAULT 'draft',
  -- draft, reviewing, approved, published, rejected

  -- 质量评分
  quality_score INTEGER, -- 0-100
  ai_detection_score INTEGER, -- 0-100 (AI概率)
  keyword_density_score INTEGER, -- 0-100
  readability_score JSONB, -- Flesch, grade level

  -- 质量检查结果
  quality_checks JSONB, -- 详细检查结果

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

CREATE INDEX idx_content_project ON content_drafts(project_id);
CREATE INDEX idx_content_keyword ON content_drafts(keyword_id);
CREATE INDEX idx_content_status ON content_drafts(status);
CREATE INDEX idx_content_quality ON content_drafts(quality_score);

-- =============================================
-- 4. Images Table (图像资源)
-- =============================================
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID REFERENCES content_drafts(id) ON DELETE CASCADE,

  -- 图像信息
  prompt TEXT, -- Nano Banana 2 prompt
  theme VARCHAR(500), -- 提取的主题
  image_url VARCHAR(1000), -- 存储在Blob/R2的URL

  -- SEO
  alt_text VARCHAR(500),
  caption TEXT,

  -- 位置
  position INTEGER, -- 在文章中的顺序
  section_id VARCHAR(100), -- 插入到哪个章节

  -- 元数据
  metadata JSONB, -- width, height, format, EXIF等

  -- 成本
  generation_cost DECIMAL(10, 4), -- USD

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_images_draft ON images(content_draft_id);
CREATE INDEX idx_images_position ON images(position);

-- =============================================
-- 5. Platform Configs Table (发布平台配置)
-- =============================================
CREATE TABLE platform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),

  -- 平台信息
  platform VARCHAR(100) NOT NULL, -- wordpress, medium, ghost
  name VARCHAR(255), -- 用户自定义名称

  -- 凭证 (加密存储)
  credentials JSONB, -- 加密的凭证信息

  -- 默认配置
  defaults JSONB, -- categories, tags, status等

  -- 状态
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_successful BOOLEAN,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_user ON platform_configs(user_id);
CREATE INDEX idx_platform_active ON platform_configs(is_active);

-- =============================================
-- 6. Publications Table (发布记录)
-- =============================================
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_draft_id UUID REFERENCES content_drafts(id),
  platform_config_id UUID REFERENCES platform_configs(id),

  -- 发布信息
  platform VARCHAR(100), -- wordpress, medium, ghost
  platform_post_id VARCHAR(255), -- 平台返回的post ID
  post_url VARCHAR(1000), -- 发布后的URL

  -- 状态
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, published, failed, scheduled

  -- 错误信息
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- 时间戳
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_publications_draft ON publications(content_draft_id);
CREATE INDEX idx_publications_platform ON publications(platform);
CREATE INDEX idx_publications_status ON publications(status);
CREATE INDEX idx_publications_date ON publications(published_at);

-- =============================================
-- 7. Ranking Records Table (排名追踪)
-- =============================================
CREATE TABLE ranking_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID REFERENCES keywords(id),
  publication_id UUID REFERENCES publications(id),

  -- 搜索引擎
  search_engine VARCHAR(50), -- google, chatgpt, claude, perplexity

  -- 排名数据
  position INTEGER, -- 排名位置
  change INTEGER, -- 相比上次的变化

  -- 流量估算
  traffic INTEGER,
  impressions INTEGER,
  clicks INTEGER,

  -- AI引擎特定
  citations INTEGER, -- 引用次数
  visibility_score DECIMAL(5, 2), -- 可见度评分

  -- 额外数据
  metadata JSONB,

  -- 时间戳
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rankings_keyword ON ranking_records(keyword_id);
CREATE INDEX idx_rankings_publication ON ranking_records(publication_id);
CREATE INDEX idx_rankings_engine ON ranking_records(search_engine);
CREATE INDEX idx_rankings_date ON ranking_records(recorded_at);

-- =============================================
-- 8. Agent Execution Logs (代理执行日志)
-- =============================================
CREATE TABLE agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  content_draft_id UUID REFERENCES content_drafts(id),

  -- 执行信息
  agent_name VARCHAR(100), -- seo-researcher, content-writer等
  pipeline_step INTEGER, -- 1-8
  execution_id UUID, -- 同一次执行的logs有相同的ID

  -- 输入输出
  input_data JSONB,
  output_data JSONB,

  -- 执行结果
  status VARCHAR(50), -- started, completed, failed
  error_message TEXT,

  -- 性能
  duration_ms INTEGER,
  cost_usd DECIMAL(10, 4),
  tokens_used INTEGER,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_project ON agent_execution_logs(project_id);
CREATE INDEX idx_agent_logs_execution ON agent_execution_logs(execution_id);
CREATE INDEX idx_agent_logs_agent ON agent_execution_logs(agent_name);

-- =============================================
-- 9. Pipeline Checkpoints (检查点)
-- =============================================
CREATE TABLE pipeline_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  execution_id UUID,

  -- 检查点信息
  step_number INTEGER,
  step_name VARCHAR(100),

  -- 数据快照
  snapshot_data JSONB,

  -- 状态
  status VARCHAR(50), -- in_progress, completed, failed

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checkpoint_execution ON pipeline_checkpoints(execution_id);
CREATE INDEX idx_checkpoint_project ON pipeline_checkpoints(project_id);
```

---

## 实施阶段

### 📅 Phase 2.1: 基础架构 (Week 1-2)

**目标**: 搭建多代理系统的基础设施

#### Week 1: 数据库 & 核心库

- [x] 设计并创建数据库表结构
- [ ] 实现 `api/lib/storage.ts` (图像存储)
- [ ] 实现 `api/lib/queue.ts` (任务队列，可选)
- [ ] 更新 `api/_shared/types.ts` 添加新类型
- [ ] 编写数据库迁移脚本

**交付物**:

- 完整的数据库 schema
- 存储层实现
- 单元测试

#### Week 2: 代理基类 & 编排器

- [ ] 实现 `api/agents/_shared/agent-base.ts`
- [ ] 实现 `api/agents/_shared/orchestrator.ts`
- [ ] 实现 `api/pipeline/_shared/pipeline-manager.ts`
- [ ] 添加检查点/恢复机制
- [ ] 实现 SSE 进度流式传输

**交付物**:

- 代理系统框架
- 管道管理器
- 集成测试

---

### 🤖 Phase 2.2: AI 代理实现 (Week 3-4)

**目标**: 实现 4 个核心代理

#### Week 3: Agent 1 & Agent 2

- [ ] **Agent 1: SEO 研究官**

  - [ ] 搜索引擎偏好分析
  - [ ] SERP 抓取与解析
  - [ ] 竞争对手结构提取
  - [ ] 关键词优化建议
  - [ ] GEO/AIO 建议生成

- [ ] **Agent 2: 内容写手**
  - [ ] 初稿生成逻辑
  - [ ] 关键词注入
  - [ ] 结构遵循
  - [ ] GEO/AIO 应用

**交付物**:

- Agent 1 完整实现
- Agent 2 完整实现
- Prompt 工程文档
- 代理测试套件

#### Week 4: Agent 3 & Agent 4

- [ ] **Agent 3: 质量把关官**

  - [ ] 关键词密度检查
  - [ ] AI 检测集成
  - [ ] GEO/AIO 合规性验证
  - [ ] 可读性评分
  - [ ] 质量评分算法

- [ ] **Agent 4: 图文创意官**
  - [ ] 主题提取算法
  - [ ] Nano Banana 2 集成
  - [ ] Prompt 生成器
  - [ ] 并行图像生成
  - [ ] 图像处理与元数据

**交付物**:

- Agent 3 完整实现
- Agent 4 完整实现
- Nano Banana 2 API 封装
- 端到端测试

---

### 🔄 Phase 2.3: 内容管道 (Week 5)

**目标**: 实现 8 步内容创作流程

- [ ] **Step 1**: 搜索引擎偏好分析 API
- [ ] **Step 2**: 竞争对手分析 API
- [ ] **Step 3**: 关键词优化 API
- [ ] **Step 4**: GEO 优化 API
- [ ] **Step 5**: AIO 优化 API
- [ ] **Step 6**: 内容生成 API
- [ ] **Step 7**: 质量检查 API
- [ ] **Step 8**: 图像生成 API

**交付物**:

- 8 个独立 API 端点
- 完整管道执行器
- 管道状态管理
- 性能优化

---

### 📤 Phase 2.4: 发布系统 (Week 6)

**目标**: 实现多平台发布功能

- [ ] **平台适配器**

  - [ ] WordPress REST API 适配器
  - [ ] Medium API 适配器
  - [ ] Ghost Admin API 适配器

- [ ] **发布核心**

  - [ ] 平台配置管理
  - [ ] 凭证加密存储
  - [ ] 发布执行引擎
  - [ ] 错误处理与重试

- [ ] **API 端点**
  - [ ] `POST /api/publish/configure`
  - [ ] `POST /api/publish/execute`
  - [ ] `GET /api/publish/history`

**交付物**:

- 3 个平台适配器
- 发布系统 API
- 平台测试套件

---

### 📊 Phase 2.5: 追踪系统 (Week 7, Optional)

**目标**: 实现排名追踪功能

- [ ] **排名监控**

  - [ ] Google 排名检查 (SERP API)
  - [ ] ChatGPT 引用检查
  - [ ] 流量估算

- [ ] **数据存储**

  - [ ] 排名历史记录
  - [ ] 趋势分析

- [ ] **API 端点**
  - [ ] `POST /api/track/rankings`
  - [ ] `GET /api/track/history`
  - [ ] `GET /api/track/trends`

**交付物**:

- 排名追踪系统
- 历史数据 API
- 报告生成器

---

### 🎨 Phase 2.6: 前端重构 (Week 7-8)

**目标**: 重构 App.tsx，实现模块化 UI

#### Week 7: 组件拆分

- [ ] 拆分 `App.tsx` 为模块化组件
- [ ] 创建工作流 UI 组件
  - [ ] `components/workflow/PipelineProgress.tsx`
  - [ ] `components/workflow/AgentStatus.tsx`
  - [ ] `components/workflow/StepTimeline.tsx`
- [ ] 创建内容编辑组件
  - [ ] `components/content-editor/ContentPreview.tsx`
  - [ ] `components/content-editor/ImageGallery.tsx`
  - [ ] `components/content-editor/MetricsPanel.tsx`
- [ ] 创建发布组件
  - [ ] `components/publication/PlatformConfig.tsx`
  - [ ] `components/publication/PublishButton.tsx`

#### Week 8: 状态管理 & 集成

- [ ] 实现状态管理 (Zustand)
- [ ] 实现 SSE 进度监听
- [ ] 添加错误边界
- [ ] 性能优化
- [ ] 响应式设计

**交付物**:

- 模块化组件库
- 状态管理架构
- 集成测试
- 用户测试

---

### 🧪 Phase 2.7: 测试与优化 (Week 8)

**目标**: 全面测试和性能优化

- [ ] **单元测试**

  - [ ] 所有代理测试
  - [ ] 管道测试
  - [ ] API 测试

- [ ] **集成测试**

  - [ ] 端到端工作流测试
  - [ ] 平台发布测试
  - [ ] 错误恢复测试

- [ ] **性能优化**

  - [ ] API 响应时间优化
  - [ ] 数据库查询优化
  - [ ] 前端渲染优化

- [ ] **文档**
  - [ ] API 文档更新
  - [ ] 用户指南
  - [ ] 开发者文档

**交付物**:

- 测试覆盖率 > 80%
- 性能基准报告
- 完整文档

---

## 技术风险与挑战

### 🔴 高风险

1. **Vercel 60 秒超时限制**

   - **风险**: 完整管道可能超过 60 秒
   - **缓解**:
     - 实现检查点/恢复机制
     - 拆分为多个 API 调用
     - 使用 Vercel Cron Jobs 处理后台任务
     - 考虑迁移到长时间运行环境 (Vercel Jobs)

2. **Nano Banana 2 API 稳定性**

   - **风险**: 第三方 API 可能不稳定
   - **缓解**:
     - 实现重试机制
     - 添加备用图像源 (DALL-E, Midjourney)
     - 图像生成失败时继续流程

3. **AI 检测准确性**
   - **风险**: AI 概率检测可能不准确
   - **缓解**:
     - 使用多个检测方法交叉验证
     - 调整检测阈值
     - 人工审核作为后备

---

### 🟡 中等风险

4. **SERP API 限流**

   - **风险**: 竞争对手分析可能受 API 限制
   - **缓解**:
     - 实现请求队列和速率限制
     - 缓存 SERP 结果
     - 降低分析频率

5. **大文件处理**

   - **风险**: 内容草稿 + 图像可能很大
   - **缓解**:
     - 图像单独存储 (Blob/R2)
     - 内容分页传输
     - 压缩存储

6. **平台 API 变更**
   - **风险**: WordPress/Medium/Ghost API 可能变更
   - **缓解**:
     - 版本化 API 适配器
     - 定期测试平台连接
     - 快速响应机制

---

### 🟢 低风险

7. **数据库性能**

   - **风险**: 大量排名追踪记录可能影响性能
   - **缓解**:
     - 定期归档旧数据
     - 添加适当索引
     - 分区表 (按时间)

8. **前端复杂度**
   - **风险**: 模块化重构可能引入 bug
   - **缓解**:
     - 渐进式重构
     - 完整的单元测试
     - E2E 测试

---

#

### 运营成本（每篇文章）

| 项目               | 单价               | 数量           | 小计            |
| ------------------ | ------------------ | -------------- | --------------- |
| Gemini API (Flash) | $0.002/1K tokens   | ~100K tokens   | $0.20           |
| Nano Banana 2      | $0.06/image        | 5 images       | $0.30           |
| SERP API           | $0.001/request     | 15 requests    | $0.015          |
| Vercel Serverless  | $0.0002/invocation | 20 invocations | $0.004          |
| Vercel Blob 存储   | $0.015/GB          | 0.05 GB        | $0.00075        |
| **总计**           | -                  | -              | **~$0.52/文章** |

---

### 月度运营成本（假设 100 篇文章/月）

| 项目                          | 成本        |
| ----------------------------- | ----------- |
| AI API (Gemini + Nano Banana) | $50         |
| Vercel Hobby Pro              | $20         |
| Vercel Blob (1GB)             | $0.015      |
| SERP API (1500 requests)      | $1.50       |
| Database (Supabase/Neon)      | $25         |
| **总计**                      | **~$97/月** |

---

## 下一步行动

### 立即开始

1. **获取 API 密钥**

   - [ ] 注册 Nano Banana 2 账号
   - [ ] 获取 SERP API 密钥 (Serper 或 SERPAPI)
   - [ ] 配置 Vercel Blob 存储

2. **数据库准备**

   - [ ] 运行迁移脚本创建新表
   - [ ] 备份现有数据

3. **环境变量配置**

   - [ ] 添加新 API 密钥到 `.env`
   - [ ] 更新 Vercel 环境变量

4. **开始 Phase 2.1**
   - [ ] 创建 `api/lib/storage.ts`
   - [ ] 实现代理基类
   - [ ] 实现编排器

---

## 参考资料

### Nano Banana 2 API 文档

- 网站: https://nanobanana.com
- API 文档: [待获取]

### SERP APIs

- Serper: https://serper.dev
- SERPAPI: https://serpapi.com

### 平台 APIs

- WordPress REST API: https://developer.wordpress.org/rest-api/
- Medium API: https://github.com/Medium/medium-api-docs
- Ghost Admin API: https://ghost.org/docs/admin-api/

---

## 附录: Prompt 工程示例

### Agent 1: SEO 研究员 Prompt

```markdown
You are an expert SEO Researcher with deep knowledge of how different search engines rank and display content.

## Your Task

Analyze the keyword "{keyword}" and provide comprehensive SEO recommendations.

## Requirements

1. Search Engine Preferences

   - Analyze ranking factors for: Google, ChatGPT, Claude, Perplexity
   - Identify differences in content preferences

2. Competitor Analysis

   - Fetch Top 10 SERP results for "{keyword}"
   - Extract content structure (H1, H2, H3 hierarchy)
   - Identify common patterns and frameworks
   - Find content gaps and opportunities

3. Keyword Optimization

   - Primary keyword: "{keyword}"
   - Extract 5-10 LSI keywords
   - Recommend keyword density (1-2%)
   - Plan optimal keyword placement

4. GEO Optimization (for location: {location})

   - Suggest local references and landmarks
   - Identify regional data sources
   - Recommend localized language

5. AIO Optimization
   - Suggest Q&A sections
   - Identify structured data opportunities
   - Recommend AI-friendly content structures

## Output Format

Return a JSON object with the following structure:
{
"searchPreferences": { ... },
"competitorAnalysis": { ... },
"keywords": { ... },
"geoRecommendations": [ ... ],
"aioRecommendations": [ ... ]
}
```

---

**文档版本**: 1.0
**最后更新**: 2026-01-01
**维护者**: Claude Code

---

> 💡 **提示**: 本文档是一个动态计划，将根据实施过程中的发现和反馈持续更新。
