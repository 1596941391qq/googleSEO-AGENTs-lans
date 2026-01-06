# 4种挖词模式运作逻辑分析

**视角**: 产品经理 & Programmatic SEO 专家
**日期**: 2026-01-06

---

## 核心发现：2×2矩阵结构

实际是 **2大模式 × 2子模式 = 4种工作流**：

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

**4种组合工作流**：

1. ✅ **蓝海模式 + 关键词挖掘** - 从零发现蓝海关键词
2. ✅ **蓝海模式 + 跨市场洞察** - 翻译关键词并分析跨市场机会
3. ✅ **存量拓新 + 关键词挖掘** - 分析网站缺口发现新机会
4. ✅ **存量拓新 + 跨市场洞察** - 网站关键词的跨市场分析

**UI代码位置**：
- **主切换器** (App.tsx 8238-8271): `miningMode` = "blue-ocean" | "existing-website-audit"
- **子切换器** (App.tsx 8276-8302): `activeTab` = "mining" | "batch"

---

## 工作流1: 蓝海模式 + 关键词挖掘
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

### 核心特性

**SCAMPER 创意方法** (agent-1-keyword-mining.ts 149-155):
```
Prompt (Round 2+):
"Use the 'SCAMPER' method.
Example: If seed is 'AI Pet Photos', think:
- 'Pet ID Cards' (Combine)
- 'Fake Dog Passport' (Adapt)
- 'Cat Genealogy' (Modify)"
```

**双策略模式**:
- **Horizontal (横向)**: 探索不同主题 (如 dog food → pet accessories, pet training)
- **Vertical (纵向)**: 深挖同一主题 (如 dog food → grain-free dog food → senior dog nutrition)

**蓝海概率判断** (当前为AI黑盒):
- Agent 2 使用 Gemini 判断 → HIGH/MEDIUM/LOW
- ⚠️ **无显式评分算法** (改进建议见后)

### 关键缺失

1. **蓝海信号评分算法** - 当前依赖AI黑盒判断，无明确分数
2. **Firecrawl深度分析** - 仅在存量拓新使用，蓝海模式缺失

---

## 工作流2: 蓝海模式 + 跨市场洞察
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
│ Step 2: DataForSEO 获取目标市场数据                          │
│  ├─ fetchKeywordData(translatedKeywords, locationCode, lang)│
│  ├─ locationCode: zh=2166(中国), en=2840(美国)              │
│  └─ 返回: volume, difficulty, cpc, competition              │
│                                                              │
│ Step 3: 预筛选                                               │
│  └─ difficulty > 40 → 标记 LOW, 跳过分析                    │
│                                                              │
│ Step 4: Agent 2 分析排名概率                                 │
│  └─ analyzeRankingProbability() (与工作流1相同)             │
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

### 核心特性

**翻译处理**:
- 每批5个关键词并行翻译
- 使用 Gemini API 进行上下文感知翻译
- Translation列保留原始词供参考

**地域映射** (dataforseo.ts):
```typescript
const locationMapping = {
  'zh': 2166, // 中国
  'en': 2840, // 美国
  'ja': 2384, // 日本
  'ko': 2346, // 韩国
  // ... 更多市场
}
```

### 关键缺失

1. **跨市场对比** - 仅显示目标市场数据，无源市场对比
2. **文化差异分析** - 仅直译，未考虑本地术语偏好
3. **可视化** - 仅表格展示，无散点图/机会矩阵

---

## 工作流3: 存量拓新 + 关键词挖掘
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
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回前端 → 初始关键词展示                                    │
│  └─ 自动触发 runWebsiteAuditMiningLoop()                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 循环挖掘 (App.tsx 5845-6113)                                │
│  ├─ 使用网站审计关键词作为种子                               │
│  ├─ Round 2+: 调用 /api/seo-agent (keyword_mining)         │
│  │   └─ 与工作流1相同的流程                                  │
│  ├─ 停止条件: HIGH>=3 或 轮次>=5                            │
│  └─ 聚合结果 → KeywordTable展示                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心特性

**网站内容分析**:
- Firecrawl 抓取完整网站内容 (Markdown格式)
- 分析当前覆盖的主题和关键词

**竞争对手研究**:
- 自动获取前3个竞争对手
- 提取每个竞争对手的前50关键词
- AI对比分析内容缺口

**缺口识别逻辑** (EXISTING_WEBSITE_AUDIT_PROMPTS):
```
AI任务:
1. 分析网站已覆盖主题
2. 对比竞争对手关键词 (150个)
3. 识别流量缺口:
   - 高转化长尾词
   - 跨类别机会
   - 未利用的流量空间
```

### 关键缺失

1. **已排名关键词提取** - ❌ 不提取网站现有排名
2. **Quick Wins识别** - ❌ 无法识别位置11-30的优化机会
3. **内容优化建议** - ⚠️ 仅生成关键词，无具体优化动作

---

## 工作流4: 存量拓新 + 跨市场洞察
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
│ Step 2: DataForSEO 获取目标市场数据                          │
│  └─ (与工作流2相同)                                          │
│                                                              │
│ Step 3: 预��选 + Agent 2分析                                 │
│  └─ (与工作流2相同)                                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回前端 → KeywordTable 展示                                │
│  ├─ Keyword列: 关键词 (如 "生酮饮食")                       │
│  ├─ Translation列: 与Keyword相同 (无翻译)                   │
│  ├─ source: 'website-audit' (标记来源)                      │
│  └─ Volume, Difficulty, Probability (目标市场数据)          │
└─────────────────────────────────────────────────────────────┘
```

### 核心特性

**自动获取网站关键词**:
- 调用 `/api/website-data/keywords-only`
- 返回前20个关键词 (已经是目标语言)
- 跳过翻译步骤

**与工作流2的区别**:
```
工作流2 (手动输入):
  keywords: "manus, nanobanana"
  → 需要翻译 → "马努斯, 纳米香蕉"

工作流4 (网站获取):
  keywordsFromAudit: ["生酮饮食", "低碳水化合物"]
  → 跳过翻译 (已是目标语言)
```

### 关键缺失

与工作流2相同的缺失点

---

## 4种工作流差异对比

| 维度 | 工作流1 | 工作流2 | 工作流3 | 工作流4 |
|------|---------|---------|---------|---------|
| **主模式** | 蓝海 | 蓝海 | 存量拓新 | 存量拓新 |
| **子模式** | 挖掘 | 跨市场 | 挖掘 | 跨市场 |
| **输入源** | 种子词 | 手动输入 | 网站 | 网站 |
| **需翻译** | ❌ | ✅ | ❌ | ❌ |
| **数据来源** | Gemini AI生成 | 手动输入 | Firecrawl+竞争对手 | 网站关键词API |
| **核心API** | /api/seo-agent | /api/batch-translate-analyze | /api/website-audit | /api/batch-translate-analyze |
| **循环挖掘** | ✅ (SCAMPER) | ❌ | ✅ (基于缺口) | ❌ |
| **Translation列** | - | 原始词 | - | = Keyword |

---

## 改进优先级

### P0 - 立即改进 (核心缺失)

**1. 工作流1+3 (关键词挖掘) - 蓝海信号评分**
- 文件: `api/_shared/agents/agent-2-seo-researcher.ts`
- 功能: 新增 `calculateBlueOceanScore()` 函数
- 替代: AI黑盒判断 → 显式评分算法
- 评分规则:
  - 弱竞争者 (>5个低权重域名): +30
  - 内容不相关: +25
  - 低内容深度 (<800字): +20
  - 广告填充: +15
  - 过时内容 (>2年): +10
  - 总分 >= 70: HIGH, >= 40: MEDIUM, <40: LOW

**2. 工作流3 (存量拓新+挖掘) - 已排名关键词提取**
- 新文件: `api/website-data/ranked-keywords.ts`
- 功能: DataForSEO `ranked_keywords` API集成
- 分类输出:
  - Quick Wins (位置11-30, volume>=100, KD<50)
  - Long-term (位置31-50)
  - Top Rankings (位置1-10)
- UI展示:
  - 新增Quick Wins表格 (App.tsx)
  - 显示当前排名 + 优化建议

**3. 工作流2+4 (跨市场洞察) - 跨市场对比分析**
- 文件: `api/batch-translate-analyze.ts`
- 功能: 新增 `compareMarkets()` 函数
- 对比维度:
  - volumeDelta: 源市场 vs 目标市场搜索量差异
  - difficultyDelta: KD难度差异
  - opportunity: HIGH (volume>50% && KD<-10) / MEDIUM / LOW
- UI展示:
  - KeywordTable 新增 "Market Comparison" 列
  - 显示 Delta 值 (绿色/红色标记)

### P1 - 1个月内 (功能增强)

**4. 工作流3 (存量拓新) - 长尾挖掘**
- 新文件: `api/_shared/tools/google-suggestions.ts`
- 功能: Google Autocomplete + PAA API
- 集成点: website-audit.ts
- 输出: 从已排名词发现相关长尾词

**5. 工作流2+4 (跨市场) - 文化差异分析**
- 功能: `analyzeCulturalVariants()` 函数
- AI分析: 本地术语偏好、文化上下文
- 示例: "AI headshot" → "证件照" (中国) vs "就活写真" (日本)

**6. 工作流2+4 (跨市场) - 可视化**
- 新文件: `components/CrossMarketChart.tsx`
- 图表: 散点图 (X=volume, Y=difficulty, 颜色=opportunity)
- UI集成: Tabs (Table View / Chart View)

### P2 - 3个月内 (新功能)

**7. 数据库持久化** (影响所有工作流)
- 表结构:
  - workspaces (工作区管理)
  - mining_sessions (挖词会话)
  - mined_keywords (关键词结果)
  - market_analyses (跨市场分析)
- 替代: LocalStorage → PostgreSQL
- 好处: 跨设备访问、历史记录、多用户协作

---

## 关键产品洞察

### 1. 2×2矩阵的优势

**为什么这个设计好？**

✅ **模式复用**: 跨市场洞察在两种主模式下都可用
- 蓝海模式: 翻译手动输入的关键词
- 存量拓新: 分析网站关键词的跨市场机会

✅ **用户路径清晰**:
- 先选主模式 (我有网站吗？)
- 再选子模式 (我要挖新词还是分析市场？)

✅ **代码复用**:
- `batch-translate-analyze.ts` 同时服务工作流2和4
- `keyword-mining-service.ts` 同时服务工作流1和3

### 2. 当前实现的完整度

| 工作流 | 完整度 | 核心缺失 |
|-------|-------|---------|
| 工作流1 | 85% | 蓝海评分算法 |
| 工作流2 | 70% | 跨市场对比 |
| 工作流3 | 60% | 已排名关键词提取 |
| 工作流4 | 70% | 跨市场对比 |

**整体评估**: 基础功能完整，高级功能缺失

### 3. 改进后的用户价值

**工作流1 (蓝海+挖掘) 改进后**:
- ✅ 显式蓝海分数 (可解释性)
- ✅ MEDIUM词的深度洞察 (Firecrawl)
- 🎯 用户价值: 从 "AI说是蓝海" → "具体哪里是蓝海，为什么"

**工作流2+4 (跨市场洞察) 改进后**:
- ✅ 跨市场Delta对比 (一目了然)
- ✅ 文化差异变体 (本地化)
- 🎯 用户价值: 从 "目标市场有搜索量" → "比源市场高150%，竞争低17点"

**工作流3 (存量拓新+挖掘) 改进后**:
- ✅ Quick Wins识别 (立即见效)
- ✅ 具体优化建议 (可执行)
- 🎯 用户价值: 从 "发现新关键词" → "优化32个现有词可+2300流量"

---

## 总结

### 核心理解

这不是4个独立模式，而是：
- **2个主模式** (蓝海 vs 存量拓新) - 起点不同
- **2个子模式** (挖掘 vs 跨市场) - 目标不同
- **4种组合工作流** - 覆盖不同使用场景

### 当前状态

✅ **已实现**:
- 完整的UI切换逻辑 (2×2矩阵)
- 4种工作流的基础功能
- Agent系统 (Agent 1生成, Agent 2分析)
- DataForSEO数据集成

❌ **核心缺失**:
- 显式蓝海评分算法
- 已排名关键词提取
- 跨市场对比分析

### 实施建议

**快速见效** (P0改进):
1. 工作流1: 蓝海评分 (1天)
2. 工作流3: Quick Wins (2天)
3. 工作流2+4: 跨市场对比 (2天)

**累计影响**: 5天开发，覆盖所有4种工作流核心功能

---

**文档版本**: v2.0 (修正版)
**最后更新**: 2026-01-06
**作者**: Claude (Product & PSEO Analysis)
