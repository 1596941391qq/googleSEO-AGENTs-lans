// Get content draft details with versions and images
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { 
  getContentDraftVersions, 
  getContentDraftImages,
  sql,
  initContentDraftsTable
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
    const userId = authResult.userId;

    await initContentDraftsTable();

    // 获取草稿并验证用户归属（通过 JOIN projects 表）
    const result = await sql`
      SELECT cd.* 
      FROM content_drafts cd
      INNER JOIN projects p ON cd.project_id = p.id
      WHERE cd.id = ${id} AND p.user_id::text = ${userId.toString()}
    `;

    if (result.rows.length === 0) {
      return sendErrorResponse(res, null, 'Draft not found or access denied', 404);
    }

    const draft = result.rows[0];

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
