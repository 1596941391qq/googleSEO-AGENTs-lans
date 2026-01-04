/**
 * API: 仅获取网站概览数据（快速响应）
 * 
 * 用于并行加载，快速返回概览数据
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';

interface OverviewOnlyRequestBody {
  websiteId: string;
  userId?: number;
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
    const body = req.body as OverviewOnlyRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

    await initWebsiteDataTables();

    // 获取概览数据
    const overviewResult = await sql`
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

    const overview = overviewResult.rows[0];

    if (!overview) {
      return res.status(200).json({
        success: true,
        data: null,
        cached: false,
      });
    }

    const rankingDistribution = {
      top3: overview.top3_count || 0,
      top10: overview.top10_count || 0,
      top50: overview.top50_count || 0,
      top100: overview.top100_count || 0,
    };

    // 解析 backlinks_info JSONB 字段
    let backlinksInfo = null;
    if (overview.backlinks_info) {
      try {
        backlinksInfo = typeof overview.backlinks_info === 'string' 
          ? JSON.parse(overview.backlinks_info) 
          : overview.backlinks_info;
      } catch (error) {
        console.warn('[overview-only] Failed to parse backlinks_info:', error);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        organicTraffic: overview.organic_traffic || 0,
        paidTraffic: overview.paid_traffic || 0,
        totalTraffic: overview.total_traffic || 0,
        totalKeywords: overview.total_keywords || 0,
        newKeywords: overview.new_keywords || 0,
        lostKeywords: overview.lost_keywords || 0,
        improvedKeywords: overview.improved_keywords || 0,
        declinedKeywords: overview.declined_keywords || 0,
        avgPosition: overview.avg_position || 0,
        trafficCost: overview.traffic_cost || 0,
        rankingDistribution,
        backlinksInfo,
        updatedAt: overview.data_updated_at,
        expiresAt: overview.cache_expires_at,
      },
      cached: true,
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

