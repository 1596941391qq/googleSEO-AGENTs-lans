/**
 * DataForSEO API 工具
 *
 * 职责：获取关键词的真实数据（搜索量、难度、CPC等）
 * 特点：纯数据获取，无AI逻辑
 *
 * API 文档：
 * - Keyword Ideas: https://docs.dataforseo.com/v3/dataforseo_labs-keyword_ideas-live/
 * - Bulk Keyword Difficulty: https://docs.dataforseo.com/v3/dataforseo_labs-google-bulk_keyword_difficulty-live/
 * - Search Volume: https://docs.dataforseo.com/v3/keywords_data-google_ads-search_volume-live/
 *
 * 认证：Basic Auth (Base64 encoded login:password)
 */

export type SearchEngine = 'google' | 'baidu' | 'bing' | 'yandex';

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

/**
 * 将目标语言代码转换为 DataForSEO 的 location_code 和 language_code
 * 
 * @param targetLanguage - 目标语言代码
 * @returns { locationCode: number, languageCode: string }
 */
export function getDataForSEOLocationAndLanguage(targetLanguage: string): { locationCode: number; languageCode: string } {
  // 语言代码映射
  const languageMap: { [key: string]: string } = {
    'en': 'en',
    'zh': 'zh',
    'ru': 'ru',
    'fr': 'fr',
    'ja': 'ja',
    'ko': 'ko',
    'pt': 'pt',
    'id': 'id',
    'es': 'es',
    'ar': 'ar',
  };

  // 位置代码映射（主要市场）
  // 注意：DataForSEO 已暂停对俄罗斯的支持，但我们可以使用其他位置作为替代
  const locationMap: { [key: string]: number } = {
    'en': 2840,  // 美国
    'zh': 2166,  // 中国
    'ru': 2826,  // 俄罗斯（已暂停，但保留代码用于兼容）
    'fr': 2250,  // 法国
    'ja': 2384,  // 日本
    'ko': 2346,  // 韩国
    'pt': 2344,  // 葡萄牙
    'id': 2376,  // 印度尼西亚
    'es': 2756,  // 西班牙
    'ar': 2780,  // 阿拉伯（使用埃及作为代表）
  };

  const languageCode = languageMap[targetLanguage] || 'en';
  const locationCode = locationMap[targetLanguage] || 2840; // 默认美国

  return { locationCode, languageCode };
}

// ============================================
// 类型定义
// ============================================

export interface MonthlySearchData {
  year: number;
  month: number;
  search_volume: number;
}

export interface DataForSEOKeywordData {
  keyword: string;
  is_data_found: boolean;

  // 基础数据
  search_volume?: number;
  cpc?: number;
  competition?: number; // 0-1 scale
  competition_level?: string; // 'LOW', 'MEDIUM', 'HIGH'

  // DataForSEO 独有：关键词难度 (competition_index, 0-100)
  competition_index?: number; // 0-100, 实际的 KD 字段

  // 历史数据 - DataForSEO 提供12个月历史数据
  monthly_searches?: MonthlySearchData[];

  // 出价范围
  low_top_of_page_bid?: number;
  high_top_of_page_bid?: number;

  // 趋势数据（简化版）
  history_trend?: { [date: string]: number }; // 保持与原SE-Ranking兼容
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
 * 批量获取关键词数据（使用 DataForSEO Labs Keyword Ideas API）
 *
 * @param keywords - 关键词数组
 * @param locationCode - 地区代码，默认 2840 (美国)，参考：https://docs.dataforseo.com/v3/appendix/locations
 * @param languageCode - 语言代码，默认 'en'
 * @param engine - 搜索引擎，默认 'google'
 * @param retryCount - 重试次数，默认 3
 * @returns DataForSEO数据数组
 */
export async function fetchDataForSEOData(
  keywords: string[],
  locationCode: number = 2840,
  languageCode: string = 'en',
  engine: SearchEngine = 'google',
  retryCount: number = 3
): Promise<DataForSEOKeywordData[]> {
  const BATCH_SIZE = engine === 'google' ? 100 : 50; // 不同引擎限制不同
  const DELAY_BETWEEN_BATCHES = 1000;

  try {
    console.log(`[DataForSEO] Fetching ${engine} data for ${keywords.length} keywords`);

    if (keywords.length <= BATCH_SIZE) {
      return await fetchBatchWithRetry(keywords, locationCode, languageCode, engine, retryCount);
    }

    const results: DataForSEOKeywordData[] = [];
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      const batchResults = await fetchBatchWithRetry(batch, locationCode, languageCode, engine, retryCount);
      results.push(...batchResults);

      if (i + BATCH_SIZE < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    return results;
  } catch (error: any) {
    console.error(`[DataForSEO] ${engine} API call failed:`, error);
    throw error;
  }
}

/**
 * 获取一批关键词数据（带重试逻辑）
 */
async function fetchBatchWithRetry(
  keywords: string[],
  locationCode: number,
  languageCode: string,
  engine: SearchEngine,
  maxRetries: number
): Promise<DataForSEOKeywordData[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      // 不同搜索引擎对应的端点
      let endpoint = '';
      if (engine === 'google') {
        endpoint = `${DATAFORSEO_BASE_URL}/keywords_data/google_ads/search_volume/live`;
      } else {
        endpoint = `${DATAFORSEO_BASE_URL}/keywords_data/${engine}/search_volume/live`;
      }

      const requestBody = [
        {
          keywords: keywords,
          location_code: locationCode,
          language_code: languageCode,
        }
      ];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // 处理速率限制错误 (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

        console.warn(`[DataForSEO] Rate limited (429). Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          throw new Error(`DataForSEO API rate limit exceeded after ${maxRetries} attempts`);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DataForSEO] API error:', response.status, errorText);
        throw new Error(`DataForSEO API error: ${response.status}`);
      }

      const data = await response.json();

      // 解析响应数据
      // DataForSEO 响应格式：{ tasks: [{ result: [...] }] }
      if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
        console.warn('[DataForSEO] No results in response');
        return keywords.map(kw => ({ keyword: kw, is_data_found: false }));
      }

      const results: DataForSEOKeywordData[] = data.tasks[0].result.map((item: any) => {
        const keyword = item.keyword || '';

        // 转换 monthly_searches 为 history_trend 格式（保持向后兼容）
        const historyTrend: { [date: string]: number } = {};
        if (item.monthly_searches && Array.isArray(item.monthly_searches)) {
          item.monthly_searches.forEach((ms: MonthlySearchData) => {
            const dateKey = `${ms.year}-${String(ms.month).padStart(2, '0')}`;
            historyTrend[dateKey] = ms.search_volume || 0;
          });
        }

        return {
          keyword,
          is_data_found: item.search_volume !== null && item.search_volume !== undefined,
          search_volume: item.search_volume || undefined,
          cpc: item.cpc || undefined,
          competition: item.competition !== undefined ? item.competition : undefined,
          competition_level: item.competition || undefined,
          competition_index: item.competition_index || undefined, // KD 字段
          monthly_searches: item.monthly_searches || undefined,
          low_top_of_page_bid: item.low_top_of_page_bid || undefined,
          high_top_of_page_bid: item.high_top_of_page_bid || undefined,
          history_trend: Object.keys(historyTrend).length > 0 ? historyTrend : undefined,
        };
      });

      return results;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      if (error.name === 'AbortError') {
        console.warn(`[DataForSEO] API timeout (60s) for batch. Retry ${attempt}/${maxRetries}`);
        if (attempt < maxRetries) {
          continue;
        }
      }

      // 如果是速率限制错误且还有重试机会，继续重试
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(`[DataForSEO] Retrying after ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // 如果不是速率限制错误，或者已经达到最大重试次数，抛出错误
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }

  throw lastError || new Error('Failed to fetch DataForSEO data');
}

/**
 * 批量获取关键词难度（使用 DataForSEO Labs Bulk Keyword Difficulty API）
 *
 * @param keywords - 关键词数组（最多1000个）
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param languageCode - 语言代码，默认 'en'
 * @param engine - 搜索引擎，支持 'google' 和 'bing'
 * @returns 关键词难度数据数组
 */
export async function fetchKeywordDifficulty(
  keywords: string[],
  locationCode: number = 2840,
  languageCode: string = 'en',
  engine: SearchEngine = 'google'
): Promise<{ keyword: string; competition_index?: number }[]> {
  // Baidu 和 Yandex 不支持 Bulk Keyword Difficulty API
  if (engine === 'baidu' || engine === 'yandex') {
    return keywords.map(kw => ({ keyword: kw }));
  }

  try {
    console.log(`[DataForSEO] Fetching ${engine} keyword difficulty for ${keywords.length} keywords`);

    const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/${engine}/bulk_keyword_difficulty/live`;

    const requestBody = [
      {
        keywords: keywords.slice(0, 1000), // 限制最多1000个
        location_code: locationCode,
        language_code: languageCode,
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DataForSEO] Keyword difficulty API error:', response.status, errorText);
      throw new Error(`DataForSEO API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.tasks || !data.tasks[0] || !data.tasks[0].result) {
      console.warn('[DataForSEO] No keyword difficulty results');
      return keywords.map(kw => ({ keyword: kw }));
    }

    return data.tasks[0].result.map((item: any) => ({
      keyword: item.keyword || '',
      competition_index: item.competition_index, // DataForSEO 返回的 KD 字段
    }));
  } catch (error: any) {
    console.error('[DataForSEO] Failed to fetch keyword difficulty:', error.message);
    return keywords.map(kw => ({ keyword: kw }));
  }
}

/**
 * 获取单个关键词的 DataForSEO 数据
 *
 * @param keyword - 关键词
 * @param locationCode - 地区代码，默认 2840 (美国)
 * @param languageCode - 语言代码，默认 'en'
 * @returns DataForSEO数据，如果失败返回null
 */
export async function fetchSingleKeywordData(
  keyword: string,
  locationCode: number = 2840,
  languageCode: string = 'en'
): Promise<DataForSEOKeywordData | null> {
  try {
    const results = await fetchDataForSEOData([keyword], locationCode, languageCode);
    return results.length > 0 ? results[0] : null;
  } catch (error: any) {
    console.error(`[DataForSEO] Failed to fetch data for "${keyword}":`, error.message);
    return null;
  }
}

/**
 * 批量获取关键词数据（兼容别名，用于替换 SE Ranking）
 * 
 * 这个函数同时调用 search_volume 和 bulk_keyword_difficulty 两个端点
 * 以获取完整的关键词数据（包括搜索量、CPC、竞争度和关键词难度）
 * 
 * @param keywords - 关键词数组
 * @param locationCode - 位置代码，默认 2840 (美国)
 * @param languageCode - 语言代码，默认 'en'
 * @param engine - 搜索引擎，默认 'google'
 * @returns 关键词数据数组（兼容格式）
 */
export async function fetchKeywordData(
  keywords: string[],
  locationCode: number = 2840,
  languageCode: string = 'en',
  engine: SearchEngine = 'google'
): Promise<Array<{
  keyword: string;
  is_data_found: boolean;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  history_trend?: { [date: string]: number };
}>> {
  try {
    // 并行调用两个 API：search_volume 和 bulk_keyword_difficulty (返回 competition_index 作为 KD)
    const [volumeResults, difficultyResults] = await Promise.all([
      fetchDataForSEOData(keywords, locationCode, languageCode, engine).catch(err => {
        console.warn(`[DataForSEO] Search volume API failed for ${engine}:`, err.message);
        return keywords.map(kw => ({ keyword: kw, is_data_found: false }));
      }),
      fetchKeywordDifficulty(keywords, locationCode, languageCode, engine).catch(err => {
        console.warn(`[DataForSEO] Keyword difficulty API failed for ${engine}:`, err.message);
        return keywords.map(kw => ({ keyword: kw }));
      })
    ]);

    // 创建难度映射表 (使用 competition_index 作为 KD)
    const difficultyMap = new Map<string, number>();
    difficultyResults.forEach(item => {
      if (item.keyword && item.competition_index !== undefined) {
        difficultyMap.set(item.keyword.toLowerCase(), item.competition_index);
      }
    });

    // 合并数据
    return volumeResults.map(data => {
      const keywordLower = data.keyword.toLowerCase();
      const difficulty = difficultyMap.get(keywordLower);

      return {
        keyword: data.keyword,
        is_data_found: data.is_data_found || false,
        volume: data.search_volume, // search_volume -> volume
        cpc: data.cpc,
        competition: data.competition,
        difficulty: difficulty !== undefined ? difficulty : data.competition_index, // 优先使用 competition_index 作为 KD
        history_trend: data.history_trend,
      };
    });
  } catch (error: any) {
    console.error('[DataForSEO] Failed to fetch keyword data:', error.message);
    // 返回空数据而不是抛出错误
    return keywords.map(kw => ({
      keyword: kw,
      is_data_found: false,
    }));
  }
}
