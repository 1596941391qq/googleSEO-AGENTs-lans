/**
 * API: 仅获取竞争对手数据
 * 
 * 逻辑：
 * 1. 先尝试调用 DataForSEO API 获取最新数据
 * 2. 如果 API 调用失败，从缓存读取
 * 3. 只调用一次 DataForSEO API，不轮询
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { getDomainCompetitors } from '../_shared/tools/dataforseo-domain.js';

interface CompetitorsOnlyRequestBody {
  websiteId: string;
  userId?: number;
  limit?: number;
  region?: string;
}

// 内存缓存，防止重复调用（5分钟内）
const apiCallCache = new Map<string, { timestamp: number; promise: Promise<any> }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟

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
    const body = req.body as CompetitorsOnlyRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

    const limit = body.limit || 5;

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
    if (website.user_id !== userId) {
      return res.status(403).json({ error: 'Website does not belong to user' });
    }

    // 使用实际的网站域名
    const domain = website.website_domain;

    // 将地区代码转换为 locationCode
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[region] || 2840;

    // 检查是否有正在进行的 API 调用
    const cacheKey = `competitors_${body.websiteId}_${locationCode}`;
    const cachedCall = apiCallCache.get(cacheKey);

    let competitors: any[] = [];
    let fromApi = false;

    // 尝试从 DataForSEO API 获取数据
    if (!cachedCall || Date.now() - cachedCall.timestamp > CACHE_DURATION) {
      console.log('[competitors-only] 🔍 Attempting to fetch from DataForSEO API...');

      const apiPromise = getDomainCompetitors(domain, locationCode, limit)
        .then(async (data) => {
          if (data && data.length > 0) {
            // 保存到缓存
            await Promise.all(
              data.map(comp => sql`
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
            console.log(`[competitors-only] ✅ Successfully fetched and cached ${data.length} competitors from API`);
            return data;
          }
          return [];
        })
        .catch((error) => {
          console.error('[competitors-only] ❌ API call failed:', error.message);
          return [];
        });

      // 缓存这个 Promise
      apiCallCache.set(cacheKey, {
        timestamp: Date.now(),
        promise: apiPromise,
      });

      // 清理过期的缓存
      for (const [key, value] of apiCallCache.entries()) {
        if (Date.now() - value.timestamp > CACHE_DURATION) {
          apiCallCache.delete(key);
        }
      }

      competitors = await apiPromise;
      fromApi = true;
    } else {
      console.log('[competitors-only] ⏭️  Using cached API call promise');
      competitors = await cachedCall.promise;
      fromApi = true;
    }

    // 如果 API 调用失败或返回空数据，从数据库缓存读取
    if (competitors.length === 0) {
      console.log('[competitors-only] 📦 Falling back to database cache');
      const cacheResult = await sql`
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
        LIMIT ${limit}
      `;

      competitors = cacheResult.rows.map((row: any) => ({
        domain: row.competitor_domain,
        title: row.competitor_title,
        commonKeywords: row.common_keywords,
        organicTraffic: row.organic_traffic,
        totalKeywords: row.total_keywords,
        gapKeywords: row.gap_keywords,
        gapTraffic: row.gap_traffic,
      }));
    } else {
      // API 调用成功，转换数据格式
      competitors = competitors.map(comp => ({
        domain: comp.domain,
        title: comp.title,
        commonKeywords: comp.commonKeywords,
        organicTraffic: comp.organicTraffic,
        totalKeywords: comp.totalKeywords,
        gapKeywords: comp.gapKeywords,
        gapTraffic: comp.gapTraffic,
      }));
    }

    return res.status(200).json({
      success: true,
      data: competitors,
      cached: !fromApi,
    });

  } catch (error: any) {
    console.error('[API: website-data/competitors-only] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch competitors',
      details: error.message
    });
  }
}
