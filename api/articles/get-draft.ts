// Get content draft details with versions and images
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { 
  getContentDraftById, 
  getContentDraftVersions, 
  getContentDraftImages 
} from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return sendErrorResponse(res, null, 'Draft ID is required', 400);
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }

    const draft = await getContentDraftById(id);
    if (!draft) {
      return sendErrorResponse(res, null, 'Draft not found', 404);
    }

    // Get versions and images in parallel
    const [versions, images] = await Promise.all([
      getContentDraftVersions(draft.project_id, draft.keyword_id || ''),
      getContentDraftImages(id)
    ]);

    return res.json({
      success: true,
      data: {
        draft,
        versions,
        images
      },
    });
  } catch (error: any) {
    console.error('[Get Draft] Error:', error);
    return sendErrorResponse(res, error, 'Failed to fetch draft details', 500);
  }
}
