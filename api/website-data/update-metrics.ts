/**
 * API: 更新网站指标（从 DataForSEO API 和 SE-Ranking Domain API 获取并缓存）
 *
 * 功能：
 * - 优先调用 DataForSEO API 获取域名概览、关键词数据
 * - 调用 SE-Ranking Domain API 获取补充数据（历史、竞争对手等）
 * - 缓存到数据库
 * - 返回最新数据
 *
 * 方法: POST
 * 端点: /api/website-data/update-metrics
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initWebsiteDataTables, sql } from '../lib/database.js';
import {
  getAllDomainData,
  type DomainOverview,
  type DomainKeyword,
  type RankingHistoryPoint,
  type DomainCompetitor,
} from '../_shared/tools/index.js';
import {
  getDomainOverview as getDataForSEODomainOverview,
  getDomainKeywords as getDataForSEODomainKeywords,
  fetchKeywordData as fetchDataForSEOKeywordData,
} from '../_shared/tools/dataforseo.js';

interface UpdateMetricsRequestBody {
  websiteId: string;
  userId?: number;
  region?: string; // 可选：搜索地区，如 'us', 'uk'，空字符串表示全球
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 设置超时控制（Vercel 函数有30秒超时限制）
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 25000; // 25秒，留5秒缓冲

  // 时间统计对象
  const timings: Record<string, number> = {};
  const logTiming = (step: string, start: number) => {
    const elapsed = Date.now() - start;
    timings[step] = elapsed;
    console.log(`[update-metrics] ⏱️  ${step}: ${elapsed}ms`);
    return Date.now();
  };

  try {
    const body = req.body as UpdateMetricsRequestBody;

    if (!body.websiteId) {
      return res.status(400).json({ error: 'websiteId is required' });
    }

    // 获取 user_id
    let userId = body.userId;
    if (!userId) userId = 1;

    // 初始化数据库表
    const stepInitStart = Date.now();
    await initWebsiteDataTables();
    logTiming('Step 0: 初始化数据库表', stepInitStart);

    // ==========================================
    // Step 1: 获取网站信息
    // ==========================================
    const step1Start = Date.now();
    const websiteResult = await sql`
      SELECT
        id,
        website_url,
        website_domain,
        user_id
      FROM user_websites
      WHERE id = ${body.websiteId}
    `;

    if (websiteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Website not found' });
    }

    const website = websiteResult.rows[0];

    // 验证权限
    if (website.user_id !== userId) {
      return res.status(403).json({ error: 'Website does not belong to user' });
    }
    logTiming('Step 1: 获取网站信息', step1Start);

    // ==========================================
    // Step 2: 优先从 DataForSEO API 获取数据
    // ==========================================
    const step2Start = Date.now();
    console.log('[update-metrics] Fetching data from DataForSEO API (primary source)...');

    // 检查是否已经接近超时
    if (Date.now() - startTime > MAX_EXECUTION_TIME - 10000) {
      return res.status(200).json({
        success: false,
        message: 'Operation timeout - please try again with fewer keywords',
        error: 'Execution time limit approaching'
      });
    }

    // 获取地区参数（如果未提供，使用空字符串表示全球）
    const region = body.region || '';
    console.log(`[update-metrics] Fetching data for region: ${region || 'global (default)'}`);

    // 将地区代码转换为 DataForSEO 的位置代码（2840 = United States）
    const locationCode = region === 'us' ? 2840 : 2840; // 默认使用 US，可以根据需要扩展地区映射

    // 初始化 domainData 对象
    const domainData: {
      overview: DomainOverview | null;
      keywords: DomainKeyword[];
      history: RankingHistoryPoint[];
      competitors: DomainCompetitor[];
    } = {
      overview: null,
      keywords: [],
      history: [],
      competitors: [],
    };

    // 优先从 DataForSEO 获取域名概览和关键词
    // 使用 Promise.race 添加超时保护（10秒超时，更快降级）
    const createTimeoutPromise = () => new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('DataForSEO API timeout')), 10000);
    });

    let dataForSEOSuccess = false;

    try {
      console.log('[update-metrics] Attempting to fetch from DataForSEO (10s timeout)...');

      // 获取 DataForSEO 域名概览（带超时保护）
      const overviewPromise = getDataForSEODomainOverview(website.website_domain, locationCode);
      const dataForSEODomainOverview = await Promise.race([
        overviewPromise,
        createTimeoutPromise()
      ]).catch((err) => {
        console.log('[update-metrics] DataForSEO overview timeout or error:', err.message);
        return null;
      });

      if (dataForSEODomainOverview && (dataForSEODomainOverview.organicTraffic > 0 || dataForSEODomainOverview.totalKeywords > 0)) {
        domainData.overview = {
          domain: website.website_domain,
          organicTraffic: dataForSEODomainOverview.organicTraffic || 0,
          paidTraffic: 0,
          totalTraffic: dataForSEODomainOverview.organicTraffic || 0,
          totalKeywords: dataForSEODomainOverview.totalKeywords || 0,
          newKeywords: 0,
          lostKeywords: 0,
          improvedKeywords: 0,
          declinedKeywords: 0,
          avgPosition: dataForSEODomainOverview.avgPosition || 0,
          trafficCost: 0,
          rankingDistribution: {
            top3: 0,
            top10: 0,
            top50: 0,
            top100: 0,
          },
        };
        console.log('[update-metrics] ✅ Successfully fetched overview from DataForSEO:', {
          organicTraffic: domainData.overview.organicTraffic,
          totalKeywords: domainData.overview.totalKeywords,
        });
        dataForSEOSuccess = true;
      } else {
        console.log('[update-metrics] ⚠️ DataForSEO returned no valid overview data (may require paid plan)');
      }

      // 获取 DataForSEO 关键词列表（带超时保护）
      const keywordsListPromise = getDataForSEODomainKeywords(website.website_domain, locationCode, 50);
      const dataForSEOKeywords = await Promise.race([
        keywordsListPromise,
        createTimeoutPromise()
      ]).catch(() => []) as string[];
      console.log(`[update-metrics] DataForSEO returned ${dataForSEOKeywords.length} keywords`);

      // 获取关键词详细信息（只获取前10个，避免超时）
      if (dataForSEOKeywords.length > 0) {
        console.log('[update-metrics] Fetching keyword details from DataForSEO (limited to 10 keywords)...');
        const keywordDetailsPromise = fetchDataForSEOKeywordData(dataForSEOKeywords.slice(0, 10), locationCode);
        const keywordDetails = await Promise.race([
          keywordDetailsPromise,
          createTimeoutPromise()
        ]).catch(() => []) as any[];

        const validKeywords = keywordDetails.filter(kw => kw.is_data_found && kw.volume > 0);
        if (validKeywords.length > 0) {
          domainData.keywords = validKeywords.map(kw => ({
            keyword: kw.keyword,
            currentPosition: 0, // DataForSEO 不提供排名信息
            previousPosition: 0,
            positionChange: 0,
            searchVolume: kw.volume || 0,
            cpc: kw.cpc || 0,
            competition: kw.competition || 0,
            difficulty: kw.difficulty || 0,
            trafficPercentage: 0,
            url: '',
          }));

          console.log(`[update-metrics] ✅ Converted ${domainData.keywords.length} DataForSEO keywords to DomainKeyword format`);
          dataForSEOSuccess = true;
        }
      }
    } catch (error: any) {
      console.error('[update-metrics] ❌ DataForSEO API error:', error.message);
      console.log('[update-metrics] Falling back to SE-Ranking API...');
      // 继续执行，尝试从 SE-Ranking 获取数据
    }

    logTiming('Step 2: 从 DataForSEO API 获取数据', step2Start);

    // ==========================================
    // Step 2.5: 从 SE-Ranking Domain API 获取补充数据（如果 DataForSEO 数据不足）
    // ==========================================
    const step2_5Start = Date.now();

    // 如果 DataForSEO 没有返回有效数据，使用 SE-Ranking 作为主要数据源
    if (!dataForSEOSuccess || !domainData.overview || domainData.keywords.length < 10) {
      console.log('[update-metrics] DataForSEO data insufficient or unavailable, using SE-Ranking as primary source...');

      try {
        const seRankingStart = Date.now();
        const seRankingData = await getAllDomainData(website.website_domain, region);
        console.log(`[update-metrics] SE-Ranking API completed in ${Date.now() - seRankingStart}ms`);

        // 如果 DataForSEO 没有概览数据，使用 SE-Ranking 的数据
        if (!domainData.overview && seRankingData.overview) {
          domainData.overview = seRankingData.overview;
          console.log('[update-metrics] ✅ Using SE-Ranking overview data');
        }

        // 如果 DataForSEO 关键词不足，补充 SE-Ranking 的关键词
        if (domainData.keywords.length < 10 && seRankingData.keywords.length > 0) {
          // 合并关键词，避免重复
          const existingKeywords = new Set(domainData.keywords.map(kw => kw.keyword.toLowerCase()));
          const additionalKeywords = seRankingData.keywords.filter(
            kw => !existingKeywords.has(kw.keyword.toLowerCase())
          );
          domainData.keywords = [...domainData.keywords, ...additionalKeywords.slice(0, 20 - domainData.keywords.length)];
          console.log(`[update-metrics] ✅ Added ${additionalKeywords.length} keywords from SE-Ranking`);
        }

        // SE-Ranking 提供历史数据和竞争对手数据
        domainData.history = seRankingData.history;
        domainData.competitors = seRankingData.competitors;
        console.log(`[update-metrics] ✅ Got ${domainData.history.length} history points and ${domainData.competitors.length} competitors from SE-Ranking`);
      } catch (error: any) {
        console.error('[update-metrics] ❌ SE-Ranking API error:', error.message);
        // 继续执行，使用已有的 DataForSEO 数据
      }
    } else {
      // 即使 DataForSEO 数据充足，也尝试从 SE-Ranking 获取历史数据和竞争对手数据
      console.log('[update-metrics] DataForSEO data sufficient, fetching history/competitors from SE-Ranking...');
      try {
        const seRankingStart = Date.now();
        const seRankingData = await getAllDomainData(website.website_domain, region);
        console.log(`[update-metrics] SE-Ranking API completed in ${Date.now() - seRankingStart}ms`);
        domainData.history = seRankingData.history;
        domainData.competitors = seRankingData.competitors;
        console.log(`[update-metrics] ✅ Got ${domainData.history.length} history points and ${domainData.competitors.length} competitors from SE-Ranking`);
      } catch (error: any) {
        console.error('[update-metrics] ❌ SE-Ranking API error (for history/competitors):', error.message);
      }
    }

    // 最终数据检查
    console.log('[update-metrics] 📊 Final data summary:', {
      hasOverview: !!domainData.overview,
      keywordsCount: domainData.keywords.length,
      historyCount: domainData.history.length,
      competitorsCount: domainData.competitors.length,
    });

    logTiming('Step 2.5: 从 SE-Ranking API 获取补充数据', step2_5Start);

    // 再次检查超时
    if (Date.now() - startTime > MAX_EXECUTION_TIME - 5000) {
      console.warn('[update-metrics] Approaching timeout, skipping keyword caching');
      return res.status(200).json({
        success: true,
        message: 'Overview cached, but keywords skipped due to timeout',
        data: {
          overview: domainData.overview,
          keywordsCount: 0,
          competitorsCount: domainData.competitors.length,
          historyCount: domainData.history.length,
          updatedAt: new Date().toISOString(),
        }
      });
    }

    // ==========================================
    // Step 3: 缓存域名概览数据
    // ==========================================
    const step3Start = Date.now();
    if (domainData.overview) {
      await sql`
        INSERT INTO domain_overview_cache (
          website_id,
          organic_traffic,
          paid_traffic,
          total_traffic,
          total_keywords,
          new_keywords,
          lost_keywords,
          improved_keywords,
          declined_keywords,
          avg_position,
          traffic_cost,
          top3_count,
          top10_count,
          top50_count,
          top100_count,
          data_updated_at,
          cache_expires_at
        ) VALUES (
          ${body.websiteId},
          ${domainData.overview.organicTraffic},
          ${domainData.overview.paidTraffic},
          ${domainData.overview.totalTraffic},
          ${domainData.overview.totalKeywords},
          ${domainData.overview.newKeywords},
          ${domainData.overview.lostKeywords},
          ${domainData.overview.improvedKeywords},
          ${domainData.overview.declinedKeywords},
          ${domainData.overview.avgPosition},
          ${domainData.overview.trafficCost},
          ${domainData.overview.rankingDistribution.top3},
          ${domainData.overview.rankingDistribution.top10},
          ${domainData.overview.rankingDistribution.top50},
          ${domainData.overview.rankingDistribution.top100},
          NOW(),
          NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT (website_id, data_date) DO UPDATE SET
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
          data_updated_at = NOW(),
          cache_expires_at = EXCLUDED.cache_expires_at
      `;
      logTiming('Step 3: 缓存域名概览数据', step3Start);
    } else {
      logTiming('Step 3: 跳过概览缓存（无数据）', step3Start);
    }

    // ==========================================
    // Step 4: 缓存关键词排名数据（只处理前20个，其余由用户选择是否显示）
    // ==========================================
    const step4Start = Date.now();
    if (domainData.keywords && domainData.keywords.length > 0) {
      // 只处理前20个关键词，避免超时
      const MAX_KEYWORDS_TO_CACHE = 20;
      const keywordsToProcess = domainData.keywords.slice(0, MAX_KEYWORDS_TO_CACHE);
      const totalKeywords = domainData.keywords.length;

      if (totalKeywords > MAX_KEYWORDS_TO_CACHE) {
        console.log(`[update-metrics] Caching only first ${MAX_KEYWORDS_TO_CACHE} keywords (total: ${totalKeywords}). Remaining keywords can be loaded on demand.`);
      }

      console.log(`[update-metrics] Caching ${keywordsToProcess.length} keywords...`);

      // 批量插入前20个关键词
      if (keywordsToProcess.length > 0) {
        await Promise.all(
          keywordsToProcess.map(kw => sql`
            INSERT INTO domain_keywords_cache (
              website_id,
              keyword,
              current_position,
              previous_position,
              position_change,
              search_volume,
              cpc,
              competition,
              difficulty,
              traffic_percentage,
              ranking_url,
              data_updated_at,
              cache_expires_at
            ) VALUES (
              ${body.websiteId},
              ${kw.keyword},
              ${kw.currentPosition},
              ${kw.previousPosition},
              ${kw.positionChange},
              ${kw.searchVolume},
              ${kw.cpc},
              ${kw.competition},
              ${kw.difficulty},
              ${kw.trafficPercentage},
              ${kw.url || ''},
              NOW(),
              NOW() + INTERVAL '24 hours'
            )
            ON CONFLICT (website_id, keyword) DO UPDATE SET
              current_position = EXCLUDED.current_position,
              previous_position = EXCLUDED.previous_position,
              position_change = EXCLUDED.position_change,
              search_volume = EXCLUDED.search_volume,
              cpc = EXCLUDED.cpc,
              competition = EXCLUDED.competition,
              difficulty = EXCLUDED.difficulty,
              traffic_percentage = EXCLUDED.traffic_percentage,
              ranking_url = EXCLUDED.ranking_url,
              data_updated_at = NOW(),
              cache_expires_at = EXCLUDED.cache_expires_at
          `)
        );
      }

      logTiming(`Step 4: 缓存 ${keywordsToProcess.length} 个关键词`, step4Start);
    } else {
      logTiming('Step 4: 跳过关键词缓存（无数据）', step4Start);
    }

    // ==========================================
    // Step 5: 缓存竞争对手数据（并行插入优化）
    // ==========================================
    const step5Start = Date.now();
    if (domainData.competitors && domainData.competitors.length > 0) {
      console.log(`[update-metrics] Caching ${domainData.competitors.length} competitors (parallel insert)...`);

      // 并行插入所有竞争对手（数量通常较少）
      await Promise.all(
        domainData.competitors.map(comp => sql`
          INSERT INTO domain_competitors_cache (
            website_id,
            competitor_domain,
            competitor_title,
            common_keywords,
            organic_traffic,
            total_keywords,
            gap_keywords,
            gap_traffic,
            data_updated_at,
            cache_expires_at
          ) VALUES (
            ${body.websiteId},
            ${comp.domain},
            ${comp.title || comp.domain},
            ${comp.commonKeywords},
            ${comp.organicTraffic},
            ${comp.totalKeywords},
            ${comp.gapKeywords},
            ${comp.gapTraffic},
            NOW(),
            NOW() + INTERVAL '7 days'
          )
          ON CONFLICT (website_id, competitor_domain) DO UPDATE SET
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

      logTiming(`Step 5: 缓存 ${domainData.competitors.length} 个竞争对手`, step5Start);
    } else {
      logTiming('Step 5: 跳过竞争对手缓存（无数据）', step5Start);
    }

    // ==========================================
    // Step 6: 更新网站表的最后更新时间
    // ==========================================
    const step6Start = Date.now();
    await sql`
      UPDATE user_websites
      SET updated_at = NOW()
      WHERE id = ${body.websiteId}
    `;
    logTiming('Step 6: 更新网站表', step6Start);

    // 输出总时间统计
    const totalTime = Date.now() - startTime;
    console.log('\n[update-metrics] 📊 ========== 时间统计 ==========');
    Object.entries(timings).forEach(([step, time]) => {
      const percentage = ((time / totalTime) * 100).toFixed(1);
      console.log(`[update-metrics]   ${step}: ${time}ms (${percentage}%)`);
    });
    console.log(`[update-metrics]   总耗时: ${totalTime}ms`);
    console.log(`[update-metrics]   剩余时间: ${MAX_EXECUTION_TIME - totalTime}ms`);
    console.log('[update-metrics] ====================================\n');

    return res.status(200).json({
      success: true,
      message: 'Website metrics updated successfully',
      data: {
        overview: domainData.overview,
        keywordsCount: domainData.keywords.length,
        cachedKeywordsCount: Math.min(20, domainData.keywords.length),
        hasMoreKeywords: domainData.keywords.length > 20,
        competitorsCount: domainData.competitors.length,
        historyCount: domainData.history.length,
        updatedAt: new Date().toISOString(),
      }
    });

  } catch (error: any) {
    console.error('[API: website-data/update-metrics] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to update website metrics',
      details: error.message
    });
  }
}
