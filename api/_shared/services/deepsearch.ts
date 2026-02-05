/**
 * UniFuncs Deep Search API 客户端
 * 用于文章发布后的索引收录
 */

interface DeepSearchRequest {
  articleTitle: string;
  articleUrl: string;
  promotionWebsite: string;
  promotionKeywords?: string[];
}

interface DeepSearchResponse {
  success: boolean;
  shareUrl?: string;
  error?: string;
  rawResponse?: string;
}

/**
 * 调用 UniFuncs Deep Search API 进行文章索引
 * @param request - 请求参数
 * @returns 响应结果
 */
export async function indexArticleWithDeepSearch(
  request: DeepSearchRequest
): Promise<DeepSearchResponse> {
  const apiKey = process.env.UNIFUNCS_API_KEY;

  if (!apiKey) {
    console.error('[DeepSearch] ❌ UNIFUNCS_API_KEY not found in environment variables');
    return {
      success: false,
      error: 'UNIFUNCS_API_KEY not configured',
    };
  }

  const { articleTitle, articleUrl, promotionWebsite, promotionKeywords } = request;

  console.log('[DeepSearch] 🚀 Starting Deep Search indexing...');
  console.log(`[DeepSearch] Article: "${articleTitle}"`);
  console.log(`[DeepSearch] Article URL: ${articleUrl}`);
  console.log(`[DeepSearch] Promotion Website: ${promotionWebsite}`);

  // 构建请求体
  const requestBody = {
    model: 's2',
    messages: [
      {
        role: 'user',
        content: articleTitle, // 使用文章标题作为搜索内容
      },
    ],
    stream: true,
    important_urls: [
      promotionWebsite,
      articleUrl,
    ],
    important_keywords: promotionKeywords || [promotionWebsite],
    important_prompt: '联网搜索将其他产品和推广网站进行评测对比，并用自然的方式突出推广的产品',
    push_to_share: true,
    set_public: true,
  };

  console.log('[DeepSearch] 📤 Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('https://api.unifuncs.com/deepsearch/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DeepSearch] ❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`[DeepSearch] Error response: ${errorText}`);
      return {
        success: false,
        error: `Deep Search API error: ${response.status} ${response.statusText}`,
      };
    }

    console.log('[DeepSearch] ✅ API request successful, processing stream...');

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('[DeepSearch] ❌ No response body reader available');
      return {
        success: false,
        error: 'No response body',
      };
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let shareUrl: string | undefined;

    console.log('[DeepSearch] 📥 Stream output:');
    console.log('─'.repeat(80));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullResponse += chunk;

      // 实时输出到控制台
      process.stdout.write(chunk);

      // 尝试提取分享链接（如果有的话）
      // 格式可能是: {"share_url": "https://s.unifuncs.com/share/xxx"}
      const shareUrlMatch = chunk.match(/"share_url"\s*:\s*"([^"]+)"/);
      if (shareUrlMatch) {
        shareUrl = shareUrlMatch[1];
        console.log(`\n[DeepSearch] 🔗 Found share URL: ${shareUrl}`);
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('[DeepSearch] ✅ Stream completed');
    console.log(`[DeepSearch] Total response length: ${fullResponse.length} characters`);

    if (shareUrl) {
      console.log(`[DeepSearch] 🎉 Share URL: ${shareUrl}`);
    }

    return {
      success: true,
      shareUrl,
      rawResponse: fullResponse,
    };

  } catch (error: any) {
    console.error('[DeepSearch] ❌ Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * 等待指定时间（用于等待平台构建完成）
 * @param seconds - 等待秒数
 */
export async function waitForBuildCompletion(seconds: number): Promise<void> {
  console.log(`[DeepSearch] ⏳ Waiting ${seconds} seconds for platform build to complete...`);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  console.log('[DeepSearch] ✅ Wait completed');
}

