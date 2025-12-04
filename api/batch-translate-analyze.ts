import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translateKeywordToTarget, analyzeRankingProbability } from './_shared/gemini.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';
import { KeywordData, IntentType } from './_shared/types.js';

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
    const keywordsForAnalysis: KeywordData[] = translatedResults.map((result, index) => ({
      id: `btk-${Date.now()}-${index}`,
      keyword: result.translated,
      translation: result.original, // Store original as translation for reference
      intent: IntentType.INFORMATIONAL, // Default intent
      volume: 0, // Volume will be estimated during analysis
    }));

    // Step 3: Analyze ranking probability using existing function (with SERP search)
    console.log(`Starting SERP analysis for ${keywordsForAnalysis.length} keywords`);

    const analyzedKeywords = await analyzeRankingProbability(
      keywordsForAnalysis,
      systemInstruction || 'You are an SEO expert analyzing keyword ranking opportunities.',
      uiLanguage || 'en',
      targetLanguage
    );

    console.log(`Analysis complete for ${analyzedKeywords.length} keywords`);

    return res.json({
      success: true,
      total: analyzedKeywords.length,
      keywords: analyzedKeywords,
      translationResults: translatedResults,
    });

  } catch (error: any) {
    console.error('Batch translate-analyze error:', error);
    return sendErrorResponse(res, error, 'Failed to process batch translation and analysis');
  }
}
