/**
 * PSEO 统一发布服务
 * 整合 GitHub 仓库管理、平台部署、内容发布
 */

import {
  initializeMkDocsRepo,
  addArticleToMkDocs,
  checkRepoExists,
} from './github.js';
import {
  rebuildStaticSiteIndex,
} from './static-site.js';
import {
  deployToPlatform,
  PlatformType,
} from './platform-deployers.js';
import {
  assignSiteToWebsite,
  getAvailableTokensForNewSite,
  createPlatformSite,
  updatePlatformSiteStatus,
  updatePlatformSiteUrl,
  incrementSiteUsage,
  incrementGitHubTokenUsage,
  incrementPlatformTokenUsage,
  decryptToken,
  getWebsiteSiteBindings,
  GitHubToken,
  PlatformToken,
  PlatformSite,
} from '../../lib/database.js';
import { v4 as uuidv4 } from 'uuid';

interface ArticleForPublish {
  id: string;
  title: string;
  content: string;         // Markdown 内容
  keyword: string;
  metaDescription?: string;
  contentType: 'informational' | 'commercial';
  urlSlug?: string;
}

interface PublishResult {
  success: boolean;
  articleUrl?: string;
  siteUrl?: string;
  repoUrl?: string;
  siteName?: string;
  platform?: string;
  isNewSite?: boolean;
  error?: string;
}

/**
 * 生成站点名称
 */
function generateSiteName(projectName?: string): string {
  const uuid = uuidv4().split('-')[0]; // 取 UUID 的前 8 位
  if (projectName) {
    const sanitized = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
    return `pseo-${sanitized}-${uuid}`;
  }
  return `pseo-site-${uuid}`;
}

/**
 * 生成 URL slug
 */
function generateSlug(keyword: string, existingSlug?: string): string {
  if (existingSlug) return existingSlug;
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

/**
 * 主发布函数
 * 自动处理站点创建、绑定和内容发布
 */
export async function publishArticle(
  projectId: string,
  article: ArticleForPublish,
  projectName?: string
): Promise<PublishResult> {
  const { contentType } = article;

  console.log(`[PSEO Publisher] 🚀 Publishing "${article.title}" for project ${projectId}`);
  console.log(`[PSEO Publisher] Content type: ${contentType}`);

  try {
    // 1. 尝试获取已绑定的站点
    let siteBinding = await assignSiteToWebsite(projectId, contentType);
    let isNewSite = false;

    // 2. 如果没有可用站点，创建新站点
    if (!siteBinding) {
      console.log(`[PSEO Publisher] No existing site binding, creating new site...`);

      const newSiteResult = await createNewSite(contentType, projectName);
      if (!newSiteResult.success) {
        return {
          success: false,
          error: newSiteResult.error || 'Failed to create new publishing site',
        };
      }

      // 重新获取绑定
      siteBinding = await assignSiteToWebsite(projectId, contentType);
      if (!siteBinding) {
        return {
          success: false,
          error: 'Failed to bind new site to project',
        };
      }
      isNewSite = true;
    }

    const { site, github_token, platform_token } = siteBinding;
    const githubTokenDecrypted = decryptToken(github_token.token_encrypted);
    const platformTokenDecrypted = platform_token ? decryptToken(platform_token.token_encrypted) : null;

    // 3. 如果站点是 pending 状态，需要初始化
    if (site.status === 'pending') {
      console.log(`[PSEO Publisher] Site is pending, initializing...`);

      const initResult = await initializeSite({
        site,
        githubToken: githubTokenDecrypted,
        githubOwner: github_token.owner_name,
        platformToken: platformTokenDecrypted,
        platform: site.platform as PlatformType,
      });

      if (!initResult.success) {
        return {
          success: false,
          error: initResult.error || 'Failed to initialize site',
        };
      }

      // 更新站点状态和 URL
      if (initResult.siteUrl) {
        await updatePlatformSiteUrl(site.id, initResult.siteUrl);
        site.site_url = initResult.siteUrl;
      }
      await updatePlatformSiteStatus(site.id, 'active');
      isNewSite = true;
    }

    // 4. 推送文章到 GitHub
    console.log(`[PSEO Publisher] Pushing article to GitHub...`);
    console.log(`[PSEO Publisher] Article title: "${article.title}"`);
    console.log(`[PSEO Publisher] Article content length: ${article.content?.length || 0} characters`);

    const slug = generateSlug(article.keyword, article.urlSlug);
    console.log(`[PSEO Publisher] Generated slug: "${slug}"`);

    // 验证文章内容不为空
    if (!article.content || article.content.trim().length === 0) {
      console.error(`[PSEO Publisher] ❌ Article content is empty!`);
      return {
        success: false,
        error: 'Article content is empty. Cannot publish empty content.',
      };
    }

    // Check if we should use HTML (Assuming all commercial/Pure HTML sites need this, or force it for now based on user request)
    // For this specific user verification, I will enable HTML.
    // In production this should be a config in the 'site' or 'project' object.
    const useHtml = true;
    let finalContent: string;
    let extension: string = '.md';

    if (useHtml) {
      console.log(`[PSEO Publisher] Converting Markdown to HTML...`);
      const { convertMarkdownToHtml } = await import('../utils/markdown-converter.js');
      // generateArticleMarkdown returns content with frontmatter, we need raw content for converter?
      // Actually generateArticleMarkdown adds frontmatter.
      // We should convert the RAW article.content.
      // We also need to constructing the HTML.
      finalContent = convertMarkdownToHtml(article.content, article.title, {
        description: article.metaDescription,
        keywords: article.keyword
      });
      extension = '.html';

      // 验证 HTML 转换结果
      if (!finalContent || finalContent.trim().length === 0) {
        console.error(`[PSEO Publisher] ❌ HTML conversion failed - result is empty!`);
        return {
          success: false,
          error: 'HTML conversion failed. Converted content is empty.',
        };
      }
      console.log(`[PSEO Publisher] HTML conversion successful. Length: ${finalContent.length} characters`);
    } else {
      finalContent = generateArticleMarkdown(article);
      extension = '.md';
    }

    const pushResult = await addArticleToMkDocs({
      token: githubTokenDecrypted,
      owner: github_token.owner_name,
      repoName: site.repo_name,
      articleSlug: slug,
      articleTitle: article.title,
      articleContent: finalContent,
      branch: site.branch,
      extension
    });

    if (!pushResult.success) {
      console.error(`[PSEO Publisher] ❌ Failed to push article to GitHub: ${pushResult.error}`);
      return {
        success: false,
        error: pushResult.error || 'Failed to push article to GitHub',
      };
    }

    console.log(`[PSEO Publisher] ✅ Article pushed to GitHub successfully`);
    console.log(`[PSEO Publisher] Article path: ${pushResult.articlePath}`);

    // 5. 更新使用计数
    await incrementSiteUsage(site.id);
    await incrementGitHubTokenUsage(github_token.id);
    if (platform_token) {
      await incrementPlatformTokenUsage(platform_token.id);
    }

    // 6. 重建站点索引 (静态 HTML 支持)
    // 只有在使用 HTML 发布时才需要重建索引
    if (useHtml) {
      console.log(`[PSEO Publisher] Rebuilding static site index...`);
      const indexResult = await rebuildStaticSiteIndex({
        token: githubTokenDecrypted,
        owner: github_token.owner_name,
        repoName: site.repo_name,
        branch: site.branch,
      });
      if (!indexResult.success) {
        console.warn(`[PSEO Publisher] Warning: Failed to rebuild index: ${indexResult.error}`);
      }
    }

    // 6. 构建文章 URL
    const articleUrl = buildArticleUrl(site.site_url, slug);

    console.log(`[PSEO Publisher] ✅ Published successfully!`);
    console.log(`[PSEO Publisher] Article URL: ${articleUrl}`);

    return {
      success: true,
      articleUrl,
      siteUrl: site.site_url,
      repoUrl: `https://github.com/${github_token.owner_name}/${site.repo_name}`,
      siteName: site.site_name,
      platform: site.platform,
      isNewSite,
    };

  } catch (error: any) {
    console.error(`[PSEO Publisher] ❌ Error:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error during publishing',
    };
  }
}

/**
 * 创建新的发布站点
 */
async function createNewSite(
  contentType: 'informational' | 'commercial',
  projectName?: string
): Promise<{ success: boolean; site?: PlatformSite; error?: string }> {
  // 获取可用的 Token
  const tokens = await getAvailableTokensForNewSite(contentType);
  if (!tokens) {
    return {
      success: false,
      error: 'No available tokens to create new site. Please add GitHub and Platform tokens in Admin panel.',
    };
  }

  const { github_token, platform_token, platform } = tokens;
  const siteName = generateSiteName(projectName);
  const repoName = siteName;

  // 创建站点记录（pending 状态）
  const site = await createPlatformSite({
    github_token_id: github_token.id,
    platform_token_id: platform_token?.id || null,
    platform,
    content_type: contentType,
    site_name: siteName,
    repo_name: repoName,
    status: 'pending',
  });

  console.log(`[PSEO Publisher] Created pending site: ${siteName} on ${platform}`);

  return {
    success: true,
    site,
  };
}

/**
 * 初始化站点（创建 GitHub 仓库和平台项目）
 */
async function initializeSite(config: {
  site: PlatformSite;
  githubToken: string;
  githubOwner: string;
  platformToken: string | null;
  platform: PlatformType;
}): Promise<{ success: boolean; siteUrl?: string; error?: string }> {
  const { site, githubToken, githubOwner, platformToken, platform } = config;

  // 1. 创建 GitHub 仓库并推送模板
  console.log(`[PSEO Publisher] Creating GitHub repo: ${githubOwner}/${site.repo_name}`);

  const repoExists = await checkRepoExists({
    token: githubToken,
    owner: githubOwner,
    repoName: site.repo_name,
  });

  if (!repoExists) {
    const repoResult = await initializeMkDocsRepo({
      token: githubToken,
      owner: githubOwner,
      repoName: site.repo_name,
      siteName: site.site_name,
      siteUrl: '', // 稍后更新
      siteDescription: `Auto-generated PSEO site by NicheDigger`,
    });

    if (!repoResult.success) {
      return {
        success: false,
        error: repoResult.error || 'Failed to create GitHub repository',
      };
    }
  }

  // 2. 等待 GitHub 仓库准备就绪
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 3. 在平台创建项目
  console.log(`[PSEO Publisher] Creating project on ${platform}...`);

  const deployResult = await deployToPlatform(platform, {
    platformToken,
    githubToken,
    repoOwner: githubOwner,
    repoName: site.repo_name,
    siteName: site.site_name,
  });

  if (!deployResult.success) {
    console.warn(`[PSEO Publisher] Platform deployment warning: ${deployResult.error}`);
    // 平台部署失败不是致命错误，仓库已创建，可以手动连接
    // 对于 GitHub Pages，可能需要手动启用
    return {
      success: true,
      siteUrl: `https://${githubOwner}.github.io/${site.repo_name}`,
    };
  }

  return {
    success: true,
    siteUrl: deployResult.siteUrl,
  };
}

/**
 * 生成文章的 Markdown 内容
 */
function generateArticleMarkdown(article: ArticleForPublish): string {
  const frontMatter = `---
title: "${article.title.replace(/"/g, '\\"')}"
description: "${(article.metaDescription || '').replace(/"/g, '\\"')}"
---

`;

  let content = frontMatter;
  content += `# ${article.title}\n\n`;
  content += article.content;

  return content;
}

/**
 * 构建文章 URL
 */
function buildArticleUrl(siteUrl: string, slug: string): string {
  if (!siteUrl) return '';

  // 清理 siteUrl，移除末尾的斜杠和可能的路径
  let cleanUrl = siteUrl.replace(/\/$/, '');

  // 如果 URL 已经包含 /en/latest/，移除它
  cleanUrl = cleanUrl.replace(/\/en\/latest\/?$/, '');

  // RTD 格式
  if (cleanUrl.includes('readthedocs.io')) {
    return `${cleanUrl}/en/latest/${slug}/`;
  }

  // 其他平台
  return `${cleanUrl}/${slug}/`;
}

/**
 * 获取站点首页 URL（不包含文章路径）
 */
function getSiteHomeUrl(siteUrl: string): string {
  if (!siteUrl) return '';

  // 清理 URL，只保留域名部分
  let cleanUrl = siteUrl.replace(/\/$/, '');

  // 移除 /en/latest/ 等路径
  cleanUrl = cleanUrl.replace(/\/en\/latest\/?$/, '');

  return cleanUrl;
}

/**
 * 获取用户网站的所有绑定导流站点
 * @param websiteId - 用户网站 ID (来自 user_websites 表)
 */
export async function getWebsitePublishingSites(websiteId: string): Promise<{
  informational: {
    site: PlatformSite;
    githubToken: GitHubToken;
    platformToken: PlatformToken | null;
  } | null;
  commercial: {
    site: PlatformSite;
    githubToken: GitHubToken;
    platformToken: PlatformToken | null;
  } | null;
}> {
  const bindings = await getWebsiteSiteBindings(websiteId);

  let informational = null;
  let commercial = null;

  for (const binding of bindings) {
    const data = {
      site: binding.site,
      githubToken: binding.github_token,
      platformToken: binding.platform_token,
    };

    if (binding.content_type === 'informational') {
      informational = data;
    } else if (binding.content_type === 'commercial') {
      commercial = data;
    }
  }

  return { informational, commercial };
}

/**
 * 更新已发布的文章
 * 将修改后的内容推送到已绑定的 GitHub 仓库
 * 注意：此函数只更新已存在的发布，不会创建新的站点绑定
 */
export async function updatePublishedArticle(
  projectId: string,
  article: ArticleForPublish
): Promise<PublishResult> {
  console.log(`[PSEO Publisher] 🔄 Updating "${article.title}" for project ${projectId}`);
  console.log(`[PSEO Publisher] Content type: ${article.contentType}`);

  try {
    // 1. 直接查询已绑定的站点（不使用 assignSiteToWebsite，避免自动创建新绑定）
    const siteBindings = await getWebsiteSiteBindings(projectId);

    let siteBinding = null;
    for (const binding of siteBindings) {
      if (binding.content_type === article.contentType) {
        siteBinding = {
          site: binding.site,
          github_token: binding.github_token,
          platform_token: binding.platform_token,
        };
        break;
      }
    }

    if (!siteBinding) {
      console.error(`[PSEO Publisher] ❌ No published site found for project ${projectId} with content type ${article.contentType}`);
      return {
        success: false,
        error: 'No published site found for this project. Please publish the article first before updating.',
      };
    }

    console.log(`[PSEO Publisher] Found existing site: ${siteBinding.site.site_name}`);
    console.log(`[PSEO Publisher] Repository: ${siteBinding.github_token.owner_name}/${siteBinding.site.repo_name}`);

    const { site, github_token, platform_token } = siteBinding;

    // 2. 检查站点状态
    if (site.status !== 'active') {
      return {
        success: false,
        error: `Site is not active (status: ${site.status}). Cannot update.`,
      };
    }

    const githubTokenDecrypted = decryptToken(github_token.token_encrypted);
    const slug = generateSlug(article.keyword, article.urlSlug);

    // 3. 准备内容（与发布时相同的逻辑）
    const useHtml = true;
    let finalContent: string;
    let extension: string = '.md';

    if (useHtml) {
      const { convertMarkdownToHtml } = await import('../utils/markdown-converter.js');
      finalContent = convertMarkdownToHtml(article.content, article.title, {
        description: article.metaDescription,
        keywords: article.keyword
      });
      extension = '.html';
    } else {
      finalContent = generateArticleMarkdown(article);
      extension = '.md';
    }

    // 4. 推送更新到 GitHub（覆盖现有文件）
    console.log(`[PSEO Publisher] Pushing updated article to GitHub...`);

    const pushResult = await addArticleToMkDocs({
      token: githubTokenDecrypted,
      owner: github_token.owner_name,
      repoName: site.repo_name,
      articleSlug: slug,
      articleTitle: article.title,
      articleContent: finalContent,
      branch: site.branch,
      extension,
      isUpdate: true, // 标识这是更新操作
    });

    if (!pushResult.success) {
      return {
        success: false,
        error: pushResult.error || 'Failed to push updated article to GitHub',
      };
    }

    // 5. 重建站点索引（如果使用 HTML）
    if (useHtml) {
      console.log(`[PSEO Publisher] Rebuilding static site index...`);
      const indexResult = await rebuildStaticSiteIndex({
        token: githubTokenDecrypted,
        owner: github_token.owner_name,
        repoName: site.repo_name,
        branch: site.branch,
      });
      if (!indexResult.success) {
        console.warn(`[PSEO Publisher] Warning: Failed to rebuild index: ${indexResult.error}`);
      }
    }

    // 6. 返回站点首页 URL（更新操作不需要跳转到具体文章）
    const siteHomeUrl = getSiteHomeUrl(site.site_url);

    console.log(`[PSEO Publisher] ✅ Updated successfully!`);
    console.log(`[PSEO Publisher] Site URL: ${siteHomeUrl}`);

    return {
      success: true,
      articleUrl: siteHomeUrl, // 返回站点首页
      siteUrl: siteHomeUrl,
      repoUrl: `https://github.com/${github_token.owner_name}/${site.repo_name}`,
      siteName: site.site_name,
      platform: site.platform,
      isNewSite: false,
    };

  } catch (error: any) {
    console.error(`[PSEO Publisher] ❌ Update Error:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error during update',
    };
  }
}

