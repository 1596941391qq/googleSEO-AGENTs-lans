/**
 * 更新旧站点的 MkDocs 配置
 * 将 use_directory_urls: true 改为 false，并添加首页
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { updateMkDocsConfig } from '../_shared/services/github.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      githubToken,
      repoOwner,
      repoName,
      siteName,
      siteDescription,
      branch = 'main',
    } = req.body;

    // 验证必需参数
    if (!githubToken || !repoOwner || !repoName || !siteName || !siteDescription) {
      return res.status(400).json({
        error: 'Missing required parameters: githubToken, repoOwner, repoName, siteName, siteDescription',
      });
    }

    console.log(`[API updateMkDocsConfig] Updating config for: ${repoOwner}/${repoName}`);

    // 更新配置
    const result = await updateMkDocsConfig({
      token: githubToken,
      owner: repoOwner,
      repoName,
      siteName,
      siteDescription,
      branch,
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error || 'Failed to update MkDocs config',
      });
    }

    return res.json({
      success: true,
      changes: result.changes,
      message: `Successfully updated MkDocs config for ${repoName}`,
    });
  } catch (error: any) {
    console.error('[API updateMkDocsConfig] Error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error',
    });
  }
}
