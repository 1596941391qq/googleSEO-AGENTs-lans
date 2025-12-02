import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translateText } from './_shared/gemini';

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
    const { text, targetLanguage } = req.body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const translated = await translateText(text, targetLanguage);

    return res.json({ translated });
  } catch (error: any) {
    console.error('Translate text error:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error?.message || 'Failed to translate text';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

