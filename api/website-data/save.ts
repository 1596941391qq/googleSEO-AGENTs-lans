// Save website data after binding
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { initWebsiteDataTables, sql } from '../lib/database.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // Initialize tables
    await initWebsiteDataTables();

    const {
      userId,
      websiteUrl,
      websiteTitle,
      websiteDescription,
      websiteScreenshot,
      rawContent,
      keywords,
      industry,
      monthlyVisits,
      monthlyRevenue,
      marketingTools,
      additionalInfo,
    } = parseRequestBody(req);

    if (!userId || !websiteUrl) {
      return sendErrorResponse(res, null, 'userId and websiteUrl are required', 400);
    }

    // Extract domain from URL
    const domain = new URL(websiteUrl).hostname.replace('www.', '');

    // Use UPSERT to handle insert or update atomically
    // This prevents race conditions when multiple requests try to save the same website
    const result = await sql`
      INSERT INTO user_websites (
        user_id, website_url, website_domain,
        website_title, website_description, website_screenshot,
        raw_content, content_updated_at,
        industry, monthly_visits, monthly_revenue,
        marketing_tools, additional_info
      )
      VALUES (
        ${userId}, ${websiteUrl}, ${domain},
        ${websiteTitle || null}, ${websiteDescription || null}, ${websiteScreenshot || null},
        ${rawContent || null}, NOW(),
        ${industry || null}, ${monthlyVisits || null}, ${monthlyRevenue || null},
        ${marketingTools && Array.isArray(marketingTools) && marketingTools.length > 0 ? marketingTools : null},
        ${additionalInfo || null}
      )
      ON CONFLICT (user_id, website_url) DO UPDATE SET
        website_title = EXCLUDED.website_title,
        website_description = EXCLUDED.website_description,
        website_screenshot = EXCLUDED.website_screenshot,
        raw_content = EXCLUDED.raw_content,
        content_updated_at = EXCLUDED.content_updated_at,
        industry = EXCLUDED.industry,
        monthly_visits = EXCLUDED.monthly_visits,
        monthly_revenue = EXCLUDED.monthly_revenue,
        marketing_tools = EXCLUDED.marketing_tools,
        additional_info = EXCLUDED.additional_info,
        updated_at = NOW()
      RETURNING id
    `;
    const websiteId = result.rows[0].id;

    // Save keywords
    if (keywords && Array.isArray(keywords) && keywords.length > 0) {
      for (const keyword of keywords) {
        await sql`
          INSERT INTO website_keywords (
            website_id, keyword, translation, intent, estimated_volume
          )
          VALUES (
            ${websiteId},
            ${keyword.keyword || keyword},
            ${keyword.translation || null},
            ${keyword.intent || null},
            ${keyword.estimatedVolume || keyword.estimated_volume || null}
          )
          ON CONFLICT (website_id, keyword) DO UPDATE SET
            translation = EXCLUDED.translation,
            intent = EXCLUDED.intent,
            estimated_volume = EXCLUDED.estimated_volume,
            updated_at = NOW()
        `;
      }
    }

    // ==========================================
    // Step: 管理 user_preferences 记录
    // ==========================================
    // 检查这是否是用户的第一个网站
    const websiteCountResult = await sql`
      SELECT COUNT(*) as count
      FROM user_websites
      WHERE user_id = ${userId} AND is_active = true
    `;
    const websiteCount = parseInt(websiteCountResult.rows[0].count || '0', 10);
    const isFirstWebsite = websiteCount === 1;

    // 检查 user_preferences 是否存在
    const preferencesCheck = await sql`
      SELECT user_id FROM user_preferences WHERE user_id = ${userId}
    `;
    const hasPreferences = preferencesCheck.rows.length > 0;

    if (isFirstWebsite) {
      // 如果是第一个网站，自动设为默认网站并创建 user_preferences 记录
      await sql`
        UPDATE user_websites
        SET is_default = true, updated_at = NOW()
        WHERE id = ${websiteId}
      `;

      await sql`
        INSERT INTO user_preferences (user_id, default_website_id, last_selected_website_id, updated_at)
        VALUES (${userId}, ${websiteId}, ${websiteId}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          default_website_id = EXCLUDED.default_website_id,
          last_selected_website_id = EXCLUDED.last_selected_website_id,
          updated_at = NOW()
      `;
    } else if (!hasPreferences) {
      // 如果不是第一个网站，但 user_preferences 不存在，创建记录（不设为默认）
      await sql`
        INSERT INTO user_preferences (user_id, default_website_id, last_selected_website_id, updated_at)
        VALUES (${userId}, NULL, NULL, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `;
    }

    return res.json({
      success: true,
      data: {
        websiteId,
        message: 'Website data saved successfully',
      },
    });
  } catch (error: any) {
    console.error('[Save Website Data] Error:', error);
    return sendErrorResponse(res, error, 'Failed to save website data', 500);
  }
}

