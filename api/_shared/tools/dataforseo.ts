/**
 * DataForSEO API 工具
 *
 * 职责：获取关键词数据、域名分析等 SEO 数据
 * 特点：纯数据获取，无AI逻辑
 *
 * API 文档参考：https://docs.dataforseo.com/v3/
 *
 * 注意：
 * - 使用 Basic Auth 认证（login:password 的 base64 编码）
 * - 所有请求都是 POST 方法
 * - 请求体是 JSON 数组格式
 */

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || 'soulcraftlimited@galatea.bar';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '237696fd88fdfee9';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

// ============================================
// 类型定义
// ============================================

export interface DataForSEOKeywordData {
  keyword: string;
  is_data_found: boolean;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  trends?: { [date: string]: number };
}

export interface DataForSEODomainOverview {
  domain: string;
  organicTraffic?: number;
  totalKeywords?: number;
  avgPosition?: number;
  topKeywords?: string[];
}

// ============================================
// 辅助函数
// ============================================

/**
 * 创建 Basic Auth 认证头
 */
function createAuthHeader(): string {
  const credentials = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

/**
 * 重试请求的辅助函数（处理速率限制错误）
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
        console.log(`[DataForSEO] Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
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
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// 关键词数据获取
// ============================================

/**
 * 获取关键词数据（使用 keyword_ideas API）
 *
 * @param keywords - 关键词数组
 * @param locationCode - 位置代码，默认 2840 (United States)
 * @param languageCode - 语言代码，默认 'en'
 * @returns 关键词数据数组
 */
export async function fetchKeywordData(
  keywords: string[],
  locationCode: number = 2840,
  languageCode: string = 'en'
): Promise<DataForSEOKeywordData[]> {
  try {
    console.log(`[DataForSEO] Fetching data for ${keywords.length} keywords`);

    // DataForSEO API 通常需要分批处理
    const BATCH_SIZE = 10;
    const results: DataForSEOKeywordData[] = [];

    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      console.log(`[DataForSEO] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(keywords.length / BATCH_SIZE)}`);

      const batchResults = await fetchKeywordBatch(batch, locationCode, languageCode);
      results.push(...batchResults);

      // 如果不是最后一批，等待一段时间再请求下一批
      if (i + BATCH_SIZE < keywords.length) {
        await delay(2000); // 延迟2秒
      }
    }

    console.log(`[DataForSEO] Successfully retrieved data for ${results.length} keywords`);
    return results;
  } catch (error: any) {
    console.error('[DataForSEO] Failed to fetch keyword data:', error.message);
    return keywords.map(kw => ({
      keyword: kw,
      is_data_found: false,
    }));
  }
}

/**
 * 获取一批关键词数据
 */
async function fetchKeywordBatch(
  keywords: string[],
  locationCode: number,
  languageCode: string
): Promise<DataForSEOKeywordData[]> {
  try {
    // 使用 keyword_ideas API 或 keywords_data API
    // 这里使用 keywords_data API 获取关键词指标
    const url = `${DATAFORSEO_BASE_URL}/keywords_data/google_ads/keywords_for_keywords/live`;

    // DataForSEO API 请求体是数组格式
    const requestBody = keywords.map(keyword => ({
      keywords: [keyword],
      location_code: locationCode,
      language_code: languageCode,
      sort_by: 'search_volume',
      date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30天前
      date_to: new Date().toISOString().split('T')[0], // 今天
    }));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DataForSEO] API error:', response.status, errorText);
        
        if (response.status === 404 || response.status === 400) {
          return keywords.map(kw => ({
            keyword: kw,
            is_data_found: false,
          }));
        }
        throw new Error(`DataForSEO API error: ${response.status}`);
      }

      const data = await response.json();
      
      // 解析响应数据
      const results: DataForSEOKeywordData[] = [];
      
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((task: any, index: number) => {
          if (task.tasks && task.tasks.length > 0) {
            task.tasks.forEach((taskItem: any) => {
              if (taskItem.result && Array.isArray(taskItem.result)) {
                taskItem.result.forEach((item: any) => {
                  if (item.keyword_info) {
                    const keywordInfo = item.keyword_info;
                    results.push({
                      keyword: keywords[index] || keywordInfo.keyword || '',
                      is_data_found: true,
                      volume: keywordInfo.search_volume || keywordInfo.monthly_searches?.[0]?.search_volume || 0,
                      cpc: keywordInfo.cpc || 0,
                      competition: keywordInfo.competition || 0,
                      difficulty: keywordInfo.keyword_difficulty || 0,
                    });
                  }
                });
              }
            });
          }
        });
      }

      // 如果解析失败，返回默认值
      if (results.length === 0) {
        return keywords.map(kw => ({
          keyword: kw,
          is_data_found: false,
        }));
      }

      return results;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[DataForSEO] Request timeout for keywords');
        return keywords.map(kw => ({
          keyword: kw,
          is_data_found: false,
        }));
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[DataForSEO] Failed to fetch keyword batch:', error.message);
    return keywords.map(kw => ({
      keyword: kw,
      is_data_found: false,
    }));
  }
}

/**
 * 获取单个关键词的数据
 */
export async function fetchSingleKeywordData(
  keyword: string,
  locationCode: number = 2840,
  languageCode: string = 'en'
): Promise<DataForSEOKeywordData | null> {
  try {
    const results = await fetchKeywordData([keyword], locationCode, languageCode);
    return results.length > 0 ? results[0] : null;
  } catch (error: any) {
    console.error(`[DataForSEO] Failed to fetch data for "${keyword}":`, error.message);
    return null;
  }
}

// ============================================
// 域名分析
// ============================================

/**
 * 获取域名概览数据
 *
 * @param domain - 域名（例如: example.com）
 * @param locationCode - 位置代码，默认 2840 (United States)
 * @returns 域名概览数据
 */
export async function getDomainOverview(
  domain: string,
  locationCode: number = 2840
): Promise<DataForSEODomainOverview | null> {
  try {
    console.log(`[DataForSEO] Getting overview for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // 使用 domain_analytics API
    // 注意：可能需要使用不同的端点，如 backlinks/domain_analytics 或 dataforseo_labs
    const url = `${DATAFORSEO_BASE_URL}/domain_analytics/google/overview/live`;

    const requestBody = [{
      target: cleanDomain,
      location_code: locationCode,
    }];

    console.log(`[DataForSEO] Request URL: ${url}`);
    console.log(`[DataForSEO] Request body:`, JSON.stringify(requestBody));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DataForSEO] API error for ${cleanDomain}:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        
        if (response.status === 404) {
          console.log(`[DataForSEO] No data found for domain: ${cleanDomain}`);
          return null;
        }
        
        // 尝试解析错误响应
        try {
          const errorData = JSON.parse(errorText);
          console.error('[DataForSEO] Error details:', errorData);
        } catch {
          // 如果不是 JSON，直接输出文本
        }
        
        return null;
      }

      const data = await response.json();

      // 添加详细日志查看 API 响应结构
      console.log(`[DataForSEO] API Response for ${cleanDomain}:`, {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 0,
        firstItemKeys: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : [],
        hasTasks: Array.isArray(data) && data.length > 0 && data[0].tasks,
        tasksLength: Array.isArray(data) && data.length > 0 && data[0].tasks ? data[0].tasks.length : 0,
        sampleData: JSON.stringify(data).substring(0, 500),
      });

      // 解析响应数据
      // DataForSEO API 响应格式通常是: [{ tasks: [{ status_code: 20000, result: [...] }] }]
      // status_code: 20000 = 成功, 其他值 = 错误
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        
        // 检查是否有 tasks
        if (firstItem.tasks && Array.isArray(firstItem.tasks) && firstItem.tasks.length > 0) {
          const firstTask = firstItem.tasks[0];
          
          // 检查状态码
          const statusCode = firstTask.status_code;
          console.log(`[DataForSEO] Task status_code: ${statusCode}`);
          
          if (statusCode !== 20000) {
            console.error(`[DataForSEO] Task failed with status_code: ${statusCode}`, {
              status_message: firstTask.status_message,
              result: firstTask.result,
            });
            return null;
          }
          
          // 检查 result 字段
          if (firstTask.result && Array.isArray(firstTask.result) && firstTask.result.length > 0) {
            const taskResult = firstTask.result[0];
            console.log(`[DataForSEO] Parsed result keys:`, Object.keys(taskResult));
            console.log(`[DataForSEO] Result values:`, {
              organic_traffic: taskResult.organic_traffic,
              total_keywords: taskResult.total_keywords,
              avg_position: taskResult.avg_position,
            });
            
            return {
              domain: cleanDomain,
              organicTraffic: taskResult.organic_traffic || taskResult.organicTraffic || 0,
              totalKeywords: taskResult.total_keywords || taskResult.totalKeywords || 0,
              avgPosition: taskResult.avg_position || taskResult.avgPosition || 0,
              topKeywords: taskResult.top_keywords || taskResult.topKeywords || [],
            };
          } else if (firstTask.result && typeof firstTask.result === 'object' && !Array.isArray(firstTask.result)) {
            // 如果 result 是对象而不是数组
            const taskResult = firstTask.result;
            console.log(`[DataForSEO] Result is object, keys:`, Object.keys(taskResult));
            console.log(`[DataForSEO] Result values:`, {
              organic_traffic: taskResult.organic_traffic,
              total_keywords: taskResult.total_keywords,
              avg_position: taskResult.avg_position,
            });
            
            return {
              domain: cleanDomain,
              organicTraffic: taskResult.organic_traffic || taskResult.organicTraffic || 0,
              totalKeywords: taskResult.total_keywords || taskResult.totalKeywords || 0,
              avgPosition: taskResult.avg_position || taskResult.avgPosition || 0,
              topKeywords: taskResult.top_keywords || taskResult.topKeywords || [],
            };
          } else {
            console.log(`[DataForSEO] No result found in task:`, {
              hasResult: !!firstTask.result,
              resultType: typeof firstTask.result,
              resultIsArray: Array.isArray(firstTask.result),
              resultValue: firstTask.result,
            });
          }
        } else {
          console.log(`[DataForSEO] No tasks found or tasks is empty`);
        }
      } else {
        console.log(`[DataForSEO] Response is not an array or is empty`);
      }

      return null;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO] Request timeout for overview: ${domain}`);
        return null;
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO] Failed to get overview for ${domain}:`, error.message);
    return null;
  }
}

/**
 * 获取域名的关键词列表
 *
 * @param domain - 域名
 * @param locationCode - 位置代码，默认 2840
 * @param limit - 返回数量限制，默认 100
 * @returns 关键词数组
 */
export async function getDomainKeywords(
  domain: string,
  locationCode: number = 2840,
  limit: number = 100
): Promise<string[]> {
  try {
    console.log(`[DataForSEO] Getting keywords for ${domain}`);

    const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];

    // 使用 domain_analytics API 获取关键词
    const url = `${DATAFORSEO_BASE_URL}/domain_analytics/google/keywords/live`;

    const requestBody = [{
      target: cleanDomain,
      location_code: locationCode,
      limit: limit,
    }];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetchWithRetry(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': createAuthHeader(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DataForSEO] API error:', response.status, errorText);
        return [];
      }

      const data = await response.json();

      // 添加详细日志
      console.log(`[DataForSEO] Keywords API Response for ${cleanDomain}:`, {
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 0,
        sampleData: JSON.stringify(data).substring(0, 500),
      });

      // 解析响应数据
      const keywords: string[] = [];
      
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        
        if (firstItem.tasks && Array.isArray(firstItem.tasks) && firstItem.tasks.length > 0) {
          const firstTask = firstItem.tasks[0];
          const taskResult = firstTask.result;
          
          if (Array.isArray(taskResult)) {
            taskResult.forEach((item: any) => {
              if (item.keyword) {
                keywords.push(item.keyword);
              } else if (item.keyword_text) {
                keywords.push(item.keyword_text);
              }
            });
          } else if (taskResult && typeof taskResult === 'object') {
            // 如果 result 是对象，尝试提取关键词
            console.log(`[DataForSEO] Result is object, keys:`, Object.keys(taskResult));
            if (taskResult.keywords && Array.isArray(taskResult.keywords)) {
              taskResult.keywords.forEach((item: any) => {
                if (typeof item === 'string') {
                  keywords.push(item);
                } else if (item.keyword) {
                  keywords.push(item.keyword);
                }
              });
            }
          }
        }
      }

      console.log(`[DataForSEO] Extracted ${keywords.length} keywords`);
      return keywords.slice(0, limit);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`[DataForSEO] Request timeout for keywords: ${domain}`);
        return [];
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error(`[DataForSEO] Failed to get keywords for ${domain}:`, error.message);
    return [];
  }
}

