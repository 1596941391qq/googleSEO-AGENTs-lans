import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { deleteExecutionTask } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;

    const { id } = req.body || req.query;

    if (!id) {
      return sendErrorResponse(res, null, 'Task ID is required', 400);
    }

    const success = await deleteExecutionTask(id, userId);

    if (!success) {
      return sendErrorResponse(res, null, 'Task not found or access denied', 404);
    }

    return res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error: any) {
    console.error('[Delete Task] Error:', error);
    return sendErrorResponse(res, error, 'Failed to delete task', 500);
  }
}
