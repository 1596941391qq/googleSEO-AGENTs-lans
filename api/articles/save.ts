// Save article to publish interface
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
    try {
      await initPublishedArticlesTable();
    } catch (initError: any) {
      console.error('[Save Article] Table initialization error:', initError);
      return sendErrorResponse(
        res,
        initError,
        `Failed to initialize database table: ${initError?.message || 'Unknown error'}. Please check database connection and ensure POSTGRES_URL or DATABASE_URL is configured.`,
        500
      );
    }

    const body = parseRequestBody(req);

    const {
      userId,
      title,
      content,
      images,
      keyword,
      tone,
      visualStyle,
      targetAudience,
      targetMarket,
    } = body;

    // 验证必需字段
    if (!userId || !title || !content) {
      return sendErrorResponse(res, null, 'userId, title, and content are required', 400);
    }

    // 验证并清理 images 数组
    let validImages: any[] = [];
    if (images) {
      if (Array.isArray(images)) {
        validImages = images.filter((img: any) => img && typeof img === 'object' && img.url);
      }
    }

    // Save article
    const result = await sql`
      INSERT INTO published_articles (
        user_id, title, content, images,
        keyword, tone, visual_style, target_audience, target_market,
        status
      )
      VALUES (
        ${userId},
        ${title},
        ${content},
        ${validImages.length > 0 ? JSON.stringify(validImages) : '[]'}::jsonb,
        ${keyword || null},
        ${tone || null},
        ${visualStyle || null},
        ${targetAudience || null},
        ${targetMarket || null},
        'draft'
      )
      RETURNING id, created_at
    `;

    const article = result.rows[0];

    return res.json({
      success: true,
      data: {
        articleId: article.id,
        message: 'Article saved successfully',
        createdAt: article.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Save Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to save article', 500);
  }
}

