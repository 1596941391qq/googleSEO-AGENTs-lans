import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/database.js';
import { verifyToken } from '../lib/auth.js';

/**
 * POST /api/user-preferences/update
 * 更新用户设置（部分更新，合并到 ui_settings）
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.MAIN_APP_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
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

    // 解析请求体
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { ui_settings, default_website_id, last_selected_website_id } = body;

    if (ui_settings === undefined && default_website_id === undefined && last_selected_website_id === undefined) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // 先确保用户设置存在
    await sql`
      INSERT INTO user_preferences (user_id, ui_settings)
      VALUES (${userId}, '{}'::jsonb)
      ON CONFLICT (user_id) DO NOTHING
    `;

    // 执行更新 - 使用 COALESCE 和条件更新
    const result = await sql`
      UPDATE user_preferences
      SET
        ui_settings = CASE
          WHEN ${ui_settings !== undefined} THEN COALESCE(ui_settings, '{}'::jsonb) || ${JSON.stringify(ui_settings || {})}::jsonb
          ELSE ui_settings
        END,
        default_website_id = CASE
          WHEN ${default_website_id !== undefined} THEN ${default_website_id}::UUID
          ELSE default_website_id
        END,
        last_selected_website_id = CASE
          WHEN ${last_selected_website_id !== undefined} THEN ${last_selected_website_id}::UUID
          ELSE last_selected_website_id
        END,
        updated_at = NOW()
      WHERE user_id = ${userId}
      RETURNING *
    `;

    return res.json({
      success: true,
      message: 'User preferences updated',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('[user-preferences/update] Error:', error);
    return res.status(500).json({
      error: 'Failed to update user preferences',
      message: error.message
    });
  }
}
