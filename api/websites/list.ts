/**
 * API: 获取用户网站列表
 *
 * 功能：
 * - 获取用户绑定的所有网站
 * - 返回默认网站和最后选择的网站信息
 * - 更新最后访问时间
 *
 * 方法: GET
 * 端点: /api/websites/list
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initUserWebsitesTable, initWebsiteDataTables, sql } from '../lib/database.js';
import { authenticateRequest } from '../_shared/auth.js';

/**
 * 将测试用户 ID 转换为有效的 UUID
 * 开发模式下，测试用户 ID "12345" 会被映射到一个固定的测试 UUID
 */
function getUserIdForQuery(userId: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';

  // 如果是开发模式且 userId 是测试用户 ID，使用固定的测试 UUID
  if (isDevelopment && userId === '12345') {
    // 使用固定的测试用户 UUID: 00000000-0000-0000-0000-000000001234
    // 这样可以将 "12345" 映射到一个有效的 UUID 格式
    return '00000000-0000-0000-0000-000000001234';
  }

  // 验证是否是有效的 UUID 格式
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    // 如果不是有效的 UUID，在开发模式下返回测试 UUID，否则抛出错误
    if (isDevelopment) {
      console.warn(`[websites/list] Invalid UUID format for userId: ${userId}, using test UUID in development mode`);
      return '00000000-0000-0000-0000-000000001234';
    }
    throw new Error(`Invalid UUID format for userId: ${userId}`);
  }

  return userId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 权限校验
    const authResult = await authenticateRequest(req);
    if (!authResult) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const originalUserId = authResult.userId;
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';

    // 开发模式下的测试用户特殊处理
    // 如果 userId 是 "12345" 或不是有效的 UUID，返回空结果（测试用户通常没有数据库记录）
    if (isDevelopment && (originalUserId === '12345' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(originalUserId))) {
      console.log(`[websites/list] Test user detected (userId: ${originalUserId}), returning empty result in development mode`);
      return res.status(200).json({
        success: true,
        data: {
          websites: [],
          currentWebsite: null,
          preferences: {
            defaultWebsiteId: null,
            lastSelectedWebsiteId: null,
            uiSettings: {}
          }
        }
      });
    }

    // 将 userId 转换为适合数据库查询的格式（处理其他情况）
    const userId = getUserIdForQuery(originalUserId);

    // 初始化数据库表
    await initWebsiteDataTables();

    // ==========================================
    // Step 1: 获取用户偏好设置
    // ==========================================
    const preferencesResult = await sql`
      SELECT
        default_website_id,
        last_selected_website_id,
        ui_settings
      FROM user_preferences
      WHERE user_id = ${userId}
    `;

    const preferences = preferencesResult.rows[0] || {
      default_website_id: null,
      last_selected_website_id: null,
      ui_settings: {}
    };

    // ==========================================
    // Step 2: 获取用户网站列表 (带最新数据)
    // ==========================================
    const websitesResult = await sql`
      WITH latest_data AS (
        SELECT DISTINCT ON (website_id)
          website_id,
          organic_traffic,
          total_keywords,
          avg_position,
          top10_count,
          traffic_cost
        FROM domain_overview_cache
        WHERE location_code = 2840
        ORDER BY website_id, data_date DESC, location_code
      )
      SELECT
        w.id,
        w.website_url,
        w.website_domain,
        w.website_title,
        w.website_description,
        w.website_screenshot,
        w.industry,
        COALESCE(ld.organic_traffic, w.monthly_visits) as organic_traffic,
        w.monthly_revenue,
        w.marketing_tools,
        w.is_default,
        w.last_accessed_at,
        w.bound_at,
        w.is_active,
        w.created_at,
        w.updated_at,
        ld.total_keywords,
        ld.avg_position,
        ld.top10_count,
        ld.traffic_cost
      FROM user_websites w
      LEFT JOIN latest_data ld ON w.id = ld.website_id
      WHERE w.user_id = ${userId} AND w.is_active = true
      ORDER BY
        w.is_default DESC,
        w.last_accessed_at DESC NULLS LAST,
        w.created_at DESC
    `;

    const websites = websitesResult.rows.map(row => ({
      id: row.id,
      url: row.website_url,
      domain: row.website_domain,
      title: row.website_title,
      description: row.website_description,
      screenshot: row.website_screenshot,
      industry: row.industry,
      monthlyVisits: row.organic_traffic,
      monthlyRevenue: row.monthly_revenue,
      marketingTools: row.marketing_tools || [],
      isDefault: row.is_default,
      lastAccessedAt: row.last_accessed_at,
      boundAt: row.bound_at,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      keywordsCount: row.total_keywords,
      healthScore: row.avg_position ? Math.max(0, Math.min(100, Math.round(100 - row.avg_position))) : null,
      top10Count: row.top10_count,
      trafficCost: row.traffic_cost
    }));

    // ==========================================
    // Step 3: 检查并自动获取缺失的数据（异步，不阻塞响应）
    // ==========================================
    // 找出没有数据的网站（没有 overview 缓存或数据为空）
    const websitesWithoutData = websites.filter(w =>
      !w.keywordsCount || w.keywordsCount === 0 || !w.monthlyVisits || w.monthlyVisits === 0
    );

    // 异步触发数据获取（不阻塞 API 响应）
    if (websitesWithoutData.length > 0) {
      (async () => {
        for (const website of websitesWithoutData) {
          try {
            console.log(`[websites/list] 🔄 Auto-fetching DataForSEO data for website: ${website.id} (${website.domain})`);

            // 获取网站信息
            const websiteInfo = await sql`
              SELECT website_domain FROM user_websites WHERE id = ${website.id}
            `;

            if (websiteInfo.rows.length === 0 || !websiteInfo.rows[0].website_domain) {
              console.warn(`[websites/list] ⚠️ Website ${website.id} has no domain, skipping`);
              continue;
            }

            const domain = websiteInfo.rows[0].website_domain;
            const regionToLocationCode: { [key: string]: number } = {
              'us': 2840, 'uk': 2826, 'ca': 2124, 'au': 2036,
              'de': 2276, 'fr': 2250, 'jp': 2384, 'cn': 2166,
            };
            const locationCode = regionToLocationCode['us'] || 2840; // 默认使用 US

            // 调用 DataForSEO API 获取数据
            const { getDomainOverview, getDomainKeywords, getDomainCompetitors } = await import('../_shared/tools/dataforseo-domain.js');

            const [overview, keywords, competitors] = await Promise.all([
              getDomainOverview(domain, locationCode).catch((err) => {
                console.error(`[websites/list] Failed to get overview for ${domain}:`, err.message);
                return null;
              }),
              getDomainKeywords(domain, locationCode, 50).catch((err) => {
                console.error(`[websites/list] Failed to get keywords for ${domain}:`, err.message);
                return [];
              }),
              getDomainCompetitors(domain, locationCode, 5).catch((err) => {
                console.error(`[websites/list] Failed to get competitors for ${domain}:`, err.message);
                return [];
              }),
            ]);

            // 缓存概览数据（即使数据为 0 也要保存）
            if (overview !== null && overview !== undefined) {
              await sql`
                INSERT INTO domain_overview_cache (
                  website_id, location_code, data_date, organic_traffic, paid_traffic, total_traffic,
                  total_keywords, new_keywords, lost_keywords, improved_keywords, declined_keywords,
                  avg_position, traffic_cost, top3_count, top10_count, top50_count, top100_count,
                  backlinks_info, data_updated_at, cache_expires_at
                ) VALUES (
                  ${website.id}, ${locationCode}, CURRENT_DATE, ${overview.organicTraffic}, ${overview.paidTraffic}, ${overview.totalTraffic},
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
              console.log(`[websites/list] ✅ Cached overview data for ${domain}:`, {
                websiteId: website.id,
                totalKeywords: overview.totalKeywords,
                organicTraffic: overview.organicTraffic,
                locationCode
              });
            } else {
              console.warn(`[websites/list] ⚠️ No overview data to cache for ${domain} (overview is null)`);
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
                    ${website.id}, ${locationCode}, ${kw.keyword}, ${kw.currentPosition},
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
              console.log(`[websites/list] ✅ Cached ${keywordsToCache.length} keywords for ${domain}`);
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
                    ${website.id}, ${locationCode}, ${comp.domain}, ${comp.title || null},
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
              console.log(`[websites/list] ✅ Cached ${competitors.length} competitors for ${domain}`);
            }
          } catch (error: any) {
            // 不抛出错误，只记录日志，避免影响其他网站
            console.error(`[websites/list] ⚠️ Failed to auto-fetch data for website ${website.id}:`, error.message);
          }
        }
        console.log(`[websites/list] ✅ Auto-fetch completed for ${websitesWithoutData.length} website(s)`);
      })();
    }

    // ==========================================
    // Step 4: 确定当前应该使用的网站
    // ==========================================
    let currentWebsiteId = preferences.last_selected_website_id ||
      preferences.default_website_id ||
      (websites.length > 0 ? websites[0].id : null);

    const currentWebsite = websites.find(w => w.id === currentWebsiteId) ||
      (websites.length > 0 ? websites[0] : null);

    // ==========================================
    // Step 5: 更新最后访问时间
    // ==========================================
    if (currentWebsite) {
      await sql`
        UPDATE user_websites
        SET last_accessed_at = NOW()
        WHERE id = ${currentWebsite.id}
      `;
    }

    return res.status(200).json({
      success: true,
      data: {
        websites,
        currentWebsite,
        preferences: {
          defaultWebsiteId: preferences.default_website_id,
          lastSelectedWebsiteId: preferences.last_selected_website_id,
          uiSettings: preferences.ui_settings
        }
      }
    });

  } catch (error: any) {
    console.error('[API: websites/list] Error:', error);

    // 如果是 UUID 格式错误且是开发模式，返回空结果而不是错误
    if (error?.code === '22P02') {
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_AUTO_LOGIN === 'true';
      if (isDevelopment) {
        console.warn('[API: websites/list] UUID format error in development mode, returning empty result');
        return res.status(200).json({
          success: true,
          data: {
            websites: [],
            currentWebsite: null,
            preferences: {
              defaultWebsiteId: null,
              lastSelectedWebsiteId: null,
              uiSettings: {}
            }
          }
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch websites list',
      details: error.message
    });
  }
}
