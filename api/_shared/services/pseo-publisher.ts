/**
 * PSEO 统一发布服务（简化版）
 * 
 * 核心改进：
 * 1. 只支持 Netlify 平台
 * 2. GitHub Token 和 Netlify Token 1对1 绑定
 * 3. 移除内容类型分类
 */

import {
  initializeMkDocsRepo,
  addArticleToMkDocs,
  checkRepoExists,
} from './github.js';
import {
  deployToNetlify,
  triggerNetlifyBuild,
} from './netlify-deployer.js';
import {
  getAvailableTokenPair,
  decryptToken,
  incrementTokenUsage,
} from '../../lib/token-manager.js';
import { v4 as uuidv4 } from 'uuid';

interface ArticleForPublish {
  id: string;
  title: string;
  content: string;
  keyword: string;
  metaDescription?: string;
  urlSlug?: string;
  brandName?: string;
}

interface PublishResult {
  success: boolean;
  articleUrl?: string;
  siteUrl?: string;
  repoUrl?: string;
  siteName?: string;
  isNewSite?: boolean;
  error?: string;
}

function generateSiteName(brandName?: string, keyword?: string): string {
  if (brandName && keyword) {
    const sanitizedBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
    const sanitizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
    return `${sanitizedBrand}-${sanitizedKeyword}`;
  }

  const uuid = uuidv4().split('-')[0];
  return `pseo-site-${uuid}`;
}

function generateSlug(keyword: string, existingSlug?: string): string {
  if (existingSlug) return existingSlug;
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

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

function buildArticleUrl(siteUrl: string, slug: string): string {
  if (!siteUrl) return '';
  const cleanUrl = siteUrl.replace(/\/$/, '');
  return `${cleanUrl}/${slug}/`;
}

/**
 * 主发布函数
 */
export async function publishArticle(
  article: ArticleForPublish,
  projectName?: string
): Promise<PublishResult> {
  console.log(`[PSEO Publisher] 🚀 Publishing "${article.title}"`);

  try {
    const tokenPair = await getAvailableTokenPair();
    
    if (!tokenPair) {
      return {
        success: false,
        error: 'No available token pair found. Please bind GitHub Token with Netlify Token in Admin panel.',
      };
    }

    const { github_token, netlify_token } = tokenPair;
    const githubTokenDecrypted = decryptToken(github_token.token_encrypted);
    const netlifyTokenDecrypted = decryptToken(netlify_token.token_encrypted);

    console.log(`[PSEO Publisher] Using token pair:`);
    console.log(`[PSEO Publisher]   - GitHub: ${github_token.name} (${github_token.owner_name})`);
    console.log(`[PSEO Publisher]   - Netlify: ${netlify_token.name}`);

    const siteName = generateSiteName(article.brandName, article.keyword);
    const repoName = siteName;

    console.log(`[PSEO Publisher] Site name: ${siteName}`);

    const repoExists = await checkRepoExists({
      token: githubTokenDecrypted,
      owner: github_token.owner_name,
      repoName: repoName,
    });

    let isNewSite = false;

    if (!repoExists) {
      console.log(`[PSEO Publisher] Creating new GitHub repo...`);
      
      const repoResult = await initializeMkDocsRepo({
        token: githubTokenDecrypted,
        owner: github_token.owner_name,
        repoName: repoName,
        siteName: siteName,
        siteUrl: '',
        siteDescription: `Auto-generated PSEO site by NicheDigger`,
      });

      if (!repoResult.success) {
        return {
          success: false,
          error: repoResult.error || 'Failed to create GitHub repository',
        };
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      isNewSite = true;
    }

    console.log(`[PSEO Publisher] Pushing article to GitHub...`);
    
    const slug = generateSlug(article.keyword, article.urlSlug);
    const finalContent = generateArticleMarkdown(article);

    if (!finalContent || finalContent.trim().length === 0) {
      return {
        success: false,
        error: 'Markdown generation failed. Content is empty.',
      };
    }

    const pushResult = await addArticleToMkDocs({
      token: githubTokenDecrypted,
      owner: github_token.owner_name,
      repoName: repoName,
      articleSlug: slug,
      articleTitle: article.title,
      articleContent: finalContent,
      branch: 'main',
      extension: '.md'
    });

    if (!pushResult.success) {
      console.error(`[PSEO Publisher] ❌ Failed to push article: ${pushResult.error}`);
      return {
        success: false,
        error: pushResult.error || 'Failed to push article to GitHub',
      };
    }

    console.log(`[PSEO Publisher] ✅ Article pushed to GitHub`);

    let siteUrl = '';
    let netlifySiteId = '';

    if (isNewSite) {
      console.log(`[PSEO Publisher] Deploying to Netlify...`);

      const deployResult = await deployToNetlify({
        token: netlifyTokenDecrypted,
        repoOwner: github_token.owner_name,
        repoName: repoName,
        siteName: siteName,
      });

      if (!deployResult.success) {
        console.error(`[PSEO Publisher] ❌ Netlify deployment failed: ${deployResult.error}`);
        return {
          success: false,
          error: `Failed to deploy to Netlify: ${deployResult.error}`,
        };
      }

      siteUrl = deployResult.siteUrl || '';
      netlifySiteId = deployResult.projectId || '';
      
      console.log(`[PSEO Publisher] ✅ Deployed to Netlify: ${siteUrl}`);
    } else {
      console.log(`[PSEO Publisher] Triggering Netlify rebuild...`);

      const rebuildResult = await triggerNetlifyBuild({
        token: netlifyTokenDecrypted,
        siteId: netlifySiteId,
      });

      if (!rebuildResult.success) {
        console.error(`[PSEO Publisher] ❌ Netlify rebuild failed: ${rebuildResult.error}`);
        return {
          success: false,
          error: `Failed to trigger Netlify rebuild: ${rebuildResult.error}`,
        };
      }

      console.log(`[PSEO Publisher] ✅ Netlify rebuild triggered`);
    }

    await incrementTokenUsage(github_token.id, netlify_token.id);

    const articleUrl = buildArticleUrl(siteUrl, slug);

    console.log(`[PSEO Publisher] ✅ Published successfully!`);
    console.log(`[PSEO Publisher] Article URL: ${articleUrl}`);

    return {
      success: true,
      articleUrl,
      siteUrl,
      repoUrl: `https://github.com/${github_token.owner_name}/${repoName}`,
      siteName,
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
 * 更新已发布的文章
 */
export async function updatePublishedArticle(
  article: ArticleForPublish,
  repoName: string,
  netlifySiteId: string
): Promise<PublishResult> {
  console.log(`[PSEO Publisher] 🔄 Updating "${article.title}"`);

  try {
    const tokenPair = await getAvailableTokenPair();
    
    if (!tokenPair) {
      return {
        success: false,
        error: 'FORCE_REPUBLISH: No available token pair found. Please republish the article.',
      };
    }

    const { github_token, netlify_token } = tokenPair;
    const githubTokenDecrypted = decryptToken(github_token.token_encrypted);
    const netlifyTokenDecrypted = decryptToken(netlify_token.token_encrypted);

    const slug = generateSlug(article.keyword, article.urlSlug);
    const finalContent = generateArticleMarkdown(article);

    const pushResult = await addArticleToMkDocs({
      token: githubTokenDecrypted,
      owner: github_token.owner_name,
      repoName: repoName,
      articleSlug: slug,
      articleTitle: article.title,
      articleContent: finalContent,
      branch: 'main',
      extension: '.md',
      isUpdate: true,
    });

    if (!pushResult.success) {
      return {
        success: false,
        error: pushResult.error || 'Failed to push updated article to GitHub',
      };
    }

    const rebuildResult = await triggerNetlifyBuild({
      token: netlifyTokenDecrypted,
      siteId: netlifySiteId,
    });

    if (!rebuildResult.success) {
      return {
        success: false,
        error: `Failed to trigger Netlify rebuild: ${rebuildResult.error}`,
      };
    }

    console.log(`[PSEO Publisher] ✅ Updated successfully!`);

    return {
      success: true,
      articleUrl: '',
      siteUrl: '',
      repoUrl: `https://github.com/${github_token.owner_name}/${repoName}`,
      siteName: repoName,
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

