import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions } from '../_shared/request-handler.js';
import { sql, initPSEOPublishTables } from '../lib/database.js';

/**
 * PSEO 数据库诊断端点（仅用于开发测试）
 * GET /api/debug/pseo-db-check
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  try {
    console.log('[PSEO DB Check] Starting database check...');
    
    // 1. 初始化表
    console.log('[PSEO DB Check] Initializing tables...');
    await initPSEOPublishTables();
    console.log('[PSEO DB Check] Tables initialized');

    // 2. 检查表是否存在
    const tablesExist = await sql`
      SELECT 
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'github_tokens') as github_tokens,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_tokens') as platform_tokens,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_sites') as platform_sites,
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'website_site_bindings') as website_site_bindings
    `;

    // 3. 获取数据计数
    const counts = await sql`
      SELECT 
        (SELECT COUNT(*) FROM github_tokens)::int as github_tokens,
        (SELECT COUNT(*) FROM platform_tokens)::int as platform_tokens,
        (SELECT COUNT(*) FROM platform_sites)::int as sites,
        (SELECT COUNT(*) FROM website_site_bindings)::int as bindings
    `;

    // 4. 获取详细数据
    const githubTokens = await sql`
      SELECT id, name, owner_name, usage_count, status, created_at 
      FROM github_tokens ORDER BY created_at DESC LIMIT 10
    `;
    
    const platformTokens = await sql`
      SELECT id, platform, name, usage_count, status, created_at 
      FROM platform_tokens ORDER BY created_at DESC LIMIT 10
    `;
    
    const sites = await sql`
      SELECT id, platform, content_type, site_name, repo_name, status, created_at 
      FROM platform_sites ORDER BY created_at DESC LIMIT 10
    `;

    return res.json({
      success: true,
      timestamp: new Date().toISOString(),
      database: {
        tablesExist: tablesExist.rows[0],
        counts: counts.rows[0],
      },
      data: {
        githubTokens: githubTokens.rows,
        platformTokens: platformTokens.rows,
        sites: sites.rows,
      },
      message: tablesExist.rows[0].github_tokens 
        ? '✅ PSEO tables are properly initialized' 
        : '❌ Some PSEO tables are missing'
    });

  } catch (error: any) {
    console.error('[PSEO DB Check] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      message: '❌ Database check failed'
    });
  }
}
