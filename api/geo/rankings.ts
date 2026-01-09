/**
 * API: 获取关键词的 GEO 排名数据
 *
 * 功能：
 * - 获取关键词在不同地理位置的排名
 * - 支持按国家/地区/城市筛选
 * - 显示排名变化和流量数据
 *
 * 方法: POST
 * 端点: /api/geo/rankings
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initGeoTables, sql } from '../lib/database.js';

interface GeoRankingsRequestBody {
  websiteId: string;
  keywordId?: string;
  countryCode?: string;
  userId?: number;
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
    const body = req.body as GeoRankingsRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: userId is required' });
    }

    // 初始化数据库表
    await initGeoTables();

    // ==========================================
    // Step 1: 验证网站权限
    // ==========================================
    const websiteCheck = await sql`
      SELECT user_id FROM user_websites
      WHERE id = ${body.websiteId}
    `;

    if (websiteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    if (websiteCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    // ==========================================
    // Step 2: 构建 WHERE 条件（使用模板字符串）
    // ==========================================
    const conditionParts: any[] = [];
    conditionParts.push(sql`website_id = ${body.websiteId}`);

    if (body.keywordId) {
      conditionParts.push(sql`keyword_id = ${body.keywordId}`);
    }

    if (body.countryCode) {
      conditionParts.push(sql`country_code = ${body.countryCode}`);
    }

    // 组合 WHERE 条件
    const whereClause = conditionParts.reduce((acc, part, index) => {
      if (index === 0) {
        return part;
      }
      return sql`${acc} AND ${part}`;
    });

    // ==========================================
    // Step 3: 获取 GEO 排名数据
    // ==========================================
    const rankingsResult = await sql`
      SELECT
        id,
        article_ranking_id,
        website_id,
        keyword_id,
        country_code,
        region,
        city,
        current_position,
        previous_position,
        position_change,
        local_traffic,
        is_tracking,
        last_tracked_at,
        created_at,
        updated_at
      FROM geo_rankings
      WHERE ${whereClause}
      ORDER BY country_code, region, city, current_position NULLS LAST
    `;

    // ==========================================
    // Step 4: 按国家分组统计
    // ==========================================
    const statsResult = await sql`
      SELECT
        country_code,
        COUNT(*) as total_keywords,
        COUNT(CASE WHEN current_position <= 10 THEN 1 END) as top10_count,
        COUNT(CASE WHEN current_position <= 3 THEN 1 END) as top3_count,
        AVG(current_position) as avg_position,
        SUM(local_traffic) as total_local_traffic
      FROM geo_rankings
      WHERE ${whereClause}
      GROUP BY country_code
      ORDER BY top10_count DESC
    `;

    // ==========================================
    // Step 5: 获取关键词信息（如果提供了 keywordId）
    // ==========================================
    let keywordInfo = null;
    if (body.keywordId) {
      const keywordResult = await sql`
        SELECT
          id,
          keyword,
          translation
        FROM website_keywords
        WHERE id = ${body.keywordId}
      `;

      if (keywordResult.rows.length > 0) {
        keywordInfo = keywordResult.rows[0];
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        rankings: rankingsResult.rows.map(row => ({
          id: row.id,
          articleRankingId: row.article_ranking_id,
          websiteId: row.website_id,
          keywordId: row.keyword_id,
          location: {
            countryCode: row.country_code,
            region: row.region,
            city: row.city,
          },
          ranking: {
            currentPosition: row.current_position,
            previousPosition: row.previous_position,
            positionChange: row.position_change,
          },
          traffic: row.local_traffic,
          isTracking: row.is_tracking,
          lastTrackedAt: row.last_tracked_at,
        })),
        stats: {
          byCountry: statsResult.rows.map(row => ({
            countryCode: row.country_code,
            totalKeywords: row.total_keywords,
            top10Count: row.top10_count,
            top3Count: row.top3_count,
            avgPosition: row.avg_position
              ? Math.round(row.avg_position)
              : null,
            totalLocalTraffic: row.total_local_traffic || 0,
          })),
        },
        keyword: keywordInfo,
      },
    });

  } catch (error: any) {
    console.error('[API: geo/rankings] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch GEO rankings',
      details: error.message
    });
  }
}
