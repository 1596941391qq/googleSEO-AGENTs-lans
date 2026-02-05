# Prompt 混乱问题修复指南

## 问题诊断

### 症状
LLM 返回的策略内容混乱，包含大量不相关的"生成式AI"、"关键词聚焦AI编辑工具"等内容。

### 根本原因
1. **System Instruction 污染**：`SEO_RESEARCHER_PROMPTS` 中包含了过多的 GEO（Generative Engine Optimization）细节，这些内容应该属于 Content Writer（Agent 3），而不是 SEO Researcher（Agent 2）
2. **Prompt 过长**：`services/prompts/index.ts` 文件有 3180 行，包含大量重复和冗余的指令
3. **上下文拼接错误**：在 `agent-2-seo-researcher.ts` 中，`analysisContext` 被直接拼接到 system instruction 后面，导致上下文混乱

## 修复步骤

### 步骤 1：简化 SEO Researcher 的 System Instruction

**文件**：`services/prompts/index.ts`

**位置**：第 651-700 行左右的 `SEO_RESEARCHER_PROMPTS.searchPreferences`

**问题代码示例**：
```typescript
searchPreferences: {
  zh: (keyword: string, targetLanguage: string, marketLabel: string) => `
你是一位全球搜索算法专家，专注于解析 2026 年最新 AI 搜索引擎 (SGE, Perplexity) 与传统搜索引擎的底层逻辑，特别擅长GEO（Generative Engine Optimization）优化策略。

# 任务
分析关键词 "${keyword}" 在目标市场 ${marketLabel} 的不同搜索引擎中的优化策略。

关键词：${keyword}
目标语言：${targetLanguage}
目标市场：${marketLabel}

请深度解构目标关键词在不同"可见性算法"层级，并提供针对性的GEO优化建议。

<analysis_dimensions>
- **Google (SGE/Traditional)**: 关注 E-E-A-T、外部链接权重及"生成式搜索"中的引用概率。特别关注结构化内容、实体工程和格式工程。
- **Perplexity/SearchGPT**: 分析内容的时效性、结构化程度以及被视为"可靠来源"引用的概率。重点关注信息增益、首屏摘要、FAQ质量。
- **Claude/ChatGPT (Knowledge Retrieval)**: 评估内容的权威性、逻辑连贯性以及是否符合大模型的训练偏好。强调实体工程、对比分析和统计数据支撑。
</analysis_dimensions>

<geo_optimization_focus>
在分析每个引擎时，特别关注以下GEO要点：
1. **格式工程**：Bullets占比、键值对、表格等结构化元素
2. **实体工程**：实体命名统一性、实体描述标准化
3. **信息增益**：具体数据、实际案例、用户反馈
4. **首屏摘要**：80-120字Bullets格式摘要
5. **对比区**：多产品/方案对比表格
6. **FAQ质量**：5-8条常见问题
</geo_optimization_focus>
...
`
}
```

**修复后的代码**：
```typescript
searchPreferences: {
  zh: (keyword: string, targetLanguage: string, marketLabel: string) => `
你是一位搜索引擎策略分析专家。

# 任务
分析关键词 "${keyword}" 在目标市场 ${marketLabel} 的不同搜索引擎中的排名偏好和优化方向。

关键词：${keyword}
目标语言：${targetLanguage}
目标市场：${marketLabel}

# 分析维度
请从以下搜索引擎的角度分析该关键词：

1. **Google**：
   - 排名因素（E-E-A-T、内容质量、用户体验）
   - 内容偏好（结构、深度、权威性）
   - 优化建议

2. **Perplexity/SearchGPT**：
   - 引用逻辑（什么样的内容容易被引用）
   - 内容结构偏好
   - 优化建议

3. **ChatGPT/Claude**：
   - 知识检索偏好
   - 内容权威性要求
   - 优化建议

# 输出要求
- 简洁明了，每个引擎的分析控制在 100-150 字
- 提供可执行的优化建议
- 避免过度技术化的术语

# 输出格式
返回 JSON 格式，包含以下字段：
{
  "semantic_landscape": "关键词的语义分析（80-120字）",
  "engine_strategies": {
    "google": {
      "ranking_logic": "排名逻辑（40-60字）",
      "content_gap": "内容缺口（40-60字）",
      "action_item": "行动建议（30-40字）"
    },
    "perplexity": {
      "citation_logic": "引用逻辑（40-60字）",
      "structure_hint": "结构建议（30-40字）"
    },
    "generative_ai": {
      "llm_preference": "LLM偏好（40-60字）"
    }
  },
  "geo_recommendations": "GEO优化建议（80-100字）"
}
`
}
```

### 步骤 2：修复 Deep Dive Strategy 的 Prompt

**文件**：`services/prompts/index.ts`

**位置**：`SEO_RESEARCHER_PROMPTS.deepDiveStrategy`

**问题**：System instruction 中包含了过多的 GEO 细节，应该简化为策略层面的指导。

**修复原则**：
- 移除所有关于"格式工程"、"实体工程"、"Bullets占比"等具体写作细节
- 这些细节应该在 Agent 3（Content Writer）中处理
- Agent 2 只需要提供**策略方向**，不需要关心**具体实现**

### 步骤 3：修复 System Instruction 拼接逻辑

**文件**：`api/_shared/agents/agent-2-seo-researcher.ts`

**位置**：`generateDeepDiveStrategy` 函数中的 system instruction 构建

**问题代码**：
```typescript
const systemInstruction = customPrompt || (promptConfig.systemInstruction + analysisContext + referenceContext);
```

**问题**：
1. 直接拼接可能导致格式混乱
2. `analysisContext` 可能包含大量 JSON 数据，污染 system instruction
3. 没有明确的分隔符

**修复后的代码**：
```typescript
// 构建清晰的 system instruction
let systemInstruction = customPrompt || promptConfig.systemInstruction;

// 如果有分析上下文，作为独立的上下文块添加
if (analysisContext && !customPrompt) {
  systemInstruction += `\n\n--- ANALYSIS CONTEXT (For Reference Only) ---\n${analysisContext}\n--- End of Context ---`;
}

// 如果有参考内容，作为独立的参考块添加
if (referenceContext && !customPrompt) {
  systemInstruction += `\n\n--- REFERENCE MATERIAL (For Reference Only) ---\n${referenceContext}\n--- End of Reference ---`;
}
```

### 步骤 4：清理 Gemini API 调用中的 System Instruction

**文件**：`api/_shared/gemini.ts`

**位置**：`_callGeminiInternal` 函数

**当前实现**：
```typescript
const contents: any[] = [];
if (systemInstruction) {
  contents.push({
    role: 'user',
    parts: [{ text: systemInstruction }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Understood. I will follow these instructions.' }]
  });
}
contents.push({
  role: 'user',
  parts: [{ text: prompt }]
});
```

**问题**：
- System instruction 被当作 user 消息发送
- 如果 system instruction 过长或包含混乱内容，会污染整个对话

**建议**：
1. 考虑使用 Gemini 的 `systemInstruction` 参数（如果 API 支持）
2. 或者将 system instruction 精简到最核心的指令
3. 将详细的上下文信息放在 prompt 中，而不是 system instruction 中

## 快速修复方案（临时）

如果您需要立即修复问题，可以采用以下临时方案：

### 方案 A：强制使用简化的 System Instruction

在 `agent-2-seo-researcher.ts` 的 `generateDeepDiveStrategy` 函数中，添加以下代码：

```typescript
// 临时修复：使用简化的 system instruction
const simplifiedSystemInstruction = uiLanguage === 'zh'
  ? `你是一位 SEO 内容策略专家。

任务：为关键词 "${keyword.keyword}" 制定内容策略。

要求：
1. 分析用户搜索意图
2. 设计页面标题和 Meta 描述
3. 规划内容结构（H2 章节）
4. 推荐长尾关键词
5. 建议文章字数

输出格式：JSON（包含 pageTitleH1, metaDescription, contentStructure, longTailKeywords, recommendedWordCount 等字段）

重要：只返回 JSON，不要包含任何解释或思考过程。`
  : `You are an SEO content strategy expert.

Task: Create a content strategy for keyword "${keyword.keyword}".

Requirements:
1. Analyze user search intent
2. Design page title and meta description
3. Plan content structure (H2 sections)
4. Recommend long-tail keywords
5. Suggest word count

Output Format: JSON (with fields: pageTitleH1, metaDescription, contentStructure, longTailKeywords, recommendedWordCount)

CRITICAL: Return ONLY JSON, no explanations or thinking process.`;

// 使用简化的 system instruction 替代原有的
const finalSystemInstruction = customPrompt || simplifiedSystemInstruction;
```

### 方案 B：限制 System Instruction 长度

在 `gemini.ts` 中添加长度检查：

```typescript
// 在 _callGeminiInternal 函数中
if (systemInstruction) {
  // 限制 system instruction 长度，避免过长导致混乱
  const MAX_SYSTEM_INSTRUCTION_LENGTH = 2000; // 字符
  let finalSystemInstruction = systemInstruction;
  
  if (systemInstruction.length > MAX_SYSTEM_INSTRUCTION_LENGTH) {
    console.warn(`[Gemini API] System instruction too long (${systemInstruction.length} chars), truncating to ${MAX_SYSTEM_INSTRUCTION_LENGTH} chars`);
    finalSystemInstruction = systemInstruction.substring(0, MAX_SYSTEM_INSTRUCTION_LENGTH) + '\n\n[Instruction truncated for clarity]';
  }
  
  contents.push({
    role: 'user',
    parts: [{ text: finalSystemInstruction }]
  });
  contents.push({
    role: 'model',
    parts: [{ text: 'Understood. I will follow these instructions.' }]
  });
}
```

## 验证修复

修复后，请验证以下几点：

1. **策略输出清晰**：LLM 返回的策略应该只包含策略层面的内容，不包含具体的写作细节
2. **JSON 格式正确**：返回的 JSON 应该符合预期的 schema
3. **内容相关性**：返回的内容应该与关键词高度相关，不包含无关的"生成式AI"等内容
4. **长度合理**：每个字段的长度应该在合理范围内（如 reasoning 50-100 字）

## 长期优化建议

1. **分离关注点**：
   - Agent 2（SEO Researcher）：只负责策略分析和规划
   - Agent 3（Content Writer）：负责具体的内容写作和 GEO 优化

2. **Prompt 模块化**：
   - 将 `services/prompts/index.ts` 拆分为多个文件
   - 每个 Agent 有独立的 prompt 文件
   - 避免 prompt 之间的相互污染

3. **使用 Prompt 模板引擎**：
   - 考虑使用模板引擎（如 Handlebars）来管理 prompt
   - 避免字符串拼接导致的格式问题

4. **添加 Prompt 测试**：
   - 为每个 Agent 的 prompt 编写单元测试
   - 验证 prompt 的输出格式和内容质量

## 总结

问题的根源在于：
1. **Prompt 混淆**：Agent 2 的 prompt 包含了 Agent 3 的内容
2. **System Instruction 过长**：导致 LLM 混淆
3. **上下文拼接不当**：导致信息污染

修复的核心原则：
1. **简化 System Instruction**：只包含核心指令
2. **分离关注点**：每个 Agent 只关注自己的职责
3. **清晰的上下文分隔**：使用明确的分隔符

希望这个指南能帮助您解决问题！

