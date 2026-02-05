import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse } from '../_shared/request-handler.js';
import { verifyAdminToken } from './auth.js';
import { sql, initPSEOPublishTables } from '../lib/database.js';

/**
 * PSEO 数据库状态诊断 API
 * GET /api/admin/pseo-status
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'GET') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  // 验证 Admin 权限
  const authResult = verifyAdminToken(req);
  if (!authResult.valid) {
    return sendErrorResponse(res, null, authResult.error || 'Unauthorized', 401);
  }

  try {
    // 1. 初始化表（如果尚未初始化）
    await initPSEOPublishTables();

    // 2. 检查各表是否存在及数据
    const [
      githubTokensResult,
      platformTokensResult,
      sitesResult,
      bindingsResult,
      tablesExist
    ] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM github_tokens`,
      sql`SELECT COUNT(*) as count FROM platform_tokens`,
      sql`SELECT COUNT(*) as count FROM platform_sites`,
      sql`SELECT COUNT(*) as count FROM website_site_bindings`,
      sql`
        SELECT 
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'github_tokens') as github_tokens,
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_tokens') as platform_tokens,
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_sites') as platform_sites,
          EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_site_bindings') as website_site_bindings
      `
    ]);

    // 3. 获取详细数据
    const [githubTokens, platformTokens, sites] = await Promise.all([
      sql`SELECT id, name, owner_name, usage_count, status, created_at FROM github_tokens ORDER BY created_at DESC`,
      sql`SELECT id, platform, name, usage_count, status, created_at FROM platform_tokens ORDER BY created_at DESC`,
      sql`
        SELECT 
          s.id, s.platform, s.content_type, s.site_name, s.site_url, 
          s.repo_name, s.status, s.usage_count, s.created_at,
          g.name as github_token_name,
          p.name as platform_token_name
        FROM platform_sites s
        LEFT JOIN github_tokens g ON s.github_token_id = g.id
        LEFT JOIN platform_tokens p ON s.platform_token_id = p.id
        ORDER BY s.created_at DESC
      `
    ]);

    return res.json({
      success: true,
      data: {
        tablesExist: tablesExist.rows[0],
        counts: {
          githubTokens: parseInt(githubTokensResult.rows[0]?.count || '0'),
          platformTokens: parseInt(platformTokensResult.rows[0]?.count || '0'),
          sites: parseInt(sitesResult.rows[0]?.count || '0'),
          bindings: parseInt(bindingsResult.rows[0]?.count || '0'),
        },
        details: {
          githubTokens: githubTokens.rows,
          platformTokens: platformTokens.rows,
          sites: sites.rows,
        },
        message: '✅ PSEO tables are properly initialized'
      }
    });

  } catch (error: any) {
    console.error('[PSEO Status] Error:', error);
    return res.json({
      success: false,
      error: error.message,
      data: {
        message: '❌ Error checking PSEO tables',
        details: error
      }
    });
  }
}
