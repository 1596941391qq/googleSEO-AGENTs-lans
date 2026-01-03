/**
 * API: 仅获取关键词数据（快速响应）
 * 
 * 用于并行加载，快速返回关键词数据
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';

interface KeywordsOnlyRequestBody {
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
    const body = req.body as KeywordsOnlyRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

    const limit = body.limit || 20;

    await initWebsiteDataTables();

    // 获取关键词数据
    const keywordsResult = await sql`
      SELECT
        keyword,
        current_position,
        previous_position,
        position_change,
        search_volume,
        cpc,
        competition,
        difficulty,
        traffic_percentage
      FROM domain_keywords_cache
      WHERE website_id = ${body.websiteId}
        AND cache_expires_at > NOW()
      ORDER BY search_volume DESC
      LIMIT ${limit}
    `;

    const keywords = keywordsResult.rows.map((row: any) => ({
      keyword: row.keyword,
      currentPosition: row.current_position,
      previousPosition: row.previous_position,
      positionChange: row.position_change,
      searchVolume: row.search_volume,
      cpc: row.cpc,
      competition: row.competition,
      difficulty: row.difficulty,
      trafficPercentage: row.traffic_percentage,
    }));

    return res.status(200).json({
      success: true,
      data: keywords,
      cached: keywords.length > 0,
    });

  } catch (error: any) {
    console.error('[API: website-data/keywords-only] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch keywords',
      details: error.message
    });
  }
}

