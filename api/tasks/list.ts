import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getUserExecutionTasks } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    const tasks = await getUserExecutionTasks(userId);

    return res.json({
      success: true,
      data: {
        tasks
      },
    });
  } catch (error: any) {
    console.error('[List Tasks] Error:', error);
    return sendErrorResponse(res, error, 'Failed to list tasks', 500);
  }
}
