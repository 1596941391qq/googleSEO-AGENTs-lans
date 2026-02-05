import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAllPlatformSites } from '../lib/database.js';

/**
 * 查询所有站点信息
 * GET /api/admin/list-sites
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const sites = await getAllPlatformSites();

        return res.status(200).json({
            success: true,
            count: sites.length,
            sites: sites.map(site => ({
                id: site.id,
                site_name: site.site_name,
                platform: site.platform,
                content_type: site.content_type,
                status: site.status,
                repo_name: site.repo_name,
                site_url: site.site_url,
                github_owner: site.github_owner,
                github_token_name: site.github_token_name,
                platform_token_name: site.platform_token_name,
                usage_count: site.usage_count,
                // platform_project_id 不再存储，改为通过 API 动态查询
                created_at: site.created_at
            }))
        });

    } catch (error: any) {
        console.error('[List Sites] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
