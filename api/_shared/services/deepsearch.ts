/**
 * UniFuncs Deep Search API 客户端
 * 用于文章发布后的索引收录
 */

interface DeepSearchRequest {
  articleTitle: string;
  articleUrl: string;
  promotionWebsite: string;
  promotionKeywords?: string[];
  targetLanguage?: string;  // 文章目标语言
}

interface DeepSearchResponse {
  success: boolean;
  taskId?: string;
  error?: string;
  message?: string;
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

  console.log('[DeepSearch] ✓ API Key configured:', apiKey.substring(0, 10) + '...');

  const { articleTitle, articleUrl, promotionWebsite, promotionKeywords, targetLanguage } = request;

  console.log('[DeepSearch] 🚀 Starting Deep Search indexing...');
  console.log(`[DeepSearch] Article: "${articleTitle}"`);
  console.log(`[DeepSearch] Article URL: ${articleUrl}`);
  console.log(`[DeepSearch] Promotion Website: ${promotionWebsite}`);
  console.log(`[DeepSearch] Target Language: ${targetLanguage || 'en'}`);

  // 🔧 根据目标语言生成提示
  const languageNames: Record<string, string> = {
    'en': 'English',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
    'fr': 'French',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'id': 'Indonesian',
    'es': 'Spanish',
    'ar': 'Arabic',
  };

  const languageName = languageNames[targetLanguage || 'en'] || 'English';

  const importantPrompt = `Search the web to compare this product with other products and promoted websites, and naturally highlight the promoted product. IMPORTANT: Generate all content in ${languageName}. The output language must match the article's language (${languageName}).`;

  console.log(`[DeepSearch] 📝 Important Prompt: ${importantPrompt}`);

  // 🔧 修复：确保 promotionWebsite 是有效的 URL
  // 如果不是 URL（不包含 http:// 或 https://），则不添加到 important_urls
  const isValidUrl = promotionWebsite && (
    promotionWebsite.startsWith('http://') ||
    promotionWebsite.startsWith('https://')
  );

  const importantUrls = isValidUrl
    ? [promotionWebsite, articleUrl]
    : [articleUrl];

  console.log(`[DeepSearch] Important URLs:`, importantUrls);

  // 构建请求体（异步任务版本）
  const requestBody = {
    model: 's2',
    messages: [
      {
        role: 'user',
        content: articleTitle, // 使用文章标题作为搜索内容
      },
    ],
    important_urls: importantUrls,
    important_keywords: promotionKeywords || [promotionWebsite],
    important_prompt: importantPrompt,  // 使用动态生成的语言特定提示
    push_to_share: true,
    set_public: true,
  };

  console.log('[DeepSearch] 📤 Request body:', JSON.stringify(requestBody, null, 2));

  try {
    console.log('[DeepSearch] 🔄 Creating async task...');

    // 添加超时控制（30 秒）
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.unifuncs.com/deepsearch/v1/create_task', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DeepSearch] ❌ API request failed: ${response.status} ${response.statusText}`);
      console.error(`[DeepSearch] Error response: ${errorText}`);
      return {
        success: false,
        error: `Deep Search API error: ${response.status} ${response.statusText}`,
      };
    }

    const result = await response.json();
    console.log('[DeepSearch] 📥 Response:', JSON.stringify(result, null, 2));

    // 检查响应格式
    if (result.code === 0 && result.data?.task_id) {
      console.log(`[DeepSearch] ✅ Task created successfully!`);
      console.log(`[DeepSearch] Task ID: ${result.data.task_id}`);
      console.log(`[DeepSearch] Status: ${result.data.status}`);
      console.log(`[DeepSearch] Created at: ${result.data.created_at}`);

      return {
        success: true,
        taskId: result.data.task_id,
        message: 'Article indexing task created successfully',
      };
    } else {
      console.error('[DeepSearch] ❌ Unexpected response format:', result);
      return {
        success: false,
        error: result.message || 'Unexpected response format',
      };
    }

  } catch (error: any) {
    console.error('[DeepSearch] ❌ Request failed:', error.message);

    // 特殊处理超时错误
    if (error.name === 'AbortError') {
      console.error('[DeepSearch] ⏱️ Request timeout after 30 seconds');
      return {
        success: false,
        error: 'Request timeout - unifuncs API did not respond in time',
      };
    }

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

