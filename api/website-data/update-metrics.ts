/**
 * API: 更新网站指标（从 DataForSEO API 获取并缓存）
 *
 * 功能：
 * - 调用 DataForSEO API 获取域名概览、关键词、竞争对手数据
 * - 缓存到数据库
 * - 返回最新数据
 *
 * 方法: POST
 * 端点: /api/website-data/update-metrics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import {
  getDomainOverview,
  getDomainKeywords,
  getDomainCompetitors,
  getRankedKeywords,
  getRelevantPages,
  type DomainOverview,
  type DomainKeyword,
  type DomainCompetitor,
} from '../_shared/tools/dataforseo-domain.js';

interface UpdateMetricsRequestBody {
  websiteId: string;
  userId?: number;
  region?: string; // 可选：搜索地区，如 'us', 'uk'，空字符串表示全球
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

  console.log('[update-metrics] 🚀 Starting update metrics process');

  try {
    const body = req.body as UpdateMetricsRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    // 获取 user_id
    let userId = body.userId;
    if (!userId) userId = 1;

    // 初始化数据库表
    await initWebsiteDataTables();

    // 获取网站信息
    const websiteResult = await sql`
      SELECT
        id,
        website_url,
        website_domain,
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

    // 验证域名是否存在
    if (!website.website_domain) {
      return res.status(400).json({ error: 'Website domain is required' });
    }

    // 使用实际的网站域名

    // 将地区代码转换为 DataForSEO 的位置代码
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840,  // United States
      'uk': 2826,  // United Kingdom
      'ca': 2124,  // Canada
      'au': 2036,  // Australia
      'de': 2276,  // Germany
      'fr': 2250,  // France
      'jp': 2384,  // Japan
      'cn': 2166,  // China
    };
    const locationCode = regionToLocationCode[region] || 2840; // 默认使用 US

    console.log('[update-metrics] 📍 Fetching data for domain:', website.website_domain, 'location:', locationCode);

    // 清除可能存在的旧缓存（确保获取到正确的域名数据）
    // 这样可以避免使用之前 apple.com 的测试数据
    try {
      console.log('[update-metrics] 🗑️  Clearing old cache to ensure fresh data for domain:', website.website_domain);
      // 清除所有相关缓存表的数据（强制清除，确保获取新数据）
      await sql`DELETE FROM domain_overview_cache WHERE website_id = ${body.websiteId}`;
      await sql`DELETE FROM domain_keywords_cache WHERE website_id = ${body.websiteId}`;
      await sql`DELETE FROM domain_competitors_cache WHERE website_id = ${body.websiteId}`;
      console.log('[update-metrics] ✅ Cleared old cache for website:', body.websiteId);
    } catch (clearError: any) {
      console.warn('[update-metrics] ⚠️ Failed to clear old cache (non-critical):', clearError.message);
      // 继续执行，不清除缓存也不影响主流程
    }

    // 调用 DataForSEO API 获取数据
    const [overview, keywords, competitors] = await Promise.all([
      getDomainOverview(website.website_domain, locationCode)
        .then((result) => {
          if (result) {
            console.log('[update-metrics] ✅ Overview data received:', {
              domain: result.domain,
              totalKeywords: result.totalKeywords,
              organicTraffic: result.organicTraffic,
            });
          } else {
            console.warn('[update-metrics] ⚠️ Overview returned null - API may not have data for this domain');
          }
          return result;
        })
        .catch((err) => {
          console.error('[update-metrics] ❌ Failed to get overview:', err.message);
          console.error('[update-metrics] Error stack:', err.stack?.substring(0, 500));
          return null;
        }),
      getDomainKeywords(website.website_domain, locationCode, 50).catch((err) => {
        console.error('[update-metrics] Failed to get keywords:', err.message);
        return [];
      }),
      getDomainCompetitors(website.website_domain, locationCode, 5).catch((err) => {
        console.error('[update-metrics] Failed to get competitors:', err.message);
        return [];
      }),
    ]);

    // 缓存概览数据
    if (overview) {
      console.log('[update-metrics] 💾 Caching overview data:', {
        websiteId: body.websiteId,
        organicTraffic: overview.organicTraffic,
        totalKeywords: overview.totalKeywords,
        totalTraffic: overview.totalTraffic,
        rankingDistribution: overview.rankingDistribution,
      });

      await sql`
        INSERT INTO domain_overview_cache (
          website_id,
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
        ) VALUES (
          ${body.websiteId},
          ${overview.organicTraffic},
          ${overview.paidTraffic},
          ${overview.totalTraffic},
          ${overview.totalKeywords},
          ${overview.newKeywords},
          ${overview.lostKeywords},
          ${overview.improvedKeywords},
          ${overview.declinedKeywords},
          ${overview.avgPosition},
          ${overview.trafficCost},
          ${overview.rankingDistribution.top3},
          ${overview.rankingDistribution.top10},
          ${overview.rankingDistribution.top50},
          ${overview.rankingDistribution.top100},
          ${overview.backlinksInfo ? JSON.stringify(overview.backlinksInfo) : null},
          NOW(),
          NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (website_id, data_date) DO UPDATE SET
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
      console.log('[update-metrics] ✅ Successfully cached overview data to database');
    } else {
      console.warn('[update-metrics] ⚠️ No overview data to cache (overview is null)');
    }

    // 缓存关键词数据（只缓存前20个）
    if (keywords.length > 0) {
      const keywordsToCache = keywords.slice(0, 20);
      await Promise.all(
        keywordsToCache.map(kw => sql`
          INSERT INTO domain_keywords_cache (
            website_id,
            keyword,
            current_position,
            previous_position,
            position_change,
            search_volume,
            cpc,
            competition,
            difficulty,
            traffic_percentage,
            ranking_url,
            data_updated_at,
            cache_expires_at
          ) VALUES (
            ${body.websiteId},
            ${kw.keyword},
            ${kw.currentPosition},
            ${kw.previousPosition},
            ${kw.positionChange},
            ${kw.searchVolume},
            ${kw.cpc},
            ${kw.competition !== null && kw.competition !== undefined ? Math.min(Math.max(Number(kw.competition) || 0, 0), 99999999.99) : null},
            ${kw.difficulty},
            ${kw.trafficPercentage !== null && kw.trafficPercentage !== undefined ? Math.min(Math.max(Number(kw.trafficPercentage) || 0, 0), 99999999.99) : null},
            ${kw.url || ''},
            NOW(),
            NOW() + INTERVAL '24 hours'
          )
          ON CONFLICT (website_id, keyword) DO UPDATE SET
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
      console.log(`[update-metrics] ✅ Cached ${keywordsToCache.length} keywords`);
    }

    // 缓存竞争对手数据
    if (competitors.length > 0) {
      await Promise.all(
        competitors.map(comp => sql`
          INSERT INTO domain_competitors_cache (
            website_id,
            domain,
            competitor_domain,
            competitor_title,
            common_keywords,
            organic_traffic,
            total_keywords,
            gap_keywords,
            gap_traffic,
            data_updated_at,
            cache_expires_at
          ) VALUES (
            ${body.websiteId},
            ${website.website_domain},
            ${comp.domain},
            ${comp.title || comp.domain},
            ${comp.commonKeywords},
            ${comp.organicTraffic},
            ${comp.totalKeywords},
            ${comp.gapKeywords},
            ${comp.gapTraffic},
            NOW(),
            NOW() + INTERVAL '7 days'
          )
          ON CONFLICT (website_id, competitor_domain) DO UPDATE SET
            domain = EXCLUDED.domain,
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
      console.log(`[update-metrics] ✅ Cached ${competitors.length} competitors`);
    }

    // 可选：获取并缓存排名关键词（增强版，包含 SERP 特性）
    // 注意：这是一个可选功能，如果 API 调用失败不影响主流程
    try {
      const rankedKeywords = await getRankedKeywords(website.website_domain, locationCode, 50, true);
      if (rankedKeywords.length > 0) {
        await Promise.all(
          rankedKeywords.slice(0, 50).map(kw => sql`
            INSERT INTO ranked_keywords_cache (
              website_id,
              keyword,
              current_position,
              previous_position,
              search_volume,
              etv,
              serp_features,
              ranking_url,
              cpc,
              competition,
              difficulty,
              data_updated_at,
              cache_expires_at
            ) VALUES (
              ${body.websiteId},
              ${kw.keyword},
              ${kw.currentPosition},
              ${kw.previousPosition},
              ${kw.searchVolume},
              ${kw.etv},
              ${JSON.stringify(kw.serpFeatures)},
              ${kw.url},
              ${kw.cpc || null},
              ${kw.competition || null},
              ${kw.difficulty || null},
              NOW(),
              NOW() + INTERVAL '24 hours'
            )
            ON CONFLICT (website_id, keyword) DO UPDATE SET
              current_position = EXCLUDED.current_position,
              previous_position = EXCLUDED.previous_position,
              search_volume = EXCLUDED.search_volume,
              etv = EXCLUDED.etv,
              serp_features = EXCLUDED.serp_features,
              ranking_url = EXCLUDED.ranking_url,
              cpc = EXCLUDED.cpc,
              competition = EXCLUDED.competition,
              difficulty = EXCLUDED.difficulty,
              data_updated_at = NOW(),
              cache_expires_at = EXCLUDED.cache_expires_at
          `)
        );
        console.log(`[update-metrics] ✅ Cached ${rankedKeywords.length} ranked keywords`);
      }
    } catch (error: any) {
      console.warn('[update-metrics] ⚠️ Failed to cache ranked keywords (non-critical):', error.message);
    }

    // 可选：获取并缓存相关页面
    try {
      const relevantPages = await getRelevantPages(website.website_domain, locationCode, 20);
      if (relevantPages.length > 0) {
        await Promise.all(
          relevantPages.map(page => sql`
            INSERT INTO relevant_pages_cache (
              website_id,
              page_url,
              organic_traffic,
              keywords_count,
              avg_position,
              top_keywords,
              data_updated_at,
              cache_expires_at
            ) VALUES (
              ${body.websiteId},
              ${page.url},
              ${page.organicTraffic},
              ${page.keywordsCount},
              ${page.avgPosition},
              ${JSON.stringify(page.topKeywords)},
              NOW(),
              NOW() + INTERVAL '24 hours'
            )
            ON CONFLICT (website_id, page_url) DO UPDATE SET
              organic_traffic = EXCLUDED.organic_traffic,
              keywords_count = EXCLUDED.keywords_count,
              avg_position = EXCLUDED.avg_position,
              top_keywords = EXCLUDED.top_keywords,
              data_updated_at = NOW(),
              cache_expires_at = EXCLUDED.cache_expires_at
          `)
        );
        console.log(`[update-metrics] ✅ Cached ${relevantPages.length} relevant pages`);
      }
    } catch (error: any) {
      console.warn('[update-metrics] ⚠️ Failed to cache relevant pages (non-critical):', error.message);
    }

    // 更新网站表的最后更新时间
    await sql`
      UPDATE user_websites
      SET updated_at = NOW()
      WHERE id = ${body.websiteId}
    `;

    return res.status(200).json({
      success: true,
      message: 'Website metrics updated successfully',
      data: {
        overview: overview ? 'cached' : 'failed',
        keywordsCount: keywords.length,
        cachedKeywordsCount: Math.min(20, keywords.length),
        competitorsCount: competitors.length,
        updatedAt: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error('[API: website-data/update-metrics] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to update website metrics',
      details: error.message
    });
  }
}
