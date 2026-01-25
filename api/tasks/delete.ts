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

    if (!id || typeof id !== 'string') {
      return sendErrorResponse(res, null, 'Task ID is required', 400);
    }

    // 前端可能传入本地生成的 client ID（如 task-1769380406938-xxx），未同步到 DB 的任务不存在于 execution_tasks。
    // 仅 UUID 格式的 id 才在 DB 中；非 UUID 时直接返回成功，避免 PostgreSQL "无效的类型 uuid" 错误。
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id.trim())) {
      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
      });
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
