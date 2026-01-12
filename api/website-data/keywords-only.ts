/**
 * API: 仅获取关键词数据
 * 
 * 逻辑：
 * 1. 先尝试调用 DataForSEO API 获取最新数据
 * 2. 如果 API 调用失败，从缓存读取
 * 3. 只调用一次 DataForSEO API，不轮询
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql, raw } from '../lib/database.js';
import { getDomainKeywords } from '../_shared/tools/dataforseo-domain.js';
import { authenticateRequest } from '../_shared/auth.js';

interface KeywordsOnlyRequestBody {
  websiteId: string;
  websiteDomain?: string; // 可选：当 websiteId 是临时ID（manual-开头）时，必须提供域名
  userId?: string | number; // 向后兼容，但优先使用 JWT 认证
  limit?: number;
  region?: string;
  sortBy?: 'searchVolume' | 'difficulty' | 'cpc' | 'position'; // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向
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
    // 权限校验 - 使用 JWT token 认证
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId; // userId 现在是归一化后的 UUID

    const body = req.body as KeywordsOnlyRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    const limit = body.limit || 20;
    const sortBy = body.sortBy || 'searchVolume';
    const sortOrder = body.sortOrder || 'desc';

    // 检查是否是临时手动网站（manual- 开头）
    const isManualWebsite = body.websiteId && body.websiteId.startsWith('manual-');
    let domain: string;
    let cacheWebsiteId: string; // 用于缓存键的网站ID

    if (isManualWebsite) {
      // 临时手动网站：需要提供域名
      if (!body.websiteDomain) {
        return res.status(400).json({ 
          error: 'websiteDomain is required for manual websites',
          message: 'When using a temporary website ID (manual-*), you must provide the websiteDomain parameter'
        });
      }
      domain = body.websiteDomain;
      cacheWebsiteId = body.websiteId; // 使用临时ID作为缓存键
    } else {
      // 数据库中的网站：从数据库查询
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

      // 验证权限 - 使用字符串比较以确保兼容性
      if (String(website.user_id) !== String(userId)) {
        return res.status(403).json({ error: 'Website does not belong to user' });
      }

      // 使用实际的网站域名
      domain = website.website_domain;
      cacheWebsiteId = body.websiteId;
    }

    // 将地区代码转换为 locationCode
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[region] || 2840;

    // 检查是否有正在进行的 API 调用
    const cacheKey = `keywords_${cacheWebsiteId}_${locationCode}`;
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
            
            // 只有非临时网站才保存到数据库缓存
            if (!isManualWebsite) {
              await initWebsiteDataTables();
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
                    ${cacheWebsiteId},
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
            
            const cleanedCount = keywordsToCache.length;
            console.log(`[keywords-only] ✅ Successfully fetched and cached ${cleanedCount} keywords from API (cleaned from ${data.length} raw keywords)`);
            // 返回清理后的关键词（已经限制数量）
            return keywordsToCache;
          }
          return [];
        })
        .catch((error) => {
          const errorMessage = error?.message || error?.toString?.() || 'Unknown error';
          console.error('[keywords-only] ❌ API call failed:', errorMessage);
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

    // 构建排序 SQL
    let orderByClause = '';
    switch (sortBy) {
      case 'cpc':
        orderByClause = sortOrder === 'asc' 
          ? 'ORDER BY cpc ASC NULLS LAST' 
          : 'ORDER BY cpc DESC NULLS LAST';
        break;
      case 'difficulty':
        orderByClause = sortOrder === 'asc' 
          ? 'ORDER BY difficulty ASC NULLS LAST' 
          : 'ORDER BY difficulty DESC NULLS LAST';
        break;
      case 'position':
        orderByClause = sortOrder === 'asc' 
          ? 'ORDER BY current_position ASC NULLS LAST' 
          : 'ORDER BY current_position DESC NULLS LAST';
        break;
      case 'searchVolume':
      default:
        orderByClause = sortOrder === 'asc' 
          ? 'ORDER BY search_volume ASC NULLS LAST' 
          : 'ORDER BY search_volume DESC NULLS LAST';
        break;
    }
    // 添加二级排序：如果主排序字段相同，按更新时间排序
    orderByClause += ', data_updated_at DESC';

    // 如果 API 调用失败或返回空数据，从数据库缓存读取（仅适用于非临时网站）
    if (keywords.length === 0 && !isManualWebsite) {
      console.log('[keywords-only] 📦 Falling back to database cache');
      await initWebsiteDataTables();
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
          traffic_percentage,
          ranking_url
        FROM domain_keywords_cache
        WHERE website_id = ${cacheWebsiteId}
          AND location_code = ${locationCode}
        ${raw(orderByClause)}
        LIMIT ${limit}
      `;

      // 清理关键词函数（与 dataforseo-domain.ts 中的逻辑一致）
      const cleanKeyword = (rawKeyword: string): string => {
        if (!rawKeyword) return '';
        let cleaned = rawKeyword.trim();
        // 1. 移除类似 "001-qk7yulqsx9esalil5mxjkg-3342555957" 的完整ID格式
        cleaned = cleaned.replace(/^\d{1,3}-[a-z0-9-]+-\d+(\s+|$)/i, '');
        // 2. 移除开头的数字编号（如 "051 "、"0 "、"09 "）
        cleaned = cleaned.replace(/^\d{1,3}\s+(?=[a-zA-Z\u4e00-\u9fa5])/, '');
        // 3. 移除纯数字开头的项
        cleaned = cleaned.replace(/^\d+\s+/, '');
        // 4. 如果清理后只剩下纯数字，返回空字符串
        if (/^\d+$/.test(cleaned)) {
          return '';
        }
        // 5. 移除末尾的数字后缀
        cleaned = cleaned.replace(/\s+\d{1,3}$/, '');
        return cleaned.trim();
      };

      // 清理关键词（读取时自动清理，确保显示的数据是干净的）
      keywords = cacheResult.rows
        .map((row: any) => ({
          keyword: cleanKeyword(row.keyword || ''),
          currentPosition: row.current_position,
          previousPosition: row.previous_position,
          positionChange: row.position_change,
          searchVolume: row.search_volume,
          cpc: row.cpc,
          competition: row.competition,
          difficulty: row.difficulty,
          trafficPercentage: row.traffic_percentage,
          url: row.ranking_url || '',
        }))
        .filter((kw: any) => kw.keyword && kw.keyword.length > 0 && !/^\d+$/.test(kw.keyword)); // 过滤空关键词和纯数字
    } else {
      // API 调用成功，转换数据格式并应用排序
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
        url: kw.url || '',
      }));

      // 应用排序（只支持 searchVolume, difficulty, cpc, position）
      keywords.sort((a, b) => {
        let aValue: number | null = null;
        let bValue: number | null = null;

        switch (sortBy) {
          case 'cpc':
            aValue = a.cpc || 0;
            bValue = b.cpc || 0;
            break;
          case 'difficulty':
            aValue = a.difficulty || 0;
            bValue = b.difficulty || 0;
            break;
          case 'position':
            aValue = a.currentPosition || 999;
            bValue = b.currentPosition || 999;
            break;
          case 'searchVolume':
          default:
            aValue = a.searchVolume || 0;
            bValue = b.searchVolume || 0;
            break;
        }

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      // 限制数量
      keywords = keywords.slice(0, limit);
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
      details: error?.message || error?.toString?.() || 'Unknown error'
    });
  }
}
