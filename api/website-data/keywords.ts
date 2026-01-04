/**
 * API: 获取网站关键词（从 SE-Ranking Domain API 获取，不缓存）
 *
 * 功能：
 * - 从 SE-Ranking Domain API 获取关键词数据
 * - 支持 offset 和 limit 参数
 * - 不缓存到数据库（用于"加载更多"功能）
 *
 * 方法: POST
 * 端点: /api/website-data/keywords
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { getDomainKeywords } from '../_shared/tools/index.js';

interface GetKeywordsRequestBody {
  websiteId: string;
  userId?: number;
  offset?: number;
  limit?: number;
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
    const body = req.body as GetKeywordsRequestBody;

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
    // Step 2: 从 DataForSEO Domain API 获取关键词
    // ==========================================
    const offset = body.offset || 0;
    const limit = body.limit || 100;
    
    console.log(`[keywords] Fetching keywords from DataForSEO Domain API (offset: ${offset}, limit: ${limit})...`);

    // 获取关键词（从 offset 开始，获取 limit 个）
    // DataForSEO uses locationCode (2840 = US) instead of string location
    const allKeywords = await getDomainKeywords(website.website_domain, 2840, limit + offset);
    
    // 应用 offset 和 limit
    const keywords = allKeywords.slice(offset, offset + limit);

    return res.status(200).json({
      success: true,
      data: {
        keywords: keywords.map(kw => ({
          keyword: kw.keyword,
          currentPosition: kw.currentPosition,
          previousPosition: kw.previousPosition,
          positionChange: kw.positionChange,
          searchVolume: kw.searchVolume,
          cpc: kw.cpc,
          competition: kw.competition,
          difficulty: kw.difficulty,
          trafficPercentage: kw.trafficPercentage,
        })),
        total: allKeywords.length,
        offset,
        limit,
      },
    });

  } catch (error: any) {
    console.error('[API: website-data/keywords] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get keywords',
      details: error.message
    });
  }
}

