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

    // 创建站点
    const createResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: config.siteName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
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

    // 注意: GitHub 仓库连接需要在 Netlify UI 中手动完成
    console.log(`[Netlify] ⚠️ Please manually connect GitHub repo in Netlify UI:`);
    console.log(`[Netlify] Site settings → Build & deploy → Link repository`);
    console.log(`[Netlify] Repository: ${config.repoOwner}/${config.repoName}`);
    console.log(`[Netlify] Build command: mkdocs build`);
    console.log(`[Netlify] Publish directory: site`);

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

    // 备用方案: 使用 API
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
 * 通过 Build Hook (Webhook) 触发 Netlify 重新构建
 */
export async function triggerNetlifyBuildViaWebhook(config: {
  buildHookUrl: string;
}): Promise<NetlifyRebuildResult> {
  try {
    console.log(`[Netlify] Triggering build via Build Hook...`);

    const response = await fetch(config.buildHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
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

