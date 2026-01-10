/**
 * API: 获取网站概览仪表盘数据（仅读取缓存）
 *
 * 功能：
 * - 从数据库缓存读取网站概览数据
 * - 返回完整的仪表盘数据
 * - 不负责数据更新（由前端自动触发或用户手动刷新）
 *
 * 数据更新机制：
 * - 前端检测到无缓存时，会自动触发后台更新（不阻塞用户）
 * - 用户可以通过刷新按钮手动触发更新
 * - 更新由 /api/website-data/update-metrics 处理
 *
 * 方法: POST
 * 端点: /api/website-data/overview
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

interface OverviewRequestBody {
  websiteId: string;
  region?: string; // 地区代码，如 'us', 'uk'
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
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = authResult.userId; // userId 已在 authenticateRequest 中归一化

    const body = req.body as OverviewRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

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
    // Step 2: 检查缓存状态
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

    // 如果没有缓存或缓存过期，异步触发数据获取（不阻塞响应）
    if (needsRefresh) {
      (async () => {
        try {
          if (!website.website_domain) {
            return;
          }

          // 检查是否最近已经有更新尝试或成功更新（10分钟内）
          const recentCheck = await sql`
            SELECT data_updated_at 
            FROM domain_overview_cache 
            WHERE website_id = ${body.websiteId} 
              AND data_updated_at > NOW() - INTERVAL '10 minutes'
            LIMIT 1
          `;

          if (recentCheck.rows.length > 0) {
            return;
          }

          const regionToLocationCode: { [key: string]: number } = {
            'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
            'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
          };
          const locationCode = regionToLocationCode[body.region || 'us'] || 2840;

          // 调用 DataForSEO API 获取数据
          const { getDomainOverview, getDomainKeywords, getDomainCompetitors } = await import('../_shared/tools/dataforseo-domain.js');

          const [overview, keywords, competitors] = await Promise.all([
            getDomainOverview(website.website_domain, locationCode).catch(() => null),
            getDomainKeywords(website.website_domain, locationCode, 50).catch(() => []),
            getDomainCompetitors(website.website_domain, locationCode, 5).catch(() => []),
          ]);

          // 缓存概览数据（即使数据为 0 也要保存）
          if (overview !== null && overview !== undefined) {
            await sql`
              INSERT INTO domain_overview_cache (
                website_id, location_code, data_date, organic_traffic, paid_traffic, total_traffic,
                total_keywords, new_keywords, lost_keywords, improved_keywords, declined_keywords,
                avg_position, traffic_cost, top3_count, top10_count, top50_count, top100_count,
                backlinks_info, data_updated_at, cache_expires_at
              ) VALUES (
                ${body.websiteId}, ${locationCode}, CURRENT_DATE, ${overview.organicTraffic}, ${overview.paidTraffic}, ${overview.totalTraffic},
                ${overview.totalKeywords}, ${overview.newKeywords}, ${overview.lostKeywords},
                ${overview.improvedKeywords || 0}, ${overview.declinedKeywords || 0},
                ${overview.avgPosition}, ${overview.trafficCost},
                ${overview.rankingDistribution.top3}, ${overview.rankingDistribution.top10},
                ${overview.rankingDistribution.top50}, ${overview.rankingDistribution.top100},
                ${overview.backlinksInfo ? JSON.stringify(overview.backlinksInfo) : null},
                NOW(), NOW() + INTERVAL '24 hours'
              )
              ON CONFLICT (website_id, data_date, location_code) DO UPDATE SET
                organic_traffic = EXCLUDED.organic_traffic,
                paid_traffic = EXCLUDED.paid_traffic,
                total_traffic = EXCLUDED.total_traffic,
                total_keywords = EXCLUDED.total_keywords,
                new_keywords = EXCLUDED.new_keywords,
                lost_keywords = EXCLUDED.lost_keywords,
                improved_keywords = EXCLUDED.improved_keywords,
                declined_keywords = EXCLUDED.declined_keywords,
                avg_position = EXCLUDED.avg_position,
                traffic_cost = EXCLUDED.traffic_cost,
                top3_count = EXCLUDED.top3_count,
                top10_count = EXCLUDED.top10_count,
                top50_count = EXCLUDED.top50_count,
                top100_count = EXCLUDED.top100_count,
                backlinks_info = EXCLUDED.backlinks_info,
                data_updated_at = NOW(),
                cache_expires_at = EXCLUDED.cache_expires_at
            `;
          }

          // 缓存关键词数据（前20个）
          if (keywords.length > 0) {
            const keywordsToCache = keywords.slice(0, 20);
            await Promise.all(
              keywordsToCache.map(kw => sql`
                INSERT INTO domain_keywords_cache (
                  website_id, location_code, keyword, current_position, previous_position,
                  position_change, search_volume, cpc, competition, difficulty,
                  traffic_percentage, ranking_url, data_updated_at, cache_expires_at
                ) VALUES (
                  ${body.websiteId}, ${locationCode}, ${kw.keyword}, ${kw.currentPosition},
                  ${kw.previousPosition}, ${kw.positionChange}, ${kw.searchVolume},
                  ${kw.cpc}, ${kw.competition !== null && kw.competition !== undefined ? Math.min(Math.max(Number(kw.competition) || 0, 0), 99999999.99) : null},
                  ${kw.difficulty}, ${kw.trafficPercentage !== null && kw.trafficPercentage !== undefined ? Math.min(Math.max(Number(kw.trafficPercentage) || 0, 0), 99999999.99) : null},
                  ${kw.url || ''}, NOW(), NOW() + INTERVAL '24 hours'
                )
                ON CONFLICT (website_id, keyword, location_code) DO UPDATE SET
                  current_position = EXCLUDED.current_position,
                  previous_position = EXCLUDED.previous_position,
                  position_change = EXCLUDED.position_change,
                  search_volume = EXCLUDED.search_volume,
                  cpc = EXCLUDED.cpc,
                  competition = CASE 
                    WHEN EXCLUDED.competition IS NULL THEN NULL
                    ELSE LEAST(GREATEST(EXCLUDED.competition, 0), 99999999.99)
                  END,
                  difficulty = EXCLUDED.difficulty,
                  traffic_percentage = CASE 
                    WHEN EXCLUDED.traffic_percentage IS NULL THEN NULL
                    ELSE LEAST(GREATEST(EXCLUDED.traffic_percentage, 0), 99999999.99)
                  END,
                  ranking_url = EXCLUDED.ranking_url,
                  data_updated_at = NOW(),
                  cache_expires_at = EXCLUDED.cache_expires_at
              `)
            );
          }

          // 缓存竞争对手数据
          if (competitors.length > 0) {
            await Promise.all(
              competitors.map(comp => sql`
                INSERT INTO domain_competitors_cache (
                  website_id, location_code, competitor_domain, competitor_title,
                  common_keywords, organic_traffic, total_keywords,
                  gap_keywords, gap_traffic, data_updated_at, cache_expires_at
                ) VALUES (
                  ${body.websiteId}, ${locationCode}, ${comp.domain}, ${comp.title || null},
                  ${comp.commonKeywords || 0}, ${comp.organicTraffic || 0}, ${comp.totalKeywords || 0},
                  ${comp.gapKeywords || 0}, ${comp.gapTraffic || 0}, NOW(), NOW() + INTERVAL '7 days'
                )
                ON CONFLICT (website_id, competitor_domain, location_code) DO UPDATE SET
                  competitor_title = EXCLUDED.competitor_title,
                  common_keywords = EXCLUDED.common_keywords,
                  organic_traffic = EXCLUDED.organic_traffic,
                  total_keywords = EXCLUDED.total_keywords,
                  gap_keywords = EXCLUDED.gap_keywords,
                  gap_traffic = EXCLUDED.gap_traffic,
                  data_updated_at = NOW(),
                  cache_expires_at = EXCLUDED.cache_expires_at
              `)
            );
          }
        } catch (error: any) {
          console.error('[overview] ⚠️ Failed to auto-fetch data (non-blocking):', error.message);
        }
      })();
    }

    // ==========================================
    // Step 3: 获取概览数据（按 location_code 过滤）
    // ==========================================
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[body.region || 'us'] || 2840;

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
        AND location_code = ${locationCode}
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

    // 构建响应数据
    const responseData = {
      hasData,
      website: {
        id: website.id,
        url: website.website_url,
        domain: website.website_domain,
        title: website.website_title,
      },
      overview: overview ? {
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
        updatedAt: overview.data_updated_at,
        expiresAt: overview.cache_expires_at,
      } : null,
      topKeywords: topKeywords || [],
      competitors: competitors || [],
      needsRefresh,
    };

    return res.status(200).json({
      success: true,
      data: responseData,
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
