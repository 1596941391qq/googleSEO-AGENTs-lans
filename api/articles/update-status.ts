// Update article publish status
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { initPublishedArticlesTable, sql } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // Initialize tables
    await initPublishedArticlesTable();

    const body = parseRequestBody(req);
    const { articleId, status, userId } = body;

    // 验证必需字段
    if (!articleId || !status || !userId) {
      return sendErrorResponse(res, null, 'articleId, status, and userId are required', 400);
    }

    // 验证状态值
    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return sendErrorResponse(res, null, `Status must be one of: ${validStatuses.join(', ')}`, 400);
    }

    // 更新文章状态
    const result = await sql`
      UPDATE published_articles
      SET 
        status = ${status},
        updated_at = NOW(),
        published_at = CASE 
          WHEN ${status} = 'published' AND published_at IS NULL THEN NOW()
          ELSE published_at
        END
      WHERE id = ${articleId}::uuid
        AND user_id = ${userId}
      RETURNING id, status, published_at, updated_at
    `;

    if (result.rows.length === 0) {
      return sendErrorResponse(res, null, 'Article not found or you do not have permission to update it', 404);
    }

    const article = result.rows[0];

    return res.json({
      success: true,
      data: {
        articleId: article.id,
        status: article.status,
        publishedAt: article.published_at,
        updatedAt: article.updated_at,
        message: `Article status updated to ${status}`,
      },
    });
  } catch (error: any) {
    console.error('[Update Article Status] Error:', error);
    return sendErrorResponse(res, error, 'Failed to update article status', 500);
  }
}

