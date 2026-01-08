import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { updateProject } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const body = parseRequestBody(req);
    const { projectId, userId, updates } = body;

    if (!projectId || !userId || !updates) {
      return sendErrorResponse(res, null, 'projectId, userId and updates are required', 400);
    }

    const project = await updateProject(projectId, parseInt(userId), updates);
    if (!project) {
      return sendErrorResponse(res, null, 'Project not found or no changes made', 404);
    }

    return res.json({
      success: true,
      data: {
        project
      },
    });
  } catch (error: any) {
    console.error('[Update Project] Error:', error);
    return sendErrorResponse(res, error, 'Failed to update project', 500);
  }
}
