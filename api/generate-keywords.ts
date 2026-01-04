import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateKeywords } from './_shared/agents/agent-1-keyword-mining.js';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler.js';

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
      seedKeyword,
      targetLanguage,
      systemInstruction,
      existingKeywords,
      roundIndex,
      wordsPerRound,
      miningStrategy,
      userSuggestion,
      uiLanguage,
      industry,
      additionalSuggestions
    } = body;

    if (!seedKeyword || !targetLanguage || !systemInstruction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await generateKeywords(
      seedKeyword,
      targetLanguage,
      systemInstruction,
      existingKeywords || [],
      roundIndex || 1,
      wordsPerRound || 10,
      miningStrategy || 'horizontal',
      userSuggestion || '',
      uiLanguage || 'en',
      industry,
      additionalSuggestions
    );

    return res.json({ 
      keywords: result.keywords, 
      rawResponse: result.rawResponse,
      searchResults: result.searchResults 
    });
  } catch (error: any) {
    console.error('Handler error:', error);
    return sendErrorResponse(res, error, 'Failed to generate keywords');
  }
}

