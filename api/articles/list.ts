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

    // Get articles from published_articles
    const result = await sql`
      SELECT 
        id, title, content, images,
        keyword, tone, visual_style, target_audience, target_market,
        status, created_at, updated_at, published_at, url_slug
      FROM published_articles
      WHERE user_id::text = ${userId.toString()}
      ORDER BY created_at DESC
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

    // Get articles from content_drafts
    const draftsResult = await sql`
      SELECT 
        cd.*, 
        k.keyword as keyword_name,
        p.name as project_name
      FROM content_drafts cd
      LEFT JOIN keywords k ON cd.keyword_id = k.id
      LEFT JOIN projects p ON cd.project_id = p.id
      WHERE p.user_id::text = ${userId.toString()}
      ORDER BY cd.updated_at DESC
    `;

    const draftArticles = draftsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      keyword: row.keyword_name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      source: 'draft'
    }));

    // Combine all
    const allArticles = [...publishedArticles, ...taskArticles, ...draftArticles].sort((a, b) => 
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

