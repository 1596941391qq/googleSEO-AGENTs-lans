import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initDomainCacheTables } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // 从新的 keywords 表查询数据
    const result = await sql`
      SELECT
        k.id,
        k.keyword,
        k.translation,
        k.intent,
        k.volume,
        k.difficulty,
        k.cpc,
        k.probability,
        k.top_domain_type,
        k.reasoning,
        k.top_serp_snippets,
        k.source,
        k.is_favorited,
        k.status,
        k.content_status,
        k.project_id,
        k.website_id,
        k.created_at,
        p.name as project_name,
        uw.website_domain,
        uw.website_url,
        CASE WHEN EXISTS (
          SELECT 1 FROM published_articles pa
          WHERE pa.keyword = k.keyword
          AND pa.user_id::text = ${userId.toString()}
        ) THEN true ELSE false END as has_draft
      FROM keywords k
      LEFT JOIN projects p ON k.project_id = p.id
      LEFT JOIN user_websites uw ON k.website_id = uw.id
      WHERE k.user_id::text = ${userId.toString()}
      ORDER BY k.created_at DESC
    `;

    const keywords = result.rows.map(row => ({
      id: row.id,
      keyword: row.keyword,
      translation: row.translation,
      intent: row.intent || 'Informational',
      volume: row.volume,
      difficulty: row.difficulty,
      cpc: row.cpc,
      probability: row.probability || 'Medium',
      top_domain_type: row.top_domain_type,
      reasoning: row.reasoning,
      top_serp_snippets: row.top_serp_snippets,
      source: row.source || 'manual',
      project_id: row.project_id || row.website_id, // 兼容旧数据
      project_name: row.project_name || row.website_domain || row.website_url || null,
      task_type: null,
      mining_mode: null,
      target_language: null,
      created_at: row.created_at,
      has_draft: row.has_draft,
      is_favorited: row.is_favorited,
      status: row.status,
      content_status: row.content_status,
    }));

    return res.json({
      success: true,
      data: {
        keywords,
      },
    });
  } catch (error: any) {
    console.error('Error fetching keywords:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch keywords',
    });
  }
}
