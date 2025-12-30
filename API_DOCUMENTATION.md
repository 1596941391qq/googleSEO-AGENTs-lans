# SEO Agent API 文档

## 概述

SEO Agent API 是一个统一的 API 接口，提供三种 SEO 分析模式：

1. **关键词挖掘** (keyword_mining) - 基于种子关键词生成并分析 SEO 关键词
2. **批量翻译分析** (batch_translation) - 批量翻译关键词并分析排名机会
3. **深度策略** (deep_dive) - 为关键词生成全面的 SEO 内容策略

此外，还提供**工作流配置管理 API**，允许用户自定义和保存提示词配置，在不同模式上复用。

## 基础信息

**主要 API 端点**:

- `POST /api/seo-agent` - SEO 分析主接口
- `GET /api/workflows` - 获取工作流定义
- `POST /api/workflow-configs` - 创建工作流配置
- `GET /api/workflow-configs` - 获取工作流配置列表
- `GET /api/workflow-configs/:id` - 获取特定工作流配置
- `PUT /api/workflow-configs/:id` - 更新工作流配置
- `DELETE /api/workflow-configs/:id` - 删除工作流配置

**Content-Type**: `application/json`

**CORS**: 支持跨域请求

**认证**: 所有 API 请求都需要在 `Authorization` header 中提供 Bearer token

**Credits 消耗**: 所有 SEO 分析操作都会消耗 Credits，消耗规则与官网一致

### Credits 消耗规则

| 模式                | 基础消耗   | 计算方式                                |
| ------------------- | ---------- | --------------------------------------- |
| `keyword_mining`    | 20 Credits | 每 10 个关键词 = 20 Credits（向上取整） |
| `batch_translation` | 20 Credits | 每 10 个关键词 = 20 Credits（向上取整） |
| `deep_dive`         | 30 Credits | 固定 30 Credits                         |

**示例**:

- 关键词挖掘 5 个关键词 = 20 Credits (1-10 个都是 20)
- 关键词挖掘 15 个关键词 = 40 Credits (11-20 个是 40)
- 批量翻译 25 个关键词 = 60 Credits (21-30 个是 60)
- 深度策略 = 30 Credits (固定)

## 通用请求格式

所有请求都需要包含 `mode` 字段来指定使用的模式，并且需要在请求头中提供认证 token：

**请求头**:

```http
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**请求体**:

```json
{
  "mode": "keyword_mining" | "batch_translation" | "deep_dive",
  // ... 其他参数
}
```

**注意**:

- 如果没有提供 `Authorization` header，API 会返回 401 错误
- API 会在执行前检查 Credits 余额，余额不足会返回 402 错误
- 操作成功后会自动扣除相应的 Credits

## 通用响应格式

### 成功响应

```json
{
  "success": true,
  "mode": "keyword_mining" | "batch_translation" | "deep_dive",
  "data": {
    // 模式特定的数据
  }
}
```

### 错误响应

```json
{
  "error": "错误描述",
  "message": "详细错误信息"
  // 可能包含其他字段
}
```

---

## 模式 1: 关键词挖掘 (keyword_mining)

### 功能说明

基于种子关键词生成 SEO 关键词，并可选择性地分析排名概率。

### 请求参数

| 参数                | 类型     | 必填 | 默认值         | 说明                                                      |
| ------------------- | -------- | ---- | -------------- | --------------------------------------------------------- |
| `mode`              | string   | 是   | -              | 必须为 `"keyword_mining"`                                 |
| `seedKeyword`       | string   | 是   | -              | 种子关键词                                                |
| `systemInstruction` | string   | 是   | -              | AI 系统指令，用于指导关键词生成                           |
| `targetLanguage`    | string   | 否   | `"en"`         | 目标市场语言代码 (en, zh, ko, ja, ru, fr, pt, id, es, ar) |
| `existingKeywords`  | string[] | 否   | `[]`           | 已生成的关键词列表（用于避免重复）                        |
| `roundIndex`        | number   | 否   | `1`            | 挖掘轮次                                                  |
| `wordsPerRound`     | number   | 否   | `10`           | 每轮生成的关键词数量 (5-20)                               |
| `miningStrategy`    | string   | 否   | `"horizontal"` | 挖掘策略：`"horizontal"` (横向) 或 `"vertical"` (纵向)    |
| `userSuggestion`    | string   | 否   | `""`           | 用户建议（用于指导下一轮生成）                            |
| `uiLanguage`        | string   | 否   | `"en"`         | UI 语言：`"en"` 或 `"zh"`                                 |
| `analyzeRanking`    | boolean  | 否   | `true`         | 是否分析排名概率                                          |

### 请求示例

```bash
curl -X POST https://your-domain.com/api/seo-agent \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "keyword_mining",
    "seedKeyword": "coffee shop",
    "systemInstruction": "Generate high-potential SEO keywords focusing on commercial intent.",
    "targetLanguage": "ko",
    "wordsPerRound": 10,
    "miningStrategy": "horizontal",
    "uiLanguage": "zh",
    "analyzeRanking": true
  }'
```

### 响应示例

```json
{
  "success": true,
  "mode": "keyword_mining",
  "data": {
    "keywords": [
      {
        "id": "kw-1234567890-0",
        "keyword": "커피숍 프랜차이즈",
        "translation": "咖啡店加盟",
        "intent": "Commercial",
        "volume": 3200,
        "probability": "HIGH",
        "topDomainType": "Niche Site",
        "reasoning": "竞争较弱，蓝海机会",
        "serankingData": {
          "volume": 3200,
          "difficulty": 25,
          "cpc": 1.2,
          "competition": 0.3
        }
      }
    ],
    "count": 10,
    "seedKeyword": "coffee shop",
    "targetLanguage": "ko",
    "roundIndex": 1
  }
}
```

---

## 模式 2: 批量翻译分析 (batch_translation)

### 功能说明

批量翻译关键词到目标语言，并分析每个关键词的排名机会。

### 请求参数

| 参数                | 类型               | 必填 | 默认值 | 说明                               |
| ------------------- | ------------------ | ---- | ------ | ---------------------------------- |
| `mode`              | string             | 是   | -      | 必须为 `"batch_translation"`       |
| `keywords`          | string \| string[] | 是   | -      | 关键词列表（逗号分隔字符串或数组） |
| `systemInstruction` | string             | 是   | -      | AI 系统指令，用于分析排名机会      |
| `targetLanguage`    | string             | 否   | `"en"` | 目标市场语言代码                   |
| `uiLanguage`        | string             | 否   | `"en"` | UI 语言：`"en"` 或 `"zh"`          |

### 请求示例

```bash
curl -X POST https://your-domain.com/api/seo-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "mode": "batch_translation",
    "keywords": "coffee shop, espresso machine, latte art, cold brew",
    "systemInstruction": "Analyze SEO ranking opportunities for these keywords.",
    "targetLanguage": "ko",
    "uiLanguage": "zh"
  }'
```

**Credits 消耗**: 此操作会消耗 20 Credits（4 个关键词，向上取整为 10）

### 响应示例

```json
{
  "success": true,
  "mode": "batch_translation",
  "data": {
    "keywords": [
      {
        "id": "bt-1234567890-0",
        "keyword": "커피숍",
        "translation": "coffee shop",
        "intent": "Informational",
        "volume": 4500,
        "probability": "HIGH",
        "topDomainType": "Niche Site",
        "reasoning": "竞争较弱，有机会排名",
        "serankingData": {
          "volume": 4500,
          "difficulty": 28,
          "cpc": 1.5
        }
      }
    ],
    "translationResults": [
      {
        "original": "coffee shop",
        "translated": "커피숍",
        "translationBack": "coffee shop"
      }
    ],
    "total": 4,
    "targetLanguage": "ko"
  }
}
```

---

## 模式 3: 深度策略 (deep_dive)

### 功能说明

为指定关键词生成全面的 SEO 内容策略，包括页面标题、描述、内容结构、长尾关键词等。

### 请求参数

| 参数             | 类型             | 必填 | 默认值 | 说明                      |
| ---------------- | ---------------- | ---- | ------ | ------------------------- |
| `mode`           | string           | 是   | -      | 必须为 `"deep_dive"`      |
| `keyword`        | object \| string | 是   | -      | 关键词对象或字符串        |
| `targetLanguage` | string           | 否   | `"en"` | 目标市场语言代码          |
| `uiLanguage`     | string           | 否   | `"en"` | UI 语言：`"en"` 或 `"zh"` |
| `strategyPrompt` | string           | 否   | -      | 自定义策略生成提示词      |

### Keyword 对象格式（如果提供对象）

```json
{
  "id": "kw-123",
  "keyword": "coffee shop",
  "translation": "咖啡店",
  "intent": "Commercial",
  "volume": 1000
}
```

### 请求示例

```bash
curl -X POST https://your-domain.com/api/seo-agent \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "deep_dive",
    "keyword": {
      "id": "kw-123",
      "keyword": "coffee shop",
      "translation": "咖啡店",
      "intent": "Commercial",
      "volume": 1000
    },
    "targetLanguage": "ko",
    "uiLanguage": "zh"
  }'
```

或使用简化格式：

```bash
curl -X POST https://your-domain.com/api/seo-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "mode": "deep_dive",
    "keyword": "coffee shop",
    "targetLanguage": "ko",
    "uiLanguage": "zh"
  }'
```

**Credits 消耗**: 此操作会消耗 30 Credits（固定）

### 响应示例

```json
{
  "success": true,
  "mode": "deep_dive",
  "data": {
    "report": {
      "targetKeyword": "커피숍",
      "pageTitleH1": "최고의 커피숍 가이드 2024",
      "pageTitleH1_trans": "最佳咖啡店指南 2024",
      "metaDescription": "커피숍 선택 가이드: 위치, 메뉴, 가격 비교...",
      "metaDescription_trans": "咖啡店选择指南：位置、菜单、价格比较...",
      "urlSlug": "coffee-shop-guide",
      "contentStructure": [
        {
          "header": "커피숍 선택 기준",
          "header_trans": "咖啡店选择标准",
          "description": "위치, 가격, 메뉴 다양성 등을 고려하세요.",
          "description_trans": "考虑位置、价格、菜单多样性等因素。"
        }
      ],
      "longTailKeywords": ["커피숍 프랜차이즈", "커피숍 창업 비용"],
      "longTailKeywords_trans": ["咖啡店加盟", "咖啡店创业成本"],
      "recommendedWordCount": 2000
    },
    "coreKeywords": [
      {
        "id": "cd-1234567890-0",
        "keyword": "커피숍 프랜차이즈",
        "translation": "커피숍 프랜차이즈",
        "volume": 3200,
        "probability": "HIGH",
        "topDomainType": "Niche Site"
      }
    ],
    "keyword": "커피숍",
    "targetLanguage": "ko"
  }
}
```

---

## 支持的语言代码

| 代码 | 语言       | 说明              |
| ---- | ---------- | ----------------- |
| `en` | English    | 英语（全球/美国） |
| `zh` | Chinese    | 中文（中国）      |
| `ko` | Korean     | 韩语              |
| `ja` | Japanese   | 日语              |
| `ru` | Russian    | 俄语              |
| `fr` | French     | 法语              |
| `pt` | Portuguese | 葡萄牙语          |
| `id` | Indonesian | 印尼语            |
| `es` | Spanish    | 西班牙语          |
| `ar` | Arabic     | 阿拉伯语          |

---

## 错误码

| HTTP 状态码 | 错误类型              | 说明                          |
| ----------- | --------------------- | ----------------------------- |
| 401         | Unauthorized          | 缺少或无效的认证 token        |
| 402         | Payment Required      | Credits 余额不足              |
| 400         | Bad Request           | 请求参数错误或缺失            |
| 405         | Method Not Allowed    | 请求方法不支持（仅支持 POST） |
| 500         | Internal Server Error | 服务器内部错误                |

### 常见错误示例

**缺少认证 token**:

```json
{
  "error": "Unauthorized",
  "message": "Authorization token required. Please provide Bearer token in Authorization header."
}
```

**Credits 余额不足**:

```json
{
  "error": "Insufficient credits",
  "message": "This operation requires 20 credits, but you only have 15 credits remaining",
  "required": 20,
  "remaining": 15,
  "rechargeUrl": "https://niche-mining-web.vercel.app/console/pricing"
}
```

**缺少 mode 参数**:

```json
{
  "error": "Missing required field: mode",
  "message": "Please specify mode: keyword_mining, batch_translation, or deep_dive",
  "supportedModes": ["keyword_mining", "batch_translation", "deep_dive"]
}
```

**无效的 mode**:

```json
{
  "error": "Invalid mode",
  "message": "Mode \"invalid_mode\" is not supported",
  "supportedModes": ["keyword_mining", "batch_translation", "deep_dive"]
}
```

**缺少必填字段**:

```json
{
  "error": "Missing required fields",
  "message": "seedKeyword and systemInstruction are required for keyword_mining mode",
  "requiredFields": ["seedKeyword", "systemInstruction"]
}
```

---

## 使用示例

### JavaScript/TypeScript

```typescript
async function callSEOAgent(mode: string, params: any, token: string) {
  const response = await fetch("https://your-domain.com/api/seo-agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // 必须提供认证 token
    },
    body: JSON.stringify({
      mode,
      ...params,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || error.error);
  }

  return await response.json();
}

// 获取 token（从主应用获取）
const token = "YOUR_JWT_TOKEN"; // 从主应用获取的 JWT token

// 关键词挖掘（消耗 20 Credits）
const miningResult = await callSEOAgent(
  "keyword_mining",
  {
    seedKeyword: "coffee shop",
    systemInstruction: "Generate high-potential SEO keywords.",
    targetLanguage: "ko",
    uiLanguage: "zh",
  },
  token
);

// 批量翻译分析（消耗 20 Credits，4个关键词）
const batchResult = await callSEOAgent(
  "batch_translation",
  {
    keywords: "coffee shop, espresso machine",
    systemInstruction: "Analyze SEO opportunities.",
    targetLanguage: "ko",
    uiLanguage: "zh",
  },
  token
);

// 深度策略（消耗 30 Credits）
const deepDiveResult = await callSEOAgent(
  "deep_dive",
  {
    keyword: "coffee shop",
    targetLanguage: "ko",
    uiLanguage: "zh",
  },
  token
);
```

### Python

```python
import requests
import json

def call_seo_agent(mode, **params):
    url = 'https://your-domain.com/api/seo-agent'
    payload = {
        'mode': mode,
        **params
    }

    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json()

# 关键词挖掘
result = call_seo_agent(
    'keyword_mining',
    seedKeyword='coffee shop',
    systemInstruction='Generate high-potential SEO keywords.',
    targetLanguage='ko',
    uiLanguage='zh'
)

# 批量翻译分析
result = call_seo_agent(
    'batch_translation',
    keywords='coffee shop, espresso machine',
    systemInstruction='Analyze SEO opportunities.',
    targetLanguage='ko',
    uiLanguage='zh'
)

# 深度策略
result = call_seo_agent(
    'deep_dive',
    keyword='coffee shop',
    targetLanguage='ko',
    uiLanguage='zh'
)
```

---

## 注意事项

1. **认证要求**: 所有请求都需要在 `Authorization` header 中提供有效的 JWT token
2. **Credits 消耗**:
   - 操作执行前会检查 Credits 余额
   - 余额不足会返回 402 错误
   - 操作成功后会自动扣除相应的 Credits
   - Credits 消耗规则与官网完全一致
3. **API 限流**: 建议控制请求频率，避免过于频繁的调用
4. **异步处理**: 某些操作可能需要较长时间，建议设置合理的超时时间（建议 60 秒以上）
5. **数据格式**: 确保传递的数据格式正确，特别是 `keywords` 字段可以是字符串或数组
6. **语言支持**: 确保 `targetLanguage` 和 `uiLanguage` 使用支持的语言代码
7. **错误处理**: 始终检查响应中的 `success` 字段和错误信息
8. **测试模式**: 如需跳过 Credits 检查（仅用于测试），可设置 `skipCreditsCheck: true`，但操作完成后仍会尝试消耗 Credits

---

## 工作流配置管理

### 概述

工作流配置允许您自定义 AI 代理的提示词，并保存这些配置以便在不同请求中复用。每个工作流都有多个可配置的节点（Agent），您可以自定义每个节点的提示词。

**重要提示**: 每个 API 模式对应不同的工作流，必须使用正确的工作流 ID 创建配置：

| API 模式 (mode)     | 工作流 ID (workflowId) | 工作流名称                  |
| ------------------- | ---------------------- | --------------------------- |
| `keyword_mining`    | `mining`               | Keyword Mining Workflow     |
| `batch_translation` | `batch`                | Batch Translation Workflow  |
| `deep_dive`         | `deepDive`             | Deep Dive Strategy Workflow |

⚠️ **注意**: 如果使用 `workflowConfigId`，必须确保配置的工作流 ID 与当前模式匹配，否则会返回错误。

### 获取工作流定义

**端点**: `GET /api/workflows`

**查询参数**:

- `id` (可选) - 获取特定工作流的定义

**响应示例**:

```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "mining",
        "name": "Keyword Mining Workflow",
        "description": "Generate keywords, research with SEO tools...",
        "nodes": [
          {
            "id": "mining-gen",
            "type": "agent",
            "name": "Keyword Generation Agent",
            "description": "Generates high-potential keywords...",
            "configurable": true,
            "defaultPrompt": "Generate high-potential SEO keywords..."
          }
        ]
      }
    ]
  }
}
```

### 创建工作流配置

**端点**: `POST /api/workflow-configs`

**请求体**:

```json
{
  "workflowId": "mining",
  "name": "我的自定义挖掘配置",
  "nodes": [
    {
      "id": "mining-gen",
      "type": "agent",
      "name": "Keyword Generation Agent",
      "prompt": "你是一个SEO关键词专家。专注于生成高商业价值的关键词...",
      "defaultPrompt": "Generate high-potential SEO keywords..."
    }
  ]
}
```

### 在工作流中使用配置

在调用 `/api/seo-agent` 时，可以通过 `workflowConfigId` 参数使用保存的配置。**必须确保配置的工作流 ID 与模式匹配**：

**关键词挖掘模式** (使用 `mining` 工作流):

```json
{
  "mode": "keyword_mining",
  "seedKeyword": "coffee shop",
  "workflowConfigId": "mining-1234567890-abc123",
  "targetLanguage": "ko"
}
```

**批量翻译模式** (使用 `batch` 工作流):

```json
{
  "mode": "batch_translation",
  "keywords": "coffee shop, espresso machine",
  "workflowConfigId": "batch-1234567890-abc123",
  "targetLanguage": "ko"
}
```

**深度策略模式** (使用 `deepDive` 工作流):

```json
{
  "mode": "deep_dive",
  "keyword": "coffee shop",
  "workflowConfigId": "deepDive-1234567890-abc123",
  "targetLanguage": "ko"
}
```

### 工作流节点说明

每个工作流都有不同的可配置节点，以下是各工作流的节点列表：

#### 关键词挖掘工作流 (`mining`)

| 节点 ID            | 类型  | 说明            | 可配置 | 在 API 中的使用                  |
| ------------------ | ----- | --------------- | ------ | -------------------------------- |
| `mining-gen`       | agent | 关键词生成代理  | ✅     | 用于 `generateKeywords`          |
| `mining-seranking` | tool  | SE Ranking 工具 | ❌     | 系统工具                         |
| `mining-serp`      | tool  | SERP 搜索工具   | ❌     | 系统工具                         |
| `mining-analyze`   | agent | SERP 分析代理   | ✅     | 用于 `analyzeRankingProbability` |

#### 批量翻译工作流 (`batch`)

| 节点 ID           | 类型  | 说明            | 可配置 | 在 API 中的使用                  |
| ----------------- | ----- | --------------- | ------ | -------------------------------- |
| `batch-translate` | agent | 翻译代理        | ✅     | 用于关键词翻译                   |
| `batch-seranking` | tool  | SE Ranking 工具 | ❌     | 系统工具                         |
| `batch-serp`      | tool  | SERP 搜索工具   | ❌     | 系统工具                         |
| `batch-intent`    | agent | 意图分析代理    | ✅     | 用于意图分析                     |
| `batch-analyze`   | agent | 竞争分析代理    | ✅     | 用于 `analyzeRankingProbability` |

#### 深度策略工作流 (`deepDive`)

| 节点 ID              | 类型  | 说明               | 可配置 | 在 API 中的使用                 |
| -------------------- | ----- | ------------------ | ------ | ------------------------------- |
| `deepdive-strategy`  | agent | 内容策略代理       | ✅     | 用于 `generateDeepDiveStrategy` |
| `deepdive-extract`   | agent | 核心关键词提取代理 | ✅     | 用于提取核心关键词              |
| `deepdive-seranking` | tool  | SE Ranking 工具    | ❌     | 系统工具                        |
| `deepdive-serp`      | tool  | SERP 验证工具      | ❌     | 系统工具                        |
| `deepdive-intent`    | agent | 意图和概率分析代理 | ✅     | 用于最终分析                    |

### 完整使用示例

```typescript
// 1. 获取工作流定义，了解可配置的节点
const workflowDef = await fetch("/api/workflows?id=mining").then((r) =>
  r.json()
);
console.log(
  "可配置的节点:",
  workflowDef.data.nodes.filter((n) => n.configurable)
);

// 2. 为关键词挖掘模式创建工作流配置
const configResponse = await fetch("/api/workflow-configs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    workflowId: "mining", // 必须匹配 keyword_mining 模式
    name: "我的SEO挖掘配置",
    nodes: [
      {
        id: "mining-gen",
        type: "agent",
        name: "Keyword Generation Agent",
        prompt: "你是一个SEO关键词专家，专注于生成高商业价值的关键词...",
        defaultPrompt: "Generate high-potential SEO keywords...",
      },
      {
        id: "mining-analyze",
        type: "agent",
        name: "SERP Analysis Agent",
        prompt: "分析SERP竞争情况，重点关注蓝海机会...",
        defaultPrompt: "Analyze SEO ranking opportunities...",
      },
    ],
  }),
});

const config = await configResponse.json();

// 3. 使用配置进行关键词挖掘（必须使用 keyword_mining 模式）
const result = await fetch("/api/seo-agent", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "keyword_mining", // 模式必须匹配 workflowId: 'mining'
    seedKeyword: "coffee shop",
    workflowConfigId: config.data.id, // 使用保存的配置
    targetLanguage: "ko",
    uiLanguage: "zh",
  }),
});
```

### 错误处理

如果工作流配置与模式不匹配，API 会返回清晰的错误信息：

```json
{
  "error": "Invalid workflow config",
  "message": "Workflow config is for \"batch\" workflow, but keyword_mining mode requires \"mining\" workflow",
  "expectedWorkflowId": "mining",
  "providedWorkflowId": "batch",
  "mode": "keyword_mining"
}
```

---

## 更新日志

### v1.1.0 (2024-01-XX)

- ✅ 添加工作流配置管理 API
- ✅ 支持自定义和保存提示词配置
- ✅ SEO Agent API 支持使用工作流配置

### v1.0.0 (2024-01-XX)

- 初始版本发布
- 支持三种模式：关键词挖掘、批量翻译分析、深度策略
- 统一 API 接口

---

## 技术支持

如有问题或建议，请联系技术支持团队。
