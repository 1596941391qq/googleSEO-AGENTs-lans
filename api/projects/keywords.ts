import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getExecutionTaskById } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

/**
 * GET /api/projects/keywords?projectId=xxx
 * 获取任务关联的关键词列表，转换为 KeywordWithStatus 格式
 */
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

    const { projectId } = req.query;
    if (!projectId || typeof projectId !== 'string') {
      return sendErrorResponse(res, null, 'projectId is required', 400);
    }

    // 获取任务详情
    const task = await getExecutionTaskById(projectId, userId);
    if (!task) {
      return sendErrorResponse(res, null, 'Task not found', 404);
    }

    const state = task.state || {};
    const miningState = state.miningState || {};
    const batchState = state.batchState || {};

    // 从 mining 状态提取关键词
    const miningKeywords = (miningState.keywords || []).map((kw: any, index: number) => ({
      id: kw.id || `mining-${task.id}-${index}`,
      project_id: task.id,
      keyword: kw.keyword || kw.text || '',
      translation: kw.translation || kw.chineseTranslation || null,
      intent: kw.intent || null,
      volume: kw.volume || kw.searchVolume || null,
      probability: kw.probability || null,
      is_selected: kw.isSelected || kw.isHighPerformer || false,
      status: kw.status || (kw.isHighPerformer ? 'completed' : 'selected'),
      content_status: kw.contentStatus || null,
      created_at: task.created_at,
    }));

    // 从 batch 状态提取关键词
    const batchKeywords = (batchState.batchKeywords || []).map((kw: any, index: number) => ({
      id: kw.id || `batch-${task.id}-${index}`,
      project_id: task.id,
      keyword: kw.keyword || kw.original || '',
      translation: kw.translation || kw.translated || null,
      intent: kw.intent || null,
      volume: kw.volume || kw.searchVolume || null,
      probability: kw.probability || null,
      is_selected: kw.isSelected || false,
      status: kw.status || 'selected',
      content_status: kw.contentStatus || null,
      created_at: task.created_at,
    }));

    const keywords = [...miningKeywords, ...batchKeywords];

    return res.json({
      success: true,
      data: {
        keywords
      },
    });
  } catch (error: any) {
    console.error('[Projects Keywords] Error:', error);
    return sendErrorResponse(res, error, 'Failed to get keywords', 500);
  }
}
