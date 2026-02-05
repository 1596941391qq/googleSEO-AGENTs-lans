import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { verifyAdminToken } from './auth.js';
import { sql, initPSEOPublishTables } from '../lib/database.js';

/**
 * Admin Token 管理 API
 *
 * GET /api/admin/tokens - 获取所有 Token 和绑定关系
 * POST /api/admin/tokens?type=github - 创建 GitHub Token
 * POST /api/admin/tokens?type=platform - 创建 Platform Token
 * POST /api/admin/tokens?action=bind - 绑定 Token 对
 * POST /api/admin/tokens?action=unbind - 解绑 Token
 * DELETE /api/admin/tokens?type=github - 删除 GitHub Token
 * DELETE /api/admin/tokens?type=platform - 删除 Platform Token
 */

interface GitHubToken {
  id: string;
  name: string;
  token_encrypted: string;
  owner_name: string;
  usage_count: number;
  status: 'active' | 'disabled';
  created_at: Date;
  updated_at: Date;
}

interface PlatformToken {
  id: string;
  platform: string;
  name: string;
  token_encrypted: string;
  usage_count: number;
  status: 'active' | 'disabled';
  metadata: any;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// CRUD 操作
// ============================================================================

async function getAllGitHubTokens(): Promise<GitHubToken[]> {
  await initPSEOPublishTables();
  const result = await sql<GitHubToken>`
    SELECT * FROM github_tokens ORDER BY created_at DESC
  `;
  console.log('[Admin Tokens] getAllGitHubTokens: Found', result.rows.length, 'tokens');
  return result.rows;
}

async function createGitHubToken(data: {
  name: string;
  token: string;
  owner_name: string;
}): Promise<GitHubToken> {
  await initPSEOPublishTables();

  const tokenEncrypted = Buffer.from(data.token).toString('base64');

  const result = await sql<GitHubToken>`
    INSERT INTO github_tokens (name, token_encrypted, owner_name)
    VALUES (${data.name}, ${tokenEncrypted}, ${data.owner_name})
    RETURNING *
  `;

  return result.rows[0];
}

async function deleteGitHubToken(tokenId: string): Promise<boolean> {
  await initPSEOPublishTables();

  const result = await sql`
    DELETE FROM github_tokens WHERE id = ${tokenId} RETURNING id
  `;
  return result.rows.length > 0;
}

async function getAllPlatformTokens(): Promise<PlatformToken[]> {
  await initPSEOPublishTables();

  const result = await sql<PlatformToken>`
    SELECT * FROM platform_tokens ORDER BY created_at DESC
  `;
  console.log('[Admin Tokens] getAllPlatformTokens: Found', result.rows.length, 'tokens');
  return result.rows;
}

async function createPlatformToken(data: {
  platform: string;
  name: string;
  token: string;
}): Promise<PlatformToken> {
  await initPSEOPublishTables();

  const tokenEncrypted = Buffer.from(data.token).toString('base64');

  const result = await sql<PlatformToken>`
    INSERT INTO platform_tokens (platform, name, token_encrypted)
    VALUES (${data.platform}, ${data.name}, ${tokenEncrypted})
    RETURNING *
  `;

  return result.rows[0];
}

async function deletePlatformToken(tokenId: string): Promise<boolean> {
  await initPSEOPublishTables();

  const result = await sql`
    DELETE FROM platform_tokens WHERE id = ${tokenId} RETURNING id
  `;
  return result.rows.length > 0;
}

// ============================================================================
// 绑定管理（使用 platform_sites 表的外键）
// ============================================================================

async function getTokenBindings() {
  await initPSEOPublishTables();

  const result = await sql<any>`
    SELECT
      g.id as github_id,
      g.name as github_name,
      g.owner_name,
      g.token_encrypted as github_token_encrypted,
      g.usage_count as github_usage_count,
      g.status as github_status,
      p.id as platform_id,
      p.platform,
      p.name as platform_name,
      p.token_encrypted as platform_token_encrypted,
      p.usage_count as platform_usage_count,
      p.status as platform_status,
      CASE WHEN ps.github_token_id = g.id THEN true ELSE false END as is_bound
    FROM github_tokens g
    CROSS JOIN platform_tokens p
    LEFT JOIN platform_sites ps ON ps.github_token_id = g.id AND ps.platform_token_id = p.id
    ORDER BY g.created_at DESC, p.created_at DESC
  `;

  return result.rows;
}

async function bindTokens(githubTokenId: string, platformTokenId: string, platform: string): Promise<boolean> {
  await initPSEOPublishTables();

  // 检查是否已存在绑定
  const existingCheck = await sql`
    SELECT id FROM platform_sites
    WHERE github_token_id = ${githubTokenId}
    AND platform_token_id = ${platformTokenId}
    LIMIT 1
  `;

  if (existingCheck.rows.length > 0) {
    return true; // 已绑定
  }

  // 生成唯一的 repo_name
  const repoName = `binding-${githubTokenId.substring(0, 8)}`;

  // 创建绑定记录（使用 platform_sites 表作为绑定关系）
  const result = await sql`
    INSERT INTO platform_sites (github_token_id, platform_token_id, platform, content_type, site_name, repo_name, status)
    VALUES (
      ${githubTokenId},
      ${platformTokenId},
      ${platform},
      'informational',
      'Auto-generated binding',
      ${repoName},
      'active'
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `;

  return result.rows.length > 0;
}

async function unbindTokens(githubTokenId: string, platformTokenId: string): Promise<boolean> {
  await initPSEOPublishTables();

  const result = await sql`
    DELETE FROM platform_sites
    WHERE github_token_id = ${githubTokenId}
    AND platform_token_id = ${platformTokenId}
    RETURNING id
  `;

  return result.rows.length > 0;
}

// ============================================================================
// HTTP Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  const authResult = verifyAdminToken(req);
  if (!authResult.valid) {
    return sendErrorResponse(res, null, authResult.error || 'Unauthorized', 401);
  }

  const tokenType = req.query.type as string;
  const action = req.query.action as string;

  // GET - 获取所有 Token 和绑定关系
  if (req.method === 'GET') {
    try {
      console.log('[Admin Tokens] GET request received');

      const [githubTokens, platformTokens, bindings] = await Promise.all([
        getAllGitHubTokens(),
        getAllPlatformTokens(),
        getTokenBindings()
      ]);

      console.log('[Admin Tokens] Query results:', {
        githubTokensCount: githubTokens.length,
        platformTokensCount: platformTokens.length,
        bindingsCount: bindings.length
      });

      // 处理绑定关系
      const bound: any[] = [];
      const unboundGithub: any[] = [];
      const unboundPlatform: any[] = [];

      // 分类 GitHub Tokens
      githubTokens.forEach(g => {
        const hasBinding = bindings.some((b: any) => b.github_id === g.id && b.is_bound);
        if (hasBinding) {
          // 找到绑定的 platform token
          const binding = bindings.find((b: any) => b.github_id === g.id && b.is_bound);
          if (binding) {
            bound.push({
              github: {
                ...g,
                token_encrypted: undefined,
                token_preview: '****' + Buffer.from(g.token_encrypted, 'base64').toString('utf-8').slice(-4)
              },
              platform: {
                id: binding.platform_id,
                platform: binding.platform,
                name: binding.platform_name,
                usage_count: binding.platform_usage_count,
                status: binding.platform_status,
                token_preview: '****' + Buffer.from(binding.platform_token_encrypted, 'base64').toString('utf-8').slice(-4)
              }
            });
          }
        } else {
          unboundGithub.push({
            ...g,
            token_encrypted: undefined,
            token_preview: '****' + Buffer.from(g.token_encrypted, 'base64').toString('utf-8').slice(-4)
          });
        }
      });

      // 分类 Platform Tokens
      platformTokens.forEach(p => {
        const hasBinding = bindings.some((b: any) => b.platform_id === p.id && b.is_bound);
        if (!hasBinding) {
          unboundPlatform.push({
            ...p,
            token_encrypted: undefined,
            token_preview: '****' + Buffer.from(p.token_encrypted, 'base64').toString('utf-8').slice(-4)
          });
        }
      });

      console.log('[Admin Tokens] Processed results:', {
        boundCount: bound.length,
        unboundGithubCount: unboundGithub.length,
        unboundPlatformCount: unboundPlatform.length
      });

      return res.json({
        success: true,
        data: {
          bound,
          unboundGithub,
          unboundPlatform
        }
      });
    } catch (error: any) {
      console.error('[Admin Tokens] Get error:', error);
      return sendErrorResponse(res, error, 'Failed to get tokens', 500);
    }
  }

  // POST - 创建 Token 或绑定/解绑
  if (req.method === 'POST') {
    try {
      const body = parseRequestBody(req);

      if (action === 'bind') {
        const { githubTokenId, platformTokenId, platform } = body;

        if (!githubTokenId || !platformTokenId || !platform) {
          return sendErrorResponse(res, null, 'githubTokenId, platformTokenId, and platform are required', 400);
        }

        const result = await bindTokens(githubTokenId, platformTokenId, platform);

        if (!result) {
          return sendErrorResponse(res, null, 'Failed to bind tokens', 400);
        }

        return res.json({
          success: true,
          data: { message: 'Tokens bound successfully' }
        });
      }

      if (action === 'unbind') {
        const { githubTokenId, platformTokenId } = body;

        if (!githubTokenId || !platformTokenId) {
          return sendErrorResponse(res, null, 'githubTokenId and platformTokenId are required', 400);
        }

        const result = await unbindTokens(githubTokenId, platformTokenId);

        if (!result) {
          return sendErrorResponse(res, null, 'Binding not found', 404);
        }

        return res.json({
          success: true,
          data: { message: 'Tokens unbound successfully' }
        });
      }

      if (tokenType === 'github') {
        const { name, token, owner_name } = body;

        if (!name || !token || !owner_name) {
          return sendErrorResponse(res, null, 'name, token, and owner_name are required', 400);
        }

        const result = await createGitHubToken({ name, token, owner_name });

        return res.json({
          success: true,
          data: {
            ...result,
            token_encrypted: undefined,
            token_preview: '****' + token.slice(-4)
          }
        });
      }

      if (tokenType === 'platform') {
        const { name, token, platform = 'netlify' } = body;

        if (!name || !token) {
          return sendErrorResponse(res, null, 'name and token are required', 400);
        }

        const result = await createPlatformToken({ name, token, platform });

        return res.json({
          success: true,
          data: {
            ...result,
            token_encrypted: undefined,
            token_preview: '****' + token.slice(-4)
          }
        });
      }

      return sendErrorResponse(res, null, 'Invalid action or type parameter', 400);
    } catch (error: any) {
      console.error('[Admin Tokens] Create/Bind error:', error);

      if (error.message?.includes('duplicate key') || error.message?.includes('unique')) {
        return sendErrorResponse(res, null, 'Token name already exists', 409);
      }

      return sendErrorResponse(res, error, 'Failed to create or bind token', 500);
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
