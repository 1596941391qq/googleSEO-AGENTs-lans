# 网站数据页面调试指南

## 问题: 网站数据页面没有显示数据

### 诊断步骤

#### 1. 检查前端状态

打开浏览器开发者工具 (F12)，在 Console 中执行:

```javascript
// 检查当前绑定的网站
const websiteData = localStorage.getItem('google_seo_bound_website');
console.log('当前绑定的网站:', JSON.parse(websiteData || 'null'));

// 检查传递给 WebsiteDataDashboard 的 websiteId
// 在 WebsiteDataDashboard.tsx:114 行设置了断点，查看 websiteId 的值
```

**预期结果:**
- 应该看到一个包含 `id`, `url`, `domain` 等字段的对象
- `id` 字段不应该是 null、undefined 或空字符串

**如果失败:** 网站未正确绑定，需要先在 "Website Manager" 中绑定网站

---

#### 2. 检查控制台日志

在浏览器 Console 中查看日志:

```
[Dashboard] 🚀 Starting parallel data loading for websiteId: xxx
[Dashboard] ⚠️ No cache found, will fetch from API
[update-metrics] Fetching data from DataForSEO API (primary source)...
```

**关键日志:**
- ✅ `[Dashboard] ✅ overview loaded in XXXms` - 成功获取概览数据
- ❌ `[Dashboard] ❌ overview API error: 404` - websiteId 不存在
- ❌ `[update-metrics] ❌ DataForSEO API error` - API 调用失败

---

#### 3. 检查 API 响应

在 Network 标签中查看 API 请求:

**检查 `/api/website-data/overview-only` 请求:**
```json
// 请求体
{
  "websiteId": "xxx-xxx-xxx",
  "userId": 1
}

// 成功响应 (有数据)
{
  "success": true,
  "data": {
    "organicTraffic": 1000,
    "totalKeywords": 50,
    ...
  },
  "cached": true
}

// 成功响应 (无数据)
{
  "success": true,
  "data": null,
  "cached": false
}

// 失败响应
{
  "error": "Website not found"
}
```

**检查 `/api/website-data/update-metrics` 请求:**
- 这个请求可能需要 10-25 秒完成
- 检查 Response 中的 `success` 字段
- 如果失败，查看 `error` 和 `details` 字段

---

#### 4. 检查数据库记录

使用 PostgreSQL 客户端连接数据库，执行以下 SQL:

```sql
-- 1. 检查网站记录是否存在
SELECT id, website_url, website_domain, user_id
FROM user_websites
WHERE id = 'YOUR_WEBSITE_ID';

-- 2. 检查缓存数据是否存在
SELECT
  website_id,
  organic_traffic,
  total_keywords,
  data_updated_at,
  cache_expires_at,
  cache_expires_at < NOW() as is_expired
FROM domain_overview_cache
WHERE website_id = 'YOUR_WEBSITE_ID'
ORDER BY data_date DESC
LIMIT 1;

-- 3. 检查关键词缓存
SELECT COUNT(*) as keyword_count
FROM domain_keywords_cache
WHERE website_id = 'YOUR_WEBSITE_ID';

-- 4. 检查竞争对手缓存
SELECT COUNT(*) as competitor_count
FROM domain_competitors_cache
WHERE website_id = 'YOUR_WEBSITE_ID';
```

**预期结果:**
- 应该能找到对应的 `user_websites` 记录
- `domain_overview_cache` 应该有至少一条记录
- 如果 `cache_expires_at < NOW()`，缓存已过期，需要重新获取

**如果没有记录:** 需要调用 `/api/website-data/update-metrics` 获取数据

---

#### 5. 测试 API 手动调用

使用 Postman 或 curl 手动测试 API:

```bash
# 1. 测试 overview-only API
curl -X POST http://localhost:3002/api/website-data/overview-only \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "YOUR_WEBSITE_ID",
    "userId": 1
  }'

# 2. 测试 update-metrics API (可能需要 10-25 秒)
curl -X POST http://localhost:3002/api/website-data/update-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "YOUR_WEBSITE_ID",
    "userId": 1,
    "region": "us"
  }'
```

**预期结果:**
- `overview-only`: 应该返回缓存数据或 `{ data: null }`
- `update-metrics`: 应该返回成功消息和数据摘要

---

#### 6. 检查 DataForSEO API 配置

检查环境变量是否配置:

```bash
# 在项目根目录执行
echo $DATAFORSEO_LOGIN
echo $DATAFORSEO_PASSWORD
```

或在 Vercel Dashboard 中检查环境变量:
- `DATAFORSEO_LOGIN` (默认: soulcraftlimited@galatea.bar)
- `DATAFORSEO_PASSWORD` (默认: 237696fd88fdfee9)

**测试 DataForSEO API:**
```bash
# 使用 Basic Auth 测试
curl -X POST https://api.dataforseo.com/v3/domain_analytics/whois/overview/live \
  -H "Authorization: Basic $(echo -n 'soulcraftlimited@galatea.bar:237696fd88fdfee9' | base64)" \
  -H "Content-Type: application/json" \
  -d '[{
    "limit": 1,
    "filters": [["domain", "=", "example.com"]],
    "order_by": ["metrics.organic.count,desc"]
  }]'
```

---

## 常见问题解决方案

### 问题 1: "正在从 DataForSEO 获取数据，请稍候..." 一直显示

**原因:** 数据库中没有缓存数据，且 API 调用失败或超时

**解决方案:**
1. 检查控制台日志，找到错误信息
2. 如果是 API 超时，增加超时时间 (update-metrics.ts:143)
3. 如果是 API 错误，检查 DataForSEO credentials
4. 如果是网站不存在，检查 `user_websites` 表

### 问题 2: API 返回 404 "Website not found"

**原因:** `websiteId` 在 `user_websites` 表中不存在

**解决方案:**
1. 检查前端传递的 `websiteId` 是否正确
2. 在 "Website Manager" 中重新绑定网站
3. 或手动在数据库中插入记录

### 问题 3: DataForSEO API 返回错误

**原因:** API credentials 无效、域名不存在、或 API 限额耗尽

**解决方案:**
1. 检查 DataForSEO API credentials
2. 确认域名拼写正确（不要包含 http:// 或 www.）
3. 检查 DataForSEO 账户余额和限额
4. 如果 DataForSEO 失败，系统会自动降级到 SE-Ranking API

### 问题 4: 缓存已过期但没有自动更新

**原因:** 前端防重复调用机制 (WebsiteDataDashboard.tsx:173-178)

**解决方案:**
1. 清除 sessionStorage: `sessionStorage.removeItem('api_fetch_' + websiteId)`
2. 手动调用更新 API
3. 刷新页面

---

## 快速修复脚本

在浏览器 Console 中执行:

```javascript
// 1. 清除缓存和防重复机制
const websiteData = JSON.parse(localStorage.getItem('google_seo_bound_website') || '{}');
const websiteId = websiteData?.id;
if (websiteId) {
  sessionStorage.removeItem(`api_fetch_${websiteId}`);
  console.log('已清除防重复调用缓存，刷新页面重试...');
  location.reload();
}

// 2. 手动触发 API 更新
async function manualUpdate() {
  const websiteData = JSON.parse(localStorage.getItem('google_seo_bound_website') || '{}');
  const websiteId = websiteData?.id;

  if (!websiteId) {
    console.error('没有找到绑定的网站');
    return;
  }

  console.log('正在更新网站数据...');

  const response = await fetch('/api/website-data/update-metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      websiteId: websiteId,
      userId: 1,
      region: 'us'
    })
  });

  const result = await response.json();
  console.log('更新结果:', result);

  if (result.success) {
    console.log('✅ 数据更新成功，1秒后刷新页面...');
    setTimeout(() => location.reload(), 1000);
  } else {
    console.error('❌ 数据更新失败:', result.error);
  }
}

// 执行手动更新
manualUpdate();
```

---

## 代码位置参考

| 文件 | 行号 | 说明 |
|------|------|------|
| `components/website-data/WebsiteDataDashboard.tsx` | 127-131 | 调用 overview-only API |
| `components/website-data/WebsiteDataDashboard.tsx` | 181-198 | 调用 update-metrics API |
| `components/website-data/WebsiteDataDashboard.tsx` | 424-448 | 无数据提示显示 |
| `api/website-data/overview-only.ts` | 42-75 | 查询缓存数据 |
| `api/website-data/update-metrics.ts` | 148-234 | DataForSEO API 调用 |
| `api/website-data/update-metrics.ts` | 244-290 | SE-Ranking API 降级 |
| `api/website-data/update-metrics.ts` | 323-385 | 缓存概览数据 |
| `api/_shared/tools/dataforseo.ts` | 310-610 | DataForSEO API 实现 |
| `components/ContentGenerationView.tsx` | 87-92 | WebsiteDataDashboard 调用 |

---

## 下一步行动

1. **立即执行:** 打开浏览器开发者工具，查看 Console 日志
2. **检查关键日志:**
   - `[Dashboard] 🚀 Starting parallel data loading`
   - `[update-metrics] 📊 Final data summary`
3. **如果没有日志:** 说明组件可能没有被渲染，检查路由和导航
4. **如果有错误日志:** 根据错误类型，参考上面的解决方案

---

**生成时间:** ${new Date().toISOString()}
**问题追踪:** 网站数据页面没有数据显示
