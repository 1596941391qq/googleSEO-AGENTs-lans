// Save website data after binding
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCorsHeaders, handleOptions, sendErrorResponse, parseRequestBody } from '../_shared/request-handler.js';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, null, 'Method not allowed', 405);
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return sendErrorResponse(res, null, 'Unauthorized', 401);
    }

    const originalUserId = authResult.userId;
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';

    // 验证 userId 是否是有效的 UUID 格式
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUUID = uuidRegex.test(originalUserId);

    // 开发模式下的测试用户特殊处理
    if (isDevelopment && (!isValidUUID || originalUserId === '12345')) {
      console.log(`[Save Website Data] Test user detected (userId: ${originalUserId}), returning mock response in development mode`);
      // 返回一个模拟的成功响应，不实际保存到数据库
      return res.json({
        success: true,
        data: {
          websiteId: `test-website-${Date.now()}`,
          message: 'Website data saved successfully (test mode)',
        },
      });
    }

    if (!isValidUUID) {
      return sendErrorResponse(
        res,
        new Error(`Invalid user ID format. Expected UUID but got: ${originalUserId}`),
        'Invalid user ID format. Please refresh your session or re-login.',
        400
      );
    }

    const userId = originalUserId;

    // Initialize tables
    await initWebsiteDataTables();

    const {
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

    if (!websiteUrl || typeof websiteUrl !== 'string') {
      return sendErrorResponse(res, null, 'valid websiteUrl is required', 400);
    }

    // Extract domain from URL
    let domain = '';
    try {
      domain = new URL(websiteUrl).hostname.replace('www.', '');
    } catch (urlError) {
      // Fallback if URL parsing fails
      domain = websiteUrl.replace(/^https?:\/\//, '').split('/')[0].replace('www.', '');
    }

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

    // 异步触发 DataForSEO 数据获取（不阻塞响应）
    // 这样用户完成设置后，数据会自动开始同步
    (async () => {
      try {
        console.log('[Save Website Data] 🚀 Triggering DataForSEO metrics update for website:', websiteId);

        // 调用内部函数来获取 DataForSEO 数据
        // 注意：这里直接调用逻辑，而不是通过 HTTP，避免循环依赖
        const { getDomainOverview, getDomainKeywords, getDomainCompetitors } = await import('../_shared/tools/dataforseo-domain.js');

        const regionToLocationCode: { [key: string]: number } = {
          'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
          'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
        };
        const locationCode = regionToLocationCode['us'] || 2840; // 默认使用 US

        console.log('[Save Website Data] 📍 Fetching DataForSEO data for domain:', domain, 'location:', locationCode);

        // 并行获取所有数据
        const [overview, keywords, competitors] = await Promise.all([
          getDomainOverview(domain, locationCode).catch((err) => {
            console.error('[Save Website Data] Failed to get overview:', err.message);
            return null;
          }),
          getDomainKeywords(domain, locationCode, 50).catch((err) => {
            console.error('[Save Website Data] Failed to get keywords:', err.message);
            return [];
          }),
          getDomainCompetitors(domain, locationCode, 5).catch((err) => {
            console.error('[Save Website Data] Failed to get competitors:', err.message);
            return [];
          }),
        ]);

        // 缓存概览数据（即使数据为 0 也要保存，这样前端才知道数据已获取）
        if (overview !== null && overview !== undefined) {
          await sql`
            INSERT INTO domain_overview_cache (
              website_id, location_code, data_date, organic_traffic, paid_traffic, total_traffic,
              total_keywords, new_keywords, lost_keywords, improved_keywords, declined_keywords,
              avg_position, traffic_cost, top3_count, top10_count, top50_count, top100_count,
              backlinks_info, data_updated_at, cache_expires_at
            ) VALUES (
              ${websiteId}, ${locationCode}, CURRENT_DATE, ${overview.organicTraffic}, ${overview.paidTraffic}, ${overview.totalTraffic},
              ${overview.totalKeywords}, ${overview.newKeywords}, ${overview.lostKeywords},
              ${overview.improvedKeywords || 0}, ${overview.declinedKeywords || 0},
              ${overview.avgPosition}, ${overview.trafficCost},
              ${overview.rankingDistribution.top3}, ${overview.rankingDistribution.top10},
              ${overview.rankingDistribution.top50}, ${overview.rankingDistribution.top100},
              ${overview.backlinksInfo ? JSON.stringify(overview.backlinksInfo) : null},
              NOW(), NOW() + INTERVAL '24 hours'
            )
            ON CONFLICT (website_id, data_date, location_code) DO UPDATE SET
              organic_traffic = EXCLUDED.organic_traffic,
              paid_traffic = EXCLUDED.paid_traffic,
              total_traffic = EXCLUDED.total_traffic,
              total_keywords = EXCLUDED.total_keywords,
              new_keywords = EXCLUDED.new_keywords,
              lost_keywords = EXCLUDED.lost_keywords,
              improved_keywords = EXCLUDED.improved_keywords,
              declined_keywords = EXCLUDED.declined_keywords,
              avg_position = EXCLUDED.avg_position,
              traffic_cost = EXCLUDED.traffic_cost,
              top3_count = EXCLUDED.top3_count,
              top10_count = EXCLUDED.top10_count,
              top50_count = EXCLUDED.top50_count,
              top100_count = EXCLUDED.top100_count,
              backlinks_info = EXCLUDED.backlinks_info,
              data_updated_at = NOW(),
              cache_expires_at = EXCLUDED.cache_expires_at
          `;
          console.log('[Save Website Data] ✅ Cached overview data:', {
            websiteId,
            totalKeywords: overview.totalKeywords,
            organicTraffic: overview.organicTraffic,
            totalTraffic: overview.totalTraffic,
            top10Count: overview.rankingDistribution.top10,
            locationCode
          });
        } else {
          console.warn('[Save Website Data] ⚠️ No overview data to cache (overview is null or undefined)');
        }

        // 缓存关键词数据（前20个）
        if (keywords.length > 0) {
          const keywordsToCache = keywords.slice(0, 20);
          await Promise.all(
            keywordsToCache.map(kw => sql`
              INSERT INTO domain_keywords_cache (
                website_id, location_code, keyword, current_position, previous_position,
                position_change, search_volume, cpc, competition, difficulty,
                traffic_percentage, ranking_url, data_updated_at, cache_expires_at
              ) VALUES (
                ${websiteId}, ${locationCode}, ${kw.keyword}, ${kw.currentPosition},
                ${kw.previousPosition}, ${kw.positionChange}, ${kw.searchVolume},
                ${kw.cpc}, ${kw.competition !== null && kw.competition !== undefined ? Math.min(Math.max(Number(kw.competition) || 0, 0), 99999999.99) : null},
                ${kw.difficulty}, ${kw.trafficPercentage !== null && kw.trafficPercentage !== undefined ? Math.min(Math.max(Number(kw.trafficPercentage) || 0, 0), 99999999.99) : null},
                ${kw.url || ''}, NOW(), NOW() + INTERVAL '24 hours'
              )
              ON CONFLICT (website_id, keyword, location_code) DO UPDATE SET
                current_position = EXCLUDED.current_position,
                previous_position = EXCLUDED.previous_position,
                position_change = EXCLUDED.position_change,
                search_volume = EXCLUDED.search_volume,
                cpc = EXCLUDED.cpc,
                competition = CASE 
                  WHEN EXCLUDED.competition IS NULL THEN NULL
                  ELSE LEAST(GREATEST(EXCLUDED.competition, 0), 99999999.99)
                END,
                difficulty = EXCLUDED.difficulty,
                traffic_percentage = CASE 
                  WHEN EXCLUDED.traffic_percentage IS NULL THEN NULL
                  ELSE LEAST(GREATEST(EXCLUDED.traffic_percentage, 0), 99999999.99)
                END,
                ranking_url = EXCLUDED.ranking_url,
                data_updated_at = NOW(),
                cache_expires_at = EXCLUDED.cache_expires_at
            `)
          );
          console.log(`[Save Website Data] ✅ Cached ${keywordsToCache.length} keywords`);
        }

        // 缓存竞争对手数据
        if (competitors.length > 0) {
          await Promise.all(
            competitors.map(comp => sql`
              INSERT INTO domain_competitors_cache (
                website_id, location_code, competitor_domain, competitor_title,
                common_keywords, organic_traffic, total_keywords,
                gap_keywords, gap_traffic, data_updated_at, cache_expires_at
              ) VALUES (
                ${websiteId}, ${locationCode}, ${comp.domain}, ${comp.title || null},
                ${comp.commonKeywords || 0}, ${comp.organicTraffic || 0}, ${comp.totalKeywords || 0},
                ${comp.gapKeywords || 0}, ${comp.gapTraffic || 0}, NOW(), NOW() + INTERVAL '7 days'
              )
              ON CONFLICT (website_id, competitor_domain, location_code) DO UPDATE SET
                competitor_title = EXCLUDED.competitor_title,
                common_keywords = EXCLUDED.common_keywords,
                organic_traffic = EXCLUDED.organic_traffic,
                total_keywords = EXCLUDED.total_keywords,
                gap_keywords = EXCLUDED.gap_keywords,
                gap_traffic = EXCLUDED.gap_traffic,
                data_updated_at = NOW(),
                cache_expires_at = EXCLUDED.cache_expires_at
            `)
          );
          console.log(`[Save Website Data] ✅ Cached ${competitors.length} competitors`);
        }

        console.log('[Save Website Data] ✅ DataForSEO metrics update completed');
      } catch (metricsError: any) {
        // 不抛出错误，只记录日志，避免影响保存操作
        console.error('[Save Website Data] ⚠️ Failed to update metrics (non-blocking):', metricsError.message);
      }
    })();

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

