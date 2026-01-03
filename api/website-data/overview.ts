/**
 * API: 获取网站概览仪表盘数据
 *
 * 功能：
 * - 从数据库缓存读取网站概览数据
 * - 如果缓存过期或不存在，触发更新
 * - 返回完整的仪表盘数据
 *
 * 方法: POST
 * 端点: /api/website-data/overview
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';

interface OverviewRequestBody {
  websiteId: string;
  userId?: number;
  forceRefresh?: boolean; // 强制刷新缓存
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
    const body = req.body as OverviewRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

    // 初始化数据库表
    await initWebsiteDataTables();

    // ==========================================
    // Step 1: 获取网站信息
    // ==========================================
    const websiteResult = await sql`
      SELECT
        id,
        website_url,
        website_domain,
        website_title,
        user_id
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

    // ==========================================
    // Step 2: 检查缓存是否需要刷新
    // ==========================================
    const cacheCheck = await sql`
      SELECT
        cache_expires_at,
        data_updated_at
      FROM domain_overview_cache
      WHERE website_id = ${body.websiteId}
      ORDER BY data_date DESC
      LIMIT 1
    `;

    const hasCache = cacheCheck.rows.length > 0;
    const cacheExpired = hasCache && new Date(cacheCheck.rows[0].cache_expires_at) < new Date();
    const needsRefresh = body.forceRefresh || !hasCache || cacheExpired;

    // 如果没有缓存，同步等待第一次数据获取
    if (!hasCache) {
      console.log('[overview] No cache found, fetching data from SE-Ranking...');

      // 构建完整 URL
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NODE_ENV === 'production'
          ? 'https://google-seo-agent.vercel.app'
          : 'http://localhost:3002';

      try {
        // 同步等待第一次数据获取完成（最多等待25秒）
        const updateResponse = await fetch(`${baseUrl}/api/website-data/update-metrics`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId: body.websiteId,
            userId,
          }),
        });

        if (!updateResponse.ok) {
          console.error('[overview] Failed to fetch initial data:', await updateResponse.text());
        } else {
          console.log('[overview] Initial data fetched successfully');
        }
      } catch (error) {
        console.error('[overview] Failed to fetch initial data:', error);
        // 即使失败也继续，返回空数据让用户知道需要手动刷新
      }
    } else if (cacheExpired && !body.forceRefresh) {
      // 如果缓存过期但不强制刷新，异步触发后台更新
      console.log('[overview] Cache expired, triggering background refresh...');

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NODE_ENV === 'production'
          ? 'https://google-seo-agent.vercel.app'
          : 'http://localhost:3002';

      // 异步触发更新（不等待完成）
      fetch(`${baseUrl}/api/website-data/update-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: body.websiteId,
          userId,
        }),
      }).catch((error) => {
        console.error('[overview] Failed to trigger refresh:', error);
      });
    }

    // ==========================================
    // Step 3: 获取概览数据
    // ==========================================
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
        data_updated_at,
        cache_expires_at
      FROM domain_overview_cache
      WHERE website_id = ${body.websiteId}
      ORDER BY data_date DESC
      LIMIT 1
    `;

    const overview = overviewResult.rows[0];

    // ==========================================
    // Step 4: 获取排名分布数据（用于图表）
    // ==========================================
    const rankingDistribution = {
      top3: overview?.top3_count || 0,
      top10: overview?.top10_count || 0,
      top50: overview?.top50_count || 0,
      top100: overview?.top100_count || 0,
    };

    // ==========================================
    // Step 5: 获取 Top 关键词（前 20 个）
    // ==========================================
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
      LIMIT 20
    `;

    const topKeywords = keywordsResult.rows.map((row: any) => ({
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

    // ==========================================
    // Step 6: 获取竞争对手数据
    // ==========================================
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
      LIMIT 5
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

    // ==========================================
    // Step 7: 构建响应
    // ==========================================
    const hasData = !!overview;

    return res.status(200).json({
      success: true,
      data: {
        hasData,
        website: {
          id: website.id,
          url: website.website_url,
          domain: website.website_domain,
          title: website.website_title,
        },
        overview: overview ? {
          organicTraffic: overview.organic_traffic,
          paidTraffic: overview.paid_traffic,
          totalTraffic: overview.total_traffic,
          totalKeywords: overview.total_keywords,
          newKeywords: overview.new_keywords,
          lostKeywords: overview.lost_keywords,
          improvedKeywords: overview.improved_keywords,
          declinedKeywords: overview.declined_keywords,
          avgPosition: overview.avg_position,
          trafficCost: overview.traffic_cost,
          rankingDistribution,
          updatedAt: overview.data_updated_at,
          expiresAt: overview.cache_expires_at,
        } : null,
        topKeywords,
        competitors,
        needsRefresh,
      }
    });

  } catch (error: any) {
    console.error('[API: website-data/overview] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch website overview',
      details: error.message
    });
  }
}
