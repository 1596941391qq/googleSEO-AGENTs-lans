/**
 * SE Ranking Domain API 工具
 *
 * 职责：获取域名的整体 SEO 数据（流量、关键词数量、排名分布等）
 * 特点：纯数据获取，无AI逻辑
 *
 * API 文档参考：
 * - Domain Overview: https://seranking.com/api/data/domain-analysis/#regional-database
 * - Domain Keywords: https://seranking.com/api/data/domain-analysis/#domain-keywords
 * - History Trends: https://seranking.com/api/data/domain-analysis/#history-trends
 * - Competitors: https://seranking.com/api/data/domain-analysis/#competitors
 *
 * 注意：
 * - keywords 端点使用 `source` 参数
 * - overview, history, competitors 端点使用 `region` 参数
 * - 所有请求都通过 fetchWithRetry 处理 429 速率限制错误
 */

const SERANKING_API_KEY = process.env.SERANKING_API_KEY || 'a3eefe61-1e2b-0939-f0c9-d01d9a957852';
const SERANKING_BASE_URL = 'https://api.seranking.com';

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

// ============================================
// Domain API 函数
// ============================================

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
        console.log(`[SE Ranking Domain] Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
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
 * @param location - 搜索地区，默认 '' (全球)，可选值如 'us', 'uk', 'global' 等
 * @returns 域名概览数据
 */
export async function getDomainOverview(
  domain: string,
  location: string = ''
): Promise<DomainOverview | null> {
  try {
    console.log(`[SE Ranking Domain] Getting overview for ${domain}, region: ${location || 'global (default)'}`);

    // Remove protocol and path if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds for overview - increased from 15s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 构建URL：如果location为空，不传region参数（使用全球数据）
      const url = location 
        ? `${SERANKING_BASE_URL}/v1/domain/overview?domain=${cleanDomain}&region=${location}`
        : `${SERANKING_BASE_URL}/v1/domain/overview?domain=${cleanDomain}`;
      
      console.log(`[SE Ranking Domain] Request URL: ${url}`);

      const response = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${SERANKING_API_KEY}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`[SE Ranking Domain] No data found for domain: ${cleanDomain}`);
          return null;
        }
        const errorText = await response.text();
        console.error('[SE Ranking Domain] API error:', response.status, errorText);
        // 对于 429 错误，返回 null 而不是抛出异常
        if (response.status === 429) {
          console.error('[SE Ranking Domain] Rate limit exceeded after retries');
          return null;
        }
        throw new Error(`SE Ranking Domain API error: ${response.status}`);
      }

      const data = await response.json();
      
      // 添加详细日志查看API实际返回的数据结构
      console.log(`[SE Ranking Domain] API Response structure:`, JSON.stringify(data, null, 2).substring(0, 500));

      // 尝试多种可能的字段名格式（支持snake_case和camelCase）
      const getValue = (obj: any, ...keys: string[]) => {
        for (const key of keys) {
          if (obj?.[key] !== undefined && obj?.[key] !== null) {
            return obj[key];
          }
        }
        return 0;
      };

      // 解析排名分布数据（可能在不同位置）
      let rankingDist = {
        top3: 0,
        top10: 0,
        top50: 0,
        top100: 0,
      };

      if (data.ranking_distribution) {
        rankingDist = {
          top3: getValue(data.ranking_distribution, 'top3', 'top_3', 'top3_count'),
          top10: getValue(data.ranking_distribution, 'top10', 'top_10', 'top10_count'),
          top50: getValue(data.ranking_distribution, 'top50', 'top_50', 'top50_count'),
          top100: getValue(data.ranking_distribution, 'top100', 'top_100', 'top100_count'),
        };
      } else if (data.top3_count !== undefined || data.top3 !== undefined) {
        // 如果排名分布数据在顶层
        rankingDist = {
          top3: getValue(data, 'top3', 'top_3', 'top3_count'),
          top10: getValue(data, 'top10', 'top_10', 'top10_count'),
          top50: getValue(data, 'top50', 'top_50', 'top50_count'),
          top100: getValue(data, 'top100', 'top_100', 'top100_count'),
        };
      }

      const result = {
        domain: cleanDomain,
        organicTraffic: getValue(data, 'organic_traffic', 'organicTraffic', 'organic_traffic_count'),
        paidTraffic: getValue(data, 'paid_traffic', 'paidTraffic', 'paid_traffic_count'),
        totalTraffic: getValue(data, 'total_traffic', 'totalTraffic', 'traffic'),
        totalKeywords: getValue(data, 'total_keywords', 'totalKeywords', 'keywords_count'),
        newKeywords: getValue(data, 'new_keywords', 'newKeywords', 'new_keywords_count'),
        lostKeywords: getValue(data, 'lost_keywords', 'lostKeywords', 'lost_keywords_count'),
        improvedKeywords: getValue(data, 'improved_keywords', 'improvedKeywords', 'improved_keywords_count'),
        declinedKeywords: getValue(data, 'declined_keywords', 'declinedKeywords', 'declined_keywords_count'),
        avgPosition: getValue(data, 'avg_position', 'avgPosition', 'average_position', 'position'),
        trafficCost: getValue(data, 'traffic_cost', 'trafficCost', 'cost'),
        rankingDistribution: rankingDist,
      };

      console.log(`[SE Ranking Domain] Parsed overview data:`, {
        totalKeywords: result.totalKeywords,
        totalTraffic: result.totalTraffic,
        rankingDistribution: result.rankingDistribution,
      });

      return result;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[SE Ranking Domain] Request timeout for overview: ${domain}`);
        return null;
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get overview for ${domain}:`, error.message);
    return null;
  }
}

/**
 * 获取域名的关键词排名列表
 *
 * @param domain - 域名
 * @param location - 搜索地区，默认 '' (全球)，可选值如 'us', 'uk' 等
 * @param limit - 返回���量限制，默认 100
 * @returns 关键词排名数组
 */
export async function getDomainKeywords(
  domain: string,
  location: string = '',
  limit: number = 100
): Promise<DomainKeyword[]> {
  try {
    console.log(`[SE Ranking Domain] Getting keywords for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds for keywords - increased from 20s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 根据文档：/v1/domain/keywords 使用 source 参数
      // 如果location为空，不传source参数（使用全球数据）
      const url = location
        ? `${SERANKING_BASE_URL}/v1/domain/keywords?source=${location}&domain=${cleanDomain}&type=organic&limit=${limit}`
        : `${SERANKING_BASE_URL}/v1/domain/keywords?domain=${cleanDomain}&type=organic&limit=${limit}`;
      
      console.log(`[SE Ranking Domain] Keywords request URL: ${url}`);
      
      const response = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${SERANKING_API_KEY}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SE Ranking Domain] API error:', response.status, errorText);
        // 对于 404 和 400 错误，返回空数组而不是抛出异常
        if (response.status === 404 || response.status === 400) {
          console.log(`[SE Ranking Domain] API endpoint may not be available or parameters incorrect`);
          return [];
        }
        throw new Error(`SE Ranking Domain API error: ${response.status}`);
      }

      const data = await response.json();
      
      // 添加详细日志查看API实际返回的数据结构
      console.log(`[SE Ranking Domain] Keywords API Response structure:`, {
        hasKeywords: !!data.keywords,
        keywordsCount: data.keywords?.length || 0,
        firstKeyword: data.keywords?.[0] ? Object.keys(data.keywords[0]) : null,
        sampleData: data.keywords?.[0] ? JSON.stringify(data.keywords[0]).substring(0, 300) : null,
      });

      // 支持多种可能的字段名格式
      const getKeywordValue = (kw: any, ...keys: string[]) => {
        for (const key of keys) {
          if (kw?.[key] !== undefined && kw?.[key] !== null) {
            return kw[key];
          }
        }
        return 0;
      };

      const keywords = (data.keywords || data.data || []).map((kw: any) => ({
        keyword: kw.keyword || kw.query || '',
        currentPosition: getKeywordValue(kw, 'current_position', 'currentPosition', 'position', 'pos'),
        previousPosition: getKeywordValue(kw, 'previous_position', 'previousPosition', 'prev_position'),
        positionChange: (getKeywordValue(kw, 'previous_position', 'previousPosition', 'prev_position') || 0) - (getKeywordValue(kw, 'current_position', 'currentPosition', 'position', 'pos') || 0),
        searchVolume: getKeywordValue(kw, 'search_volume', 'searchVolume', 'volume', 'search_vol'),
        cpc: getKeywordValue(kw, 'cpc', 'CPC', 'cost_per_click'),
        competition: getKeywordValue(kw, 'competition', 'competition_level', 'comp'),
        difficulty: getKeywordValue(kw, 'difficulty', 'keyword_difficulty', 'kd', 'KD'),
        trafficPercentage: getKeywordValue(kw, 'traffic_percentage', 'trafficPercentage', 'traffic_percent', 'traffic'),
        url: kw.url || kw.landing_page || kw.page || '',
      }));

      console.log(`[SE Ranking Domain] Parsed ${keywords.length} keywords`);
      
      return keywords;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[SE Ranking Domain] Request timeout for keywords: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get keywords for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 获取域名的历史排名趋势
 *
 * @param domain - 域名
 * @param location - 搜索地区，默认 '' (全球)，可选值如 'us', 'uk' 等
 * @param days - 天数（30, 60, 或 90），默认 30
 * @returns 历史数据点数组
 */
export async function getDomainRankingHistory(
  domain: string,
  location: string = '',
  days: number = 30
): Promise<RankingHistoryPoint[]> {
  try {
    console.log(`[SE Ranking Domain] Getting ranking history for ${domain} (${days} days)`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds - increased from 15s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 根据文档：/v1/domain/history 使用 region 参数
      // 如果location为空，不传region参数（使用全球数据）
      const url = location
        ? `${SERANKING_BASE_URL}/v1/domain/history?domain=${cleanDomain}&region=${location}&days=${days}`
        : `${SERANKING_BASE_URL}/v1/domain/history?domain=${cleanDomain}&days=${days}`;
      
      console.log(`[SE Ranking Domain] History request URL: ${url}`);
      
      const response = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${SERANKING_API_KEY}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SE Ranking Domain] API error:', response.status, errorText);
        // 对于 404 和 400 错误，返回空数组而不是抛出异常
        if (response.status === 404 || response.status === 400) {
          console.log(`[SE Ranking Domain] History endpoint may not be available or parameters incorrect`);
          return [];
        }
        throw new Error(`SE Ranking Domain API error: ${response.status}`);
      }

      const data = await response.json();

      return (data.history || []).map((point: any) => ({
        date: point.date,
        position: point.position || 0,
        traffic: point.traffic || 0,
      }));
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[SE Ranking Domain] Request timeout for history: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get history for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 获取域名竞争对手对比
 *
 * @param domain - 域名
 * @param location - 搜索地区，默认 '' (全球)，可选值如 'us', 'uk' 等
 * @param limit - 返回数量限制，默认 5
 * @returns 竞争对手数组
 */
export async function getDomainCompetitors(
  domain: string,
  location: string = '',
  limit: number = 5
): Promise<DomainCompetitor[]> {
  try {
    console.log(`[SE Ranking Domain] Getting competitors for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds - increased from 15s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 根据文档：/v1/domain/competitors 使用 region 参数
      // 如果location为空，不传region参数（使用全球数据）
      const url = location
        ? `${SERANKING_BASE_URL}/v1/domain/competitors?domain=${cleanDomain}&region=${location}&limit=${limit}`
        : `${SERANKING_BASE_URL}/v1/domain/competitors?domain=${cleanDomain}&limit=${limit}`;
      
      console.log(`[SE Ranking Domain] Competitors request URL: ${url}`);
      
      const response = await fetchWithRetry(
        url,
        {
          method: 'GET',
          headers: {
            'Authorization': `Token ${SERANKING_API_KEY}`,
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SE Ranking Domain] API error:', response.status, errorText);
        // 对于 404 和 400 错误，返回空数组而不是抛出异常
        if (response.status === 404 || response.status === 400) {
          console.log(`[SE Ranking Domain] Competitors endpoint may not be available or parameters incorrect`);
          return [];
        }
        throw new Error(`SE Ranking Domain API error: ${response.status}`);
      }

      const data = await response.json();

      return (data.competitors || []).map((comp: any) => ({
        domain: comp.domain,
        title: comp.title || comp.domain,
        commonKeywords: comp.common_keywords || 0,
        organicTraffic: comp.organic_traffic || 0,
        totalKeywords: comp.total_keywords || 0,
        gapKeywords: comp.gap_keywords || 0,
        gapTraffic: comp.gap_traffic || 0,
      }));
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[SE Ranking Domain] Request timeout for competitors: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get competitors for ${domain}:`, error.message);
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
 * @param location - 搜索地区，默认 '' (全球)，可选值如 'us', 'uk', 'global' 等
 * @returns 包含所有数据的对象
 */
export async function getAllDomainData(
  domain: string,
  location: string = ''
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
    console.log(`[SE Ranking Domain] ⏱️  ${step}: ${elapsed}ms`);
    return Date.now();
  };
  
  try {
    // 串行请求以避免速率限制，每个请求之间延迟 500ms
    // 首先获取概览（最重要）
    const overviewStart = Date.now();
    const overview = await getDomainOverview(domain, location).catch(() => null);
    logApiTiming('获取概览数据', overviewStart);
    await delay(500);
    
    // 然后获取关键词
    const keywordsStart = Date.now();
    const keywords = await getDomainKeywords(domain, location, 100).catch(() => []);
    logApiTiming(`获取关键词数据 (${keywords.length}个)`, keywordsStart);
    await delay(500);
    
    // 获取历史数据
    const historyStart = Date.now();
    const history = await getDomainRankingHistory(domain, location, 30).catch(() => []);
    logApiTiming(`获取历史数据 (${history.length}个点)`, historyStart);
    await delay(500);
    
    // 最后获取竞争对手
    const competitorsStart = Date.now();
    const competitors = await getDomainCompetitors(domain, location, 5).catch(() => []);
    logApiTiming(`获取竞争对手数据 (${competitors.length}个)`, competitorsStart);
    
    const totalApiTime = Date.now() - apiStartTime;
    console.log(`[SE Ranking Domain] 📊 API 总耗时: ${totalApiTime}ms`);
    Object.entries(apiTimings).forEach(([step, time]) => {
      const percentage = ((time / totalApiTime) * 100).toFixed(1);
      console.log(`[SE Ranking Domain]   ${step}: ${time}ms (${percentage}%)`);
    });

    return {
      overview,
      keywords,
      history,
      competitors,
    };
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get all data for ${domain}:`, error.message);
    // 即使出错也返回部分数据
    return {
      overview: null,
      keywords: [],
      history: [],
      competitors: [],
    };
  }
}
