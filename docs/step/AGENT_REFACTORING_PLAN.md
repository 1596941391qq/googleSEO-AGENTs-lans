# Agent 系统重构与任务拆分计划

**创建日期**: 2026-01-02  
**目标**: 重构代码结构，提取共享工具层，实现 Agent 职责清晰分离

---

## 📋 目录

1. [重构目标](#重构目标)
2. [当前问题分析](#当前问题分析)
3. [新代码结构设计](#新代码结构设计)
4. [共享工具层设计](#共享工具层设计)
5. [详细任务拆分](#详细任务拆分)
6. [实施顺序](#实施顺序)

---

## 🎯 重构目标

### 核心目标

1. **提取共享工具层** - 将 SE Ranking API、SERP Search、快速排名分析等工具统一管理
2. **职责清晰分离** - Keyword Mining 和 Deep Dive 使用不同的 Agent，避免重复调用
3. **代码结构优化** - 清晰的目录结构，便于维护和扩展
4. **成本节约** - 避免不必要的 Agent 调用，优化 API 使用

### 预期成果

- ✅ 共享工具层独立，可复用
- ✅ Keyword Mining 和 Deep Dive 流程清晰分离
- ✅ Agent 职责明确，无重复调用
- ✅ 代码结构清晰，易于维护

---

## 🔍 当前问题分析

### 1. 代码重复问题

**问题位置**:

- `api/_shared/gemini.ts` - `analyzeRankingProbability` 函数
- `api/seo-agent.ts` - Keyword Mining 和 Batch Translation 都调用
- `api/deep-dive-enhanced.ts` - Deep Dive 也调用相同函数

**重复调用**:

- `fetchSErankingData` - 在多个地方重复调用
- `fetchSerpResults` - 在多个地方重复调用
- `analyzeRankingProbability` - 在 Keyword Mining 和 Deep Dive 中都使用

### 2. 职责混淆问题

**当前状态**:

- Keyword Mining 使用 `analyzeRankingProbability` 做深度分析（应该只做快速筛选）
- Deep Dive 也使用 `analyzeRankingProbability`（应该使用 Agent 2 做深度研究）
- 两个流程使用相同的分析逻辑，但需求不同

### 3. 代码结构问题

**当前结构**:

```
api/
├── _shared/
│   ├── gemini.ts          # 包含所有AI函数（太长，职责不清）
│   ├── serp.ts            # SERP相关（可能未充分利用）
│   └── types.ts
├── seo-agent.ts           # 统一API，但逻辑复杂
└── deep-dive-enhanced.ts  # Deep Dive专用
```

**问题**:

- `gemini.ts` 文件过大，包含太多职责
- 工具函数和 Agent 函数混在一起
- 没有清晰的工具层抽象

---

## 🏗️ 新代码结构设计

### 目标结构

```
api/
├── _shared/
│   ├── agents/                    # Agent层（AI逻辑）
│   │   ├── agent-1-keyword-mining.ts      # Agent 1: 关键词挖掘
│   │   ├── agent-2-seo-researcher.ts      # Agent 2: SEO研究员
│   │   ├── agent-3-content-writer.ts      # Agent 3: 内容写手
│   │   ├── agent-4-quality-reviewer.ts   # Agent 4: 质量审查
│   │   ├── agent-5-image-creative.ts      # Agent 5: 图像创意
│   │   └── index.ts                      # Agent导出
│   │
│   ├── tools/                     # 工具层（数据获取，无AI）
│   │   ├── se-ranking.ts          # SE Ranking API封装
│   │   ├── serp-search.ts         # SERP搜索封装
│   │   ├── google-search-console.ts  # Google Search Console API封装
│   │   ├── firecrawl.ts           # Firecrawl API封装（已有）
│   │   └── index.ts                # 工具导出
│   │
│   ├── services/                   # 服务层（业务逻辑）
│   │   ├── keyword-mining-service.ts    # Keyword Mining服务
│   │   ├── deep-dive-service.ts         # Deep Dive服务
│   │   └── batch-analysis-service.ts    # Batch Analysis服务
│   │
│   ├── gemini.ts                  # Gemini API基础封装（保留，简化）
│   ├── types.ts                   # 类型定义
│   └── request-handler.ts         # 请求处理工具
│
├── agents/                        # Agent API端点
│   ├── keyword-mining.ts          # Keyword Mining API
│   ├── seo-researcher.ts          # SEO研究员API
│   ├── content-writer.ts          # 内容写手API
│   ├── quality-reviewer.ts        # 质量审查API
│   └── image-creative.ts          # 图像创意API
│
├── seo-agent.ts                   # 统一API（保留，但简化）
└── deep-dive-enhanced.ts          # Deep Dive API（重构）
```

### 关键设计原则

1. **工具层（Tools）** - 纯数据获取，无 AI 逻辑
2. **Agent 层（Agents）** - AI 逻辑，使用工具层获取数据
3. **服务层（Services）** - 业务流程编排，组合 Agent 和工具
4. **API 层（Endpoints）** - HTTP 接口，调用服务层

---

## 🔧 共享工具层设计

### 1. SE Ranking 工具

**文件**: `api/_shared/tools/se-ranking.ts`

```typescript
/**
 * SE Ranking API 工具
 * 职责：获取关键词的真实数据（搜索量、难度、CPC等）
 * 特点：纯数据获取，无AI逻辑
 */

export interface SERankingData {
  keyword: string;
  is_data_found: boolean;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  history_trend?: any;
}

/**
 * 批量获取SE Ranking数据
 */
export async function fetchSErankingData(
  keywords: string[],
  location: string = "us"
): Promise<SERankingData[]>;

/**
 * 获取单个关键词的SE Ranking数据
 */
export async function fetchSingleKeywordData(
  keyword: string,
  location: string = "us"
): Promise<SERankingData | null>;
```

### 2. SERP 搜索工具

**文件**: `api/_shared/tools/serp-search.ts`

```typescript
/**
 * SERP搜索工具
 * 职责：获取Google搜索结果
 * 特点：纯数据获取，无AI逻辑
 */

export interface SerpResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export interface SerpData {
  keyword: string;
  results: SerpResult[];
  totalResults: number;
}

/**
 * 获取SERP结果
 */
export async function fetchSerpResults(
  keyword: string,
  language: string = "en",
  location: string = "us"
): Promise<SerpData>;

/**
 * 批量获取SERP结果（带限流）
 */
export async function fetchSerpResultsBatch(
  keywords: string[],
  language: string = "en",
  location: string = "us"
): Promise<Map<string, SerpData>>;
```

### 3. Google Search Console 工具

**文件**: `api/_shared/tools/google-search-console.ts`

```typescript
/**
 * Google Search Console API 工具
 * 职责：获取用户绑定网站的真实搜索表现数据
 * 特点：纯数据获取，无AI逻辑
 */

export interface SearchConsoleData {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number; // Click-through rate
  position: number; // Average position
  date: string;
}

export interface SearchConsoleQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * 获取网站的搜索查询数据
 * 用于追踪用户实际搜索的关键词和排名
 */
export async function fetchSearchConsoleQueries(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions?: string[] // ['query', 'page', 'country', etc.]
): Promise<SearchConsoleQuery[]>;

/**
 * 获取特定关键词的排名历史
 */
export async function fetchKeywordRankingHistory(
  siteUrl: string,
  keyword: string,
  startDate: string,
  endDate: string
): Promise<SearchConsoleData[]>;

/**
 * 获取网站的页面表现数据
 */
export async function fetchPagePerformance(
  siteUrl: string,
  pageUrl: string,
  startDate: string,
  endDate: string
): Promise<SearchConsoleData[]>;
```

### 4. Firecrawl 工具（已有，保持不变）

**文件**: `api/_shared/tools/firecrawl.ts`（从 `api/_shared/firecrawl.ts` 移动）

---

## 📦 Agent 层设计

### Agent 1: 关键词挖掘

**文件**: `api/_shared/agents/agent-1-keyword-mining.ts`

```typescript
/**
 * Agent 1: 关键词挖掘
 * 职责：生成关键词列表
 * 使用：Keyword Mining模式、Batch Analysis模式
 */

export async function generateKeywords(
  seedKeyword: string,
  targetLanguage: string,
  prompt: string
  // ... 其他参数
): Promise<KeywordData[]>;
```

### Agent 2: SEO 研究员

**文件**: `api/_shared/agents/agent-2-seo-researcher.ts`

```typescript
/**
 * Agent 2: SEO研究员
 * 职责：深度SEO研究（搜索引擎偏好、竞争对手分析）
 * 使用：Deep Dive模式 Step 1-5
 */

export async function analyzeSearchPreferences(
  keyword: string,
  language: string
): Promise<SearchPreferencesResult>;

export async function analyzeCompetitors(
  keyword: string,
  serpData: SerpData,
  language: string
): Promise<CompetitorAnalysisResult>;
```

### Agent 3-5: 内容写手、质量审查、图像创意

**文件**:

- `api/_shared/agents/agent-3-content-writer.ts`
- `api/_shared/agents/agent-4-quality-reviewer.ts`
- `api/_shared/agents/agent-5-image-creative.ts`

（使用已有的 prompt，实现 API 调用逻辑）

---

## 🔄 服务层设计

### Keyword Mining 服务

**文件**: `api/_shared/services/keyword-mining-service.ts`

```typescript
/**
 * Keyword Mining服务
 * 职责：编排Keyword Mining流程
 */

export async function executeKeywordMining(
  seedKeyword: string,
  options: KeywordMiningOptions
): Promise<KeywordMiningResult> {
  // 1. 调用Agent 1生成关键词
  // 2. 调用工具层获取SE Ranking数据
  // 3. 调用工具层获取SERP数据（可选）
  // 4. 调用快速排名分析工具（不做深度分析）
  // 5. 返回关键词列表
}
```

### Deep Dive 服务

**文件**: `api/_shared/services/deep-dive-service.ts`

```typescript
/**
 * Deep Dive服务
 * 职责：编排Deep Dive完整流程（8步）
 */

export async function executeDeepDive(
  keyword: KeywordData,
  options: DeepDiveOptions
): Promise<DeepDiveResult> {
  // Step 1-2: 调用Agent 2做SEO研究
  // Step 3-5: 调用Agent 2做内容优化建议
  // Step 6: 调用Agent 3生成内容
  // Step 7: 调用Agent 4质量审查
  // Step 8: 调用Agent 5生成图像（可选）
}
```

---

## 📋 详细任务拆分

### Phase 1: 共享工具层提取（3-4 天）

#### Task 1.1: 创建工具层目录结构

- [ ] 创建 `api/_shared/tools/` 目录
- [ ] 创建 `api/_shared/tools/index.ts` 导出文件
- [ ] 更新 `.gitignore`（如需要）

**预计时间**: 30 分钟

#### Task 1.2: 提取 SE Ranking 工具

- [ ] 从 `api/_shared/gemini.ts` 提取 `fetchSErankingData` 函数
- [ ] 创建 `api/_shared/tools/se-ranking.ts`
- [ ] 重构函数，添加类型定义
- [ ] 添加错误处理和重试机制
- [ ] 添加批量请求优化（限流）
- [ ] 更新所有调用点（使用新路径）

**预计时间**: 4 小时

**影响文件**:

- `api/_shared/gemini.ts` - 删除函数
- `api/seo-agent.ts` - 更新 import
- `api/deep-dive-enhanced.ts` - 更新 import
- `api/analyze-ranking.ts` - 更新 import

#### Task 1.3: 提取 SERP 搜索工具

- [ ] 从 `api/_shared/gemini.ts` 提取 `fetchSerpResults` 函数
- [ ] 创建 `api/_shared/tools/serp-search.ts`
- [ ] 重构函数，添加类型定义
- [ ] 添加批量请求功能（带限流）
- [ ] 添加缓存机制（可选）
- [ ] 更新所有调用点

**预计时间**: 3 小时

**影响文件**:

- `api/_shared/gemini.ts` - 删除函数
- `api/_shared/gemini.ts` - `analyzeRankingProbability` 函数更新
- `api/seo-agent.ts` - 更新 import

#### Task 1.4: 实现 Google Search Console 工具

- [ ] 创建 `api/_shared/tools/google-search-console.ts`
- [ ] 实现 OAuth 2.0 认证流程
- [ ] 实现 `fetchSearchConsoleQueries` 函数
- [ ] 实现 `fetchKeywordRankingHistory` 函数
- [ ] 实现 `fetchPagePerformance` 函数
- [ ] 添加错误处理和重试机制
- [ ] 添加数据缓存机制（避免频繁调用）

**预计时间**: 6 小时

**设计要点**:

- 需要用户授权 Google Search Console 访问权限
- 使用 Google Search Console API v1
- 支持按日期范围查询
- 支持按查询、页面、国家等维度筛选

#### Task 1.5: 移动 Firecrawl 工具

- [ ] 将 `api/_shared/firecrawl.ts` 移动到 `api/_shared/tools/firecrawl.ts`
- [ ] 更新所有 import 路径
- [ ] 确保功能正常

**预计时间**: 1 小时

**影响文件**:

- `api/_shared/firecrawl.ts` - 移动
- `api/scrape-website.ts` - 更新 import
- `api/website-data/*.ts` - 更新 import

#### Task 1.6: 更新工具层导出

**注意**: 移除快速排名分析工具的导出（已不需要）

- [ ] 更新 `api/_shared/tools/index.ts`
- [ ] 导出所有工具函数
- [ ] 添加文档注释

**预计时间**: 30 分钟

---

### Phase 2: Agent 层重构（4-5 天）

#### Task 2.1: 创建 Agent 层目录结构

- [ ] 创建 `api/_shared/agents/` 目录
- [ ] 创建 `api/_shared/agents/index.ts` 导出文件

**预计时间**: 30 分钟

#### Task 2.2: 重构 Agent 1（关键词挖掘）

- [ ] 从 `api/_shared/gemini.ts` 提取 `generateKeywords` 函数
- [ ] 创建 `api/_shared/agents/agent-1-keyword-mining.ts`
- [ ] 重构函数，使用工具层获取数据
- [ ] 添加类型定义和文档
- [ ] 更新所有调用点

**预计时间**: 3 小时

**影响文件**:

- `api/_shared/gemini.ts` - 删除函数
- `api/seo-agent.ts` - 更新 import
- `App.tsx` - 检查是否需要更新

#### Task 2.3: 实现 Agent 2（SEO 研究员）

- [ ] 创建 `api/_shared/agents/agent-2-seo-researcher.ts`
- [ ] 实现 `analyzeSearchPreferences` 函数
- [ ] 实现 `analyzeCompetitors` 函数
- [ ] 使用 `services/prompts/index.ts` 中的 prompt
- [ ] 调用工具层获取 SERP 数据
- [ ] 添加类型定义和文档

**预计时间**: 6 小时

**关键实现**:

- 使用 `getSEOResearcherPrompt('searchPreferences', language)`
- 使用 `getSEOResearcherPrompt('competitorAnalysis', language)`
- 调用 `fetchSerpResults` 获取数据
- 调用 Gemini API 生成分析结果

#### Task 2.4: 实现 Agent 3（内容写手）

- [ ] 创建 `api/_shared/agents/agent-3-content-writer.ts`
- [ ] 实现 `generateContent` 函数
- [ ] 使用 `getContentWriterPrompt` 获取 prompt
- [ ] 接收 SEO 研究结果作为输入
- [ ] 生成完整文章（Markdown 格式）

**预计时间**: 4 小时

#### Task 2.5: 实现 Agent 4（质量审查）

- [ ] 创建 `api/_shared/agents/agent-4-quality-reviewer.ts`
- [ ] 实现 `reviewQuality` 函数
- [ ] 使用 `getQualityReviewerPrompt` 获取 prompt
- [ ] 检查关键词密度、AI 检测、可读性等
- [ ] 返回质量评分和改进建议

**预计时间**: 4 小时

#### Task 2.6: 实现 Agent 5（图像创意）

- [ ] 创建 `api/_shared/agents/agent-5-image-creative.ts`
- [ ] 实现 `extractVisualThemes` 函数
- [ ] 实现 `generateImagePrompts` 函数
- [ ] 使用 `getImageCreativePrompt` 获取 prompt
- [ ] 集成 Nano Banana 2 API（如果已配置）

**预计时间**: 5 小时

#### Task 2.7: 更新 Agent 层导出

- [ ] 更新 `api/_shared/agents/index.ts`
- [ ] 导出所有 Agent 函数
- [ ] 添加文档注释

**预计时间**: 30 分钟

---

### Phase 3: 服务层实现（3-4 天）

#### Task 3.1: 创建服务层目录结构

- [ ] 创建 `api/_shared/services/` 目录
- [ ] 创建 `api/_shared/services/index.ts` 导出文件

**预计时间**: 30 分钟

#### Task 3.2: 实现 Keyword Mining 服务

- [ ] 创建 `api/_shared/services/keyword-mining-service.ts`
- [ ] 实现 `executeKeywordMining` 函数
- [ ] 编排流程：
  1. 调用 Agent 1 生成关键词
  2. 调用 SE Ranking 工具获取数据
  3. 调用 SERP 工具获取搜索结果（可选）
  4. 使用现有的 `analyzeRankingProbability` 做快速筛选（保持现有逻辑）
  5. 返回关键词列表
- [ ] 添加错误处理和日志

**预计时间**: 4 小时

**关键设计**:

- 保持现有的快速筛选逻辑（`analyzeRankingProbability`）
- 不使用深度分析（深度分析由 Agent 2 在 Deep Dive 中完成）
- 返回结果包含排名概率，基于快速分析

#### Task 3.3: 实现 Deep Dive 服务

- [ ] 创建 `api/_shared/services/deep-dive-service.ts`
- [ ] 实现 `executeDeepDive` 函数
- [ ] 编排 8 步流程：
  - Step 1-2: 调用 Agent 2 做 SEO 研究
  - Step 3-5: 调用 Agent 2 做内容优化建议
  - Step 6: 调用 Agent 3 生成内容
  - Step 7: 调用 Agent 4 质量审查
  - Step 8: 调用 Agent 5 生成图像（可选）
- [ ] 添加进度回调（用于前端显示）
- [ ] 添加错误处理和恢复机制

**预计时间**: 6 小时

**关键设计**:

- 不使用 `analyzeRankingProbability`（那是 Keyword Mining 用的）
- 使用 Agent 2 做深度 SEO 研究
- 支持步骤中断和恢复

#### Task 3.4: 实现 Batch Analysis 服务

- [ ] 创建 `api/_shared/services/batch-analysis-service.ts`
- [ ] 实现 `executeBatchAnalysis` 函数
- [ ] 编排批量翻译和分析流程
- [ ] 复用 Keyword Mining 服务的逻辑

**预计时间**: 3 小时

---

### Phase 4: API 端点重构（2-3 天）

#### Task 4.1: 重构 Keyword Mining API

- [ ] 更新 `api/seo-agent.ts` 中的 `handleKeywordMining` 函数
- [ ] 调用 `keyword-mining-service` 而不是直接调用函数
- [ ] 简化代码逻辑
- [ ] 保持 API 接口不变（向后兼容）

**预计时间**: 3 小时

#### Task 4.2: 重构 Deep Dive API

- [ ] 更新 `api/deep-dive-enhanced.ts`
- [ ] 调用 `deep-dive-service` 而不是直接调用函数
- [ ] 移除对 `analyzeRankingProbability` 的调用
- [ ] 使用 Agent 2 做深度研究
- [ ] 保持 API 接口不变（向后兼容）

**预计时间**: 4 小时

#### Task 4.3: 创建独立 Agent API 端点（可选）

- [ ] 创建 `api/agents/keyword-mining.ts`
- [ ] 创建 `api/agents/seo-researcher.ts`
- [ ] 创建 `api/agents/content-writer.ts`
- [ ] 创建 `api/agents/quality-reviewer.ts`
- [ ] 创建 `api/agents/image-creative.ts`

**预计时间**: 5 小时

**说明**: 这些是独立的 API 端点，允许前端直接调用单个 Agent（如果需要）

#### Task 4.4: 创建测试 Agent 模式（仅本地开发环境）

- [ ] 创建 `api/test-agents.ts` API 端点
- [ ] 仅在开发环境（`NODE_ENV !== 'production'`）下启用
- [ ] 创建假数据生成器 `api/_shared/test-data/mock-data-generator.ts`
- [ ] 为每个 Agent 提供假数据输入：
  - Agent 1 (关键词挖掘): 假关键词列表、假 SE Ranking 数据
  - Agent 2 (SEO 研究员): 假 SERP 数据、假搜索引擎偏好数据
  - Agent 3 (内容写手): 假 SEO 策略报告、假研究结果
  - Agent 4 (质量审查): 假内容数据
  - Agent 5 (图像创意): 假内容数据
- [ ] 支持单独测试每个 Agent
- [ ] 支持测试 Agent 组合流程
- [ ] 添加测试结果验证和日志输出
- [ ] 在前端 UI 中添加测试模式入口（仅开发环境显示）

**预计时间**: 6 小时

**设计要点**:

- **环境检查**: 使用 `process.env.NODE_ENV` 或 `process.env.VERCEL_ENV` 判断是否为生产环境
- **假数据设计**:
  - 提供真实的数据结构，但使用模拟数据
  - 覆盖各种边界情况（空数据、错误数据、正常数据）
  - 支持自定义假数据参数（如关键词数量、语言等）
- **测试接口设计**:
  - `POST /api/test-agents/agent-1` - 测试关键词挖掘
  - `POST /api/test-agents/agent-2` - 测试 SEO 研究员
  - `POST /api/test-agents/agent-3` - 测试内容写手
  - `POST /api/test-agents/agent-4` - 测试质量审查
  - `POST /api/test-agents/agent-5` - 测试图像创意
  - `POST /api/test-agents/full-flow` - 测试完整流程
- **安全考虑**:
  - 生产环境完全禁用
  - 添加开发环境标识检查
  - 不在日志中输出敏感信息

**说明**: 这个模式允许开发者在本地环境中快速测试所有 Agent，无需真实的 API 调用和数据，提高开发效率

---

### Phase 5: 清理和优化（1-2 天）

#### Task 5.1: 清理 `api/_shared/gemini.ts`

- [ ] 移除已提取的函数
- [ ] 保留 Gemini API 基础封装
- [ ] 更新文档注释
- [ ] 确保没有遗漏的引用

**预计时间**: 2 小时

#### Task 5.2: 更新类型定义

- [ ] 更新 `api/_shared/types.ts`
- [ ] 添加新工具和 Agent 的类型
- [ ] 确保类型一致性

**预计时间**: 2 小时

#### Task 5.3: 更新文档

- [ ] 更新 `services/prompts/README.md`
- [ ] 添加工具层使用文档
- [ ] 添加 Agent 层使用文档
- [ ] 添加服务层使用文档

**预计时间**: 3 小时

#### Task 5.4: 测试和修复

- [ ] 测试 Keyword Mining 流程
- [ ] 测试 Deep Dive 流程
- [ ] 测试 Batch Analysis 流程
- [ ] 修复发现的 bug
- [ ] 性能优化

**预计时间**: 4 小时

---

## 📅 实施顺序

### Week 1: 工具层提取

- **Day 1-2**: Task 1.1-1.3（SE Ranking、SERP 工具提取）
- **Day 3-4**: Task 1.4（Google Search Console 工具）
- **Day 5**: Task 1.5-1.6（Firecrawl 移动、导出更新、测试）

### Week 2: Agent 层重构

- **Day 1**: Task 2.1-2.2（Agent 1 重构）
- **Day 2-3**: Task 2.3（Agent 2 实现）
- **Day 4**: Task 2.4-2.5（Agent 3、4 实现）
- **Day 5**: Task 2.6-2.7（Agent 5 实现、导出更新）

### Week 3: 服务层和 API 重构

- **Day 1**: Task 3.1-3.2（Keyword Mining 服务）
- **Day 2**: Task 3.3（Deep Dive 服务）
- **Day 3**: Task 3.4（Batch Analysis 服务）
- **Day 4**: Task 4.1-4.2（API 端点重构）
- **Day 5**: Task 4.3（独立 Agent API，可选）、Task 4.4（测试 Agent 模式）

### Week 4: 清理和优化

- **Day 1**: Task 5.1-5.2（清理 gemini.ts、类型定义）
- **Day 2**: Task 5.3（文档更新）
- **Day 3-4**: Task 5.4（测试和修复）
- **Day 5**: 最终检查和优化

---

## ✅ 验收标准

### 工具层验收

- [ ] 所有工具函数独立，无 AI 逻辑
- [ ] 工具函数可复用，被多个地方调用
- [ ] 错误处理完善
- [ ] 类型定义完整

### Agent 层验收

- [ ] 每个 Agent 职责清晰，无重复
- [ ] Agent 使用工具层获取数据
- [ ] Agent 使用 prompt 目录中的配置
- [ ] 类型定义完整

### 服务层验收

- [ ] Keyword Mining 服务使用快速分析工具
- [ ] Deep Dive 服务使用 Agent 2 做深度研究
- [ ] 两个流程完全分离，无重复调用
- [ ] 错误处理和日志完善

### API 层验收

- [ ] API 接口向后兼容
- [ ] 代码逻辑简化，易维护
- [ ] 性能无下降（或更好）

### 测试 Agent 模式验收

- [ ] 仅在开发环境可见和可用
- [ ] 所有 Agent 都有对应的测试接口
- [ ] 假数据覆盖各种场景
- [ ] 测试结果可验证
- [ ] 生产环境完全禁用

---

## 🎯 关键优化点

### 1. 消除重复调用

- ✅ SE Ranking API 统一调用，结果缓存（可选）
- ✅ SERP Search 统一调用，结果缓存（可选）
- ✅ Google Search Console API 统一调用，结果缓存（可选）
- ✅ Keyword Mining 保持现有快速筛选逻辑

### 2. 职责清晰分离

- ✅ Keyword Mining：快速筛选，使用快速分析工具
- ✅ Deep Dive：深度研究，使用 Agent 2
- ✅ 两个流程完全独立，无交叉

### 3. 代码结构优化

- ✅ 工具层、Agent 层、服务层、API 层清晰分离
- ✅ 每个文件职责单一，易于维护
- ✅ 类型定义完整，TypeScript 友好

---

## 📝 注意事项

### 向后兼容

- 保持现有 API 接口不变
- 内部重构不影响外部调用
- 逐步迁移，不一次性替换

### 测试策略

- 每个 Phase 完成后进行测试
- 确保功能正常后再进行下一步
- 重点关注 Keyword Mining 和 Deep Dive 流程
- 使用测试 Agent 模式（Task 4.4）在本地开发环境中快速测试所有 Agent
- 测试 Agent 模式提供假数据，无需真实 API 调用，提高开发效率

### 性能考虑

- 工具层添加缓存机制（可选）
- 批量请求优化（限流、并发控制）
- 避免不必要的 API 调用

---

**准备开始实施吗？**
