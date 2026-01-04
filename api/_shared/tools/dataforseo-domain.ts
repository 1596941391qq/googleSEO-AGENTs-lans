/**
 * DataForSEO Domain API 工具
 *
 * 职责：获取域名的整体 SEO 数据（流量、关键词数量、排名分布等）
 * 特点：纯数据获取，无AI逻辑
 *
 * API 文档参考：
 * - Ranked Keywords: https://docs.dataforseo.com/v3/dataforseo_labs-google-ranked_keywords-live/
 * - Competitors Domain: https://docs.dataforseo.com/v3/dataforseo_labs-google-competitors_domain-live/
 * - Domain Metrics: https://docs.dataforseo.com/v3/dataforseo_labs-google-domain_metrics-live/
 *
 * 注意：
 * - DataForSEO Labs API 使用 location_code 而不是 region
 * - 所有请求都通过 fetchWithRetry 处理 429 速率限制错误
 */

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// ============================================
// 类型定义
// ============================================

export interface DomainOverview {
  domain: string;
  organicTraffic: number;
  paidTraffic: number;
  totalTraffic: number;
  totalKeywords: number;
  newKeywords: number;
  lostKeywords: number;
  improvedKeywords: number;
  declinedKeywords: number;
  avgPosition: number;
  trafficCost: number;
  rankingDistribution: {
    top3: number;
    top10: number;
    top50: number;
    top100: number;
  };
  backlinksInfo?: {
    referringDomains: number;
    referringMainDomains: number;
    referringPages: number;
    dofollow: number;
    backlinks: number;
    timeUpdate?: string;
  };
}

export interface DomainKeyword {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  positionChange: number;
  searchVolume: number;
  cpc: number;
  competition: number;
  difficulty: number;
  trafficPercentage: number;
  url: string; // The URL that ranks for this keyword
}

export interface RankingHistoryPoint {
  date: string; // YYYY-MM-DD
  position: number;
  traffic: number;
}

export interface DomainCompetitor {
  domain: string;
  title: string;
  commonKeywords: number;
  organicTraffic: number;
  totalKeywords: number;
  gapKeywords: number; // Keywords they have that we don't
  gapTraffic: number;
}

/**
 * 生成 Basic Auth header
 */
function getAuthHeader(): string {
  const credentials = `${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * 重试请求的辅助函数（处理 429 速率限制错误）
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // 如果是 429 错误且还有重试次数，进行重试
      if (response.status === 429 && attempt < maxRetries - 1) {
        const delay = retryDelay * Math.pow(2, attempt); // 指数退避：1s, 2s, 4s
        console.log(`[DataForSEO Domain] Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // 其他状态码或最后一次尝试，直接返回
      return response;
    } catch (error: any) {
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries - 1) {
        throw error;
      }
      // 否则等待后重试
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 理论上不会到达这里，但为了类型安全
  return await fetch(url, options);
}

/**
 * 获取域名概览数据
 *
 * @param domain - 域名（例如: example.com）
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param filters - 可选的过滤条件数组，例如: [["domain", "like", "%seo%"], "and", ["metrics.organic.pos_1", ">", 200]]
 * @param orderBy - 可选的排序条件，例如: ["metrics.organic.pos_1,desc"]
 * @param limit - 返回数量限制，默认 1
 * @returns 域名概览数据
 */
export async function getDomainOverview(
  domain: string,
  locationCode: number = 2840,
  filters?: any[],
  orderBy?: string[],
  limit: number = 1
): Promise<DomainOverview | null> {
  try {
    console.log(`[DataForSEO Domain] 🔍 Getting overview for ${domain}, location: ${locationCode}`);
    console.log(`[DataForSEO Domain] 🔑 API credentials check:`, {
      hasLogin: !!DATAFORSEO_LOGIN,
      hasPassword: !!DATAFORSEO_PASSWORD,
      loginLength: DATAFORSEO_LOGIN?.length || 0,
    });

    // Remove protocol and path if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Domain Analytics Whois Overview API
      // 参考: https://docs.dataforseo.com/v3/domain_analytics-whois-overview-live
      const endpoint = `${DATAFORSEO_BASE_URL}/domain_analytics/whois/overview/live`;

      // 构建请求体，支持 filters 和 order_by
      const requestBody: any = {
        limit: limit,
      };

      // 添加域名过滤条件
      if (!filters) {
        requestBody.filters = [
          ["domain", "=", cleanDomain]
        ];
      } else {
        requestBody.filters = filters;
      }

      // 添加排序条件
      if (orderBy) {
        requestBody.order_by = orderBy;
      }

      console.log(`[DataForSEO Domain] 📡 Making API request to: ${endpoint}`);
      console.log(`[DataForSEO Domain] 📦 Request body:`, JSON.stringify([requestBody]));
      
      const response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([requestBody]), // DataForSEO API 需要数组格式
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      
      console.log(`[DataForSEO Domain] 📥 API response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[DataForSEO Domain] No data found for domain: ${cleanDomain}`);
          return null;
        }
        const errorText = await response.text();
        console.error('[DataForSEO Domain] API error:', response.status, errorText);
        if (response.status === 429) {
          console.error('[DataForSEO Domain] Rate limit exceeded after retries');
          return null;
        }
        throw new Error(`DataForSEO Domain API error: ${response.status}`);
      }

      const data = await response.json();

      console.log(`[DataForSEO Domain] API Response structure:`, JSON.stringify(data, null, 2).substring(0, 1000));

      // 检查响应结构：tasks[0].result[0].items[]
      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result || !data.tasks[0].result[0]) {
        console.warn('[DataForSEO Domain] No domain data in response');
        return null;
      }

      const resultData = data.tasks[0].result[0];
      
      // 检查是否有 items 数组
      if (!resultData.items || !Array.isArray(resultData.items) || resultData.items.length === 0) {
        console.warn('[DataForSEO Domain] No items in response result');
        return null;
      }

      // 获取第一个匹配的域名数据
      const item = resultData.items[0];
      const metrics = item.metrics;

      if (!metrics) {
        console.warn('[DataForSEO Domain] No metrics data in item');
        return null;
      }

      // 解析 DataForSEO metrics 数据
      const organic = metrics.organic || {};
      const paid = metrics.paid || {};

      // 解析排名分布（根据示例响应，字段是 pos_1, pos_2_3, pos_4_10 等）
      const rankingDistribution = {
        top3: (organic.pos_1 || 0) + (organic.pos_2_3 || 0), // pos_1 + pos_2_3 = top 3
        top10: (organic.pos_1 || 0) + (organic.pos_2_3 || 0) + (organic.pos_4_10 || 0),
        top50: (organic.pos_1 || 0) + (organic.pos_2_3 || 0) + (organic.pos_4_10 || 0) + 
               (organic.pos_11_20 || 0) + (organic.pos_21_30 || 0) + (organic.pos_31_40 || 0) + (organic.pos_41_50 || 0),
        top100: (organic.pos_1 || 0) + (organic.pos_2_3 || 0) + (organic.pos_4_10 || 0) + 
                (organic.pos_11_20 || 0) + (organic.pos_21_30 || 0) + (organic.pos_31_40 || 0) + 
                (organic.pos_41_50 || 0) + (organic.pos_51_60 || 0) + (organic.pos_61_70 || 0) + 
                (organic.pos_71_80 || 0) + (organic.pos_81_90 || 0) + (organic.pos_91_100 || 0),
      };

      // 解析 backlinks_info
      const backlinksInfo = item.backlinks_info ? {
        referringDomains: item.backlinks_info.referring_domains || 0,
        referringMainDomains: item.backlinks_info.referring_main_domains || 0,
        referringPages: item.backlinks_info.referring_pages || 0,
        dofollow: item.backlinks_info.dofollow || 0,
        backlinks: item.backlinks_info.backlinks || 0,
        timeUpdate: item.backlinks_info.time_update,
      } : undefined;

      const result: DomainOverview = {
        domain: item.domain || cleanDomain,
        organicTraffic: organic.etv || 0, // estimated traffic value
        paidTraffic: paid.etv || 0,
        totalTraffic: (organic.etv || 0) + (paid.etv || 0),
        totalKeywords: organic.count || 0,
        newKeywords: organic.new_keywords || 0,
        lostKeywords: organic.lost_keywords || 0,
        improvedKeywords: organic.keywords_positions_up || 0,
        declinedKeywords: organic.keywords_positions_down || 0,
        avgPosition: organic.avg_position || 0,
        trafficCost: organic.estimated_paid_traffic_cost || 0,
        rankingDistribution: rankingDistribution,
        backlinksInfo: backlinksInfo,
      };

      console.log(`[DataForSEO Domain] Parsed overview data:`, {
        totalKeywords: result.totalKeywords,
        totalTraffic: result.totalTraffic,
        rankingDistribution: result.rankingDistribution,
        hasBacklinksInfo: !!result.backlinksInfo,
      });

      return result;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for overview: ${domain}`);
        return null;
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get overview for ${domain}:`, error.message);
    return null;
  }
}

/**
 * 获取域名的关键词排名列表
 *
 * @param domain - 域名
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param limit - 返回数量限制，默认 100
 * @returns 关键词排名数组
 */
export async function getDomainKeywords(
  domain: string,
  locationCode: number = 2840,
  limit: number = 100
): Promise<DomainKeyword[]> {
  try {
    console.log(`[DataForSEO Domain] Getting keywords for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Labs Ranked Keywords API
      const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/ranked_keywords/live`;

      const requestBody = [
        {
          target: cleanDomain,
          location_code: locationCode,
          limit: limit,
        }
      ];

      const response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DataForSEO Domain] API error:', response.status, errorText);
        if (response.status === 404 || response.status === 400) {
          console.log(`[DataForSEO Domain] API endpoint may not be available or parameters incorrect`);
          return [];
        }
        throw new Error(`DataForSEO Domain API error: ${response.status}`);
      }

      const data = await response.json();

      console.log(`[DataForSEO Domain] Keywords API Response structure:`, {
        hasTasks: !!data.tasks,
        tasksCount: data.tasks?.length || 0,
        hasResult: !!data.tasks?.[0]?.result,
        itemsCount: data.tasks?.[0]?.result?.length || 0,
      });

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
        console.warn('[DataForSEO Domain] No keywords in response');
        return [];
      }

      const keywords: DomainKeyword[] = data.tasks[0].result.map((item: any) => ({
        keyword: item.keyword || item.keyword_data?.keyword || '',
        currentPosition: item.ranked_serp_element?.rank_absolute || item.rank_absolute || 0,
        previousPosition: item.previous_rank_absolute || 0,
        positionChange: (item.previous_rank_absolute || 0) - (item.ranked_serp_element?.rank_absolute || item.rank_absolute || 0),
        searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
        cpc: item.keyword_data?.keyword_info?.cpc || 0,
        competition: item.keyword_data?.keyword_info?.competition || 0,
        difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty || 0,
        trafficPercentage: item.etv || 0, // estimated traffic value
        url: item.ranked_serp_element?.url || '',
      }));

      console.log(`[DataForSEO Domain] Parsed ${keywords.length} keywords`);

      return keywords;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for keywords: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get keywords for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 获取域名的历史排名趋势
 *
 * @param domain - 域名
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param days - 天数（30, 60, 或 90），默认 30
 * @returns 历史数据点数组
 */
export async function getDomainRankingHistory(
  domain: string,
  locationCode: number = 2840,
  days: number = 30
): Promise<RankingHistoryPoint[]> {
  try {
    console.log(`[DataForSEO Domain] Getting ranking history for ${domain} (${days} days)`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // DataForSEO Labs 不直接提供历史趋势端点
      // 这里返回空数组，或者可以通过多次调用domain_metrics构建历史数据
      console.log(`[DataForSEO Domain] History endpoint not directly available in DataForSEO Labs`);
      return [];
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for history: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get history for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 获取域名竞争对手对比
 *
 * @param domain - 域名
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param limit - 返回数量限制，默认 5
 * @returns 竞争对手数组
 */
export async function getDomainCompetitors(
  domain: string,
  locationCode: number = 2840,
  limit: number = 5
): Promise<DomainCompetitor[]> {
  try {
    console.log(`[DataForSEO Domain] Getting competitors for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Labs Competitors Domain API
      const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/competitors_domain/live`;

      const requestBody = [
        {
          target: cleanDomain,
          location_code: locationCode,
          limit: limit,
        }
      ];

      const response = await fetchWithRetry(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DataForSEO Domain] API error:', response.status, errorText);
        if (response.status === 404 || response.status === 400) {
          console.log(`[DataForSEO Domain] Competitors endpoint may not be available or parameters incorrect`);
          return [];
        }
        throw new Error(`DataForSEO Domain API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
        console.warn('[DataForSEO Domain] No competitors in response');
        return [];
      }

      const competitors: DomainCompetitor[] = data.tasks[0].result.map((comp: any) => ({
        domain: comp.domain || comp.target || '',
        title: comp.title || comp.domain || '',
        commonKeywords: comp.metrics?.organic?.intersections || 0,
        organicTraffic: comp.metrics?.organic?.etv || 0,
        totalKeywords: comp.metrics?.organic?.count || 0,
        gapKeywords: comp.competitor_metrics?.organic?.count || 0,
        gapTraffic: comp.competitor_metrics?.organic?.etv || 0,
      }));

      console.log(`[DataForSEO Domain] Found ${competitors.length} competitors`);

      return competitors;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for competitors: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get competitors for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 批量获取所有域名数据（概览 + 关键词 + 历史 + 竞争对手）
 *
 * @param domain - 域名
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @returns 包含所有数据的对象
 */
export async function getAllDomainData(
  domain: string,
  locationCode: number = 2840
): Promise<{
  overview: DomainOverview | null;
  keywords: DomainKeyword[];
  history: RankingHistoryPoint[];
  competitors: DomainCompetitor[];
}> {
  const apiStartTime = Date.now();
  const apiTimings: Record<string, number> = {};

  const logApiTiming = (step: string, start: number) => {
    const elapsed = Date.now() - start;
    apiTimings[step] = elapsed;
    console.log(`[DataForSEO Domain] ⏱️  ${step}: ${elapsed}ms`);
    return Date.now();
  };

  try {
    // 串行请求以避免速率限制，每个请求之间延迟 500ms
    // 首先获取概览（最重要）
    const overviewStart = Date.now();
    const overview = await getDomainOverview(domain, locationCode).catch(() => null);
    logApiTiming('获取概览数据', overviewStart);
    await delay(500);

    // 然后获取关键词
    const keywordsStart = Date.now();
    const keywords = await getDomainKeywords(domain, locationCode, 100).catch(() => []);
    logApiTiming(`获取关键词数据 (${keywords.length}个)`, keywordsStart);
    await delay(500);

    // 获取历史数据
    const historyStart = Date.now();
    const history = await getDomainRankingHistory(domain, locationCode, 30).catch(() => []);
    logApiTiming(`获取历史数据 (${history.length}个点)`, historyStart);
    await delay(500);

    // 最后获取竞争对手
    const competitorsStart = Date.now();
    const competitors = await getDomainCompetitors(domain, locationCode, 5).catch(() => []);
    logApiTiming(`获取竞争对手数据 (${competitors.length}个)`, competitorsStart);

    const totalApiTime = Date.now() - apiStartTime;
    console.log(`[DataForSEO Domain] 📊 API 总耗时: ${totalApiTime}ms`);
    Object.entries(apiTimings).forEach(([step, time]) => {
      const percentage = ((time / totalApiTime) * 100).toFixed(1);
      console.log(`[DataForSEO Domain]   ${step}: ${time}ms (${percentage}%)`);
    });

    return {
      overview,
      keywords,
      history,
      competitors,
    };
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get all data for ${domain}:`, error.message);
    // 即使出错也返回部分数据
    return {
      overview: null,
      keywords: [],
      history: [],
      competitors: [],
    };
  }
}
