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
import { authenticateRequest } from '../_shared/auth.js';

/**
 * 将测试用户 ID 转换为有效的 UUID
 * 开发模式下，测试用户 ID "12345" 会被映射到一个固定的测试 UUID
 */
function getUserIdForQuery(userId: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';

  // 如果是开发模式且 userId 是测试用户 ID，使用固定的测试 UUID
  if (isDevelopment && userId === '12345') {
    // 使用固定的测试用户 UUID: b61cbbf9-15b0-4353-8d49-89952042cf75
    // 这样可以将 "12345" 映射到一个有效的 UUID 格式
    return 'b61cbbf9-15b0-4353-8d49-89952042cf75';
  }

  // 验证是否是有效的 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    // 如果不是有效的 UUID，在开发模式下返回测试 UUID，否则抛出错误
    if (isDevelopment) {
      return 'b61cbbf9-15b0-4353-8d49-89952042cf75';
    }
    throw new Error(`Invalid UUID format for userId: ${userId}`);
  }

  return userId;
}

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
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const originalUserId = authResult.userId;
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';

    // 将 userId 转换为适合数据库查询的格式（处理测试用户和其他情况）
    const userId = getUserIdForQuery(originalUserId);

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
    // Step 2: 获取用户网站列表 (带最新数据)
    // ==========================================
    const websitesResult = await sql`
      WITH latest_data AS (
        SELECT DISTINCT ON (website_id)
          website_id,
          organic_traffic,
          total_keywords,
          avg_position,
          top10_count,
          traffic_cost
        FROM domain_overview_cache
        WHERE location_code = 2840
        ORDER BY website_id, data_date DESC, location_code
      )
      SELECT
        w.id,
        w.website_url,
        w.website_domain,
        w.website_title,
        w.website_description,
        w.website_screenshot,
        w.industry,
        COALESCE(ld.organic_traffic, w.monthly_visits) as organic_traffic,
        w.monthly_revenue,
        w.marketing_tools,
        w.is_default,
        w.last_accessed_at,
        w.bound_at,
        w.is_active,
        w.created_at,
        w.updated_at,
        ld.total_keywords,
        ld.avg_position,
        ld.top10_count,
        ld.traffic_cost
      FROM user_websites w
      LEFT JOIN latest_data ld ON w.id = ld.website_id
      WHERE w.user_id = ${userId} AND w.is_active = true
      ORDER BY
        w.is_default DESC,
        w.last_accessed_at DESC NULLS LAST,
        w.created_at DESC
    `;

    const websites = websitesResult.rows.map(row => ({
      id: row.id,
      url: row.website_url,
      domain: row.website_domain,
      title: row.website_title,
      description: row.website_description,
      screenshot: row.website_screenshot,
      industry: row.industry,
      monthlyVisits: row.organic_traffic,
      monthlyRevenue: row.monthly_revenue,
      marketingTools: row.marketing_tools || [],
      isDefault: row.is_default,
      lastAccessedAt: row.last_accessed_at,
      boundAt: row.bound_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      keywordsCount: row.total_keywords,
      healthScore: row.avg_position ? Math.max(0, Math.min(100, Math.round(100 - row.avg_position))) : null,
      top10Count: row.top10_count,
      trafficCost: row.traffic_cost
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
    // Step 5: 更新最后访问时间
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

    // 如果是 UUID 格式错误且是开发模式，返回空结果而不是错误
    if (error?.code === '22P02') {
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
      if (isDevelopment) {
        console.warn('[API: websites/list] UUID format error in development mode, returning empty result');
        return res.status(200).json({
          success: true,
          data: {
            websites: [],
            currentWebsite: null,
            preferences: {
              defaultWebsiteId: null,
              lastSelectedWebsiteId: null,
              uiSettings: {}
            }
          }
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch websites list',
      details: error.message
    });
  }
}
