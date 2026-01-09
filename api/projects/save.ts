import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { createOrGetProject } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }
    const userId = authResult.userId;
    const numericUserId = parseInt(userId);
    const finalUserId = isNaN(numericUserId) ? userId : numericUserId;

    const body = parseRequestBody(req);
    const { name, seedKeyword, targetLanguage } = body;

    if (!name) {
      return sendErrorResponse(res, null, 'Project name is required', 400);
    }

    const project = await createOrGetProject(
      finalUserId,
      name,
      seedKeyword,
      targetLanguage
    );

    return res.json({
      success: true,
      data: {
        project
      },
    });
  } catch (error: any) {
    console.error('[Create/Save Project] Error:', error);
    return sendErrorResponse(res, error, 'Failed to save project', 500);
  }
}
