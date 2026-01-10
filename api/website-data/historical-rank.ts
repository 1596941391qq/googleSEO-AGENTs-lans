/**
 * API: 获取历史排名概览
 * 
 * 功能：
 * - 获取指定域名在过去一段时间内的排名走势
 * - 展示网站在 Top 1, Top 3, Top 10 等不同位次区间的关键词数量分布
 * 
 * 方法: POST
 * 端点: /api/website-data/historical-rank
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { getHistoricalRankOverview } from '../_shared/tools/dataforseo-domain.js';

interface HistoricalRankRequestBody {
  websiteId: string;
  days?: number;
  region?: string;
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
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId;

    const body = req.body as HistoricalRankRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    const days = body.days || 30;

    await initWebsiteDataTables();

    // 获取网站信息
    const websiteResult = await sql`
      SELECT website_domain, user_id
      FROM user_websites
      WHERE id = ${body.websiteId}
    `;

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // 验证权限
    if (String(website.user_id) !== String(userId)) {
      console.warn('[historical-rank] Permission denied:', {
        websiteUserId: website.user_id,
        authUserId: userId,
        websiteId: body.websiteId,
      });
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    const domain = website.website_domain;

    // 将地区代码转换为 locationCode
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[region] || 2840;

    // 先尝试从缓存读取
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const cacheResult = await sql`
      SELECT
        date,
        top1_count,
        top3_count,
        top10_count,
        top50_count,
        top100_count
      FROM historical_rank_overview_cache
      WHERE website_id = ${body.websiteId}
        AND date >= ${dateFrom}
        AND cache_expires_at > NOW()
      ORDER BY date ASC
    `;

    let history: any[] = [];
    let fromApi = false;

    // 如果缓存过期或不存在，从 API 获取
    if (cacheResult.rows.length === 0) {
      console.log('[historical-rank] 🔍 Fetching from DataForSEO API...');

      try {
        const apiHistory = await getHistoricalRankOverview(domain, locationCode, days);

        if (apiHistory.length > 0) {
          // 保存到缓存
          await Promise.all(
            apiHistory.map(item => sql`
              INSERT INTO historical_rank_overview_cache (
                website_id,
                date,
                top1_count,
                top3_count,
                top10_count,
                top50_count,
                top100_count,
                data_updated_at,
                cache_expires_at
              ) VALUES (
                ${body.websiteId},
                ${item.date},
                ${item.top1Count},
                ${item.top3Count},
                ${item.top10Count},
                ${item.top50Count},
                ${item.top100Count},
                NOW(),
                NOW() + INTERVAL '7 days'
              )
              ON CONFLICT (website_id, date) DO UPDATE SET
                top1_count = EXCLUDED.top1_count,
                top3_count = EXCLUDED.top3_count,
                top10_count = EXCLUDED.top10_count,
                top50_count = EXCLUDED.top50_count,
                top100_count = EXCLUDED.top100_count,
                data_updated_at = NOW(),
                cache_expires_at = EXCLUDED.cache_expires_at
            `)
          );

          history = apiHistory;
          fromApi = true;
          console.log(`[historical-rank] ✅ Successfully fetched and cached ${history.length} history points from API`);
        }
      } catch (error: any) {
        console.error('[historical-rank] ❌ API call failed:', error.message);
      }
    }

    // 如果 API 调用失败或返回空数据，从数据库缓存读取
    if (history.length === 0 && cacheResult.rows.length > 0) {
      console.log('[historical-rank] 📦 Using database cache');
      history = cacheResult.rows.map((row: any) => ({
        date: row.date,
        top1Count: row.top1_count,
        top3Count: row.top3_count,
        top10Count: row.top10_count,
        top50Count: row.top50_count,
        top100Count: row.top100_count,
      }));
    } else if (history.length > 0) {
      // 如果 API 调用成功，转换数据格式
      history = history.map(item => ({
        date: item.date,
        top1Count: item.top1Count,
        top3Count: item.top3Count,
        top10Count: item.top10Count,
        top50Count: item.top50Count,
        top100Count: item.top100Count,
      }));
    }

    return res.status(200).json({
      success: true,
      data: history,
      cached: !fromApi,
    });

  } catch (error: any) {
    console.error('[API: website-data/historical-rank] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch historical rank overview',
      details: error.message
    });
  }
}
