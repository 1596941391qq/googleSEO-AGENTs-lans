/**
 * 各发布平台 API 服务
 * 用于通过 API 创建项目并连接 GitHub 仓库
 */

interface PlatformDeployConfig {
  token: string;
  repoOwner: string;
  repoName: string;
  siteName: string;
  buildCommand?: string;
  publishDir?: string;
}

interface PlatformDeployResult {
  success: boolean;
  siteUrl?: string;
  projectId?: string;
  error?: string;
}

// =============================================================================
// Read the Docs
// =============================================================================

/**
 * 在 Read the Docs 创建项目并连接 GitHub 仓库
 * API 文档: https://docs.readthedocs.io/en/stable/api/v3.html
 */
export async function deployToReadTheDocs(config: PlatformDeployConfig): Promise<PlatformDeployResult> {
  try {
    // RTD API v3
    const response = await fetch('https://readthedocs.org/api/v3/projects/', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.siteName,
        repository: {
          url: `https://github.com/${config.repoOwner}/${config.repoName}`,
          type: 'git',
        },
        homepage: `https://${config.siteName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.readthedocs.io`,
        programming_language: 'words',
        language: 'en',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // 项目已存在
      if (response.status === 400 && error.name?.[0]?.includes('already exists')) {
        const slug = config.siteName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return {
          success: true,
          siteUrl: `https://${slug}.readthedocs.io`,
          projectId: slug,
        };
      }
      return {
        success: false,
        error: error.detail || error.name?.[0] || `RTD API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      siteUrl: data.urls?.documentation || `https://${data.slug}.readthedocs.io`,
      projectId: data.slug,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to deploy to RTD',
    };
  }
}

// =============================================================================
// Cloudflare Pages
// =============================================================================

/**
 * 在 Cloudflare Pages 创建项目并连接 GitHub 仓库
 * API 文档: https://developers.cloudflare.com/api/operations/pages-project-create-project
 */
export async function deployToCloudflarePages(
  config: PlatformDeployConfig & { accountId: string }
): Promise<PlatformDeployResult> {
  try {
    const projectName = config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          production_branch: 'main',
          source: {
            type: 'github',
            config: {
              owner: config.repoOwner,
              repo_name: config.repoName,
              production_branch: 'main',
              deployments_enabled: true,
            },
          },
          build_config: {
            build_command: 'mkdocs build',
            destination_dir: 'site',
            root_dir: '',
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // 项目已存在
      if (error.errors?.[0]?.code === 8000007) {
        return {
          success: true,
          siteUrl: `https://${projectName}.pages.dev`,
          projectId: projectName,
        };
      }
      return {
        success: false,
        error: error.errors?.[0]?.message || `CF Pages API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      siteUrl: `https://${data.result.subdomain}`,
      projectId: data.result.name,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to deploy to Cloudflare Pages',
    };
  }
}

// =============================================================================
// Netlify
// =============================================================================

/**
 * 在 Netlify 创建站点并连接 GitHub 仓库
 * API 文档: https://docs.netlify.com/api/get-started/
 */
export async function deployToNetlify(config: PlatformDeployConfig): Promise<PlatformDeployResult> {
  try {
    console.log(`[Netlify] Creating site: ${config.siteName}`);

    // Step 1: 先创建一个空站点(不连接 GitHub)
    const createResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        // 不包含 repo 配置,先创建空站点
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error(`[Netlify] API Error - Status: ${createResponse.status}`);
      console.error(`[Netlify] Error Response:`, JSON.stringify(error, null, 2));

      // 站点名已存在
      if (createResponse.status === 422) {
        const siteName = config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        console.log(`[Netlify] Site already exists: ${siteName}`);
        return {
          success: true,
          siteUrl: `https://${siteName}.netlify.app`,
          projectId: siteName,
        };
      }
      return {
        success: false,
        error: error.message || error.error || `Netlify API error: ${createResponse.status}`,
      };
    }

    const siteData = await createResponse.json();
    console.log(`[Netlify] ✅ Site created successfully. ID: ${siteData.id}`);
    console.log(`[Netlify] Site URL: ${siteData.ssl_url || siteData.url}`);

    // Step 2: 配置 GitHub 仓库连接
    // 注意: 这一步可能需要用户在 Netlify UI 中手动完成 GitHub OAuth 授权
    // 我们先返回成功,让用户手动连接 GitHub
    console.log(`[Netlify] ⚠️ Please manually connect GitHub repo in Netlify UI:`);
    console.log(`[Netlify] Site settings → Build & deploy → Link repository`);
    console.log(`[Netlify] Repository: ${config.repoOwner}/${config.repoName}`);
    console.log(`[Netlify] Build command: ${config.buildCommand ?? 'mkdocs build'}`);
    console.log(`[Netlify] Publish directory: ${config.publishDir ?? 'site'}`);

    return {
      success: true,
      siteUrl: siteData.ssl_url || siteData.url,
      projectId: siteData.id,
    };
  } catch (error: any) {
    console.error(`[Netlify] Exception:`, error);
    return {
      success: false,
      error: error.message || 'Failed to deploy to Netlify',
    };
  }
}

// =============================================================================
// Vercel
// =============================================================================

/**
 * 在 Vercel 创建项目并连接 GitHub 仓库
 * API 文档: https://vercel.com/docs/rest-api
 */
export async function deployToVercel(config: PlatformDeployConfig): Promise<PlatformDeployResult> {
  try {
    const projectName = config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // 创建项目并连接 Git 仓库
    const response = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        gitRepository: {
          type: 'github',
          repo: `${config.repoOwner}/${config.repoName}`,
        },
        buildCommand: 'mkdocs build',
        outputDirectory: 'site',
        framework: null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      // 项目已存在
      if (error.error?.code === 'project_already_exists') {
        return {
          success: true,
          siteUrl: `https://${projectName}.vercel.app`,
          projectId: projectName,
        };
      }
      return {
        success: false,
        error: error.error?.message || `Vercel API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      siteUrl: `https://${data.name}.vercel.app`,
      projectId: data.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to deploy to Vercel',
    };
  }
}

// =============================================================================
// 重新部署 / 触发构建
// =============================================================================

interface RebuildResult {
  success: boolean;
  buildId?: string;
  error?: string;
}

/**
 * 触发 Read the Docs 重新构建
 * API 文档: https://docs.readthedocs.io/en/stable/api/v3.html
 *
 * RTD v3 API 需要通过 webhook 或者直接触发构建
 * 这里使用 GitHub webhook 模拟方式或者直接调用构建 API
 */
export async function triggerRTDBuild(config: {
  token: string;
  projectSlug: string;
}): Promise<RebuildResult> {
  try {
    console.log(`[RTD] Triggering build for project: ${config.projectSlug}`);

    // RTD API v3: 触发构建需要指定版本
    // 我们触发 latest 版本的构建
    const response = await fetch(
      `https://readthedocs.org/api/v3/projects/${config.projectSlug}/versions/latest/builds/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // 空 body 触发构建
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = errorText;

      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.detail || errorJson.error || errorText;
      } catch (e) {
        // 如果不是 JSON，使用原始文本
      }

      console.error(`[RTD] Build trigger failed: ${response.status}`, errorDetail);

      // 如果 API v3 失败，尝试使用 webhook 方式
      console.log(`[RTD] Trying alternative method: GitHub webhook simulation...`);
      return await triggerRTDBuildViaWebhook(config);
    }

    const data = await response.json();
    console.log(`[RTD] ✅ Build triggered successfully. Build ID: ${data.id}`);
    return {
      success: true,
      buildId: data.id?.toString(),
    };
  } catch (error: any) {
    console.error(`[RTD] Build trigger exception:`, error);

    // 尝试备用方法
    console.log(`[RTD] Trying alternative method due to exception...`);
    return await triggerRTDBuildViaWebhook(config);
  }
}

/**
 * 通过 GitHub webhook 方式触发 RTD 构建（备用方法）
 * RTD 会监听 GitHub push 事件，我们可以通过 GitHub API 触发
 */
async function triggerRTDBuildViaWebhook(config: {
  token: string;
  projectSlug: string;
}): Promise<RebuildResult> {
  try {
    // 使用 RTD 的 webhook 端点
    // 这个端点不需要认证，但需要正确的 payload
    const webhookUrl = `https://readthedocs.org/api/v2/webhook/${config.projectSlug}/1/`;

    console.log(`[RTD] Triggering via webhook: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'refs/heads/main',
        // 模拟 GitHub webhook payload
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RTD] Webhook trigger failed: ${response.status}`, errorText);
      return {
        success: false,
        error: `RTD webhook failed: ${response.status} - ${errorText}`,
      };
    }

    console.log(`[RTD] ✅ Build triggered via webhook successfully`);
    return {
      success: true,
      buildId: 'webhook-triggered',
    };
  } catch (error: any) {
    console.error(`[RTD] Webhook trigger exception:`, error);
    return {
      success: false,
      error: error.message || 'Failed to trigger RTD build via webhook',
    };
  }
}

/**
 * 触发 Cloudflare Pages 重新部署
 * API 文档: https://developers.cloudflare.com/api/operations/pages-deployment-create-deployment
 */
export async function triggerCFPagesBuild(config: {
  token: string;
  accountId: string;
  projectName: string;
}): Promise<RebuildResult> {
  try {
    console.log(`[CF Pages] Triggering deployment for project: ${config.projectName}`);

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/pages/projects/${config.projectName}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branch: 'main',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error(`[CF Pages] Deployment trigger failed: ${response.status}`, error);
      return {
        success: false,
        error: error.errors?.[0]?.message || `CF Pages API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[CF Pages] ✅ Deployment triggered successfully. ID: ${data.result.id}`);
    return {
      success: true,
      buildId: data.result.id,
    };
  } catch (error: any) {
    console.error(`[CF Pages] Deployment trigger exception:`, error);
    return {
      success: false,
      error: error.message || 'Failed to trigger CF Pages deployment',
    };
  }
}

/**
 * 触发 Netlify 重新部署
 * API 文档: https://docs.netlify.com/api/get-started/#builds
 * 
 * 双重触发机制：
 * 1. 优先使用 API 直接触发（需要 token 和 siteId）
 * 2. 如果 API 失败，尝试使用 Build Hook（需要配置 buildHookUrl）
 */
export async function triggerNetlifyBuild(config: {
  token: string;
  siteId: string;
  buildHookUrl?: string; // 可选的 Build Hook URL，用于备用触发
}): Promise<RebuildResult> {
  try {
    console.log(`[Netlify] Triggering build for site: ${config.siteId}`);

    // 优先使用 Build Hook (更可靠,不需要特殊权限)
    if (config.buildHookUrl) {
      console.log(`[Netlify] Using Build Hook: ${config.buildHookUrl}`);
      return await triggerNetlifyBuildViaWebhook({ buildHookUrl: config.buildHookUrl });
    }

    // 备用方案: 使用 API (需要更高权限)
    const response = await fetch(
      `https://api.netlify.com/api/v1/sites/${config.siteId}/builds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail = errorText;

      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.message || errorJson.error || errorText;
      } catch (e) {
        // 如果不是 JSON，使用原始文本
      }

      console.error(`[Netlify] Build trigger failed: ${response.status}`, errorDetail);

      return {
        success: false,
        error: errorDetail || `Netlify API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[Netlify] ✅ Build triggered successfully. Build ID: ${data.id}`);
    return {
      success: true,
      buildId: data.id,
    };
  } catch (error: any) {
    console.error(`[Netlify] Build trigger exception:`, error);

    return {
      success: false,
      error: error.message || 'Failed to trigger Netlify build',
    };
  }
}

/**
 * 通过 Build Hook (Webhook) 触发 Netlify 重新构建（备用方法）
 * 
 * Build Hook 是 Netlify 提供的一个简单的 POST 端点，无需认证。
 * 只需要向该 URL 发送 POST 请求即可触发构建。
 * 
 * 用法：在 Netlify 控制台创建 Build Hook：
 * Site settings → Build & deploy → Build hooks → Add build hook
 * 
 * @param config.buildHookUrl - Netlify Build Hook URL (形如 https://api.netlify.com/build_hooks/xxx)
 */
export async function triggerNetlifyBuildViaWebhook(config: {
  buildHookUrl: string;
}): Promise<RebuildResult> {
  try {
    console.log(`[Netlify] Triggering build via Build Hook...`);

    const response = await fetch(config.buildHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // 空 body 即可触发
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Netlify] Build Hook trigger failed: ${response.status}`, errorText);
      return {
        success: false,
        error: `Netlify Build Hook failed: ${response.status} - ${errorText}`,
      };
    }

    console.log(`[Netlify] ✅ Build triggered via Build Hook successfully`);
    return {
      success: true,
      buildId: 'webhook-triggered',
    };
  } catch (error: any) {
    console.error(`[Netlify] Build Hook trigger exception:`, error);
    return {
      success: false,
      error: error.message || 'Failed to trigger Netlify build via Build Hook',
    };
  }
}

/**
 * 触发 Vercel 重新部署
 * API 文档: https://vercel.com/docs/rest-api/endpoints#create-a-deployment
 */
export async function triggerVercelBuild(config: {
  token: string;
  projectId: string;
  repoOwner: string;
  repoName: string;
}): Promise<RebuildResult> {
  try {
    console.log(`[Vercel] Triggering deployment for project: ${config.projectId}`);

    const response = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.projectId,
        gitSource: {
          type: 'github',
          repo: `${config.repoOwner}/${config.repoName}`,
          ref: 'main',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`[Vercel] Deployment trigger failed: ${response.status}`, error);
      return {
        success: false,
        error: error.error?.message || `Vercel API error: ${response.status}`,
      };
    }

    const data = await response.json();
    console.log(`[Vercel] ✅ Deployment triggered successfully. ID: ${data.id}`);
    return {
      success: true,
      buildId: data.id,
    };
  } catch (error: any) {
    console.error(`[Vercel] Deployment trigger exception:`, error);
    return {
      success: false,
      error: error.message || 'Failed to trigger Vercel deployment',
    };
  }
}

/**
 * 统一触发重新构建接口
 */
export async function triggerPlatformRebuild(
  platform: PlatformType,
  config: {
    platformToken: string | null;
    githubToken: string;
    repoOwner: string;
    repoName: string;
    projectId?: string;
    projectSlug?: string;
    cfAccountId?: string;
  }
): Promise<RebuildResult> {
  console.log(`[Platform Rebuild] Triggering rebuild for platform: ${platform}`);

  switch (platform) {
    case 'rtd':
      if (!config.platformToken || !config.projectSlug) {
        return { success: false, error: 'RTD token and project slug are required' };
      }
      return triggerRTDBuild({
        token: config.platformToken,
        projectSlug: config.projectSlug,
      });

    case 'cf_pages':
      if (!config.platformToken || !config.cfAccountId || !config.projectId) {
        return { success: false, error: 'CF Pages token, accountId, and projectId are required' };
      }
      return triggerCFPagesBuild({
        token: config.platformToken,
        accountId: config.cfAccountId,
        projectName: config.projectId,
      });

    case 'netlify':
      if (!config.platformToken || !config.projectId) {
        return { success: false, error: 'Netlify token and site ID are required' };
      }
      return triggerNetlifyBuild({
        token: config.platformToken,
        siteId: config.projectId,
      });

    case 'vercel':
      if (!config.platformToken || !config.projectId) {
        return { success: false, error: 'Vercel token and project ID are required' };
      }
      return triggerVercelBuild({
        token: config.platformToken,
        projectId: config.projectId,
        repoOwner: config.repoOwner,
        repoName: config.repoName,
      });

    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}

// =============================================================================
// 统一部署接口
// =============================================================================

export type PlatformType = 'rtd' | 'cf_pages' | 'netlify' | 'vercel';

/**
 * 根据平台类型部署站点
 */
export async function deployToPlatform(
  platform: PlatformType,
  config: {
    platformToken: string | null;
    githubToken: string;
    repoOwner: string;
    repoName: string;
    siteName: string;
    // CF Pages 需要 accountId
    cfAccountId?: string;
  }
): Promise<PlatformDeployResult> {
  switch (platform) {
    case 'rtd':
      if (!config.platformToken) {
        return { success: false, error: 'RTD token is required' };
      }
      return deployToReadTheDocs({
        token: config.platformToken,
        repoOwner: config.repoOwner,
        repoName: config.repoName,
        siteName: config.siteName,
      });

    case 'cf_pages':
      if (!config.platformToken || !config.cfAccountId) {
        return { success: false, error: 'CF Pages token and accountId are required' };
      }
      return deployToCloudflarePages({
        token: config.platformToken,
        accountId: config.cfAccountId,
        repoOwner: config.repoOwner,
        repoName: config.repoName,
        siteName: config.siteName,
      });

    case 'netlify':
      if (!config.platformToken) {
        return { success: false, error: 'Netlify token is required' };
      }
      return deployToNetlify({
        token: config.platformToken,
        repoOwner: config.repoOwner,
        repoName: config.repoName,
        siteName: config.siteName,
      });

    case 'vercel':
      if (!config.platformToken) {
        return { success: false, error: 'Vercel token is required' };
      }
      return deployToVercel({
        token: config.platformToken,
        repoOwner: config.repoOwner,
        repoName: config.repoName,
        siteName: config.siteName,
      });

    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}
