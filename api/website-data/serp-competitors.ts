/**
 * API: 获取 SERP 竞争对手
 * 
 * 功能：
 * - 基于关注的关键词列表，找出在这些特定搜索结果中排名靠前的网站
 * - 用于分析特定 Niche（细分市场）的竞争格局
 * 
 * 方法: POST
 * 端点: /api/website-data/serp-competitors
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSerpCompetitors } from '../_shared/tools/dataforseo-domain.js';

interface SerpCompetitorsRequestBody {
  keywords: string[];
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
    const body = req.body as SerpCompetitorsRequestBody;

    if (!body.keywords || !Array.isArray(body.keywords) || body.keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array is required and must not be empty' });
    }

    // 将地区代码转换为 locationCode
    const region = body.region || '';
    const regionToLocationCode: { [key: string]: number } = {
      'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
      'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
    };
    const locationCode = regionToLocationCode[region] || 2840;

    // 限制关键词数量，避免请求过大
    const keywords = body.keywords.slice(0, 50);

    console.log('[serp-competitors] 🔍 Fetching SERP competitors for keywords:', keywords.length);

    try {
      const competitors = await getSerpCompetitors(keywords, locationCode);

      return res.status(200).json({
        success: true,
        data: competitors,
        cached: false, // SERP 数据不缓存，实时获取
      });
    } catch (error: any) {
      console.error('[serp-competitors] ❌ API call failed:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch SERP competitors',
        details: error.message
      });
    }

  } catch (error: any) {
    console.error('[API: website-data/serp-competitors] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch SERP competitors',
      details: error.message
    });
  }
}
