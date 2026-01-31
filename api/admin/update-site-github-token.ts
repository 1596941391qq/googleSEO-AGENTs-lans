import { VercelRequest, VercelResponse } from '@vercel/node';
import { updatePlatformSiteGitHubToken, getPlatformSiteById } from '../lib/database.js';

/**
 * 更新站点的 GitHub Token
 * POST /api/admin/update-site-github-token
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { siteId, githubTokenId } = req.body;

        if (!siteId || !githubTokenId) {
            return res.status(400).json({ error: 'Missing siteId or githubTokenId' });
        }

        // 验证站点存在
        const site = await getPlatformSiteById(siteId);
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        console.log(`[Update Site GitHub Token] Updating site ${site.site_name}`);
        console.log(`[Update Site GitHub Token] Old GitHub Token ID: ${site.github_token_id}`);
        console.log(`[Update Site GitHub Token] New GitHub Token ID: ${githubTokenId}`);

        // 更新 GitHub Token
        const updatedSite = await updatePlatformSiteGitHubToken(siteId, githubTokenId);

        console.log(`[Update Site GitHub Token] ✅ GitHub Token updated successfully`);

        return res.status(200).json({
            success: true,
            site: updatedSite,
            message: 'GitHub Token updated successfully'
        });

    } catch (error: any) {
        console.error('[Update Site GitHub Token] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
