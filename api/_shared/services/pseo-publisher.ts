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
  fetchWithRetry,
} from './netlify-deployer.js';
import {
  getAvailableTokenPair,
  decryptToken,
  incrementTokenUsage,
} from '../../lib/token-manager.js';
import { sql } from '../../lib/database.js';
import { v4 as uuidv4 } from 'uuid';

interface ArticleForPublish {
  id: string;
  title: string;
  content: string;
  keyword: string;
  metaDescription?: string;
  urlSlug?: string;
  brandName?: string;
  contentType?: 'informational' | 'commercial';
}

interface PublishResult {
  success: boolean;
  articleUrl?: string;
  siteUrl?: string;
  repoUrl?: string;
  repoName?: string;
  siteName?: string;
  platform?: string;
  platformSiteId?: string;
  netlifySiteId?: string; // Netlify site ID，用于触发构建
  isNewSite?: boolean;
  error?: string;
  warning?: string;
}

function generateSiteName(brandName?: string, keyword?: string): string {
  if (brandName && keyword) {
    const sanitizedBrand = brandName.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30);
    const sanitizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
    return `${sanitizedBrand}-${sanitizedKeyword}`;
  }

  const uuid = uuidv4().split('-')[0];
  return `pseo-site-${uuid}`;
}

function generateSlug(keyword: string, existingSlug?: string): string {
  if (existingSlug) return existingSlug;
  if (!keyword) return 'untitled';
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

function generateArticleMarkdown(article: ArticleForPublish): string {
  const title = article.title || 'Untitled';
  const description = (article.metaDescription || '').replace(/"/g, '\\"');

  const frontMatter = `---
title: "${title.replace(/"/g, '\\"')}"
description: "${description}"
---

`;

  let content = frontMatter;
  content += `# ${title}\n\n`;
  content += article.content || '';

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

    let githubError = '';
    if (!pushResult.success) {
      console.error(`[PSEO Publisher] ❌ Failed to push article: ${pushResult.error}`);
      githubError = pushResult.error || 'Failed to push article to GitHub';
      // 不要直接返回，继续尝试 Netlify 构建，这样用户至少可以看到站点状态
    } else {
      console.log(`[PSEO Publisher] ✅ Article pushed to GitHub`);
    }

    let siteUrl = '';
    let platformSiteId = '';
    let netlifyWarning = '';
    let netlifySiteId = ''; // Netlify 返回的 site ID，仅用于日志记录（不存储到数据库）

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
      console.log(`[PSEO Publisher] Netlify Site ID: ${netlifySiteId}`);

      // 创建或更新 platform_sites 记录（不保存 netlify_site_id）
      let platformSiteId = '';
      try {
        const siteInsertResult = await sql`
          INSERT INTO platform_sites (
            github_token_id,
            platform_token_id,
            platform,
            content_type,
            site_name,
            site_url,
            repo_name,
            status,
            usage_count
          )
          VALUES (
            ${github_token.id},
            ${netlify_token.id},
            'netlify',
            'informational',
            ${siteName},
            ${siteUrl},
            ${repoName},
            'active',
            1
          )
          ON CONFLICT (github_token_id, repo_name)
          DO UPDATE SET
            site_url = ${siteUrl},
            status = 'active',
            updated_at = NOW()
          RETURNING id
        `;

        if (siteInsertResult.rows.length > 0) {
          platformSiteId = siteInsertResult.rows[0].id;
          console.log(`[PSEO Publisher] ✅ Platform site ID: ${platformSiteId}`);
        }
      } catch (dbError: any) {
        // 如果唯一索引不存在，回退到先查询再决定插入或更新
        console.warn(`[PSEO Publisher] ⚠️ ON CONFLICT failed: ${dbError.message}`);
        console.log(`[PSEO Publisher] Trying fallback method...`);

        // 先尝试查询现有记录
        const existingSite = await sql`
          SELECT id FROM platform_sites
          WHERE github_token_id = ${github_token.id}
          AND repo_name = ${repoName}
          LIMIT 1
        `;

        if (existingSite.rows.length > 0) {
          // 记录存在，更新
          platformSiteId = existingSite.rows[0].id;
          await sql`
            UPDATE platform_sites
            SET site_url = ${siteUrl},
                status = 'active',
                updated_at = NOW()
            WHERE id = ${platformSiteId}
          `;
          console.log(`[PSEO Publisher] ✅ Updated existing platform site: ${platformSiteId}`);
        } else {
          // 记录不存在，插入
          const insertResult = await sql`
            INSERT INTO platform_sites (
              github_token_id,
              platform_token_id,
              platform,
              content_type,
              site_name,
              site_url,
              repo_name,
              status,
              usage_count
            )
            VALUES (
              ${github_token.id},
              ${netlify_token.id},
              'netlify',
              'informational',
              ${siteName},
              ${siteUrl},
              ${repoName},
              'active',
              1
            )
            RETURNING id
          `;
          if (insertResult.rows.length > 0) {
            platformSiteId = insertResult.rows[0].id;
            console.log(`[PSEO Publisher] ✅ Created new platform site: ${platformSiteId}`);
          }
        }
      }

      // 注意：刚创建的 Netlify site 还没有连接 GitHub repo
      // Netlify 会自动检测到 repo 并开始构建（通常需要 1-5 分钟）
      console.log(`[PSEO Publisher] ℹ️ Netlify will auto-detect the GitHub repo and start building within a few minutes`);
      console.log(`[PSEO Publisher] ℹ️ Site URL: ${siteUrl}`);

      // 设置提示信息：site 会在几分钟后自动构建
      netlifyWarning = 'Netlify site created. Auto-build will start once Netlify detects the GitHub repo (usually 1-5 minutes).';
    } else {
      console.log(`[PSEO Publisher] Querying existing platform_site...`);

      // 查询现有的 platform_sites 记录（包括 site_url）
      const siteQueryResult = await sql`
        SELECT id, site_url
        FROM platform_sites
        WHERE github_token_id = ${github_token.id}
        AND repo_name = ${repoName}
        AND platform = 'netlify'
        LIMIT 1
      `;

      if (siteQueryResult.rows.length > 0) {
        platformSiteId = siteQueryResult.rows[0].id;
        siteUrl = siteQueryResult.rows[0].site_url || '';
        console.log(`[PSEO Publisher] Found existing platform_site: ${platformSiteId}`);
        console.log(`[PSEO Publisher] Site URL: ${siteUrl}`);
      }

      // 触发 Netlify 重新构建
      try {
        console.log(`[PSEO Publisher] Triggering Netlify rebuild for existing site: ${siteName}`);
        console.log(`[PSEO Publisher] Querying Netlify API for site: ${siteName}`);

        // 通过 Netlify API 查询 site（使用 ?name= 参数）
        const checkResponse = await fetchWithRetry(
          `https://api.netlify.com/api/v1/sites?name=${encodeURIComponent(siteName)}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${netlifyTokenDecrypted}`,
              'Content-Type': 'application/json',
            },
          },
          3, // 最多重试 3 次
          30000 // 30 秒超时
        );

        console.log(`[PSEO Publisher] Netlify API response status: ${checkResponse.status}`);

        let actualNetlifySiteId = '';

        if (checkResponse.ok) {
          const sitesData = await checkResponse.json();
          console.log(`[PSEO Publisher] Netlify API returned ${sitesData.length} sites`);

          if (Array.isArray(sitesData) && sitesData.length > 0) {
            const existingSite = sitesData.find((s: any) => s.name === siteName);
            if (existingSite) {
              actualNetlifySiteId = existingSite.id;
              console.log(`[PSEO Publisher] ✅ Found Netlify site: ${actualNetlifySiteId}`);
              console.log(`[PSEO Publisher] Site state: ${existingSite.state}`);

              // 从 Netlify API 获取真实的 site_url
              if (existingSite.url && !siteUrl) {
                siteUrl = existingSite.url;
                console.log(`[PSEO Publisher] ✅ Updated site URL from Netlify API: ${siteUrl}`);

                // 更新数据库中的 site_url
                await sql`
                  UPDATE platform_sites
                  SET site_url = ${siteUrl}, updated_at = NOW()
                  WHERE id = ${platformSiteId}
                `;
                console.log(`[PSEO Publisher] ✅ Updated site_url in database`);
              }

              // 检查 GitHub repo 是否已链接
              const hasLinkedRepo = existingSite.build_settings?.repo;

              if (hasLinkedRepo) {
                // 场景3: Netlify site 存在且 GitHub repo 已链接 → 触发重新构建
                console.log(`[PSEO Publisher] ✅ GitHub repo is linked: ${hasLinkedRepo}`);
                console.log(`[PSEO Publisher] Triggering rebuild...`);

                const rebuildResult = await triggerNetlifyBuild({
                  token: netlifyTokenDecrypted,
                  siteId: actualNetlifySiteId,
                });

                if (rebuildResult.success) {
                  console.log(`[PSEO Publisher] ✅ Netlify rebuild triggered successfully`);
                } else {
                  netlifyWarning = `Netlify build trigger failed: ${rebuildResult.error}`;
                  console.warn(`[PSEO Publisher] ⚠️ Warning: ${netlifyWarning}`);
                }
              } else {
                // 场景2: Netlify site 存在但 GitHub repo 未链接 → 等待自动检测
                console.log(`[PSEO Publisher] ⚠️ GitHub repo not linked yet`);
                console.log(`[PSEO Publisher] ℹ️ Netlify will auto-detect the GitHub repo and start building within a few minutes`);
                netlifyWarning = 'Netlify site exists but GitHub repo not linked yet. Auto-build will start once Netlify detects the repo (usually 1-5 minutes).';
              }
            }
          }
        } else {
          console.error(`[PSEO Publisher] ❌ Netlify API error: ${checkResponse.status} ${checkResponse.statusText}`);
          const errorText = await checkResponse.text().catch(() => 'Unknown error');
          console.error(`[PSEO Publisher] Error details: ${errorText}`);
          netlifyWarning = `Netlify API error: ${checkResponse.status}`;
        }

        // 场景1: 如果找不到 Netlify site
        if (!actualNetlifySiteId) {
          netlifyWarning = `Netlify site "${siteName}" not found in API. The site may need to be recreated.`;
          console.warn(`[PSEO Publisher] ⚠️ Warning: ${netlifyWarning}`);
        }
      } catch (error: any) {
        console.error(`[PSEO Publisher] ❌ Exception during Netlify rebuild:`, error.message);
        console.error(`[PSEO Publisher] Stack:`, error.stack);
        netlifyWarning = `Netlify build trigger failed: ${error.message}`;
      }
    }

    await incrementTokenUsage(github_token.id, netlify_token.id);

    const articleUrl = buildArticleUrl(siteUrl, slug);

    // 合并所有警告信息
    const allWarnings = [];
    if (githubError) {
      allWarnings.push(`GitHub: ${githubError}`);
    }
    if (netlifyWarning) {
      allWarnings.push(`Netlify: ${netlifyWarning}`);
    }
    const combinedWarning = allWarnings.length > 0 ? allWarnings.join('; ') : undefined;

    console.log(`[PSEO Publisher] ✅ Process completed!`);
    console.log(`[PSEO Publisher] Article URL: ${articleUrl}`);
    if (combinedWarning) {
      console.log(`[PSEO Publisher] ⚠️ Warning: ${combinedWarning}`);
    }

    return {
      success: true,
      articleUrl,
      siteUrl,
      repoUrl: `https://github.com/${github_token.owner_name}/${repoName}`,
      repoName,
      siteName,
      platform: 'netlify',
      platformSiteId,
      netlifySiteId,
      isNewSite,
      warning: combinedWarning,
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
  repoName: string
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

    // 检查仓库是否存在
    const repoExists = await checkRepoExists({
      token: githubTokenDecrypted,
      owner: github_token.owner_name,
      repoName: repoName,
    });

    if (!repoExists) {
      console.log(`[PSEO Publisher] ⚠️ Repository does not exist, cannot update`);
      return {
        success: false,
        error: 'FORCE_REPUBLISH: Repository not found. Please publish the article first to create the repository.',
      };
    }

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

    console.log(`[PSEO Publisher] ✅ Article updated on GitHub`);

    // 尝试触发 Netlify 重新构建（不依赖数据库，直接通过 API 查询/创建）
    let rebuildWarning = '';

    try {
      console.log(`[PSEO Publisher] Checking Netlify site by repo name: ${repoName}`);

      const siteName = repoName;
      let actualNetlifySiteId = '';

      // 通过 Netlify API 查询 site 是否存在（使用 ?name= 参数）
      const checkResponse = await fetchWithRetry(
        `https://api.netlify.com/api/v1/sites?name=${encodeURIComponent(siteName)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${netlifyTokenDecrypted}`,
            'Content-Type': 'application/json',
          },
        },
        3, // 最多重试 3 次
        30000 // 30 秒超时
      );

      if (checkResponse.ok) {
        const sitesData = await checkResponse.json();
        if (Array.isArray(sitesData) && sitesData.length > 0) {
          const existingSite = sitesData.find((s: any) => s.name === siteName);
          if (existingSite) {
            actualNetlifySiteId = existingSite.id;
            console.log(`[PSEO Publisher] ✅ Found Netlify site: ${actualNetlifySiteId}`);
            console.log(`[PSEO Publisher] Site state: ${existingSite.state}`);

            // 检查 GitHub repo 是否已链接
            const hasLinkedRepo = existingSite.build_settings?.repo;

            if (hasLinkedRepo) {
              // 场景3: Netlify site 存在且 GitHub repo 已链接 → 触发重新构建
              console.log(`[PSEO Publisher] ✅ GitHub repo is linked: ${hasLinkedRepo}`);
              console.log(`[PSEO Publisher] Triggering rebuild...`);

              const rebuildResult = await triggerNetlifyBuild({
                token: netlifyTokenDecrypted,
                siteId: actualNetlifySiteId,
              });

              if (!rebuildResult.success) {
                rebuildWarning = `Netlify build trigger failed: ${rebuildResult.error}`;
              } else {
                console.log(`[PSEO Publisher] ✅ Netlify rebuild triggered`);
              }
            } else {
              // 场景2: Netlify site 存在但 GitHub repo 未链接 → 等待自动检测
              console.log(`[PSEO Publisher] ⚠️ GitHub repo not linked yet`);
              console.log(`[PSEO Publisher] ℹ️ Netlify will auto-detect the GitHub repo and start building within a few minutes`);
              rebuildWarning = 'Netlify site exists but GitHub repo not linked yet. Auto-build will start once Netlify detects the repo (usually 1-5 minutes).';
            }
          }
        }
      } else {
        console.error(`[PSEO Publisher] ❌ Netlify API error: ${checkResponse.status}`);
      }

      // 场景1: 如果 Netlify site 不存在，创建新的
      if (!actualNetlifySiteId) {
        console.log(`[PSEO Publisher] Netlify site not found, creating new one...`);

        const deployResult = await deployToNetlify({
          token: netlifyTokenDecrypted,
          repoOwner: github_token.owner_name,
          repoName: repoName,
          siteName: siteName,
        });

        if (deployResult.success) {
          actualNetlifySiteId = deployResult.projectId || '';
          console.log(`[PSEO Publisher] ✅ Created Netlify site: ${actualNetlifySiteId}`);
          rebuildWarning = deployResult.warning || 'Netlify site created. Auto-build will start once Netlify detects the GitHub repo (usually 1-5 minutes).';
        } else {
          rebuildWarning = `Failed to create Netlify site: ${deployResult.error}`;
        }
      }
    } catch (error: any) {
      console.warn(`[PSEO Publisher] ⚠️ Exception during Netlify rebuild:`, error.message);
      rebuildWarning = `Netlify build trigger failed: ${error.message}`;
    }

    console.log(`[PSEO Publisher] ✅ Updated successfully!`);
    if (rebuildWarning) {
      console.log(`[PSEO Publisher] ⚠️ Warning: ${rebuildWarning}`);
    }

    return {
      success: true,
      articleUrl: '',
      siteUrl: '',
      repoUrl: `https://github.com/${github_token.owner_name}/${repoName}`,
      repoName,
      siteName: repoName,
      platform: 'netlify',
      isNewSite: false,
      warning: rebuildWarning,
    };

  } catch (error: any) {
    console.error(`[PSEO Publisher] ❌ Update Error:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error during update',
    };
  }
}

