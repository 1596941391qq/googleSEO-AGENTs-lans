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

// 静态导入 SE-Ranking 模块（避免动态导入问题）
import { isSERankingAvailable, fetchSERankingData } from './seranking.js';

export type SearchEngine = 'google' | 'baidu' | 'bing' | 'yandex';

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || '';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

/**
 * 将目标语言代码转换为 DataForSEO 的 location_code 和 language_code
 * 
 * 默认使用全球地区（美国 2840），不根据语言代码自动选择地区
 * 
 * @param targetLanguage - 目标语言代码
 * @param useGlobal - 是否使用全球地区（默认 true）
 * @returns { locationCode: number, languageCode: string }
 */
export function getDataForSEOLocationAndLanguage(
  targetLanguage: string,
  useGlobal: boolean = true // 默认使用全球地区
): { locationCode: number; languageCode: string } {
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
  // 默认使用全球地区（美国 2840），不根据语言代码自动选择
  const locationCode = useGlobal ? 2840 : (locationMap[targetLanguage] || 2840);

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
 * 清理关键词：移除无效字符
 * 
 * DataForSEO API 不接受包含某些特殊字符的关键词（如问号、感叹号等）
 * 这些字符会导致 40501 错误："Invalid Field: 'keywords'. Keyword text has invalid characters or symbols"
 * 
 * @param keyword - 原始关键词
 * @returns 清理后的关键词
 */
function sanitizeKeyword(keyword: string): string {
  if (!keyword || !keyword.trim()) {
    return '';
  }

  let cleaned = keyword.trim();

  // 移除或替换无效字符
  // DataForSEO API 不接受的字符：? ! " ' : ; [ ] { } ( ) < > | \ / * & % $ # @ ~ ` ^
  // 允许的字符：字母、数字、空格、连字符(-)、下划线(_)、点(.)、逗号(,)
  // 策略：移除无效字符，保留核心内容
  cleaned = cleaned
    // 移除问号和感叹号（常见的问题关键词）
    .replace(/[?!]/g, '')
    // 移除引号
    .replace(/["']/g, '')
    // 移除其他特殊字符（括号、方括号、花括号等）
    .replace(/[()[\]{}]/g, '')
    .replace(/[<>|\\/]/g, '')
    .replace(/[*&%$#@~`^]/g, '')
    // 移除冒号和分号
    .replace(/[:;]/g, '')
    // 将多个连续空格替换为单个空格
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * 验证关键词是否有效（在清理后）
 * 
 * @param keyword - 关键词
 * @returns 是否有效
 */
function isValidKeyword(keyword: string): boolean {
  if (!keyword || !keyword.trim()) {
    return false;
  }

  const cleaned = sanitizeKeyword(keyword);
  // 清理后至少要有1个字符
  return cleaned.length > 0;
}

/**
 * 批量获取关键词数据（使用 DataForSEO Labs Keyword Ideas API）
 * 
 * 重要：DataForSEO API 本身支持批量传入关键词数组（通过 keywords 字段）
 * 所有关键词一次性批量传入，API 会自动处理，不需要手动循环
 * 如果关键词超过建议的单次请求限制，会分批处理（但每批都是批量调用）
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
  // DataForSEO API 限制：每个关键词最多 10 个单词
  const MAX_WORDS_PER_KEYWORD = 10;

  // 过滤空关键词、清理无效字符，并检查单词数限制
  const validKeywords: string[] = [];
  const skippedKeywords: string[] = [];
  const skippedKeywordsMap = new Map<string, { wordCount?: number; reason: string; cleaned?: string }>();
  // 映射：清理后的关键词 -> 原始关键词（可能有多个原始关键词映射到同一个清理后的关键词）
  const cleanedToOriginalMap = new Map<string, string>();

  keywords.forEach(kw => {
    if (!kw || !kw.trim()) {
      return; // 跳过空关键词
    }

    const trimmed = kw.trim();

    // 清理无效字符
    const cleaned = sanitizeKeyword(trimmed);

    // 检查清理后的关键词是否有效
    if (!isValidKeyword(cleaned)) {
      skippedKeywords.push(trimmed);
      skippedKeywordsMap.set(trimmed.toLowerCase(), {
        reason: `Keyword contains invalid characters and becomes empty after sanitization`
      });
      console.warn(`[DataForSEO] Skipping keyword "${trimmed}" - contains invalid characters (cleaned result: "${cleaned}")`);
      return;
    }

    // 如果清理后的关键词与原始不同，记录警告
    if (cleaned !== trimmed) {
      console.warn(`[DataForSEO] Sanitized keyword: "${trimmed}" -> "${cleaned}"`);
    }

    const wordCount = cleaned.split(/\s+/).filter(w => w.length > 0).length;

    // 检查单词数限制（DataForSEO API 限制：最多 10 个单词）
    if (wordCount > MAX_WORDS_PER_KEYWORD) {
      skippedKeywords.push(trimmed);
      skippedKeywordsMap.set(trimmed.toLowerCase(), {
        wordCount,
        reason: `Keyword has too many words (${wordCount} > ${MAX_WORDS_PER_KEYWORD})`,
        cleaned
      });
      console.warn(`[DataForSEO] Skipping keyword "${trimmed}" (cleaned: "${cleaned}") - has ${wordCount} words (max ${MAX_WORDS_PER_KEYWORD})`);
    } else {
      // 使用清理后的关键词
      validKeywords.push(cleaned);
      // 记录映射关系（如果多个原始关键词清理后相同，使用第一个）
      if (!cleanedToOriginalMap.has(cleaned.toLowerCase())) {
        cleanedToOriginalMap.set(cleaned.toLowerCase(), trimmed);
      }
    }
  });

  if (validKeywords.length === 0) {
    console.warn('[DataForSEO] No valid keywords provided after filtering');
    // 返回所有关键词的空数据（包括被跳过的）
    return keywords.map(kw => {
      const trimmed = kw?.trim() || '';
      const skipped = skippedKeywordsMap.get(trimmed.toLowerCase());
      return {
        keyword: trimmed, // 返回原始关键词（不是清理后的）
        is_data_found: false,
      };
    });
  }

  if (skippedKeywords.length > 0) {
    console.log(`[DataForSEO] Filtered ${skippedKeywords.length} keywords (invalid characters or too many words), ${validKeywords.length} keywords will be sent to API`);
  }

  // DataForSEO API 本身支持批量传入关键词数组（通过 keywords 字段）
  // 根据 API 文档和经验，Google 引擎建议单次请求不超过 100 个关键词
  // 其他引擎建议不超过 50 个，以避免响应超时或限速
  const BATCH_SIZE = engine === 'google' ? 100 : 50;
  const DELAY_BETWEEN_BATCHES = 1000;

  try {
    console.log(`[DataForSEO] Fetching ${engine} data for ${validKeywords.length} keywords`);

    // 如果关键词数量在建议的单次请求限制内，直接一次性批量调用（API 本身支持批量）
    if (validKeywords.length <= BATCH_SIZE) {
      const results = await fetchBatchWithRetry(validKeywords, locationCode, languageCode, engine, retryCount);
      // 将清理后的关键词映射回原始关键词
      return mapResultsToOriginalKeywords(results, cleanedToOriginalMap, keywords, skippedKeywordsMap);
    }

    // 如果关键词数量超过建议限制，分批处理（但每批都是批量调用，API 本身支持批量）
    console.log(`[DataForSEO] Processing ${validKeywords.length} keywords in batches of ${BATCH_SIZE} (API supports batch, but splitting for better performance)`);
    const results: DataForSEOKeywordData[] = [];

    // 分批处理，每批都是批量调用（API 本身支持批量传入关键词数组）
    for (let i = 0; i < validKeywords.length; i += BATCH_SIZE) {
      const batch = validKeywords.slice(i, i + BATCH_SIZE);
      console.log(`[DataForSEO] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validKeywords.length / BATCH_SIZE)} (${batch.length} keywords)`);

      // 批量调用这一批关键词（API 本身支持批量，通过 keywords 数组传入）
      const batchResults = await fetchBatchWithRetry(batch, locationCode, languageCode, engine, retryCount);
      results.push(...batchResults);

      // 批次间延迟，避免限速
      if (i + BATCH_SIZE < validKeywords.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`[DataForSEO] Completed batch processing: ${results.length} total results`);

    // 将清理后的关键词映射回原始关键词
    return mapResultsToOriginalKeywords(results, cleanedToOriginalMap, keywords, skippedKeywordsMap);
  } catch (error: any) {
    console.error(`[DataForSEO] ${engine} API call failed:`, error);

    // 即使 API 失败，也要返回所有关键词的数据（标记为未找到）
    const errorResults: DataForSEOKeywordData[] = keywords.map(kw => {
      const trimmed = kw?.trim();
      return {
        keyword: trimmed || '',
        is_data_found: false,
      };
    });

    return errorResults;
  }
}

/**
 * 将API返回的结果映射回原始关键词
 * 
 * @param results - API返回的结果（关键词是清理后的）
 * @param cleanedToOriginalMap - 清理后关键词到原始关键词的映射
 * @param originalKeywords - 原始关键词数组
 * @param skippedKeywordsMap - 被跳过的关键词信息
 * @returns 映射后的结果（关键词是原始的）
 */
function mapResultsToOriginalKeywords(
  results: DataForSEOKeywordData[],
  cleanedToOriginalMap: Map<string, string>,
  originalKeywords: string[],
  skippedKeywordsMap: Map<string, { wordCount?: number; reason: string; cleaned?: string }>
): DataForSEOKeywordData[] {
  // 创建结果映射：清理后的关键词 -> API结果
  const cleanedResultMap = new Map<string, DataForSEOKeywordData>();
  results.forEach(r => {
    if (r.keyword) {
      cleanedResultMap.set(r.keyword.toLowerCase(), r);
    }
  });

  // 为每个原始关键词创建结果
  const finalResults: DataForSEOKeywordData[] = [];
  originalKeywords.forEach(kw => {
    const trimmed = kw?.trim();
    if (!trimmed) {
      return;
    }

    // 检查是否被跳过
    const skipped = skippedKeywordsMap.get(trimmed.toLowerCase());
    if (skipped) {
      finalResults.push({
        keyword: trimmed, // 使用原始关键词
        is_data_found: false,
      });
      return;
    }

    // 获取清理后的关键词
    const cleaned = sanitizeKeyword(trimmed);
    const apiResult = cleanedResultMap.get(cleaned.toLowerCase());

    if (apiResult) {
      // 使用原始关键词，但保留API返回的数据
      finalResults.push({
        ...apiResult,
        keyword: trimmed, // 使用原始关键词而不是清理后的
      });
    } else {
      // 如果没有找到结果（不应该发生），添加空数据
      finalResults.push({
        keyword: trimmed,
        is_data_found: false,
      });
    }
  });

  return finalResults;
}

/**
 * 单次批量请求（内部函数，处理单批关键词）
 * 
 * 重要：所有关键词一次性批量传入 API，不是逐个调用
 */
async function fetchBatchWithRetry(
  keywords: string[],
  locationCode: number,
  languageCode: string,
  engine: SearchEngine,
  maxRetries: number
): Promise<DataForSEOKeywordData[]> {
  if (keywords.length === 0) {
    return [];
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 增加到 30s 超时（DataForSEO 可能需要更长时间）

    try {
      // 不同搜索引擎对应的端点
      let endpoint = '';
      if (engine === 'google') {
        endpoint = `${DATAFORSEO_BASE_URL}/keywords_data/google_ads/search_volume/live`;
      } else {
        endpoint = `${DATAFORSEO_BASE_URL}/keywords_data/${engine}/search_volume/live`;
      }

      // 构建请求体 - 所有关键词一次性传入（批量调用）
      const requestBody = [
        {
          keywords: keywords, // 关键词数组，一次性传入
          location_code: locationCode,
          language_code: languageCode,
        }
      ];

      console.log(`[DataForSEO] Batch request: ${keywords.length} keywords (${engine}, location: ${locationCode}, language: ${languageCode})`);
      console.log(`[DataForSEO] Request body:`, JSON.stringify(requestBody, null, 2));

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
        console.error('[DataForSEO] Full error response:', errorText);
        throw new Error(`DataForSEO API error: ${response.status}`);
      }

      const data = await response.json();

      // 详细日志：显示完整响应结构
      console.log(`[DataForSEO] Response status: ${response.status}`);
      console.log(`[DataForSEO] Response structure:`, JSON.stringify({
        status_code: data.status_code,
        status_message: data.status_message,
        tasks_count: data.tasks_count,
        tasks_error: data.tasks_error,
        has_tasks: !!data.tasks,
        tasks_length: data.tasks?.length || 0,
        first_task_status: data.tasks?.[0]?.status_code,
        first_task_message: data.tasks?.[0]?.status_message,
        first_task_has_result: !!data.tasks?.[0]?.result,
        first_task_result_length: data.tasks?.[0]?.result?.length || 0,
      }, null, 2));

      // 如果任务有错误状态码，显示详细信息
      if (data.tasks && data.tasks[0]) {
        const task = data.tasks[0];
        console.log(`[DataForSEO] Task status_code: ${task.status_code}, status_message: ${task.status_message}`);
        if (task.status_code && (task.status_code < 20000 || task.status_code >= 30000)) {
          console.warn(`[DataForSEO] Task has error status_code: ${task.status_code}, message: ${task.status_message}`);
        }

        // 显示 result 的详细信息
        if (task.result) {
          console.log(`[DataForSEO] Result structure:`, JSON.stringify({
            result_type: typeof task.result,
            is_array: Array.isArray(task.result),
            length: Array.isArray(task.result) ? task.result.length : 'N/A',
            first_item: Array.isArray(task.result) && task.result.length > 0 ? {
              has_items: !!task.result[0].items,
              items_length: task.result[0].items?.length || 0,
              items_count: task.result[0].items_count,
              location_code: task.result[0].location_code,
              language_code: task.result[0].language_code,
            } : task.result[0] || 'N/A',
          }, null, 2));
        }
      }

      // 解析响应数据
      // DataForSEO 响应格式：{ tasks: [{ result: [{ items: [...] }] }] }
      // 或者：{ tasks: [{ result: [...] }] } （直接是结果数组）
      if (!data.tasks || !data.tasks[0]) {
        console.warn('[DataForSEO] No tasks in response');
        console.log('[DataForSEO] Full response:', JSON.stringify(data, null, 2));
        return keywords.map(kw => ({ keyword: kw, is_data_found: false }));
      }

      const task = data.tasks[0];

      // 检查任务状态
      if (task.status_code && (task.status_code < 20000 || task.status_code >= 30000)) {
        console.error(`[DataForSEO] Task failed with status_code: ${task.status_code}, message: ${task.status_message}`);
        return keywords.map(kw => ({ keyword: kw, is_data_found: false }));
      }

      if (!task.result) {
        console.warn('[DataForSEO] No result in task');
        console.log('[DataForSEO] Task data:', JSON.stringify(task, null, 2));
        return keywords.map(kw => ({ keyword: kw, is_data_found: false }));
      }

      // 处理两种可能的响应格式
      let resultItems: any[] = [];

      // 格式1：result 是数组，每个元素有 items 字段
      if (Array.isArray(task.result) && task.result.length > 0 && task.result[0].items) {
        console.log(`[DataForSEO] Using format 1: result array with items`);
        // 合并所有 result 的 items
        task.result.forEach((resultGroup: any) => {
          if (resultGroup.items && Array.isArray(resultGroup.items)) {
            resultItems.push(...resultGroup.items);
          }
        });
      }
      // 格式2：result 是数组，直接是结果项
      else if (Array.isArray(task.result)) {
        console.log(`[DataForSEO] Using format 2: result is direct array`);
        resultItems = task.result;
      }
      // 格式3：result 是单个对象，包含 items
      else if (task.result.items && Array.isArray(task.result.items)) {
        console.log(`[DataForSEO] Using format 3: result object with items`);
        resultItems = task.result.items;
      }
      else {
        console.warn('[DataForSEO] Unknown result format');
        console.log('[DataForSEO] Result data:', JSON.stringify(task.result, null, 2));
        return keywords.map(kw => ({ keyword: kw, is_data_found: false }));
      }

      console.log(`[DataForSEO] Extracted ${resultItems.length} items from response`);

      if (resultItems.length === 0) {
        console.warn('[DataForSEO] No items extracted from result');
        // 返回所有关键词的空数据，保持顺序
        return keywords.map(kw => ({ keyword: kw?.trim() || '', is_data_found: false }));
      }

      // 映射结果项到 DataForSEOKeywordData
      const results: DataForSEOKeywordData[] = resultItems.map((item: any, index: number) => {
        const keyword = item.keyword || '';

        // 调试日志：显示前3个结果项的关键字段
        if (index < 3) {
          console.log(`[DataForSEO] Item ${index + 1}:`, JSON.stringify({
            keyword: item.keyword,
            search_volume: item.search_volume,
            cpc: item.cpc,
            competition: item.competition,
            competition_index: item.competition_index,
            has_monthly_searches: !!item.monthly_searches,
            monthly_searches_count: item.monthly_searches?.length || 0,
          }, null, 2));
        }

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

      const foundCount = results.filter(r => r.is_data_found).length;
      console.log(`[DataForSEO] Batch returned ${foundCount}/${results.length} keywords with data`);

      // 详细日志：显示前几个结果的详细信息
      if (results.length > 0) {
        console.log(`[DataForSEO] Sample results (first ${Math.min(3, results.length)}):`,
          JSON.stringify(results.slice(0, 3).map(r => ({
            keyword: r.keyword,
            is_data_found: r.is_data_found,
            search_volume: r.search_volume,
            competition_index: r.competition_index,
            cpc: r.cpc,
          })), null, 2)
        );
      }

      // 创建一个映射，以便快速查找
      const resultMap = new Map<string, DataForSEOKeywordData>();
      results.forEach(r => {
        if (r.keyword) {
          resultMap.set(r.keyword.toLowerCase(), r);
        }
      });

      // 确保返回结果与输入关键词顺序一致
      const orderedResults: DataForSEOKeywordData[] = keywords.map(kw => {
        const trimmed = kw?.trim();
        if (!trimmed) {
          return { keyword: '', is_data_found: false };
        }

        const result = resultMap.get(trimmed.toLowerCase());
        if (result) {
          return result;
        }

        // 如果关键词不在结果中（可能是被 API 过滤掉了），返回空数据
        return {
          keyword: trimmed,
          is_data_found: false,
        };
      });

      return orderedResults;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;

      // 超时后重试（如果还有重试机会）
      if (error.name === 'AbortError') {
        console.warn(`[DataForSEO] API timeout (30s) for batch. Attempt ${attempt}/${maxRetries}`);
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`[DataForSEO] Retrying after ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          console.error(`[DataForSEO] API timeout after ${maxRetries} attempts`);
          return keywords.map(kw => ({ keyword: kw, is_data_found: false }));
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
 * 重要：所有关键词一次性批量传入，避免限速问题
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

  // 过滤空关键词并清理无效字符
  const validKeywords: string[] = [];
  const cleanedToOriginalMap = new Map<string, string>();
  keywords.forEach(kw => {
    if (!kw || !kw.trim()) {
      return;
    }
    const trimmed = kw.trim();
    const cleaned = sanitizeKeyword(trimmed);
    if (isValidKeyword(cleaned)) {
      validKeywords.push(cleaned);
      // 记录映射关系（如果多个原始关键词清理后相同，使用第一个）
      if (!cleanedToOriginalMap.has(cleaned.toLowerCase())) {
        cleanedToOriginalMap.set(cleaned.toLowerCase(), trimmed);
      }
    } else {
      console.warn(`[DataForSEO] Skipping keyword "${trimmed}" for difficulty check - contains invalid characters`);
    }
  });

  if (validKeywords.length === 0) {
    console.warn('[DataForSEO] No valid keywords provided for difficulty check');
    return keywords.map(kw => ({ keyword: kw?.trim() || '' }));
  }

  try {
    console.log(`[DataForSEO] Fetching ${engine} keyword difficulty for ${validKeywords.length} keywords (batch mode)`);

    const endpoint = `${DATAFORSEO_BASE_URL}/dataforseo_labs/${engine}/bulk_keyword_difficulty/live`;

    // 构建请求体 - 所有关键词一次性传入（批量调用，最多1000个）
    const requestBody = [
      {
        keywords: validKeywords.slice(0, 1000), // 限制最多1000个，一次性批量传入
        location_code: locationCode,
        language_code: languageCode,
      }
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    console.log(`[DataForSEO] Batch request: ${requestBody[0].keywords.length} keywords for difficulty check`);

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
      // 返回原始关键词
      return keywords.map(kw => ({ keyword: kw?.trim() || '' }));
    }

    // 创建结果映射：清理后的关键词 -> API结果
    const cleanedResultMap = new Map<string, { keyword: string; competition_index?: number }>();
    data.tasks[0].result.forEach((item: any) => {
      const cleaned = item.keyword || '';
      cleanedResultMap.set(cleaned.toLowerCase(), {
        keyword: cleaned,
        competition_index: item.competition_index,
      });
    });

    // 将结果映射回原始关键词
    const results = keywords.map(kw => {
      const trimmed = kw?.trim() || '';
      const cleaned = sanitizeKeyword(trimmed);
      const apiResult = cleanedResultMap.get(cleaned.toLowerCase());

      if (apiResult) {
        return {
          keyword: trimmed, // 使用原始关键词
          competition_index: apiResult.competition_index,
        };
      } else {
        return {
          keyword: trimmed,
        };
      }
    });

    console.log(`[DataForSEO] Batch returned ${results.length} keyword difficulty results`);
    return results;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('[DataForSEO] Keyword difficulty API timeout (5s). Skipping without retry.');
    } else {
      console.error('[DataForSEO] Failed to fetch keyword difficulty:', error.message);
    }
    // 返回原始关键词
    return keywords.map(kw => ({ keyword: kw?.trim() || '' }));
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
 * 批量获取关键词数据
 * 
 * 优先使用 SE-Ranking API（更快），如果失败或没有配置 API key 则回退到 DataForSEO
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
  // 前置检查：过滤空关键词
  const validKeywords = keywords.filter(kw => kw && kw.trim().length > 0);
  if (validKeywords.length === 0) {
    console.warn('[Keyword Research] No valid keywords provided');
    return [];
  }

  // 1. 尝试使用 SE-Ranking API（更快）
  const seRankingAvailable = isSERankingAvailable();
  console.log(`[Keyword Research] SE-Ranking available: ${seRankingAvailable}`);

  if (seRankingAvailable) {
    console.log(`[Keyword Research] Trying SE-Ranking first (${validKeywords.length} keywords)...`);

    try {
      const seRankingResults = await fetchSERankingData(validKeywords, languageCode);

      // 检查是否有有效数据
      const foundCount = seRankingResults.filter((r: any) => r.is_data_found).length;
      if (foundCount > 0) {
        console.log(`[Keyword Research] SE-Ranking returned ${foundCount}/${seRankingResults.length} valid results`);
        return seRankingResults;
      }
      console.log(`[Keyword Research] SE-Ranking returned no data, falling back to DataForSEO`);
    } catch (seError: any) {
      console.warn(`[Keyword Research] SE-Ranking failed: ${seError.message}, falling back to DataForSEO`);
    }
  } else {
    console.log(`[Keyword Research] SE-Ranking API key not configured, using DataForSEO`);
  }

  // 2. 回退到 DataForSEO API
  try {
    console.log(`[Keyword Research] Using DataForSEO (${validKeywords.length} keywords)...`);

    const volumeResults = await fetchDataForSEOData(validKeywords, locationCode, languageCode, engine);

    // 转换数据，直接用 competition_index 作为 difficulty
    const results = volumeResults.map(data => ({
      keyword: data.keyword,
      is_data_found: data.is_data_found || false,
      volume: data.search_volume, // search_volume -> volume
      cpc: data.cpc,
      competition: data.competition,
      difficulty: data.competition_index, // 直接使用 competition_index 作为 difficulty
      history_trend: data.history_trend,
    }));

    const foundCount = results.filter(r => r.is_data_found).length;
    console.log(`[Keyword Research] DataForSEO returned ${foundCount}/${results.length} valid results`);

    return results;
  } catch (dataForSEOError: any) {
    console.error(`[Keyword Research] DataForSEO failed: ${dataForSEOError.message}`);
    // 返回空数据而不是抛出错误
    return validKeywords.map(kw => ({
      keyword: kw,
      is_data_found: false,
    }));
  }
}
