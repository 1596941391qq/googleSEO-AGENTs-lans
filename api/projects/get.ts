import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { getProjectById, getProjectStats } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const { projectId, userId } = req.query;
    if (!projectId || !userId) {
      return sendErrorResponse(res, null, 'projectId and userId are required', 400);
    }

    const project = await getProjectById(projectId as string, parseInt(userId as string));
    if (!project) {
      return sendErrorResponse(res, null, 'Project not found', 404);
    }

    const stats = await getProjectStats(projectId as string, parseInt(userId as string));

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
