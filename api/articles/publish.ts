import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql, initPublishedArticlesTable } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { notifyGoogleIndexing } from '../_shared/services/indexing-service.js';
import { publishToMedium } from '../_shared/publishers/medium.js';
import { publishToWordPress } from '../_shared/publishers/wordpress.js';

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

    await initPublishedArticlesTable();
    const body = parseRequestBody(req);
    const { articleId, platform, urlSlug, config } = body;

    if (!articleId) {
      return sendErrorResponse(res, null, 'articleId is required', 400);
    }

    // 1. 获取文章详情
    const result = await sql`
      SELECT * FROM published_articles WHERE id = ${articleId} AND user_id = ${authResult.userId}
    `;

    if (result.rows.length === 0) {
      return sendErrorResponse(res, null, 'Article not found', 404);
    }

    const article = result.rows[0];

    // 2. 生成最终的 slug
    const finalSlug = urlSlug || article.url_slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    let liveUrl = null;
    let publishResult: any = null;
    let indexingResult = null;

    // 3. 发布逻辑
    if (platform === 'platform' || !platform) {
      const baseDomain = process.env.PLATFORM_DOMAIN || 'seo-factory.com';
      const userSubdomain = authResult.userId.substring(0, 8); 
      liveUrl = `https://${userSubdomain}.${baseDomain}/p/${finalSlug}`;

      // 调用 Google Indexing API
      indexingResult = await notifyGoogleIndexing(liveUrl);
      publishResult = { success: true, url: liveUrl };
    } 
    else if (platform === 'medium') {
      if (!config?.mediumToken) {
        return sendErrorResponse(res, null, 'Medium Token is required', 400);
      }
      publishResult = await publishToMedium(
        { title: article.title, content: article.content, images: [], keyword: article.keyword },
        { integrationToken: config.mediumToken, publishStatus: 'public' }
      );
      liveUrl = publishResult.url;
    } 
    else if (platform === 'wordpress') {
      if (!config?.wpUrl || !config?.wpUsername || !config?.wpPassword) {
        return sendErrorResponse(res, null, 'WordPress config (url, username, password) is required', 400);
      }
      publishResult = await publishToWordPress(
        { title: article.title, content: article.content, keyword: article.keyword },
        { 
          siteUrl: config.wpUrl, 
          username: config.wpUsername, 
          applicationPassword: config.wpPassword,
          publishStatus: 'publish' 
        }
      );
      liveUrl = publishResult.url;
    }

    // 4. 更新数据库状态（添加 user_id 条件确保数据隔离）
    await sql`
      UPDATE published_articles
      SET status = 'published',
          published_at = NOW(),
          url_slug = ${finalSlug},
          updated_at = NOW()
      WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
    `;

    return res.json({
      success: true,
      data: {
        message: `Article published to ${platform || 'platform'} successfully`,
        liveUrl,
        publishResult,
        indexing: indexingResult,
        publishedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[Publish Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to publish article', 500);
  }
}
