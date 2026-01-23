import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql, initPublishedArticlesTable } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { publishArticle, getWebsitePublishingSites } from '../_shared/services/pseo-publisher.js';

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
    const { articleId, projectId } = body;

    if (!articleId) {
      return sendErrorResponse(res, null, 'articleId is required', 400);
    }

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
    let actualProjectId = projectId || article.project_id;

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
      return sendErrorResponse(res, null, '未找到关联的项目或网站。请先在“我的网站”中绑定一个站点。', 400);
    }

    // 4. 生成 URL slug
    const urlSlug = article.url_slug || article.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);

    // 5. 使用 PSEO Publisher 发布
    const publishResult = await publishArticle(
      actualProjectId,
      {
        id: articleId,
        title: article.title,
        content: article.content,
        keyword: article.keyword || '',
        metaDescription: article.meta_description,
        contentType,
        urlSlug,
      },
      article.project_name // 用于生成站点名
    );

    if (!publishResult.success) {
      return sendErrorResponse(
        res,
        null,
        publishResult.error || 'Failed to publish article',
        publishResult.error?.includes('No available') ? 503 : 500
      );
    }
    // 6. 更新文章状态
    await sql`
      UPDATE published_articles
      SET status = 'published',
          published_at = NOW(),
          url_slug = ${urlSlug},
          content_type = ${contentType},
          updated_at = NOW()
      WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
    `;

    return res.json({
      success: true,
      data: {
        message: `Article published to ${publishResult.platform} successfully`,
        liveUrl: publishResult.articleUrl,
        platform: publishResult.platform,
        siteName: publishResult.siteName,
        siteUrl: publishResult.siteUrl,
        repoUrl: publishResult.repoUrl,
        isNewSite: publishResult.isNewSite,
        publishedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Publish Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to publish article', 500);
  }
}

/**
 * 获取项目的发布站点信息 API
 * GET /api/articles/publish?projectId=xxx
 */
export async function getProjectSites(req: VercelRequest, res: VercelResponse) {
  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }

    const { projectId } = req.query;
    if (!projectId || typeof projectId !== 'string') {
      return sendErrorResponse(res, null, 'projectId is required', 400);
    }

    const sites = await getWebsitePublishingSites(projectId);

    return res.json({
      success: true,
      data: {
        informational: sites.informational ? {
          siteName: sites.informational.site.site_name,
          siteUrl: sites.informational.site.site_url,
          platform: sites.informational.site.platform,
          repoName: sites.informational.site.repo_name,
          status: sites.informational.site.status,
          usageCount: sites.informational.site.usage_count,
        } : null,
        commercial: sites.commercial ? {
          siteName: sites.commercial.site.site_name,
          siteUrl: sites.commercial.site.site_url,
          platform: sites.commercial.site.platform,
          repoName: sites.commercial.site.repo_name,
          status: sites.commercial.site.status,
          usageCount: sites.commercial.site.usage_count,
        } : null,
      }
    });
  } catch (error: any) {
    console.error('[Get Project Sites] Error:', error);
    return sendErrorResponse(res, error, 'Failed to get project sites', 500);
  }
}
