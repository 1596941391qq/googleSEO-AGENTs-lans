import type { VercelRequest, VercelResponse } from '@vercel/node';
import { translatePromptToSystemInstruction } from './_shared/gemini';

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
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt field' });
    }

    const optimized = await translatePromptToSystemInstruction(prompt);

    return res.json({ optimized });
  } catch (error: any) {
    console.error('Translate prompt error:', error);
    return res.status(500).json({ error: error.message || 'Failed to translate prompt' });
  }
}

