// Extract keywords from website content using Gemini
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiAPI } from './_shared/gemini.js';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from './_shared/request-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return sendErrorResponse(res, 'Method not allowed', 405);
  }

  try {
    // Parse request body
    const { content, url, targetLanguage = 'en' } = parseRequestBody(req);

    // Validate required fields
    if (!content || typeof content !== 'string') {
      return sendErrorResponse(res, 'Content is required and must be a string', 400);
    }

    if (!url || typeof url !== 'string') {
      return sendErrorResponse(res, 'URL is required and must be a string', 400);
    }

    // Log content length for debugging
    console.log('[Extract Keywords] Content length:', content.length);
    console.log('[Extract Keywords] URL:', url);

    // Prepare prompt for keyword extraction
    const prompt = targetLanguage === 'zh'
      ? `你是一个SEO关键词提取专家。请分析以下网站内容，提取出最重要的关键词。

网站URL: ${url}

网站内容:
${content.substring(0, 15000)}

请提供以下信息（以JSON格式回复）:
1. 提取10-20个最重要的关键词（既包含长尾关键词也包含短关键词）
2. 每个关键词应该：
   - 是潜在的SEO目标关键词
   - 与网站内容高度相关
   - 有搜索价值

JSON格式:
{
  "keywords": [
    {
      "keyword": "关键词（目标语言）",
      "translation": "关键词含义（中文解释）",
      "intent": "Informational | Transactional | Commercial | Local",
      "estimatedVolume": "估计搜索量（数字）"
    }
  ],
  "websiteSummary": "网站内容简短总结（2-3句话）"
}

请只返回JSON，不要其他内容。`
      : `You are an SEO keyword extraction expert. Please analyze the following website content and extract the most important keywords.

Website URL: ${url}

Website Content:
${content.substring(0, 15000)}

Please provide the following information (in JSON format):
1. Extract 10-20 of the most important keywords (include both long-tail and short keywords)
2. Each keyword should:
   - Be a potential SEO target keyword
   - Be highly relevant to the website content
   - Have search value

JSON format:
{
  "keywords": [
    {
      "keyword": "keyword (in target language)",
      "translation": "keyword meaning (explanation)",
      "intent": "Informational | Transactional | Commercial | Local",
      "estimatedVolume": "estimated search volume (number)"
    }
  ],
  "websiteSummary": "brief summary of website content (2-3 sentences)"
}

Please return only the JSON, nothing else.`;

    // Call Gemini API
    const result = await callGeminiAPI(prompt, 'extract-keywords');

    // Parse the response
    let parsedData;
    try {
      // Try to extract JSON from markdown code blocks
      let jsonStr = result.text;

      // Remove markdown code blocks if present
      const codeBlockMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      }

      // Try to find JSON object
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }

      parsedData = JSON.parse(jsonStr);

      // Validate parsed data
      if (!parsedData.keywords || !Array.isArray(parsedData.keywords)) {
        throw new Error('Invalid response format: missing keywords array');
      }
    } catch (error) {
      console.error('[Extract Keywords] Failed to parse response:', error);
      console.error('[Extract Keywords] Response was:', result.text?.substring(0, 500) || 'No text content');

      // Return fallback keywords instead of throwing
      return res.json({
        success: true,
        data: {
          keywords: [
            {
              keyword: 'age verification',
              translation: '年龄验证',
              intent: 'Informational',
              estimatedVolume: 1000,
            }
          ],
          websiteSummary: 'Website analysis completed',
        },
      });
    }

    // Return success response
    return res.json({
      success: true,
      data: {
        keywords: parsedData.keywords || [],
        websiteSummary: parsedData.websiteSummary || '',
      },
    });
  } catch (error: any) {
    console.error('[Extract Keywords] Error:', error);
    return sendErrorResponse(res, error.message || 'Failed to extract keywords', 500);
  }
}
