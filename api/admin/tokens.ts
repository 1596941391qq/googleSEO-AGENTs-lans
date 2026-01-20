import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { verifyAdminToken } from './auth.js';
import {
  createGitHubToken,
  getAllGitHubTokens,
  updateGitHubTokenStatus,
  deleteGitHubToken,
  createPlatformToken,
  getAllPlatformTokens,
  updatePlatformTokenStatus,
  deletePlatformToken,
  getPSEOPublishStats
} from '../lib/database.js';

/**
 * Admin Token 池管理 API (v2 - 分离 GitHub Token 和平台 Token)
 * 
 * GitHub Tokens:
 * GET /api/admin/tokens?type=github - 获取所有 GitHub Token
 * POST /api/admin/tokens?type=github - 创建新 GitHub Token
 * PUT /api/admin/tokens?type=github - 更新 GitHub Token 状态
 * DELETE /api/admin/tokens?type=github - 删除 GitHub Token
 * 
 * Platform Tokens:
 * GET /api/admin/tokens?type=platform - 获取所有平台 Token
 * POST /api/admin/tokens?type=platform - 创建新平台 Token
 * PUT /api/admin/tokens?type=platform - 更新平台 Token 状态
 * DELETE /api/admin/tokens?type=platform - 删除平台 Token
 * 
 * Statistics:
 * GET /api/admin/tokens - 获取所有 Token 和统计信息
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  // 验证 Admin 权限
  const authResult = verifyAdminToken(req);
  if (!authResult.valid) {
    return sendErrorResponse(res, null, authResult.error || 'Unauthorized', 401);
  }

  const tokenType = req.query.type as string;

  // GET - 获取所有 Token
  if (req.method === 'GET') {
    try {
      const [githubTokens, platformTokens, stats] = await Promise.all([
        getAllGitHubTokens(),
        getAllPlatformTokens(),
        getPSEOPublishStats()
      ]);

      // 隐藏 token 内容，只返回前几位
      const safeGitHubTokens = githubTokens.map(t => ({
        ...t,
        token_encrypted: undefined,
        token_preview: '****' + Buffer.from(t.token_encrypted, 'base64').toString('utf-8').slice(-4)
      }));

      const safePlatformTokens = platformTokens.map(t => ({
        ...t,
        token_encrypted: undefined,
        token_preview: '****' + Buffer.from(t.token_encrypted, 'base64').toString('utf-8').slice(-4)
      }));

      return res.json({
        success: true,
        data: {
          githubTokens: safeGitHubTokens,
          platformTokens: safePlatformTokens,
          stats
        }
      });
    } catch (error: any) {
      console.error('[Admin Tokens] Get error:', error);
      return sendErrorResponse(res, error, 'Failed to get tokens', 500);
    }
  }

  // POST - 创建新 Token
  if (req.method === 'POST') {
    try {
      const body = parseRequestBody(req);
      
      if (tokenType === 'github') {
        // 创建 GitHub Token
        const { name, token, owner_name } = body;

        if (!name || !token || !owner_name) {
          return sendErrorResponse(res, null, 'name, token, and owner_name are required', 400);
        }

        const result = await createGitHubToken({ name, token, owner_name });
        
        // 检查是否返回错误
        if ('error' in result) {
          return sendErrorResponse(res, null, result.error, 409);
        }

        return res.json({
          success: true,
          data: {
            ...result,
            token_encrypted: undefined,
            token_preview: '****' + token.slice(-4)
          }
        });
      } else if (tokenType === 'platform') {
        // 创建平台 Token
        const { platform, token, name } = body;

        if (!platform || !token || !name) {
          return sendErrorResponse(res, null, 'platform, token, and name are required', 400);
        }

        // 验证 platform 值（不包含 github_pages，因为它不需要单独的 Token）
        const validPlatforms = ['rtd', 'cf_pages', 'netlify', 'vercel'];
        if (!validPlatforms.includes(platform)) {
          return sendErrorResponse(res, null, `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`, 400);
        }

        const result = await createPlatformToken({ platform, token, name });
        
        // 检查是否返回错误
        if ('error' in result) {
          return sendErrorResponse(res, null, result.error, 409);
        }

        return res.json({
          success: true,
          data: {
            ...result,
            token_encrypted: undefined,
            token_preview: '****' + token.slice(-4)
          }
        });
      } else {
        return sendErrorResponse(res, null, 'type query parameter is required (github or platform)', 400);
      }
    } catch (error: any) {
      console.error('[Admin Tokens] Create error:', error);
      return sendErrorResponse(res, error, 'Failed to create token', 500);
    }
  }

  // PUT - 更新 Token 状态
  if (req.method === 'PUT') {
    try {
      const body = parseRequestBody(req);
      const { tokenId, status } = body;

      if (!tokenId || !status) {
        return sendErrorResponse(res, null, 'tokenId and status are required', 400);
      }

      if (!['active', 'disabled'].includes(status)) {
        return sendErrorResponse(res, null, 'Invalid status. Must be active or disabled', 400);
      }

      let updatedToken;
      if (tokenType === 'github') {
        updatedToken = await updateGitHubTokenStatus(tokenId, status);
      } else if (tokenType === 'platform') {
        updatedToken = await updatePlatformTokenStatus(tokenId, status);
      } else {
        return sendErrorResponse(res, null, 'type query parameter is required (github or platform)', 400);
      }

      if (!updatedToken) {
        return sendErrorResponse(res, null, 'Token not found', 404);
      }

      return res.json({
        success: true,
        data: {
          ...updatedToken,
          token_encrypted: undefined
        }
      });
    } catch (error: any) {
      console.error('[Admin Tokens] Update error:', error);
      return sendErrorResponse(res, error, 'Failed to update token', 500);
    }
  }

  // DELETE - 删除 Token
  if (req.method === 'DELETE') {
    try {
      const body = parseRequestBody(req);
      const { tokenId } = body;

      if (!tokenId) {
        return sendErrorResponse(res, null, 'tokenId is required', 400);
      }

      let deleted;
      if (tokenType === 'github') {
        deleted = await deleteGitHubToken(tokenId);
      } else if (tokenType === 'platform') {
        deleted = await deletePlatformToken(tokenId);
      } else {
        return sendErrorResponse(res, null, 'type query parameter is required (github or platform)', 400);
      }

      if (!deleted) {
        return sendErrorResponse(res, null, 'Token not found', 404);
      }

      return res.json({
        success: true,
        data: { deleted: true }
      });
    } catch (error: any) {
      console.error('[Admin Tokens] Delete error:', error);
      return sendErrorResponse(res, error, 'Failed to delete token', 500);
    }
  }

  return sendErrorResponse(res, null, 'Method not allowed', 405);
}
