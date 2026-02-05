import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { verifyAdminToken } from './auth.js';
import { sql } from '../lib/database.js';
import { checkRepoExists, initializeMkDocsRepo } from '../_shared/services/github.js';
import { decryptToken } from '../lib/token-manager.js';

/**
 * Admin API - 手动绑定文章到仓库
 *
 * POST /api/admin/bind-article
 * Body: { articleId, repoName }
 *
 * 1. 验证 GitHub 仓库是否存在（通过任何可用的 GitHub Token）
 * 2. 如果存在，创建新的 platform_sites 记录并绑定到可用的 Netlify Token
 * 3. 更新 published_articles.site_id
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  const authResult = verifyAdminToken(req);
  if (!authResult.valid) {
    return sendErrorResponse(res, null, authResult.error || 'Unauthorized', 401);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const body = parseRequestBody(req);
    const { articleId, repoName } = body;

    if (!articleId) {
      return sendErrorResponse(res, null, 'articleId is required', 400);
    }

    if (!repoName || !repoName.trim()) {
      return sendErrorResponse(res, null, 'repoName is required', 400);
    }

    const trimmedRepoName = repoName.trim();

    console.log(`[Admin Bind Article] Binding article ${articleId} to repo: ${trimmedRepoName}`);

    // 1. 验证文章存在
    const articleCheck = await sql`
      SELECT id, title, content_type, user_id
      FROM published_articles
      WHERE id = ${articleId}
      LIMIT 1
    `;

    if (articleCheck.rows.length === 0) {
      return sendErrorResponse(res, null, 'Article not found', 404);
    }

    const article = articleCheck.rows[0];

    // 2. 查找 platform_sites 中是否已有该 repo_name
    const siteCheck = await sql`
      SELECT id, site_name, platform, status, github_token_id
      FROM platform_sites
      WHERE repo_name = ${trimmedRepoName}
      LIMIT 1
    `;

    let platformSiteId: string;
    let githubTokenId: string;
    let githubOwnerName: string;

    if (siteCheck.rows.length > 0) {
      // 已存在，直接使用
      const site = siteCheck.rows[0];
      platformSiteId = site.id;
      githubTokenId = site.github_token_id;

      // 获取 owner_name
      const ownerResult = await sql`
        SELECT owner_name FROM github_tokens WHERE id = ${githubTokenId} LIMIT 1
      `;
      githubOwnerName = ownerResult.rows.length > 0 ? ownerResult.rows[0].owner_name : 'unknown';

      console.log(`[Admin Bind Article] Found existing platform_site: ${platformSiteId}`);
    } else {
      // 不存在，需要创建新的 platform_site 记录
      console.log(`[Admin Bind Article] No existing platform_site found, will verify and create...`);

      // 3. 验证仓库是否真实存在（尝试通过所有 active 的 GitHub Token 查找）
      const allGithubTokens = await sql`
        SELECT id, owner_name, token_encrypted
        FROM github_tokens
        WHERE status = 'active'
        ORDER BY usage_count ASC
        LIMIT 10
      `;

      if (allGithubTokens.rows.length === 0) {
        return sendErrorResponse(
          res,
          null,
          'No active GitHub tokens available to verify repository',
          500
        );
      }

      let foundToken: any = null;

      // 尝试通过每个 token 验证仓库
      for (const tokenRow of allGithubTokens.rows) {
        try {
          const githubToken = decryptToken(tokenRow.token_encrypted);
          const exists = await checkRepoExists({
            token: githubToken,
            owner: tokenRow.owner_name,
            repoName: trimmedRepoName,
          });

          if (exists) {
            foundToken = tokenRow;
            console.log(`[Admin Bind Article] ✅ Repository exists, owned by ${tokenRow.owner_name}`);
            break;
          }
        } catch (error) {
          console.log(`[Admin Bind Article] Failed to check with token ${tokenRow.id}:`, error);
          continue;
        }
      }

      if (!foundToken) {
        return sendErrorResponse(
          res,
          null,
          `Repository "${trimmedRepoName}" not found on any available GitHub account. Please verify the repository name.`,
          404
        );
      }

      // 4. 获取一个可用的 Netlify Token
      const netlifyTokenResult = await sql`
        SELECT id, name
        FROM platform_tokens
        WHERE platform = 'netlify' AND status = 'active'
        ORDER BY created_at ASC
        LIMIT 1
      `;

      if (netlifyTokenResult.rows.length === 0) {
        return sendErrorResponse(
          res,
          null,
          'No active Netlify tokens available to create binding',
          500
        );
      }

      const netlifyToken = netlifyTokenResult.rows[0];

      // 5. 创建新的 platform_sites 记录
      const siteName = trimmedRepoName;
      const insertResult = await sql`
        INSERT INTO platform_sites (
          github_token_id,
          platform_token_id,
          platform,
          content_type,
          site_name,
          repo_name,
          status,
          usage_count
        )
        VALUES (
          ${foundToken.id},
          ${netlifyToken.id},
          'netlify',
          ${article.content_type || 'informational'},
          ${siteName},
          ${trimmedRepoName},
          'active',
          0
        )
        RETURNING id
      `;

      platformSiteId = insertResult.rows[0].id;
      githubTokenId = foundToken.id;
      githubOwnerName = foundToken.owner_name;

      console.log(`[Admin Bind Article] ✅ Created new platform_site: ${platformSiteId}`);
    }

    // 6. 更新 published_articles.site_id
    await sql`
      UPDATE published_articles
      SET site_id = ${platformSiteId},
          updated_at = NOW()
      WHERE id = ${articleId}
    `;

    console.log(`[Admin Bind Article] ✅ Bound article ${articleId} to site ${platformSiteId}`);

    // 7. 查询并返回完整的绑定信息（包括 netlify_token 信息）
    const bindingInfo = await sql`
      SELECT
        ps.repo_name,
        ps.site_name,
        ps.platform,
        gt.owner_name as github_owner,
        pt.name as netlify_token_name
      FROM platform_sites ps
      JOIN github_tokens gt ON ps.github_token_id = gt.id
      JOIN platform_tokens pt ON ps.platform_token_id = pt.id
      WHERE ps.id = ${platformSiteId}
      LIMIT 1
    `;

    const info = bindingInfo.rows[0];

    return res.json({
      success: true,
      data: {
        message: `Article "${article.title}" successfully bound to repository ${githubOwnerName}/${trimmedRepoName}`,
        articleId,
        siteId: platformSiteId,
        binding: {
          repo_name: info.repo_name,
          site_name: info.site_name,
          platform: info.platform,
          github_owner: info.github_owner,
          netlify_token: info.netlify_token_name
        }
      }
    });

  } catch (error: any) {
    console.error('[Admin Bind Article] Error:', error);
    return sendErrorResponse(res, error, 'Failed to bind article to repository', 500);
  }
}
