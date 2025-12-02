import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Parse request body, handling both JSON string and object
 */
export function parseRequestBody(req: VercelRequest): any {
  let body = req.body;
  
  // If body is a string, try to parse it as JSON
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      throw new Error('Invalid JSON in request body');
    }
  }
  
  return body || {};
}

/**
 * Set CORS headers
 */
export function setCorsHeaders(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * Handle OPTIONS request
 */
export function handleOptions(res: VercelResponse) {
  setCorsHeaders(res);
  return res.status(204).end();
}

/**
 * Send error response with detailed information
 */
export function sendErrorResponse(
  res: VercelResponse,
  error: any,
  defaultMessage: string,
  statusCode: number = 500
) {
  console.error(`Error: ${defaultMessage}`, error);
  console.error('Error stack:', error?.stack);
  console.error('Error name:', error?.name);
  
  const errorResponse: any = {
    error: error?.message || defaultMessage,
    type: error?.name || 'UnknownError',
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development') {
    errorResponse.stack = error?.stack;
  }
  
  return res.status(statusCode).json(errorResponse);
}

