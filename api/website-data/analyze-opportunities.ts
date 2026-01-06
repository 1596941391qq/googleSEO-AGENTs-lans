// Analyze ranking opportunities for keywords
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { callGeminiAPI } from '../_shared/gemini.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    await initWebsiteDataTables();

    const { websiteId, keywordIds, uiLanguage = 'en' } = parseRequestBody(req);

    if (!websiteId) {
      return sendErrorResponse(res, null, 'websiteId is required', 400);
    }

    // Get keywords to analyze
    let keywordsQuery = sql`
      SELECT * FROM website_keywords
      WHERE website_id = ${websiteId}
    `;

    if (keywordIds && Array.isArray(keywordIds) && keywordIds.length > 0) {
      keywordsQuery = sql`
        SELECT * FROM website_keywords
        WHERE website_id = ${websiteId} AND id = ANY(${keywordIds}::uuid[])
      `;
    }

    const keywordsResult = await keywordsQuery;
    const keywords = keywordsResult.rows;

    if (keywords.length === 0) {
      return res.json({
        success: true,
        data: {
          opportunities: [],
        },
      });
    }

    // Prepare data for AI analysis
    const keywordsData = keywords.map((k: any) => ({
      keyword: k.keyword,
      volume: k.seranking_volume || k.estimated_volume || 0,
      difficulty: k.seranking_difficulty || null,
      competition: k.seranking_competition || null,
      intent: k.intent,
    }));

    // Call Gemini to analyze opportunities
    const prompt = uiLanguage === 'zh'
      ? `你是一个SEO专家。请分析以下关键词的排名机会，为每个关键词生成：
1. 排名机会评分（0-100分）
2. 机会原因（为什么有机会排名）
3. 优化建议（如何优化以获得更好排名）

关键词数据：
${JSON.stringify(keywordsData, null, 2)}

请以JSON格式返回：
{
  "opportunities": [
    {
      "keyword": "关键词",
      "score": 85,
      "reasoning": "机会原因...",
      "optimization": "优化建议..."
    }
  ]
}

只返回JSON，不要其他内容。`
      : `You are an SEO expert. Analyze the ranking opportunities for the following keywords and generate for each:
1. Ranking opportunity score (0-100)
2. Opportunity reasoning (why there's a chance to rank)
3. Optimization suggestions (how to optimize for better ranking)

Keywords data:
${JSON.stringify(keywordsData, null, 2)}

Return in JSON format:
{
  "opportunities": [
    {
      "keyword": "keyword",
      "score": 85,
      "reasoning": "reasoning...",
      "optimization": "optimization suggestions..."
    }
  ]
}

Return only JSON, nothing else.`;

    const aiResult = await callGeminiAPI(prompt, 'analyze-ranking-opportunities', {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                keyword: { type: 'string' },
                score: { type: 'number' },
                reasoning: { type: 'string' },
                optimization: { type: 'string' }
              },
              required: ['keyword', 'score', 'reasoning', 'optimization']
            }
          }
        },
        required: ['opportunities']
      },
      enableGoogleSearch: true  // 启用联网搜索以获取最新SEO趋势和排名机会
    });
    
    // Extract JSON (with fallback for compatibility)
    let jsonText = aiResult.text.trim();
    jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysisData = JSON.parse(jsonMatch[0]);

    // Update keywords with opportunity analysis
    for (const opportunity of analysisData.opportunities) {
      await sql`
        UPDATE website_keywords
        SET
          ranking_opportunity_score = ${opportunity.score},
          opportunity_reasoning = ${opportunity.reasoning},
          suggested_optimization = ${opportunity.optimization},
          updated_at = NOW()
        WHERE website_id = ${websiteId} AND keyword = ${opportunity.keyword}
      `;
    }

    return res.json({
      success: true,
      data: {
        opportunities: analysisData.opportunities,
      },
    });
  } catch (error: any) {
    console.error('[Analyze Opportunities] Error:', error);
    return sendErrorResponse(res, error, 'Failed to analyze opportunities', 500);
  }
}

