/**
 * API: 更新网站指标（从 SE-Ranking Domain API 获取并缓存）
 *
 * 功能：
 * - 调用 SE-Ranking Domain API 获取域名概览、关键词、历史、竞争对手数据
 * - 缓存到数据库
 * - 返回最新数据
 *
 * 方法: POST
 * 端点: /api/website-data/update-metrics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import {
  getAllDomainData,
  type DomainOverview,
  type DomainKeyword,
  type RankingHistoryPoint,
  type DomainCompetitor,
} from '../_shared/tools';

interface UpdateMetricsRequestBody {
  websiteId: string;
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
    const body = req.body as UpdateMetricsRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    // 获取 user_id
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
    // Step 2: 从 SE-Ranking Domain API 获取数据
    // ==========================================
    console.log('[update-metrics] Fetching data from SE-Ranking Domain API...');

    const domainData = await getAllDomainData(website.website_domain);

    // ==========================================
    // Step 3: 缓存域名概览数据
    // ==========================================
    if (domainData.overview) {
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
          data_updated_at,
          cache_expires_at
        ) VALUES (
          ${body.websiteId},
          ${domainData.overview.organicTraffic},
          ${domainData.overview.paidTraffic},
          ${domainData.overview.totalTraffic},
          ${domainData.overview.totalKeywords},
          ${domainData.overview.newKeywords},
          ${domainData.overview.lostKeywords},
          ${domainData.overview.improvedKeywords},
          ${domainData.overview.declinedKeywords},
          ${domainData.overview.avgPosition},
          ${domainData.overview.trafficCost},
          ${domainData.overview.rankingDistribution.top3},
          ${domainData.overview.rankingDistribution.top10},
          ${domainData.overview.rankingDistribution.top50},
          ${domainData.overview.rankingDistribution.top100},
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
          data_updated_at = NOW(),
          cache_expires_at = EXCLUDED.cache_expires_at
      `;

      console.log('[update-metrics] Cached domain overview');
    }

    // ==========================================
    // Step 4: 缓存关键词排名数据
    // ==========================================
    if (domainData.keywords && domainData.keywords.length > 0) {
      for (const kw of domainData.keywords) {
        await sql`
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
            ${kw.competition},
            ${kw.difficulty},
            ${kw.trafficPercentage},
            ${kw.url},
            NOW(),
            NOW() + INTERVAL '24 hours'
          )
          ON CONFLICT (website_id, keyword) DO UPDATE SET
            current_position = EXCLUDED.current_position,
            previous_position = EXCLUDED.previous_position,
            position_change = EXCLUDED.position_change,
            search_volume = EXCLUDED.search_volume,
            cpc = EXCLUDED.cpc,
            competition = EXCLUDED.competition,
            difficulty = EXCLUDED.difficulty,
            traffic_percentage = EXCLUDED.trafficPercentage,
            ranking_url = EXCLUDED.ranking_url,
            data_updated_at = NOW(),
            cache_expires_at = EXCLUDED.cache_expires_at
        `;
      }

      console.log(`[update-metrics] Cached ${domainData.keywords.length} keywords`);
    }

    // ==========================================
    // Step 5: 缓存竞争对手数据
    // ==========================================
    if (domainData.competitors && domainData.competitors.length > 0) {
      for (const comp of domainData.competitors) {
        await sql`
          INSERT INTO domain_competitors_cache (
            website_id,
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
            ${comp.domain},
            ${comp.title},
            ${comp.commonKeywords},
            ${comp.organicTraffic},
            ${comp.totalKeywords},
            ${comp.gapKeywords},
            ${comp.gapTraffic},
            NOW(),
            NOW() + INTERVAL '7 days'
          )
          ON CONFLICT (website_id, competitor_domain) DO UPDATE SET
            competitor_title = EXCLUDED.competitor_title,
            common_keywords = EXCLUDED.common_keywords,
            organic_traffic = EXCLUDED.organic_traffic,
            total_keywords = EXCLUDED.total_keywords,
            gap_keywords = EXCLUDED.gap_keywords,
            gap_traffic = EXCLUDED.gap_traffic,
            data_updated_at = NOW(),
            cache_expires_at = EXCLUDED.cache_expires_at
        `;
      }

      console.log(`[update-metrics] Cached ${domainData.competitors.length} competitors`);
    }

    // ==========================================
    // Step 6: 更新网站表的最后更新时间
    // ==========================================
    await sql`
      UPDATE user_websites
      SET updated_at = NOW()
      WHERE id = ${body.websiteId}
    `;

    return res.status(200).json({
      success: true,
      message: 'Website metrics updated successfully',
      data: {
        overview: domainData.overview,
        keywordsCount: domainData.keywords.length,
        competitorsCount: domainData.competitors.length,
        historyCount: domainData.history.length,
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
