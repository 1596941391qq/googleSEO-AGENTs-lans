/**
 * SE Ranking API 工具
 * 
 * 职责：获取关键词的真实数据（搜索量、难度、CPC等）
 * 特点：纯数据获取，无AI逻辑
 */

const SERANKING_API_KEY = process.env.SERANKING_API_KEY || 'a3eefe61-1e2b-0939-f0c9-d01d9a957852';
const SERANKING_ENDPOINT = 'https://api.seranking.com/v1/keywords/export';

export interface SERankingData {
  keyword: string;
  is_data_found: boolean;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  history_trend?: { [date: string]: number };
}

/**
 * 批量获取SE Ranking数据（带速率限制和重试逻辑）
 * 
 * @param keywords - 关键词数组
 * @param location - 搜索地区，默认 'us'
 * @param retryCount - 重试次数，默认 3
 * @returns SE Ranking数据数组
 */
export async function fetchSErankingData(
  keywords: string[],
  location: string = 'us',
  retryCount: number = 3
): Promise<SERankingData[]> {
  // 限制每次请求的关键词数量，避免速率限制
  const BATCH_SIZE = 10; // 每次最多请求10个关键词
  const DELAY_BETWEEN_BATCHES = 2000; // 批次之间延迟2秒
  
  try {
    console.log(`[SE Ranking] Fetching data for ${keywords.length} keywords`);

    // 如果关键词数量较少，直接请求
    if (keywords.length <= BATCH_SIZE) {
      return await fetchBatchWithRetry(keywords, location, retryCount);
    }

    // 分批处理
    const results: SERankingData[] = [];
    for (let i = 0; i < keywords.length; i += BATCH_SIZE) {
      const batch = keywords.slice(i, i + BATCH_SIZE);
      console.log(`[SE Ranking] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(keywords.length / BATCH_SIZE)}`);
      
      const batchResults = await fetchBatchWithRetry(batch, location, retryCount);
      results.push(...batchResults);
      
      // 如果不是最后一批，等待一段时间再请求下一批
      if (i + BATCH_SIZE < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log(`[SE Ranking] Successfully retrieved data for ${results.length} keywords`);
    return results;
  } catch (error: any) {
    console.error('[SE Ranking] API call failed:', error);
    throw error;
  }
}

/**
 * 获取一批关键词数据（带重试逻辑）
 */
async function fetchBatchWithRetry(
  keywords: string[],
  location: string,
  maxRetries: number
): Promise<SERankingData[]> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Build multipart/form-data body manually
      // SE Ranking API requires keywords to be quoted: keywords[]="keyword"
      const boundary = `----FormBoundary${Math.random().toString(36).substr(2)}`;
      const formParts: string[] = [];

      // Add each keyword with quotes
      keywords.forEach(keyword => {
        formParts.push(`--${boundary}\r\n`);
        formParts.push(`Content-Disposition: form-data; name="keywords[]"\r\n\r\n`);
        formParts.push(`"${keyword}"\r\n`);
      });

      // Add cols field with quotes
      formParts.push(`--${boundary}\r\n`);
      formParts.push(`Content-Disposition: form-data; name="cols"\r\n\r\n`);
      formParts.push(`"keyword,volume,cpc,competition,difficulty,history_trend"\r\n`);

      // End boundary
      formParts.push(`--${boundary}--\r\n`);

      const body = formParts.join('');

      const response = await fetch(`${SERANKING_ENDPOINT}?source=${location}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${SERANKING_API_KEY}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: body,
      });

      // 处理速率限制错误 (429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000; // 指数退避
        
        console.warn(`[SE Ranking] Rate limited (429). Waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // 重试
        } else {
          throw new Error(`SE Ranking API rate limit exceeded after ${maxRetries} attempts`);
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SE Ranking] API error:', response.status, errorText);
        throw new Error(`SE Ranking API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      lastError = error;
      
      // 如果是速率限制错误且还有重试机会，继续重试
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 指数退避
          console.warn(`[SE Ranking] Retrying after ${waitTime}ms (attempt ${attempt}/${maxRetries})`);
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
  
  throw lastError || new Error('Failed to fetch SE Ranking data');
}

/**
 * 获取单个关键词的SE Ranking数据
 * 
 * @param keyword - 关键词
 * @param location - 搜索地区，默认 'us'
 * @returns SE Ranking数据，如果失败返回null
 */
export async function fetchSingleKeywordData(
  keyword: string,
  location: string = 'us'
): Promise<SERankingData | null> {
  try {
    const results = await fetchSErankingData([keyword], location);
    return results.length > 0 ? results[0] : null;
  } catch (error: any) {
    console.error(`[SE Ranking] Failed to fetch data for "${keyword}":`, error.message);
    return null;
  }
}

