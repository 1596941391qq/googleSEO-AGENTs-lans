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
    const { keywords, targetLanguage, systemInstruction, uiLanguage } = body;

    if (!keywords || typeof keywords !== 'string' || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields: keywords, targetLanguage' });
    }

    // Parse comma-separated keywords
    const keywordList = keywords
      .split(',')
      .map((k: string) => k.trim())
      .filter((k: string) => k.length > 0);

    if (keywordList.length === 0) {
      return res.status(400).json({ error: 'No valid keywords provided' });
    }

    console.log(`Processing ${keywordList.length} keywords for translation and analysis`);

    // Step 1: Translate all keywords in parallel (with small batches to avoid rate limits)
    const TRANSLATION_BATCH_SIZE = 5;
    const translatedResults: Array<{ original: string; translated: string; translationBack: string }> = [];

    for (let i = 0; i < keywordList.length; i += TRANSLATION_BATCH_SIZE) {
      const batch = keywordList.slice(i, i + TRANSLATION_BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map((keyword: string) => translateKeywordToTarget(keyword, targetLanguage))
      );
      translatedResults.push(...batchResults);

      // Small delay between translation batches
      if (i + TRANSLATION_BATCH_SIZE < keywordList.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Translated ${translatedResults.length} keywords`);

    // Step 2: Convert translated keywords to KeywordData format for analysis
    // For batch translation, translation field stores the original keyword meaning
    // We'll translate it to UI language if needed (simplified: just use original for now)
    // The translation will be handled on the frontend based on uiLanguage
    const keywordsForAnalysis: KeywordData[] = translatedResults.map((result, index) => ({
      id: `bt-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`, // Ensure unique IDs
      keyword: result.translated,
      translation: result.original, // Store original as translation for reference
      intent: IntentType.INFORMATIONAL, // Default intent
      volume: 0, // Volume will be estimated during analysis
    }));

    // Step 2.5: Call SE Ranking API to get keyword difficulty data (before SERP analysis)
    console.log(`[SEO词研究工具] Fetching SE Ranking data for ${keywordsForAnalysis.length} keywords`);

    let serankingDataMap = new Map<string, any>();
    const keywordsToAnalyze: KeywordData[] = [];
    const skippedKeywords: KeywordData[] = [];

    try {
      const translatedKeywordsList = keywordsForAnalysis.map(k => k.keyword);
      const serankingResults = await fetchSErankingData(translatedKeywordsList, 'us');

      // Create a map for quick lookup
      serankingResults.forEach(data => {
        if (data.keyword) {
          serankingDataMap.set(data.keyword.toLowerCase(), data);
        }
      });

      // Flag to indicate that SE Ranking API call succeeded (even if some keywords have no data)
      // This is used to distinguish between "API failure" vs "API returned data (which might have is_data_found=false)"
      (serankingDataMap as any).apiSucceeded = true;

      console.log(`[SE Ranking] Successfully fetched data for ${serankingResults.length}/${keywordsForAnalysis.length} keywords`);

      // Log SE Ranking data for each keyword
      serankingResults.forEach(data => {
        if (data.is_data_found) {
          console.log(`[SE Ranking] "${data.keyword}": Volume=${data.volume}, KD=${data.difficulty}, CPC=$${data.cpc}, Competition=${data.competition}`);
        }
      });

      // Process each keyword with SE Ranking data
      for (const keyword of keywordsForAnalysis) {
        const serankingData = serankingDataMap.get(keyword.keyword.toLowerCase());

        if ((serankingDataMap as any).apiSucceeded && serankingData) {
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

    } catch (serankingError: any) {
      console.warn(`[SE Ranking] API call failed: ${serankingError.message}. Proceeding with SERP analysis for all keywords.`);
      // On SE Ranking failure, analyze all keywords normally
      keywordsToAnalyze.push(...keywordsForAnalysis);
    }

    // Step 3: Analyze ranking probability using existing function (with SERP search)
    // Only analyze keywords that weren't skipped by SE Ranking
    console.log(`Starting SERP analysis for ${keywordsToAnalyze.length} keywords`);

    let analyzedKeywords: KeywordData[] = [];

    if (keywordsToAnalyze.length > 0) {
      analyzedKeywords = await analyzeRankingProbability(
        keywordsToAnalyze,
        systemInstruction || 'You are an SEO expert analyzing keyword ranking opportunities.',
        uiLanguage || 'en',
        targetLanguage
      );
    }

    // Combine analyzed keywords with skipped keywords
    const allKeywords = [...analyzedKeywords, ...skippedKeywords];

    console.log(`Analysis complete for ${allKeywords.length} keywords (${analyzedKeywords.length} analyzed, ${skippedKeywords.length} skipped)`);

    return res.json({
      success: true,
      total: allKeywords.length,
      keywords: allKeywords,
      translationResults: translatedResults,
    });

  } catch (error: any) {
    console.error('Batch translate-analyze error:', error);
    return sendErrorResponse(res, error, 'Failed to process batch translation and analysis');
  }
}
