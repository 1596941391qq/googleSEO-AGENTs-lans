import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { verifyAdminToken } from './auth.js';
import { sql } from '../lib/database.js';

/**
 * Admin API - 获取已发布文章列表
 * 自动绑定缺少 site_id 的文章
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

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // 获取所有文章（包括草稿和已发布）
    const result = await sql`
      SELECT
        pa.id,
        pa.user_id,
        pa.title,
        pa.keyword,
        pa.status,
        pa.published_at,
        pa.site_id,
        pa.content_type,
        pa.url_slug,
        pa.created_at
      FROM published_articles pa
      WHERE pa.status IN ('draft', 'published')
      ORDER BY COALESCE(pa.published_at, pa.created_at) DESC
      LIMIT 100
    `;

    const articles = result.rows;

    // 后台自动绑定缺少 site_id 的文章
    for (const article of articles) {
      if (!article.site_id && article.user_id) {
        console.log(`[Admin Published] Auto-binding article ${article.id}...`);

        // 尝试查找该用户对应 content_type 的绑定
        const bindResult = await sql`
          SELECT ps.id as site_id
          FROM website_site_bindings wb
          JOIN platform_sites ps ON wb.site_id = ps.id
          WHERE wb.website_id IN (
            SELECT id FROM user_websites WHERE user_id = ${article.user_id} LIMIT 1
          )
          AND ps.content_type = ${article.content_type || 'informational'}
          LIMIT 1
        `;

        if (bindResult.rows.length > 0) {
          const newSiteId = bindResult.rows[0].site_id;

          // 更新 site_id
          await sql`
            UPDATE published_articles
            SET site_id = ${newSiteId}
            WHERE id = ${article.id}
          `;

          console.log(`[Admin Published] ✅ Bound article ${article.id} to site ${newSiteId}`);
          article.site_id = newSiteId;
        } else {
          console.log(`[Admin Published] ⚠️ No binding found for article ${article.id}`);
        }
      }
    }

    // 查询绑定后的仓库名称和 GitHub owner
    const articlesWithRepo = await Promise.all(
      articles.map(async (article) => {
        let repoInfo = {
          repo_name: null,
          platform_site_name: null,
          github_owner: null
        };

        if (article.site_id) {
          const siteResult = await sql`
            SELECT
              ps.repo_name,
              ps.site_name,
              gt.owner_name as github_owner
            FROM platform_sites ps
            JOIN github_tokens gt ON ps.github_token_id = gt.id
            WHERE ps.id = ${article.site_id}
          `;

          if (siteResult.rows.length > 0) {
            repoInfo = siteResult.rows[0];
          }
        }

        return {
          ...article,
          ...repoInfo
        };
      })
    );

    return res.json({
      success: true,
      data: {
        articles: articlesWithRepo,
        total: articlesWithRepo.length
      }
    });
  } catch (error: any) {
    console.error('[Admin Published] Error:', error);
    return sendErrorResponse(res, error, 'Failed to fetch published articles', 500);
  }
}
