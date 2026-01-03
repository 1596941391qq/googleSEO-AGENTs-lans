// Extract keywords from website content using Gemini and SE Ranking Domain API
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiAPI } from './_shared/gemini.js';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from './_shared/request-handler.js';
import { getDomainKeywords } from './_shared/tools/se-ranking-domain.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // Parse request body
    const { content, url, targetLanguage, uiLanguage = 'en' } = parseRequestBody(req);

    // Validate required fields
    if (!content || typeof content !== 'string') {
      return sendErrorResponse(res, null, 'Content is required and must be a string', 400);
    }

    if (!url || typeof url !== 'string') {
      return sendErrorResponse(res, null, 'URL is required and must be a string', 400);
    }

    // Detect website language from content (simple heuristic)
    // Count Chinese characters vs English words
    const chineseCharCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWordCount = (content.match(/[a-zA-Z]+/g) || []).length;
    const detectedLanguage = chineseCharCount > englishWordCount * 0.3 ? 'zh' : 'en';

    // Use detected language, or provided targetLanguage, or uiLanguage as fallback
    const finalTargetLanguage = targetLanguage || detectedLanguage || (uiLanguage === 'zh' ? 'zh' : 'en');

    console.log('[Extract Keywords] Content length:', content.length);
    console.log('[Extract Keywords] URL:', url);
    console.log('[Extract Keywords] Detected language:', detectedLanguage);
    console.log('[Extract Keywords] Final target language:', finalTargetLanguage);

    // Step 1: Try to get keywords from SE Ranking Domain API (most accurate)
    let serankingKeywords: any[] = [];
    try {
      const domain = url.replace(/^https?:\/\//, '').split('/')[0];
      const location = finalTargetLanguage === 'zh' ? 'cn' : 'us'; // Map language to region

      console.log('[Extract Keywords] Fetching keywords from SE Ranking Domain API...');
      const domainKeywords = await getDomainKeywords(domain, location, 50); // Get top 50 keywords

      if (domainKeywords && domainKeywords.length > 0) {
        serankingKeywords = domainKeywords.map(kw => ({
          keyword: kw.keyword,
          translation: finalTargetLanguage === 'zh' ? kw.keyword : kw.keyword, // Can be enhanced with translation
          intent: 'Informational', // Default, can be analyzed later
          estimatedVolume: kw.searchVolume || 0,
          currentPosition: kw.currentPosition,
          difficulty: kw.difficulty || 0,
          cpc: kw.cpc || 0,
          competition: kw.competition || 0,
          source: 'seranking' // Mark as from SE Ranking
        }));
        console.log(`[Extract Keywords] Got ${serankingKeywords.length} keywords from SE Ranking`);
      }
    } catch (serankingError: any) {
      console.warn('[Extract Keywords] SE Ranking API failed:', serankingError.message);
      // Continue with AI extraction as fallback
    }

    // Step 2: If we have SE Ranking keywords, use them as primary source
    // Otherwise, or in addition, use AI to extract keywords from content
    let aiKeywords: any[] = [];

    // Only use AI extraction if:
    // 1. We have no SE Ranking keywords, OR
    // 2. We want to supplement with content-based keywords
    if (serankingKeywords.length === 0) {
      console.log('[Extract Keywords] Using AI to extract keywords from content...');

      // Prepare prompt for keyword extraction
      const prompt = finalTargetLanguage === 'zh'
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
      const result = await callGeminiAPI(prompt, 'extract-keywords', {
        enableGoogleSearch: true  // 启用联网搜索以获取最新关键词趋势
      });

      // Parse the response
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

        const parsedData = JSON.parse(jsonStr);

        // Validate parsed data
        if (parsedData.keywords && Array.isArray(parsedData.keywords)) {
          aiKeywords = parsedData.keywords.map((kw: any) => ({
            ...kw,
            source: 'ai' // Mark as from AI
          }));
          console.log(`[Extract Keywords] Got ${aiKeywords.length} keywords from AI`);
        }
      } catch (error) {
        console.error('[Extract Keywords] Failed to parse AI response:', error);
        console.error('[Extract Keywords] Response was:', result.text?.substring(0, 500) || 'No text content');
      }
    }

    // Step 3: Combine keywords (prioritize SE Ranking, supplement with AI)
    // Remove duplicates and merge data
    const keywordMap = new Map<string, any>();

    // First add SE Ranking keywords (higher priority)
    serankingKeywords.forEach(kw => {
      keywordMap.set(kw.keyword.toLowerCase(), kw);
    });

    // Then add AI keywords (fill gaps)
    aiKeywords.forEach(kw => {
      const key = kw.keyword.toLowerCase();
      if (!keywordMap.has(key)) {
        keywordMap.set(key, kw);
      } else {
        // Merge: keep SE Ranking data but add AI insights if available
        const existing = keywordMap.get(key);
        keywordMap.set(key, {
          ...existing,
          translation: existing.translation || kw.translation,
          intent: existing.intent || kw.intent,
        });
      }
    });

    const combinedKeywords = Array.from(keywordMap.values());

    // Sort by volume/importance (SE Ranking keywords first, then by volume)
    combinedKeywords.sort((a, b) => {
      if (a.source === 'seranking' && b.source !== 'seranking') return -1;
      if (a.source !== 'seranking' && b.source === 'seranking') return 1;
      return (b.estimatedVolume || b.searchVolume || 0) - (a.estimatedVolume || a.searchVolume || 0);
    });

    // Limit to top 20 keywords
    const finalKeywords = combinedKeywords.slice(0, 20);

    console.log(`[Extract Keywords] Final result: ${finalKeywords.length} keywords (${serankingKeywords.length} from SE Ranking, ${aiKeywords.length} from AI)`);

    // Return success response
    return res.json({
      success: true,
      data: {
        keywords: finalKeywords,
        websiteSummary: `Extracted ${finalKeywords.length} keywords from ${serankingKeywords.length > 0 ? 'SE Ranking API and ' : ''}content analysis`,
        source: serankingKeywords.length > 0 ? 'seranking+ai' : 'ai',
        detectedLanguage: finalTargetLanguage,
      },
    });
  } catch (error: any) {
    console.error('[Extract Keywords] Error:', error);
    return sendErrorResponse(res, error, 'Failed to extract keywords', 500);
  }
}
