/**
 * SE-Ranking Keyword Research API 工具
 *
 * 职责：获取关键词的真实数据（搜索量、难度、CPC等）
 * 特点：优先使用，比 DataForSEO 响应更快
 *
 * API 文档：https://seranking.com/api/data/keyword-research/
 * 认证：Token YOUR_API_KEY
 */

const SERANKING_API_KEY = process.env.SERANKING_API_KEY || '';
const SE_RANKING_BASE_URL = 'https://api.seranking.com/v1';
const SE_RANKING_TIMEOUT_MS = 5000; // 5秒超时
const SE_RANKING_MAX_KEYWORDS = 5000; // 单次请求最大关键词数（根据 API 文档，最多支持 5000 个）

// SE-Ranking source 参数映射（语言/地区 -> source）
const SOURCE_MAP: { [key: string]: string } = {
  'en': 'us',      // 美国
  'zh': 'cn',      // 中国（SE-Ranking 可能不支持，会 fallback 到 DataForSEO）
  'ru': 'ru',      // 俄罗斯
  'fr': 'fr',      // 法国
  'ja': 'jp',      // 日本
  'ko': 'kr',      // 韩国
  'pt': 'br',      // 巴西（葡萄牙语）
  'id': 'id',      // 印度尼西亚
  'es': 'es',      // 西班牙
  'ar': 'eg',      // 埃及（阿拉伯语）
};

export interface SERankingKeywordData {
  keyword: string;
  is_data_found: boolean;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  history_trend?: { [date: string]: number };
}

/**
 * 检查 SE-Ranking API 是否可用
 */
export function isSERankingAvailable(): boolean {
  return !!SERANKING_API_KEY;
}

/**
 * 获取 SE-Ranking source 参数
 * 
 * 默认使用 'us'（美国/全球），不根据语言代码自动选择地区
 * 如果需要特定地区，可以通过参数传入
 */
function getSource(languageCode?: string): string {
  // 默认使用 'us'（美国/全球），不根据语言代码自动选择
  // 这样可以获取全球数据，而不是特定地区的数据
  return 'us';
}

/**
 * 批量获取关键词数据（使用 SE-Ranking Keyword Research API）
 * 
 * 重要：SE-Ranking API 本身支持批量传入关键词列表（最多 5000 个）
 * 所有关键词一次性批量传入，API 会自动处理，不需要手动分批
 *
 * @param keywords - 关键词数组
 * @param languageCode - 语言代码，默认 'en'
 * @returns SE-Ranking 数据数组
 */
export async function fetchSERankingData(
  keywords: string[],
  languageCode: string = 'en',
  useGlobal: boolean = true // 默认使用全球地区
): Promise<SERankingKeywordData[]> {
  // SE-Ranking API 限制：
  // - 每个关键词最大长度：255 个字符
  // - 为了一致性，也应用 10 个单词的限制（参考 DataForSEO）
  const MAX_WORDS_PER_KEYWORD = 10;
  const MAX_CHARS_PER_KEYWORD = 255;

  // 过滤空关键词并检查限制
  const validKeywords: string[] = [];
  const skippedKeywords: string[] = [];
  const skippedKeywordsMap = new Map<string, { wordCount?: number; charCount?: number; reason: string }>();

  keywords.forEach(kw => {
    if (!kw || !kw.trim()) {
      return; // 跳过空关键词
    }

    const trimmed = kw.trim();
    const charCount = trimmed.length;
    const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length;

    // 检查字符长度限制（SE-Ranking API 限制：最多 255 个字符）
    if (charCount > MAX_CHARS_PER_KEYWORD) {
      skippedKeywords.push(trimmed);
      skippedKeywordsMap.set(trimmed.toLowerCase(), {
        charCount,
        reason: `Keyword is too long (${charCount} > ${MAX_CHARS_PER_KEYWORD} characters)`
      });
      console.warn(`[SE-Ranking] Skipping keyword "${trimmed.substring(0, 50)}..." - ${charCount} characters (max ${MAX_CHARS_PER_KEYWORD})`);
    }
    // 检查单词数限制（为了一致性，应用与 DataForSEO 相同的限制）
    else if (wordCount > MAX_WORDS_PER_KEYWORD) {
      skippedKeywords.push(trimmed);
      skippedKeywordsMap.set(trimmed.toLowerCase(), {
        wordCount,
        reason: `Keyword has too many words (${wordCount} > ${MAX_WORDS_PER_KEYWORD})`
      });
      console.warn(`[SE-Ranking] Skipping keyword "${trimmed}" - has ${wordCount} words (max ${MAX_WORDS_PER_KEYWORD})`);
    } else {
      validKeywords.push(trimmed);
    }
  });

  if (validKeywords.length === 0) {
    console.warn('[SE-Ranking] No valid keywords provided after filtering');
    // 返回所有关键词的空数据（包括被跳过的）
    return keywords.map(kw => {
      const trimmed = kw?.trim() || '';
      return {
        keyword: trimmed,
        is_data_found: false,
      };
    });
  }

  if (skippedKeywords.length > 0) {
    console.log(`[SE-Ranking] Filtered ${skippedKeywords.length} keywords (too long or too many words), ${validKeywords.length} keywords will be sent to API`);
  }

  // SE-Ranking API 支持最多 5000 个关键词，如果超过则分批处理
  let apiResults: SERankingKeywordData[] = [];

  if (validKeywords.length > SE_RANKING_MAX_KEYWORDS) {
    console.log(`[SE-Ranking] Processing ${validKeywords.length} keywords in batches of ${SE_RANKING_MAX_KEYWORDS} (API limit)`);
    const allResults: SERankingKeywordData[] = [];

    // 分批处理（仅在超过 API 限制时）
    for (let i = 0; i < validKeywords.length; i += SE_RANKING_MAX_KEYWORDS) {
      const batch = validKeywords.slice(i, i + SE_RANKING_MAX_KEYWORDS);
      console.log(`[SE-Ranking] Processing batch ${Math.floor(i / SE_RANKING_MAX_KEYWORDS) + 1}/${Math.ceil(validKeywords.length / SE_RANKING_MAX_KEYWORDS)} (${batch.length} keywords)`);

      // 批量调用这一批关键词（API 本身支持批量）
      const batchResults = await fetchSERankingDataBatch(batch, languageCode, useGlobal);
      allResults.push(...batchResults);

      // 批次间小延迟，避免限速
      if (i + SE_RANKING_MAX_KEYWORDS < validKeywords.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[SE-Ranking] Completed batch processing: ${allResults.length} total results`);
    apiResults = allResults;
  } else {
    // 关键词数量在 API 限制内，直接一次性批量调用（API 本身支持批量）
    apiResults = await fetchSERankingDataBatch(validKeywords, languageCode, useGlobal);
  }

  // 为被跳过的关键词添加空数据
  const finalResults: SERankingKeywordData[] = [...apiResults];

  skippedKeywords.forEach(skippedKw => {
    finalResults.push({
      keyword: skippedKw,
      is_data_found: false,
    });
  });

  // 确保返回结果与输入关键词顺序一致
  const resultMap = new Map<string, SERankingKeywordData>();
  finalResults.forEach(r => {
    if (r.keyword) {
      resultMap.set(r.keyword.toLowerCase(), r);
    }
  });

  const orderedResults: SERankingKeywordData[] = [];
  keywords.forEach(kw => {
    const trimmed = kw?.trim();
    if (trimmed) {
      const result = resultMap.get(trimmed.toLowerCase());
      if (result) {
        orderedResults.push(result);
      } else {
        // 如果没有找到结果（不应该发生），添加空数据
        orderedResults.push({
          keyword: trimmed,
          is_data_found: false,
        });
      }
    }
  });

  return orderedResults;
}

/**
 * 单次批量请求（内部函数）
 * 
 * SE-Ranking API 本身支持批量传入关键词列表，通过 keywords[] 参数
 * 不需要手动循环，直接一次性传入所有关键词即可
 */
async function fetchSERankingDataBatch(
  keywords: string[],
  languageCode: string = 'en',
  useGlobal: boolean = true // 默认使用全球地区
): Promise<SERankingKeywordData[]> {
  if (keywords.length === 0) {
    return [];
  }

  // API 支持最多 5000 个关键词，这里确保不超过限制
  const keywordsToFetch = keywords.slice(0, SE_RANKING_MAX_KEYWORDS);
  if (keywords.length > SE_RANKING_MAX_KEYWORDS) {
    console.warn(`[SE-Ranking] Batch truncated from ${keywords.length} to ${SE_RANKING_MAX_KEYWORDS}`);
  }

  // 默认使用 'us'（美国/全球），不根据语言代码自动选择地区
  const source = useGlobal ? 'us' : getSource(languageCode);
  const endpoint = `${SE_RANKING_BASE_URL}/keywords/export?source=${source}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SE_RANKING_TIMEOUT_MS);

  try {
    console.log(`[SE-Ranking] Batch request: ${keywordsToFetch.length} keywords (source: ${source})`);

    // 构建 FormData - 所有关键词一次性传入
    const formData = new FormData();
    keywordsToFetch.forEach(kw => {
      formData.append('keywords[]', kw.trim());
    });
    formData.append('cols', 'keyword,volume,cpc,competition,difficulty,history_trend');

    // 检查 API key 是否存在（不记录实际 key，只检查是否配置）
    if (!SERANKING_API_KEY) {
      console.error('[SE-Ranking] API key not configured. Please set SERANKING_API_KEY environment variable.');
      return keywordsToFetch.map(kw => ({ keyword: kw, is_data_found: false }));
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${SERANKING_API_KEY}`,
      },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    // 处理HTTP错误
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unknown error';
      }

      // 记录错误但不记录 API key
      console.error(`[SE-Ranking] API error: ${response.status}`);
      console.error(`[SE-Ranking] Error message: ${errorText}`);

      // 401/403 表示认证问题，可能 API key 无效或过期
      if (response.status === 401 || response.status === 403) {
        console.error('[SE-Ranking] Authentication failed. Please check your API key.');
        // 检查是否是 License expired 错误
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message && errorData.message.includes('License expired')) {
            console.error('[SE-Ranking] License expired. Please renew your SE-Ranking subscription.');
          }
        } catch (e) {
          // 无法解析错误消息，继续
        }
      }

      // 返回所有关键词的空数据，保持顺序
      return keywordsToFetch.map(kw => ({ keyword: kw, is_data_found: false }));
    }

    // 解析响应
    let data: any;
    try {
      const responseText = await response.text();
      console.log(`[SE-Ranking] Raw response length: ${responseText.length} chars`);
      console.log(`[SE-Ranking] Raw response preview: ${responseText.substring(0, 500)}`);
      data = JSON.parse(responseText);
    } catch (parseError: any) {
      console.error('[SE-Ranking] Failed to parse JSON response:', parseError.message);
      const responseText = await response.text().catch(() => 'Unable to read response');
      console.error('[SE-Ranking] Response text:', responseText.substring(0, 500));
      return keywordsToFetch.map(kw => ({ keyword: kw, is_data_found: false }));
    }

    // SE-Ranking 直接返回数组
    if (!Array.isArray(data)) {
      console.warn(`[SE-Ranking] Unexpected response format: ${typeof data}`);
      console.log(`[SE-Ranking] Response structure:`, JSON.stringify({
        type: typeof data,
        is_array: Array.isArray(data),
        keys: typeof data === 'object' && data !== null ? Object.keys(data) : 'N/A',
        preview: JSON.stringify(data).substring(0, 500),
      }, null, 2));

      // 如果是错误对象，提取错误信息
      if (data && typeof data === 'object' && data.message) {
        console.error(`[SE-Ranking] API returned error: ${data.message}`);
      }

      return keywordsToFetch.map(kw => ({ keyword: kw, is_data_found: false }));
    }

    console.log(`[SE-Ranking] Received ${data.length} items in response`);

    // 映射结果，确保数据类型正确
    // 注意：如果 API 返回数据但没有 is_data_found 字段，我们根据 volume 是否存在来判断
    const results = data.map((item: any) => {
      // 如果 API 没有返回 is_data_found 字段，根据 volume 判断
      const hasData = item.is_data_found !== undefined
        ? Boolean(item.is_data_found)
        : (item.volume !== undefined && item.volume !== null);

      return {
        keyword: String(item.keyword || ''),
        is_data_found: hasData,
        volume: typeof item.volume === 'number' ? item.volume : undefined,
        cpc: typeof item.cpc === 'number' ? item.cpc : undefined,
        competition: typeof item.competition === 'number' ? item.competition : undefined,
        difficulty: typeof item.difficulty === 'number' ? item.difficulty : undefined,
        history_trend: item.history_trend && typeof item.history_trend === 'object' ? item.history_trend : undefined,
      };
    });

    const foundCount = results.filter((r: SERankingKeywordData) => r.is_data_found).length;
    console.log(`[SE-Ranking] Batch returned ${foundCount}/${results.length} keywords with data`);

    // 详细日志：显示前几个结果的详细信息
    if (results.length > 0) {
      console.log(`[SE-Ranking] Sample results (first ${Math.min(3, results.length)}):`,
        JSON.stringify(results.slice(0, 3).map(r => ({
          keyword: r.keyword,
          is_data_found: r.is_data_found,
          volume: r.volume,
          difficulty: r.difficulty,
          cpc: r.cpc,
        })), null, 2)
      );
    }

    // 创建一个映射，以便快速查找（但在这个函数中，我们直接返回 results，顺序已经在外部函数中处理）
    return results;

  } catch (error: any) {
    clearTimeout(timeoutId); // 确保清理计时器

    if (error.name === 'AbortError') {
      console.warn(`[SE-Ranking] API timeout (${SE_RANKING_TIMEOUT_MS}ms). Skipping.`);
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.error('[SE-Ranking] Network error: Unable to connect to API');
    } else {
      console.error(`[SE-Ranking] API call failed: ${error.message}`);
    }

    return keywordsToFetch.map(kw => ({ keyword: kw, is_data_found: false }));
  }
}

/**
 * 获取单个关键词的 SE-Ranking 数据
 */
export async function fetchSingleSERankingData(
  keyword: string,
  languageCode: string = 'en'
): Promise<SERankingKeywordData | null> {
  if (!keyword || !keyword.trim()) {
    return null;
  }

  try {
    const results = await fetchSERankingData([keyword.trim()], languageCode);
    return results.length > 0 && results[0].is_data_found ? results[0] : null;
  } catch (error: any) {
    console.error(`[SE-Ranking] Failed to fetch single keyword "${keyword}":`, error.message);
    return null;
  }
}

/**
 * 获取 SE-Ranking API 状态信息（用于调试）
 */
export function getSERankingStatus(): {
  available: boolean;
  apiKeyConfigured: boolean;
  timeoutMs: number;
  maxKeywords: number;
} {
  return {
    available: isSERankingAvailable(),
    apiKeyConfigured: !!SERANKING_API_KEY,
    timeoutMs: SE_RANKING_TIMEOUT_MS,
    maxKeywords: SE_RANKING_MAX_KEYWORDS,
  };
}
