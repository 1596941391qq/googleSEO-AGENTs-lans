import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';
import { updatePublishedArticle } from '../_shared/services/pseo-publisher.js';

/**
 * 构建 Article URL（辅助函数）
 */
function buildArticleUrl(siteUrl: string, slug: string): string {
  if (!siteUrl) return '';
  const cleanUrl = siteUrl.replace(/\/$/, '');
  return `${cleanUrl}/${slug}/`;
}

/**
 * 更新已发布文章 API
 *
 * 将修改后的文章内容推送到已发布的 GitHub 仓库，触发重新部署
 *
 * POST /api/articles/update-published
 * Body: { articleId, websiteId? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }

    const body = parseRequestBody(req);
    const { articleId, websiteId } = body;

    if (!articleId) {
      return sendErrorResponse(res, null, 'articleId is required', 400);
    }

    // 1. 获取文章详情
    const articleResult = await sql`
      SELECT * FROM published_articles WHERE id = ${articleId} AND user_id = ${authResult.userId}
    `;

    if (articleResult.rows.length === 0) {
      return sendErrorResponse(res, null, 'Article not found', 404);
    }

    const article = articleResult.rows[0];

    // 2. 检查文章是否已发布
    if (article.status !== 'published') {
      return sendErrorResponse(res, null, 'Article is not published yet', 400);
    }

    // 3. 确定项目 ID 和仓库名称
    let actualProjectId = websiteId || article.project_id;

    if (!actualProjectId) {
      // 尝试从用户的默认网站或任意一个活跃网站作为 fallback
      console.log('[Update Published] Project ID missing, searching for a fallback website/project...');
      const fallbackResult = await sql`
        SELECT id FROM user_websites
        WHERE user_id = ${authResult.userId}
        AND is_active = true
        ORDER BY is_default DESC, created_at DESC
        LIMIT 1
      `;
      if (fallbackResult.rows.length > 0) {
        actualProjectId = fallbackResult.rows[0].id;
        console.log('[Update Published] Found fallback Project ID:', actualProjectId);
      }
    }

    if (!actualProjectId) {
      return sendErrorResponse(res, null, '未找到关联的项目或网站。', 400);
    }

    // 4. 确定内容类型（需要在查询 siteResult 之前使用）
    const contentType: 'informational' | 'commercial' = article.content_type || 'informational';

    // 5. 从 platform_sites 获取实际的仓库名称
    // 优先级：1. 使用 article.site_id 直接查询  2. 通过 website_site_bindings 关联查询
    let repoName = '';
    let githubOwner = '';

    // 方法1: 如果文章有 site_id，直接查询 repo_name
    if (article.site_id) {
      const directSiteResult = await sql`
        SELECT ps.repo_name, ps.site_name, gt.owner_name
        FROM platform_sites ps
        JOIN github_tokens gt ON ps.github_token_id = gt.id
        WHERE ps.id = ${article.site_id}
        LIMIT 1
      `;

      if (directSiteResult.rows.length > 0) {
        repoName = directSiteResult.rows[0].repo_name;
        githubOwner = directSiteResult.rows[0].owner_name;
        console.log('[Update Published] Found repo_name from article.site_id:', repoName);
      }
    }

    // 方法2: 如果上面没找到，尝试通过 website_site_bindings 查询
    if (!repoName && actualProjectId) {
      const bindingResult = await sql`
        SELECT ps.repo_name, ps.site_name, gt.owner_name
        FROM website_site_bindings wb
        JOIN platform_sites ps ON wb.site_id = ps.id
        JOIN github_tokens gt ON ps.github_token_id = gt.id
        WHERE wb.website_id = ${actualProjectId}
        AND ps.content_type = ${contentType}
        LIMIT 1
      `;

      if (bindingResult.rows.length > 0) {
        repoName = bindingResult.rows[0].repo_name;
        githubOwner = bindingResult.rows[0].owner_name;
        console.log('[Update Published] Found repo_name from website_site_bindings:', repoName, 'for project:', actualProjectId);
      }
    }

    // 如果都找不到，自动重新发布
    if (!repoName) {
      console.log('[Update Published] No repo_name found, will republish article...');

      // 导入 publishArticle 函数
      const { publishArticle } = await import('../_shared/services/pseo-publisher.js');

      // 从网站域名提取品牌名
      let brandName: string | undefined;
      try {
        const websiteResult = await sql`
          SELECT website_domain FROM user_websites
          WHERE id = ${actualProjectId} AND user_id = ${authResult.userId}
          LIMIT 1
        `;
        if (websiteResult.rows.length > 0) {
          const domain = websiteResult.rows[0].website_domain;
          brandName = domain.split('.')[0];
        }
      } catch (error) {
        console.warn('[Update Published] Failed to extract brand name:', error);
      }

      // 生成 URL slug
      const urlSlug = article.url_slug || (article.title || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .substring(0, 50);

      // 重新发布到新平台
      console.log('[Update Published] Republishing to Netlify...');
      const republishResult = await publishArticle(
        {
          id: articleId,
          title: article.title,
          content: article.content,
          keyword: article.keyword || '',
          metaDescription: article.meta_description,
          contentType,
          urlSlug,
          brandName,
        },
        article.project_name
      );

      if (!republishResult.success) {
        return sendErrorResponse(
          res,
          null,
          `Failed to republish article: ${republishResult.error}. Please check your platform tokens in Admin panel.`,
          500
        );
      }

      // 查询新创建的 site_id
      const newSiteResult = await sql`
        SELECT ps.id
        FROM platform_sites ps
        WHERE ps.repo_name = ${republishResult.repoName}
        LIMIT 1
      `;
      const newSiteId = newSiteResult.rows.length > 0 ? newSiteResult.rows[0].id : null;

      // 更新文章状态和 site_id
      await sql`
        UPDATE published_articles
        SET status = 'published',
            published_at = NOW(),
            updated_at = NOW(),
            site_id = ${newSiteId}
        WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
      `;

      return res.json({
        success: true,
        data: {
          message: `Article republished to ${republishResult.platform} successfully`,
          articleUrl: republishResult.articleUrl || republishResult.repoUrl,
          platform: republishResult.platform,
          siteName: republishResult.siteName,
          siteUrl: republishResult.siteUrl,
          repoUrl: republishResult.repoUrl,
          isNewSite: republishResult.isNewSite,
          updatedAt: new Date().toISOString(),
          wasRepublished: true,
          buildStatus: republishResult.siteUrl
            ? 'ready'
            : republishResult.warning?.includes('auto-detect') || republishResult.warning?.includes('auto-build')
              ? 'building'
              : 'unknown',
          warning: republishResult.warning,
          hasWarning: !!republishResult.warning
        }
      });
    }

    // 6. 生成 URL slug
    const urlSlug = article.url_slug || article.title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);

    // 7. 使用 PSEO Publisher 更新文章
    console.log('[Update Published] Attempting to update article on existing platform...');
    console.log('[Update Published] Article data:', {
      id: articleId,
      title: article.title,
      keyword: article.keyword,
      urlSlug: urlSlug,
      repoName: repoName,
      githubOwner: githubOwner
    });

    const updateResult = await updatePublishedArticle(
      {
        id: articleId,
        title: article.title || 'Untitled',
        content: article.content || '',
        keyword: article.keyword || urlSlug || 'untitled',
        metaDescription: article.meta_description,
        urlSlug,
      },
      repoName
    );

    // 检查是否需要强制重新发布（更新失败时）
    const needsRepublish = !updateResult.success && (
      updateResult.error?.includes('FORCE_REPUBLISH') ||
      updateResult.error?.includes('Platform rebuild failed') ||
      updateResult.error?.includes('No published site found') ||
      updateResult.error?.includes('Invalid platform detected') ||
      updateResult.error?.includes('unsupported platform') ||
      updateResult.error?.includes('Repository not found')
    );

    if (needsRepublish) {
      console.warn('[Update Published] ⚠️ Update failed, will republish to a new platform...');
      console.warn('[Update Published] Original error:', updateResult.error);

      // 导入 publishArticle 函数
      const { publishArticle } = await import('../_shared/services/pseo-publisher.js');

      // 从网站域名提取品牌名
      let brandName: string | undefined;
      try {
        const websiteResult = await sql`
          SELECT website_domain FROM user_websites
          WHERE id = ${actualProjectId} AND user_id = ${authResult.userId}
          LIMIT 1
        `;
        if (websiteResult.rows.length > 0) {
          const domain = websiteResult.rows[0].website_domain;
          brandName = domain.split('.')[0];
        }
      } catch (error) {
        console.warn('[Update Published] Failed to extract brand name:', error);
      }

      // 重新发布到新平台
      console.log('[Update Published] Republishing...');
      const republishResult = await publishArticle(
        {
          id: articleId,
          title: article.title,
          content: article.content,
          keyword: article.keyword || '',
          metaDescription: article.meta_description,
          contentType,
          urlSlug,
          brandName,
        },
        article.project_name
      );

      if (!republishResult.success) {
        return sendErrorResponse(
          res,
          null,
          `Failed to republish article: ${republishResult.error}. Please check your platform tokens in Admin panel.`,
          500
        );
      }

      // 使用返回的 platformSiteId
      const newSiteId = republishResult.platformSiteId || null;

      // 更新文章状态和 site_id
      await sql`
        UPDATE published_articles
        SET status = 'published',
            published_at = NOW(),
            updated_at = NOW(),
            site_id = ${newSiteId}
        WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
      `;

      return res.json({
        success: true,
        data: {
          message: `Article republished successfully (update failed, created new site)`,
          articleUrl: republishResult.articleUrl || republishResult.repoUrl,
          platform: republishResult.platform,
          siteName: republishResult.siteName,
          siteUrl: republishResult.siteUrl,
          repoUrl: republishResult.repoUrl,
          isNewSite: republishResult.isNewSite,
          updatedAt: new Date().toISOString(),
          wasRepublished: true,
          buildStatus: republishResult.siteUrl
            ? 'ready'
            : republishResult.warning?.includes('auto-detect') || republishResult.warning?.includes('auto-build')
              ? 'building'
              : 'unknown',
          warning: republishResult.warning,
          hasWarning: !!republishResult.warning
        }
      });
    }

    // 8. 更新成功，更新时间戳
    await sql`
      UPDATE published_articles
      SET updated_at = NOW()
      WHERE id = ${articleId} AND user_id::text = ${authResult.userId.toString()}
    `;

    return res.json({
      success: true,
      data: {
        message: 'Article updated successfully',
        articleUrl: updateResult.articleUrl || buildArticleUrl(updateResult.siteUrl || '', urlSlug),
        siteUrl: updateResult.siteUrl || '',
        repoUrl: updateResult.repoUrl || `https://github.com/${githubOwner}/${repoName}`,
        siteName: updateResult.siteName || repoName,
        updatedAt: new Date().toISOString(),
        buildStatus: updateResult.siteUrl
          ? 'ready'
          : updateResult.warning?.includes('auto-detect') || updateResult.warning?.includes('auto-build')
            ? 'building'
            : 'unknown',
        warning: updateResult.warning,
        hasWarning: !!updateResult.warning
      }
    });

  } catch (error: any) {
    console.error('[Update Published Article] Error:', error);
    console.error('[Update Published Article] Error message:', error?.message);
    console.error('[Update Published Article] Error stack:', error?.stack);
    console.error('[Update Published Article] Error name:', error?.name);
    return sendErrorResponse(res, error, 'Failed to update article', 500);
  }
}
