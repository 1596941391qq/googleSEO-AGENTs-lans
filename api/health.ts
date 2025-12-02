import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    // Check environment variables
    const envCheck = {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? '✓ Set' : '✗ Missing',
      GEMINI_PROXY_URL: process.env.GEMINI_PROXY_URL || 'Using default: https://api.302.ai',
      GEMINI_MODEL: process.env.GEMINI_MODEL || 'Using default: gemini-2.5-flash',
      NODE_ENV: process.env.NODE_ENV || 'Not set'
    };

    return res.json({
      status: 'ok',
      message: 'Vercel serverless function is running',
      environment: envCheck
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Health check failed'
    });
  }
}

