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

    // Initialize tables
    await initDomainCacheTables();

    // Fetch all keywords from keyword_analysis_cache for this user's websites
    const result = await sql`
      SELECT
        kac.id,
        kac.keyword,
        kac.dataforseo_volume as volume,
        kac.dataforseo_difficulty as difficulty,
        kac.dataforseo_cpc as cpc,
        kac.agent2_probability as probability,
        kac.agent2_search_intent as intent,
        kac.agent2_top_domain_type as top_domain_type,
        kac.agent2_reasoning as reasoning,
        kac.agent2_top_serp_snippets as top_serp_snippets,
        kac.source,
        kac.website_id,
        kac.created_at,
        uw.website_url,
        uw.website_domain,
        CASE WHEN EXISTS (
          SELECT 1 FROM published_articles pa
          WHERE pa.keyword = kac.keyword
          AND pa.user_id::text = ${userId.toString()}
        ) THEN true ELSE false END as has_draft
      FROM keyword_analysis_cache kac
      LEFT JOIN user_websites uw ON kac.website_id = uw.id
      WHERE (uw.user_id::text = ${userId.toString()} OR kac.website_id IS NULL)
      AND kac.cache_expires_at > NOW()
      ORDER BY kac.created_at DESC
    `;

    const keywords = result.rows.map(row => ({
      id: row.id,
      keyword: row.keyword,
      translation: null, // keyword_analysis_cache doesn't have translation
      intent: row.intent || 'Informational',
      volume: row.volume,
      difficulty: row.difficulty,
      cpc: row.cpc,
      probability: row.probability || 'Medium',
      top_domain_type: row.top_domain_type,
      reasoning: row.reasoning,
      top_serp_snippets: row.top_serp_snippets,
      source: row.source || 'manual',
      project_id: row.website_id, // Use website_id as project_id for compatibility
      project_name: row.website_domain || row.website_url || null,
      task_type: null,
      mining_mode: null,
      target_language: null,
      created_at: row.created_at,
      has_draft: row.has_draft,
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
