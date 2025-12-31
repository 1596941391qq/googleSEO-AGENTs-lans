# 快速见效版实施计划 (Quick-Win Version)

> **优先实现简单、高价值功能，快速看到效果**
>
> 创建时间: 2026-01-01
> 策略: 从简单到复杂，每2-3天一个可见成果

---

## 📋 修订后的实施优先级

### ✅ 已确认决策
1. **任务队列**: Vercel Jobs
2. **图像存储**: Vercel Blob
3. **追踪系统**: ✅ 需要实现

### 🆕 新增需求（按实施顺序）

**快速见效功能** (Phase 2.0-2.2, 1-2周内可见):
1. ✨ 挖词前指导界面
2. 💬 AI夸赞功能（拍马匹）
3. 📝 Prompt配置指南
4. 🌐 网址挖词功能（Firecrawl）
5. 👁️ Agent过程可视化
6. 🔗 网站绑定与追踪

---

## 🚀 Phase 2.0: 快速增强 (1-2天)

> **目标**: 立即可见的用户体验提升

### Task 1: 挖词前指导界面 ⭐⭐⭐⭐⭐
**优先级**: 最高 | **难度**: 简单 | **时间**: 2-3小时

#### 功能描述
在用户开始挖词前，提供一个友好的引导界面，让用户选择行业/范围，AI会根据行业提供针对性的建议。

#### UI设计
```
┌─────────────────────────────────────────────┐
│  开始新的关键词挖掘                          │
├─────────────────────────────────────────────┤
│                                             │
│  🎯 第一步：选择您的行业                     │
│  ┌─────────────────────────────────────┐   │
│  │ □ AI & 机器学习                      │   │
│  │ □ 电子商务 / DTC品牌                 │   │
│  │ □ SaaS / 软件服务                    │   │
│  │ □ 金融科技                           │   │
│  │ □ 健康与医疗                         │   │
│  │ □ 教育与培训                         │   │
│  │ □ 旅游与酒店                         │   │
│  │ □ B2B 营销与咨询                     │   │
│  │ □ 内容创作者 / 博客                  │   │
│  │ □ 其他 (请输入) ___________________  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  💡 AI建议：                                 │
│  基于您的行业，我们将重点关注...             │
│  [行业特定的关键词策略提示]                  │
│                                             │
│  🌍 目标市场：                               │
│  [语言选择] [地区选择]                       │
│                                             │
│           [开始挖掘] [稍后开始]              │
└─────────────────────────────────────────────┘
```

#### 实现文件
```typescript
// 新增文件
components/workflow/KeywordMiningGuide.tsx

// 使用位置
App.tsx - 在挖词输入前显示此组件
```

#### 代码框架
```typescript
// components/workflow/KeywordMiningGuide.tsx
import { useState } from 'react';
import { Target, Lightbulb, Globe, ChevronRight } from 'lucide-react';

interface MiningGuideProps {
  onStart: (config: MiningConfig) => void;
  onCancel: () => void;
}

interface MiningConfig {
  industry: string;
  targetMarket: {
    language: string;
    region: string;
  };
}

const INDUSTRIES = [
  { id: 'ai', label: 'AI & 机器学习', icon: '🤖' },
  { id: 'ecommerce', label: '电子商务 / DTC品牌', icon: '🛍️' },
  { id: 'saas', label: 'SaaS / 软件服务', icon: '💻' },
  { id: 'fintech', label: '金融科技', icon: '💰' },
  { id: 'health', label: '健康与医疗', icon: '🏥' },
  { id: 'education', label: '教育与培训', icon: '📚' },
  { id: 'travel', label: '旅游与酒店', icon: '✈️' },
  { id: 'b2b', label: 'B2B 营销与咨询', icon: '🤝' },
  { id: 'content', label: '内容创作者 / 博客', icon: '✍️' },
];

const INDUSTRY_ADVICE: Record<string, string> = {
  ai: "AI行业关键词策略：关注技术趋势词（如'GPT-4应用'）、痛点词（如'AI落地困难'）、竞品对比词。建议先挖掘长尾问题型关键词。",
  ecommerce: "电商行业关键词策略：关注产品词+修饰词（如'环保咖啡杯'）、购买意图词（如'哪里买'）、评价对比词。",
  saas: "SaaS行业关键词策略：关注功能词（如'项目管理工具'）、替代方案词（如'Trello替代'）、集成词（如'Notion与Slack集成'）。",
  // ... 其他行业建议
};

export function KeywordMiningGuide({ onStart, onCancel }: MiningGuideProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');
  const [customIndustry, setCustomIndustry] = useState<string>('');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [targetRegion, setTargetRegion] = useState<string>('us');

  const handleStart = () => {
    const industry = customIndustry || selectedIndustry;
    if (!industry) return;

    onStart({
      industry,
      targetMarket: {
        language: targetLanguage,
        region: targetRegion
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Target className="w-6 h-6 text-indigo-600" />
          开始新的关键词挖掘
        </h2>

        {/* 行业选择 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            🎯 第一步：选择您的行业
          </label>
          <div className="grid grid-cols-2 gap-3">
            {INDUSTRIES.map(ind => (
              <button
                key={ind.id}
                onClick={() => {
                  setSelectedIndustry(ind.id);
                  setCustomIndustry('');
                }}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedIndustry === ind.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl mr-2">{ind.icon}</span>
                {ind.label}
              </button>
            ))}
          </div>

          {/* 其他行业输入 */}
          {selectedIndustry === '' && (
            <input
              type="text"
              placeholder="或输入其他行业..."
              value={customIndustry}
              onChange={(e) => {
                setCustomIndustry(e.target.value);
                setSelectedIndustry('');
              }}
              className="mt-3 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>

        {/* AI建议 */}
        {(selectedIndustry || customIndustry) && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">💡 AI行业建议</p>
                <p className="text-sm text-blue-800">
                  {INDUSTRY_ADVICE[selectedIndustry] ||
                   `很好！${customIndustry}是一个充满机会的行业。我们将帮您发现低竞争、高价值的关键词。建议关注行业痛点和用户问题类关键词。`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 目标市场 */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            🌍 目标市场
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">目标语言</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en">英语 (English)</option>
                <option value="fr">法语 (Français)</option>
                <option value="es">西班牙语 (Español)</option>
                <option value="ja">日语 (日本語)</option>
                <option value="ko">韩语 (한국어)</option>
                <option value="zh">中文 (中文)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">目标地区</label>
              <select
                value={targetRegion}
                onChange={(e) => setTargetRegion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="us">美国 (US)</option>
                <option value="uk">英国 (UK)</option>
                <option value="ca">加拿大 (CA)</option>
                <option value="au">澳大利亚 (AU)</option>
                <option value="sg">新加坡 (SG)</option>
                <option value="global">全球</option>
              </select>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleStart}
            disabled={!selectedIndustry && !customIndustry}
            className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            开始挖掘
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            稍后开始
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Prompt增强
```typescript
// services/gemini.ts - 在generateKeywords函数中
const generatePraise = (industry: string, userInput: string) => {
  const praiseTemplates = [
    `Excellent choice! ${industry} is a rapidly growing field with tremendous opportunities.`,
    `${industry}行业非常有前景！您选择的这个领域充满了创新机会。`,
    `Great industry focus! ${industry} has huge potential for growth and innovation.`,
    `非常有眼光！${industry}是当前最具活力的领域之一。`
  ];
  return praiseTemplates[Math.floor(Math.random() * praiseTemplates.length)];
};

// 在生成关键词时加入夸赞
export async function generateKeywords(
  seedKeyword: string,
  targetLanguage: string,
  systemInstruction: string,
  existingKeywords: string[] = [],
  roundIndex: number = 1,
  wordsPerRound: number = 10,
  miningStrategy: string = 'horizontal',
  userSuggestion: string = '',
  uiLanguage: string = 'en',
  industry?: string  // 新增参数
) {
  // ... 现有代码

  // 添加行业夸赞
  const enhancedSystemInstruction = industry
    ? `${systemInstruction}\n\nUser Industry: ${industry}\n${generatePraise(industry, seedKeyword)}`
    : systemInstruction;

  // ... 调用Gemini API
}
```

---

### Task 2: AI夸赞功能（拍马匹） ⭐⭐⭐⭐⭐
**优先级**: 最高 | **难度**: 简单 | **时间**: 1-2小时

#### 实现位置

**所有Agent的默认Prompt配置位置**:
```
services/prompts/
├── keyword-mining-prompts.ts        # 挖词prompts
├── website-analysis-prompts.ts      # 网站分析prompts
├── seo-researcher-prompts.ts        # SEO研究员prompts
├── content-writer-prompts.ts        # 内容写手prompts
├── quality-reviewer-prompts.ts      # 质量审查prompts
└── image-creative-prompts.ts        # 图像创意prompts
```

#### 创建夸赞Prompt库

```typescript
// services/prompts/praise-library.ts
/**
 * AI夸赞库 - 让AI更友善、更有鼓励性
 */

export interface PraiseContext {
  industry?: string;
  websiteUrl?: string;
  keyword?: string;
  userInputType: 'keyword' | 'website';
  language: 'zh' | 'en';
}

export function generatePraise(context: PraiseContext): string {
  const { industry, websiteUrl, keyword, userInputType, language } = context;

  // 根据输入类型生成夸赞
  if (userInputType === 'keyword') {
    return generateKeywordPraise(industry, keyword, language);
  } else {
    return generateWebsitePraise(websiteUrl, industry, language);
  }
}

function generateKeywordPraise(
  industry?: string,
  keyword?: string,
  language: 'zh' | 'en' = 'en'
): string {
  const basePraises = language === 'zh' ? [
    "非常好的关键词选择！这个词很有潜力。",
    "您选的这个关键词很棒，市场需求大且竞争适中。",
    "很有战略眼光！这是一个高价值关键词。",
    "太棒了！这个关键词精准地抓住了用户需求。",
  ] : [
    "Excellent keyword choice! This term has great potential.",
    "Great selection! This keyword has strong demand with manageable competition.",
    "Strategic thinking! This is a high-value keyword.",
    "Fantastic! You've identified a key user need with this keyword.",
  ];

  const industryPraises: Record<string, string[]> = {
    ai: language === 'zh' ? [
      "AI行业是未来！您选择的关键词非常前瞻。",
      "太有眼光了！AI领域充满机会，这个关键词会带来很好的流量。",
    ] : [
      "AI is the future! Your chosen keyword is very forward-looking.",
      "Great vision! The AI field is full of opportunities, this keyword will drive excellent traffic.",
    ],
    ecommerce: language === 'zh' ? [
      "电商关键词选得很精准！您对市场有深刻理解。",
      "这个商业关键词很有价值，您的产品策略很清晰。",
    ] : [
      "Precise e-commerce keyword selection! You have deep market understanding.",
      "This commercial keyword is valuable, your product strategy is very clear.",
    ],
    // ... 其他行业
  };

  if (industry && industryPraises[industry]) {
    const industryPraiseList = industryPraises[industry];
    return industryPraiseList[Math.floor(Math.random() * industryPraiseList.length)];
  }

  return basePraises[Math.floor(Math.random() * basePraises.length)];
}

function generateWebsitePraise(
  websiteUrl?: string,
  industry?: string,
  language: 'zh' | 'en' = 'en'
): string {
  const domain = websiteUrl ? new URL(websiteUrl).hostname : '';

  const basePraises = language === 'zh' ? [
    `您的网站 ${domain} 非常专业！设计简洁大方，内容质量很高。`,
    `看了${domain}，您的产品很有特色，SEO优化潜力巨大！`,
    "您的网站很有吸引力，用户留存一定会很高！",
    "网站内容很棒，我们已经发现了几个可以快速提升流量的机会。",
  ] : [
    `Your website ${domain} looks very professional! Clean design and high-quality content.`,
    `After reviewing ${domain}, your product is unique, and there's huge SEO potential!`,
    "Your website is very engaging, user retention will definitely be high!",
    "Great website content! We've already identified several quick-win opportunities for traffic growth.",
  ];

  const industryPraises: Record<string, string[]> = {
    ai: language === 'zh' ? [
      `您的AI产品很有创新性！网站技术深度和专业度都很好。`,
      "AI技术门槛高，但您的产品清晰地传达了核心价值，这对SEO非常有利。",
    ] : [
      "Your AI product is very innovative! Great technical depth and professionalism on the site.",
      "AI has high barriers, but your product clearly communicates core value, which is great for SEO.",
    ],
    ecommerce: language === 'zh' ? [
      "您的电商网站转化路径设计得很合理！产品描述也很吸引人。",
      "产品页面SEO基础很好，稍加优化就能大幅提升自然流量。",
    ] : [
      "Your e-commerce conversion path is well-designed! Product descriptions are very engaging.",
      "Product pages have good SEO fundamentals, small optimizations will significantly boost organic traffic.",
    ],
    // ... 其他行业
  };

  if (industry && industryPraises[industry]) {
    const industryPraiseList = industryPraises[industry];
    return industryPraiseList[Math.floor(Math.random() * industryPraiseList.length)];
  }

  return basePraises[Math.floor(Math.random() * basePraises.length)];
}

// 使用示例
export function enhancePromptWithPraise(
  basePrompt: string,
  context: PraiseContext
): string {
  const praise = generatePraise(context);

  return `${basePrompt}

---

**User Context Summary**: ${praise}

Remember: Be supportive and encouraging in your analysis. Highlight opportunities while being realistic about challenges.`;
}
```

#### 在现有代码中集成

```typescript
// api/generate-keywords.ts
import { enhancePromptWithPraise, PraiseContext } from '../services/prompts/praise-library';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ... 现有代码

  const { seedKeyword, industry, userInputType = 'keyword', websiteUrl } = body;

  // 创建夸赞上下文
  const praiseContext: PraiseContext = {
    industry,
    websiteUrl,
    keyword: seedKeyword,
    userInputType,
    language: body.uiLanguage || 'en'
  };

  // 增强prompt
  const enhancedSystemInstruction = enhancePromptWithPraise(
    systemInstruction || 'Generate high-potential SEO keywords.',
    praiseContext
  );

  // 使用增强后的prompt调用Gemini
  const keywords = await generateKeywords(
    seedKeyword,
    targetLanguage,
    enhancedSystemInstruction, // 使��增强版
    // ... 其他参数
  );

  // ... 返回结果
}
```

---

### Task 3: Prompt配置指南文档 ⭐⭐⭐⭐
**优先级**: 高 | **难度**: 简单 | **时间**: 1小时

#### 创建配置文档

```markdown
# PROMPTS_CONFIG_GUIDE.md

## Agent Prompt配置完整指南

### 📁 所有Prompt配置文件位置

```
services/prompts/
├── praise-library.ts              # 夸赞库（友善化AI）
├── keyword-mining-prompts.ts      # 挖词Agent prompts
├── website-analysis-prompts.ts    # 网站分析Agent prompts
├── seo-researcher-prompts.ts      # SEO研究员Agent prompts
├── content-writer-prompts.ts      # 内容写手Agent prompts
├── quality-reviewer-prompts.ts    # 质量审查Agent prompts
├── image-creative-prompts.ts      # 图像创意Agent prompts
└── README.md                      # 本文档
```

---

### 🔧 如何修改Prompt

#### 1. 挖词Prompt修改

**文件**: `services/prompts/keyword-mining-prompts.ts`

```typescript
export const KEYWORD_MINING_DEFAULT = {
  zh: `
你是一位经验丰富的SEO关键词专家。

## 你的任务
根据用户提供的种子关键词，生成10个高潜力SEO关键词。

## 评估标准
1. **搜索量**: 月搜索量 > 100
2. **竞争度**: 难度 < 50
3. **相关性**: 与种子关键词高度相关
4. **意图匹配**: 符合用户搜索意图

## 输出格式
返回JSON数组：
[
  {
    "keyword": "关键词",
    "translation": "翻译（如需要）",
    "intent": "informational/transactional/commercial/local",
    "volume": 估计月搜索量,
    "reasoning": "选择理由"
  }
]
`,
  en: `
You are an experienced SEO keyword expert.

## Your Task
Generate 10 high-potential SEO keywords based on the seed keyword.

## Evaluation Criteria
1. **Search Volume**: Monthly searches > 100
2. **Competition**: Difficulty < 50
3. **Relevance**: Highly relevant to seed keyword
4. **Intent Match**: Aligns with user search intent

## Output Format
Return JSON array:
[
  {
    "keyword": "keyword",
    "translation": "translation (if needed)",
    "intent": "informational/transactional/commercial/local",
    "volume": estimated monthly volume,
    "reasoning": "selection rationale"
  }
]
`
};

export function getKeywordMiningPrompt(
  language: 'zh' | 'en',
  industry?: string
): string {
  const basePrompt = language === 'zh' ? KEYWORD_MINING_DEFAULT.zh : KEYWORD_MINING_DEFAULT.en;

  // 如果有行业，添加行业特定指导
  if (industry) {
    return `${basePrompt}

## 用户行业
用户专注于：${industry}

请根据该行业特点，调整关键词策略：
- 关注行业痛点和问题
- 考虑行业特定的术语和表达
- 优先挖掘长尾问题型关键词
`;
  }

  return basePrompt;
}
```

**修改示例**：
```typescript
// 如果你想让AI更关注长尾关键词
export const KEYWORD_MINING_CUSTOM = {
  en: basePrompt + `

## 特殊要求
- 优先生成3个词以上的长尾关键词
- 关注问题型关键词（如 "how to", "best way to"）
- 每个关键词必须包含数字或具体描述
`
};
```

---

#### 2. SEO研究员Prompt修改

**文件**: `services/prompts/seo-researcher-prompts.ts`

```typescript
export const SEO_RESEARCHER_SYSTEM = {
  role: "SEO Research & Competitor Analysis Expert",
  version: "2.0",
  lastUpdated: "2026-01-01",
  prompts: {
    searchPreferences: `
你是一位搜索引擎优化专家，精通Google、ChatGPT、Claude、Perplexity的排名机制。

## 任务
分析关键词在不同搜索引擎的优化策略。

## 要求
1. 对比4个引擎的排名因素差异
2. 识别每个引擎的内容偏好
3. 提供针对性的优化建议

## 输出
JSON格式，包含每个引擎的：
- rankingFactors: 关键排名因素
- contentPreferences: 内容偏好
- optimizationStrategy: 优化策略
`,
    competitorAnalysis: `
... (competitor analysis prompt)
`
  }
};

// 修改示例：增加Bing搜索引擎
export function getEnhancedSEOResearcherPrompt(includeBing: boolean = false): string {
  let basePrompt = SEO_RESEARCHER_SYSTEM.prompts.searchPreferences;

  if (includeBing) {
    basePrompt += `

## 额外引擎：Bing
- rankingFactors: domain age, backlinks, on-page SEO
- contentPreferences: formal, well-structured, authoritative
- optimizationStrategy: focus on meta tags and schema markup
`;
  }

  return basePrompt;
}
```

---

#### 3. 所有Agent的Prompt配置速查表

| Agent | 文件位置 | 主要Prompt | 版本控制 |
|-------|---------|-----------|---------|
| 挖词Agent | `keyword-mining-prompts.ts` | `KEYWORD_MINING_DEFAULT` | v1.2 |
| 网站分析Agent | `website-analysis-prompts.ts` | `WEBSITE_ANALYSIS_DEFAULT` | v1.0 |
| SEO研究员 | `seo-researcher-prompts.ts` | `SEO_RESEARCHER_SYSTEM` | v2.0 |
| 内容写手 | `content-writer-prompts.ts` | `CONTENT_WRITER_SYSTEM` | v1.5 |
| 质量审查 | `quality-reviewer-prompts.ts` | `QUALITY_REVIEWER_SYSTEM` | v1.0 |
| 图像创意 | `image-creative-prompts.ts` | `IMAGE_CREATIVE_SYSTEM` | v1.0 |

---

### 🔄 Prompt版本控制建议

**方法1: 使用注释标记版本**
```typescript
/**
 * SEO研究员Prompt
 *
 * @version 2.0
 * @lastUpdated 2026-01-01
 * @changelog
 *   - 2.0: 增加了AI引擎优化分析
 *   - 1.9: 改进了竞争对手结构提取
 *   - 1.0: 初始版本
 */
export const SEO_RESEARCHER_PROMPT = `...`;
```

**方法2: 使用历史记录**
```typescript
export const PROMPT_HISTORY = {
  seoResearcher: {
    v2: `...当前版本...`,
    v1: `...历史版本...`,
  }
};
```

---

### ✏️ 快速修改流程

1. **找到对应的prompt文件**
   - 查看"Prompt配置速查表"
   - 在`services/prompts/`中找到文件

2. **修改prompt**
   - 直接编辑导出的prompt字符串
   - 保持模板语法一致（`${variable}`）

3. **测试修改**
   - 重启开发服务器
   - 在UI中测试新的prompt效果

4. **版本记录**
   - 更新`@version`注释
   - 在`@changelog`中记录改动

---

### 🎯 最佳实践

1. **保持prompt结构化**
   - 使用## 标记章节
   - 使用列表和项目符号
   - 明确输入输出格式

2. **使用占位符变量**
   ```typescript
   const prompt = `
   分析关键词：${keyword}
   行业：${industry}
   目标语言：${language}
   `;
   ```

3. **添加示例**
   ```typescript
   const prompt = `
   ## 输出示例
   {
     "keyword": "coffee shop marketing",
     "volume": 1200,
     "difficulty": 35
   }
   `;
   ```

4. **A/B测试不同prompt**
   ```typescript
   export const PROMPT_VARIANTS = {
     v1_conservative: `...`,
     v2_aggressive: `...`,
     v3_balanced: `...`,
   };
   ```

---

### 🔗 相关文件

- API实现: `api/agents/*.ts`
- Prompt使用: `services/gemini.ts`
- Prompt测试: `tests/prompts.test.ts`

---

**文档版本**: 1.0
**最后更新**: 2026-01-01
**维护者**: Development Team
```

---

## 🌐 Phase 2.1: 网站分析功能 (3-5天)

> **目标**: 用户可以输入网址，AI自动分析网站并推荐关键词

### Task 4: Firecrawl集成 ⭐⭐⭐⭐⭐
**优先级**: 高 | **难度**: 中等 | **时间**: 4-6小时

#### Firecrawl API文档

**官网**: https://www.firecrawl.dev
**文档**: https://docs.firecrawl.dev
**API Key**: https://www.firecrawl.dev/account

**功能**:
- `/scrape` - 抓取单个页面
- `/crawl` - 抓取整个网站
- `/search` - 搜索并抓取

#### 安装Firecrawl SDK

```bash
npm install @mendable/firecrawl-js
```

#### 创建Firecrawl服务

```typescript
// api/_shared/firecrawl.ts
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY,
});

export interface ScrapedWebsite {
  url: string;
  title: string;
  description: string;
  content: string;
  keywords: string[];
  industry: string;
  metadata: {
    author?: string;
    publishDate?: string;
    wordCount: number;
    language: string;
  };
}

/**
 * 抓取网站内容
 */
export async function scrapeWebsite(
  url: string,
  options: {
    includePaths?: string[];
    excludePaths?: string[];
    maxDepth?: number;
  } = {}
): Promise<ScrapedWebsite> {
  try {
    const scrapeResult = await firecrawl.scrape(url, {
      formats: ['markdown', 'html', 'extract'],
      onlyMainContent: true,
      ...options
    });

    if (!scrapeResult.success) {
      throw new Error(`Firecrawl scrape failed: ${scrapeResult.error}`);
    }

    // 分析提取的内容
    const metadata = scrapeResult.metadata;
    const content = scrapeResult.markdown || '';

    return {
      url,
      title: metadata.title || '',
      description: metadata.description || '',
      content,
      keywords: extractKeywords(content),
      industry: inferIndustry(content, metadata),
      metadata: {
        author: metadata.author,
        publishDate: metadata.publishedDate,
        wordCount: content.split(/\s+/).length,
        language: metadata.language || 'en',
      }
    };
  } catch (error) {
    console.error('Firecrawl error:', error);
    throw error;
  }
}

/**
 * 从内容中提取关键词
 */
function extractKeywords(content: string): string[] {
  // 简单的关键词提取（可以后续用AI增强）
  const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const frequency: Record<string, number> = {};

  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * 推断行业
 */
function inferIndustry(content: string, metadata: any): string {
  const text = content.toLowerCase();

  const industryKeywords: Record<string, string[]> = {
    ai: ['artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'gpt', 'llm'],
    ecommerce: ['shop', 'product', 'cart', 'checkout', 'shipping', 'order'],
    saas: ['software', 'platform', 'subscription', 'pricing plan', 'api', 'integration'],
    fintech: ['banking', 'finance', 'investment', 'trading', 'cryptocurrency', 'payment'],
    health: ['health', 'medical', 'wellness', 'treatment', 'doctor', 'clinic'],
    education: ['course', 'learn', 'training', 'tutorial', 'education', 'certification'],
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    const matchCount = keywords.filter(kw => text.includes(kw)).length;
    if (matchCount >= 3) return industry;
  }

  return 'other';
}

/**
 * 批量抓取网站多个页面
 */
export async function crawlWebsite(
  url: string,
  options: {
    limit?: number;
    maxDepth?: number;
  } = {}
): Promise<ScrapedWebsite[]> {
  const crawlResult = await firecrawl.crawl(url, {
    limit: options.limit || 10,
    maxDepth: options.maxDepth || 1,
    scrapeOptions: {
      formats: ['markdown'],
      onlyMainContent: true,
    }
  });

  // 等待爬取完成
  // 这里需要根据Firecrawl的实际API调整

  return []; // 返回爬取的页面列表
}
```

#### 创建网站分析API

```typescript
// api/analyze-website.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler';
import { scrapeWebsite } from './_shared/firecrawl';
import { generateKeywords } from './_shared/gemini';
import { enhancePromptWithPraise, PraiseContext } from '../services/prompts/praise-library';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseRequestBody(req);
    const { websiteUrl, targetLanguage = 'en', uiLanguage = 'en', skipCreditsCheck = false } = body;

    if (!websiteUrl) {
      return res.status(400).json({
        error: 'Missing required field: websiteUrl',
        message: 'Please provide a website URL to analyze'
      });
    }

    // Step 1: 抓取网站
    console.log('[Website Analysis] Scraping website:', websiteUrl);
    const websiteData = await scrapeWebsite(websiteUrl);

    // Step 2: AI夸赞
    const praiseContext: PraiseContext = {
      websiteUrl,
      industry: websiteData.industry,
      userInputType: 'website',
      language: uiLanguage === 'zh' ? 'zh' : 'en'
    };

    // Step 3: 分析网站并生成关键词建议
    const analysisPrompt = `你是一位SEO专家。请分析以下网站并推荐关键词：

网站URL: ${websiteData.url}
网站标题: ${websiteData.title}
网站描述: ${websiteData.description}
推断的行业: ${websiteData.industry}

网站内容摘要:
${websiteData.content.slice(0, 2000)}...

请推荐10个适合该网站优化的SEO关键词。

${enhancePromptWithPraise('', praiseContext)}`;

    const keywords = await generateKeywords(
      websiteData.title,
      targetLanguage,
      analysisPrompt,
      [],
      1,
      10,
      'horizontal',
      '',
      uiLanguage,
      websiteData.industry
    );

    return res.json({
      success: true,
      data: {
        website: websiteData,
        keywords,
        analysis: {
          industry: websiteData.industry,
          contentThemes: websiteData.keywords.slice(0, 10),
          seoOpportunities: [
            'Add meta descriptions to all pages',
            'Optimize images with alt text',
            'Create internal linking structure',
            'Publish long-form content regularly'
          ]
        }
      }
    });
  } catch (error: any) {
    console.error('Website analysis error:', error);
    return sendErrorResponse(res, error, 'Failed to analyze website');
  }
}
```

#### 添加环境变量

```env
# .env
FIRECRAWL_API_KEY=fc-your-api-key-here
```

#### 前端UI更新

```typescript
// App.tsx - 在挖词界面添加"输入网址"选项

const [miningInputMode, setMiningInputMode] = useState<'keyword' | 'website'>('keyword');
const [websiteUrl, setWebsiteUrl] = useState('');

// 在UI中添加切换按钮
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setMiningInputMode('keyword')}
    className={`px-4 py-2 rounded-lg ${miningInputMode === 'keyword' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
  >
    输入关键词
  </button>
  <button
    onClick={() => setMiningInputMode('website')}
    className={`px-4 py-2 rounded-lg ${miningInputMode === 'website' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
  >
    输入网址
  </button>
</div>

{miningInputMode === 'keyword' ? (
  // 现有关键词输入框
  <input ... />
) : (
  // 新增网址输入框
  <div>
    <label>输入您的网站地址</label>
    <input
      type="url"
      placeholder="https://example.com"
      value={websiteUrl}
      onChange={(e) => setWebsiteUrl(e.target.value)}
      className="w-full px-4 py-3 border border-gray-300 rounded-lg"
    />
    <p className="text-sm text-gray-500 mt-2">
      🔍 我们将分析您的网站并推荐最适合的关键词
    </p>
  </div>
)}

// 修改API调用
const handleMining = async () => {
  if (miningInputMode === 'keyword') {
    // 调用现有的挖词API
    await generateKeywords(seedKeyword, ...);
  } else {
    // 调用新的网站分析API
    const response = await fetch('/api/analyze-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteUrl,
        targetLanguage,
        uiLanguage
      })
    });
    // ... 处理响应
  }
};
```

---

## 👁️ Phase 2.2: Agent过程可视化 (2-3天)

> **目标**: 让用户看到AI工作的详细过程，增加趣味性

### Task 5: Agent过程展示UI ⭐⭐⭐⭐⭐
**优先级**: 高 | **难度**: 中等 | **时间**: 6-8小时

#### 设计思路

创建一个**实时Agent工作流展示**，类似GitHub Actions的步骤展示，但更生动有趣。

```
┌─────────────────────────────────────────────────────────┐
│  🤖 AI正在为您工作...                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 总体进度: ████████░░░░░░░░░ 40% (4/10 步骤)        │
│                                                         │
│  ✅ Step 1: 分析搜索引擎偏好                            │
│     └─ ✓ Google排名因素分析完成                        │
│     └─ ✓ ChatGPT引用模式识别完成                       │
│     └─ 用时: 12秒                                       │
│                                                         │
│  ✅ Step 2: 竞争对手分析                                │
│     └─ ✓ 抓取Top 10 SERP结果 (15个URL)                │
│     └─ ✓ 提取内容结构                                  │
│     └─ 📝 发现: 8/10竞争对手使用H2子标题               │
│     └─ 用时: 24秒                                       │
│                                                         │
│  🔄 Step 3: 关键词优化 (进行中...)                      │
│     └─ 🔄 正在分析关键词密度...                         │
│     │   💭 "我发现主关键词'coffee shop'应该出现在..."    │
│     └─ ⏳ 预计剩余: 8秒                                 │
│                                                         │
│  ⏳ Step 4: GEO优化                                     │
│  ⏳ Step 5: AIO优化                                     │
│  ⏳ Step 6: 内容生成                                    │
│  ⏳ Step 7: 质量检查                                    │
│  ⏳ Step 8: 图像生成                                    │
│                                                         │
│  💬 Agent想法:                                          │
│  "竞争对手分析显示，长篇内容(2000+字)排名前3的有7个。    │
│   我建议生成2500字的深度文章。"                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 实现组件

```typescript
// components/workflow/AgentWorkflowVisualizer.tsx
import { useState, useEffect } from 'react';
import {
  CheckCircle,
  Loader2,
  Clock,
  Lightbulb,
  ChevronDown,
  ChevronRight,
  Brain,
  Bot
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  substeps?: {
    name: string;
    status: 'pending' | 'running' | 'completed';
    thought?: string; // Agent的想法
  }[];
  insights?: string[]; // 发现/洞察
}

interface AgentWorkflowVisualizerProps {
  steps: WorkflowStep[];
  agentThoughts?: string[]; // Agent实时想法
  overallProgress: number; // 0-100
}

export function AgentWorkflowVisualizer({
  steps,
  agentThoughts = [],
  overallProgress
}: AgentWorkflowVisualizerProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [currentThought, setCurrentThought] = useState<string>('');

  useEffect(() => {
    if (agentThoughts.length > 0) {
      setCurrentThought(agentThoughts[agentThoughts.length - 1]);
    }
  }, [agentThoughts]);

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <CheckCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="w-6 h-6 text-indigo-600" />
          🤖 AI正在为您工作...
        </h3>
        <div className="text-sm text-gray-600">
          {steps.filter(s => s.status === 'completed').length} / {steps.length} 步骤完成
        </div>
      </div>

      {/* 总体进度条 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>📊 总体进度</span>
          <span>{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`border-2 rounded-lg overflow-hidden transition-all ${
              step.status === 'running' ? 'border-blue-300 bg-blue-50' :
              step.status === 'completed' ? 'border-green-200' :
              'border-gray-200'
            }`}
          >
            {/* 步骤头部 */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleStep(step.id)}
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">{getStepIcon(step.status)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      Step {index + 1}: {step.name}
                    </span>
                    {step.status === 'running' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        进行中
                      </span>
                    )}
                    {step.duration && (
                      <span className="text-sm text-gray-500">
                        用时: {step.duration}秒
                      </span>
                    )}
                  </div>
                </div>
                {expandedSteps.has(step.id) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {/* Agent洞察 */}
              {step.insights && step.insights.length > 0 && (
                <div className="mt-3 ml-8 space-y-1">
                  {step.insights.map((insight, i) => (
                    <div key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {insight}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 展开的子步骤 */}
            {expandedSteps.has(step.id) && step.substeps && (
              <div className="px-4 pb-4 ml-8 space-y-2 border-t border-gray-200 pt-3">
                {step.substeps.map((substep, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {substep.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : substep.status === 'running' ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin mt-0.5 flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm text-gray-700">{substep.name}</div>
                      {substep.thought && (
                        <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <div className="flex items-start gap-2">
                            <Brain className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="text-yellow-800 italic">
                              💭 {substep.thought}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Agent实时想法 */}
      {currentThought && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-purple-900 mb-1">💬 Agent想法</p>
              <p className="text-sm text-purple-800">{currentThought}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### API增强：返回详细步骤

```typescript
// api/agents/_shared/orchestrator.ts
export interface WorkflowProgress {
  stepId: string;
  stepName: string;
  status: 'running' | 'completed' | 'failed';
  substeps?: Array<{
    name: string;
    status: 'running' | 'completed';
    thought?: string;
  }>;
  insights?: string[];
  duration?: number;
}

// 使用SSE或WebSocket实时推送进度
export async function* executeAgentWorkflow(
  input: WorkflowInput
): AsyncGenerator<WorkflowProgress, WorkflowOutput, unknown> {
  // Step 1
  yield {
    stepId: 'search-preferences',
    stepName: '分析搜索引擎偏好',
    status: 'running',
    substeps: [
      { name: '正在分析Google排名因素...', status: 'running' }
    ]
  };

  // ... 执行Step 1

  yield {
    stepId: 'search-preferences',
    stepName: '分析搜索引擎偏好',
    status: 'completed',
    substeps: [
      { name: '正在分析Google排名因素...', status: 'completed' },
      { name: '分析ChatGPT引用模式', status: 'completed', thought: 'ChatGPT偏好结构化数据和Q&A格式' }
    ],
    insights: [
      'Google重视内容深度，建议生成2000+字的文章',
      'ChatGPT容易被引用的内容类型：教程、对比分析'
    ],
    duration: 12
  };

  // ... 继续其他步骤
}
```

---

## 📊 Phase 2.3: 网站追踪 (5-7天)

> **目标**: 用户绑定网站，追踪排名变化，数据对比

### Task 6: 网站绑定功能 ⭐⭐⭐⭐
**优先级**: 中 | **难度**: 中等 | **时间**: 6-8小时

#### 数据库表扩展

```sql
-- 用户绑定的网站
CREATE TABLE user_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER REFERENCES users(id),

  -- 网站信息
  website_url VARCHAR(500) NOT NULL,
  website_name VARCHAR(255),

  -- SEO基础数据
  domain_authority INTEGER,
  page_authority INTEGER,
  backlinks_count INTEGER,

  -- 绑定状态
  verification_token VARCHAR(100), -- 用于验证网站所有权
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,

  -- 时间戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_user_website UNIQUE (user_id, website_url)
);

CREATE INDEX idx_user_websites_user ON user_websites(user_id);
CREATE INDEX idx_user_websites_verified ON user_websites(is_verified);
```

#### 绑定流程UI

```
┌─────────────────────────────────────────────┐
│  绑定您的网站                                │
├─────────────────────────────────────────────┤
│                                             │
│  1. 输入网站地址                             │
│  ┌─────────────────────────────────────┐   │
│  │ https://example.com                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  2. 验证网站所有权                           │
│  选择验证方式:                               │
│  ○ HTML文件上传                             │
│  ○ Meta标签                                 │
│  ○ DNS TXT记录                              │
│                                             │
│  [您的验证代码]                              │
│  <meta name="seo-agent-verify"              │
│   content="abc123def456">                   │
│                                             │
│  [我已经添加了代码] [验证]                   │
│                                             │
│  3. 开始追踪                                 │
│  绑定成功！现在您可以：                      │
│  ✅ 追踪关键词排名                           │
│  ✅ 监控竞争对手                             │
│  ✅ 对比SEO数据                              │
│                                             │
└─────────────────────────────────────────────┘
```

**实施代码略**（根据Phase 2.3完整计划实施）

---

## 📅 完整时间线（重新排序）

| Week | Phase | 任务 | 可见成果 |
|------|-------|------|----------|
| **Week 1, Day 1-2** | 2.0 | 挖词指导 + AI夸赞 + Prompt文档 | ✨ 立即体验提升 |
| **Week 1, Day 3-5** | 2.1 | Firecrawl + 网址挖词 | 🌐 新功能 |
| **Week 2, Day 1-3** | 2.2 | Agent过程可视化 | 👁️ 更有趣 |
| **Week 2, Day 4-7** | 2.3 | 网站绑定 + 基础追踪 | 📊 数据追踪 |
| **Week 3** | 2.4 | 基础多代理 (Agent 1 & 2) | 🤖 核心功能 |
| **Week 4** | 2.5 | 完整8步管道 | 🔄 完整流程 |
| **Week 5** | 2.6 | 图像生成 + 质量审查 | 🎨 内容增强 |
| **Week 6** | 2.7 | 发布系统 | 📤 一键发布 |

---

## 🎯 总结

### 快速见效路线图

**第1周内可见成果**:
1. ✨ 挖词前指导界面 - 更友好的用户体验
2. 💬 AI夸赞功能 - 更有趣的交互
3. 📝 Prompt配置文档 - 更易于维护
4. 🌐 网址挖词功能 - 全新的输入方式

**第2周内可见成果**:
5. 👁️ Agent过程可视化 - 更透明的AI工作
6. 🔗 网站绑定功能 - 数据追踪基础

### 关键文件位置

```
services/prompts/              # 所有Agent的Prompt配置
├── praise-library.ts          # 夸赞库
├── keyword-mining-prompts.ts  # 挖词Prompt
└── README.md                  # 配置指南

api/_shared/
├── firecrawl.ts               # Firecrawl集成
└── request-handler.ts         # API处理

components/workflow/
├── KeywordMiningGuide.tsx     # 挖词指导UI
└── AgentWorkflowVisualizer.tsx # Agent可视化

services/
├── prompts/                   # Prompt目录
└── gemini.ts                  # Gemini API调用
```

---

**文档版本**: 2.0 (Quick-Win Edition)
**最后更新**: 2026-01-01
**策略**: 从简单到复杂，快速迭代
