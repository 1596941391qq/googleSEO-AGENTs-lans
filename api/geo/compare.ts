/**
 * API: 对比不同地区的排名表现
 *
 * 功能：
 * - 对比关键词在不同地理位置的排名
 * - 识别表现最好/最差的地区
 * - 发现本地排名机会
 *
 * 方法: POST
 * 端点: /api/geo/compare
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initGeoTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

interface GeoCompareRequestBody {
  websiteId: string;
  keywordId: string;
  locations?: Array<{
    countryCode: string;
    region?: string;
    city?: string;
  }>;
  userId?: string | number; // 向后兼容，但优先使用 JWT 认证
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
    // 权限校验 - 使用 JWT token 认证
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId;

    const body = req.body as GeoCompareRequestBody;

    if (!body.websiteId || !body.keywordId) {
      return res.status(400).json({ error: 'websiteId and keywordId are required' });
    }

    // 初始化数据库表
    await initGeoTables();

    // ==========================================
    // Step 1: 验证权限
    // ==========================================
    const websiteCheck = await sql`
      SELECT user_id FROM user_websites
      WHERE id = ${body.websiteId}
    `;

    if (websiteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    if (String(websiteCheck.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    // ==========================================
    // Step 2: 获取关键词在不同地区的排名
    // ==========================================
    let locations = body.locations;

    // 如果没有指定地区，获取所有有数据的地区
    if (!locations || locations.length === 0) {
      const allLocationsResult = await sql`
        SELECT DISTINCT
          country_code,
          region
        FROM geo_rankings
        WHERE website_id = ${body.websiteId}
          AND keyword_id = ${body.keywordId}
        ORDER BY country_code, region
      `;

      locations = allLocationsResult.rows.map(row => ({
        countryCode: row.country_code,
        region: row.region,
      }));
    }

    // 构建对比数据
    const comparisons = [];

    for (const location of locations) {
      const { countryCode, region, city } = location;

      const rankingResult = await sql`
        SELECT
          current_position,
          previous_position,
          position_change,
          local_traffic,
          last_tracked_at
        FROM geo_rankings
        WHERE website_id = ${body.websiteId}
          AND keyword_id = ${body.keywordId}
          AND country_code = ${countryCode}
          ${region ? sql`AND region = ${region}` : sql``}
          ${city ? sql`AND city = ${city}` : sql``}
        ORDER BY last_tracked_at DESC
        LIMIT 1
      `;

      if (rankingResult.rows.length > 0) {
        const ranking = rankingResult.rows[0];
        comparisons.push({
          location: {
            countryCode,
            region: region || null,
            city: city || null,
          },
          ranking: {
            currentPosition: ranking.current_position,
            previousPosition: ranking.previous_position,
            positionChange: ranking.position_change,
          },
          traffic: ranking.local_traffic,
          lastTrackedAt: ranking.last_tracked_at,
        });
      }
    }

    // ==========================================
    // Step 3: 分析结果
    // ==========================================
    const validRankings = comparisons.filter(c => c.ranking.currentPosition !== null);

    if (validRankings.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          comparisons: [],
          analysis: null,
          message: 'No ranking data available for comparison',
        },
      });
    }

    // 找出表现最好和最差的地区
    const sortedByPosition = [...validRankings].sort(
      (a, b) => a.ranking.currentPosition! - b.ranking.currentPosition!
    );

    const bestLocation = sortedByPosition[0];
    const worstLocation = sortedByPosition[sortedByPosition.length - 1];

    // 计算平均排名
    const avgPosition =
      validRankings.reduce((sum, c) => sum + c.ranking.currentPosition!, 0) /
      validRankings.length;

    // 计算排名波动范围
    const positionRange = {
      min: sortedByPosition[0].ranking.currentPosition,
      max: sortedByPosition[sortedByPosition.length - 1].ranking.currentPosition,
      difference:
        sortedByPosition[sortedByPosition.length - 1].ranking.currentPosition! -
        sortedByPosition[0].ranking.currentPosition!,
    };

    // 总本地流量
    const totalLocalTraffic = validRankings.reduce(
      (sum, c) => sum + (c.traffic || 0),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        comparisons,
        analysis: {
          bestLocation: {
            location: bestLocation.location,
            position: bestLocation.ranking.currentPosition,
            traffic: bestLocation.traffic,
          },
          worstLocation: {
            location: worstLocation.location,
            position: worstLocation.ranking.currentPosition,
            traffic: worstLocation.traffic,
          },
          avgPosition: Math.round(avgPosition),
          positionRange,
          totalLocalTraffic,
          locationCount: validRankings.length,
        },
      },
    });

  } catch (error: any) {
    console.error('[API: geo/compare] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to compare GEO rankings',
      details: error.message
    });
  }
}
