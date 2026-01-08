import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { createOrGetProject, createOrGetKeyword } from '../lib/database.js';

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
    const { userId, projectName, seedKeyword, targetLanguage, keywords } = body;

    if (!userId || !projectName || !keywords || !Array.isArray(keywords)) {
      return sendErrorResponse(res, null, 'Missing required fields', 400);
    }

    // 1. Create or get project
    const project = await createOrGetProject(
      parseInt(userId),
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
