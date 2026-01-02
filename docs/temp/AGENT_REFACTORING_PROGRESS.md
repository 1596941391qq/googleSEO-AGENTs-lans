# Agent 重构进度跟踪

**开始时间**: 2026-01-02  
**最后更新**: 2026-01-02  
**状态**: Phase 1 已完成，Phase 2 已完成，Phase 3 已完成

---

## Phase 1: 共享工具层提取

- [x] Task 1.1: 创建工具层目录结构
- [x] Task 1.2: 提取 SE Ranking 工具
- [x] Task 1.3: 提取 SERP 搜索工具
- [x] Task 1.4: ~~实现 Google Search Console 工具~~ (已删除，使用 SE Ranking API 替代)
- [x] Task 1.5: 移动 Firecrawl 工具
- [x] Task 1.6: 更新工具层导出

**Phase 1 完成时间**: 2026-01-02

### Phase 1 实施详情

**Task 1.1: 创建工具层目录结构** ✅

- 创建 `api/_shared/tools/` 目录
- 创建 `api/_shared/tools/index.ts` 导出文件

**Task 1.2: 提取 SE Ranking 工具** ✅

- 创建 `api/_shared/tools/se-ranking.ts`
- 提取 `fetchSErankingData` 函数
- 提取 `fetchSingleKeywordData` 函数

**Task 1.3: 提取 SERP 搜索工具** ✅

- 创建 `api/_shared/tools/serp-search.ts`
- 提取 `fetchSerpResults` 函数
- 提取 `fetchSerpResultsBatch` 函数

**Task 1.4: 实现 Google Search Console 工具** ❌ (已删除 - 2026-01-02)

- ~~创建 `api/_shared/tools/google-search-console.ts`~~ (已删除)
- ~~实现相关函数~~ (已删除)
- **删除原因**：SE Ranking API 已提供域名分析和历史趋势功能，无需 Google Search Console
- **替代方案**：使用 SE Ranking API 的 Domain Analysis 功能（`/v1/domain/` 端点）

**Task 1.5: 移动 Firecrawl 工具** ✅ (2026-01-02)

- 将 `api/_shared/firecrawl.ts` 移动到 `api/_shared/tools/firecrawl.ts`
- 更新 `api/website-data/get-pages.ts` 的导入路径
- 更新 `api/scrape-website.ts` 的导入路径
- 保留所有函数：`scrapeWebsite` 和 `getWebsiteMap`

**Task 1.6: 更新工具层导出** ✅ (2026-01-02)

- 更新 `api/_shared/tools/index.ts`
- 导出所有工具：se-ranking, serp-search, firecrawl
- 工具层现在完整可用
- 注意：已删除 google-search-console（使用 SE Ranking API 替代）

---

## Phase 2: Agent 层重构

- [x] Task 2.1: 创建 Agent 层目录结构
- [x] Task 2.2: 重构 Agent 1（已完成）
- [x] Task 2.3: 实现 Agent 2（已完成）
- [x] Task 2.4: 实现 Agent 3（已完成）
- [x] Task 2.5: 实现 Agent 4（已完成）
- [x] Task 2.6: 实现 Agent 5（已完成）
- [x] Task 2.7: 更新 Agent 层导出（已完成）

### Phase 2 实施详情

**Task 2.1: 创建 Agent 层目录结构** ✅ (2026-01-02)

- 创建 `api/_shared/agents/` 目录
- 创建 `api/_shared/agents/index.ts` 导出文件

**Task 2.2: 重构 Agent 1** ✅ (2026-01-02 - 已完成)

- 创建 `api/_shared/agents/agent-1-keyword-mining.ts`
- 提取 `generateKeywords` 函数到 Agent 1
- 使用 `getKeywordMiningPrompt` 从 prompts 服务获取 prompt
- 添加类型定义 `KeywordMiningInput` 和 `KeywordMiningOutput`
- 更新 `api/_shared/agents/index.ts` 导出 Agent 1
- ✅ 更新 `api/generate-keywords.ts` 使用新的 Agent 1 导入路径
- ✅ 更新 `api/seo-agent.ts` 使用新的 Agent 1 导入路径
- ✅ 所有调用点已更新，Task 2.2 完成

**Task 2.3: 实现 Agent 2** ✅ (2026-01-02 - 已完成)

- 创建 `api/_shared/agents/agent-2-seo-researcher.ts`
- 实现 `analyzeSearchPreferences` 函数 - 分析搜索引擎偏好
- 实现 `analyzeCompetitors` 函数 - 分析竞争对手
- 使用 `getSEOResearcherPrompt` 从 prompts 服务获取 prompt
- 调用工具层 `fetchSerpResults` 获取 SERP 数据
- 添加类型定义 `SearchPreferencesResult` 和 `CompetitorAnalysisResult`
- 更新 `api/_shared/agents/index.ts` 导出 Agent 2
- ✅ Task 2.3 完成

**Task 2.4: 实现 Agent 3** ✅ (2026-01-02 - 已完成)

- 创建 `api/_shared/agents/agent-3-content-writer.ts`
- 实现 `generateContent` 函数 - 基于 SEO 研究生成内容
- 接收 SEO 策略报告、搜索引擎偏好分析、竞争对手分析作为输入
- 使用 `getContentWriterPrompt` 从 prompts 服务获取 prompt
- 添加类型定义 `ContentGenerationResult`
- 更新 `api/_shared/agents/index.ts` 导出 Agent 3
- ✅ Task 2.4 完成

**Task 2.5: 实现 Agent 4** ✅ (2026-01-02 - 已完成)

- 创建 `api/_shared/agents/agent-4-quality-reviewer.ts`
- 实现 `reviewQuality` 函数 - 审查内容质量
- 检查关键词密度、AI 检测、可读性等
- 使用 `getQualityReviewerPrompt` 从 prompts 服务获取 prompt
- 添加类型定义 `QualityReviewResult`
- 更新 `api/_shared/agents/index.ts` 导出 Agent 4
- ✅ Task 2.5 完成

**Task 2.6: 实现 Agent 5** ✅ (2026-01-02 - 已完成)

- 创建 `api/_shared/agents/agent-5-image-creative.ts`
- 实现 `extractVisualThemes` 函数 - 提取视觉主题
- 实现 `generateImagePrompts` 函数 - 生成 Nano Banana 2 prompt
- 实现 `generateImages` 函数 - 调用 Nano Banana 2 API（可选）
- 使用 `getImageCreativePrompt` 和 `getNanoBananaPrompt` 从 prompts 服务获取 prompt
- 添加类型定义 `VisualTheme`, `VisualThemesResult`, `ImagePromptResult`
- 更新 `api/_shared/agents/index.ts` 导出 Agent 5
- ✅ Task 2.6 完成

**Task 2.7: 更新 Agent 层导出** ✅ (2026-01-02 - 已完成)

- 更新 `api/_shared/agents/index.ts`
- 导出所有 Agent：Agent 1-5
- ✅ Task 2.7 完成，Phase 2 完成

---

## Phase 3: 服务层实现

- [x] Task 3.1: 创建服务层目录结构
- [x] Task 3.2: 实现 Keyword Mining 服务
- [x] Task 3.3: 实现 Deep Dive 服务
- [x] Task 3.4: 实现 Batch Analysis 服务

**Phase 3 完成时间**: 2026-01-02

### Phase 3 实施详情

**Task 3.1: 创建服务层目录结构** ✅ (2026-01-02)

- 创建 `api/_shared/services/` 目录
- 创建 `api/_shared/services/index.ts` 导出文件

**Task 3.2: 实现 Keyword Mining 服务** ✅ (2026-01-02)

- 创建 `api/_shared/services/keyword-mining-service.ts`
- 实现 `executeKeywordMining` 函数
- 编排流程：
  1. 调用 Agent 1 生成关键词
  2. 调用 SE Ranking 工具获取数据
  3. 使用 `analyzeRankingProbability` 做快速筛选
  4. 返回关键词列表
- 添加错误处理和日志
- ✅ Task 3.2 完成

**Task 3.3: 实现 Deep Dive 服务** ✅ (2026-01-02)

- 创建 `api/_shared/services/deep-dive-service.ts`
- 实现 `executeDeepDive` 函数
- 编排 8 步流程：
  - Step 1-2: 调用 Agent 2 做 SEO 研究（搜索引擎偏好、竞争对手分析）
  - Step 3-5: 生成 SEO 策略报告、提取核心关键词、获取 SE Ranking 和 SERP 数据
  - Step 6: 调用 Agent 3 生成内容
  - Step 7: 调用 Agent 4 质量审查
  - Step 8: 调用 Agent 5 生成图像（可选）
- 添加进度回调支持
- 添加错误处理和恢复机制
- ✅ Task 3.3 完成

**Task 3.4: 实现 Batch Analysis 服务** ✅ (2026-01-02)

- 创建 `api/_shared/services/batch-analysis-service.ts`
- 实现 `executeBatchAnalysis` 函数
- 编排批量翻译和分析流程：
  1. 解析和翻译关键词
  2. 获取 SE Ranking 数据
  3. 分析排名概率
- 复用 Keyword Mining 服务的分析逻辑
- ✅ Task 3.4 完成，Phase 3 完成

---

## Phase 4: API 端点重构

- [ ] Task 4.1: 重构 Keyword Mining API
- [ ] Task 4.2: 重构 Deep Dive API
- [ ] Task 4.3: 创建独立 Agent API 端点（可选）
- [ ] Task 4.4: 创建测试 Agent 模式（仅本地开发环境）

### Phase 4 实施详情

**Task 4.4: 创建测试 Agent 模式** ⏳ (待开始)

- 创建 `api/test-agents.ts` API 端点
- 仅在开发环境（`NODE_ENV !== 'production'`）下启用
- 创建假数据生成器 `api/_shared/test-data/mock-data-generator.ts`
- 为每个 Agent 提供假数据输入和测试接口
- 支持单独测试每个 Agent 和组合流程
- 在前端 UI 中添加测试模式入口（仅开发环境显示）
- **目标**: 允许开发者在本地环境中快速测试所有 Agent，无需真实的 API 调用

---

## Phase 5: 清理和优化

- [ ] Task 5.1: 清理 gemini.ts
- [ ] Task 5.2: 更新类型定义
- [ ] Task 5.3: 更新文档
- [ ] Task 5.4: 测试和修复
