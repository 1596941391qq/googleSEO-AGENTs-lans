# Prompt 使用说明文档

本文档详细说明 `services/prompts/index.ts` 中定义的提示词的使用方式、格式化规范和期望输出格式。

## 📋 目录

1. [DEFAULT_GEN_PROMPT_EN - 关键词生成提示词](#1-default_gen_prompt_en---关键词生成提示词)
2. [DEFAULT_ANALYZE_PROMPT_EN - SERP 分析提示词](#2-default_analyze_prompt_en---serp分析提示词)
3. [DEFAULT_DEEP_DIVE_PROMPT_EN - 深度策略提示词](#3-default_deep_dive_prompt_en---深度策略提示词)

---

## 1. DEFAULT_GEN_PROMPT_EN - 关键词生成提示词

### 📍 使用位置

**后端 API:**

- `api/_shared/gemini.ts` → `generateKeywords()` 函数
- `api/generate-keywords.ts` → API 端点处理器

**前端服务:**

- `services/gemini.ts` → 重新导出
- `App.tsx` → 作为默认配置使用
- `workflows.ts` → 工作流配置

### 🔧 如何使用

```typescript
// 在 generateKeywords 函数中
const response = await callGeminiAPI(
  promptContext, // 用户提示（包含种子关键词、策略等）
  systemInstruction, // DEFAULT_GEN_PROMPT_EN 作为 systemInstruction
  { responseMimeType: "application/json" }
);
```

### 📝 格式化方式

1. **System Instruction (DEFAULT_GEN_PROMPT_EN)**:

   - 作为 `systemInstruction` 参数传递给 `callGeminiAPI`
   - 通过 Gemini API 的对话格式发送：
     ```javascript
     contents: [
       { role: "user", parts: [{ text: systemInstruction }] },
       {
         role: "model",
         parts: [{ text: "Understood. I will follow these instructions." }],
       },
       { role: "user", parts: [{ text: promptContext }] },
     ];
     ```

2. **Prompt Context (动态构建)**:
   - 包含种子关键词、策略指导、行业指导、用户建议
   - 明确要求返回 JSON 数组格式
   - 包含示例格式

### 📤 期望输出格式

**JSON 数组格式：**

```json
[
  {
    "keyword": "关键词（目标语言）",
    "translation": "翻译（用户界面语言）",
    "intent": "Informational" | "Transactional" | "Local" | "Commercial",
    "volume": 1000
  }
]
```

**处理流程：**

1. API 返回原始文本
2. 通过 `extractJSON()` 函数提取 JSON（移除 markdown 代码块）
3. `JSON.parse()` 解析为数组
4. 验证是数组类型
5. 为每个项目添加 `id` 字段：`kw-${Date.now()}-${index}`

**输出类型：**

```typescript
Promise<KeywordData[]>;
```

---

## 2. DEFAULT_ANALYZE_PROMPT_EN - SERP 分析提示词

### 📍 使用位置

**后端 API:**

- `api/_shared/gemini.ts` → `analyzeRankingProbability()` 函数
- `api/analyze-ranking.ts` → API 端点处理器

**前端服务:**

- `services/gemini.ts` → 重新导出
- `App.tsx` → 作为默认配置使用
- `workflows.ts` → 工作流配置

### 🔧 如何使用

```typescript
// 在 analyzeRankingProbability 函数中
const fullSystemInstruction = `
${systemInstruction}  // DEFAULT_ANALYZE_PROMPT_EN 作为基础

TASK: Analyze the Google SERP competition for the keyword: "${keywordData.keyword}".
${serpContext}        // 真实的 SERP 结果数据
${serankingContext}   // SE Ranking 关键词难度数据

// ... 额外的分析指令 ...
`;

const response = await callGeminiAPI(
  `Analyze SEO competition for: ${keywordData.keyword}`,
  fullSystemInstruction,
  { responseMimeType: "application/json" }
);
```

### 📝 格式化方式

1. **System Instruction 扩展**:

   - `DEFAULT_ANALYZE_PROMPT_EN` 作为基础
   - 动态添加：
     - SERP 结果上下文（前 N 个搜索结果）
     - SE Ranking 数据（关键词难度、搜索量、CPC 等）
     - 分析步骤说明
     - 严格的评分标准

2. **SERP 数据格式**:

   ```
   TOP GOOGLE SEARCH RESULTS FOR REFERENCE:
   1. Title: ...
      URL: ...
      Snippet: ...

   Estimated Total Results on Google: ...
   ```

3. **SE Ranking 数据格式**:
   ```
   SE RANKING KEYWORD DATA:
   - Search Volume: ...
   - Keyword Difficulty (KD): ...
   - CPC: $...
   - Competition: ...%
   ```

### 📤 期望输出格式

**JSON 对象格式：**

```json
{
  "searchIntent": "用户搜索意图描述（用户界面语言）",
  "intentAnalysis": "意图分析（用户界面语言）",
  "serpResultCount": 10000,
  "topDomainType": "Big Brand" | "Niche Site" | "Forum/Social" | "Weak Page" | "Gov/Edu" | "Unknown",
  "probability": "High" | "Medium" | "Low",
  "reasoning": "详细推理说明（用户界面语言）",
  "topSerpSnippets": [
    {
      "title": "标题",
      "url": "URL",
      "snippet": "摘要"
    }
  ]
}
```

**处理流程：**

1. API 返回原始文本
2. 通过 `extractJSON()` 函数提取 JSON
3. `JSON.parse()` 解析为对象
4. 验证必需字段存在，设置默认值
5. 如果 SERP 数据可用，覆盖 `topSerpSnippets` 和 `serpResultCount`
6. 合并到原始 `KeywordData` 对象

**输出类型：**

```typescript
Promise<KeywordData[]>; // 每个 KeywordData 包含分析结果
```

---

## 3. DEFAULT_DEEP_DIVE_PROMPT_EN - 深度策略提示词

### 📍 使用位置

**后端 API:**

- `api/_shared/gemini.ts` → `generateDeepDiveStrategy()` 函数
- `api/deep-dive-strategy.ts` → API 端点处理器
- `api/deep-dive-enhanced.ts` → 增强版 API 端点

**前端服务:**

- `services/gemini.ts` → 重新导出
- `App.tsx` → 作为默认配置使用
- `workflows.ts` → 工作流配置

### 🔧 如何使用

```typescript
// 在 generateDeepDiveStrategy 函数中
const systemInstruction =
  customPrompt ||
  `
${DEFAULT_DEEP_DIVE_PROMPT_EN}
// 如果提供了 customPrompt，则使用自定义提示词
// 否则使用默认的 DEFAULT_DEEP_DIVE_PROMPT_EN
`;

const prompt = `
Create a detailed Content Strategy Report for the keyword: "${keyword.keyword}".
// ... 详细的输出格式要求 ...
`;

const response = await callGeminiAPI(prompt, systemInstruction, {
  responseMimeType: "application/json",
});
```

### 📝 格式化方式

1. **System Instruction**:

   - 作为 `systemInstruction` 参数
   - 可以被子定义提示词覆盖（`customPrompt` 参数）

2. **Prompt**:
   - 包含关键词信息
   - 明确指定目标语言和用户界面语言
   - 详细的 JSON 输出格式要求

### 📤 期望输出格式

**JSON 对象格式：**

```json
{
  "targetKeyword": "目标关键词",
  "pageTitleH1": "H1标题（目标语言）",
  "pageTitleH1_trans": "H1标题翻译（用户界面语言）",
  "metaDescription": "Meta描述（目标语言，最多160字符）",
  "metaDescription_trans": "Meta描述翻译（用户界面语言）",
  "urlSlug": "seo-friendly-slug",
  "userIntentSummary": "用户意图摘要",
  "contentStructure": [
    {
      "header": "H2标题（目标语言）",
      "header_trans": "H2标题翻译（用户界面语言）",
      "description": "内容描述（目标语言）",
      "description_trans": "内容描述翻译（用户界面语言）"
    }
  ],
  "longTailKeywords": ["关键词1", "关键词2"],
  "longTailKeywords_trans": ["翻译1", "翻译2"],
  "recommendedWordCount": 2000
}
```

**处理流程：**

1. API 返回原始文本
2. 通过 `extractJSON()` 函数提取 JSON
3. `JSON.parse()` 解析为对象
4. 验证是对象类型（不是数组）
5. 直接返回解析后的对象

**输出类型：**

```typescript
Promise<SEOStrategyReport>;
```

---

## 🔄 通用处理流程

### callGeminiAPI 函数

```typescript
callGeminiAPI(
  prompt: string,              // 用户提示
  systemInstruction?: string,  // 系统指令（可选）
  config?: GeminiConfig        // 配置选项
)
```

**格式化步骤：**

1. 如果提供了 `systemInstruction`，先发送它作为第一条消息
2. 模型回复确认
3. 然后发送实际的 `prompt`
4. 如果 `responseMimeType === "application/json"`，设置 JSON 响应模式

### extractJSON 函数

**功能：**

- 从可能包含思考过程或 markdown 的文本中提取 JSON
- 移除 markdown 代码块（`json ... `）
- 查找第一个 `{` 或 `[` 和最后一个 `}` 或 `]`
- 返回提取的 JSON 字符串

**处理逻辑：**

````typescript
// 1. 移除 markdown
text = text
  .replace(/```json\s*/gi, "")
  .replace(/```/g, "")
  .trim();

// 2. 查找 JSON 边界
const firstBrace = text.indexOf("{");
const firstBracket = text.indexOf("[");
const lastBrace = text.lastIndexOf("}");
const lastBracket = text.lastIndexOf("]");

// 3. 提取并验证
const extracted = text.substring(startIdx, endIdx + 1).trim();
````

---

## 📊 数据流图

### 关键词生成流程

```
DEFAULT_GEN_PROMPT_EN (systemInstruction)
    ↓
+ promptContext (种子关键词、策略等)
    ↓
callGeminiAPI(..., { responseMimeType: "application/json" })
    ↓
extractJSON() → JSON.parse() → KeywordData[]
```

### SERP 分析流程

```
DEFAULT_ANALYZE_PROMPT_EN (base systemInstruction)
    ↓
+ SERP 数据上下文
+ SE Ranking 数据上下文
+ 详细分析指令
    ↓
callGeminiAPI(..., { responseMimeType: "application/json" })
    ↓
extractJSON() → JSON.parse() → 合并到 KeywordData
```

### 深度策略流程

```
DEFAULT_DEEP_DIVE_PROMPT_EN (systemInstruction)
    ↓
+ 详细内容策略要求
    ↓
callGeminiAPI(..., { responseMimeType: "application/json" })
    ↓
extractJSON() → JSON.parse() → SEOStrategyReport
```

---

## ⚠️ 注意事项

1. **JSON 格式严格要求**:

   - 所有提示词都要求返回纯 JSON，不包含 markdown 格式
   - 使用 `responseMimeType: "application/json"` 强制 JSON 输出
   - 如果 prompt 中没有 "JSON" 关键字，会自动添加提示

2. **语言处理**:

   - `keyword` 字段使用目标语言（targetLanguage）
   - `translation` 字段使用用户界面语言（uiLanguage）
   - 所有分析文本使用用户界面语言

3. **错误处理**:

   - 如果 JSON 解析失败，返回空数组或空对象
   - 如果提取的 JSON 格式不正确，会记录错误日志
   - 验证必需字段存在，缺失时使用默认值

4. **数据合并**:
   - SERP 分析会合并真实 SERP 数据到分析结果
   - 如果 SE Ranking 数据可用，会更新 `volume` 字段
   - 分析结果会合并到原始的 `KeywordData` 对象

---

## 📚 相关文件

- `services/prompts/index.ts` - 提示词定义
- `services/gemini.ts` - 前端服务（重新导出）
- `api/_shared/gemini.ts` - 后端实现
- `api/generate-keywords.ts` - 关键词生成 API
- `api/analyze-ranking.ts` - SERP 分析 API
- `api/deep-dive-strategy.ts` - 深度策略 API
- `types.ts` - TypeScript 类型定义
