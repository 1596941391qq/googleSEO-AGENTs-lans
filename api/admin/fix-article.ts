import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql } from '../lib/database.js';
import { verifyAdminToken } from './auth.js';

/**
 * 修复文章数据：生成缺失的 url_slug 和更新 platform_project_id
 *
 * POST /api/admin/fix-article
 * Body: { articleId: string }
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
      const { articleId } = body;

      if (!articleId) {
        return sendErrorResponse(res, null, 'articleId is required', 400);
      }

      console.log(`[Fix Article] Fixing article: ${articleId}`);

      // 获取文章信息
      const articleResult = await sql`
        SELECT
          pa.id,
          pa.title,
          pa.keyword,
          pa.url_slug,
          pa.site_id,
          ps.site_url,
          ps.platform_project_id,
          ps.repo_name,
          ps.site_name,
          ps.platform_token_id
        FROM published_articles pa
        LEFT JOIN platform_sites ps ON pa.site_id = ps.id
        WHERE pa.id = ${articleId}
      `;

      if (articleResult.rows.length === 0) {
        return sendErrorResponse(res, null, 'Article not found', 404);
      }

      const article = articleResult.rows[0];
      const fixes = [];

      // 修复 1: 生成 url_slug（如果缺失）
      if (!article.url_slug) {
        console.log(`[Fix Article] Generating url_slug from keyword: ${article.keyword}`);

        // 生成 slug（简化版，使用 keyword）
        const slug = article.keyword
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        await sql`
          UPDATE published_articles
          SET url_slug = ${slug}, updated_at = NOW()
          WHERE id = ${articleId}
        `;

        fixes.push(`✅ Generated url_slug: ${slug}`);
        console.log(`[Fix Article] ✅ Updated url_slug to: ${slug}`);
      }

      // 修复 2: 从 Netlify API 获取 site_url 和 platform_project_id（如果缺失）
      if ((!article.site_url || !article.platform_project_id) && article.site_id) {
        console.log(`[Fix Article] Fetching site info from Netlify...`);

        try {
          // 获取 Netlify token
          const tokenResult = await sql`
            SELECT token_encrypted
            FROM platform_tokens
            WHERE id = ${article.platform_token_id}
          `;

          if (tokenResult.rows.length > 0) {
            const { decryptToken } = await import('../lib/token-manager.js');
            const netlifyToken = decryptToken(tokenResult.rows[0].token_encrypted);

            // 查询 Netlify API 获取站点信息
            const response = await fetch(
              `https://api.netlify.com/api/v1/sites?name=${encodeURIComponent(article.site_name)}`,
              {
                headers: {
                  'Authorization': `Bearer ${netlifyToken}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (response.ok) {
              const sites = await response.json();
              if (Array.isArray(sites) && sites.length > 0) {
                const site = sites[0];
                const siteUrl = site.url || site.ssl_url || '';
                const projectId = site.id;

                if (siteUrl || projectId) {
                  await sql`
                    UPDATE platform_sites
                    SET
                      site_url = ${siteUrl || article.site_url},
                      platform_project_id = ${projectId || article.platform_project_id},
                      updated_at = NOW()
                    WHERE id = ${article.site_id}
                  `;

                  if (siteUrl) fixes.push(`✅ Updated site_url: ${siteUrl}`);
                  if (projectId) fixes.push(`✅ Updated platform_project_id: ${projectId}`);

                  console.log(`[Fix Article] ✅ Updated site info from Netlify`);
                }
              }
            }
          }
        } catch (error: any) {
          console.error(`[Fix Article] Failed to fetch from Netlify:`, error.message);
          fixes.push(`⚠️ Could not fetch from Netlify: ${error.message}`);
        }
      }

      if (fixes.length === 0) {
        return res.json({
          success: true,
          message: 'No fixes needed - article data is complete',
        });
      }

      return res.json({
        success: true,
        message: `Fixed ${fixes.length} issue(s)`,
        fixes,
      });
    } catch (error: any) {
      console.error('[Fix Article] Error:', error);
      return sendErrorResponse(res, error, 'Failed to fix article');
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
