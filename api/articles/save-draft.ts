// Save content draft to project management system
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { saveContentDraft } from '../lib/database.js';
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

    const body = parseRequestBody(req);
    const {
      projectId,
      keywordId,
      title,
      content,
      metaDescription,
      urlSlug,
      qualityScore
    } = body;

    // 验证必需字段
    if (!projectId || !title || !content) {
      return sendErrorResponse(res, null, 'projectId, title, and content are required', 400);
    }

    // Save draft
    const draft = await saveContentDraft(
      projectId,
      keywordId || null,
      title,
      content,
      metaDescription,
      urlSlug,
      qualityScore
    );

    return res.json({
      success: true,
      data: {
        draftId: draft.id,
        version: draft.version,
        message: 'Draft saved successfully',
        createdAt: draft.created_at,
      },
    });
  } catch (error: any) {
    console.error('[Save Draft] Error:', error);
    return sendErrorResponse(res, error, 'Failed to save draft', 500);
  }
}
