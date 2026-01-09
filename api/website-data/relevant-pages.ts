/**
 * API: 获取相关页面（表现最好的页面）
 * 
 * 功能：
 * - 列出目标域名下表现最好的页面（流量最高、排名最好）
 * - 帮助识别竞争对手的核心资产
 * 
 * 方法: POST
 * 端点: /api/website-data/relevant-pages
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { getRelevantPages } from '../_shared/tools/dataforseo-domain.js';

interface RelevantPagesRequestBody {
  websiteId: string;
  userId?: number;
  limit?: number;
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
    const body = req.body as RelevantPagesRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: userId is required' });
    }

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

    const domain = website.website_domain;

    // 将地区代码转换为 locationCode
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[region] || 2840;

    // 先尝试从缓存读取
    const cacheResult = await sql`
      SELECT
        page_url,
        organic_traffic,
        keywords_count,
        avg_position,
        top_keywords
      FROM relevant_pages_cache
      WHERE website_id = ${body.websiteId}
        AND location_code = ${locationCode}
        AND cache_expires_at > NOW()
      ORDER BY organic_traffic DESC
      LIMIT ${limit}
    `;

    let pages: any[] = [];
    let fromApi = false;

    // 如果缓存过期或不存在，从 API 获取
    if (cacheResult.rows.length === 0) {
      console.log('[relevant-pages] 🔍 Fetching from DataForSEO API...');
      
      try {
        const apiPages = await getRelevantPages(domain, locationCode, limit);
        
        if (apiPages.length > 0) {
          // 保存到缓存
          await Promise.all(
            apiPages.map(page => sql`
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
          
          pages = apiPages;
          fromApi = true;
          console.log(`[relevant-pages] ✅ Successfully fetched and cached ${pages.length} pages from API`);
        }
      } catch (error: any) {
        console.error('[relevant-pages] ❌ API call failed:', error.message);
      }
    }

    // 如果 API 调用失败或返回空数据，从数据库缓存读取
    if (pages.length === 0 && cacheResult.rows.length > 0) {
      console.log('[relevant-pages] 📦 Using database cache');
      pages = cacheResult.rows.map((row: any) => ({
        url: row.page_url,
        organicTraffic: Number(row.organic_traffic) || 0,
        keywordsCount: row.keywords_count,
        avgPosition: Number(row.avg_position) || 0,
        topKeywords: row.top_keywords || [],
      }));
    } else if (pages.length > 0) {
      // 如果 API 调用成功，转换数据格式
      pages = pages.map(page => ({
        url: page.url,
        organicTraffic: page.organicTraffic,
        keywordsCount: page.keywordsCount,
        avgPosition: page.avgPosition,
        topKeywords: page.topKeywords,
      }));
    }

    return res.status(200).json({
      success: true,
      data: pages,
      cached: !fromApi,
    });

  } catch (error: any) {
    console.error('[API: website-data/relevant-pages] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch relevant pages',
      details: error.message
    });
  }
}
