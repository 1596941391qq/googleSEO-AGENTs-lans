import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeRankingProbability, fetchSErankingData } from './_shared/gemini.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { ProbabilityLevel } from './_shared/types.js';

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
    const { keywords, systemInstruction, uiLanguage, targetLanguage } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0 || !systemInstruction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call SE Ranking API to get keyword difficulty data (before SERP analysis)
    console.log(`[SEO词研究工具] Fetching SE Ranking data for ${keywords.length} keywords (Mining mode)`);

    const keywordsToAnalyze = [];
    const skippedKeywords = [];

    try {
      const keywordStrings = keywords.map(k => k.keyword);
      const serankingResults = await fetchSErankingData(keywordStrings, 'us');

      // Create a map for quick lookup
      const serankingDataMap = new Map();
      serankingResults.forEach(data => {
        if (data.keyword) {
          serankingDataMap.set(data.keyword.toLowerCase(), data);
        }
      });

      // Flag to indicate that SE Ranking API call succeeded (even if some keywords have no data)
      // This is used to distinguish between "API failure" vs "API returned no data" (true blue ocean)
      const serankingApiSucceeded = true;

      console.log(`[SE Ranking] Successfully fetched data for ${serankingResults.length}/${keywords.length} keywords`);

      // Log SE Ranking data for each keyword
      serankingResults.forEach(data => {
        if (data.is_data_found) {
          console.log(`[SE Ranking] "${data.keyword}": Volume=${data.volume}, KD=${data.difficulty}, CPC=$${data.cpc}, Competition=${data.competition}`);
        }
      });

      // Process each keyword with SE Ranking data
      for (const keyword of keywords) {
        const serankingData = serankingDataMap.get(keyword.keyword.toLowerCase());

        if (serankingApiSucceeded && serankingData) {
          // Only attach SE Ranking data if API succeeded
          // This distinguishes between "API failure" vs "API returned data (which might have is_data_found=false)"
          keyword.serankingData = {
            is_data_found: serankingData.is_data_found,
            volume: serankingData.volume,
            cpc: serankingData.cpc,
            competition: serankingData.competition,
            difficulty: serankingData.difficulty,
            history_trend: serankingData.history_trend,
          };

          // Update volume if SE Ranking has better data
          if (serankingData.volume) {
            keyword.volume = serankingData.volume;
          }

          // Check if difficulty > 40, skip SERP analysis
          if (serankingData.difficulty && serankingData.difficulty > 40) {
            console.log(`[SE Ranking] Keyword "${keyword.keyword}" has KD ${serankingData.difficulty} > 40, marking as LOW and skipping`);
            keyword.probability = ProbabilityLevel.LOW;
            keyword.reasoning = `Keyword Difficulty (${serankingData.difficulty}) is too high (>40). This indicates strong competition. Skipped detailed SERP analysis.`;
            skippedKeywords.push(keyword);
            continue;
          }
        }

        // Add to keywords that need SERP analysis
        keywordsToAnalyze.push(keyword);
      }

      console.log(`[SE Ranking] ${keywordsToAnalyze.length} keywords will proceed to SERP analysis, ${skippedKeywords.length} keywords skipped due to high KD`);

    } catch (serankingError) {
      console.warn(`[SE Ranking] API call failed: ${serankingError.message}. Proceeding with SERP analysis for all keywords.`);
      // On SE Ranking failure, analyze all keywords normally
      keywordsToAnalyze.push(...keywords);
    }

    // Analyze keywords that weren't skipped
    let analyzedKeywords = [];
    if (keywordsToAnalyze.length > 0) {
      analyzedKeywords = await analyzeRankingProbability(
        keywordsToAnalyze,
        systemInstruction,
        uiLanguage || 'en',
        targetLanguage || 'en'
      );
    }

    // Combine analyzed keywords with skipped keywords
    const allKeywords = [...analyzedKeywords, ...skippedKeywords];

    return res.json({ keywords: allKeywords });
  } catch (error: any) {
    console.error('Handler error:', error);
    return sendErrorResponse(res, error, 'Failed to analyze ranking');
  }
}

