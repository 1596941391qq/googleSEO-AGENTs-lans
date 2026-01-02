/**
 * SE Ranking Domain API 工具
 *
 * 职责：获取域名的整体 SEO 数据（流量、关键词数量、排名分布等）
 * 特点：纯数据获取，无AI逻辑
 *
 * API 文档: https://seranking.com/api-methods/
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
 * 获取域名概览数据
 *
 * @param domain - 域名（例如: example.com）
 * @param location - 搜索地区，默认 'us'
 * @returns 域名概览数据
 */
export async function getDomainOverview(
  domain: string,
  location: string = 'us'
): Promise<DomainOverview | null> {
  try {
    console.log(`[SE Ranking Domain] Getting overview for ${domain}`);

    // Remove protocol and path if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const response = await fetch(
      `${SERANKING_BASE_URL}/v1/domain/overview?domain=${cleanDomain}&region=${location}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${SERANKING_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`[SE Ranking Domain] No data found for domain: ${cleanDomain}`);
        return null;
      }
      const errorText = await response.text();
      console.error('[SE Ranking Domain] API error:', response.status, errorText);
      throw new Error(`SE Ranking Domain API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      domain: cleanDomain,
      organicTraffic: data.organic_traffic || 0,
      paidTraffic: data.paid_traffic || 0,
      totalTraffic: data.total_traffic || 0,
      totalKeywords: data.total_keywords || 0,
      newKeywords: data.new_keywords || 0,
      lostKeywords: data.lost_keywords || 0,
      improvedKeywords: data.improved_keywords || 0,
      declinedKeywords: data.declined_keywords || 0,
      avgPosition: data.avg_position || 0,
      trafficCost: data.traffic_cost || 0,
      rankingDistribution: {
        top3: data.ranking_distribution?.top3 || 0,
        top10: data.ranking_distribution?.top10 || 0,
        top50: data.ranking_distribution?.top50 || 0,
        top100: data.ranking_distribution?.top100 || 0,
      },
    };
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get overview for ${domain}:`, error.message);
    return null;
  }
}

/**
 * 获取域名的关键词排名列表
 *
 * @param domain - 域名
 * @param location - 搜索地区，默认 'us'
 * @param limit - 返回���量限制，默认 100
 * @returns 关键词排名数组
 */
export async function getDomainKeywords(
  domain: string,
  location: string = 'us',
  limit: number = 100
): Promise<DomainKeyword[]> {
  try {
    console.log(`[SE Ranking Domain] Getting keywords for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const response = await fetch(
      `${SERANKING_BASE_URL}/v1/domain/keywords?domain=${cleanDomain}&region=${location}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${SERANKING_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SE Ranking Domain] API error:', response.status, errorText);
      throw new Error(`SE Ranking Domain API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.keywords || []).map((kw: any) => ({
      keyword: kw.keyword,
      currentPosition: kw.current_position || 0,
      previousPosition: kw.previous_position || 0,
      positionChange: (kw.previous_position || 0) - (kw.current_position || 0),
      searchVolume: kw.search_volume || 0,
      cpc: kw.cpc || 0,
      competition: kw.competition || 0,
      difficulty: kw.difficulty || 0,
      trafficPercentage: kw.traffic_percentage || 0,
      url: kw.url || '',
    }));
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get keywords for ${domain}:`, error.message);
    throw error;
  }
}

/**
 * 获取域名的历史排名趋势
 *
 * @param domain - 域名
 * @param location - 搜索地区，默认 'us'
 * @param days - 天数（30, 60, 或 90），默认 30
 * @returns 历史数据点数组
 */
export async function getDomainRankingHistory(
  domain: string,
  location: string = 'us',
  days: number = 30
): Promise<RankingHistoryPoint[]> {
  try {
    console.log(`[SE Ranking Domain] Getting ranking history for ${domain} (${days} days)`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const response = await fetch(
      `${SERANKING_BASE_URL}/v1/domain/history?domain=${cleanDomain}&region=${location}&days=${days}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${SERANKING_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SE Ranking Domain] API error:', response.status, errorText);
      throw new Error(`SE Ranking Domain API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.history || []).map((point: any) => ({
      date: point.date,
      position: point.position || 0,
      traffic: point.traffic || 0,
    }));
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get history for ${domain}:`, error.message);
    throw error;
  }
}

/**
 * 获取域名竞争对手对比
 *
 * @param domain - 域名
 * @param location - 搜索地区，默认 'us'
 * @param limit - 返回数量限制，默认 5
 * @returns 竞争对手数组
 */
export async function getDomainCompetitors(
  domain: string,
  location: string = 'us',
  limit: number = 5
): Promise<DomainCompetitor[]> {
  try {
    console.log(`[SE Ranking Domain] Getting competitors for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const response = await fetch(
      `${SERANKING_BASE_URL}/v1/domain/competitors?domain=${cleanDomain}&region=${location}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${SERANKING_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SE Ranking Domain] API error:', response.status, errorText);
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
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get competitors for ${domain}:`, error.message);
    throw error;
  }
}

/**
 * 批量获取所有域名数据（概览 + 关键词 + 历史 + 竞争对手）
 *
 * @param domain - 域名
 * @param location - 搜索地区，默认 'us'
 * @returns 包含所有数据的对象
 */
export async function getAllDomainData(
  domain: string,
  location: string = 'us'
): Promise<{
  overview: DomainOverview | null;
  keywords: DomainKeyword[];
  history: RankingHistoryPoint[];
  competitors: DomainCompetitor[];
}> {
  try {
    // 并行请求所有数据
    const [overview, keywords, history, competitors] = await Promise.all([
      getDomainOverview(domain, location),
      getDomainKeywords(domain, location, 100).catch(() => []),
      getDomainRankingHistory(domain, location, 30).catch(() => []),
      getDomainCompetitors(domain, location, 5).catch(() => []),
    ]);

    return {
      overview,
      keywords,
      history,
      competitors,
    };
  } catch (error: any) {
    console.error(`[SE Ranking Domain] Failed to get all data for ${domain}:`, error.message);
    throw error;
  }
}
