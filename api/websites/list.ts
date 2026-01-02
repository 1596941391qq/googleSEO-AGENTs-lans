/**
 * API: 获取用户网站列表
 *
 * 功能：
 * - 获取用户绑定的所有网站
 * - 返回默认网站和最后选择的网站信息
 * - 更新最后访问时间
 *
 * 方法: GET
 * 端点: /api/websites/list
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initUserWebsitesTable, initWebsiteDataTables, sql } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取 user_id（从 session 或 query 参数）
    let userId: number;

    // TODO: 从 session 获取 user_id
    // const session = await getSession(req);
    // userId = session.user.id;

    // 临时：从 query 获取或使用默认值
    userId = req.query.user_id ? parseInt(req.query.user_id as string) : 1;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user_id' });
    }

    // 初始化数据库表
    await initWebsiteDataTables();

    // ==========================================
    // Step 1: 获取用户偏好设置
    // ==========================================
    const preferencesResult = await sql`
      SELECT
        default_website_id,
        last_selected_website_id,
        ui_settings
      FROM user_preferences
      WHERE user_id = ${userId}
    `;

    const preferences = preferencesResult.rows[0] || {
      default_website_id: null,
      last_selected_website_id: null,
      ui_settings: {}
    };

    // ==========================================
    // Step 2: 获取用户网站列表
    // ==========================================
    const websitesResult = await sql`
      SELECT
        id,
        website_url,
        website_domain,
        website_title,
        website_description,
        website_screenshot,
        is_default,
        last_accessed_at,
        bound_at,
        is_active,
        created_at,
        updated_at
      FROM user_websites
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY
        is_default DESC,
        last_accessed_at DESC NULLS LAST,
        created_at DESC
    `;

    const websites = websitesResult.rows.map(row => ({
      id: row.id,
      url: row.website_url,
      domain: row.website_domain,
      title: row.website_title,
      description: row.website_description,
      screenshot: row.website_screenshot,
      isDefault: row.is_default,
      lastAccessedAt: row.last_accessed_at,
      boundAt: row.bound_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // ==========================================
    // Step 3: 确定当前应该使用的网站
    // ==========================================
    let currentWebsiteId = preferences.last_selected_website_id ||
      preferences.default_website_id ||
      (websites.length > 0 ? websites[0].id : null);

    const currentWebsite = websites.find(w => w.id === currentWebsiteId) ||
      (websites.length > 0 ? websites[0] : null);

    // ==========================================
    // Step 4: 更新最后访问时间
    // ==========================================
    if (currentWebsite) {
      await sql`
        UPDATE user_websites
        SET last_accessed_at = NOW()
        WHERE id = ${currentWebsite.id}
      `;
    }

    return res.status(200).json({
      success: true,
      data: {
        websites,
        currentWebsite,
        preferences: {
          defaultWebsiteId: preferences.default_website_id,
          lastSelectedWebsiteId: preferences.last_selected_website_id,
          uiSettings: preferences.ui_settings
        }
      }
    });

  } catch (error: any) {
    console.error('[API: websites/list] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch websites list',
      details: error.message
    });
  }
}
