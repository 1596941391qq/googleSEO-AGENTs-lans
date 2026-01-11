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
  visibilityScore?: number; // 可见度评分
}

// 排名关键词（增强版，包含 SERP 特性）
export interface RankedKeyword {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  positionChange: number;
  searchVolume: number;
  etv: number; // 预估流量值
  serpFeatures: {
    aiOverview?: boolean;
    featuredSnippet?: boolean;
    peopleAlsoAsk?: boolean;
    relatedQuestions?: boolean;
    video?: boolean;
    image?: boolean;
  };
  url: string;
  cpc?: number;
  competition?: number;
  difficulty?: number; // 关键词难度
}

// 历史排名概览
export interface HistoricalRankOverview {
  date: string; // YYYY-MM-DD
  top1Count: number;
  top3Count: number;
  top10Count: number;
  top50Count: number;
  top100Count: number;
}

// SERP竞争对手
export interface SerpCompetitor {
  keyword: string;
  competitors: Array<{
    domain: string;
    position: number;
    visibility: number;
    title?: string;
  }>;
}

// 域名重合度分析
export interface DomainIntersection {
  targetDomain: string;
  competitorDomain: string;
  commonKeywords: Array<{
    keyword: string;
    ourPosition: number;
    competitorPosition: number;
    searchVolume: number;
  }>;
  gapKeywords: Array<{
    keyword: string;
    competitorPosition: number;
    searchVolume: number;
    etv: number;
  }>;
  ourKeywords: Array<{
    keyword: string;
    ourPosition: number;
    searchVolume: number;
  }>;
  gapTraffic: number;
}

// 相关页面
export interface RelevantPage {
  url: string;
  organicTraffic: number;
  keywordsCount: number;
  avgPosition: number;
  topKeywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
  }>;
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
 * 将 location_code 转换为 location_name 和 language_name
 * 用于 DataForSEO ranked_keywords API
 */
/**
 * 清理关键词：移除数字前缀和ID格式
 * 
 * 移除格式如：
 * - "001-qk7yulqsx9esalil5mxjkg-3342555957" (完整ID格式)
 * - "051 keyword" (编号前缀)
 * - "0 keyword" (单个数字前缀)
 * - "050" (纯数字，如果后面没有有效内容则返回空)
 */
function cleanKeyword(rawKeyword: string): string {
  if (!rawKeyword) return '';
  
  let cleaned = rawKeyword.trim();
  
  // 1. 移除类似 "001-qk7yulqsx9esalil5mxjkg-3342555957" 的完整ID格式
  // 匹配：数字-字母数字-数字 格式（更宽松的匹配）
  cleaned = cleaned.replace(/^\d{1,3}-[a-z0-9-]+-\d+(\s+|$)/i, '');
  
  // 2. 移除开头的数字编号（如 "051 "、"0 "、"09 "、"08 "）
  // 匹配：开头的数字（1-3位）+ 空格，后面跟着字母或中文
  cleaned = cleaned.replace(/^\d{1,3}\s+(?=[a-zA-Z\u4e00-\u9fa5])/, '');
  
  // 3. 移除纯数字开头的项（如果后面有文本，移除数字部分）
  // 匹配：开头的数字（任意长度）+ 空格
  cleaned = cleaned.replace(/^\d+\s+/, '');
  
  // 4. 如果清理后只剩下纯数字（如 "050"、"069"），返回空字符串
  // 因为这些不是有效的关键词
  if (/^\d+$/.test(cleaned)) {
    return '';
  }
  
  // 5. 移除末尾的数字后缀（如果存在）
  // 例如 "keyword 001" -> "keyword"
  cleaned = cleaned.replace(/\s+\d{1,3}$/, '');
  
  return cleaned.trim();
}

function getLocationAndLanguageNames(locationCode: number): { locationName: string; languageName: string } {
  const locationMap: { [key: number]: { location: string; language: string } } = {
    2840: { location: 'United States', language: 'English' },
    2826: { location: 'United Kingdom', language: 'English' },
    2124: { location: 'Canada', language: 'English' },
    2036: { location: 'Australia', language: 'English' },
    2276: { location: 'Germany', language: 'German' },
    2250: { location: 'France', language: 'French' },
    2384: { location: 'Japan', language: 'Japanese' },
    2166: { location: 'China', language: 'Chinese' },
    2346: { location: 'South Korea', language: 'Korean' },
    2344: { location: 'Portugal', language: 'Portuguese' },
    2376: { location: 'Indonesia', language: 'Indonesian' },
    2756: { location: 'Spain', language: 'Spanish' },
  };

  const mapped = locationMap[locationCode] || { location: 'United States', language: 'English' };
  return {
    locationName: mapped.location,
    languageName: mapped.language,
  };
}

/**
 * 批量获取域名概览数据
 * 
 * @param domains - 域名数组
 * @param locationCode - 地区代码
 * @returns 域名与数据的映射
 */
export async function getBatchDomainOverview(
  domains: string[],
  locationCode: number = 2840
): Promise<Map<string, DomainOverview>> {
  const domainMap = new Map<string, DomainOverview>();
  if (domains.length === 0) return domainMap;

  // 去重并清洗域名
  const uniqueDomains = Array.from(new Set(
    domains
      .filter(d => typeof d === 'string' && d.trim().length > 0)
      .map(d => {
        let cleaned = d.trim().toLowerCase();
        // 移除协议
        cleaned = cleaned.replace(/^(https?:)?\/\//, '');
        // 移除路径和查询参数
        cleaned = cleaned.split('/')[0].split('?')[0].split('#')[0];
        // 移除可能的端口号
        cleaned = cleaned.split(':')[0];
        return cleaned;
      })
      .filter(d => d.length > 0 && d.includes('.')) // 确保是有效的域名格式
  ));
  
  // DataForSEO API 通常限制一次 100 个任务
  const BATCH_SIZE = 50;
  
  for (let i = 0; i < uniqueDomains.length; i += BATCH_SIZE) {
    const chunk = uniqueDomains.slice(i, i + BATCH_SIZE);
    const requestBodies = chunk.map(domain => ({
      filters: [["domain", "=", domain]],
      limit: 1
    }));

    try {
      const endpoint = `${DATAFORSEO_BASE_URL}/domain_analytics/whois/overview/live`;
      const response = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBodies),
      });

      if (!response.ok) {
        console.warn(`[DataForSEO Domain] Batch API error: ${response.status}`);
        continue;
      }

      const data = await response.json();
      if (!data.tasks) continue;

      data.tasks.forEach((task: any, index: number) => {
        if (task.result && task.result[0] && task.result[0].items && task.result[0].items[0]) {
          const item = task.result[0].items[0];
          const metrics = item.metrics;
          if (!metrics) return;

          const organic = metrics.organic || {};
          const pos1 = Number(organic.pos_1) || 0;
          const pos2_3 = Number(organic.pos_2_3) || 0;
          const pos4_10 = Number(organic.pos_4_10) || 0;

          // 简单计算一个类似 DR 的值 (0-100)
          // DataForSEO 没有直接 DR，我们使用引用域名数和流量来估算
          const referringDomains = Number(item.backlinks_info?.referring_domains) || 0;
          const dr = Math.min(Math.round(Math.log10(referringDomains + 1) * 15), 100);

          domainMap.set(chunk[index], {
            domain: chunk[index],
            organicTraffic: Number(organic.etv) || 0,
            paidTraffic: 0,
            totalTraffic: Number(organic.etv) || 0,
            totalKeywords: Number(organic.count) || 0,
            newKeywords: 0,
            lostKeywords: 0,
            improvedKeywords: 0,
            declinedKeywords: 0,
            avgPosition: 0,
            trafficCost: 0,
            rankingDistribution: {
              top3: pos1 + pos2_3,
              top10: pos1 + pos2_3 + pos4_10,
              top50: 0,
              top100: 0
            },
            // 扩展字段，用于存储计算出的 DR
            backlinksInfo: {
              referringDomains,
              referringMainDomains: referringDomains,
              referringPages: Number(item.backlinks_info?.referring_pages) || 0,
              dofollow: 0,
              backlinks: Number(item.backlinks_info?.backlinks) || 0,
            }
          } as any);
          
          // 给对象手动添加计算好的 dr
          const entry = domainMap.get(chunk[index]);
          if (entry) (entry as any).dr = dr;
        }
      });
    } catch (error) {
      console.error(`[DataForSEO Domain] Batch API failed:`, error);
    }
  }

  return domainMap;
}

/**
 * 带重试机制的 fetch 函数
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 为每个尝试添加 60s 超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

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
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.warn(`[DataForSEO Domain] API timeout (60s) for ${url}. Attempt ${attempt + 1}/${maxRetries}`);
        if (attempt < maxRetries - 1) {
          continue;
        }
      }

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
 * 使用 DataForSEO Labs Domain Metrics API 获取域名概览（回退方案）
 *
 * @param domain - 域名（例如: example.com）
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @returns 域名概览数据
 */
async function getDomainOverviewFromLabs(
  domain: string,
  locationCode: number = 2840
): Promise<DomainOverview | null> {
  try {
    console.log(`[DataForSEO Domain] 🔄 Trying Labs Domain Metrics API for ${domain}`);
    
    const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/domain_metrics/live`;
    
    const requestBody = [
      {
        target: domain,
        location_code: locationCode,
        language_code: 'en',
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
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
        console.warn(`[DataForSEO Domain] Labs Domain Metrics API returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result || !data.tasks[0].result[0]) {
        console.warn('[DataForSEO Domain] No data in Labs API response');
        return null;
      }

      const resultData = data.tasks[0].result[0];
      
      // Labs API 可能返回不同的数据结构
      if (!resultData.metrics) {
        console.warn('[DataForSEO Domain] No metrics in Labs API response');
        return null;
      }

      const metrics = resultData.metrics;
      const organic = metrics.organic || {};
      const paid = metrics.paid || {};

      // 解析排名分布
      const pos1 = Number(organic.pos_1) || 0;
      const pos2_3 = Number(organic.pos_2_3) || 0;
      const pos4_10 = Number(organic.pos_4_10) || 0;
      const pos11_20 = Number(organic.pos_11_20) || 0;
      const pos21_30 = Number(organic.pos_21_30) || 0;
      const pos31_40 = Number(organic.pos_31_40) || 0;
      const pos41_50 = Number(organic.pos_41_50) || 0;
      const pos51_60 = Number(organic.pos_51_60) || 0;
      const pos61_70 = Number(organic.pos_61_70) || 0;
      const pos71_80 = Number(organic.pos_71_80) || 0;
      const pos81_90 = Number(organic.pos_81_90) || 0;
      const pos91_100 = Number(organic.pos_91_100) || 0;

      const rankingDistribution = {
        top3: pos1 + pos2_3,
        top10: pos1 + pos2_3 + pos4_10,
        top50: pos1 + pos2_3 + pos4_10 + pos11_20 + pos21_30 + pos31_40 + pos41_50,
        top100: pos1 + pos2_3 + pos4_10 + pos11_20 + pos21_30 + pos31_40 + 
                pos41_50 + pos51_60 + pos61_70 + pos71_80 + pos81_90 + pos91_100,
      };

      const totalKeywords = Number(organic.count) || 0;
      let avgPosition = 0;
      if (totalKeywords > 0) {
        const weightedSum = 
          pos1 * 1 +
          pos2_3 * 2.5 +
          pos4_10 * 7 +
          pos11_20 * 15.5 +
          pos21_30 * 25.5 +
          pos31_40 * 35.5 +
          pos41_50 * 45.5 +
          pos51_60 * 55.5 +
          pos61_70 * 65.5 +
          pos71_80 * 75.5 +
          pos81_90 * 85.5 +
          pos91_100 * 95.5;
        avgPosition = weightedSum / totalKeywords;
      }

      const result: DomainOverview = {
        domain: resultData.target || domain,
        organicTraffic: Number(organic.etv) || 0,
        paidTraffic: Number(paid.etv) || 0,
        totalTraffic: (Number(organic.etv) || 0) + (Number(paid.etv) || 0),
        totalKeywords: totalKeywords,
        newKeywords: 0,
        lostKeywords: 0,
        improvedKeywords: 0,
        declinedKeywords: 0,
        avgPosition: avgPosition,
        trafficCost: Number(organic.estimated_paid_traffic_cost) || 0,
        rankingDistribution: rankingDistribution,
        backlinksInfo: undefined, // Labs API 可能不提供反向链接信息
      };

      console.log(`[DataForSEO Domain] ✅ Successfully retrieved data from Labs API`);
      return result;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Labs API request timeout`);
        return null;
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Labs API fallback failed:`, error.message);
    return null;
  }
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
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        console.error('[DataForSEO Domain] API error:', response.status, errorText);
        if (response.status === 429) {
          return null;
        }
        throw new Error(`DataForSEO Domain API error: ${response.status}`);
      }

      const data = await response.json();

      // 检查响应结构：tasks[0].result[0].items[]
      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result || !data.tasks[0].result[0]) {
        return null;
      }

      const resultData = data.tasks[0].result[0];
      
      // 检查是否有 items 数组
      // items 可能为 null、undefined、空数组，或不是数组
      if (!resultData.items || !Array.isArray(resultData.items) || resultData.items.length === 0) {
        console.log(`[DataForSEO Domain] ℹ️ Domain ${cleanDomain} not found in database. This is common for new or untracked sites.`);
        
        // 尝试使用 DataForSEO Labs Domain Metrics API 作为回退
        try {
          console.log(`[DataForSEO Domain] 🔄 Trying Labs Domain Metrics API for ${cleanDomain}...`);
          return await getDomainOverviewFromLabs(cleanDomain, locationCode);
        } catch (labsError: any) {
          // Fallback also failed, but don't log as error to avoid noise
          return null;
        }
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
      const pos1 = Number(organic.pos_1) || 0;
      const pos2_3 = Number(organic.pos_2_3) || 0;
      const pos4_10 = Number(organic.pos_4_10) || 0;
      const pos11_20 = Number(organic.pos_11_20) || 0;
      const pos21_30 = Number(organic.pos_21_30) || 0;
      const pos31_40 = Number(organic.pos_31_40) || 0;
      const pos41_50 = Number(organic.pos_41_50) || 0;
      const pos51_60 = Number(organic.pos_51_60) || 0;
      const pos61_70 = Number(organic.pos_61_70) || 0;
      const pos71_80 = Number(organic.pos_71_80) || 0;
      const pos81_90 = Number(organic.pos_81_90) || 0;
      const pos91_100 = Number(organic.pos_91_100) || 0;

      const rankingDistribution = {
        top3: pos1 + pos2_3, // pos_1 + pos_2_3 = top 3
        top10: pos1 + pos2_3 + pos4_10,
        top50: pos1 + pos2_3 + pos4_10 + pos11_20 + pos21_30 + pos31_40 + pos41_50,
        top100: pos1 + pos2_3 + pos4_10 + pos11_20 + pos21_30 + pos31_40 + 
                pos41_50 + pos51_60 + pos61_70 + pos71_80 + pos81_90 + pos91_100,
      };

      // 计算平均排名（加权平均）
      // 使用排名区间的中位数作为权重：pos_1=1, pos_2_3=2.5, pos_4_10=7, pos_11_20=15.5, etc.
      const totalKeywords = Number(organic.count) || 0;
      let avgPosition = 0;
      if (totalKeywords > 0) {
        const weightedSum = 
          pos1 * 1 +                                    // 第1名
          pos2_3 * 2.5 +                                // 第2-3名，中位数2.5
          pos4_10 * 7 +                                 // 第4-10名，中位数7
          pos11_20 * 15.5 +                             // 第11-20名，中位数15.5
          pos21_30 * 25.5 +                             // 第21-30名，中位数25.5
          pos31_40 * 35.5 +                             // 第31-40名，中位数35.5
          pos41_50 * 45.5 +                             // 第41-50名，中位数45.5
          pos51_60 * 55.5 +                             // 第51-60名，中位数55.5
          pos61_70 * 65.5 +                             // 第61-70名，中位数65.5
          pos71_80 * 75.5 +                             // 第71-80名，中位数75.5
          pos81_90 * 85.5 +                             // 第81-90名，中位数85.5
          pos91_100 * 95.5;                             // 第91-100名，中位数95.5
        avgPosition = weightedSum / totalKeywords;
      }

      // 解析 backlinks_info
      const backlinksInfo = item.backlinks_info ? {
        referringDomains: Number(item.backlinks_info.referring_domains) || 0,
        referringMainDomains: Number(item.backlinks_info.referring_main_domains) || 0,
        referringPages: Number(item.backlinks_info.referring_pages) || 0,
        dofollow: Number(item.backlinks_info.dofollow) || 0,
        backlinks: Number(item.backlinks_info.backlinks) || 0,
        timeUpdate: item.backlinks_info.time_update,
      } : undefined;

      // 注意：domain_analytics/whois/overview API 不提供以下字段：
      // - new_keywords (新增关键词)
      // - lost_keywords (丢失关键词)
      // - keywords_positions_up (提升关键词)
      // - keywords_positions_down (下降关键词)
      // 这些字段需要历史数据对比，whois/overview API 只提供当前快照
      // 如果需要这些数据，需要使用其他 API 端点或历史数据对比

      const result: DomainOverview = {
        domain: item.domain || cleanDomain,
        organicTraffic: Number(organic.etv) || 0, // estimated traffic value
        paidTraffic: Number(paid.etv) || 0,
        totalTraffic: (Number(organic.etv) || 0) + (Number(paid.etv) || 0),
        totalKeywords: totalKeywords,
        newKeywords: 0, // whois/overview API 不提供此字段
        lostKeywords: 0, // whois/overview API 不提供此字段
        improvedKeywords: 0, // whois/overview API 不提供此字段
        declinedKeywords: 0, // whois/overview API 不提供此字段
        avgPosition: avgPosition, // 计算得出，而非直接读取
        trafficCost: Number(organic.estimated_paid_traffic_cost) || 0, // 单位：美元
        rankingDistribution: rankingDistribution,
        backlinksInfo: backlinksInfo,
      };

      // 验证关键数据是否存在
      if (result.totalKeywords === 0 && result.totalTraffic === 0) {
        console.warn('[DataForSEO Domain] ⚠️ Warning: Both totalKeywords and totalTraffic are 0, data might be incomplete');
      }

      return result;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return null;
      }
      throw fetchError;
    }
  } catch (error: any) {
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
    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Labs Keywords For Site API
      // 参考: https://docs.dataforseo.com/v3/dataforseo_labs-google-keywords_for_site-live
      const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/keywords_for_site/live`;

      const requestBody = [
        {
          target: cleanDomain,
          language_code: 'en', // 默认英语，可以根据需要调整
          location_code: locationCode,
          include_serp_info: true,
          include_subdomains: true,
          filters: ["serp_info.se_results_count", ">", 0], // 只返回有搜索结果的关键词
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
        if (response.status === 404 || response.status === 400) {
          return [];
        }
        throw new Error(`DataForSEO Domain API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[DataForSEO Domain] Response structure:', {
        hasTasks: !!data.tasks,
        tasksCount: data.tasks?.length || 0,
        hasResult: !!data.tasks?.[0]?.result,
        resultCount: data.tasks?.[0]?.result?.length || 0,
        hasItems: !!data.tasks?.[0]?.result?.[0]?.items,
        itemsCount: data.tasks?.[0]?.result?.[0]?.items?.length || 0,
        firstItem: data.tasks?.[0]?.result?.[0]?.items?.[0] ? JSON.stringify(data.tasks[0].result[0].items[0], null, 2).substring(0, 500) : 'none',
      });

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result || !data.tasks[0].result[0]) {
        console.warn('[DataForSEO Domain] No keywords in response');
        return [];
      }

      const resultData = data.tasks[0].result[0];
      const items = resultData.items || [];

      if (!Array.isArray(items) || items.length === 0) {
        console.warn('[DataForSEO Domain] No items in response');
        return [];
      }

      const keywords: DomainKeyword[] = items.map((item: any) => {
        // 从新 API 响应格式中提取数据
        const rawKeyword = item.keyword || '';
        const keyword = cleanKeyword(rawKeyword);
        const keywordInfo = item.keyword_info || {};
        const keywordProperties = item.keyword_properties || {};
        const serpInfo = item.serp_info || {};
        
        // 搜索量
        const searchVolume = keywordInfo.search_volume || 0;
        
        // CPC
        const cpc = keywordInfo.cpc || 0;
        
        // 竞争度
        const competition = keywordInfo.competition || 0;
        
        // 关键词难度 (competition_index)
        const difficulty = keywordProperties.competition_index || 0;
        
        // 排名信息 - 新 API 不直接提供排名，需要通过 SERP 信息推断
        // 如果 serp_info 中有排名信息，使用它；否则设为 0
        const currentPosition = item.rank_absolute || 
                               item.rank || 
                               serpInfo.rank ||
                               0;
        
        const previousPosition = item.previous_rank_absolute || 
                                item.previous_rank ||
                                0;
        
        // 预估流量值 (ETV) - 新 API 可能不直接提供，使用搜索量作为近似
        const trafficPercentage = item.etv || 
                                 item.estimated_traffic_value ||
                                 searchVolume * 0.1; // 简单估算
        
        // URL - 新 API 可能不直接提供排名 URL
        const url = item.url || 
                   item.ranked_serp_element?.url ||
                   serpInfo.check_url ||
                   '';

        return {
          keyword: keyword,
          currentPosition: Number(currentPosition) || 0,
          previousPosition: Number(previousPosition) || 0,
          positionChange: Number(previousPosition) - Number(currentPosition),
          searchVolume: Number(searchVolume) || 0,
          cpc: Number(cpc) || 0,
          competition: Number(competition) || 0,
          difficulty: Number(difficulty) || 0,
          trafficPercentage: Number(trafficPercentage) || 0,
          url: url,
        };
      }).filter((kw: DomainKeyword) => {
        // 过滤掉空关键词和纯数字关键词
        const cleaned = kw.keyword && kw.keyword.trim();
        return cleaned && cleaned.length > 0 && !/^\d+$/.test(cleaned);
      });

      console.log(`[DataForSEO Domain] ✅ Parsed ${keywords.length} keywords (filtered from ${items.length} items)`);
      
      if (keywords.length > 0) {
        console.log(`[DataForSEO Domain] Sample keyword:`, {
          keyword: keywords[0].keyword,
          position: keywords[0].currentPosition,
          volume: keywords[0].searchVolume,
          difficulty: keywords[0].difficulty,
        });
        // 如果清理后的关键词与原始关键词不同，记录警告
        const firstItem = items[0];
        if (firstItem && firstItem.keyword && cleanKeyword(firstItem.keyword) !== firstItem.keyword) {
          console.log(`[DataForSEO Domain] ⚠️ Cleaned keyword prefix: "${firstItem.keyword}" -> "${keywords[0].keyword}"`);
        }
      } else {
        console.warn(`[DataForSEO Domain] ⚠️ No valid keywords found after parsing`);
      }

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
 * 通过反向链接自动发现竞争对手
 *
 * @param domain - 域名
 * @param limit - 返回数量限制，默认 10
 * @returns 竞争对手域名数组
 */
export async function discoverCompetitorsByBacklinks(
  domain: string,
  limit: number = 10
): Promise<string[]> {
  try {
    console.log(`[DataForSEO Domain] Discovering competitors by backlinks for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Backlinks Competitors API 自动发现竞争对手
      const endpoint = `${DATAFORSEO_BASE_URL}/backlinks/competitors/live`;

      const requestBody = [
        {
          target: cleanDomain,
          limit: limit,
          filters: ["intersections", ">", 10], // 至少10个共同反向链接（格式：一维数组 ["字段", "操作符", 值]）
          order_by: ["rank,desc"], // 按排名降序（格式：字符串数组，每个元素是 "字段,排序"）
        }
      ];

      console.log(`[DataForSEO Domain] 📡 Making backlinks competitors API request to: ${endpoint}`);

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
        console.error('[DataForSEO Domain] Backlinks competitors API error:', response.status, errorText);
        if (response.status === 404 || response.status === 400) {
          console.log(`[DataForSEO Domain] Backlinks competitors API not available`);
          return [];
        }
        throw new Error(`DataForSEO Backlinks Competitors API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
        console.warn('[DataForSEO Domain] No backlinks competitors in response');
        return [];
      }

      // 解析响应：result[0].items[]
      const resultData = data.tasks[0].result[0] || {};
      const items = resultData.items || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        console.warn('[DataForSEO Domain] No items in backlinks competitors response');
        return [];
      }
      
      const competitors = items.map((item: any) => {
        return item.target || item.domain || '';
      }).filter((domain: string) => domain && domain !== cleanDomain); // 过滤掉空值和目标域名本身

      console.log(`[DataForSEO Domain] ✅ Discovered ${competitors.length} competitors by backlinks`);
      return competitors;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for backlinks competitors: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to discover competitors by backlinks for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 获取域名竞争对手（通过反向链接）
 *
 * @param domain - 域名
 * @param locationCode - 地区代码（已废弃，保留以兼容）
 * @param limit - 返回数量限制，默认 5
 * @param intersectingDomains - 已废弃，不再使用
 * @returns 竞争对手数组
 */
export async function getDomainCompetitors(
  domain: string,
  locationCode: number = 2840,
  limit: number = 5,
  intersectingDomains?: string[]
): Promise<DomainCompetitor[]> {
  try {
    console.log(`[DataForSEO Domain] Getting competitors via backlinks for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // Add timeout control (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 直接使用 DataForSEO Backlinks Competitors API
      const endpoint = `${DATAFORSEO_BASE_URL}/backlinks/competitors/live`;

      const requestBody = [
        {
          target: cleanDomain,
          limit: limit,
          filters: ["intersections", ">", 10], // 至少10个共同反向链接
          order_by: ["rank,desc"], // 按排名降序
        }
      ];

      console.log(`[DataForSEO Domain] 📡 Making backlinks competitors API request to: ${endpoint}`);

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
        console.error('[DataForSEO Domain] Backlinks competitors API error:', response.status, errorText);
        if (response.status === 404 || response.status === 400) {
          console.log(`[DataForSEO Domain] Backlinks competitors API returned 404/400`);
          return [];
        }
        throw new Error(`DataForSEO Backlinks Competitors API error: ${response.status}`);
      }

      const data = await response.json();

      // 调试：打印响应结构
      console.log('[DataForSEO Domain] 📥 Backlinks competitors API Response structure:', {
        hasTasks: !!data.tasks,
        tasksCount: data.tasks?.length || 0,
        hasResult: !!data.tasks?.[0]?.result,
        resultCount: data.tasks?.[0]?.result?.length || 0,
        hasItems: !!data.tasks?.[0]?.result?.[0]?.items,
        itemsCount: data.tasks?.[0]?.result?.[0]?.items?.length || 0,
      });

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
        console.warn('[DataForSEO Domain] No backlinks competitors in response');
        return [];
      }

      // 解析响应：result[0].items[]
      const resultData = data.tasks[0].result[0] || {};
      const items = resultData.items || [];
      
      if (!Array.isArray(items) || items.length === 0) {
        console.warn('[DataForSEO Domain] No items in backlinks competitors response');
        return [];
      }

      // 解析 backlinks/competitors API 响应格式
      // 每个 item 包含：
      // - target: 竞争对手域名
      // - rank: 排名
      // - intersections: 共同反向链接数
      // - backlinks: 反向链接数
      // - referring_domains: 引用域名数
      const competitors: DomainCompetitor[] = items.map((item: any, index: number) => {
        const competitorDomain = item.target || item.domain || '';
        
        // backlinks API 返回的数据结构
        const intersections = Number(item.intersections) || 0; // 共同反向链接数
        const backlinks = Number(item.backlinks) || 0; // 反向链接总数
        const referringDomains = Number(item.referring_domains) || 0; // 引用域名数
        
        // 调试日志：打印第一个竞争对手的详细数据
        if (index === 0) {
          console.log('[DataForSEO Domain] 📊 Sample backlinks competitor data:', {
            target: item.target,
            domain: item.domain,
            rank: item.rank,
            intersections: item.intersections,
            backlinks: item.backlinks,
            referring_domains: item.referring_domains,
            itemKeys: Object.keys(item),
          });
        }
        
        // 由于 backlinks API 不提供关键词和流量数据，我们使用反向链接数据作为替代指标
        return {
          domain: competitorDomain,
          title: competitorDomain, // 使用域名作为标题
          commonKeywords: intersections, // 使用共同反向链接数作为共同关键词数的替代
          organicTraffic: backlinks, // 使用反向链接数作为流量的替代指标
          totalKeywords: referringDomains, // 使用引用域名数作为总关键词数的替代
          gapKeywords: 0, // backlinks API 不提供此数据
          gapTraffic: 0, // backlinks API 不提供此数据
          visibilityScore: item.rank || undefined, // 使用 rank 作为可见度评分
        };
      }).filter((comp: DomainCompetitor) => comp.domain && comp.domain !== cleanDomain); // 过滤掉空值和目标域名本身

      console.log(`[DataForSEO Domain] ✅ Found ${competitors.length} competitors via backlinks`);

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

/**
 * 获取排名关键词（增强版，包含 SERP 特性）
 *
 * @param domain - 域名或页面 URL
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param limit - 返回数量限制，默认 100
 * @param includeSerpFeatures - 是否包含 SERP 特性，默认 true
 * @returns 排名关键词数组
 */
export async function getRankedKeywords(
  domain: string,
  locationCode: number = 2840,
  limit: number = 100,
  includeSerpFeatures: boolean = true
): Promise<RankedKeyword[]> {
  try {
    console.log(`[DataForSEO Domain] Getting ranked keywords for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Labs Ranked Keywords API
      const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/ranked_keywords/live`;

      // 获取 location_name 和 language_name
      const { locationName, languageName } = getLocationAndLanguageNames(locationCode);

      const requestBody = [
        {
          target: cleanDomain,
          language_name: languageName,
          location_name: locationName,
          load_rank_absolute: true, // 重要：加载绝对排名数据
          limit: limit,
        }
      ];

      console.log(`[DataForSEO Domain] 📡 Making ranked keywords API request`);

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
        console.error('[DataForSEO Domain] Ranked keywords API error:', response.status, errorText);
        if (response.status === 404 || response.status === 400) {
          // 如果 Labs API 不可用，回退到 Domain Analytics API
          console.log('[DataForSEO Domain] Labs API not available, falling back to Domain Analytics API');
          return await getDomainKeywords(domain, locationCode, limit).then(keywords =>
            keywords.map(kw => ({
              keyword: kw.keyword,
              currentPosition: kw.currentPosition,
              previousPosition: kw.previousPosition,
              positionChange: kw.positionChange,
              searchVolume: kw.searchVolume,
              etv: kw.trafficPercentage,
              serpFeatures: {},
              url: kw.url,
              cpc: kw.cpc,
              competition: kw.competition,
            }))
          );
        }
        throw new Error(`DataForSEO Ranked Keywords API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result || !data.tasks[0].result[0] || !data.tasks[0].result[0].items) {
        console.warn('[DataForSEO Domain] No ranked keywords in response');
        return [];
      }

      // 新接口返回格式：result[0].items 数组
      const items = data.tasks[0].result[0].items || [];
      
      // 调试：检查第一个 item 的结构
      if (items.length > 0) {
        console.log('[DataForSEO Domain] 📊 Sample item structure:', {
          hasKeywordData: !!items[0].keyword_data,
          hasRankedSerpElement: !!items[0].ranked_serp_element,
          keywordDataKeys: items[0].keyword_data ? Object.keys(items[0].keyword_data) : [],
          rankedSerpElementKeys: items[0].ranked_serp_element ? Object.keys(items[0].ranked_serp_element) : [],
          hasSerpItem: !!items[0].ranked_serp_element?.serp_item,
          serpItemKeys: items[0].ranked_serp_element?.serp_item ? Object.keys(items[0].ranked_serp_element.serp_item) : [],
          hasRankAbsolute: items[0].ranked_serp_element?.serp_item?.rank_absolute !== undefined,
          rankAbsolute: items[0].ranked_serp_element?.serp_item?.rank_absolute,
          hasRankChanges: !!items[0].ranked_serp_element?.serp_item?.rank_changes,
        });
      }
      
      const keywords: RankedKeyword[] = items.map((item: any, index: number) => {
        const keywordData = item.keyword_data || {};
        const rawKeyword = keywordData.keyword || '';
        const keyword = cleanKeyword(rawKeyword);
        const keywordInfo = keywordData.keyword_info || {};
        const keywordProperties = keywordData.keyword_properties || {};
        const rankedSerpElement = item.ranked_serp_element || {};
        const serpItem = rankedSerpElement.serp_item || {};
        const rankChanges = serpItem.rank_changes || {};
        
        // 尝试提取排名信息（如果 API 提供）
        // 检查多个可能的路径
        const currentPosition = serpItem.rank_absolute 
          || rankedSerpElement.rank_absolute 
          || item.rank_absolute 
          || null;
        
        const previousPosition = rankChanges.previous_rank_absolute !== null && rankChanges.previous_rank_absolute !== undefined
          ? rankChanges.previous_rank_absolute
          : (rankedSerpElement.previous_rank_absolute !== null && rankedSerpElement.previous_rank_absolute !== undefined
            ? rankedSerpElement.previous_rank_absolute
            : null);
        
        const positionChange = (currentPosition !== null && previousPosition !== null) 
          ? previousPosition - currentPosition 
          : null;
        
        // 调试：打印第一个关键词的排名信息
        if (index === 0) {
          console.log('[DataForSEO Domain] 📊 Sample keyword ranking data:', {
            keyword: keywordData.keyword,
            currentPosition,
            previousPosition,
            positionChange,
            hasRankData: currentPosition !== null || previousPosition !== null,
          });
        }
        
        // 提取搜索量、CPC、难度 (competition_index)
        const searchVolume = keywordInfo.search_volume || 0;
        const cpc = keywordInfo.cpc || undefined;
        const difficulty = keywordProperties.competition_index || undefined;
        const etv = serpItem.etv || 0;
        
        // 提取 URL
        const url = serpItem.url || '';
        
        // 提取 SERP 特性
        const serpItemTypes = rankedSerpElement.serp_item_types || [];
        const serpFeatures = {
          aiOverview: serpItem.type === 'ai_overview_reference' || serpItemTypes.includes('ai_overview'),
          featuredSnippet: serpItem.is_featured_snippet || serpItem.type === 'featured_snippet',
          peopleAlsoAsk: serpItemTypes.includes('people_also_ask'),
          relatedQuestions: false, // 新接口可能没有这个字段
          video: serpItem.is_video || serpItemTypes.includes('video'),
          image: serpItem.is_image || serpItemTypes.includes('images'),
        };
        
        return {
          keyword: keyword || '',
          currentPosition: currentPosition || 0, // 如果没有排名数据，设为 0
          previousPosition: previousPosition || 0,
          positionChange: positionChange || 0, // 如果没有变化数据，设为 0
          searchVolume: searchVolume,
          etv: etv,
          serpFeatures: serpFeatures,
          url: url,
          cpc: cpc,
          competition: keywordInfo.competition || undefined,
          difficulty: difficulty,
        };
      }).filter((kw: RankedKeyword) => {
        // 过滤掉空关键词和纯数字关键词
        const cleaned = kw.keyword && kw.keyword.trim();
        return cleaned && cleaned.length > 0 && !/^\d+$/.test(cleaned);
      });

      console.log(`[DataForSEO Domain] ✅ Parsed ${keywords.length} ranked keywords`);
      return keywords;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for ranked keywords: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get ranked keywords for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 获取历史排名概览
 *
 * @param domain - 域名
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param days - 天数（7, 30, 或 90），默认 30
 * @returns 历史排名概览数组
 */
export async function getHistoricalRankOverview(
  domain: string,
  locationCode: number = 2840,
  days: number = 30
): Promise<HistoricalRankOverview[]> {
  try {
    console.log(`[DataForSEO Domain] Getting historical rank overview for ${domain} (${days} days)`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // DataForSEO 没有直接的历史排名概览 API
      // 通过多次调用 domain_metrics 或从 ranked_keywords 构建历史数据
      // 这里返回空数组，因为需要历史数据存储和对比
      console.log(`[DataForSEO Domain] Historical rank overview API not directly available, returning empty array`);
      console.log(`[DataForSEO Domain] Note: Historical data requires storing snapshots over time`);
      return [];
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for historical rank overview: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get historical rank overview for ${domain}:`, error.message);
    return [];
  }
}

/**
 * 获取 SERP 竞争对手
 *
 * @param keywords - 关键词数组
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @returns SERP 竞争对手数组
 */
export async function getSerpCompetitors(
  keywords: string[],
  locationCode: number = 2840
): Promise<SerpCompetitor[]> {
  try {
    console.log(`[DataForSEO Domain] Getting SERP competitors for ${keywords.length} keywords`);

    if (keywords.length === 0) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

    try {
      // 使用 DataForSEO Labs SERP API 获取每个关键词的搜索结果
      const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/serp/live`;

      const results: SerpCompetitor[] = [];

      // 批量处理关键词（每次最多10个）
      const batchSize = 10;
      for (let i = 0; i < keywords.length; i += batchSize) {
        const batch = keywords.slice(i, i + batchSize);
        
        const requestBody = batch.map(keyword => ({
          keyword: keyword,
          location_code: locationCode,
          language_code: 'en',
          depth: 10, // 获取前10个结果
        }));

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

        if (response.ok) {
          const data = await response.json();
          if (data.tasks && Array.isArray(data.tasks)) {
            data.tasks.forEach((task: any, index: number) => {
              if (task.result && task.result[0]) {
                const serpData = task.result[0];
                const competitors = (serpData.items || []).map((item: any, pos: number) => ({
                  domain: item.domain || item.url || '',
                  position: pos + 1,
                  visibility: 100 - pos * 10, // 简单的可见度计算
                  title: item.title || '',
                }));

                results.push({
                  keyword: batch[index] || '',
                  competitors: competitors,
                });
              }
            });
          }
        }

        // 批次之间延迟，避免速率限制
        if (i + batchSize < keywords.length) {
          await delay(1000);
        }
      }

      clearTimeout(timeoutId);
      console.log(`[DataForSEO Domain] ✅ Parsed SERP competitors for ${results.length} keywords`);
      return results;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for SERP competitors`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get SERP competitors:`, error.message);
    return [];
  }
}

/**
 * 获取域名重合度分析
 *
 * @param targetDomain - 目标域名
 * @param competitorDomain - 竞争对手域名
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @returns 域名重合度分析数据
 */
export async function getDomainIntersection(
  targetDomain: string,
  competitorDomain: string,
  locationCode: number = 2840
): Promise<DomainIntersection | null> {
  try {
    console.log(`[DataForSEO Domain] Getting domain intersection: ${targetDomain} vs ${competitorDomain}`);

    const cleanTarget = targetDomain.replace(/^https?:\/\//, '').split('/')[0];
    const cleanCompetitor = competitorDomain.replace(/^https?:\/\//, '').split('/')[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Labs Domain Intersection API
      const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/domain_intersection/live`;

      const requestBody = [
        {
          target1: cleanTarget,
          target2: cleanCompetitor,
          location_code: locationCode,
          limit: 1000, // 获取最多1000个关键词
        }
      ];

      console.log(`[DataForSEO Domain] 📡 Making domain intersection API request`);

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
        console.error('[DataForSEO Domain] Domain intersection API error:', response.status, errorText);
        if (response.status === 404 || response.status === 400) {
          console.log('[DataForSEO Domain] Domain intersection API not available');
          return null;
        }
        throw new Error(`DataForSEO Domain Intersection API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
        console.warn('[DataForSEO Domain] No domain intersection in response');
        return null;
      }

      const resultData = data.tasks[0].result[0] || {};
      
      // 解析共同关键词
      const commonKeywords = (resultData.common_keywords || []).map((item: any) => ({
        keyword: item.keyword || '',
        ourPosition: Number(item.target1_position) || 0,
        competitorPosition: Number(item.target2_position) || 0,
        searchVolume: Number(item.search_volume) || 0,
      }));

      // 解析 Gap 关键词（对手有而我们没有的）
      const gapKeywords = (resultData.target2_keywords || []).map((item: any) => ({
        keyword: item.keyword || '',
        competitorPosition: Number(item.position) || 0,
        searchVolume: Number(item.search_volume) || 0,
        etv: Number(item.etv) || 0,
      }));

      // 解析我们独有的关键词
      const ourKeywords = (resultData.target1_keywords || []).map((item: any) => ({
        keyword: item.keyword || '',
        ourPosition: Number(item.position) || 0,
        searchVolume: Number(item.search_volume) || 0,
      }));

      const gapTraffic = gapKeywords.reduce((sum: number, kw: any) => sum + (kw.etv || 0), 0);

      const result: DomainIntersection = {
        targetDomain: cleanTarget,
        competitorDomain: cleanCompetitor,
        commonKeywords,
        gapKeywords,
        ourKeywords,
        gapTraffic,
      };

      console.log(`[DataForSEO Domain] ✅ Parsed domain intersection:`, {
        commonKeywords: commonKeywords.length,
        gapKeywords: gapKeywords.length,
        ourKeywords: ourKeywords.length,
        gapTraffic,
      });

      return result;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for domain intersection`);
        return null;
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get domain intersection:`, error.message);
    return null;
  }
}

/**
 * 获取相关页面（表现最好的页面）
 *
 * @param domain - 域名
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param limit - 返回数量限制，默认 20
 * @returns 相关页面数组
 */
export async function getRelevantPages(
  domain: string,
  locationCode: number = 2840,
  limit: number = 20
): Promise<RelevantPage[]> {
  try {
    console.log(`[DataForSEO Domain] Getting relevant pages for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      // 使用 DataForSEO Labs Relevant Pages API
      const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/google/relevant_pages/live`;

      const requestBody = [
        {
          target: cleanDomain,
          location_code: locationCode,
          limit: limit,
        }
      ];

      console.log(`[DataForSEO Domain] 📡 Making relevant pages API request to: ${endpoint}`);

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
        console.error('[DataForSEO Domain] Relevant pages API error:', response.status, errorText);
        if (response.status === 404 || response.status === 400) {
          // 如果 Relevant Pages API 不可用，从 ranked_keywords 中提取页面数据
          console.log('[DataForSEO Domain] Relevant Pages API not available, extracting from ranked keywords');
          const keywords = await getRankedKeywords(domain, locationCode, 500, false);
          
          // 按 URL 分组统计
          const pageMap = new Map<string, RelevantPage>();
          keywords.forEach(kw => {
            if (!kw.url) return;
            
            const existing = pageMap.get(kw.url) || {
              url: kw.url,
              organicTraffic: 0,
              keywordsCount: 0,
              avgPosition: 0,
              topKeywords: [],
            };
            
            existing.organicTraffic += kw.etv;
            existing.keywordsCount += 1;
            existing.avgPosition = (existing.avgPosition * (existing.keywordsCount - 1) + kw.currentPosition) / existing.keywordsCount;
            
            if (existing.topKeywords.length < 5) {
              existing.topKeywords.push({
                keyword: kw.keyword,
                position: kw.currentPosition,
                searchVolume: kw.searchVolume,
              });
            }
            
            pageMap.set(kw.url, existing);
          });
          
          return Array.from(pageMap.values())
            .sort((a, b) => b.organicTraffic - a.organicTraffic)
            .slice(0, limit);
        }
        throw new Error(`DataForSEO Relevant Pages API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
        console.warn('[DataForSEO Domain] No relevant pages in response');
        return [];
      }

      // Labs API 返回格式：result[0].items[]
      const resultData = data.tasks[0].result[0] || {};
      const items = resultData.items || resultData || [];
      
      const pages: RelevantPage[] = (Array.isArray(items) ? items : []).map((item: any) => ({
        url: item.url || item.page || '',
        organicTraffic: Number(item.organic_traffic) || Number(item.etv) || Number(item.metrics?.organic?.etv) || 0,
        keywordsCount: Number(item.keywords_count) || Number(item.metrics?.organic?.count) || 0,
        avgPosition: Number(item.avg_position) || Number(item.metrics?.organic?.avg_position) || 0,
        topKeywords: (item.top_keywords || []).slice(0, 5).map((kw: any) => ({
          keyword: kw.keyword || kw || '',
          position: Number(kw.position) || 0,
          searchVolume: Number(kw.search_volume) || 0,
        })),
      }));

      console.log(`[DataForSEO Domain] ✅ Parsed ${pages.length} relevant pages`);
      return pages;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO Domain] Request timeout for relevant pages: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO Domain] Failed to get relevant pages for ${domain}:`, error.message);
    return [];
  }
}
