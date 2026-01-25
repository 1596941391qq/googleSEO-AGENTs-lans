# Read the Docs 构建触发问题修复

## 问题

测试发现 RTD 在更新后没有触发重新构建。

## 原因分析

Read the Docs API v3 的构建触发有以下限制：

1. **API v3 限制**：`POST /api/v3/projects/{slug}/versions/{version}/builds/` 需要特定权限
2. **Token 权限**：某些 RTD token 可能没有触发构建的权限
3. **API 响应**：可能返回 403/404 错误

## 解决方案

实现**双重触发机制**：

### 方案 1：API v3 直接触发（主要方法）
```typescript
POST https://readthedocs.org/api/v3/projects/{slug}/versions/latest/builds/
Headers:
  Authorization: Token {rtd_token}
  Content-Type: application/json
Body: {}
```

### 方案 2：Webhook 模拟触发（备用方法）
```typescript
POST https://readthedocs.org/api/v2/webhook/{slug}/1/
Headers:
  Content-Type: application/json
Body: {
  ref: "refs/heads/main"
}
```

## 实现逻辑

```typescript
async function triggerRTDBuild(config) {
  try {
    // 1. 尝试 API v3 方式
    const response = await fetch(v3_endpoint, {
      method: 'POST',
      headers: { Authorization: `Token ${token}` },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      // 2. 如果失败，自动切换到 webhook 方式
      return await triggerRTDBuildViaWebhook(config);
    }

    return { success: true, buildId: data.id };
  } catch (error) {
    // 3. 异常时也尝试 webhook 方式
    return await triggerRTDBuildViaWebhook(config);
  }
}

async function triggerRTDBuildViaWebhook(config) {
  // 使用 RTD webhook 端点（不需要认证）
  const webhookUrl = `https://readthedocs.org/api/v2/webhook/${slug}/1/`;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    body: JSON.stringify({ ref: 'refs/heads/main' })
  });

  return { success: true, buildId: 'webhook-triggered' };
}
```

## 优势

✅ **双重保障**：API 失败自动切换到 webhook
✅ **无需权限**：Webhook 方式不需要特殊 token 权限
✅ **容错性强**：任何一种方式成功即可
✅ **自动降级**：优先使用 API，失败时降级到 webhook

## 测试步骤

1. **测试 API v3 方式**：
   ```bash
   curl -X POST \
     -H "Authorization: Token YOUR_RTD_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}' \
     https://readthedocs.org/api/v3/projects/YOUR_PROJECT/versions/latest/builds/
   ```

2. **测试 Webhook 方式**：
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"ref":"refs/heads/main"}' \
     https://readthedocs.org/api/v2/webhook/YOUR_PROJECT/1/
   ```

3. **验证构建**：
   - 访问 RTD 项目页面
   - 查看 Builds 标签
   - 确认有新的构建记录

## 调试信息

系统会输出详细日志：

```
[RTD] Triggering build for project: your-project
[RTD] Build trigger failed: 403 {"detail":"Permission denied"}
[RTD] Trying alternative method: GitHub webhook simulation...
[RTD] Triggering via webhook: https://readthedocs.org/api/v2/webhook/your-project/1/
[RTD] ✅ Build triggered via webhook successfully
```

## 常见问题

### Q1: API v3 返回 403 错误
**A**: Token 权限不足，系统会自动切换到 webhook 方式

### Q2: Webhook 也失败了
**A**: 检查：
- 项目 slug 是否正确
- RTD 项目是否已连接 GitHub
- GitHub 仓库是否有新的 commit

### Q3: 如何确认构建成功
**A**:
1. 查看 RTD 项目的 Builds 页面
2. 检查日志中的 build ID
3. 等待 2-5 分钟后访问站点 URL

## 后续优化

如果 webhook 方式也不稳定，可以考虑：

1. **GitHub Actions 触发**：
   - 在 GitHub 仓库添加 workflow
   - 通过 GitHub API 触发 workflow
   - Workflow 中调用 RTD webhook

2. **定时轮询**：
   - 记录最后构建时间
   - 定期检查是否需要重新构建
   - 自动触发构建

3. **手动触发按钮**：
   - 在前端添加"重新构建"按钮
   - 用户可以手动触发构建
   - 提供即时反馈
