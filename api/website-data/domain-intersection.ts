/**
 * API: 获取域名重合度分析
 * 
 * 功能：
 * - 对比你的网站和竞争对手，找出"对手有排名而你没有排名"的关键词（Content Gap）
 * - 这是 pSEO（程序化 SEO）内容生产的最重要参考
 * 
 * 方法: POST
 * 端点: /api/website-data/domain-intersection
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { getDomainIntersection } from '../_shared/tools/dataforseo-domain.js';

interface DomainIntersectionRequestBody {
  websiteId: string;
  userId?: number;
  competitorDomain: string;
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
    const body = req.body as DomainIntersectionRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    if (!body.competitorDomain) {
      return res.status(400).json({ error: 'competitorDomain is required' });
    }

    let userId = body.userId;
    if (!userId) userId = 1;

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
        competitor_domain,
        common_keywords,
        gap_keywords,
        gap_traffic,
        our_keywords
      FROM domain_intersection_cache
      WHERE website_id = ${body.websiteId}
        AND competitor_domain = ${body.competitorDomain}
        AND cache_expires_at > NOW()
      LIMIT 1
    `;

    let intersection: any = null;
    let fromApi = false;

    // 如果缓存过期或不存在，从 API 获取
    if (cacheResult.rows.length === 0) {
      console.log('[domain-intersection] 🔍 Fetching from DataForSEO API...');
      
      try {
        const apiIntersection = await getDomainIntersection(domain, body.competitorDomain, locationCode);
        
        if (apiIntersection) {
          // 保存到缓存
          await sql`
            INSERT INTO domain_intersection_cache (
              website_id,
              competitor_domain,
              common_keywords,
              gap_keywords,
              gap_traffic,
              our_keywords,
              data_updated_at,
              cache_expires_at
            ) VALUES (
              ${body.websiteId},
              ${body.competitorDomain},
              ${JSON.stringify(apiIntersection.commonKeywords)},
              ${JSON.stringify(apiIntersection.gapKeywords)},
              ${apiIntersection.gapTraffic},
              ${JSON.stringify(apiIntersection.ourKeywords)},
              NOW(),
              NOW() + INTERVAL '7 days'
            )
            ON CONFLICT (website_id, competitor_domain) DO UPDATE SET
              common_keywords = EXCLUDED.common_keywords,
              gap_keywords = EXCLUDED.gap_keywords,
              gap_traffic = EXCLUDED.gap_traffic,
              our_keywords = EXCLUDED.our_keywords,
              data_updated_at = NOW(),
              cache_expires_at = EXCLUDED.cache_expires_at
          `;
          
          intersection = apiIntersection;
          fromApi = true;
          console.log(`[domain-intersection] ✅ Successfully fetched and cached intersection data from API`);
        }
      } catch (error: any) {
        console.error('[domain-intersection] ❌ API call failed:', error.message);
      }
    }

    // 如果 API 调用失败或返回空数据，从数据库缓存读取
    if (!intersection && cacheResult.rows.length > 0) {
      console.log('[domain-intersection] 📦 Using database cache');
      const row = cacheResult.rows[0];
      intersection = {
        targetDomain: domain,
        competitorDomain: row.competitor_domain,
        commonKeywords: row.common_keywords || [],
        gapKeywords: row.gap_keywords || [],
        gapTraffic: Number(row.gap_traffic) || 0,
        ourKeywords: row.our_keywords || [],
      };
    }

    if (!intersection) {
      return res.status(404).json({
        success: false,
        error: 'No intersection data found',
      });
    }

    return res.status(200).json({
      success: true,
      data: intersection,
      cached: !fromApi,
    });

  } catch (error: any) {
    console.error('[API: website-data/domain-intersection] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch domain intersection',
      details: error.message
    });
  }
}
