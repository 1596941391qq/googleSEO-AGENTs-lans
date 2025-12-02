import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateDeepDiveStrategy } from './_shared/gemini';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { keyword, uiLanguage, targetLanguage } = req.body;
    
    if (!keyword || !uiLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const report = await generateDeepDiveStrategy(keyword, uiLanguage, targetLanguage);

    return res.json({ report });
  } catch (error: any) {
    console.error('Deep dive strategy error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate strategy report' });
  }
}

