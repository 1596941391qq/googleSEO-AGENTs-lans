/**
 * SERP搜索工具
 * 
 * 职责：获取Google搜索结果
 * 特点：纯数据获取，无AI逻辑
 */

import { SerpSnippet } from "../types.js";

const THORDATA_API_TOKEN = process.env.THORDATA_API_TOKEN || '3802a36b781d24a4979a53c42fee5361';
const THORDATA_API_URL = process.env.THORDATA_API_URL || 'https://scraperapi.thordata.com/request';

export interface SerpResult {
  title: string;
  url: string;
  snippet: string;
  position?: number;
}

export interface SerpData {
  keyword: string;
  results: SerpResult[];
  totalResults?: number;
}

const LANGUAGE_TO_COUNTRY_CODE: Record<string, string> = {
  'ko': 'kr', // Korean - South Korea
  'ja': 'jp', // Japanese - Japan
  'fr': 'fr', // French - France
  'ru': 'ru', // Russian - Russia
  'pt': 'br', // Portuguese - Brazil
  'id': 'id', // Indonesian - Indonesia
  'es': 'es', // Spanish - Spain
  'ar': 'sa', // Arabic - Saudi Arabia
  'en': 'us', // English - United States
  'zh': 'cn', // Chinese - China
};

/**
 * 解析ThorData SERP响应
 */
function parseSerpResponse(data: any): {
  serpSnippets: SerpSnippet[];
  resultCount: number;
  topDomainType: string;
} {
  const serpSnippets: SerpSnippet[] = [];
  let resultCount = 0;
  let topDomainType = 'Unknown';
  let results: any[] = [];

  // 如果数据是字符串，先解析为对象
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.error('JSON解析失败');
      return { serpSnippets, resultCount, topDomainType };
    }
  }

  // 检查data.organic数组（ThorData标准格式）
  if (data?.organic && Array.isArray(data.organic)) {
    results = data.organic;
  }
  // 后备检查：从各种可能的字段名中查找结果
  else if (data?.organic_results && Array.isArray(data.organic_results)) {
    results = data.organic_results;
  } else if (data?.results && Array.isArray(data.results)) {
    results = data.results;
  } else if (data?.snack_pack && Array.isArray(data.snack_pack)) {
    results = data.snack_pack;
  }
  // 如果都不是数组，尝试扁平化对象
  else if (data && typeof data === 'object') {
    const keys = Object.keys(data);
    const isFlatObject = keys.length > 0 && keys.every(k => !isNaN(Number(k)));

    if (isFlatObject) {
      results = keys.map(k => data[k]);
    }
  }

  resultCount = results.length;

  // 提取前10个结果的snippet
  results.slice(0, 10).forEach((result: any) => {
    const title = result.title || result.name || '';
    const url = result.link || result.url || '';
    const snippet = result.description || result.snippet || result.result?.snippet || '';

    if (title && url) {
      serpSnippets.push({ title, url, snippet });
    }
  });

  // 分析第一个结果的domain类型
  if (results.length > 0) {
    const firstResult = results[0];
    const url = (firstResult.link || firstResult.url || '').toLowerCase();

    if (url.includes('reddit.com') || url.includes('quora.com') || url.includes('forum')) {
      topDomainType = 'Forum/Social';
    } else if (url.includes('wikipedia.org') || url.includes('.gov') || url.includes('.edu')) {
      topDomainType = 'Gov/Edu';
    } else if (url.includes('amazon.com') || url.includes('walmart.com') || url.includes('microsoft.com') || url.includes('apple.com')) {
      topDomainType = 'Big Brand';
    } else {
      topDomainType = 'Niche Site';
    }
  }

  return { serpSnippets, resultCount, topDomainType };
}

/**
 * ThorData SERP API调用
 */
async function fetchThorDataSerp(query: string, targetLanguage: string = 'en', engine: string = 'google'): Promise<SerpData> {
  const formData = new URLSearchParams();
  formData.append('engine', engine);
  formData.append('q', query);
  formData.append('json', '1');

  // 添加本地化参数
  const countryCode = LANGUAGE_TO_COUNTRY_CODE[targetLanguage] || 'us';
  if (engine === 'google') {
    formData.append('gl', countryCode);
  }

  // 添加超时控制 (60秒)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(THORDATA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${THORDATA_API_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ThorData API 请求失败: ${response.status} ${errorText}`);
    }

    let responseData: any = await response.json();

    // 打印前两百个字的响应
    const responseText = JSON.stringify(responseData, null, 2);
    const first200Chars = responseText.substring(0, 200);
    console.log('ThorData API 响应前两百个字:', first200Chars);

    // 检查是否有错误
    if (responseData && responseData.error) {
      throw new Error(`ThorData API 错误: ${responseData.error}`);
    }

    // 如果响应被包装在 { code, data } 结构中，提取实际的 data
    if (responseData && responseData.data && typeof responseData.data === 'object') {
      responseData = responseData.data;
    }

    // 解析响应
    const parsed = parseSerpResponse(responseData);

    return {
      keyword: query,
      totalResults: parsed.resultCount > 0 ? parsed.resultCount : undefined,
      results: parsed.serpSnippets.map((s, index) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
        position: index + 1
      })),
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`ThorData API 请求超时 (60s): ${query}`);
      throw new Error(`ThorData API 请求超时 (60s)`);
    }
    console.error('调用 ThorData API 失败:', error);
    throw error;
  }
}

/**
 * 获取SERP结果
 * 
 * @param keyword - 关键词
 * @param language - 语言，默认 'en'
 * @param engine - 搜索引擎，默认 'google'
 * @param location - 搜索地区，默认 'us'（暂未使用）
 * @returns SERP数据
 */
export async function fetchSerpResults(
  keyword: string,
  language: string = 'en',
  engine: string = 'google',
  location: string = 'us'
): Promise<SerpData> {
  try {
    return await fetchThorDataSerp(keyword, language, engine);
  } catch (error: any) {
    console.error(`Failed to fetch SERP from ThorData:`, error);
    return {
      keyword,
      results: [],
    };
  }
}

/**
 * 批量并行获取SERP结果（优化版本 - 真正的并行处理）
 * 
 * @param keywords - 关键词数组
 * @param language - 语言，默认 'en'
 * @param engine - 搜索引擎，默认 'google'
 * @param batchSize - 并发批次大小，默认 6（与 Agent 2 批处理大小一致）
 * @param batchDelay - 批次间延迟（毫秒），默认 300ms
 * @returns 关键词到SERP数据的Map
 */
export async function fetchSerpResultsBatch(
  keywords: string[],
  language: string = 'en',
  engine: string = 'google',
  batchSize: number = 6,
  batchDelay: number = 300
): Promise<Map<string, SerpData>> {
  const results = new Map<string, SerpData>();

  // 分批并行处理，避免一次性并发过多导致限流
  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize);
    
    // 并行获取批次内所有关键词的 SERP 结果
    const batchPromises = batch.map(async (keyword) => {
      try {
        const serpData = await fetchSerpResults(keyword, language, engine);
        return { keyword: keyword.toLowerCase(), serpData };
      } catch (error: any) {
        console.error(`Failed to fetch SERP for "${keyword}":`, error.message);
        return { 
          keyword: keyword.toLowerCase(), 
          serpData: { keyword, results: [] } as SerpData 
        };
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    
    // 处理批次结果
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.keyword, result.value.serpData);
      } else {
        // 如果整个批次失败，至少记录空结果
        const keyword = batch[batchResults.indexOf(result)];
        if (keyword) {
          results.set(keyword.toLowerCase(), { keyword, results: [] });
        }
      }
    });

    // 批次间短暂延迟，避免 API 限流（仅在还有更多批次时延迟）
    if (i + batchSize < keywords.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  return results;
}

