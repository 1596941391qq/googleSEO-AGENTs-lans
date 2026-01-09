/**
 * API: 设置默认网站
 *
 * 功能：
 * - 将指定网站设置为用户的默认网站
 * - 自动取消其他网站的默认状态
 * - 更新用户偏好设置
 *
 * 方法: POST
 * 端点: /api/websites/set-default
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initUserWebsitesTable, initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

interface SetDefaultRequestBody {
  websiteId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId;

    const body = req.body as SetDefaultRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    // 初始化数据库表
    await initWebsiteDataTables();

    // ==========================================
    // Step 1: 验证网站属于该用户
    // ==========================================
    const websiteCheck = await sql`
      SELECT id, user_id FROM user_websites
      WHERE id = ${body.websiteId} AND user_id = ${userId}
    `;

    if (websiteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found or access denied' });
    }

    // ==========================================
    // Step 2: 取消该用户所有其他网站的默认状态
    // ==========================================
    await sql`
      UPDATE user_websites
      SET is_default = false
      WHERE user_id = ${userId} AND id != ${body.websiteId}
    `;

    // ==========================================
    // Step 3: 设置新默认网站
    // ==========================================
    await sql`
      UPDATE user_websites
      SET is_default = true, updated_at = NOW()
      WHERE id = ${body.websiteId}
    `;

    // ==========================================
    // Step 4: 更新用户偏好设置
    // ==========================================
    await sql`
      INSERT INTO user_preferences (user_id, default_website_id, last_selected_website_id, updated_at)
      VALUES (${userId}, ${body.websiteId}, ${body.websiteId}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        default_website_id = EXCLUDED.default_website_id,
        last_selected_website_id = EXCLUDED.last_selected_website_id,
        updated_at = NOW()
    `;

    return res.status(200).json({
      success: true,
      message: 'Default website updated successfully',
      data: {
        websiteId: body.websiteId
      }
    });

  } catch (error: any) {
    console.error('[API: websites/set-default] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to set default website',
      details: error.message
    });
  }
}
