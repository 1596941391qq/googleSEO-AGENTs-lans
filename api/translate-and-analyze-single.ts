import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translateKeywordToTarget } from './_shared/gemini.js';
import { analyzeRankingProbability } from './_shared/agents/agent-2-seo-researcher.js';
import { fetchKeywordData } from './_shared/tools/dataforseo.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { KeywordData, IntentType, ProbabilityLevel } from './_shared/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === 'OPTIONS') {
      return handleOptions(res);
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = parseRequestBody(req);
    const { 
      keyword, 
      targetLanguage, 
      systemInstruction, 
      uiLanguage,
      targetSearchEngine = 'google',
      websiteUrl,
      websiteDR,
      skipTranslation = false
    } = body;

    if (!keyword || typeof keyword !== 'string' || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields: keyword, targetLanguage' });
    }

    console.log(`Processing single keyword: ${keyword} -> ${targetLanguage} (skipTranslation: ${skipTranslation})`);

    // Step 1: Translate keyword (or skip if requested)
    let translationResult;
    if (skipTranslation) {
      translationResult = {
        original: keyword,
        translated: keyword,
        translationBack: keyword
      };
      console.log(`Skipped translation for "${keyword}"`);
    } else {
      translationResult = await translateKeywordToTarget(keyword, targetLanguage);
      console.log(`Translated "${keyword}" to "${translationResult.translated}"`);
    }

    // Step 2: Convert to KeywordData format
    const keywordData: KeywordData = {
      id: `stk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      keyword: translationResult.translated,
      translation: translationResult.original,
      intent: IntentType.INFORMATIONAL,
      volume: 0,
    };

    // Step 2.5: Call DataForSEO API to get keyword difficulty data (before SERP analysis)
    console.log(`[DataForSEO] Fetching DataForSEO data for "${keywordData.keyword}"`);

    let shouldSkip = false;

    try {
      // 将语言代码转换为 DataForSEO 的 location_code 和 language_code
      const { getDataForSEOLocationAndLanguage } = await import('./_shared/tools/dataforseo.js');
      const { locationCode, languageCode } = getDataForSEOLocationAndLanguage(targetLanguage);
      
      const dataForSEOResults = await fetchKeywordData([keywordData.keyword], locationCode, languageCode, targetSearchEngine);

      if (dataForSEOResults.length > 0 && dataForSEOResults[0].is_data_found) {
        const dataForSEOData = dataForSEOResults[0];

        console.log(`[DataForSEO] "${dataForSEOData.keyword}": Volume=${dataForSEOData.volume}, KD=${dataForSEOData.difficulty}, CPC=$${dataForSEOData.cpc}, Competition=${dataForSEOData.competition}`);

        // Attach DataForSEO data to keyword (保持向后兼容性)
        keywordData.dataForSEOData = dataForSEOData;
        keywordData.serankingData = {
          is_data_found: dataForSEOData.is_data_found,
          volume: dataForSEOData.volume,
          cpc: dataForSEOData.cpc,
          competition: dataForSEOData.competition,
          difficulty: dataForSEOData.difficulty,
          history_trend: dataForSEOData.history_trend,
        };

        // Update volume if DataForSEO has better data
        if (dataForSEOData.volume) {
          keywordData.volume = dataForSEOData.volume;
        }
      } else {
        console.log(`[DataForSEO] No data found for "${keywordData.keyword}"`);
      }
    } catch (dataForSEOError: any) {
      console.warn(`[DataForSEO] API call failed: ${dataForSEOError.message}. Proceeding with SERP analysis.`);
    }

    // Step 3: Analyze with SERP search (includes SE Ranking data in analysis)
    const analyzed = await analyzeRankingProbability(
      [keywordData],
      systemInstruction || 'You are an SEO expert analyzing keyword ranking opportunities.',
      uiLanguage || 'en',
      targetLanguage,
      websiteUrl,
      websiteDR,
      targetSearchEngine
    );

    const result = analyzed[0];

    return res.json({
      success: true,
      original: translationResult.original,
      translated: translationResult.translated,
      keyword: result,
    });

  } catch (error: any) {
    console.error('Single translate-analyze error:', error);
    return sendErrorResponse(res, error, 'Failed to translate and analyze keyword');
  }
}
