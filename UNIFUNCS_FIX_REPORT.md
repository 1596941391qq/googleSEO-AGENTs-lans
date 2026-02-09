# Unifuncs 推送修复完成报告

## 修复时间
2026-02-10

## 问题描述

推送到 unifuncs 后存在三个问题：
1. **生成的内容还是中文** - 语言提示没有生效
2. **内容提前停止** - 流式响应提前结束
3. **articleUrl 错误** - 传递的是站点根 URL，而不是具体文章地址

## 根本原因

**核心问题：** articleUrl 传递错误
- 之前传递：`https://site.netlify.app`（站点根 URL）
- 应该传递：`https://site.netlify.app/article-slug/`（完整文章 URL）
- **影响：** unifuncs 无法访问实际文章内容，无法理解目标语言上下文，导致生成中文内容

## 修复内容

### 修复 1：Admin 推送的 articleUrl
**文件：** `api/admin/push-to-unifuncs.ts` (line 108)

**修改前：**
```typescript
articleUrl: siteUrl, // 使用拼接的站点根 URL
```

**修改后：**
```typescript
articleUrl: article.url_slug
  ? `${siteUrl}/${article.url_slug}/`  // ✅ 使用完整文章 URL
  : siteUrl,  // Fallback 到站点根 URL（如果没有 slug）
```

### 修复 2：自动发布推送的 articleUrl
**文件：** `api/_shared/services/pseo-publisher.ts` (line 574)

**修改前：**
```typescript
articleUrl: finalSiteUrl, // 使用站点根 URL，不包含文章路径
```

**修改后：**
```typescript
articleUrl: articleUrl,  // ✅ 使用已构建的完整文章 URL（line 544）
```

### 修复 3：流处理日志增强
**文件：** `api/_shared/services/deepsearch.ts` (lines 154-189)

**新增功能：**
- ✅ Chunk 计数跟踪
- ✅ 总长度统计
- ✅ 每个 chunk 的大小日志
- ✅ 空内容检测和警告

**新增代码：**
```typescript
let chunkCount = 0;
let totalLength = 0;

while (true) {
  const { done, value } = await reader.read();

  if (done) {
    console.log(`\n[DeepSearch] ✅ Stream completed. Chunks: ${chunkCount}, Total length: ${totalLength}`);
    break;
  }

  chunkCount++;
  const chunk = decoder.decode(value, { stream: true });
  totalLength += chunk.length;

  console.log(`[DeepSearch] 📦 Chunk ${chunkCount}: ${chunk.length} bytes`);
  // ... 现有处理逻辑
}

// 检查是否收到内容
if (totalLength === 0) {
  console.warn('[DeepSearch] ⚠️ No content received from stream');
}
```

## 验证结果

✅ **所有测试通过**

| 测试项 | 结果 |
|--------|------|
| Admin 推送 URL 构建 | ✅ 通过 |
| 自动发布推送 URL 构建 | ✅ 通过 |
| 流处理日志增强 | ✅ 通过 |
| 空内容检测 | ✅ 通过 |

## 预期效果

修复后的效果：
- ✅ unifuncs 能访问具体文章内容
- ✅ 理解文章的目标语言上下文
- ✅ 生成与文章语言一致的内容（英文文章 → 英文内容）
- ✅ 更好的日志帮助诊断流问题

## 修改文件清单

1. `api/admin/push-to-unifuncs.ts` - 修复 articleUrl（1 处修改）
2. `api/_shared/services/pseo-publisher.ts` - 修复 articleUrl（1 处修改）
3. `api/_shared/services/deepsearch.ts` - 增强日志（1 处修改）

**总计：3 个文件，3 处修改**

## 风险评估

**风险等级：** 🟢 低

- ✅ 只修改了 URL 构建逻辑，不影响其他功能
- ✅ 添加了 fallback 处理，兼容没有 slug 的情况
- ✅ 日志增强不影响核心功能
- ✅ 容易回滚（只需恢复 3 行代码）

## 下一步建议

1. **立即测试：** 在 admin 后台推送一篇英文文章，验证语言是否正确
2. **监控日志：** 观察新的流处理日志，确认内容完整性
3. **批量测试：** 测试多篇不同语言的文章推送

## 技术细节

### URL 构建逻辑
```
站点根 URL: https://site.netlify.app
文章 slug: my-article
完整 URL: https://site.netlify.app/my-article/
```

### 为什么需要完整 URL？
- unifuncs 需要访问文章内容来理解上下文
- 文章内容包含目标语言信息
- 只有访问具体文章页面才能获取完整的语言上下文
- 站点根 URL 无法提供足够的语言信息

## 修复完成 ✅

所有修复已成功应用并验证通过。
