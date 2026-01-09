/**
 * API: 分析关键词推荐（使用AI生成推荐报告）
 * 
 * 功能：
 * - 获取网站排名前十的关键词
 * - 使用AI提示词分析关键词，生成推荐报告
 * - 返回推荐分数、意图、部署方案等
 * 
 * 方法: POST
 * 端点: /api/website-data/analyze-keyword-recommendations
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { callGeminiAPI } from '../_shared/gemini.js';

interface AnalyzeKeywordRecommendationsRequestBody {
  websiteId: string;
  userId?: number;
  topN?: number; // 默认10，分析前N个关键词
}

// 关键词推荐报告的JSON Schema
const keywordReportSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "SEO Keyword Report Schema",
  "type": "object",
  "properties": {
    "report_metadata": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "target_market": { "type": "string" },
        "language": { "type": "string" },
        "primary_keyword": { "type": "string" },
        "data_sources": { "type": "array", "items": { "type": "string" } },
        "analysis_date": { "type": "string" }
      },
      "required": ["title", "target_market", "language", "primary_keyword", "data_sources", "analysis_date"]
    },
    "executive_summary": {
      "type": "object",
      "properties": {
        "top_5_keywords": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "rank": { "type": "integer" },
              "keyword": { "type": "string" },
              "msv": { "type": "integer" },
              "kd": { "type": "integer" },
              "intent": { "type": "string" },
              "recommendation_index": { "type": "integer", "minimum": 1, "maximum": 5 }
            },
            "required": ["rank", "keyword", "msv", "kd", "intent", "recommendation_index"]
          }
        },
        "overall_assessment": {
          "type": "object",
          "properties": {
            "feasibility": { "type": "string" },
            "high_value_keyword_count": { "type": "integer" },
            "average_kd": { "type": "number" },
            "opportunity_rating": { "type": "string" }
          },
          "required": ["feasibility", "high_value_keyword_count", "average_kd", "opportunity_rating"]
        }
      },
      "required": ["top_5_keywords", "overall_assessment"]
    },
    "keyword_recommendation_list": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "priority": { "type": "integer" },
          "label": { "type": "string" },
          "keywords": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "keyword": { "type": "string" },
                "metrics": {
                  "type": "object",
                  "properties": {
                    "msv": { "type": "integer" },
                    "kd": { "type": "integer" },
                    "competition": { "type": "number" },
                    "cpc": { "type": "number" },
                    "intent": { "type": "string" }
                  },
                  "required": ["msv", "kd", "competition", "cpc", "intent"]
                },
                "strategy": {
                  "type": "object",
                  "properties": {
                    "content_type": { "type": "string" },
                    "suggested_word_count": { "type": "string" },
                    "differentiation": { "type": "string" }
                  },
                  "required": ["content_type", "suggested_word_count", "differentiation"]
                },
                "expected_results": {
                  "type": "object",
                  "properties": {
                    "ranking_potential": { "type": "string" },
                    "monthly_traffic_est": { "type": "string" }
                  },
                  "required": ["ranking_potential", "monthly_traffic_est"]
                }
              },
              "required": ["keyword", "metrics", "strategy", "expected_results"]
            }
          }
        },
        "required": ["priority", "label", "keywords"]
      }
    }
  },
  "required": ["report_metadata", "executive_summary", "keyword_recommendation_list"]
};

// AI提示词（用户提供的完整提示词）
const systemInstruction = `**1. 角色定位与目标**

- **角色**：资深 SEO 策略顾问。
- **目标**：基于 DataForSEO 的原始数据（MSV、难度、意图、CPC 等），撰写一份约 3000 字的《关键词推荐决策报告》，明确指出哪些词最值得投入资源。

**2. 核心逻辑与规则**

- **优先级排序**：将关键词分为三个等级：
  - **优先级 1**：最值得投入（低难度、高价值、有竞争优势）。
  - **优先级 2**：值得布局（综合得分良好，有战略价值）。
  - **优先级 3**：战略储备（长期价值，可选）。

- **避坑指南**：明确列出"不推荐清单"，解释为何某些词不值得做（如意图不匹配、竞争过大）。

- **数据处理**：特别规定 KD=0（难度为 0）统一按"数据不足"处理，不参与排序，以确保决策的严谨性。

**3. 报告结构要求**

- **快速决策摘要**：Top 5 关键词列表及整体机会评级。
- **完整清单**：每个推荐词需包含核心数据、推荐指数、推荐理由、执行建议（内容类型、字数、差异化策略）及预期效果。
- **市场环境洞察**：分析主关键词生态、搜索意图分布、流量机会分布及 SERP 竞争分析。
- **主题集群建议**：规划核心内容枢纽（Pillar）及其支撑页面（Cluster）。

**4. 输出质量控制**

- **字数要求**：2800-3200 字。
- **风格要求**：数据驱动、决策清晰、优先级明确、可执行性强。
- **禁止事项**：禁止简单罗列数据、禁止使用模糊表述、禁止忽略有价值的关键词。
- **完整性**：每个 JSON 字段必须基于原始数据计算，禁止凭空捏造。必须输出完整的 JSON 对象，禁止截断

**5. 输出格式**

要求 仅输出一个 JSON 对象，禁止任何自然语言描述。结构必须严格遵循以下 Schema。`;

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
    const body = req.body as AnalyzeKeywordRecommendationsRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    let userId = body.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: userId is required' });
    }

    const topN = body.topN || 10;

    await initWebsiteDataTables();

    // 先创建缓存表（如果不存在）
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS domain_keyword_recommendations_cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          website_id UUID NOT NULL REFERENCES user_websites(id) ON DELETE CASCADE,
          analysis_result JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
          UNIQUE(website_id)
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_recommendations_website ON domain_keyword_recommendations_cache(website_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_keyword_recommendations_expires ON domain_keyword_recommendations_cache(expires_at)`;
    } catch (tableError: any) {
      // 表可能已存在，忽略错误
      console.log('[analyze-keyword-recommendations] Cache table check:', tableError.message);
    }

    // 检查是否有缓存的AI分析结果（24小时内）
    const cacheCheck = await sql`
      SELECT 
        analysis_result,
        created_at
      FROM domain_keyword_recommendations_cache
      WHERE website_id = ${body.websiteId}
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (cacheCheck.rows.length > 0) {
      console.log('[analyze-keyword-recommendations] ✅ Using cached analysis result');
      const cachedResult = cacheCheck.rows[0].analysis_result;
      return res.status(200).json({
        success: true,
        data: typeof cachedResult === 'string' ? JSON.parse(cachedResult) : cachedResult,
        cached: true
      });
    }

    // 获取网站信息
    const websiteResult = await sql`
      SELECT 
        id,
        website_domain,
        website_url,
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

    console.log(`[analyze-keyword-recommendations] 🔍 Fetching top ${topN} keywords for website: ${website.website_domain}`);

    // 获取排名前十的关键词（按 current_position ASC 排序）
    const keywordsResult = await sql`
      SELECT 
        keyword,
        current_position,
        search_volume as msv,
        difficulty as kd,
        competition,
        cpc
      FROM domain_keywords_cache
      WHERE website_id = ${body.websiteId}
        AND current_position > 0
        AND current_position <= 100
        AND cache_expires_at > NOW()
      ORDER BY current_position ASC
      LIMIT ${topN}
    `;

    if (keywordsResult.rows.length === 0) {
      console.log('[analyze-keyword-recommendations] ⚠️ No keywords found in cache');
      return res.status(200).json({
        success: false,
        error: 'No keywords found. Please update website metrics first.',
        data: null
      });
    }

    const keywordsData = keywordsResult.rows.map((row: any) => ({
      keyword: row.keyword,
      msv: Number(row.msv) || 0,
      kd: Number(row.kd) || 0,
      competition: Number(row.competition) || 0,
      cpc: Number(row.cpc) || 0,
      currentPosition: Number(row.current_position) || 0
    }));

    console.log(`[analyze-keyword-recommendations] ✅ Found ${keywordsData.length} keywords to analyze`);

    // 构建用户提示词
    const userPrompt = `请分析以下网站当前排名前十的关键词，生成关键词推荐决策报告。

关键词数据：
${JSON.stringify(keywordsData, null, 2)}

要求：
1. 仅输出一个 JSON 对象，禁止任何自然语言描述
2. 必须严格遵循提供的 Schema
3. 每个字段必须基于原始数据计算
4. 禁止截断，必须输出完整的 JSON 对象
5. 对于 KD=0 的关键词，标记为"数据不足"，不参与优先级排序
6. 推荐指数（recommendation_index）范围：1-5，其中 5 为最值得投入

请确保输出完整的 JSON 对象，包含所有必需字段。`;

    console.log('[analyze-keyword-recommendations] 🤖 Calling Gemini API for keyword analysis...');

    // 调用 Gemini API
    const response = await callGeminiAPI(userPrompt, systemInstruction, {
      responseMimeType: 'application/json',
      responseSchema: keywordReportSchema
    });

    let reportData;
    try {
      // 尝试解析JSON
      let jsonText = response.text.trim();
      
      // 移除可能的markdown代码块
      jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      
      // 尝试提取JSON对象（处理可能的额外文本）
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      reportData = JSON.parse(jsonText);
      
      // 验证必需字段
      if (!reportData.report_metadata || !reportData.executive_summary || !reportData.keyword_recommendation_list) {
        throw new Error('Missing required fields in AI response');
      }
      
      console.log('[analyze-keyword-recommendations] ✅ Successfully parsed and validated JSON response');
    } catch (parseError: any) {
      console.error('[analyze-keyword-recommendations] ❌ Failed to parse JSON response:', parseError.message);
      console.error('[analyze-keyword-recommendations] Raw response (first 1000 chars):', response.text.substring(0, 1000));
      
      // 尝试返回更详细的错误信息
      return res.status(500).json({
        success: false,
        error: 'Failed to parse AI response. The AI may have returned invalid JSON format.',
        details: parseError.message,
        rawResponsePreview: response.text.substring(0, 500)
      });
    }

    console.log('[analyze-keyword-recommendations] ✅ Successfully generated keyword recommendation report');

    // 保存分析结果到缓存（24小时有效期）
    try {
      // 保存或更新缓存
      await sql`
        INSERT INTO domain_keyword_recommendations_cache (
          website_id,
          analysis_result,
          created_at,
          expires_at
        ) VALUES (
          ${body.websiteId},
          ${JSON.stringify(reportData)}::jsonb,
          NOW(),
          NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (website_id) DO UPDATE SET
          analysis_result = EXCLUDED.analysis_result,
          created_at = NOW(),
          expires_at = NOW() + INTERVAL '24 hours'
      `;
      console.log('[analyze-keyword-recommendations] 💾 Cached analysis result');
    } catch (cacheError: any) {
      console.warn('[analyze-keyword-recommendations] ⚠️ Failed to cache result:', cacheError.message);
      // 继续返回结果，即使缓存失败
    }

    return res.status(200).json({
      success: true,
      data: reportData,
      cached: false
    });

  } catch (error: any) {
    console.error('[API: website-data/analyze-keyword-recommendations] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze keyword recommendations',
      details: error.message
    });
  }
}
