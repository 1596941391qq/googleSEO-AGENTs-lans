# 文章保存和发布流程修复报告

## 修复日期
2026-02-10

## 问题描述

### 原始问题
用户报告：生成的文章保存后，仓库已经创建，但文章没有自动绑定到仓库（`site_id` 为空），需要在 Admin 界面手动绑定。

### 根本原因
之前的错误修复导致了新的问题：
1. **原始问题**（已修复）：文章保存时 `status = 'draft'`，但 Admin 查询时 `WHERE status = 'published'`，导致文章不显示
2. **错误的修复**（当前状态）：将保存时的状态改为 `status = 'published'`，导致保存和发布的概念混淆
3. **正确的设计**：
   - **保存**：`status = 'draft'`, `published_at = NULL`, `site_id = NULL`
   - **发布**：`status = 'published'`, `published_at = NOW()`, `site_id = <platform_site_id>`

## 修复内容

### 修改 1：修复保存 API
**文件**：`D:\google-seo-agent\api\articles\save.ts`（第 109 行）

**修改前**：
```typescript
'published', NOW()
```

**修改后**：
```typescript
'draft', NULL
```

**影响**：
- 所有新保存的文章将正确标记为 `draft` 状态
- `published_at` 为 `NULL`，表示还未发布
- 用户界面将正确显示文章状态

### 修改 2：确保发布流程正确更新 site_id
**文件**：`D:\google-seo-agent\api\_shared\services\pseo-publisher.ts`（第 370-375 行之后）

**添加逻辑**：
```typescript
} else {
  // 仓库存在但没有 platform_sites 记录，创建新记录
  console.log(`[PSEO Publisher] ⚠️ Repo exists but no platform_sites record found. Creating new record...`);

  try {
    const newSiteResult = await sql`
      INSERT INTO platform_sites (
        github_token_id,
        platform_token_id,
        platform,
        content_type,
        site_name,
        site_url,
        repo_name,
        status,
        usage_count
      )
      VALUES (
        ${github_token.id},
        ${netlify_token.id},
        'netlify',
        'informational',
        ${siteName},
        '',
        ${repoName},
        'active',
        1
      )
      RETURNING id
    `;

    if (newSiteResult.rows.length > 0) {
      platformSiteId = newSiteResult.rows[0].id;
      console.log(`[PSEO Publisher] ✅ Created new platform_site record: ${platformSiteId}`);
    }
  } catch (insertError: any) {
    console.error(`[PSEO Publisher] ❌ Failed to create platform_sites record: ${insertError.message}`);
    // 继续执行，不阻塞发布流程
  }
}
```

**影响**：
- 当仓库已存在但没有 `platform_sites` 记录时，会自动创建新记录
- 确保 `platformSiteId` 被正确返回并更新到文章记录
- 用户不再需要在 Admin 界面手动绑定

### 修改 3：修复 Admin 界面查询（显示草稿文章）

**文件**：`D:\google-seo-agent\api\admin\published.ts`（第 27-43 行）

**修改前**：
```sql
WHERE pa.status = 'published'
ORDER BY pa.published_at DESC
```

**修改后**：
```sql
WHERE pa.status IN ('draft', 'published')
ORDER BY COALESCE(pa.published_at, pa.created_at) DESC
```

**影响**：
- Admin 界面现在显示所有文章（草稿 + 已发布）
- 草稿文章按 `created_at` 排序，已发布文章按 `published_at` 排序
- 最新的文章（无论状态）排在前面

## 验证步骤

### 1. 验证保存流程

1. 打开 http://localhost:3002
2. 生成一篇新文章
3. 点击"保存"按钮
4. 检查数据库：
   ```sql
   SELECT id, title, status, published_at, site_id
   FROM published_articles
   ORDER BY created_at DESC
   LIMIT 1;
   ```
5. **预期结果**：
   - `status = 'draft'`
   - `published_at = NULL`
   - `site_id = NULL`

### 2. 验证发布流程

1. 在 PublishTab 中找到刚保存的文章
2. 点击"一键发布"按钮
3. 等待发布完成
4. 检查数据库：
   ```sql
   SELECT id, title, status, published_at, site_id
   FROM published_articles
   WHERE id = '<article_id>';
   ```
5. **预期结果**：
   - `status = 'published'`
   - `published_at` 有值
   - `site_id` 有值（UUID）

### 3. 验证 Admin 界面

1. 打开 Admin 界面（http://localhost:3002/admin）
2. 确认显示所有文章（包括草稿和已发布）
3. 草稿文章应该显示 `status = 'draft'`
4. 已发布文章应该显示 `status = 'published'` 且有 `site_id`

## 数据清理（可选）

如果数据库中存在错误数据（`status = 'published'` 但 `site_id = NULL`），可以运行以下 SQL 清理：

```sql
UPDATE published_articles
SET status = 'draft',
    published_at = NULL
WHERE status = 'published'
  AND site_id IS NULL;
```

## TypeScript 类型检查

✅ 已通过 TypeScript 类型检查：
```bash
cd "D:\google-seo-agent" && npx tsc --noEmit
```

## 影响范围

### 修改 1（保存 API）
- **影响**：所有新保存的文章
- **风险**：低（只是改变初始状态）
- **测试**：保存文章后检查状态

### 修改 2（PSEO Publisher）
- **影响**：所有发布流程
- **风险**：中（涉及复杂的发布逻辑）
- **测试**：完整的发布流程测试

### 修改 3（Admin 查询）
- **影响**：Admin 界面显示
- **风险**：低（只是查询条件）
- **测试**：Admin 界面显示正确（包括草稿和已发布）

## 总结

### 核心问题
之前的修复方案（将保存时的状态改为 `'published'`）是错误的，导致：
1. 保存和发布的概念混淆
2. 文章保存后显示为"已发布"，但实际上还没有发布
3. 统计数据不准确
4. 用户界面显示混乱

### 正确的设计
- **保存**：`status = 'draft'`, `published_at = NULL`, `site_id = NULL`
- **发布**：`status = 'published'`, `published_at = NOW()`, `site_id = <platform_site_id>`

### 修复步骤
1. ✅ 回滚保存 API 的修改（`'published'` → `'draft'`）
2. ✅ 确保发布流程正确更新 `site_id`（处理仓库已存在的情况）
3. ✅ 修复 Admin 查询条件（显示草稿和已发布文章）
4. ⏳ 可选：清理数据库中的错误数据
4. ⏳ 可选：调整 Admin 查询条件（是否显示草稿）

### 验证方法
- 保存文章 → 检查 `status = 'draft'`
- 发布文章 → 检查 `status = 'published'` 且 `site_id` 有值
- Admin 界面 → 只显示真正已发布的文章
