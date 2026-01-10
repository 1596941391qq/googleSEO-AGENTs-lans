/**
 * API: 获取排名关键词（增强版，包含 SERP 特性）
 * 
 * 功能：
 * - 获取域名在 Google/Bing 中获得排名的所有关键词列表
 * - 提供每个词的当前位次、历史排名变化、预估点击量 (ETV)、搜索量
 * - 标识该词是否触发了 AI Overview、Featured Snippets 等 SERP 特性
 * 
 * 方法: POST
 * 端点: /api/website-data/ranked-keywords
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql, raw } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { getRankedKeywords } from '../_shared/tools/dataforseo-domain.js';

interface RankedKeywordsRequestBody {
  websiteId: string;
  limit?: number;
  region?: string;
  includeSerpFeatures?: boolean;
  sortBy?: 'cpc' | 'difficulty' | 'searchVolume'; // 排序字段（移除 position）
  sortOrder?: 'asc' | 'desc'; // 排序方向
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

    const body = req.body as RankedKeywordsRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    const limit = body.limit || 100;
    const includeSerpFeatures = body.includeSerpFeatures !== false; // 默认 true
    const sortBy = body.sortBy || 'searchVolume'; // 默认按搜索量排序
    const sortOrder = body.sortOrder || 'desc'; // 默认降序

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
      console.warn('[ranked-keywords] Permission denied:', {
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

    // 构建排序 SQL（只支持 CPC、难度、搜索量）
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
      case 'searchVolume':
        orderByClause = sortOrder === 'asc' 
          ? 'ORDER BY search_volume ASC NULLS LAST' 
          : 'ORDER BY search_volume DESC NULLS LAST';
        break;
      default:
        orderByClause = 'ORDER BY search_volume DESC NULLS LAST';
    }

    // 先尝试从缓存读取（使用动态 SQL 查询）
    // 使用模板标签语法，ORDER BY 子句使用 raw() 函数标记为原始 SQL
    const cacheResult = await sql`
      SELECT
        keyword,
        current_position,
        previous_position,
        search_volume,
        etv,
        serp_features,
        ranking_url,
        cpc,
        competition,
        difficulty
      FROM ranked_keywords_cache
      WHERE website_id = ${body.websiteId}
        AND location_code = ${locationCode}
        AND cache_expires_at > NOW()
      ${raw(orderByClause)}
      LIMIT ${limit}
    `;

    let keywords: any[] = [];
    let fromApi = false;

    // 如果缓存过期或不存在，从 API 获取
    if (cacheResult.rows.length === 0) {
      console.log('[ranked-keywords] 🔍 Fetching from DataForSEO API...');
      
      try {
        const apiKeywords = await getRankedKeywords(domain, locationCode, limit, includeSerpFeatures);
        
        if (apiKeywords.length > 0) {
          // 保存到缓存
          await Promise.all(
            apiKeywords.map(kw => sql`
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
          
          keywords = apiKeywords;
          fromApi = true;
          console.log(`[ranked-keywords] ✅ Successfully fetched and cached ${keywords.length} keywords from API`);
        }
      } catch (error: any) {
        console.error('[ranked-keywords] ❌ API call failed:', error.message);
      }
    }

    // 如果 API 调用失败或返回空数据，从数据库缓存读取
    if (keywords.length === 0 && cacheResult.rows.length > 0) {
      console.log('[ranked-keywords] 📦 Using database cache');
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
          positionChange: (row.previous_position || 0) - (row.current_position || 0),
          searchVolume: row.search_volume,
          etv: Number(row.etv) || 0,
          serpFeatures: row.serp_features || {},
          url: row.ranking_url,
          cpc: row.cpc,
          competition: row.competition,
          difficulty: row.difficulty,
        }))
        .filter((kw: any) => kw.keyword && kw.keyword.length > 0 && !/^\d+$/.test(kw.keyword)); // 过滤空关键词和纯数字
    } else if (keywords.length > 0) {
      // 如果 API 调用成功，转换数据格式并应用排序
      keywords = keywords.map(kw => ({
        keyword: kw.keyword,
        currentPosition: kw.currentPosition,
        previousPosition: kw.previousPosition,
        positionChange: kw.positionChange,
        searchVolume: kw.searchVolume,
        etv: kw.etv,
        serpFeatures: kw.serpFeatures,
        url: kw.url,
        cpc: kw.cpc,
        competition: kw.competition,
        difficulty: kw.difficulty,
      }));

      // 应用排序（只支持 CPC、难度、搜索量）
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
          case 'searchVolume':
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
    console.error('[API: website-data/ranked-keywords] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch ranked keywords',
      details: error.message
    });
  }
}
