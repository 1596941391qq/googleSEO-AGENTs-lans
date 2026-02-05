import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql, initPublishedArticlesTable } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { publishArticle } from '../_shared/services/pseo-publisher.js';

/**
 * 发布文章 API (v2)
 *
 * 自动从 Admin 配置的站点池中分配站点:
 * - 用户不需要配置任何 Token
 * - 系统根据内容类型（informational/commercial）自动选择平台
 * - 首次发布时自动创建 GitHub 仓库和平台项目
 * - 后续发布复用已绑定的站点
 *
 * POST /api/articles/publish
 * Body: { articleId, projectId? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }

    await initPublishedArticlesTable();
    const body = parseRequestBody(req);
    const { articleId, projectId, forceUpdate } = body;

    if (!articleId) {
      return sendErrorResponse(res, null, 'articleId is required', 400);
    }

    console.log(`[Publish API] ${forceUpdate ? 'Republishing' : 'Publishing'} article ${articleId}`);

    // 1. 获取文章详情
    const articleResult = await sql`
      SELECT * FROM published_articles WHERE id = ${articleId} AND user_id = ${authResult.userId}
    `;

    if (articleResult.rows.length === 0) {
      return sendErrorResponse(res, null, 'Article not found', 404);
    }

    const article = articleResult.rows[0];

    // 2. 确定内容类型（从文章或使用默认值）
    const contentType: 'informational' | 'commercial' = article.content_type || 'informational';

    // 3. 获取项目 ID（从参数或文章关联）
    // 注意：article.website_id 就是 user_websites 表的 ID，也就是 projectId
    let actualProjectId = projectId || article.website_id;

    if (!actualProjectId) {
      // 尝试从用户的默认网站或任意一个活跃网站作为 fallback
      console.log('[Publish] Project ID missing, searching for a fallback website/project...');
      const fallbackResult = await sql`
        SELECT id FROM user_websites
        WHERE user_id = ${authResult.userId}
        AND is_active = true
        ORDER BY is_default DESC, created_at DESC
        LIMIT 1
      `;
      if (fallbackResult.rows.length > 0) {
        actualProjectId = fallbackResult.rows[0].id;
        console.log('[Publish] Found fallback Project ID:', actualProjectId);
      }
    }

    if (!actualProjectId) {
      return sendErrorResponse(res, null, '未找到关联的项目或网站。请先在"我的网站"中绑定一个站点。', 400);
    }

    // 4. 从用户网站获取品牌名（从域名提取）
    let brandName: string | undefined;
    try {
      const websiteResult = await sql`
        SELECT website_domain FROM user_websites
        WHERE id = ${actualProjectId} AND user_id = ${authResult.userId}
        LIMIT 1
      `;
      if (websiteResult.rows.length > 0) {
        const domain = websiteResult.rows[0].website_domain;
        // 从域名提取品牌名：acme.com → acme, tech-corp.io → tech-corp
        brandName = domain.split('.')[0];
        console.log(`[Publish API] Extracted brand name from domain: ${domain} → ${brandName}`);
      }
    } catch (error) {
      console.warn('[Publish API] Failed to extract brand name from website domain:', error);
      // 品牌名提取失败不影响发布流程
    }

    // 5. 生成 URL slug
    const urlSlug = article.url_slug || article.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);

    // 6. 使用 PSEO Publisher 发布
    console.log(`[Publish API] Calling publishArticle with forceUpdate=${forceUpdate || false}`);
    console.log(`[Publish API] Brand name: ${brandName || '(not set, will use default)'}`);
    const publishResult = await publishArticle({
      id: articleId,
      title: article.title,
      content: article.content,
      keyword: article.keyword || '',
      metaDescription: article.meta_description,
      contentType,
      urlSlug,
      brandName: brandName, // 自动从网站域名提取的品牌名
    });

    if (!publishResult.success) {
      return sendErrorResponse(
        res,
        null,
        publishResult.error || 'Failed to publish article',
        publishResult.error?.includes('No available') ? 503 : 500
      );
    }
    // 7. 更新文章状态并保存 site_id
    const siteId = publishResult.platformSiteId || null;

    console.log('[Publish API] Saving site_id:', siteId, 'for article:', articleId);

    await sql`
      UPDATE published_articles
      SET status = 'published',
          published_at = ${forceUpdate ? 'NOW()' : (article.published_at ? article.published_at : 'NOW()')},
          url_slug = ${urlSlug},
          content_type = ${contentType},
          site_id = ${siteId},
          updated_at = NOW()
      WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
    `;

    // 判断构建状态
    const buildStatus = publishResult.siteUrl
      ? 'ready' // siteUrl 存在，站点已就绪
      : publishResult.warning?.includes('auto-detect') || publishResult.warning?.includes('auto-build')
        ? 'building' // siteUrl 不存在但有自动检测警告，正在等待构建
        : 'unknown'; // 未知状态

    return res.json({
      success: true,
      data: {
        message: forceUpdate
          ? `Article updated on ${publishResult.platform} successfully`
          : `Article published to ${publishResult.platform} successfully`,
        liveUrl: publishResult.articleUrl || publishResult.repoUrl, // 如果没有 articleUrl，用 repoUrl
        platform: publishResult.platform,
        siteName: publishResult.siteName,
        siteUrl: publishResult.siteUrl,
        repoUrl: publishResult.repoUrl,
        isNewSite: publishResult.isNewSite,
        publishedAt: new Date().toISOString(),
        isUpdate: forceUpdate || false,
        buildStatus, // 'ready' | 'building' | 'unknown'
        warning: publishResult.warning,
        hasWarning: !!publishResult.warning
      }
    });

  } catch (error: any) {
    console.error('[Publish Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to publish article', 500);
  }
}

