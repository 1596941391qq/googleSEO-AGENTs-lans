import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getUserProjects, getUserExecutionTasks } from '../lib/database.js';
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
    
    // 检查 userId 是否有效，避免 parseInt("NaN") 导致的数据库错误
    if (!userId || userId === 'NaN') {
      return res.json({
        success: true,
        data: {
          projects: []
        },
      });
    }

    // 尝试转换为数字，如果失败（如 UUID）则保留字符串，getUserProjects 已适配两者
    const numericUserId = parseInt(userId);
    const finalUserId = isNaN(numericUserId) ? userId : numericUserId;
    
    const tasks = await getUserExecutionTasks(finalUserId);

    // 将任务转换为类似项目的结构，以便看板显示
    const taskProjects = tasks.map(task => {
      let keywordCount = 0;
      if (task.type === 'mining') {
        keywordCount = task.state?.keywords?.length || task.state?.miningState?.keywords?.length || 0;
      } else if (task.type === 'batch') {
        keywordCount = task.state?.batchKeywords?.length || task.state?.batchState?.batchKeywords?.length || 0;
      } else if (task.type === 'article-generator') {
        keywordCount = 1;
      }

      // 获取更友好的名称
      let displayName = task.name;
      if (!displayName || displayName === 'New Task' || displayName === 'Keyword Mining' || displayName === 'Article Generation') {
        const seed = task.params?.seedKeyword || task.params?.keyword || task.state?.seedKeyword || task.state?.keyword || task.state?.miningState?.seedKeyword;
        if (seed) {
          displayName = typeof seed === 'string' ? seed : (seed.keyword || displayName);
        }
      }

      // 根据任务所在页面状态确定显示状态
      // 输入页 = pending（未开始）
      // 过程页 = in_progress（进行中）
      // 结果页 = completed（已完成）
      let effectiveStatus = task.status;
      const state = task.state || {};
      const miningState = state.miningState || state;
      const batchState = state.batchState || state;
      const articleState = state.articleGeneratorState || state;
      const deepDiveState = state.deepDiveState || state;

      if (task.type === 'mining') {
        const hasKeywords = (miningState.keywords && miningState.keywords.length > 0);
        const isMining = miningState.isMining === true;
        const hasSeedKeyword = !!(miningState.seedKeyword || state.seedKeyword);
        
        if (hasKeywords || miningState.miningSuccess === true) {
          // 结果页：有关键词结果
          effectiveStatus = 'completed';
        } else if (isMining) {
          // 过程页：正在挖掘中
          effectiveStatus = 'in_progress';
        } else if (miningState.miningError) {
          // 失败
          effectiveStatus = 'failed';
        } else {
          // 输入页：还没有开始挖掘
          effectiveStatus = 'pending';
        }
      } else if (task.type === 'batch') {
        const hasResults = batchState.batchKeywords && batchState.batchKeywords.length > 0;
        const isProcessing = batchState.batchCurrentIndex !== undefined && 
                            batchState.batchCurrentIndex < (batchState.batchTotalCount || 0);
        
        if (hasResults && !isProcessing) {
          // 结果页：批量处理完成
          effectiveStatus = 'completed';
        } else if (isProcessing) {
          // 过程页：正在批量处理
          effectiveStatus = 'in_progress';
        } else {
          // 输入页：未开始
          effectiveStatus = 'pending';
        }
      } else if (task.type === 'article-generator') {
        const currentStage = articleState.currentStage;
        const hasFinalArticle = !!articleState.finalArticle;
        const isGenerating = articleState.isGenerating === true;
        
        if (currentStage === 'complete' || hasFinalArticle) {
          // 结果页：文章生成完成
          effectiveStatus = 'completed';
        } else if (isGenerating || (currentStage && currentStage !== 'input')) {
          // 过程页：正在生成（research, strategy, writing, visualizing）
          effectiveStatus = 'in_progress';
        } else {
          // 输入页：还在配置阶段
          effectiveStatus = 'pending';
        }
      } else if (task.type === 'deep-dive') {
        const hasReport = !!deepDiveState.currentStrategyReport;
        const isDeepDiving = deepDiveState.isDeepDiving === true;
        
        if (hasReport) {
          // 结果页
          effectiveStatus = 'completed';
        } else if (isDeepDiving) {
          // 过程页
          effectiveStatus = 'in_progress';
        } else {
          // 输入页
          effectiveStatus = 'pending';
        }
      }

      return {
        id: task.id,
        user_id: task.user_id,
        name: displayName || (task.type === 'mining' ? 'Keyword Mining' : 'Task'),
        status: effectiveStatus,
        type: 'task',
        task_type: task.type,
        created_at: task.created_at,
        updated_at: task.updated_at,
        keyword_count: keywordCount,
        draft_count: task.type === 'article-generator' && effectiveStatus === 'completed' ? 1 : 0,
        published_count: 0,
        params: task.params,
        state: task.state
      };
    });

    // 合并并按更新时间排序
    const allProjects = [...taskProjects].sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return res.json({
      success: true,
      data: {
        projects: allProjects
      },
    });
  } catch (error: any) {
    console.error('[List Projects] Error:', error);
    return sendErrorResponse(res, error, 'Failed to list projects', 500);
  }
}
