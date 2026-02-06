import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql } from '../lib/database.js';
import { verifyAdminToken } from './auth.js';
import { indexArticleWithDeepSearch } from '../_shared/services/deepsearch.js';

/**
 * 推送文章 URL 到 unifuncs 进行索引
 *
 * POST /api/admin/push-to-unifuncs
 * Body: { articleId } 或 { articleIds: string[] }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  const authResult = verifyAdminToken(req);
  if (!authResult.valid) {
    return sendErrorResponse(res, null, authResult.error || 'Unauthorized', 401);
  }

  if (req.method === 'POST') {
    try {
      const body = parseRequestBody(req);
      const { articleId, articleIds } = body;

      // 支持单个或批量推送
      const idsToProcess = articleIds || (articleId ? [articleId] : []);

      if (idsToProcess.length === 0) {
        return sendErrorResponse(res, null, 'articleId or articleIds is required', 400);
      }

      console.log(`[Push to Unifuncs] Processing ${idsToProcess.length} article(s)...`);

      const results = [];

      for (const id of idsToProcess) {
        // 获取文章信息
        const articleResult = await sql`
          SELECT
            pa.id,
            pa.title,
            pa.keyword,
            pa.url_slug,
            pa.site_id,
            ps.site_url,
            uw.website_url
          FROM published_articles pa
          LEFT JOIN platform_sites ps ON pa.site_id = ps.id
          LEFT JOIN user_websites uw ON pa.website_id = uw.id
          WHERE pa.id = ${id}
        `;

        if (articleResult.rows.length === 0) {
          results.push({
            articleId: id,
            success: false,
            error: 'Article not found'
          });
          continue;
        }

        const article = articleResult.rows[0];

        // 构建文章 URL
        const articleUrl = article.site_url
          ? `${article.site_url.replace(/\/$/, '')}/${article.url_slug}/`
          : null;

        if (!articleUrl) {
          results.push({
            articleId: id,
            success: false,
            error: 'Article URL not available'
          });
          continue;
        }

        // 推送到 unifuncs 使用 Deep Search API
        const pushResult = await indexArticleWithDeepSearch({
          articleTitle: article.title,
          articleUrl: articleUrl,
          promotionWebsite: article.website_url || '',
          promotionKeywords: article.keyword ? [article.keyword] : []
        });

        results.push({
          articleId: id,
          title: article.title,
          url: articleUrl,
          success: pushResult.success,
          shareUrl: pushResult.shareUrl,
          error: pushResult.error
        });
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      return res.json({
        success: true,
        message: `Pushed ${successCount} article(s) successfully, ${failCount} failed`,
        results
      });
    } catch (error: any) {
      console.error('[Push to Unifuncs] Error:', error);
      return sendErrorResponse(res, error, 'Failed to push to unifuncs', 500);
    }
  }

  return sendErrorResponse(res, null, 'Method not allowed', 405);
}
