import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translateText } from './_shared/gemini';
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
    const { text, targetLanguage } = body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const translated = await translateText(text, targetLanguage);

    return res.json({ translated });
  } catch (error: any) {
    return sendErrorResponse(res, error, 'Failed to translate text');
  }
}

