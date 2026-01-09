import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { deleteProject } from '../lib/database.js';
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
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;
    const numericUserId = parseInt(userId);
    const finalUserId = isNaN(numericUserId) ? userId : numericUserId;

    const projectId = (req.query.projectId as string) || (req.body?.projectId as string);

    if (!projectId) {
      return sendErrorResponse(res, null, 'projectId is required', 400);
    }

    // 尝试在两个表中删除
    const { deleteExecutionTask } = await import('../lib/database.js');
    
    let success = await deleteProject(projectId, finalUserId);
    
    if (!success) {
      // 如果 projects 表没找到，尝试在 execution_tasks 表删除
      success = await deleteExecutionTask(projectId, finalUserId);
    }

    if (!success) {
      return sendErrorResponse(res, null, 'Project or Task not found or access denied', 404);
    }

    return res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error: any) {
    console.error('[Delete Project] Error:', error);
    return sendErrorResponse(res, error, 'Failed to delete project', 500);
  }
}
