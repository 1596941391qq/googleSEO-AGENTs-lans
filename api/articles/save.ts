// Save article to publish interface
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
      title,
      content,
      images,
      keyword,
      tone,
      visualStyle,
      targetAudience,
      targetMarket,
      targetLanguage,  // 文章目标语言
      websiteId,      // 关联的用户网站 ID (必需)
      contentType,    // 内容类型: 'informational' | 'commercial' (AI 生成时标记)
    } = body;

    // 验证必需字段
    if (!title || !content) {
      return sendErrorResponse(res, null, 'title and content are required', 400);
    }

    // 验证 websiteId 必需
    if (!websiteId) {
      return sendErrorResponse(res, null, 'websiteId is required - please select a promotion website', 400);
    }

    // 验证 contentType 必需
    if (!contentType || !['informational', 'commercial'].includes(contentType)) {
      return sendErrorResponse(res, null, 'contentType must be "informational" or "commercial"', 400);
    }

    // Force correction of content type based on keyword intent
    // Even if frontend sends 'informational', if the keyword implies buying guide, force 'commercial'
    const commercialTerms = ['buy', 'price', 'review', 'best', 'top', 'vs', 'comparison', 'guide', 'sale', 'deal', 'cheap', 'cost', 'shop', 'store',
      '购买', '价格', '评测', '最', '排名', '对比', '指南', '怎么选', '推荐', '多少钱', '哪里买'];

    let finalContentType = contentType;
    const keywordLower = (keyword || '').toLowerCase();
    if (commercialTerms.some(term => keywordLower.includes(term))) {
      console.log(`[Save Article] Forcing contentType to 'commercial' based on keyword intent: ${keyword}`);
      finalContentType = 'commercial';
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
        keyword, tone, visual_style, target_audience, target_market, target_language,
        website_id, content_type,
        status, published_at
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
        ${targetLanguage || 'en'},
        ${websiteId},
        ${finalContentType},
        'draft', NULL
      )
      RETURNING id, created_at, published_at, website_id, content_type
    `;

    const article = result.rows[0];

    return res.json({
      success: true,
      data: {
        articleId: article.id,
        websiteId: article.website_id,
        contentType: article.content_type,
        message: 'Article saved successfully',
        createdAt: article.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Save Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to save article', 500);
  }
}

