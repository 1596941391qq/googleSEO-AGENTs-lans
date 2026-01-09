/**
 * API: 删除网站
 *
 * 功能：
 * - 软删除网站（设置 is_active = false）
 * - 如果删除的是默认网站，自动将第一个网站设为默认
 * - 如果删除的是最后选择的网站，清除该标记
 *
 * 方法: DELETE
 * 端点: /api/websites/delete
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initUserWebsitesTable, initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

interface DeleteWebsiteRequestBody {
  websiteId: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId;

    const body = req.body as DeleteWebsiteRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    // 初始化数据库表
    await initWebsiteDataTables();

    // ==========================================
    // Step 1: 验证网站属于该用户
    // ==========================================
    const websiteCheck = await sql`
      SELECT id, user_id, is_default FROM user_websites
      WHERE id = ${body.websiteId} AND user_id = ${userId}
    `;

    if (websiteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found or access denied' });
    }

    const wasDefault = websiteCheck.rows[0].is_default;

    // ==========================================
    // Step 2: 软删除网站
    // ==========================================
    await sql`
      UPDATE user_websites
      SET is_active = false, updated_at = NOW()
      WHERE id = ${body.websiteId}
    `;

    // ==========================================
    // Step 3: 如果删除的是默认网站，设置新的默认网站
    // ==========================================
    if (wasDefault) {
      // 获取第一个活跃网站
      const newDefaultResult = await sql`
        SELECT id FROM user_websites
        WHERE user_id = ${userId} AND is_active = true
        ORDER BY created_at ASC
        LIMIT 1
      `;

      if (newDefaultResult.rows.length > 0) {
        const newDefaultId = newDefaultResult.rows[0].id;

        // 设置为默认网站
        await sql`
          UPDATE user_websites
          SET is_default = true
          WHERE id = ${newDefaultId}
        `;

        // 更新用户偏好
        await sql`
          INSERT INTO user_preferences (user_id, default_website_id, last_selected_website_id, updated_at)
          VALUES (${userId}, ${newDefaultId}, ${newDefaultId}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            default_website_id = EXCLUDED.default_website_id,
            last_selected_website_id = EXCLUDED.last_selected_website_id,
            updated_at = NOW()
        `;
      } else {
        // 没有其他网站了，清除用户偏好
        await sql`
          INSERT INTO user_preferences (user_id, default_website_id, last_selected_website_id, updated_at)
          VALUES (${userId}, NULL, NULL, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            default_website_id = NULL,
            last_selected_website_id = NULL,
            updated_at = NOW()
        `;
      }
    }

    // ==========================================
    // Step 4: 如果删除的是最后选择的网站，清除该标记
    // ==========================================
    await sql`
      UPDATE user_preferences
      SET last_selected_website_id = NULL, updated_at = NOW()
      WHERE user_id = ${userId} AND last_selected_website_id = ${body.websiteId}
    `;

    return res.status(200).json({
      success: true,
      message: 'Website deleted successfully',
      data: {
        websiteId: body.websiteId,
        wasDefault
      }
    });

  } catch (error: any) {
    console.error('[API: websites/delete] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to delete website',
      details: error.message
    });
  }
}
