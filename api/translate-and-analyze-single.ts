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
      id: `stk-${Date.now()}`,
      keyword: translationResult.translated,
      translation: translationResult.original,
      intent: IntentType.INFORMATIONAL,
      volume: 0,
    };

    // Step 3: Analyze with SERP search
    const analyzed = await analyzeRankingProbability(
      [keywordData],
      systemInstruction || 'You are an SEO expert analyzing keyword ranking opportunities.',
      uiLanguage || 'en',
      targetLanguage
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
