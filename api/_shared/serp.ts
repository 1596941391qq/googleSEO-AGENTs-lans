// ThorData SERP (Search Engine Results Page) fetching service
// Uses Bing search engine via ThorData API

import { SerpSnippet } from "./types.js";

const THORDATA_API_TOKEN = process.env.THORDATA_API_TOKEN || '3802a36b781d24a4979a53c42fee5361';
const THORDATA_API_URL = process.env.THORDATA_API_URL || 'https://scraperapi.thordata.com/request';

interface SerpResult {
  title: string;
  url: string;
  snippet: string;
}

interface SerpResponse {
  totalResults?: number;
  results: SerpResult[];
}

// 语言到国家代码的映射（用于Bing本地化）
const LANGUAGE_TO_COUNTRY_CODE: Record<string, string> = {
  'ko': 'KR', // Korean - South Korea
  'ja': 'JP', // Japanese - Japan
  'fr': 'FR', // French - France
  'ru': 'RU', // Russian - Russia
  'pt': 'BR', // Portuguese - Brazil
  'id': 'ID', // Indonesian - Indonesia
  'es': 'ES', // Spanish - Spain
  'ar': 'SA', // Arabic - Saudi Arabia
  'en': 'US', // English - United States
  'zh': 'CN', // Chinese - China
};

/**
 * ThorData SERP API调用
 */
async function fetchThorDataSerp(query: string, targetLanguage: string = 'en'): Promise<SerpResponse> {
  const formData = new URLSearchParams();
  formData.append('engine', 'Google');
  formData.append('q', query);
  formData.append('json', '1');

  // 添加本地化参数
  const countryCode = LANGUAGE_TO_COUNTRY_CODE[targetLanguage] || 'US';
  formData.append('cc', countryCode);

  // 根据thordata文档，token可能作为参数传递
  if (THORDATA_API_TOKEN) {
    formData.append('token', THORDATA_API_TOKEN);
  }

  try {
    console.log(`调用 ThorData API: ${query} (引擎: Bing, 国家: ${countryCode})`);
    console.log(`API URL: ${THORDATA_API_URL}`);
    console.log(`Token 已设置: ${THORDATA_API_TOKEN ? '是' : '否'}`);

    // 尝试两种认证方式：先尝试Bearer token，如果失败再尝试参数方式
    let response = await fetch(THORDATA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${THORDATA_API_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    // 如果Bearer token方式失败，尝试只使用参数方式
    if (!response.ok && response.status === 401) {
      console.log('Bearer token认证失败，尝试使用token参数方式');
      const formDataWithoutAuth = new URLSearchParams();
      formDataWithoutAuth.append('engine', 'bing');
      formDataWithoutAuth.append('q', query);
      formDataWithoutAuth.append('json', '1');
      formDataWithoutAuth.append('cc', countryCode);
      if (THORDATA_API_TOKEN) {
        formDataWithoutAuth.append('token', THORDATA_API_TOKEN);
      }

      response = await fetch(THORDATA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formDataWithoutAuth,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ThorData API 响应错误:', response.status, errorText);
      throw new Error(`ThorData API 请求失败: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();

    if (data && data.error) {
      console.error('ThorData API 返回错误:', data.error);
      throw new Error(`ThorData API 错误: ${data.error}`);
    }

    // 解析响应
    const parsed = parseSerpResponse(data);

    return {
      totalResults: parsed.resultCount > 0 ? parsed.resultCount : undefined,
      results: parsed.serpSnippets.map(s => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet
      })),
    };
  } catch (error: any) {
    console.error('调用 ThorData API 失败:', error);
    throw error;
  }
}

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
 * Main function to fetch SERP results using ThorData API
 */
export async function fetchSerpResults(
  query: string,
  targetLanguage: string = 'en'
): Promise<SerpResponse> {
  try {
    return await fetchThorDataSerp(query, targetLanguage);
  } catch (error: any) {
    console.error(`Failed to fetch SERP from ThorData:`, error);
    // Return empty results if API fails
    return {
      results: [],
    };
  }
}
