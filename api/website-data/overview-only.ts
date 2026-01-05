/**
 * API: 仅获取网站概览数据（只读缓存）
 * 
 * 逻辑：
 * 1. 只从数据库缓存读取数据，不调用 DataForSEO API
 * 2. 如果需要更新数据，应该调用 /api/website-data/update-metrics
 * 3. 这样可以避免重复调用 getDomainOverview API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
// 不再导入 getDomainOverview，因为此端点只读取缓存，不调用 API

interface OverviewOnlyRequestBody {
  websiteId: string;
  userId?: number;
  region?: string;
}

// 注意：已移除内存缓存，因为此端点只从数据库读取，不调用 API

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
    const body = req.body as OverviewOnlyRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

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
    if (website.user_id !== userId) {
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    // 使用实际的网站域名
    const domain = website.website_domain;

    // 将地区代码转换为 locationCode
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[region] || 2840;

    // overview-only 只从数据库缓存读取，不调用 API
    // API 调用应该通过 update-metrics 端点进行
    console.log('[overview-only] 📦 Reading from database cache only (no API calls)');
    
    // 从数据库缓存读取
    const cacheResult = await sql`
      SELECT
        organic_traffic,
        paid_traffic,
        total_traffic,
        total_keywords,
        new_keywords,
        lost_keywords,
        improved_keywords,
        declined_keywords,
        avg_position,
        traffic_cost,
        top3_count,
        top10_count,
        top50_count,
        top100_count,
        backlinks_info,
        data_updated_at,
        cache_expires_at
      FROM domain_overview_cache
      WHERE website_id = ${body.websiteId}
      ORDER BY data_date DESC
      LIMIT 1
    `;

    if (cacheResult.rows.length > 0) {
      const cached = cacheResult.rows[0];
      const rankingDistribution = {
        top3: cached.top3_count || 0,
        top10: cached.top10_count || 0,
        top50: cached.top50_count || 0,
        top100: cached.top100_count || 0,
      };

      let backlinksInfo = null;
      if (cached.backlinks_info) {
        try {
          backlinksInfo = typeof cached.backlinks_info === 'string'
            ? JSON.parse(cached.backlinks_info)
            : cached.backlinks_info;
        } catch (error) {
          console.warn('[overview-only] Failed to parse backlinks_info:', error);
        }
      }

      const responseData = {
        organicTraffic: Number(cached.organic_traffic) || 0,
        paidTraffic: Number(cached.paid_traffic) || 0,
        totalTraffic: Number(cached.total_traffic) || 0,
        totalKeywords: Number(cached.total_keywords) || 0,
        newKeywords: Number(cached.new_keywords) || 0,
        lostKeywords: Number(cached.lost_keywords) || 0,
        improvedKeywords: Number(cached.improved_keywords) || 0,
        declinedKeywords: Number(cached.declined_keywords) || 0,
        avgPosition: Number(cached.avg_position) || 0,
        trafficCost: Number(cached.traffic_cost) || 0,
        rankingDistribution,
        backlinksInfo,
        updatedAt: cached.data_updated_at,
        expiresAt: cached.cache_expires_at,
      };

      console.log('[overview-only] ✅ Returning cached data:', {
        websiteId: body.websiteId,
        organicTraffic: responseData.organicTraffic,
        totalKeywords: responseData.totalKeywords,
        totalTraffic: responseData.totalTraffic,
        rankingDistribution: responseData.rankingDistribution,
        hasBacklinksInfo: !!responseData.backlinksInfo,
      });

      return res.status(200).json({
        success: true,
        data: responseData,
        cached: true,
      });
    }

    // 如果没有缓存数据
    return res.status(200).json({
      success: true,
      data: null,
      cached: false,
    });

  } catch (error: any) {
    console.error('[API: website-data/overview-only] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch overview',
      details: error.message
    });
  }
}
