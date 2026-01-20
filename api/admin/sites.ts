import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { verifyAdminToken } from './auth.js';
import {
  createPlatformSite,
  getAllPlatformSites,
  getSitesByGitHubTokenId,
  getPlatformSiteById,
  updatePlatformSiteStatus,
  updatePlatformSiteUrl,
  deletePlatformSite
} from '../lib/database.js';

/**
 * Admin 站点管理 API (v2)
 * 
 * 站点模型:
 * - github_token_id: 关联的 GitHub Token，用于推送代码
 * - platform_token_id: 关联的平台 Token（github_pages 可为空）
 * - platform: 发布平台 (rtd, cf_pages, netlify, vercel, github_pages)
 * - content_type: 内容类型 (informational, commercial)
 * - repo_name: GitHub 仓库名（系统自动生成）
 * - status: pending（等待创建）| active | disabled
 * 
 * GET /api/admin/sites - 获取所有站点
 * POST /api/admin/sites - 创建新站点
 * PUT /api/admin/sites - 更新站点状态/URL
 * DELETE /api/admin/sites - 删除站点
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

  // GET - 获取所有站点
  if (req.method === 'GET') {
    try {
      const { github_token_id, site_id } = req.query;

      if (site_id && typeof site_id === 'string') {
        // 获取单个站点
        const site = await getPlatformSiteById(site_id);
        if (!site) {
          return sendErrorResponse(res, null, 'Site not found', 404);
        }
        return res.json({
          success: true,
          data: { site }
        });
      }

      let sites;
      if (github_token_id && typeof github_token_id === 'string') {
        sites = await getSitesByGitHubTokenId(github_token_id);
      } else {
        sites = await getAllPlatformSites();
      }

      return res.json({
        success: true,
        data: { sites }
      });
    } catch (error: any) {
      console.error('[Admin Sites] Get error:', error);
      return sendErrorResponse(res, error, 'Failed to get sites', 500);
    }
  }

  // POST - 创建新站点
  if (req.method === 'POST') {
    try {
      const body = parseRequestBody(req);
      const { 
        github_token_id, 
        platform_token_id, 
        platform, 
        content_type,
        site_name, 
        site_url, 
        repo_name, 
        docs_path, 
        branch 
      } = body;

      if (!github_token_id || !platform || !content_type || !site_name || !repo_name) {
        return sendErrorResponse(res, null, 'github_token_id, platform, content_type, site_name, and repo_name are required', 400);
      }

      // 验证 platform 值
      const validPlatforms = ['rtd', 'cf_pages', 'netlify', 'vercel', 'github_pages'];
      if (!validPlatforms.includes(platform)) {
        return sendErrorResponse(res, null, `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`, 400);
      }

      // 验证 content_type 值
      const validContentTypes = ['informational', 'commercial'];
      if (!validContentTypes.includes(content_type)) {
        return sendErrorResponse(res, null, `Invalid content_type. Must be one of: ${validContentTypes.join(', ')}`, 400);
      }

      // github_pages 不需要 platform_token_id
      if (platform !== 'github_pages' && !platform_token_id) {
        return sendErrorResponse(res, null, `platform_token_id is required for ${platform}`, 400);
      }

      const newSite = await createPlatformSite({
        github_token_id,
        platform_token_id: platform === 'github_pages' ? null : platform_token_id,
        platform,
        content_type,
        site_name,
        site_url,
        repo_name,
        docs_path,
        branch,
        status: 'pending'
      });

      return res.json({
        success: true,
        data: newSite
      });
    } catch (error: any) {
      console.error('[Admin Sites] Create error:', error);
      return sendErrorResponse(res, error, 'Failed to create site', 500);
    }
  }

  // PUT - 更新站点状态或 URL
  if (req.method === 'PUT') {
    try {
      const body = parseRequestBody(req);
      const { siteId, status, site_url } = body;

      if (!siteId) {
        return sendErrorResponse(res, null, 'siteId is required', 400);
      }

      let updatedSite;
      
      if (status) {
        if (!['pending', 'active', 'disabled'].includes(status)) {
          return sendErrorResponse(res, null, 'Invalid status. Must be pending, active, or disabled', 400);
        }
        updatedSite = await updatePlatformSiteStatus(siteId, status);
      } else if (site_url !== undefined) {
        updatedSite = await updatePlatformSiteUrl(siteId, site_url);
      } else {
        return sendErrorResponse(res, null, 'status or site_url is required', 400);
      }

      if (!updatedSite) {
        return sendErrorResponse(res, null, 'Site not found', 404);
      }

      return res.json({
        success: true,
        data: updatedSite
      });
    } catch (error: any) {
      console.error('[Admin Sites] Update error:', error);
      return sendErrorResponse(res, error, 'Failed to update site', 500);
    }
  }

  // DELETE - 删除站点
  if (req.method === 'DELETE') {
    try {
      const body = parseRequestBody(req);
      const { siteId } = body;

      if (!siteId) {
        return sendErrorResponse(res, null, 'siteId is required', 400);
      }

      const deleted = await deletePlatformSite(siteId);

      if (!deleted) {
        return sendErrorResponse(res, null, 'Site not found', 404);
      }

      return res.json({
        success: true,
        data: { deleted: true }
      });
    } catch (error: any) {
      console.error('[Admin Sites] Delete error:', error);
      return sendErrorResponse(res, error, 'Failed to delete site', 500);
    }
  }

  return sendErrorResponse(res, null, 'Method not allowed', 405);
}
