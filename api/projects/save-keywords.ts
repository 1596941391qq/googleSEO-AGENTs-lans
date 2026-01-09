import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { createOrGetProject, createOrGetKeyword } from '../lib/database.js';
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
    const { projectName, seedKeyword, targetLanguage, keywords } = body;

    if (!projectName || !keywords || !Array.isArray(keywords)) {
      return sendErrorResponse(res, null, 'Missing required fields', 400);
    }

    // 1. Create or get project
    const project = await createOrGetProject(
      finalUserId,
      projectName,
      seedKeyword,
      targetLanguage
    );

    // 2. Save keywords to project
    const savedKeywords = [];
    for (const kw of keywords) {
      const savedKw = await createOrGetKeyword(
        project.id,
        kw.keyword,
        kw.translation,
        kw.intent,
        kw.volume,
        kw.probability
      );
      savedKeywords.push(savedKw);
    }

    return res.json({
      success: true,
      data: {
        project,
        keywordCount: savedKeywords.length
      },
    });
  } catch (error: any) {
    console.error('[Save Keywords to Project] Error:', error);
    return sendErrorResponse(res, error, 'Failed to save keywords to project', 500);
  }
}
