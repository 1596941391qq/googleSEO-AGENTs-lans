/**
 * API: 仅获取竞争对手数据（快速响应）
 * 
 * 用于并行加载，快速返回竞争对手数据
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';

interface CompetitorsOnlyRequestBody {
  websiteId: string;
  userId?: number;
  limit?: number;
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
    const body = req.body as CompetitorsOnlyRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

    const limit = body.limit || 5;

    await initWebsiteDataTables();

    // 获取竞争对手数据
    const competitorsResult = await sql`
      SELECT
        competitor_domain,
        competitor_title,
        common_keywords,
        organic_traffic,
        total_keywords,
        gap_keywords,
        gap_traffic
      FROM domain_competitors_cache
      WHERE website_id = ${body.websiteId}
        AND cache_expires_at > NOW()
      ORDER BY organic_traffic DESC
      LIMIT ${limit}
    `;

    const competitors = competitorsResult.rows.map((row: any) => ({
      domain: row.competitor_domain,
      title: row.competitor_title,
      commonKeywords: row.common_keywords,
      organicTraffic: row.organic_traffic,
      totalKeywords: row.total_keywords,
      gapKeywords: row.gap_keywords,
      gapTraffic: row.gap_traffic,
    }));

    return res.status(200).json({
      success: true,
      data: competitors,
      cached: competitors.length > 0,
    });

  } catch (error: any) {
    console.error('[API: website-data/competitors-only] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch competitors',
      details: error.message
    });
  }
}

