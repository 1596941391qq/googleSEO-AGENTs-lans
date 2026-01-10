// Extract keywords from website content using Gemini and DataForSEO Domain API
// Note: DataForSEO API calls are moved to after demo generation to speed up onboarding
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

    // 注意：为了加快演示流程，DataForSEO API 调用已被移到演示生成之后
    // 演示过程中不进行同步的关键词提取，避免阻塞用户体验
    // DataForSEO 数据会在演示显示后异步获取并更新
    const finalKeywords: any[] = [];

    console.log(`[Extract Keywords] Final result: ${finalKeywords.length} keywords`);

    // Return success response
    return res.json({
      success: true,
      data: {
        keywords: finalKeywords,
        websiteSummary: `Found ${finalKeywords.length} keywords`,
        source: finalKeywords.length > 0 ? 'dataforseo' : 'none',
        detectedLanguage: finalTargetLanguage,
      },
    });
  } catch (error: any) {
    console.error('[Extract Keywords] Error:', error);
    return sendErrorResponse(res, error, 'Failed to extract keywords', 500);
  }
}
