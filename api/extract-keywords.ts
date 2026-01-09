// Extract keywords from website content using Gemini and DataForSEO Domain API
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { callGeminiAPI } from './_shared/gemini.js';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from './_shared/request-handler.js';
import { getDomainKeywords } from './_shared/tools/dataforseo-domain.js';

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

    // Step 1: Try to get keywords from DataForSEO Domain API (most accurate)
    // 注意：演示过程中默认不再进行同步的大规模关键词提取
    // 详细数据会在后台由 update-metrics 异步更新并存入缓存
    let dataForSEOKeywords: any[] = [];
    
    try {
      const domain = url.replace(/^https?:\/\//, '').split('/')[0];
      const { getDataForSEOLocationAndLanguage } = await import('./_shared/tools/dataforseo.js');
      const { locationCode } = getDataForSEOLocationAndLanguage(finalTargetLanguage);

      console.log(`[Extract Keywords] Checking DataForSEO cache for ${domain}...`);
      // 这里可以尝试获取已有的关键词（如果缓存中已经有了）
      const domainKeywords = await getDomainKeywords(domain, locationCode, 20); 

      if (domainKeywords && domainKeywords.length > 0) {
        dataForSEOKeywords = domainKeywords.map(kw => ({
          keyword: kw.keyword,
          estimatedVolume: kw.searchVolume || 0,
          source: 'dataforseo'
        }));
        console.log(`[Extract Keywords] Found ${dataForSEOKeywords.length} keywords in cache/API`);
      }
    } catch (e: any) {
      console.log('[Extract Keywords] No pre-existing keywords found');
    }

    // Step 2: AI extraction (REMOVED per user request to speed up onboarding)
    const aiKeywords: any[] = [];
    
    // Step 3: Combine keywords
    const finalKeywords = dataForSEOKeywords.slice(0, 20);

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
