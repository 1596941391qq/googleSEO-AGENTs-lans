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
    
    const projects = await getUserProjects(finalUserId);
    const tasks = await getUserExecutionTasks(finalUserId);

    // 将任务转换为类似项目的结构，以便看板显示
    const taskProjects = tasks.map(task => {
      let keywordCount = 0;
      if (task.type === 'mining') {
        keywordCount = task.state?.keywords?.length || 0;
      } else if (task.type === 'batch') {
        keywordCount = task.state?.batchKeywords?.length || 0;
      } else if (task.type === 'article-generator') {
        keywordCount = 1;
      }

      // 获取更友好的名称
      let displayName = task.name;
      if (!displayName || displayName === 'New Task' || displayName === 'Keyword Mining' || displayName === 'Article Generation') {
        const seed = task.params?.seedKeyword || task.params?.keyword || task.state?.seedKeyword || task.state?.keyword;
        if (seed) {
          displayName = typeof seed === 'string' ? seed : (seed.keyword || displayName);
        }
      }

      return {
        id: task.id,
        user_id: task.user_id,
        name: displayName || (task.type === 'mining' ? 'Keyword Mining' : 'Task'),
        status: task.status, // in_progress, completed, failed
        type: 'task',
        task_type: task.type,
        created_at: task.created_at,
        updated_at: task.updated_at,
        keyword_count: keywordCount,
        draft_count: task.type === 'article-generator' && task.status === 'completed' ? 1 : 0,
        published_count: 0,
        params: task.params,
        state: task.state
      };
    });

    // 将现有项目标记为 'project' 类型
    const existingProjects = projects.map(p => ({
      ...p,
      type: 'project',
      status: 'completed' // 现有项目默认视为已完成
    }));

    // 合并并按更新时间排序
    const allProjects = [...taskProjects, ...existingProjects].sort((a, b) => 
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
