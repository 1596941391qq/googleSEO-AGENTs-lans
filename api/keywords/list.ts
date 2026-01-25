import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db';

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

    // Fetch all keywords from all projects for this user
    const result = await query(
      `SELECT
        k.id,
        k.keyword,
        k.translation,
        k.intent,
        k.volume,
        k.difficulty,
        k.probability,
        k.project_id,
        k.created_at,
        p.name as project_name,
        p.task_type,
        p.mining_mode,
        p.target_language,
        CASE WHEN EXISTS (
          SELECT 1 FROM articles a
          WHERE a.keyword = k.keyword
          AND a.user_id = $1
        ) THEN true ELSE false END as has_draft
      FROM keywords k
      LEFT JOIN projects p ON k.project_id = p.id
      WHERE p.user_id = $1
      AND p.is_archived = false
      ORDER BY k.created_at DESC`,
      [userId]
    );

    const keywords = result.rows.map(row => ({
      id: row.id,
      keyword: row.keyword,
      translation: row.translation,
      intent: row.intent || 'Informational',
      volume: row.volume,
      difficulty: row.difficulty,
      probability: row.probability || 'Medium',
      project_id: row.project_id,
      project_name: row.project_name,
      task_type: row.task_type,
      mining_mode: row.mining_mode,
      target_language: row.target_language,
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
