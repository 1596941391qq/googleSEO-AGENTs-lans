# 文章重新发布功能实现

## 功能概述

为已发布的文章添加"更新"功能，允许用户快速重新发布文章内容到 GitHub + RTD，便于测试修复后的发布系统。

## UI 改进

### 修改前
- 已发布文章显示：编辑 + 复制链接 + 查看按钮（ExternalLink图标）
- 查看按钮占据主要位置

### 修改后
- **查看图标**：移到卡片右上角，变成小图标按钮（半透明，hover时完全显示）
- **更新按钮**：替换原来查看按钮的位置，蓝色主题，带 RefreshCw 图标
- **按钮布局**：编辑 + 复制链接 + 更新（已发布文章）

## 实现细节

### 1. 前端修改 (`components/article-generator/PublishTab.tsx`)

#### 新增状态
```typescript
const [republishingId, setRepublishingId] = useState<string | null>(null);
```

#### 新增 `handleRepublish` 函数
```typescript
const handleRepublish = async (articleId: string, websiteId?: string) => {
  try {
    setRepublishingId(articleId);

    const response = await apiClient.post('/api/articles/publish', {
      articleId,
      websiteId,
      forceUpdate: true // 标记为强制更新
    });

    if (response.success) {
      // 更新本地状态
      setArticles(prev => prev.map(a =>
        a.id === articleId
          ? {
              ...a,
              published_at: new Date().toISOString(),
              site_url: response.data.liveUrl,
            }
          : a
      ));

      // 显示成功提示
      setCopiedUrl('updated');
      setTimeout(() => setCopiedUrl(null), 3000);
    }
  } catch (error) {
    console.error("Republish error:", error);
    alert("Failed to republish article");
  } finally {
    setRepublishingId(null);
  }
};
```

#### UI 结构调整

**卡片右上角查看图标**：
```tsx
{article.status === 'published' && article.site_url && (
  <Button
    variant="ghost"
    size="icon"
    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full opacity-60 hover:opacity-100"
    onClick={() => window.open(article.site_url, '_blank')}
  >
    <ExternalLink className="w-4 h-4" />
  </Button>
)}
```

**已发布文章的按钮组**：
```tsx
{article.status === 'published' ? (
  <div className="flex items-center gap-2">
    <Button /* 复制链接 */ />
    <Button /* 更新按钮 - 蓝色主题 */ />
  </div>
) : (
  <Button /* 一键发布 - 绿色主题 */ />
)}
```

#### Toast 提示增强
```tsx
{copiedUrl && (
  <Card className={cn(
    copiedUrl === 'updated'
      ? "border-blue-500 bg-blue-500/10"  // 更新成功 - 蓝色
      : "border-emerald-500 bg-emerald-500/10"  // 复制成功 - 绿色
  )}>
    <span>
      {copiedUrl === 'updated'
        ? '文章已更新!'
        : '链接已复制!'}
    </span>
  </Card>
)}
```

### 2. 后端修改 (`api/articles/publish.ts`)

#### 接收 `forceUpdate` 参数
```typescript
const { articleId, projectId, forceUpdate } = body;
console.log(`[Publish API] ${forceUpdate ? 'Republishing' : 'Publishing'} article ${articleId}`);
```

#### 更新数据库逻辑
```typescript
await sql`
  UPDATE published_articles
  SET status = 'published',
      published_at = ${forceUpdate ? 'NOW()' : (article.published_at ? article.published_at : 'NOW()')},
      url_slug = ${urlSlug},
      content_type = ${contentType},
      updated_at = NOW()
  WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
`;
```

#### 返回响应增强
```typescript
return res.json({
  success: true,
  data: {
    message: forceUpdate
      ? `Article updated on ${publishResult.platform} successfully`
      : `Article published to ${publishResult.platform} successfully`,
    liveUrl: publishResult.articleUrl,
    // ... 其他字段
    isUpdate: forceUpdate || false  // 标记是否为更新操作
  }
});
```

### 3. 底层支持 (`api/_shared/services/pseo-publisher.ts`)

**无需修改**！现有的 `publishArticle` 函数已经支持更新：
- 使用 `createOrUpdateFile` 函数推送文件
- 如果文件已存在，会获取 SHA 并更新
- 如果文件不存在，会创建新文件

## 工作流程

### 首次发布
1. 用户点击"一键发布"（绿色按钮）
2. 系统创建 GitHub 仓库和 RTD 项目
3. 推送文章内容（HTML）
4. 更新 index.html
5. 返回发布 URL

### 重新发布（更新）
1. 用户点击"更新"（蓝色按钮）
2. 系统使用相同的 GitHub 仓库
3. **覆盖**已存在的文章文件（通过 SHA 更新）
4. 重新生成 index.html
5. GitHub 自动触发 RTD 重新构建
6. 显示"文章已更新!"提示

## 测试场景

### 场景 1：测试修复后的发布系统
1. 编辑一篇已发布的文章
2. 点击"更新"按钮
3. 查看控制台日志，验证：
   - `[PSEO Publisher] Article content length: XXX characters`
   - `[Markdown Converter] ✅ Conversion successful`
   - `[GitHub] ✅ File pushed successfully`
   - `[Static Site] ✅ Index rebuilt successfully`
4. 等待 2-5 分钟，访问 RTD URL
5. 验证内容已更新

### 场景 2：快速迭代测试
1. 修改文章内容
2. 点击"更新"
3. 重复多次，验证每次都能成功推送

### 场景 3：UI 交互测试
1. 验证右上角查看图标可点击
2. 验证更新按钮显示加载状态
3. 验证成功后显示蓝色 Toast
4. 验证复制链接按钮仍然工作

## 视觉设计

### 按钮颜色方案
- **一键发布**（草稿）：`bg-emerald-500` - 绿色，表示新建
- **更新**（已发布）：`bg-blue-500` - 蓝色，表示更新
- **编辑**：`variant="outline"` - 灰色边框
- **复制链接**：`border-emerald-500/20 text-emerald-500` - 绿色边框

### Toast 颜色方案
- **链接已复制**：`border-emerald-500 bg-emerald-500/10` - 绿色
- **文章已更新**：`border-blue-500 bg-blue-500/10` - 蓝色

### 图标位置
- **查看图标**：`absolute top-4 right-4` - 右上角浮动
- **按钮组**：`flex items-center gap-2` - 底部右侧水平排列

## 优势

1. **快速测试**：无需删除重新发布，直接更新即可
2. **保留 URL**：更新不会改变文章 URL，SEO 友好
3. **清晰反馈**：蓝色主题区分更新和首次发布
4. **节省空间**：查看图标移到右上角，释放按钮空间
5. **一致性**：复用现有发布逻辑，稳定可靠

## 注意事项

1. **RTD 构建时间**：更新后需要等待 2-5 分钟 RTD 重新构建
2. **缓存问题**：浏览器可能缓存旧内容，需要强制刷新（Ctrl+F5）
3. **并发限制**：同一时间只能更新一篇文章（通过 `republishingId` 控制）
4. **错误处理**：更新失败会显示 alert，不会影响文章状态

## 后续优化建议

1. **批量更新**：支持选择多篇文章批量更新
2. **版本历史**：记录每次更新的时间和内容变化
3. **差异对比**：更新前显示内容差异
4. **自动更新**：编辑保存后自动触发更新
5. **Webhook 通知**：RTD 构建完成后通知用户

---

**实现完成时间**: 2026-01-26
**修改文件数**: 2 个
**新增功能**: 文章重新发布（更新）
**UI 改进**: 查看图标移至右上角，更新按钮替换查看按钮
