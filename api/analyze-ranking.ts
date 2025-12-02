import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeRankingProbability } from './_shared/gemini.js';
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
    const { keywords, systemInstruction, uiLanguage } = body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0 || !systemInstruction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const analyzedKeywords = await analyzeRankingProbability(
      keywords, 
      systemInstruction,
      uiLanguage || 'en'
    );

    return res.json({ keywords: analyzedKeywords });
  } catch (error: any) {
    console.error('Handler error:', error);
    return sendErrorResponse(res, error, 'Failed to analyze ranking');
  }
}

