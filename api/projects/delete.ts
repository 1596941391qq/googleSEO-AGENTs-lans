import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { deleteProject } from '../lib/database.js';

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
    const { projectId, userId } = body;

    if (!projectId || !userId) {
      return sendErrorResponse(res, null, 'projectId and userId are required', 400);
    }

    const success = await deleteProject(projectId, parseInt(userId));
    if (!success) {
      return sendErrorResponse(res, null, 'Project not found', 404);
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
