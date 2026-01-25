import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, initDomainCacheTables } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keywordIds, userId } = req.body;

    if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
      return res.status(400).json({ error: 'keywordIds array is required' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Initialize tables
    await initDomainCacheTables();

    // Verify ownership and delete keywords from keyword_analysis_cache
    // Use PostgreSQL ANY() function for array parameter
    const result = await sql`
      DELETE FROM keyword_analysis_cache
      WHERE id = ANY(${keywordIds})
      AND (
        website_id IN (
          SELECT id FROM user_websites WHERE user_id::text = ${userId.toString()}
        )
        OR website_id IS NULL
      )
      RETURNING id
    `;

    return res.json({
      success: true,
      data: {
        deletedCount: result.rowCount,
      },
    });
  } catch (error: any) {
    console.error('Error deleting keywords:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete keywords',
    });
  }
}
