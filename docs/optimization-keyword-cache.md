# 存量拓新流程优化：关键词分析缓存机制

## 优化目标

消除工作流3（存量拓新+关键词挖掘）和工作流4（存量拓新+跨市场洞察）之间的冗余步骤，通过缓存机制避免重复的 DataForSEO API 调用和 Agent 2 SERP 分析。

## 优化内容

### 1. 创建关键词分析缓存表

**文件**: `api/lib/database.ts`

新增 `keyword_analysis_cache` 表，存储：
- DataForSEO 数据（volume, difficulty, CPC, competition, history_trend）
- Agent 2 分析结果（probability, searchIntent, intentAnalysis, reasoning, SERP snippets 等）
- DR 相关数据（website_dr, competitor_drs, top3/top10 probability）
- 缓存元数据（location_code, search_engine, website_id, cache_expires_at）

**唯一约束**:
- 使用部分唯一索引处理 `website_id` 可能为 NULL 的情况
- `website_id IS NULL`: (keyword, location_code, search_engine) 唯一
- `website_id IS NOT NULL`: (keyword, location_code, search_engine, website_id) 唯一

### 2. 工作流3：保存分析结果到缓存

**文件**: `api/_shared/agents/agent-1-website-audit.ts`

在 Step 7 新增缓存保存逻辑：
- 在工作流3完成 DataForSEO 和 Agent 2 分析后，将结果保存到缓存
- 保存字段包括所有 DataForSEO 数据和 Agent 2 分析结果
- 缓存过期时间：7天

### 3. 工作流4：优先使用缓存

**文件**: `api/batch-translate-analyze.ts`

优化 Step 2 和 Step 3：

**Step 2 优化**:
1. 先从缓存批量查询关键词分析结果
2. 如果缓存中有 DataForSEO 数据，直接使用，跳过 API 调用
3. 只对缓存中没有的关键词调用 DataForSEO API
4. 如果缓存中有完整的 Agent 2 分析结果（相同 market/engine），直接使用，跳过 Agent 2 分析

**Step 3 优化**:
1. 只对缓存中没有完整分析结果的关键词调用 Agent 2
2. 将新分析的结果保存到缓存，供后续使用

### 4. 缓存查询和保存函数

**文件**: `api/lib/database.ts`

新增函数：
- `getKeywordAnalysisCache()`: 查询单个关键词的缓存
- `getKeywordAnalysisCacheBatch()`: 批量查询关键词缓存
- `saveKeywordAnalysisCache()`: 保存/更新关键词分析缓存

## 优化效果

### 预期收益

1. **DataForSEO API 调用减少**: 50%+
   - 工作流4如果使用相同市场/引擎的关键词，直接从缓存读取

2. **Agent 2 SERP 分析减少**: 30-50%
   - 如果缓存中有完整的分析结果（相同 market/engine），直接复用

3. **用户等待时间减少**: 40-60%
   - 跳过 API 调用和 AI 分析，直接返回缓存结果

4. **成本节省**: 
   - DataForSEO API 费用减少 50%+
   - Gemini API 调用减少 30-50%

### 缓存策略

- **缓存键**: (keyword, location_code, search_engine, website_id)
- **缓存过期**: 7天
- **缓存优先级**: 
  - 如果 `website_id` 存在，优先使用网站特定的缓存
  - 否则使用通用缓存（website_id = NULL）

## 使用场景

### 场景1：工作流3 → 工作流4（相同市场/引擎）

```
工作流3: 分析 "生酮饮食" (zh, Google)
  → 保存到缓存: (生酮饮食, 2166, google, website_id)

工作流4: 跨市场分析 "生酮饮食" (zh, Google)
  → 从缓存读取: 跳过 DataForSEO 和 Agent 2，直接返回结果
  → 节省: 2个 API 调用 + 1个 Agent 2 分析
```

### 场景2：工作流3 → 工作流4（不同市场/引擎）

```
工作流3: 分析 "keto diet" (en, Google)
  → 保存到缓存: (keto diet, 2840, google, website_id)

工作流4: 跨市场分析 "keto diet" (zh, Baidu)
  → 从缓存读取: 只有 DataForSEO 数据（不同市场），使用缓存跳过 DataForSEO API
  → 仍需调用: Agent 2（不同市场/引擎需要重新分析 SERP）
  → 节省: 1个 DataForSEO API 调用
```

## 注意事项

1. **缓存一致性**: 
   - 缓存使用 DELETE + INSERT 策略（先删除再插入），在并发情况下可能存在短暂不一致
   - 缓存失败不影响主流程，采用"优雅降级"策略

2. **缓存过期**:
   - 7天过期时间可以根据实际需求调整
   - 过期后自动重新获取最新数据

3. **向后兼容**:
   - 如果缓存表不存在或查询失败，自动降级到原有的 API 调用流程
   - 不影响现有功能

## 后续优化建议

1. **缓存预热**: 在工作流3完成后，可以预先分析多个市场/引擎的组合
2. **缓存统计**: 添加缓存命中率统计，评估优化效果
3. **缓存清理**: 定期清理过期的缓存记录，节省数据库空间
4. **智能缓存**: 根据关键词热度动态调整缓存过期时间
