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
import { authenticateRequest } from '../_shared/auth.js';
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
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId;

    const body = req.body as UpdateMetricsRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    // 初始化数据库表
    await initWebsiteDataTables();

    // 检查是否最近已经有更新尝试或成功更新（5分钟内，update-metrics 是显式调用的，窗口可以设短一点）
    const recentCheck = await sql`
      SELECT data_updated_at 
      FROM domain_overview_cache 
      WHERE website_id = ${body.websiteId} 
        AND data_updated_at > NOW() - INTERVAL '5 minutes'
      LIMIT 1
    `;

    if (recentCheck.rows.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Metrics recently updated, skipping redundant request',
        data: {
          updatedAt: recentCheck.rows[0].data_updated_at,
        }
      });
    }

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
    if (String(website.user_id) !== String(userId)) {
      console.warn('[update-metrics] Permission denied:', {
        websiteUserId: website.user_id,
        authUserId: userId,
        websiteId: body.websiteId,
      });
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

    // 调用 DataForSEO API 获取数据
    const [overview, keywords, competitors] = await Promise.all([
      getDomainOverview(website.website_domain, locationCode).catch(() => null),
      getDomainKeywords(website.website_domain, locationCode, 50).catch(() => []),
      getDomainCompetitors(website.website_domain, locationCode, 5).catch(() => []),
    ]);

    // 缓存概览数据 (使用 UPSERT 避免删除旧数据)
    if (overview) {
      await sql`
        INSERT INTO domain_overview_cache (
          website_id,
          location_code,
          data_date,
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
          ${locationCode},
          CURRENT_DATE,
          ${overview.organicTraffic},
          ${overview.paidTraffic},
          ${overview.totalTraffic},
          ${overview.totalKeywords},
          ${overview.newKeywords},
          ${overview.lostKeywords},
          ${overview.improvedKeywords || 0},
          ${overview.declinedKeywords || 0},
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

    // 缓存关键词数据（只缓存前20个）
    if (keywords.length > 0) {
      const keywordsToCache = keywords.slice(0, 20);
      await Promise.all(
        keywordsToCache.map(kw => sql`
          INSERT INTO domain_keywords_cache (
            website_id,
            location_code,
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
            ${locationCode},
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
            website_id,
            location_code,
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
            ${locationCode},
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
          ON CONFLICT (website_id, competitor_domain, location_code) DO UPDATE SET
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
    }

    // 可选：获取并缓存排名关键词（增强版，包含 SERP 特性）
    try {
      const rankedKeywords = await getRankedKeywords(website.website_domain, locationCode, 50, true);
      if (rankedKeywords.length > 0) {
        const cleanKeywordForDB = (rawKeyword: string): string => {
          if (!rawKeyword) return '';
          let cleaned = rawKeyword.trim();
          cleaned = cleaned.replace(/^\d{1,3}-[a-z0-9-]+-\d+(\s+|$)/i, '');
          cleaned = cleaned.replace(/^\d{1,3}\s+(?=[a-zA-Z\u4e00-\u9fa5])/, '');
          cleaned = cleaned.replace(/^\d+\s+/, '');
          if (/^\d+$/.test(cleaned)) return '';
          cleaned = cleaned.replace(/\s+\d{1,3}$/, '');
          return cleaned.trim();
        };

        const cleanedKeywords = rankedKeywords
          .map(kw => ({
            ...kw,
            keyword: cleanKeywordForDB(kw.keyword || '')
          }))
          .filter(kw => kw.keyword && kw.keyword.length > 0 && !/^\d+$/.test(kw.keyword))
          .slice(0, 50);

        await Promise.all(
          cleanedKeywords.map(kw => sql`
            INSERT INTO ranked_keywords_cache (
              website_id,
              location_code,
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
              ${locationCode},
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
            ON CONFLICT (website_id, keyword, location_code) DO UPDATE SET
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
      }
    } catch (error: any) {
      // ignore
    }

    // 可选：获取并缓存相关页面
    try {
      const relevantPages = await getRelevantPages(website.website_domain, locationCode, 20);
      if (relevantPages.length > 0) {
        await Promise.all(
          relevantPages.map(page => sql`
            INSERT INTO relevant_pages_cache (
              website_id,
              location_code,
              page_url,
              organic_traffic,
              keywords_count,
              avg_position,
              top_keywords,
              data_updated_at,
              cache_expires_at
            ) VALUES (
              ${body.websiteId},
              ${locationCode},
              ${page.url},
              ${page.organicTraffic},
              ${page.keywordsCount},
              ${page.avgPosition},
              ${JSON.stringify(page.topKeywords)},
              NOW(),
              NOW() + INTERVAL '24 hours'
            )
            ON CONFLICT (website_id, page_url, location_code) DO UPDATE SET
              organic_traffic = EXCLUDED.organic_traffic,
              keywords_count = EXCLUDED.keywords_count,
              avg_position = EXCLUDED.avg_position,
              top_keywords = EXCLUDED.top_keywords,
              data_updated_at = NOW(),
              cache_expires_at = EXCLUDED.cache_expires_at
          `)
        );
      }
    } catch (error: any) {
      // ignore
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
