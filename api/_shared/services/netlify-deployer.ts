/**
 * 带超时的 fetch 辅助函数
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * 带重试的 fetch 辅助函数
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  timeout = 30000
): Promise<Response> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Netlify] Fetch attempt ${attempt}/${maxRetries}: ${url}`);
      const response = await fetchWithTimeout(url, options, timeout);

      if (response.ok || response.status < 500) {
        return response;
      }

      // 5xx 错误可以重试，4xx 错误不重试
      if (response.status >= 500) {
        console.warn(`[Netlify] Server error ${response.status}, will retry...`);
        lastError = new Error(`HTTP ${response.status}`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000)); // 指数退避
          continue;
        }
      }

      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[Netlify] Fetch attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`[Netlify] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Netlify 部署服务（简化版）
 * 只保留 Netlify 相关功能
 */

interface NetlifyDeployConfig {
  token: string;
  repoOwner: string;
  repoName: string;
  siteName: string;
}

interface NetlifyDeployResult {
  success: boolean;
  siteUrl?: string;
  projectId?: string;
  error?: string;
  warning?: string;
}

interface NetlifyRebuildResult {
  success: boolean;
  buildId?: string;
  error?: string;
}

/**
 * 在 Netlify 创建站点并连接 GitHub 仓库
 * API 文档: https://docs.netlify.com/api/get-started/
 */
export async function deployToNetlify(config: NetlifyDeployConfig): Promise<NetlifyDeployResult> {
  try {
    console.log(`[Netlify] Creating site: ${config.siteName}`);

    // 标准化站点名称
    const normalizedSiteName = config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    // 先尝试查询站点是否已存在 - 使用 ?name= 参数（最可靠）
    console.log(`[Netlify] Checking if site exists: ${normalizedSiteName}`);
    const checkResponse = await fetchWithRetry(
      `https://api.netlify.com/api/v1/sites?name=${encodeURIComponent(normalizedSiteName)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
      },
      2, // 最多重试 2 次
      15000 // 15 秒超时
    );

    if (checkResponse.ok) {
      const sitesData = await checkResponse.json();
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        const existingSite = sitesData.find((s: any) => s.name === normalizedSiteName || s.id === normalizedSiteName);
        if (existingSite) {
          console.log(`[Netlify] ✅ Site already exists: ${existingSite.id}`);
          console.log(`[Netlify] Site URL: ${existingSite.ssl_url || existingSite.url}`);

          // 检查是否已链接 GitHub repo
          const hasLinkedRepo = existingSite.build_settings?.repo;
          console.log(`[Netlify] GitHub repo linked: ${hasLinkedRepo ? 'Yes' : 'No'}`);

          // 已有 repo 链接，直接触发构建
          console.log(`[Netlify] ✅ GitHub repo is linked: ${existingSite.build_settings?.repo?.url}`);
          console.log(`[Netlify] Triggering rebuild...`);

          try {
            const buildResponse = await fetch(
              `https://api.netlify.com/api/v1/sites/${existingSite.id}/builds`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${config.token}`,
                },
              }
            );

            if (buildResponse.ok) {
              const buildData = await buildResponse.json();
              console.log(`[Netlify] ✅ Build triggered: ${buildData.id}`);
            } else {
              console.warn(`[Netlify] ⚠️ Build trigger failed: ${buildResponse.status}`);
            }
          } catch (error: any) {
            console.warn(`[Netlify] ⚠��� Exception triggering build:`, error.message);
          }
        } else {
          // 场景2: GitHub repo 未链接，等待 Netlify 自动检测
          console.log(`[Netlify] ⚠️ GitHub repo not linked yet.`);
          console.log(`[Netlify] ℹ️ Netlify will auto-detect the GitHub repo within 1-5 minutes.`);
          console.log(`[Netlify] ℹ️ Once detected, Netlify will start building automatically.`);
          console.log(`[Netlify] ℹ️ Site URL: ${existingSite.ssl_url || existingSite.url}`);

          return {
            success: true,
            siteUrl: existingSite.ssl_url || existingSite.url,
            projectId: existingSite.id,
            warning: 'Netlify site exists but GitHub repo not linked yet. Netlify will auto-detect the repo within 1-5 minutes and start building automatically.',
          };
        }

        return {
          success: true,
          siteUrl: existingSite.ssl_url || existingSite.url,
          projectId: existingSite.id,
        };
        }
      }
    }

    // 创建新站点（带重试）并配置 GitHub repo
    console.log(`[Netlify] Creating new site with GitHub repo connection...`);
    const createResponse = await fetchWithRetry(
      'https://api.netlify.com/api/v1/sites',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: normalizedSiteName,
          build_settings: {
            repo: {
              url: `https://github.com/${config.repoOwner}/${config.repoName}`,
              branch: 'main',
              cmd: 'mkdocs build',
              dir: 'site'
            }
          }
        }),
      },
      3, // 最多重试 3 次
      30000 // 30 秒超时
    );

    if (!createResponse.ok) {
      const error = await createResponse.json();
      console.error(`[Netlify] API Error - Status: ${createResponse.status}`);
      console.error(`[Netlify] Error Response:`, JSON.stringify(error, null, 2));

      // 422 subdomain 冲突处理：列出所有 sites 查找
      if (createResponse.status === 422 && error.errors?.subdomain?.[0]?.includes('must be unique')) {
        console.log(`[Netlify] ⚠️ Subdomain conflict. Searching all sites...`);

        const listResponse = await fetch(
          `https://api.netlify.com/api/v1/sites`,
          {
            headers: {
              'Authorization': `Bearer ${config.token}`,
            },
          }
        );

        if (listResponse.ok) {
          const allSites = await listResponse.json();
          const existingSite = Array.isArray(allSites) && allSites.find((s: any) => s.name === normalizedSiteName);
          if (existingSite) {
            console.log(`[Netlify] ✅ Found existing site: ${existingSite.id}`);
            return {
              success: true,
              siteUrl: existingSite.ssl_url || existingSite.url,
              projectId: existingSite.id,
            };
          }
        }
      }

      return {
        success: false,
        error: error.message || error.error || `Netlify API error: ${createResponse.status}`,
      };
    }

    const siteData = await createResponse.json();
    console.log(`[Netlify] ✅ Site created successfully!`);
    console.log(`[Netlify] Site ID: ${siteData.id}`);
    console.log(`[Netlify] Site Name: ${siteData.name}`);
    console.log(`[Netlify] Site URL: ${siteData.ssl_url || siteData.url}`);
    console.log(`[Netlify] ℹ️ GitHub repo info was included in site creation`);
    console.log(`[Netlify] ℹ️ Netlify will auto-detect and link the GitHub repo within 1-5 minutes`);
    console.log(`[Netlify] ℹ️ Once linked, Netlify will automatically start building`);
    console.log(`[Netlify] Repository: ${config.repoOwner}/${config.repoName}`);
    console.log(`[Netlify] Build command: mkdocs build → Publish directory: site`);

    return {
      success: true,
      siteUrl: siteData.ssl_url || siteData.url,
      projectId: siteData.id,
      warning: 'Netlify site created. GitHub repo will be auto-detected and linked within 1-5 minutes. Building will start automatically once linked.',
    };
  } catch (error: any) {
    console.error(`[Netlify] Exception:`, error);
    return {
      success: false,
      error: error.message || 'Failed to deploy to Netlify',
    };
  }
}

/**
 * 触发 Netlify 重新部署
 * API 文档: https://docs.netlify.com/api/get-started/#builds
 */
export async function triggerNetlifyBuild(config: {
  token: string;
  siteId: string;
  buildHookUrl?: string;
}): Promise<NetlifyRebuildResult> {
  try {
    console.log(`[Netlify] Triggering build for site: ${config.siteId}`);

    // 优先使用 Build Hook (更可靠)
    if (config.buildHookUrl) {
      console.log(`[Netlify] Using Build Hook: ${config.buildHookUrl}`);
      return await triggerNetlifyBuildViaWebhook({ buildHookUrl: config.buildHookUrl });
    }

    // 验证 siteId 是否为空
    if (!config.siteId || config.siteId === '') {
      console.error(`[Netlify] ❌ Site ID is empty!`);
      return {
        success: false,
        error: 'Site ID is empty. Cannot trigger build.',
      };
    }

    // 备用方案: 使用 API（带重试）
    console.log(`[Netlify] Using API endpoint: /api/v1/sites/${config.siteId}/builds`);
    const response = await fetchWithRetry(
      `https://api.netlify.com/api/v1/sites/${config.siteId}/builds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json',
        },
      },
      3, // 最多重试 3 次
      30000 // 30 秒超时
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

      // 404 错误的特殊处理
      if (response.status === 404) {
        console.error(`[Netlify] ❌ Site not found (404). Site ID: ${config.siteId}`);
        console.error(`[Netlify] This could mean:`);
        console.error(`[Netlify]   1. The site was deleted from Netlify`);
        console.error(`[Netlify]   2. The Site ID is incorrect`);
        console.error(`[Netlify]   3. The token doesn't have access to this site`);
        return {
          success: false,
          error: `Site not found (404). The Netlify site may have been deleted or the Site ID is incorrect. Site ID: ${config.siteId}`,
        };
      }

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
 * 通过 Build Hook (Webhook) 触发 Netlify 重新构建
 */
export async function triggerNetlifyBuildViaWebhook(config: {
  buildHookUrl: string;
}): Promise<NetlifyRebuildResult> {
  try {
    console.log(`[Netlify] Triggering build via Build Hook...`);

    const response = await fetchWithRetry(
      config.buildHookUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      },
      3, // 最多重试 3 次
      30000 // 30 秒超时
    );

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
