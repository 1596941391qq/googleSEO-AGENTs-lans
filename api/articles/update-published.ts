import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { updatePublishedArticle } from '../_shared/services/pseo-publisher.js';

/**
 * 更新已发布文章 API
 *
 * 将修改后的文章内容推送到已发布的 GitHub 仓库，触发重新部署
 *
 * POST /api/articles/update-published
 * Body: { articleId, websiteId? }
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

    const body = parseRequestBody(req);
    const { articleId, websiteId } = body;

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

    // 2. 检查文章是否已发布
    if (article.status !== 'published') {
      return sendErrorResponse(res, null, 'Article is not published yet', 400);
    }

    // 3. 确定项目 ID
    let actualProjectId = websiteId || article.project_id;

    if (!actualProjectId) {
      // 尝试从用户的默认网站或任意一个活跃网站作为 fallback
      console.log('[Update Published] Project ID missing, searching for a fallback website/project...');
      const fallbackResult = await sql`
        SELECT id FROM user_websites
        WHERE user_id = ${authResult.userId}
        AND is_active = true
        ORDER BY is_default DESC, created_at DESC
        LIMIT 1
      `;
      if (fallbackResult.rows.length > 0) {
        actualProjectId = fallbackResult.rows[0].id;
        console.log('[Update Published] Found fallback Project ID:', actualProjectId);
      }
    }

    if (!actualProjectId) {
      return sendErrorResponse(res, null, '未找到关联的项目或网站。', 400);
    }

    // 4. 确定内容类型
    const contentType: 'informational' | 'commercial' = article.content_type || 'informational';

    // 5. 生成 URL slug
    const urlSlug = article.url_slug || article.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);

    // 6. 使用 PSEO Publisher 更新文章
    const updateResult = await updatePublishedArticle(
      actualProjectId,
      {
        id: articleId,
        title: article.title,
        content: article.content,
        keyword: article.keyword || '',
        metaDescription: article.meta_description,
        contentType,
        urlSlug,
      }
    );

    if (!updateResult.success) {
      return sendErrorResponse(
        res,
        null,
        updateResult.error || 'Failed to update article',
        500
      );
    }

    // 7. 更新文章的 updated_at 时间戳
    await sql`
      UPDATE published_articles
      SET updated_at = NOW()
      WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
    `;

    return res.json({
      success: true,
      data: {
        message: `Article updated on ${updateResult.platform} successfully`,
        articleUrl: updateResult.articleUrl,
        platform: updateResult.platform,
        siteName: updateResult.siteName,
        siteUrl: updateResult.siteUrl,
        repoUrl: updateResult.repoUrl,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Update Published Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to update article', 500);
  }
}
