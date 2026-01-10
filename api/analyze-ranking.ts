import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeRankingProbability } from './_shared/agents/agent-2-seo-researcher.js';
import { fetchKeywordData, getDataForSEOLocationAndLanguage } from './_shared/tools/dataforseo.js';
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
    const { 
      keywords, 
      systemInstruction, 
      uiLanguage, 
      targetLanguage,
      targetSearchEngine = 'google',
      websiteUrl,
      websiteDR
    } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0 || !systemInstruction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Call DataForSEO API to get keyword difficulty data (before SERP analysis)
    console.log(`[DataForSEO] Fetching DataForSEO data for ${keywords.length} keywords (Mining mode)`);

    const keywordsToAnalyze = [];
    const skippedKeywords = [];

    try {
      const keywordStrings = keywords.map(k => k.keyword);

      // 将语言代码转换为 DataForSEO 的 location_code 和 language_code
      const { locationCode, languageCode } = getDataForSEOLocationAndLanguage(targetLanguage || 'en');

      const dataForSEOResults = await fetchKeywordData(keywordStrings, locationCode, languageCode, targetSearchEngine);

      // Create a map for quick lookup
      const dataForSEODataMap = new Map();
      dataForSEOResults.forEach(data => {
        if (data.keyword) {
          dataForSEODataMap.set(data.keyword.toLowerCase(), data);
        }
      });

      // Flag to indicate that DataForSEO API call succeeded (even if some keywords have no data)
      // This is used to distinguish between "API failure" vs "API returned no data" (true blue ocean)
      const dataForSEOApiSucceeded = true;

      console.log(`[DataForSEO] Successfully fetched data for ${dataForSEOResults.length}/${keywords.length} keywords`);

      // Log DataForSEO data for each keyword
      dataForSEOResults.forEach(data => {
        if (data.is_data_found) {
          console.log(`[DataForSEO] "${data.keyword}": Volume=${data.volume}, KD=${data.difficulty}, CPC=$${data.cpc}, Competition=${data.competition}`);
        }
      });

      // Process each keyword with DataForSEO data
      for (const keyword of keywords) {
        const dataForSEOData = dataForSEODataMap.get(keyword.keyword.toLowerCase());

        if (dataForSEOApiSucceeded && dataForSEOData) {
          // Only attach DataForSEO data if API succeeded
          // This distinguishes between "API failure" vs "API returned data (which might have is_data_found=false)"
          keyword.dataForSEOData = dataForSEOData;
          keyword.serankingData = {
            is_data_found: dataForSEOData.is_data_found,
            volume: dataForSEOData.volume,
            cpc: dataForSEOData.cpc,
            competition: dataForSEOData.competition,
            difficulty: dataForSEOData.difficulty,
            history_trend: dataForSEOData.history_trend,
          };

          // Update volume if DataForSEO has better data
          if (dataForSEOData.volume) {
            keyword.volume = dataForSEOData.volume;
          }
        }

        // Add to keywords that need SERP analysis
        keywordsToAnalyze.push(keyword);
      }

      console.log(`[DataForSEO] ${keywordsToAnalyze.length} keywords will proceed to SERP analysis`);

    } catch (dataForSEOError) {
      console.warn(`[DataForSEO] API call failed: ${dataForSEOError.message}. Proceeding with SERP analysis for all keywords.`);
      // On DataForSEO failure, analyze all keywords normally
      keywordsToAnalyze.push(...keywords);
    }

    // Analyze keywords that weren't skipped
    let analyzedKeywords = [];
    if (keywordsToAnalyze.length > 0) {
      analyzedKeywords = await analyzeRankingProbability(
        keywordsToAnalyze,
        systemInstruction,
        uiLanguage || 'en',
        targetLanguage || 'en',
        websiteUrl,
        websiteDR,
        targetSearchEngine
      );
    }

    // Combine analyzed keywords with skipped keywords
    const allKeywords = [...analyzedKeywords, ...skippedKeywords];

    console.log(`[analyze-ranking] Analysis completed for ${analyzedKeywords.length} keywords. Total keywords: ${allKeywords.length}`);

    return res.json({ keywords: allKeywords });
  } catch (error: any) {
    console.error('Handler error in /api/analyze-ranking:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return sendErrorResponse(res, error, 'Failed to analyze ranking');
  }
}

