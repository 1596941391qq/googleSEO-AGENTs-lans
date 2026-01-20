/**
 * 各发布平台 API 服务
 * 用于通过 API 创建项目并连接 GitHub 仓库
 */

interface PlatformDeployConfig {
  token: string;
  repoOwner: string;
  repoName: string;
  siteName: string;
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
    // 1. 创建站点
    const createResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        repo: {
          provider: 'github',
          repo: `${config.repoOwner}/${config.repoName}`,
          private: false,
          branch: 'main',
          cmd: 'mkdocs build',
          dir: 'site',
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      // 站点名已存在，尝试获取
      if (createResponse.status === 422) {
        const siteName = config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
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

    const data = await createResponse.json();
    return {
      success: true,
      siteUrl: data.ssl_url || data.url,
      projectId: data.id,
    };
  } catch (error: any) {
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
// GitHub Pages
// =============================================================================

/**
 * 启用 GitHub Pages
 * 注意: GitHub Pages 不需要额外的平台 Token，使用 GitHub Token 即可
 */
export async function enableGitHubPages(config: {
  token: string;
  owner: string;
  repoName: string;
}): Promise<PlatformDeployResult> {
  try {
    // 启用 GitHub Pages，使用 main 分支
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repoName}/pages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            branch: 'main',
            path: '/site', // MkDocs 输出目录
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      // Pages 已启用
      if (response.status === 409) {
        return {
          success: true,
          siteUrl: `https://${config.owner}.github.io/${config.repoName}`,
        };
      }
      return {
        success: false,
        error: error.message || `GitHub Pages API error: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      siteUrl: data.html_url || `https://${config.owner}.github.io/${config.repoName}`,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to enable GitHub Pages',
    };
  }
}

// =============================================================================
// 统一部署接口
// =============================================================================

export type PlatformType = 'rtd' | 'cf_pages' | 'netlify' | 'vercel' | 'github_pages';

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

    case 'github_pages':
      return enableGitHubPages({
        token: config.githubToken,
        owner: config.repoOwner,
        repoName: config.repoName,
      });

    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}
