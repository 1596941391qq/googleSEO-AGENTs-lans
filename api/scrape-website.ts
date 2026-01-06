// Website scraping API using Firecrawl
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { scrapeWebsite } from './_shared/tools/firecrawl.js';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from './_shared/request-handler.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // Parse request body
    const { url } = parseRequestBody(req);

    // Validate required fields
    if (!url || typeof url !== 'string') {
      return sendErrorResponse(res, null, 'URL is required and must be a string', 400);
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return sendErrorResponse(res, null, 'Invalid URL format', 400);
    }

    // Scrape website with screenshot
    const result = await scrapeWebsite(url, true);

    // Return success response
    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[Scrape Website] Error:', error);
    return sendErrorResponse(res, error, 'Failed to scrape website', 500);
  }
}
