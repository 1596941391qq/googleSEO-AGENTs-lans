import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { updateExecutionTask } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'PATCH' && req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    const { id, status, state, name } = req.body;

    if (!id) {
      return sendErrorResponse(res, null, 'Task ID is required', 400);
    }

    const task = await updateExecutionTask(id, userId, { status, state, name });

    if (!task) {
      return sendErrorResponse(res, null, 'Task not found or access denied', 404);
    }

    return res.json({
      success: true,
      data: {
        task
      },
    });
  } catch (error: any) {
    console.error('[Update Task] Error:', error);
    return sendErrorResponse(res, error, 'Failed to update task', 500);
  }
}
