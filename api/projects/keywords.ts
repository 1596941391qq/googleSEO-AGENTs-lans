import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getProjectKeywords, getProjectById, getExecutionTaskById } from '../lib/database.js';
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
    const userId = authResult.userId;
    const numericUserId = parseInt(userId, 10);
    const finalUserId = isNaN(numericUserId) ? userId : numericUserId;

    const { projectId } = req.query;
    if (!projectId) {
      return sendErrorResponse(res, null, 'projectId is required', 400);
    }

    // 1. 验证项目是否属于该用户
    let project = await getProjectById(projectId as string, finalUserId);
    let keywords = [];

    if (project) {
      // 如果是普通项目，从 keywords 表获取
      keywords = await getProjectKeywords(projectId as string);
    } else {
      // 2. 如果不是普通项目，尝试查找是否为执行任务 (Task)
      const task = await getExecutionTaskById(projectId as string, finalUserId);
      
      if (task) {
        // 如果是任务，根据类型提取关键词
        let keywords_list = [];
        
        if (task.type === 'mining' || task.type === 'batch') {
          // 挖掘或批量任务通常在 state.keywords 中存储结果
          keywords_list = task.state?.keywords || task.state?.batchKeywords || [];
        } else if (task.type === 'article-generator') {
          // 文章生成任务通常在 params 或 state 中有主关键词
          const mainKeyword = task.params?.keyword || task.state?.keyword;
          if (mainKeyword) {
            keywords_list = [typeof mainKeyword === 'string' ? { keyword: mainKeyword } : mainKeyword];
          }
        }
        
        // 转换为 KeywordWithStatus 格式
        keywords = keywords_list.map((kw: any, index: number) => ({
          id: kw.id || `task-kw-${index}`,
          project_id: task.id,
          keyword: kw.keyword || kw.toString(),
          translation: kw.translation || '',
          intent: kw.intent || 'Informational',
          volume: kw.volume || 0,
          probability: kw.probability || 'Medium',
          is_selected: true,
          status: task.status === 'completed' ? 'completed' : 'generating',
          created_at: task.created_at
        }));
      } else {
        return sendErrorResponse(res, null, 'Project or Task not found or access denied', 404);
      }
    }

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
