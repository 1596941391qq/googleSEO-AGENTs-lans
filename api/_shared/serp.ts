// ThorData SERP (Search Engine Results Page) fetching service


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
 * ThorData SERP API调用
 */
async function fetchThorDataSerp(query: string, targetLanguage: string = 'en'): Promise<SerpResponse> {
  const formData = new URLSearchParams();
  formData.append('engine', 'google');
  formData.append('q', query);
  formData.append('json', '1');

  // // 添加本地化参数
  // const countryCode = LANGUAGE_TO_COUNTRY_CODE[targetLanguage] || 'US';
  // formData.append('gl', countryCode);

  try {
    const response = await fetch(THORDATA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${THORDATA_API_TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

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
    return {
      results: [],
    };
  }
}
