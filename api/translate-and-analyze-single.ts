import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translateKeywordToTarget, analyzeRankingProbability, fetchSErankingData } from './_shared/gemini.js';
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
    const { keyword, targetLanguage, systemInstruction, uiLanguage } = body;

    if (!keyword || typeof keyword !== 'string' || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields: keyword, targetLanguage' });
    }

    console.log(`Processing single keyword: ${keyword} -> ${targetLanguage}`);

    // Step 1: Translate keyword
    const translationResult = await translateKeywordToTarget(keyword, targetLanguage);
    console.log(`Translated "${keyword}" to "${translationResult.translated}"`);

    // Step 2: Convert to KeywordData format
    const keywordData: KeywordData = {
      id: `stk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      keyword: translationResult.translated,
      translation: translationResult.original,
      intent: IntentType.INFORMATIONAL,
      volume: 0,
    };

    // Step 2.5: Call SE Ranking API to get keyword difficulty data (before SERP analysis)
    console.log(`[SEO词研究工具] Fetching SE Ranking data for "${keywordData.keyword}"`);

    let shouldSkip = false;

    try {
      const serankingResults = await fetchSErankingData([keywordData.keyword], 'us');

      if (serankingResults.length > 0 && serankingResults[0].is_data_found) {
        const serankingData = serankingResults[0];

        console.log(`[SE Ranking] "${serankingData.keyword}": Volume=${serankingData.volume}, KD=${serankingData.difficulty}, CPC=$${serankingData.cpc}, Competition=${serankingData.competition}`);

        // Attach SE Ranking data to keyword
        keywordData.serankingData = {
          is_data_found: serankingData.is_data_found,
          volume: serankingData.volume,
          cpc: serankingData.cpc,
          competition: serankingData.competition,
          difficulty: serankingData.difficulty,
          history_trend: serankingData.history_trend,
        };

        // Update volume if SE Ranking has better data
        if (serankingData.volume) {
          keywordData.volume = serankingData.volume;
        }

        // Check if difficulty > 40, skip SERP analysis
        if (serankingData.difficulty && serankingData.difficulty > 40) {
          console.log(`[SE Ranking] Keyword "${keywordData.keyword}" has KD ${serankingData.difficulty} > 40, marking as LOW and skipping`);
          keywordData.probability = ProbabilityLevel.LOW;
          keywordData.reasoning = `Keyword Difficulty (${serankingData.difficulty}) is too high (>40). This indicates strong competition. Skipped detailed SERP analysis.`;
          shouldSkip = true;
        }
      } else {
        console.log(`[SE Ranking] No data found for "${keywordData.keyword}"`);
      }
    } catch (serankingError: any) {
      console.warn(`[SE Ranking] API call failed: ${serankingError.message}. Proceeding with SERP analysis.`);
    }

    let result: KeywordData;

    if (shouldSkip) {
      // Skip SERP analysis, use keyword with LOW probability
      result = keywordData;
    } else {
      // Step 3: Analyze with SERP search (includes SE Ranking data in analysis)
      const analyzed = await analyzeRankingProbability(
        [keywordData],
        systemInstruction || 'You are an SEO expert analyzing keyword ranking opportunities.',
        uiLanguage || 'en',
        targetLanguage
      );

      result = analyzed[0];
    }

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
