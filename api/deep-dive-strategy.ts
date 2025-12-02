import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateDeepDiveStrategy } from './_shared/gemini';
import { parseRequestBody, setCorsHeaders, handleOptions, sendErrorResponse } from './_shared/request-handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseRequestBody(req);
    const { keyword, uiLanguage, targetLanguage } = body;
    
    if (!keyword || !uiLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = await generateDeepDiveStrategy(keyword, uiLanguage, targetLanguage);

    return res.json({ report });
  } catch (error: any) {
    return sendErrorResponse(res, error, 'Failed to generate strategy report');
  }
}

