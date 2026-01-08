import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getUserProjects } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return sendErrorResponse(res, null, 'userId is required', 400);
    }

    const projects = await getUserProjects(parseInt(userId));

    return res.json({
      success: true,
      data: {
        projects
      },
    });
  } catch (error: any) {
    console.error('[List Projects] Error:', error);
    return sendErrorResponse(res, error, 'Failed to list projects', 500);
  }
}
