import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/database.js';
import { verifyToken } from '../lib/auth.js';

/**
 * GET /api/user-preferences
 * 获取用户设置（包括内容生成配置）
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.MAIN_APP_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 验证 JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userId = decoded.userId;

    // 查询用户设置
    const result = await sql`
      SELECT
        user_id,
        default_website_id,
        last_selected_website_id,
        ui_settings,
        created_at,
        updated_at
      FROM user_preferences
      WHERE user_id = ${userId}
    `;

    if (result.rows.length === 0) {
      // 如果用户设置不存在，创建默认设置
      await sql`
        INSERT INTO user_preferences (user_id, ui_settings)
        VALUES (${userId}, ${JSON.stringify({})})
        ON CONFLICT (user_id) DO NOTHING
      `;

      return res.json({
        success: true,
        data: {
          user_id: userId,
          default_website_id: null,
          last_selected_website_id: null,
          ui_settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('[user-preferences/get] Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch user preferences',
      message: error.message
    });
  }
}
