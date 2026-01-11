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
        let keywords_list: any[] = [];
        const state = task.state || {};
        const miningState = state.miningState || state;
        const batchState = state.batchState || state;
        const articleState = state.articleGeneratorState || state;
        
        if (task.type === 'mining') {
          // 挖掘任务：关键词可能在 miningState.keywords 或直接在 state.keywords
          keywords_list = miningState.keywords || state.keywords || [];
        } else if (task.type === 'batch') {
          // 批量任务：关键词在 batchState.batchKeywords 或直接在 state.batchKeywords
          keywords_list = batchState.batchKeywords || state.batchKeywords || [];
        } else if (task.type === 'article-generator') {
          // 文章生成任务：主关键词
          const mainKeyword = task.params?.keyword || articleState.keyword || state.keyword;
          if (mainKeyword) {
            keywords_list = [typeof mainKeyword === 'string' ? { keyword: mainKeyword } : mainKeyword];
          }
        }
        
        // 转换为 KeywordWithStatus 格式
        keywords = keywords_list.map((kw: any, index: number) => ({
          id: kw.id || `task-kw-${index}`,
          project_id: task.id,
          keyword: typeof kw === 'string' ? kw : (kw.keyword || kw.toString()),
          translation: kw.translation || kw.chineseKeyword || '',
          intent: kw.intent || kw.searchIntent || 'Informational',
          volume: kw.volume || kw.searchVolume || 0,
          difficulty: kw.difficulty || kw.kd || null,
          cpc: kw.cpc || null,
          probability: kw.probability || 'Medium',
          is_selected: kw.isSelected !== false,
          status: task.status === 'completed' ? 'completed' : 'generating',
          created_at: task.created_at,
          // 保留原始数据供前端使用
          serankingData: kw.serankingData,
          dataForSEOData: kw.dataForSEOData
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
