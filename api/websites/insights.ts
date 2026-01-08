/**
 * API: 获取网站机会洞察
 * 
 * 功能：
 * - 分析网站数据（有机流量、关键词、竞争对手）
 * - 使用 LLM 生成 4-5 条简短的商业机会或 SEO 建议
 * - 模拟终端风格返回
 * 
 * 方法: POST
 * 端点: /api/websites/insights
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../lib/database.js';
import { callGeminiAPI } from '../_shared/gemini.js';

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

  const { websiteId, url, uiLanguage = 'zh' } = req.body;

  if (!websiteId && !url) {
    return res.status(400).json({ error: 'Missing websiteId or url' });
  }

  try {
    // 1. 获取网站基础数据
    let websiteData;
    if (websiteId) {
      const result = await sql`SELECT * FROM user_websites WHERE id = ${websiteId}`;
      websiteData = result.rows[0];
    } else {
      const result = await sql`SELECT * FROM user_websites WHERE website_url = ${url}`;
      websiteData = result.rows[0];
    }

    const targetId = websiteData?.id || websiteId;

    const overviewResult = await sql`
      SELECT * FROM domain_overview_cache 
      WHERE website_id = ${targetId}
      ORDER BY data_date DESC LIMIT 1
    `;
    
    const keywordsResult = await sql`
      SELECT keyword, search_volume, current_position, competition 
      FROM domain_keywords_cache 
      WHERE website_id = ${targetId}
      ORDER BY search_volume DESC LIMIT 15
    `;

    const competitorsResult = await sql`
      SELECT competitor_domain, common_keywords 
      FROM domain_competitors_cache 
      WHERE website_id = ${targetId}
      ORDER BY common_keywords DESC LIMIT 8
    `;

    const overview = overviewResult.rows[0] || {};
    const keywords = keywordsResult.rows || [];
    const competitors = competitorsResult.rows || [];

    // 4. 构建提示词
    const prompt = `
      You are an elite SEO Growth Hacker. Analyze the following real-time SEO data for website "${url || websiteData?.website_url}" and provide 5-6 high-impact "terminal-style" insights.
      
      CONSTRAINTS:
      - Each insight must start with "> "
      - One line per insight. Keep it short, punchy, and aggressive.
      - Use professional SEO terminology (LSI, CTR, SERP, E-E-A-T, etc.)
      - Output language: ${uiLanguage === 'zh' ? 'Chinese' : 'English'}
      
      DATA:
      - Organic Traffic: ${overview.organic_traffic || '0'}
      - Total Keywords: ${overview.total_keywords || '0'}
      - Avg Position: ${overview.avg_position || 'N/A'}
      - Top Ranking Keywords: ${keywords.slice(0, 10).map(k => `${k.keyword}(Vol:${k.search_volume})`).join(', ')}
      - Major Competitors: ${competitors.slice(0, 5).map(c => c.competitor_domain).join(', ')}
      
      Example Insights:
      > [THREAT] Competitor ${competitors[0]?.competitor_domain || 'X'} is outranking you on high-volume LSI keywords.
      > [OPPORTUNITY] Discovered a content gap in "${keywords[0]?.keyword || 'niche'}". ROI potential: 400%.
      > [ACTION] Immediate audit of internal linking suggested to boost rank for secondary clusters.
    `;

    const response = await callGeminiAPI(prompt);
    const text = response.text || '';

    let lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('>'))
      .slice(0, 6);

    if (lines.length === 0) {
      lines = uiLanguage === 'zh' 
        ? ['> 正在分析流量日志...', '> 数据密度不足，启用全网趋势推演...', '> 建议：增强针对长尾词的内容覆盖。']
        : ['> Analyzing traffic logs...', '> Low data density, enabling global trend extrapolation...', '> Suggestion: Increase content coverage for long-tail keywords.'];
    }

    lines.push(uiLanguage === 'zh' ? '> 监控中。就绪。' : '> Monitoring. Ready.');

    return res.status(200).json({
      success: true,
      data: {
        insights: lines
      }
    });

  } catch (error: any) {
    console.error('[API: websites/insights] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
      details: error.message
    });
  }
}
