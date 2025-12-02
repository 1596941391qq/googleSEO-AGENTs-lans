import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from './_shared/request-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
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

