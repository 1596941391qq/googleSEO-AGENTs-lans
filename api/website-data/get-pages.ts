// Get website pages using Firecrawl /map
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { getWebsiteMap } from '../_shared/tools/firecrawl.js';
import { initWebsiteDataTables, sql } from '../lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    await initWebsiteDataTables();

    const { websiteId, websiteUrl } = parseRequestBody(req);

    if (!websiteId && !websiteUrl) {
      return sendErrorResponse(res, null, 'websiteId or websiteUrl is required', 400);
    }

    // Get website URL if only websiteId provided
    let url = websiteUrl;
    if (!url && websiteId) {
      const website = await sql`
        SELECT website_url FROM user_websites WHERE id = ${websiteId}
      `;
      if (website.rows.length === 0) {
        return sendErrorResponse(res, null, 'Website not found', 404);
      }
      url = website.rows[0].website_url;
    }

    // Call Firecrawl /map
    const mapResult = await getWebsiteMap(url!);

    // Save pages to database if websiteId provided
    if (websiteId) {
      for (const page of mapResult.pages) {
        await sql`
          INSERT INTO website_pages (
            website_id, page_url, page_title, page_description, page_type
          )
          VALUES (
            ${websiteId},
            ${page.url},
            ${page.title || null},
            ${page.description || null},
            ${page.type || 'page'}
          )
          ON CONFLICT (website_id, page_url) DO UPDATE SET
            page_title = EXCLUDED.page_title,
            page_description = EXCLUDED.page_description,
            page_type = EXCLUDED.page_type,
            updated_at = NOW()
        `;
      }

      // Save topic clusters
      for (const cluster of mapResult.topicClusters) {
        // Update pages with cluster info
        for (let i = 0; i < cluster.pages.length; i++) {
          await sql`
            UPDATE website_pages
            SET topic_cluster = ${cluster.name},
                cluster_priority = ${i}
            WHERE website_id = ${websiteId} AND page_url = ${cluster.pages[i]}
          `;
        }
      }
    }

    return res.json({
      success: true,
      data: mapResult,
    });
  } catch (error: any) {
    console.error('[Get Website Pages] Error:', error);
    return sendErrorResponse(res, error, 'Failed to get website pages', 500);
  }
}

