# 未使用文件清理报告

## 检查日期
2026-01-26

## 未使用的组件文件

### 1. Website 相关组件（完全未使用）
- ❌ `components/website/WebsiteRenderer.tsx` - 未被任何文件导入
- ❌ `components/website/SeoComponents.tsx` - 只被 WebsiteRenderer 使用，但 WebsiteRenderer 本身未被使用

**建议**: 这两个文件可以删除，除非计划在未来使用。

### 2. UI 组件（未使用）
- ❌ `components/ui/skeleton.tsx` - 定义了 Skeleton 组件，但从未被导入使用

**建议**: 如果不需要骨架屏加载效果，可以删除。

### 3. Website Data 组件（导出但未使用）
以下组件在 `components/website-data/index.ts` 中导出，但在实际代码中未被使用：

- ❌ `components/website-data/HistoricalRankChart.tsx` - 历史排名图表组件
- ❌ `components/website-data/RankingDistributionChart.tsx` - 排名分布图表组件
- ❌ `components/website-data/CompetitorsComparison.tsx` - 竞争对手对比组件

**注意**: `WebsiteDataDashboard.tsx` 只使用了 `OverviewCards`, `TopKeywordsTable`, `RankedKeywordsTable`, `RelevantPagesTable`，没有使用上述三个组件。

**建议**: 如果这些组件是计划中的功能但尚未实现，可以保留；如果不再需要，可以删除。

### 4. Article Generator 组件（导出但未使用）
以下组件在 `components/article-generator/index.ts` 中导出，但在实际代码中未被使用：

- ❌ `components/article-generator/ImagePlacementIndicator.tsx` - 图片位置指示器
- ❌ `components/article-generator/ContentStructureTree.tsx` - 内容结构树组件

**建议**: 如果这些是计划中的功能，可以保留；如果不再需要，可以删除。

## 脚本文件（需要确认）

以下脚本文件在 `scripts/` 目录中，但未在 `package.json` 中定义脚本命令：

- ⚠️ `scripts/clone-remote-db.ps1` - PowerShell 脚本，可能是手动运行
- ⚠️ `scripts/install-pg17-client.ps1` - PowerShell 脚本，可能是手动运行
- ⚠️ `scripts/manual-publish-test.ts` - TypeScript 脚本，可能是手动运行
- ⚠️ `scripts/setup-netlify.ts` - TypeScript 脚本，可能是手动运行
- ⚠️ `scripts/test-html-gen.ts` - TypeScript 脚本，可能是手动运行

**建议**: 这些脚本可能是开发/部署工具，需要确认是否还需要。

## API 端点（已确认使用）

以下 API 端点虽然看起来可能未使用，但实际上都有被调用：

- ✅ `api/generate-demo-content.ts` - 被 `ContentGenerationView.tsx` 使用
- ✅ `api/extract-document-text.ts` - 被 `ArticleInputConfig.tsx` 使用
- ✅ `api/extract-keywords.ts` - 被 `ContentGenerationView.tsx` 使用
- ✅ `api/scrape-website.ts` - 被 `ContentGenerationView.tsx` 和 `WebsiteManager.tsx` 使用
- ✅ `api/proxy-status.ts` - 被 `ProxySwitcher.tsx` 使用
- ✅ `api/workflow-configs.ts` - 被 `App.tsx` 使用
- ✅ `api/workflows.ts` - 被 `api/workflow-configs.ts` 使用
- ✅ `workflows.ts` (根目录) - 被 `App.tsx` 和 `api/workflows.ts` 使用

## 其他文件

- ✅ `backup.dump` - 可能是数据库备份文件，建议移到 `.gitignore` 或备份目录

## 清理建议

### 高优先级（可以安全删除）
1. `components/website/WebsiteRenderer.tsx`
2. `components/website/SeoComponents.tsx`
3. `components/ui/skeleton.tsx` (如果不需要骨架屏功能)

### 中优先级（需要确认是否计划使用）
1. `components/website-data/HistoricalRankChart.tsx`
2. `components/website-data/RankingDistributionChart.tsx`
3. `components/website-data/CompetitorsComparison.tsx`
4. `components/article-generator/ImagePlacementIndicator.tsx`
5. `components/article-generator/ContentStructureTree.tsx`

### 低优先级（开发工具，保留）
- `scripts/` 目录下的文件（开发/部署工具）

## 清理步骤

1. 删除未使用的组件文件
2. 更新相关的 `index.ts` 导出文件，移除未使用组件的导出
3. 检查是否有类型定义依赖这些组件，如果有需要一并清理
4. 运行项目确保没有破坏性更改
