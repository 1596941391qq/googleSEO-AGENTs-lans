import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getProjectKeywords } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const { projectId } = req.query;
    if (!projectId) {
      return sendErrorResponse(res, null, 'projectId is required', 400);
    }

    const keywords = await getProjectKeywords(projectId as string);

    return res.json({
      success: true,
      data: {
        keywords
      },
    });
  } catch (error: any) {
    console.error('[Get Project Keywords] Error:', error);
    return sendErrorResponse(res, error, 'Failed to get project keywords', 500);
  }
}
