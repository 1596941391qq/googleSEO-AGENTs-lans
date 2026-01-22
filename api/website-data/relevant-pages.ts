/**
 * API: 获取相关页面（表现最好的页面）
 * 
 * 功能：
 * - 列出目标域名下表现最好的页面（流量最高、排名最好）
 * - 帮助识别竞争对手的核心资产
 * 
 * 方法: POST
 * 端点: /api/website-data/relevant-pages
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { getRelevantPages } from '../_shared/tools/dataforseo-domain.js';

interface RelevantPagesRequestBody {
  websiteId: string;
  limit?: number;
  region?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const body = req.body as RelevantPagesRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    const limit = body.limit || 20;

    await initWebsiteDataTables();

    // 获取网站信息
    const websiteResult = await sql`
      SELECT website_domain, user_id
      FROM user_websites
      WHERE id = ${body.websiteId}
    `;

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // 验证权限
    if (String(website.user_id) !== String(userId)) {
      console.warn('[relevant-pages] Permission denied:', {
        websiteUserId: website.user_id,
        authUserId: userId,
        websiteId: body.websiteId,
      });
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    const domain = website.website_domain;

    // 将地区代码转换为 locationCode
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[region] || 2840;

    // 先尝试从缓存读取
    const cacheResult = await sql`
      SELECT
        page_url,
        organic_traffic,
        keywords_count,
        avg_position,
        top_keywords
      FROM relevant_pages_cache
      WHERE website_id = ${body.websiteId}
        AND location_code = ${locationCode}
        AND cache_expires_at > NOW()
      ORDER BY organic_traffic DESC
      LIMIT ${limit}
    `;

    // 仅从缓存读取，不自动调用 DataForSEO API
    if (cacheResult.rows.length === 0) {
      console.log('[relevant-pages] ℹ️ No cached data found, returning empty list');
      return res.status(200).json({
        success: true,
        data: [],
        cached: true,
        message: 'No cached data. Please sync metrics first.'
      });
    }

    // 从数据库缓存读取
    console.log('[relevant-pages] 📦 Using database cache');
    const pages = cacheResult.rows.map((row: any) => ({
      url: row.page_url,
      organicTraffic: Number(row.organic_traffic) || 0,
      keywordsCount: row.keywords_count,
      avgPosition: Number(row.avg_position) || 0,
      topKeywords: typeof row.top_keywords === 'string' ? JSON.parse(row.top_keywords) : row.top_keywords || [],
    }));

    return res.status(200).json({
      success: true,
      data: pages,
      cached: true,
    });

  } catch (error: any) {
    console.error('[API: website-data/relevant-pages] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch relevant pages',
      details: error.message
    });
  }
}
