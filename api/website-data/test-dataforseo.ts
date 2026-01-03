/**
 * API: 测试 DataForSEO API
 * 
 * 功能：直接调用 DataForSEO API，返回原始响应内容
 * 仅用于本地测试和调试
 * 
 * 方法: POST
 * 端点: /api/website-data/test-dataforseo
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const DATAFORSEO_LOGIN = process.env.DATAFORSEO_LOGIN || 'soulcraftlimited@galatea.bar';
const DATAFORSEO_PASSWORD = process.env.DATAFORSEO_PASSWORD || '237696fd88fdfee9';
const DATAFORSEO_BASE_URL = 'https://api.dataforseo.com/v3';

interface TestRequestBody {
  url: string; // 要测试的网址
  endpoint?: string; // 可选：要测试的端点类型 ('overview' | 'keywords' | 'keyword-data')
  locationCode?: number; // 可选：位置代码，默认 2840 (United States)
}

/**
 * 创建 Basic Auth 认证头
 */
function createAuthHeader(): string {
  const credentials = Buffer.from(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`).toString('base64');
  return `Basic ${credentials}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body as TestRequestBody;

    if (!body.url) {
      return res.status(400).json({ error: 'url is required' });
    }

    // 清理域名
    const cleanDomain = body.url.replace(/^https?:\/\//, '').split('/')[0];
    const endpoint = body.endpoint || 'overview';
    const locationCode = body.locationCode || 2840;

    console.log(`[test-dataforseo] Testing ${endpoint} for domain: ${cleanDomain}`);

    let url: string;
    let requestBody: any[];

    // 根据端点类型构建请求
    switch (endpoint) {
      case 'overview':
        url = `${DATAFORSEO_BASE_URL}/domain_analytics/google/overview/live`;
        requestBody = [{
          target: cleanDomain,
          location_code: locationCode,
        }];
        break;

      case 'keywords':
        url = `${DATAFORSEO_BASE_URL}/domain_analytics/google/keywords/live`;
        requestBody = [{
          target: cleanDomain,
          location_code: locationCode,
          limit: 10,
        }];
        break;

      case 'keyword-data':
        // 先获取关键词列表，然后获取关键词数据
        const keywordsUrl = `${DATAFORSEO_BASE_URL}/domain_analytics/google/keywords/live`;
        const keywordsRequestBody = [{
          target: cleanDomain,
          location_code: locationCode,
          limit: 5,
        }];

        try {
          const keywordsResponse = await fetch(keywordsUrl, {
            method: 'POST',
            headers: {
              'Authorization': createAuthHeader(),
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(keywordsRequestBody),
          });

          const keywordsData = await keywordsResponse.json();
          let keywords: string[] = [];

          // 解析关键词列表
          if (Array.isArray(keywordsData) && keywordsData.length > 0) {
            const firstItem = keywordsData[0];
            if (firstItem.tasks && Array.isArray(firstItem.tasks) && firstItem.tasks.length > 0) {
              const firstTask = firstItem.tasks[0];
              if (firstTask.result && Array.isArray(firstTask.result)) {
                firstTask.result.forEach((item: any) => {
                  if (item.keyword) {
                    keywords.push(item.keyword);
                  } else if (item.keyword_text) {
                    keywords.push(item.keyword_text);
                  }
                });
              }
            }
          }

          if (keywords.length === 0) {
            return res.status(200).json({
              success: false,
              message: 'No keywords found for this domain',
              request: {
                url: keywordsUrl,
                body: keywordsRequestBody,
              },
              response: keywordsData,
            });
          }

          // 获取关键词数据
          url = `${DATAFORSEO_BASE_URL}/keywords_data/google_ads/keywords_for_keywords/live`;
          requestBody = keywords.slice(0, 3).map(keyword => ({
            keywords: [keyword],
            location_code: locationCode,
            language_code: 'en',
            sort_by: 'search_volume',
          }));
        } catch (error: any) {
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch keywords list',
            details: error.message,
          });
        }
        break;

      default:
        return res.status(400).json({ error: `Invalid endpoint: ${endpoint}. Must be 'overview', 'keywords', or 'keyword-data'` });
    }

    console.log(`[test-dataforseo] Request URL: ${url}`);
    console.log(`[test-dataforseo] Request body:`, JSON.stringify(requestBody, null, 2));

    // 发起请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': createAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      console.log(`[test-dataforseo] Response status: ${response.status}`);
      console.log(`[test-dataforseo] Response data length: ${JSON.stringify(responseData).length} bytes`);

      return res.status(200).json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        request: {
          url,
          method: 'POST',
          headers: {
            'Authorization': 'Basic ***',
            'Content-Type': 'application/json',
          },
          body: requestBody,
        },
        response: responseData,
        rawResponse: responseText,
        responseHeaders: {
          'content-type': response.headers.get('content-type'),
          'content-length': response.headers.get('content-length'),
        },
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return res.status(500).json({
          success: false,
          error: 'Request timeout (30s)',
          details: 'The request took too long to complete',
        });
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('[test-dataforseo] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to test DataForSEO API',
      details: error.message,
    });
  }
}

