/**
 * API: 仅获取关键词数据
 * 
 * 逻辑：
 * 1. 先尝试调用 DataForSEO API 获取最新数据
 * 2. 如果 API 调用失败，从缓存读取
 * 3. 只调用一次 DataForSEO API，不轮询
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { getDomainKeywords } from '../_shared/tools/dataforseo-domain.js';

interface KeywordsOnlyRequestBody {
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
    const body = req.body as KeywordsOnlyRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

    const limit = body.limit || 20;

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
    const cacheKey = `keywords_${body.websiteId}_${locationCode}`;
    const cachedCall = apiCallCache.get(cacheKey);
    
    let keywords: any[] = [];
    let fromApi = false;

    // 尝试从 DataForSEO API 获取数据
    if (!cachedCall || Date.now() - cachedCall.timestamp > CACHE_DURATION) {
      console.log('[keywords-only] 🔍 Attempting to fetch from DataForSEO API...');
      
      const apiPromise = getDomainKeywords(domain, locationCode, limit * 2) // 获取更多，然后缓存前20个
        .then(async (data) => {
          if (data && data.length > 0) {
            // 只缓存前20个关键词
            const keywordsToCache = data.slice(0, 20);
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
                  ${kw.competition},
                  ${kw.difficulty},
                  ${kw.trafficPercentage},
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
                  competition = EXCLUDED.competition,
                  difficulty = EXCLUDED.difficulty,
                  traffic_percentage = EXCLUDED.traffic_percentage,
                  ranking_url = EXCLUDED.ranking_url,
                  data_updated_at = NOW(),
                  cache_expires_at = EXCLUDED.cache_expires_at
              `)
            );
            console.log(`[keywords-only] ✅ Successfully fetched and cached ${keywordsToCache.length} keywords from API`);
            return data.slice(0, limit); // 返回请求的数量
          }
          return [];
        })
        .catch((error) => {
          console.error('[keywords-only] ❌ API call failed:', error.message);
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

      keywords = await apiPromise;
      fromApi = true;
    } else {
      console.log('[keywords-only] ⏭️  Using cached API call promise');
      keywords = await cachedCall.promise;
      fromApi = true;
    }

    // 如果 API 调用失败或返回空数据，从数据库缓存读取
    if (keywords.length === 0) {
      console.log('[keywords-only] 📦 Falling back to database cache');
      const cacheResult = await sql`
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
        ORDER BY search_volume DESC NULLS LAST, data_updated_at DESC
        LIMIT ${limit}
      `;

      keywords = cacheResult.rows.map((row: any) => ({
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
    } else {
      // API 调用成功，转换数据格式
      keywords = keywords.map(kw => ({
        keyword: kw.keyword,
        currentPosition: kw.currentPosition,
        previousPosition: kw.previousPosition,
        positionChange: kw.positionChange,
        searchVolume: kw.searchVolume,
        cpc: kw.cpc,
        competition: kw.competition,
        difficulty: kw.difficulty,
        trafficPercentage: kw.trafficPercentage,
      }));
    }

    return res.status(200).json({
      success: true,
      data: keywords,
      cached: !fromApi,
    });

  } catch (error: any) {
    console.error('[API: website-data/keywords-only] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch keywords',
      details: error.message
    });
  }
}
