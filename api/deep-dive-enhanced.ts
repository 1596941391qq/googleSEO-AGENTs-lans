import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeDeepDive } from './_shared/services/deep-dive-service.js';
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
    const { keyword, uiLanguage, targetLanguage, strategyPrompt, userId, projectId, projectName } = body;

    if (!keyword || !uiLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure keyword is KeywordData
    let keywordData: KeywordData;
    if (typeof keyword === 'string') {
      keywordData = {
        id: `kw-${Date.now()}`,
        keyword: keyword,
        translation: keyword,
        intent: IntentType.INFORMATIONAL,
        volume: 0
      };
    } else {
      keywordData = keyword as KeywordData;
    }

    console.log(`Enhanced deep dive for keyword: ${keywordData.keyword}`);

    // Call Deep Dive Service
    const result = await executeDeepDive({
      keyword: keywordData,
      uiLanguage,
      targetLanguage,
      strategyPrompt,
      userId: userId ? parseInt(userId.toString(), 10) : undefined,
      projectId: projectId || undefined,
      projectName: projectName || undefined,
      stopAfterStrategy: true
    });

    // Construct enhanced report (mapping service result to API response)
    const enhancedReport = {
      ...result.seoStrategyReport,
      coreKeywords: result.coreKeywords,
      htmlContent: result.htmlContent,
      rankingProbability: result.rankingProbability,
      rankingAnalysis: result.rankingAnalysis,
      searchIntent: result.searchIntent,
      intentMatch: result.intentMatch,
      serpCompetitionData: result.serpCompetitionData,
      draftId: (result as any).draftId,
      projectId: (result as any).projectId
    };

    return res.json({ report: enhancedReport });
  } catch (error: any) {
    console.error('Enhanced deep dive error:', error);
    return sendErrorResponse(res, error, 'Failed to generate enhanced strategy report');
  }
}

function generateHTMLContent(report: any, uiLanguage: string): string {
  // This helper is no longer used here as the service generates HTML
  // But we can keep it if we want to be safe, or remove it.
  // The service returns htmlContent, so we don't need this.
  return '';
}
