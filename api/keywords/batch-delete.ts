import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../lib/db';

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

    // Verify ownership and delete keywords
    const placeholders = keywordIds.map((_, i) => `$${i + 2}`).join(',');
    const deleteQuery = `
      DELETE FROM keywords
      WHERE id IN (${placeholders})
      AND project_id IN (
        SELECT id FROM projects WHERE user_id = $1
      )
      RETURNING id
    `;

    const result = await query(deleteQuery, [userId, ...keywordIds]);

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
