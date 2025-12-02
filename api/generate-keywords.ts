import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateKeywords } from './_shared/gemini';

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
    const { seedKeyword, targetLanguage, systemInstruction, existingKeywords, roundIndex } = req.body;
    
    if (!seedKeyword || !targetLanguage || !systemInstruction) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const keywords = await generateKeywords(
      seedKeyword,
      targetLanguage,
      systemInstruction,
      existingKeywords || [],
      roundIndex || 1
    );

    return res.json({ keywords });
  } catch (error: any) {
    console.error('Generate keywords error:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error?.message || 'Failed to generate keywords';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

