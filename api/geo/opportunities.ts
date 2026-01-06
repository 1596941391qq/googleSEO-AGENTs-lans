/**
 * API: 发现地理排名机会
 *
 * 功能：
 * - 识别在特定地理位置有排名提升机会的关键词
 * - 分析在不同地区的排名潜力
 * - 提供优化建议
 *
 * 方法: POST
 * 端点: /api/geo/opportunities
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initGeoTables, sql } from '../lib/database.js';

interface GeoOpportunitiesRequestBody {
  websiteId: string;
  targetCountry?: string;
  minPositionGap?: number; // 最小排名差距（例如：在目标地区排名比其他地区差 X 位）
  maxDifficulty?: number; // 最大难度分数
  status?: string; // 筛选状态：pending, in_progress, completed
  limit?: number;
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
    const body = req.body as GeoOpportunitiesRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

    const limit = body.limit || 50;

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

    if (websiteCheck.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    // ==========================================
    // Step 2: 构建查询条件（使用模板字符串）
    // ==========================================
    const conditionParts: any[] = [];
    conditionParts.push(sql`go.website_id = ${body.websiteId}`);

    if (body.targetCountry) {
      conditionParts.push(sql`go.target_country = ${body.targetCountry}`);
    }

    if (body.minPositionGap !== undefined) {
      conditionParts.push(sql`go.position_gap >= ${body.minPositionGap}`);
    }

    if (body.maxDifficulty !== undefined) {
      conditionParts.push(sql`go.difficulty_score <= ${body.maxDifficulty}`);
    }

    if (body.status) {
      conditionParts.push(sql`go.status = ${body.status}`);
    }

    // 组合 WHERE 条件
    const whereClause = conditionParts.reduce((acc, part, index) => {
      if (index === 0) {
        return part;
      }
      return sql`${acc} AND ${part}`;
    });

    // ==========================================
    // Step 3: 获取 GEO 机会列表
    // ==========================================
    const opportunitiesResult = await sql`
      SELECT
        go.id,
        go.website_id,
        go.keyword_id,
        go.target_country,
        go.target_region,
        go.target_city,
        go.current_position,
        go.potential_position,
        go.position_gap,
        go.estimated_traffic_gain,
        go.difficulty_score,
        go.effort_required,
        go.optimization_suggestions,
        go.status,
        go.created_at,
        go.updated_at,

        -- 关键词信息
        wk.keyword,
        wk.translation,

        -- 当前该关键词在目标地区的实际排名
        gr.current_position as actual_current_position,
        gr.local_traffic as actual_local_traffic

      FROM geo_opportunities go

      LEFT JOIN website_keywords wk
        ON go.keyword_id = wk.id

      LEFT JOIN geo_rankings gr
        ON gr.keyword_id = go.keyword_id
        AND gr.website_id = go.website_id
        AND gr.country_code = go.target_country
        AND (gr.region = go.target_region OR gr.region IS NULL)
        AND (gr.city = go.target_city OR gr.city IS NULL)

      WHERE ${whereClause}
      ORDER BY
        go.estimated_traffic_gain DESC NULLS LAST,
        go.position_gap DESC,
        go.difficulty_score ASC
      LIMIT ${limit}
    `;

    // ==========================================
    // Step 4: 统计摘要
    // ==========================================
    const statsResult = await sql`
      SELECT
        COUNT(*) as total_opportunities,
        SUM(estimated_traffic_gain) as total_potential_traffic,
        AVG(difficulty_score) as avg_difficulty,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
      FROM geo_opportunities
      WHERE ${whereClause}
    `;

    // 按国家分组统计
    const byCountryResult = await sql`
      SELECT
        target_country,
        COUNT(*) as opportunity_count,
        SUM(estimated_traffic_gain) as potential_traffic_gain,
        AVG(position_gap) as avg_position_gap
      FROM geo_opportunities
      WHERE ${whereClause}
      GROUP BY target_country
      ORDER BY potential_traffic_gain DESC
    `;

    return res.status(200).json({
      success: true,
      data: {
        opportunities: opportunitiesResult.rows.map(row => ({
          id: row.id,
          websiteId: row.website_id,
          keywordId: row.keyword_id,
          keyword: row.keyword,
          translation: row.translation,
          targetLocation: {
            country: row.target_country,
            region: row.target_region,
            city: row.target_city,
          },
          currentPosition: row.current_position,
          potentialPosition: row.potential_position,
          positionGap: row.position_gap,
          estimatedTrafficGain: row.estimated_traffic_gain,
          difficulty: row.difficulty_score,
          effortRequired: row.effort_required,
          suggestions: row.optimization_suggestions,
          status: row.status,
          actualRanking: row.actual_current_position
            ? {
                position: row.actual_current_position,
                traffic: row.actual_local_traffic,
              }
            : null,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        stats: {
          total: statsResult.rows[0].total_opportunities || 0,
          totalPotentialTraffic: statsResult.rows[0].total_potential_traffic || 0,
          avgDifficulty: statsResult.rows[0].avg_difficulty
            ? Math.round(statsResult.rows[0].avg_difficulty)
            : null,
          byStatus: {
            pending: statsResult.rows[0].pending_count || 0,
            inProgress: statsResult.rows[0].in_progress_count || 0,
            completed: statsResult.rows[0].completed_count || 0,
          },
          byCountry: byCountryResult.rows.map(row => ({
            country: row.target_country,
            opportunityCount: row.opportunity_count,
            potentialTrafficGain: row.potential_traffic_gain || 0,
            avgPositionGap: row.avg_position_gap
              ? Math.round(row.avg_position_gap)
              : null,
          })),
        },
      },
    });

  } catch (error: any) {
    console.error('[API: geo/opportunities] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch GEO opportunities',
      details: error.message
    });
  }
}
