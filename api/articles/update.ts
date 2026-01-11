// Update article content and title
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { initPublishedArticlesTable, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    await initPublishedArticlesTable();
    const body = parseRequestBody(req);
    const { articleId, title, content } = body;

    // 验证必需字段
    if (!articleId) {
      return sendErrorResponse(res, null, 'articleId is required', 400);
    }

    if (!title && !content) {
      return sendErrorResponse(res, null, 'At least one of title or content is required', 400);
    }

    // 更新 published_articles
    let result;
    if (title !== undefined && content !== undefined) {
      result = await sql`
        UPDATE published_articles
        SET title = ${title},
            content = ${content},
            updated_at = NOW()
        WHERE id = ${articleId}::uuid
          AND user_id::text = ${userId.toString()}
        RETURNING id, title, updated_at
      `;
    } else if (title !== undefined) {
      result = await sql`
        UPDATE published_articles
        SET title = ${title},
            updated_at = NOW()
        WHERE id = ${articleId}::uuid
          AND user_id::text = ${userId.toString()}
        RETURNING id, title, updated_at
      `;
    } else if (content !== undefined) {
      result = await sql`
        UPDATE published_articles
        SET content = ${content},
            updated_at = NOW()
        WHERE id = ${articleId}::uuid
          AND user_id::text = ${userId.toString()}
        RETURNING id, title, updated_at
      `;
    } else {
      return sendErrorResponse(res, null, 'At least one of title or content is required', 400);
    }

    if (result.rows.length === 0) {
      return sendErrorResponse(res, null, 'Article not found or you do not have permission to update it', 404);
    }

    const article = result.rows[0];

    return res.json({
      success: true,
      data: {
        articleId: article.id,
        title: article.title,
        updatedAt: article.updated_at,
        message: 'Article updated successfully',
      },
    });
  } catch (error: any) {
    console.error('[Update Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to update article', 500);
  }
}
