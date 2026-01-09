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
import { authenticateRequest } from '../_shared/auth.js';

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
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = authResult.userId;

    const { websiteId, url, uiLanguage = 'zh' } = req.body;

    if (!websiteId && !url) {
      return res.status(400).json({ error: 'Missing websiteId or url' });
    }

    // 1. 获取网站基础数据并验证权限
    let websiteData;
    if (websiteId) {
      const result = await sql`SELECT * FROM user_websites WHERE id = ${websiteId} AND user_id = ${userId}`;
      websiteData = result.rows[0];
    } else {
      const result = await sql`SELECT * FROM user_websites WHERE website_url = ${url} AND user_id = ${userId}`;
      websiteData = result.rows[0];
    }

    if (!websiteData) {
      return res.status(404).json({ error: 'Website not found or access denied' });
    }

    const targetId = websiteData?.id || websiteId;

    // 使用 JOIN 确保数据隔离：只查询属于当前用户的网站数据
    const overviewResult = await sql`
      SELECT doc.* 
      FROM domain_overview_cache doc
      INNER JOIN user_websites uw ON doc.website_id = uw.id
      WHERE doc.website_id = ${targetId}
        AND uw.user_id = ${userId}
      ORDER BY doc.data_date DESC LIMIT 1
    `;

    const keywordsResult = await sql`
      SELECT dkc.keyword, dkc.search_volume, dkc.current_position, dkc.competition 
      FROM domain_keywords_cache dkc
      INNER JOIN user_websites uw ON dkc.website_id = uw.id
      WHERE dkc.website_id = ${targetId}
        AND uw.user_id = ${userId}
      ORDER BY dkc.search_volume DESC LIMIT 15
    `;

    const competitorsResult = await sql`
      SELECT dcc.competitor_domain, dcc.common_keywords 
      FROM domain_competitors_cache dcc
      INNER JOIN user_websites uw ON dcc.website_id = uw.id
      WHERE dcc.website_id = ${targetId}
        AND uw.user_id = ${userId}
      ORDER BY dcc.common_keywords DESC LIMIT 8
    `;

    const overview = overviewResult.rows[0] || {};
    const keywords = keywordsResult.rows || [];
    const competitors = competitorsResult.rows || [];

    // 4. 构建提示词
    const isChinese = uiLanguage === 'zh';
    const prompt = `
      You are an elite SEO Growth Hacker. Analyze the strictly provided SEO data for website "${url || websiteData?.website_url}" and provide 5-6 high-impact "terminal-style" insights.
      
      CRITICAL CONSTRAINTS:
      1. LANGUAGE: You MUST respond ENTIRELY in ${isChinese ? 'Simplified Chinese' : 'English'}. DO NOT mix languages.
      2. ACCURACY: DO NOT hallucinate. Use ONLY the data provided below.
      3. STRUCTURE: Each insight must follow this exact format:
         > [TAG] Professional/Aggressive/Technical Statement. (Simplified/Actionable/Human explanation).
      4. STYLE: The first part should be "cool" using SEO terms like LSI, SERP, E-E-A-T, etc. The second part (in parentheses) must be "human-speak", explaining what to actually do in simple terms.
      
      DATA:
      - Organic Traffic: ${overview.organic_traffic || '0'}
      - Total Keywords: ${overview.total_keywords || '0'}
      - Avg Position: ${overview.avg_position || 'N/A'}
      - Top Keywords (Volume): ${keywords.slice(0, 10).map(k => `${k.keyword}(Vol:${k.search_volume})`).join(', ')}
      - Major Competitors: ${competitors.slice(0, 5).map(c => c.competitor_domain).join(', ')}
      
      ${isChinese ? `
      示例 (Chinese):
      > [威胁] 竞对 ${competitors[0]?.competitor_domain || '某站点'} 正在通过 LSI 关键词渗透你的核心 SERP。 (对手正在通过你没注意到的关键词群抢夺流量，建议针对这些词进行内容覆盖)。
      > [机会] 发现语义饱和度缺口，尤其在 "${keywords[0]?.keyword || '核心领域'}" 聚类中。 (用户对该主题仍有未满足的需求，建议深入创作该主题的长文以占领市场)。
      ` : `
      Example (English):
      > [THREAT] Competitor ${competitors[0]?.competitor_domain || 'Site X'} is infiltrating your core SERP via LSI clusters. (They are stealing your traffic with keywords you missed, start writing content around these topics).
      > [OPPORTUNITY] Discovered a semantic saturation gap in the "${keywords[0]?.keyword || 'Niche'}" cluster. (People are searching for this but finding no good answers; create high-quality content here for easy wins).
      `}
    `;

    const response = await callGeminiAPI(prompt);
    const text = response.text || '';

    let lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => typeof line === 'string' && line.startsWith('>'))
      .slice(0, 6);

    if (lines.length === 0) {
      lines = uiLanguage === 'zh'
        ? [
          '> 正在扫描你的数字化资产...',
          '> [数据] 当前数据库中该站点的有效指标较少。 (还没攒够数据，先随便看看，建议多发点内容再来分析)。',
          '> [建议] 优先优化长尾关键词的覆盖密度。 (找点冷门但有人搜的词去写，别死磕大词)。'
        ]
        : [
          '> Scanning your digital assets...',
          '> [DATA] Insufficient real-time metrics for this domain in cache. (Not enough data yet, keep publishing content and check back soon).',
          '> [ACTION] Prioritize long-tail keyword density optimization. (Focus on niche keywords that are easier to rank for instead of high-competition terms).'
        ];
    }

    lines.push(uiLanguage === 'zh' ? '> 持续监控中。就绪。' : '> Continuous monitoring active. Ready.');

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
