# Prompt配置快速使用指南

> **所有Agent的Prompt都在这里配置，轻松自定义！**

---

## 📁 文件位置

```
services/prompts/
├── index.ts          # 所有Prompt配置（主文件）
└── README.md         # 本文档
```

---

## 🎯 快速开始

### 1️⃣ 修改挖词Prompt

**场景**: 你想让AI生成更精准的关键词

**步骤**:
1. 打开 `services/prompts/index.ts`
2. 找到 `KEYWORD_MINING_PROMPTS` 对象
3. 修改 `base.zh` 或 `base.en` 字符串

**示例**:
```typescript
// 原始prompt
const originalPrompt = `
你是一位经验丰富的SEO关键词专家。
生成10个高潜力SEO���键词。
`;

// 修改后（更关注长尾关键词）
const customizedPrompt = `
你是一位经验丰富的SEO关键词专家。

## 特殊要求
- 优先生成3个词以上的长尾关键词
- 关注问题型关键词（如 "如何"、"最佳方法"）
- 每个关键词必须包含数字或具体描述

## 你的任务
根据种子关键词，生成10个高潜力SEO关键词。
`;
```

---

### 2️⃣ 修改夸赞Prompt

**场景**: 你想让AI夸得更真诚、更多样化

**步骤**:
1. 打开 `services/prompts/index.ts`
2. 找到 `generateKeywordPraise` 函数
3. 添加你自己的夸赞文案

**示例**:
```typescript
function generateKeywordPraise(industry?: string, language: 'zh' | 'en' = 'en'): string {
  const zhPraises = [
    // 添加你自己的夸赞
    "太厉害了！这个词选得非常有眼光！",
    "哇，您对市场的理解很深刻！这个词会带来很好的转化。",
    "非常好！这个词竞争度低，搜索量稳定，是理想的蓝海词。",
    // ... 更多夸赞
  ];

  // ... 现有代码
}
```

---

### 3️⃣ 修改行业特定Prompt

**场景**: 你想为某个行业添加专门的关键词策略

**步骤**:
1. 在 `KEYWORD_MINING_PROMPTS.withIndustry` 中添加新行业
2. 在 `generateKeywordPraise` 的 `industrySpecific` 中添加行业夸赞

**示例**:
```typescript
// 1. 在 KEYWORD_MINING_PROMPTS 中添加
const KEYWORD_MINING_PROMPTS = {
  withIndustry: {
    zh: (industry: string) => {
      const industryStrategies: Record<string, string> = {
        // 新增：健身行业
        fitness: `
## 健身行业关键词策略
- 关注问题型关键词（如"如何减脂"、"增肌食谱"）
- 考虑用户搜索场景（如"在家健身"、"健身房新手"）
- 分析季节性趋势（如"夏季减肥"、"冬季增肌"）
`,
        // ... 其他行业
      };

      const basePrompt = `你是一位SEO专家...`;
      const strategy = industryStrategies[industry] || '';

      return `${basePrompt}\n${strategy}`;
    }
  }
};

// 2. 在夸赞库中添加
const industrySpecific = {
  fitness: {
    zh: [
      "健身行业很有前景！健康意识提升带来了巨大市场。",
      "您的健身关键词选得很好！这个行业转化率高。",
    ],
    en: [
      "Fitness industry has great prospects! Rising health awareness brings huge market.",
      "Great fitness keyword selection! This industry has high conversion rates.",
    ],
  },
  // ... 其他行业
};
```

---

### 4️⃣ 使用Prompt（在API中）

**场景**: 在你的API中使用这些Prompt

**示例**:
```typescript
// api/generate-keywords.ts
import {
  getKeywordMiningPrompt,
  enhancePromptWithPraise,
  PraiseContext
} from '../../services/prompts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { seedKeyword, industry, uiLanguage } = body;

  // 1. 获取基础Prompt
  const basePrompt = getKeywordMiningPrompt(
    uiLanguage === 'zh' ? 'zh' : 'en',
    industry  // 可选：带行业特定策略
  );

  // 2. 添加夸赞（可选）
  const praiseContext: PraiseContext = {
    industry,
    keyword: seedKeyword,
    userInputType: 'keyword',
    language: uiLanguage === 'zh' ? 'zh' : 'en'
  };

  const enhancedPrompt = enhancePromptWithPraise(basePrompt, praiseContext);

  // 3. 使用增强后的Prompt调用Gemini
  const result = await callGeminiAPI(enhancedPrompt);

  return res.json(result);
}
```

---

## 🔧 所有可用的Prompt函数

| 函数名 | 用途 | 参数 | ���回 |
|--------|------|------|------|
| `getKeywordMiningPrompt(language, industry?)` | 挖词Prompt | `'zh'\|'en'`, 行业（可选） | prompt字符串 |
| `getSEOResearcherPrompt(task, language)` | SEO研究员 | `'searchPreferences'\|'competitorAnalysis'`, 语言 | prompt字符串 |
| `getContentWriterPrompt(language, variables?)` | 内容写手 | 语言, 变量对象（可选） | prompt字符串或system instruction |
| `getQualityReviewerPrompt(language)` | 质量审查 | 语言 | prompt字符串 |
| `getImageCreativePrompt(task, language)` | 图像创意 | 任务类型, 语言 | prompt字符串 |
| `getWebsiteAnalysisPrompt(url, industry, language)` | 网站分析 | URL, 行业, 语言 | prompt字符串 |
| `generatePraise(context)` | 生成夸赞 | 夸赞上下文对象 | 夸赞文本 |
| `enhancePromptWithPraise(prompt, context)` | 增强Prompt | 基础prompt, 上下文 | 增强后的prompt |

---

## 📋 Prompt结构模板

所有Prompt都应该遵循这个结构：

```typescript
export const MY_AGENT_PROMPTS = {
  base: {
    zh: `
你是一位[角色描述]。

## 你的任务
[具体的任务描述]

## 要求
1. **要求1**: [详细说明]
2. **要求2**: [详细说明]

## 输出格式
返回JSON：
{
  "field1": "值1",
  "field2": "值2"
}
`,
    en: `
You are a [role description].

## Your Task
[具体的任务描述]

## Requirements
1. **Requirement1**: [详细说明]
2. **Requirement2**: [详细说明]

## Output Format
Return JSON:
{
  "field1": "value1",
  "field2": "value2"
}
`
  }
};

export function getMyAgentPrompt(language: 'zh' | 'en'): string {
  return language === 'zh' ? MY_AGENT_PROMPTS.base.zh : MY_AGENT_PROMPTS.base.en;
}
```

---

## ✏️ 实战示例

### 示例1: 让AI更注重长尾关键词

```typescript
// 修改前
const basePrompt = getKeywordMiningPrompt('zh');

// 修改后
const customPrompt = basePrompt + `

## 额外要求
- 长尾关键词优先（3个词以上）
- 每个关键词必须包含搜索意图
- 关注问题型关键词（如何、最佳、为什么）
`;
```

### 示例2: 为特定行业定制

```typescript
// 使用内置的行业支持
const industryPrompt = getKeywordMiningPrompt('zh', 'ai');

// 或者自定义
const customPrompt = getKeywordMiningPrompt('zh') + `

## 用户行业
用户专注于：人工智能和机器学习

请根据该行业特点，调整关键词策略：
- 优先挖掘技术趋势词
- 考虑开发者问题（如"如何实现"、"最佳实践"）
- 关注竞品对比词
`;
```

### 示例3: 动态生成夸赞

```typescript
import { generatePraise, PraiseContext } from '@/services/prompts';

// 在API中使用
const praiseContext: PraiseContext = {
  industry: 'ecommerce',
  keyword: 'coffee shop marketing',
  userInputType: 'keyword',
  language: 'zh'
};

const praise = generatePraise(praiseContext);
// 输出: "电商关键词选得很精准！您对市场有深刻理解。"
```

---

## 🎨 最佳实践

### 1. 保持Prompt结构化
```typescript
// ✅ 好：清晰的章节结构
const prompt = `
## 任务
...

## 要求
1. ...
2. ...

## 输出格式
...
`;

// ❌ 差：没有结构
const prompt = "生成10个关键词...";
```

### 2. 使用占位符变量
```typescript
// ✅ 好：使用模板字符串
const prompt = `
分析关键词：${keyword}
行业：${industry}
语言：${language}
`;

// ❌ 差：硬编码
const prompt = `
分析关键词：coffee shop
行业：ecommerce
语言：en
`;
```

### 3. 提供示例
```typescript
const prompt = `
## 输出示例
{
  "keyword": "coffee shop marketing",
  "volume": 1200,
  "difficulty": 35
}

请按上述格式输出。
`;
```

### 4. 版本控制
```typescript
/**
 * 关键词挖掘Prompt
 *
 * @version 1.2
 * @lastUpdated 2026-01-01
 * @changelog
 *   - 1.2: 增加了行业特定策略
 *   - 1.1: 改进了长尾关键词识别
 *   - 1.0: 初始版本
 */
export const KEYWORD_MINING_PROMPTS = { ... };
```

---

## 🧪 测试你的Prompt

### 方法1: 在代码中直接测试
```typescript
import { getKeywordMiningPrompt } from '@/services/prompts';

// 测试中文prompt
const zhPrompt = getKeywordMiningPrompt('zh', 'ai');
console.log(zhPrompt);

// 测试英文prompt
const enPrompt = getKeywordMiningPrompt('en', 'ecommerce');
console.log(enPrompt);
```

### 方法2: 创建测试文件
```typescript
// tests/prompts.test.ts
import { getKeywordMiningPrompt, enhancePromptWithPraise } from '@/services/prompts';

describe('Keyword Mining Prompts', () => {
  it('should generate Chinese prompt', () => {
    const prompt = getKeywordMiningPrompt('zh');
    expect(prompt).toContain('SEO关键词专家');
  });

  it('should generate industry-specific prompt', () => {
    const prompt = getKeywordMiningPrompt('zh', 'ai');
    expect(prompt).toContain('AI行业');
  });

  it('should enhance with praise', () => {
    const basePrompt = getKeywordMiningPrompt('zh');
    const enhanced = enhancePromptWithPraise(basePrompt, {
      userInputType: 'keyword',
      language: 'zh'
    });
    expect(enhanced).toContain('💡');
  });
});
```

---

## 📚 相关文档

- **完整实施计划**: `QUICK_WIN_IMPLEMENTATION_PLAN.md`
- **原始架构文档**: `CLAUDE.md`
- **Phase 2详细计划**: `PHASE2_IMPLEMENTATION_PLAN.md`

---

## ❓ 常见问题

### Q1: 如何让AI更注重质量而不是数量？
```typescript
const customPrompt = basePrompt + `

## 质量优先
宁可不生成10个关键词，也要确保每个关键词都：
- 搜索量 > 500
- 难度 < 40
- 与种子关键词高度相关
- 有明确的用户搜索意图
`;
```

### Q2: 如何添加新的行业？
```typescript
// 1. 在 KEYWORD_MINING_PROMPTS.withIndustry 中添加
// 2. 在 generateKeywordPraise 的 industrySpecific 中添加
// 3. 在前端UI的INDUSTRIES数组中添加
```

### Q3: 如何让夸赞更多样化？
```typescript
function generateKeywordPraise() {
  // 添加更多夸赞模板
  const praises = [
    "模板1",
    "模板2",
    "模板3",
    // ... 添加更多
    "模板20",
  ];

  // 随机选择
  return praises[Math.floor(Math.random() * praises.length)];
}
```

---

## 🚀 下一步

1. **立即开始**: 打开 `services/prompts/index.ts` 修改第一个Prompt
2. **测试效果**: 在开发环境中测试修改后的Prompt
3. **A/B测试**: 创建不同版本的Prompt，对比效果
4. **版本记录**: 在每次修改后更新 `@version` 注释

---

**文档版本**: 1.0
**最后更新**: 2026-01-01
**维护者**: Development Team

💡 **提示**: 所有Prompt修改都会立即生效，无需重启服务器（开发模式下）。
