import { VercelRequest, VercelResponse } from '@vercel/node';
import {
    updatePlatformSitePlatform,
    getPlatformSiteById,
    getAvailableTokensForNewSite,
    getAllPlatformSites
} from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { siteId, newPlatform } = req.body;

        if (!siteId || !newPlatform) {
            return res.status(400).json({ error: 'Missing siteId or newPlatform' });
        }

        // 验证平台类型
        const validPlatforms = ['rtd', 'cf_pages', 'netlify', 'vercel'];
        if (!validPlatforms.includes(newPlatform)) {
            return res.status(400).json({ error: 'Invalid platform type' });
        }

        // 获取站点信息
        const site = await getPlatformSiteById(siteId);
        if (!site) {
            return res.status(404).json({ error: 'Site not found' });
        }

        console.log(`[Update Site Platform] Updating site ${site.site_name} from ${site.platform} to ${newPlatform}`);

        // 获取对应平台的 token
        const tokens = await getAvailableTokensForNewSite(site.content_type as "informational" | "commercial");
        if (!tokens || !tokens.platform_token) {
            return res.status(400).json({
                error: `No ${newPlatform} token available. Please add one in Admin panel.`
            });
        }

            // 验证 token 平台匹配
        if (tokens.platform_token.platform !== newPlatform) {
            return res.status(400).json({
                error: `Available token is for ${tokens.platform_token.platform}, not ${newPlatform}`
            });
        }

        const platformTokenId = tokens.platform_token.id;

        // 更新站点平台
        const updatedSite = await updatePlatformSitePlatform(
            siteId,
            newPlatform as any,
            platformTokenId
        );

        console.log(`[Update Site Platform] ✅ Platform updated successfully`);
        console.log(`[Update Site Platform] Site status set to pending - will be initialized on next publish`);

        return res.status(200).json({
            success: true,
            site: updatedSite,
            message: `Platform updated to ${newPlatform}. Site status set to pending - will be initialized on next publish.`
        });

    } catch (error: any) {
        console.error('[Update Site Platform] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
