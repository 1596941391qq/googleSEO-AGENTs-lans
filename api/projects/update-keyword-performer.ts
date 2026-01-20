/**
 * API: 更新关键词的高表现状态
 * 
 * 方法: POST
 * 端点: /api/projects/update-keyword-performer
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { updateKeywordHighPerformer } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

interface UpdateKeywordPerformerRequest {
  keywordId: string;
  isHighPerformer: boolean;
}

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

    const body = req.body as UpdateKeywordPerformerRequest;

    if (!body.keywordId) {
      return sendErrorResponse(res, null, 'keywordId is required', 400);
    }

    if (typeof body.isHighPerformer !== 'boolean') {
      return sendErrorResponse(res, null, 'isHighPerformer must be a boolean', 400);
    }

    const updatedKeyword = await updateKeywordHighPerformer(
      body.keywordId,
      body.isHighPerformer
    );

    if (!updatedKeyword) {
      return sendErrorResponse(res, null, 'Keyword not found', 404);
    }

    return res.json({
      success: true,
      data: {
        keyword: updatedKeyword
      }
    });
  } catch (error: any) {
    console.error('[Update Keyword Performer] Error:', error);
    return sendErrorResponse(res, error, 'Failed to update keyword performer status', 500);
  }
}
