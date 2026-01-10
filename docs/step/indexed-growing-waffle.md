# 4 种挖词模式运作逻辑分析

**视角**: 产品经理 & Programmatic SEO 专家
**日期**: 2026-01-06

---

## 核心发现：2×2 矩阵结构

实际是 **2 大模式 × 2 子模式 = 4 种工作流**：

```
┌─────────────────────────────────────────────────────────────┐
│                    主模式切换器                              │
│  [🔵 蓝海模式] ←→ [🟢 存量拓新模式]                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    子模式切换器                              │
│  [关键词挖掘] ←→ [跨市场洞察]                               │
└─────────────────────────────────────────────────────────────┘
```

**4 种组合工作流 + 1 种独立工作流**：

1. ✅ **蓝海模式 + 关键词挖掘** - 从零发现蓝海关键词
2. ✅ **蓝海模式 + 跨市场洞察** - 翻译关键词并分析跨市场机会 (支持搜索引擎维度)
3. ✅ **存量拓新 + 关键词挖掘** - 分析网站缺口发现新机会
4. ✅ **存量拓新 + 跨市场洞察** - 网站关键词的跨市场分析 (支持搜索引擎维度)
5. ✅ **存量拓新 + 关键词质量分析** - 评估现有关键词的好词坏词 (新增工作流)

**UI 代码位置**：

- **工作流 1-4**: 文章生成器的挖词界面
  - **主切换器** (App.tsx 8238-8271): `miningMode` = "blue-ocean" | "existing-website-audit"
  - **子切换器** (App.tsx 8276-8302): `activeTab` = "mining" | "batch"
- **工作流 5**: 网站数据仪表板
  - **入口**: `WebsiteDataDashboard` → "关键词情报" 视图
  - **组件**: `KeywordIntelligenceView.tsx`

---

## 工作流 1: 蓝海模式 + 关键词挖掘

**状态**: `miningMode="blue-ocean"` + `activeTab="mining"`

### 运作逻辑 (As-Is)

```
┌─────────────────────────────────────────────────────────────┐
│ 用户输入 (App.tsx 8309-8499)                                │
│  ├─ seedKeyword: "AI Pet Photos"                           │
│  ├─ targetLanguage: "en"                                    │
│  ├─ miningStrategy: "horizontal" | "vertical"               │
│  └─ 点击 "Start Mining"                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────���──────────────────────────────────────────────┐
│ startMining() (App.tsx 4863-5330)                          │
│  └─ POST /api/seo-agent (mode: keyword_mining)             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Round 1: 关键词生成 (api/seo-agent.ts → keyword-mining-service.ts) │
│                                                              │
│ Step 1: Agent 1 生成关键词                                   │
│  ├─ agent-1-keyword-mining.ts → generateKeywords()         │
│  ├─ Gemini API (KEYWORD_MINING_PROMPTS)                    │
│  ├─ Strategy: horizontal(横向) / vertical(纵向)             │
│  └─ 输出: 10-20个 KeywordData[] (无概率)                    │
│                                                              │
│ Step 2: DataForSEO 数据增强                                  │
│  ├─ dataforseo.ts → fetchKeywordData()                      │
│  ├─ 批量查询: volume, difficulty, cpc, competition          │
│  └─ 预筛选: difficulty > 40 → 标记 LOW                      │
│                                                              │
│ Step 3: Agent 2 分析排名概率                                 │
│  ├─ agent-2-seo-researcher.ts → analyzeRankingProbability()│
│  ├─ SERP API: 获取Top 10结果                                │
│  ├─ Gemini AI: 分析 topDomainType + probability            │
│  └─ 输出: 完整 KeywordData[] (含HIGH/MEDIUM/LOW)            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回前端 → KeywordTable 展示                                │
│  ├─ Probability 过滤器: ALL/HIGH/MEDIUM/LOW                 │
│  ├─ 排序: Volume/Difficulty/Probability                     │
│  └─ 展开行: 查看SERP snippets                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 循环挖掘 (App.tsx runMiningLoop 5642-6157)                 │
│                                                              │
│ Round 2-5:                                                   │
│  ├─ 使用已有关键词 + SCAMPER方法生成新词                     │
│  ├─ 避免重复 (传入 existingKeywords)                        │
│  └─ 重复 Step 1-3 流程                                      │
│                                                              │
│ 停止条件:                                                    │
│  ├─ HIGH词 >= 3                                             │
│  └─ 轮次 >= 5                                               │
└─────────────────────────────────────────────────────────────┘
```

## 工作流 2: 蓝海模式 + 跨市场洞察

**状态**: `miningMode="blue-ocean"` + `activeTab="batch"`

### 运作逻辑 (As-Is)

```
┌─────────────────────────────────────────────────────────────┐
│ 用户手动输入 (App.tsx 9658-9727)                            │
│  ├─ batchInput: "manus, nanobanana, openai" (逗号分隔)      │
│  ├─ targetLanguage: "zh"                                    │
│  └─ 点击 "Cross-Market Insights"                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ handleBatchAnalyze() (App.tsx 7146-7450)                   │
│  ├─ 预检查: Credits >= 20                                   │
│  ├─ 扣费: consumeCredits(20)                                │
│  └─ POST /api/batch-translate-analyze                      │
│      ├─ keywords: batchInput (原始关键词)                    │
│      └─ keywordsFromAudit: undefined (无网站数据)           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ API处理 - Mode A: 手动输入 (batch-translate-analyze.ts)     │
│                                                              │
│ Step 1: 批量翻译 (每批5个)                                   │
│  ├─ translateKeywordToTarget() → Gemini API                │
│  ├─ "manus" → "马努斯"                                      │
│  └─ 输出: { original, translated }                          │
│                                                              │
│ Step 2: 用户选择分析维度                                      │
│  ├─ targetLocation: "zh" (目标地区)                          │
│  ├─ targetSearchEngine: "google" | "baidu" | "bing" | "yandex" │
│  └─ 多维度组合: 地区 × 搜索引擎                              │
│                                                              │
│ Step 3: DataForSEO 获取目标市场数据 (按地区+搜索引擎)        │
│  ├─ fetchKeywordData(translatedKeywords, locationCode, lang, engine)│
│  ├─ locationCode: zh=2166(中国), en=2840(美国)              │
│  ├─ searchEngine: "google" | "baidu" | "bing" | "yandex"    │
│  ├─ 搜索引擎映射:                                            │
│  │   ├─ Google: 全球通用 (2840=美国, 2166=中国)             │
│  │   ├─ Baidu: 仅中国 (2166)                                │
│  │   ├─ Bing: 全球通用 (2840=美国, 2166=中国)               │
│  │   └─ Yandex: 俄罗斯/东欧 (2948=俄罗斯)                  │
│  └─ 返回: volume, difficulty, cpc, competition (特定引擎数据)│
│                                                              │
│ Step 4: 预筛选                                               │
│  └─ difficulty > 40 → 标记 LOW, 跳过分析                    │
│                                                              │
│ Step 5: Agent 2 分析排名概率 (按搜索引擎)                    │
│  ├─ analyzeRankingProbability(keyword, targetSearchEngine)  │
│  ├─ 不同搜索引擎的SERP特征:                                  │
│  │   ├─ Google: SGE、Featured Snippets、People Also Ask   │
│  │   ├─ Baidu: 百度知道、百度百科、百家号                   │
│  │   ├─ Bing: Web Answers、Related Searches                │
│  │   └─ Yandex: 本地化结果、Yandex Zen                      │
│  └─ 输出: probability (基于特定搜索引擎的竞争分析)            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回前端 → KeywordTable 展示                                │
│  ├─ Keyword列: 翻译后词 (如 "马努斯")                       │
│  ├─ Translation列: 原始词 (如 "manus")                      │
│  ├─ Volume, Difficulty, Probability (目标市场数据)          │
│  └─ 支持导出CSV                                             │
└─────────────────────────────────────────────────────────────┘
```

## 工作流 3: 存量拓新 + 关键词挖掘

**状态**: `miningMode="existing-website-audit"` + `activeTab="mining"`

### 运作逻辑 (As-Is)

```
┌─────────────────────────────────────────────────────────────┐
│ 用户选择网站 (App.tsx 8504-8859)                            │
│  ├─ WebsiteSelector dropdown                                │
│  ├─ 自动加载: GET /api/websites/list                        │
│  └─ 点击 "Start Website Audit"                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ startWebsiteAudit() (App.tsx 4954-5330)                    │
│  └─ POST /api/website-audit                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 网站审计分析 (api/website-audit.ts)                         │
│                                                              │
│ Step 1: Firecrawl 抓取网站内容                               │
│  ├─ firecrawl.ts → scrapeWebsite(websiteUrl)               │
│  ├─ 返回: Markdown格式的网站内容                             │
│  └─ 失败处理: 使用URL+Domain继续                            │
│                                                              │
│ Step 2: DataForSEO 获取竞争对手数据                          │
│  ├─ dataforseo-domain.ts                                    │
│  ├─ getDomainCompetitors(domain) → 前3个竞争对手            │
│  ├─ getDomainKeywords(competitorDomain) → 每个50关键词       │
│  └─ 聚合: competitorKeywords[] (最多150关键词)               │
│                                                              │
│ Step 3: Agent 1 分析网站缺口                                 │
│  ├─ agent-1-website-audit.ts → auditWebsiteForKeywords()   │
│  ├─ Prompt: EXISTING_WEBSITE_AUDIT_PROMPTS                 │
│  ├─ 输入: websiteContent + competitorKeywords + industry    │
│  ├─ AI任务:                                                  │
│  │   ├─ 分析网站当前主题覆盖                                 │
│  │   ├─ 对比竞争对手关键词                                   │
│  │   └─ 识别高转化长尾词缺口                                 │
│  └─ 输出: KeywordData[] (source: 'website-audit')           │
│                                                              │
│ Step 4: DR值计算与权威性评估                                 │
│  ├─ 获取网站DR值 (Domain Rating)                            │
│  │   ├─ 数据源: DataForSEO / Ahrefs API                     │
│  │   ├─ 计算网站权威值 (Authority Score)                     │
│  │   └─ 存储: websiteDR, websiteAuthority                   │
│  └─ 用于后续"大鱼吃小鱼"判断                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Agent 2 排名概率分析 (增强版 - 存量拓新模式)                 │
│                                                              │
│ Step 1: SERP分析 - 获取Top 10结果                            │
│  ├─ agent-2-seo-researcher.ts → analyzeRankingProbability()│
│  ├─ SERP API: 获取Top 10搜索结果                            │
│  └─ 提取: 每个结果的domain, title, snippet                  │
│                                                              │
│ Step 2: "大鱼吃小鱼"判断逻辑                                  │
│  ├─ 计算竞争对手DR值                                         │
│  │   ├─ 获取Top 10中每个域名的DR值                           │
│  │   └─ competitorDRs[] = [DR1, DR2, ..., DR10]            │
│  │                                                           │
│  ├─ 权威值对比                                               │
│  │   ├─ 如果 websiteDR > competitorDRs[i]                   │
│  │   │   └─ 标记: "可以吃掉" (canOutrank)                   │
│  │   └─ 如果 websiteDR >= competitorDRs[i] + 5              │
│  │       └─ 标记: "高概率吃掉" (highConfidence)             │
│  │                                                           │
│  ├─ 相关性评估                                               │
│  │   ├─ AI分析: 网站内容 vs 竞争对手内容                     │
│  │   ├─ 如果相关性更强 (relevanceScore > 0.7)               │
│  │   └─ 即使DR略低，也能排在前面                             │
│  │                                                           │
│  └─ 综合判断                                                 │
│      ├─ 能吃掉前面网页的条件:                                │
│      │   ├─ websiteDR > competitorDR (权威优势)              │
│      │   └─ 或 relevanceScore > 0.7 (相关性优势)            │
│      └─ 输出: canOutrankPositions[] (可超越的位置列表)      │
│                                                              │
│ Step 3: Top 3 vs Top 10 概率区分                             │
│  ├─ Top 3 概率计算                                           │
│  │   ├─ 条件: 能吃掉前3个中的至少1个                         │
│  │   ├─ 且 websiteDR >= Top3平均DR - 3                      │
│  │   └─ 输出: top3Probability (HIGH/MEDIUM/LOW)             │
│  │                                                           │
│  ├─ Top 10 概率计算                                          │
│  │   ├─ 条件: 能吃掉Top 10中的至少3个                        │
│  │   ├─ 或 websiteDR >= Top10平均DR                          │
│  │   └─ 输出: top10Probability (HIGH/MEDIUM/LOW)            │
│  │                                                           │
│  └─ 最终概率判断                                             │
│      ├─ 如果 top3Probability = HIGH                          │
│      │   └─ probability = "HIGH (Top 3)"                    │
│      ├─ 如果 top10Probability = HIGH && top3Probability < HIGH│
│      │   └─ probability = "HIGH (Top 10)"                    │
│      └─ 否则: probability = MEDIUM/LOW                       │
│                                                              │
│ Step 4: 输出增强的KeywordData                                │
│  ├─ 基础字段: volume, difficulty, cpc                       │
│  ├─ 概率字段: probability (HIGH/MEDIUM/LOW)                 │
│  ├─ 新增字段:                                                │
│  │   ├─ top3Probability: "HIGH" | "MEDIUM" | "LOW"          │
│  │   ├─ top10Probability: "HIGH" | "MEDIUM" | "LOW"         │
│  │   ├─ canOutrankPositions: number[] (可超越的位置)        │
│  │   ├─ websiteDR: number (网站DR值)                        │
│  │   └─ competitorDRs: number[] (Top 10竞争对手DR值)        │
│  └─ 输出: 完整 KeywordData[] (含概率分级)                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回前端 → KeywordTable 展示 (增强版)                        │
│  ├─ Probability 过滤器: ALL/HIGH/MEDIUM/LOW                 │
│  ├─ 新增过滤器: Top 3 / Top 10                              │
│  ├─ 排序: Volume/Difficulty/Probability/Top3Probability     │
│  ├─ 展开行: 显示详细信息                                     │
│  │   ├─ SERP snippets                                       │
│  │   ├─ DR值对比 (网站 vs 竞争对手)                          │
│  │   ├─ 可超越位置标记                                       │
│  │   └─ Top 3 vs Top 10 概率分析                            │
│  └─ 视觉标记:                                                │
│      ├─ 🟢 HIGH (Top 3) - 高概率排前三                       │
│      ├─ 🟡 HIGH (Top 10) - 高概率排首页                      │
│      └─ 🔴 MEDIUM/LOW - 需要更多优化                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 循环挖掘 (App.tsx 5845-6113)                                │
│  ├─ 使用网站审计关键词作为种子                               │
│  ├─ Round 2+: 调用 /api/seo-agent (keyword_mining)         │
│  │   └─ 与工作流1相同的流程 (但使用存量拓新增强分析)         │
│  ├─ 停止条件: HIGH>=3 或 轮次>=5                            │
│  └─ 聚合结果 → KeywordTable展示                             │
└─────────────────────────────────────────────────────────────┘
```

## 工作流 4: 存量拓新 + 跨市场洞察

**状态**: `miningMode="existing-website-audit"` + `activeTab="batch"`

### 运作逻辑 (As-Is)

```
┌─────────────────────────────────────────────────────────────┐
│ 用户选择网站 (App.tsx 9476-9657)                            │
│  ├─ batchSelectedWebsite: 从下拉列表选择                     │
│  ├─ targetLanguage: "zh"                                    │
│  └─ 点击 "Cross-Market Insights"                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ handleBatchAnalyze() (App.tsx 7146-7450)                   │
│                                                              │
│ Step 1: 先获取网站关键词                                     │
│  ├─ GET /api/website-data/keywords-only                     │
│  │   ├─ websiteId, targetLanguage                           │
│  │   └─ 返回: 前20个关键词 (已是目标语言)                    │
│  └─ 存储到 keywordsFromAudit[]                              │
│                                                              │
│ Step 2: 调用批量分析                                         │
│  └─ POST /api/batch-translate-analyze                      │
│      ├─ keywordsFromAudit: [20个关键词]                      │
│      └─ keywords: undefined (无手动输入)                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ API处理 - Mode B: 从网站获取 (batch-translate-analyze.ts)   │
│                                                              │
│ Step 1: 跳过翻译                                             │
│  ├─ source = 'website-audit'                                │
│  ├─ keywordsForAnalysis = keywordsFromAudit.map(...)       │
│  └─ translation = keyword (相同，无翻译)                     │
│                                                              │
│ Step 2: 用户选择分析维度                                      │
│  ├─ targetLocation: "zh" (目标地区)                          │
│  ├─ targetSearchEngine: "google" | "baidu" | "bing" | "yandex" │
│  └─ 多维度组合: 地区 × 搜索引擎                              │
│                                                              │
│ Step 3: DataForSEO 获取目标市场数据 (按地区+搜索引擎)        │
│  └─ (与工作流2相同，支持搜索引擎维度)                          │
│                                                              │
│ Step 4: 预筛选 + Agent 2分析 (按搜索引擎)                     │
│  └─ (与工作流2相同，支持搜索引擎维度)                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回前端 → KeywordTable 展示                                │
│  ├─ Keyword列: 关键词 (如 "生酮饮食")                       │
│  ├─ Translation列: 与Keyword相同 (无翻译)                   │
│  ├─ source: 'website-audit' (标记来源)                      │
│  ├─ SearchEngine列: 目标搜索引擎 (如 "Google", "Baidu")      │
│  ├─ Location列: 目标地区 (如 "中国", "美国")                │
│  └─ Volume, Difficulty, Probability (特定引擎+地区数据)     │
└─────────────────────────────────────────────────────────────┘
```

## 工作流 5: 关键词质量分析 (好词坏词评估)

**状态**: 新增独立工作流 - 基于现有关键词的质量评估

**参考功能**: `KeywordIntelligenceView` (关键词情报功能)

### 运作逻辑 (To-Be)

```
┌─────────────────────────────────────────────────────────────┐
│ 用户选择网站 (WebsiteDataDashboard)                          │
│  ├─ websiteId: 从下拉列表选择                                 │
│  ├─ 切换到 "关键词情报" 视图                                  │
│  └─ 点击 "分析关键词机会"                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ POST /api/website-data/analyze-keyword-recommendations       │
│  ├─ websiteId: 网站ID                                        │
│  ├─ topN: 10 (分析前N个关键词)                                │
│  └─ userId: 用户ID                                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: 获取网站排名关键词                                    │
│  ├─ 查询数据库: domain_keywords 表                           │
│  ├─ 筛选条件: websiteId, 按排名排序                          │
│  ├─ 返回: 前10个关键词及其数据                                │
│  └─ 数据字段: keyword, msv, kd, cpc, intent, current_rank   │
│                                                              │
│ Step 2: AI分析关键词质量 (Gemini API)                        │
│  ├─ 输入: 10个关键词的完整数据 (MSV, KD, CPC, Intent等)      │
│  ├─ Prompt: EXISTING_KEYWORD_ANALYSIS_PROMPTS               │
│  ├─ AI任务:                                                  │
│  │   ├─ 分析每个关键词的商业价值                              │
│  │   ├─ 评估竞争难度和排名潜力                                │
│  │   ├─ 识别搜索意图匹配度                                    │
│  │   ├─ 计算推荐指数 (1-5星)                                 │
│  │   └─ 分类: 好词/坏词/中性词                               │
│  └─ 输出: KeywordRecommendationReport (JSON)                │
│                                                              │
│ Step 3: 关键词分类与优先级排序                                │
│  ├─ 优先级1 (最值得投入):                                    │
│  │   ├─ 低难度 (KD <= 30)                                    │
│  │   ├─ 高价值 (MSV >= 500)                                  │
│  │   ├─ 商业意图匹配                                          │
│  │   └─ 推荐指数 >= 4                                        │
│  │                                                           │
│  ├─ 优先级2 (值得布局):                                       │
│  │   ├─ 中等难度 (30 < KD <= 50)                             │
│  │   ├─ 中等价值 (100 <= MSV < 500)                          │
│  │   ├─ 意图匹配良好                                          │
│  │   └─ 推荐指数 = 3                                         │
│  │                                                           │
│  ├─ 优先级3 (战略储备):                                       │
│  │   ├─ 高难度但长期价值 (KD > 50, MSV高)                    │
│  │   ├─ 品牌相关词                                            │
│  │   └─ 推荐指数 = 2                                         │
│  │                                                           │
│  └─ 不推荐清单 (坏词):                                       │
│      ├─ 意图不匹配 (如: 信息型词用于商业网站)                 │
│      ├─ 竞争过大 (KD > 70, 且无竞争优势)                      │
│      ├─ 搜索量过低 (MSV < 50)                                │
│      └─ 推荐指数 = 1                                         │
│                                                              │
│ Step 4: 生成优化建议                                          │
│  ├─ 好词建议:                                                 │
│  │   ├─ 内容类型 (如: "产品对比文章", "购买指南")            │
│  │   ├─ 建议字数 (如: "2000-3000字")                         │
│  │   ├─ 差异化策略 (如: "添加实际案例", "包含价格对比")      │
│  │   └─ 预期效果 (如: "3个月内排到Top 10")                   │
│  │                                                           │
│  └─ 坏词建议:                                                 │
│      ├─ 不推荐原因 (如: "意图不匹配", "竞争过大")             │
│      └─ 替代方案 (如: "建议使用长尾词变体")                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回前端 → KeywordIntelligenceView 展示                      │
│                                                              │
│ UI组件:                                                      │
│  ├─ 执行摘要 (Executive Summary)                             │
│  │   ├─ Top 5 关键词列表                                      │
│  │   ├─ 整体机会评级 (High/Medium/Low)                       │
│  │   ├─ 高价值关键词数量                                      │
│  │   └─ 平均难度 (KD)                                        │
│  │                                                           │
│  ├─ 关键词推荐列表 (按优先级分组)                             │
│  │   ├─ 优先级1: 最值得投入 (绿色标记)                        │
│  │   ├─ 优先级2: 值得布局 (黄色标记)                          │
│  │   ├─ 优先级3: 战略储备 (蓝色标记)                          │
│  │   └─ 不推荐清单: 坏词 (红色标记)                          │
│  │                                                           │
│  ├─ 关键词详情卡片                                            │
│  │   ├─ 关键词名称                                            │
│  │   ├─ 核心数据: MSV, KD, CPC, Intent                      │
│  │   ├─ 推荐指数: 1-5星 (竖条显示)                           │
│  │   ├─ SERP机会: AI Overview, Featured Snippet标记         │
│  │   ├─ 内容策略: 内容类型、建议字数                          │
│  │   ├─ 优势差异化: 具体优化建议                              │
│  │   └─ 预期效果: 排名潜力、流量预估                          │
│  │                                                           │
│  └─ 操作按钮                                                  │
│      ├─ "生成文章" (针对好词)                                 │
│      ├─ "导出CSV" (导出所有分析结果)                          │
│      └─ "全部部署" (批量生成文章)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5 种工作流差异对比

| 维度               | 工作流 1       | 工作流 2                     | 工作流 3           | 工作流 4                     | 工作流 5                                          |
| ------------------ | -------------- | ---------------------------- | ------------------ | ---------------------------- | ------------------------------------------------- |
| **主模式**         | 蓝海           | 蓝海                         | 存量拓新           | 存量拓新                     | 存量拓新                                          |
| **子模式**         | 挖掘           | 跨市场                       | 挖掘               | 跨市场                       | 质量分析                                          |
| **输入源**         | 种子词         | 手动输入                     | 网站               | 网站                         | 网站现有关键词                                    |
| **UI 入口**        | 挖词界面       | 挖词界面                     | 挖词界面           | 挖词界面                     | 网站数据仪表板                                    |
| **需翻译**         | ❌             | ✅                           | ❌                 | ❌                           | ❌                                                |
| **搜索引擎维度**   | ❌             | ✅ (新增)                    | ❌                 | ✅ (新增)                    | ❌                                                |
| **数据来源**       | Gemini AI 生成 | 手动输入                     | Firecrawl+竞争对手 | 网站关键词 API               | 网站关键词数据库                                  |
| **核心 API**       | /api/seo-agent | /api/batch-translate-analyze | /api/website-audit | /api/batch-translate-analyze | /api/website-data/analyze-keyword-recommendations |
| **循环挖掘**       | ✅ (SCAMPER)   | ❌                           | ✅ (基于缺口)      | ❌                           | ❌                                                |
| **Translation 列** | -              | 原始词                       | -                  | = Keyword                    | -                                                 |
| **输出类型**       | 新关键词列表   | 跨市场关键词                 | 新关键词列表       | 跨市场关键词                 | 好词/坏词分类                                     |
| **核心价值**       | 发现蓝海机会   | 跨市场机会                   | 网站缺口分析       | 跨市场分析                   | 关键词质量评估                                    |

---

## 关键产品洞察

### 1. 2×2 矩阵的优势

**为什么这个设计好？**

✅ **模式复用**: 跨市场洞察在两种主模式下都可用

- 蓝海模式: 翻译手动输入的关键词
- 存量拓新: 分析网站关键词的跨市场机会

✅ **用户路径清晰**:

- 先选主模式 (我有网站吗？)
- 再选子模式 (我要挖新词还是分析市场？)

✅ **代码复用**:

- `batch-translate-analyze.ts` 同时服务工作流 2 和 4
- `keyword-mining-service.ts` 同时服务工作流 1 和 3

## 总结

### 核心理解

这不是 4 个独立模式，而是：

- **2 个主模式** (蓝海 vs 存量拓新) - 起点不同
- **2 个子模式** (挖掘 vs 跨市场) - 目标不同
- **4 种组合工作流** (工作流 1-4) - 覆盖不同使用场景
- **1 种独立工作流** (工作流 5) - 评估现有关键词质量

**工作流分类**:

- **发现型工作流** (工作流 1-4): 专注于发现新的关键词机会
  - 工作流 1: 从种子词发现蓝海机会
  - 工作流 2: 跨市场发现机会
  - 工作流 3: 从网站缺口发现机会
  - 工作流 4: 从网站关键词跨市场发现机会
- **评估型工作流** (工作流 5): 专注于评估现有关键词质量
  - 识别好词和坏词
  - 提供优化建议

**文档版本**: v2.0 (修正版)
**最后更新**: 2026-01-06
**作者**: Claude (Product & PSEO Analysis)
