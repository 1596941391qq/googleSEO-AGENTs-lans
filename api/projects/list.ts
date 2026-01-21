import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getUserExecutionTasks } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

/**
 * GET /api/projects/list
 * 获取用户的任务列表，转换为 ProjectWithStats 格式供任务看板使用
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

    // 解析查询参数
    const showArchived = req.query.showArchived === 'true';
    const onlyArchived = req.query.onlyArchived === 'true';

    // 获取用户的所有执行任务
    const tasks = await getUserExecutionTasks(userId, 100, {
      includeDeleted: showArchived,
      onlyDeleted: onlyArchived,
    });

    // 将 ExecutionTask 转换为 ProjectWithStats 格式
    const projects = tasks.map((task) => {
      const state = task.state || {};
      const miningState = state.miningState || {};
      const batchState = state.batchState || {};
      
      // 计算关键词数量
      const miningKeywords = miningState.keywords || [];
      const batchKeywords = batchState.batchKeywords || [];
      const keywordCount = miningKeywords.length + batchKeywords.length;

      // 从 state 中提取草稿和发布数量（如果有的话）
      const draftCount = state.draftCount || 0;
      const publishedCount = state.publishedCount || 0;

      // 正确判断任务状态：
      // - mining 任务：检查 miningState.miningSuccess
      // - batch 任务：检查 batchKeywords 是否有数据
      // - 其他任务：使用数据库中的 status
      let computedStatus = task.status || 'in_progress';
      
      if (task.type === 'mining') {
        if (miningState.miningSuccess === true) {
          computedStatus = 'completed';
        } else if (miningState.isMining === true) {
          computedStatus = 'in_progress';
        }
      } else if (task.type === 'batch') {
        if (batchKeywords.length > 0 && !batchState.isProcessing) {
          computedStatus = 'completed';
        } else if (batchState.isProcessing === true) {
          computedStatus = 'in_progress';
        }
      }

      // 挖掘模式：blue-ocean（蓝海模式）或 existing-website-audit（存量拓新）
      const miningMode = miningState.miningMode || batchState.miningMode || 'blue-ocean';
      
      // 种子词或网站信息
      const seedKeyword = miningState.seedKeyword || '';
      const websiteUrl = miningState.websiteUrl || miningState.selectedWebsite?.url || '';
      const websiteDomain = miningState.websiteDomain || '';
      
      // 批量任务的输入关键词
      const batchInput = batchState.batchInputKeywords || '';

      // 智能任务名称：
      // 1. 如果任务已完成且有关键词，用第一个关键词作为名称
      // 2. 否则用原名称或生成描述性名称
      let displayName = task.name || 'Untitled Task';
      
      if (computedStatus === 'completed') {
        // 尝试用第一个关键词命名
        const firstKeyword = miningKeywords[0]?.keyword || batchKeywords[0]?.keyword || batchKeywords[0]?.original;
        if (firstKeyword) {
          // 截取前30个字符，避免过长
          displayName = firstKeyword.length > 30 ? firstKeyword.substring(0, 30) + '...' : firstKeyword;
        }
      } else if (displayName.match(/^(挖掘|Mining|批量|Batch)\s*#\d+$/)) {
        // 如果是默认的 #数字 格式，生成更具描述性的名称
        if (miningMode === 'existing-website-audit' && websiteDomain) {
          displayName = `存量拓新: ${websiteDomain}`;
        } else if (seedKeyword) {
          displayName = seedKeyword.length > 25 ? seedKeyword.substring(0, 25) + '...' : seedKeyword;
        } else if (batchInput) {
          const firstLine = batchInput.split('\n')[0].trim();
          displayName = firstLine.length > 25 ? firstLine.substring(0, 25) + '...' : firstLine;
        }
      }

      // 如果任务已归档，状态显示为 archived
      const finalStatus = task.deleted_at ? 'archived' : computedStatus;

      return {
        id: task.id,
        user_id: task.user_id,
        name: displayName,
        seed_keyword: seedKeyword || batchInput || null,
        target_language: state.targetLanguage || miningState.targetLanguage || null,
        created_at: task.created_at,
        updated_at: task.updated_at,
        deleted_at: task.deleted_at,
        // ProjectWithStats 扩展字段
        keyword_count: keywordCount,
        draft_count: draftCount,
        published_count: publishedCount,
        type: 'task' as const,
        status: finalStatus,
        task_type: task.type,
        // 额外信息供前端显示
        mining_mode: miningMode,
        website_url: websiteUrl,
        website_domain: websiteDomain,
        is_archived: !!task.deleted_at,
      };
    });

    return res.json({
      success: true,
      data: {
        projects
      },
    });
  } catch (error: any) {
    console.error('[Projects List] Error:', error);
    return sendErrorResponse(res, error, 'Failed to list projects', 500);
  }
}
