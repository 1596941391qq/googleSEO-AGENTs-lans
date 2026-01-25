# 平台重新构建 API 实现

## 问题

之前的发布系统依赖 GitHub webhook 自动触发平台重新构建，但这种方式不稳定：
- Webhook 可能配置不正确
- 网络问题导致 webhook 失败
- 某些平台可能没有正确设置 webhook
- 无法确保文章发布后立即可见

## 解决方案

**主动调用平台重新构建 API**，不依赖 webhook，确保每次发布/更新文章后都触发构建。

## 实现细节

### 1. 新增重新构建 API 函数

在 `api/_shared/services/platform-deployers.ts` 中添加：

#### Read the Docs
```typescript
triggerRTDBuild(config: { token: string; projectSlug: string })
```
- API: `POST /api/v3/projects/{slug}/versions/latest/builds/`
- 触发最新版本的构建

#### Cloudflare Pages
```typescript
triggerCFPagesBuild(config: { token: string; accountId: string; projectName: string })
```
- API: `POST /accounts/{accountId}/pages/projects/{projectName}/deployments`
- 触发新的部署

#### Netlify
```typescript
triggerNetlifyBuild(config: { token: string; siteId: string })
```
- API: `POST /api/v1/sites/{siteId}/builds`
- 触发站点构建

#### Vercel
```typescript
triggerVercelBuild(config: { token: string; projectId: string; repoOwner: string; repoName: string })
```
- API: `POST /v13/deployments`
- 创建新的部署

#### GitHub Pages
```typescript
triggerGitHubPagesBuild(config: { token: string; owner: string; repoName: string })
```
- API: `POST /repos/{owner}/{repo}/pages/builds`
- 触发 Pages 构建

### 2. 统一接口

```typescript
triggerPlatformRebuild(
  platform: PlatformType,
  config: {
    platformToken: string | null;
    githubToken: string;
    repoOwner: string;
    repoName: string;
    projectId?: string;
    projectSlug?: string;
    cfAccountId?: string;
  }
): Promise<RebuildResult>
```

根据平台类型自动调用对应的重新构建函数。

### 3. 数据库迁移

添加 `platform_project_id` 字段到 `platform_sites_v2` 表：

```sql
ALTER TABLE platform_sites_v2 ADD COLUMN platform_project_id VARCHAR(200);
```

用于存储平台项目 ID（RTD slug、Netlify site ID、Vercel project ID 等），方便后续触发重新构建。

### 4. 发布流程集成

在 `pseo-publisher.ts` 的 `publishArticle()` 和 `updatePublishedArticle()` 函数中：

```typescript
// 推送文章到 GitHub 后
await addArticleToMkDocs(...);

// 主动触发平台重新构建
const rebuildResult = await triggerPlatformRebuild(
  site.platform as PlatformType,
  {
    platformToken: platformTokenDecrypted,
    githubToken: githubTokenDecrypted,
    repoOwner: github_token.owner_name,
    repoName: site.repo_name,
    projectId: site.platform_project_id,
    projectSlug: site.platform_project_id || site.site_name,
    cfAccountId: platform_token?.metadata?.accountId,
  }
);

if (!rebuildResult.success) {
  console.warn(`Platform rebuild failed: ${rebuildResult.error}`);
  // 不阻断发布流程，只是警告
} else {
  console.log(`Platform rebuild triggered. Build ID: ${rebuildResult.buildId}`);
}
```

### 5. 初始化时保存项目 ID

在 `initializeSite()` 函数中，创建平台项目后保存 project ID：

```typescript
const deployResult = await deployToPlatform(...);

if (deployResult.projectId) {
  await updatePlatformSiteProjectId(site.id, deployResult.projectId);
}
```

## 优势

✅ **可靠性**：不依赖 webhook，主动触发构建
✅ **即时性**：发布后立即触发构建，文章快速上线
✅ **可追踪**：返回 build ID，可以追踪构建状态
✅ **容错性**：构建失败不阻断发布流程，只记录警告
✅ **通用性**：支持所有主流平台（RTD、CF Pages、Netlify、Vercel、GitHub Pages）

## 使用流程

1. **首次发布**：
   - 创建 GitHub 仓库
   - 在平台创建项目（获取 project ID）
   - 保存 project ID 到数据库
   - 推送文章到 GitHub
   - **触发平台重新构建**

2. **后续发布/更新**：
   - 推送文章到 GitHub
   - **触发平台重新构建**（使用已保存的 project ID）

## 测试

- [ ] 测试 RTD 重新构建 API
- [ ] 测试 Cloudflare Pages 重新构建 API
- [ ] 测试 Netlify 重新构建 API
- [ ] 测试 Vercel 重新构建 API
- [ ] 测试 GitHub Pages 重新构建 API
- [ ] 验证 project ID 正确保存到数据库
- [ ] 确认构建失败不阻断发布流程

## 注意事项

1. **API 限制**：各平台可能有 API 调用频率限制，需要注意
2. **Token 权限**：确保 platform token 有触发构建的权限
3. **构建时间**：构建需要时间，文章不会立即可见（通常 1-5 分钟）
4. **错误处理**：构建失败只记录警告，不影响发布流程
5. **Project ID**：首次部署时必须保存 project ID，否则后续无法触发构建
