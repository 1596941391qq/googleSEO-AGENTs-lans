import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getProjectById, getProjectStats } from '../lib/database.js';
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
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const authUserId = authResult.userId;

    const { projectId, userId: queryUserId } = req.query;
    
    // 优先使用认证得到的 userId，如果没有（可能用于兼容某些场景），则使用 query 中的
    const userId = (authUserId || queryUserId) as string;

    if (!projectId || !userId) {
      return sendErrorResponse(res, null, 'projectId is required', 400);
    }

    const numericUserId = parseInt(userId);
    const finalUserId = isNaN(numericUserId) ? userId : numericUserId;

    // 1. 尝试从 projects 表获取
    let project = await getProjectById(projectId as string, finalUserId);
    let stats = null;

    if (project) {
      stats = await getProjectStats(projectId as string, finalUserId);
    } else {
      // 2. 尝试从 execution_tasks 表获取
      const { getExecutionTaskById } = await import('../lib/database.js');
      const task = await getExecutionTaskById(projectId as string, finalUserId);
      
      if (task) {
        project = {
          id: task.id,
          user_id: task.user_id,
          name: task.name || 'Task',
          seed_keyword: task.params?.seedKeyword || null,
          target_language: task.params?.targetLanguage || null,
          created_at: task.created_at,
          updated_at: task.updated_at,
          type: 'task',
          status: task.status
        } as any;
        
        stats = {
          total: task.state?.keywords?.length || 0,
          selected: task.state?.keywords?.length || 0,
          generating: task.status === 'in_progress' ? 1 : 0,
          completed: task.status === 'completed' ? 1 : 0,
          failed: task.status === 'failed' ? 1 : 0
        };
      }
    }

    if (!project) {
      return sendErrorResponse(res, null, 'Project or Task not found', 404);
    }

    return res.json({
      success: true,
      data: {
        project: {
          ...project,
          stats
        }
      },
    });
  } catch (error: any) {
    console.error('[Get Project] Error:', error);
    return sendErrorResponse(res, error, 'Failed to get project', 500);
  }
}
