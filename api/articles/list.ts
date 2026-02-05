// List articles for publish interface
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { initPublishedArticlesTable, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
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
    await initPublishedArticlesTable();

    // Get articles from published_articles (LEFT JOIN with user_websites to get website info)
    const result = await sql`
      SELECT 
        pa.id, pa.title, pa.content, pa.images,
        pa.keyword, pa.tone, pa.visual_style, pa.target_audience, pa.target_market,
        pa.status, pa.created_at, pa.updated_at, pa.published_at, pa.url_slug,
        pa.website_id, pa.content_type, pa.site_id,
        uw.website_domain as website_name, uw.website_url as website_url
      FROM published_articles pa
      LEFT JOIN user_websites uw ON pa.website_id = uw.id
      WHERE pa.user_id::text = ${userId.toString()}
      ORDER BY pa.created_at DESC
    `;

    const publishedArticles = result.rows.map((row) => ({
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
      publishedAt: row.published_at,
      urlSlug: row.url_slug,
      websiteId: row.website_id,
      websiteName: row.website_name,
      websiteUrl: row.website_url,
      content_type: row.content_type, // 'informational' | 'commercial'
      siteId: row.site_id, // 发布到的 PSEO 站点 ID
      source: 'published'
    }));

    // Get articles from execution_tasks (article-generator type)
    const { getUserExecutionTasks } = await import('../lib/database.js');
    const tasks = await getUserExecutionTasks(userId);
    const taskArticles = tasks
      .filter(t => t.type === 'article-generator' && t.status === 'completed' && t.state?.finalArticle)
      .map(t => ({
        id: t.id,
        title: t.state.finalArticle.title,
        content: t.state.finalArticle.content,
        images: t.state.finalArticle.images || [],
        keyword: t.params?.keyword || t.state?.keyword,
        tone: t.params?.tone,
        visualStyle: t.params?.visualStyle,
        targetAudience: t.params?.targetAudience,
        targetMarket: t.params?.targetMarket,
        status: 'draft',
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        source: 'task'
      }));

    // Combine all
    const allArticles = [...publishedArticles, ...taskArticles].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return res.json({
      success: true,
      data: {
        articles: allArticles
      },
    });
  } catch (error: any) {
    console.error('[List Articles] Error:', error);
    return sendErrorResponse(res, error, 'Failed to list articles', 500);
  }
}

