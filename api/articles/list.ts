// List articles for publish interface
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { initPublishedArticlesTable, sql } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // Initialize tables
    await initPublishedArticlesTable();

    const userId = req.query.userId as string;
    if (!userId) {
      return sendErrorResponse(res, null, 'userId is required', 400);
    }

    // Get articles
    const result = await sql`
      SELECT 
        id, title, content, images,
        keyword, tone, visual_style, target_audience, target_market,
        status, created_at, updated_at
      FROM published_articles
      WHERE user_id = ${parseInt(userId)}
      ORDER BY created_at DESC
    `;

    return res.json({
      success: true,
      data: {
        articles: result.rows.map((row) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          images: row.images || [],
          keyword: row.keyword,
          tone: row.tone,
          visualStyle: row.visual_style,
          targetAudience: row.target_audience,
          targetMarket: row.target_market,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
      },
    });
  } catch (error: any) {
    console.error('[List Articles] Error:', error);
    return sendErrorResponse(res, error, 'Failed to list articles', 500);
  }
}

