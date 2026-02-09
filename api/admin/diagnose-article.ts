import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql } from '../lib/database.js';
import { verifyAdminToken } from './auth.js';

/**
 * 诊断文章数据，检查 site_url 和相关字段
 *
 * GET /api/admin/diagnose-article?articleId=xxx
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

  if (req.method === 'GET') {
    try {
      const { articleId } = req.query;

      if (!articleId || typeof articleId !== 'string') {
        return sendErrorResponse(res, null, 'articleId is required', 400);
      }

      // 获取文章完整信息
      const articleResult = await sql`
        SELECT
          pa.id,
          pa.title,
          pa.keyword,
          pa.url_slug,
          pa.site_id,
          pa.website_id,
          pa.status,
          pa.published_at,
          ps.site_name,
          ps.site_url,
          ps.platform_project_id,
          ps.repo_name,
          ps.platform,
          ps.status as site_status,
          pt.platform as token_platform,
          pt.name as token_name,
          gt.owner_name as github_owner,
          uw.website_url
        FROM published_articles pa
        LEFT JOIN platform_sites ps ON pa.site_id = ps.id
        LEFT JOIN platform_tokens pt ON ps.platform_token_id = pt.id
        LEFT JOIN github_tokens gt ON ps.github_token_id = gt.id
        LEFT JOIN user_websites uw ON pa.website_id = uw.id
        WHERE pa.id = ${articleId}
      `;

      if (articleResult.rows.length === 0) {
        return sendErrorResponse(res, null, 'Article not found', 404);
      }

      const article = articleResult.rows[0];

      // 构建诊断信息
      const diagnosis = {
        article: {
          id: article.id,
          title: article.title,
          keyword: article.keyword,
          url_slug: article.url_slug,
          status: article.status,
          published_at: article.published_at,
        },
        site: {
          site_id: article.site_id,
          site_name: article.site_name,
          site_url: article.site_url,
          platform_project_id: article.platform_project_id,
          repo_name: article.repo_name,
          platform: article.platform,
          status: article.site_status,
        },
        tokens: {
          platform_token: article.token_name,
          github_owner: article.github_owner,
        },
        website: {
          website_id: article.website_id,
          website_url: article.website_url,
        },
        issues: [] as string[],
        suggestions: [] as string[],
      };

      // 检查问题
      if (!article.site_id) {
        diagnosis.issues.push('❌ site_id is NULL - article is not linked to any platform site');
        diagnosis.suggestions.push('Re-publish the article to create a platform site');
      }

      if (!article.site_url) {
        diagnosis.issues.push('❌ site_url is empty - cannot construct article URL');
        if (article.platform_project_id) {
          diagnosis.suggestions.push('Try fetching site_url from Netlify API using platform_project_id');
        } else {
          diagnosis.suggestions.push('platform_project_id is also missing - need to re-deploy to Netlify');
        }
      }

      if (!article.platform_project_id) {
        diagnosis.issues.push('⚠️ platform_project_id is NULL - cannot query Netlify API');
        diagnosis.suggestions.push('Re-publish the article to get Netlify site ID');
      }

      if (!article.url_slug) {
        diagnosis.issues.push('❌ url_slug is empty - cannot construct article URL');
      }

      if (article.site_status !== 'active') {
        diagnosis.issues.push(`⚠️ Site status is "${article.site_status}" (not "active")`);
      }

      // 如果有 site_url，构建完整 URL
      if (article.site_url && article.url_slug) {
        diagnosis.suggestions.push(`✅ Article URL would be: ${article.site_url.replace(/\/$/, '')}/${article.url_slug}/`);
      }

      return res.json({
        success: true,
        diagnosis,
      });
    } catch (error: any) {
      console.error('[Diagnose Article] Error:', error);
      return sendErrorResponse(res, error, 'Failed to diagnose article');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
