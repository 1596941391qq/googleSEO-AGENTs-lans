import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { createExecutionTask } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    const { type, name, params } = req.body;

    if (!type) {
      return sendErrorResponse(res, null, 'Task type is required', 400);
    }

    const task = await createExecutionTask(userId, type, name || 'New Task', params || {});

    return res.json({
      success: true,
      data: {
        task
      },
    });
  } catch (error: any) {
    console.error('[Save Task] Error:', error);
    return sendErrorResponse(res, error, 'Failed to save task', 500);
  }
}
