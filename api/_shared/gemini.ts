// Shared Gemini API service for Vercel serverless functions
import { TargetLanguage } from "./types.js";

/**
 * Gemini 代理服务商配置
 * 支持的代理: 302 (302.ai), tuzi (tu-zi.com)
 * 
 * 环境变量:
 * - GEMINI_PROXY_PROVIDER: 选择代理商 ("302" | "tuzi")，默认 "302"
 * - GEMINI_API_KEY: 302.ai 的 API Key
 * - GEMINI_TUZI_API_KEY: tu-zi.com 的 API Key（如果不设置则使用 GEMINI_API_KEY）
 * - GEMINI_PROXY_URL: 自定义代理 URL（可选，会覆盖默认值）
 */

// 代理商类型
type ProxyProvider = '302' | 'tuzi';

// 代理商配置
interface ProxyConfig {
  baseUrl: string;
  // URL 路径模板，{model} 会被替换为模型名称
  urlTemplate: string;
  // 获取 API Key 的方式
  getApiKey: () => string;
}

// 当前请求的代理商覆盖（用于从前端动态切换）
let requestProxyProviderOverride: ProxyProvider | null = null;
// 当前请求的模型覆盖（用于从前端动态切换）
let requestModelOverride: string | null = null;

/**
 * 设置当前请求的代理商（由 request-handler 调用）
 * 这允许前端通过 X-Proxy-Provider header 来覆盖默认代理商
 */
export function setRequestProxyProvider(provider: '302' | 'tuzi' | null): void {
  if (provider === '302' || provider === 'tuzi') {
    requestProxyProviderOverride = provider;
  } else {
    requestProxyProviderOverride = null;
  }
}

/**
 * 设置当前请求的模型（由 request-handler 调用）
 * 这允许前端通过 X-Gemini-Model header 来覆盖默认模型
 */
export function setRequestModel(model: string | null): void {
  if (model && model.startsWith('gemini-')) {
    requestModelOverride = model;
  } else {
    requestModelOverride = null;
  }
}

/**
 * 获取当前使用的模型
 */
export function getCurrentModel(): string {
  const result = requestModelOverride || MODEL;
  console.log(`[Gemini] getCurrentModel: override=${requestModelOverride}, default=${MODEL}, result=${result}`);
  return result;
}

/**
 * 清除当前请求的代理商覆盖
 */
export function clearRequestProxyProvider(): void {
  requestProxyProviderOverride = null;
}

/**
 * 清除当前请求的模型覆盖
 */
export function clearRequestModel(): void {
  requestModelOverride = null;
}

// 获取当前代理商
const getProxyProvider = (): ProxyProvider => {
  // 优先使用请求级别的覆盖
  if (requestProxyProviderOverride) {
    return requestProxyProviderOverride;
  }
  // 否则使用环境变量
  const provider = (process.env.GEMINI_PROXY_PROVIDER || '302').toLowerCase();
  if (provider === 'tuzi' || provider === 'tu-zi') {
    return 'tuzi';
  }
  return '302';
};

// 获取代理配置（每次都从原始配置创建新对象，确保不会污染）
const getProxyConfig = (): ProxyConfig & { provider: ProxyProvider } => {
  const provider = getProxyProvider();

  // 从原始配置获取（硬编码，确保不会出错）
  let baseUrl: string;
  let urlTemplate: string;
  let getApiKey: () => string;

  if (provider === 'tuzi') {
    baseUrl = 'https://api.tu-zi.com';
    urlTemplate = '/v1beta/models/{model}:generateContent';
    getApiKey = () => process.env.GEMINI_TUZI_API_KEY || process.env.GEMINI_API_KEY || '';
  } else {
    baseUrl = 'https://api.302.ai';
    urlTemplate = '/v1/v1beta/models/{model}:generateContent';
    getApiKey = () => process.env.GEMINI_API_KEY || '';
  }

  // 允许通过 GEMINI_PROXY_URL 覆盖默认 baseUrl（但只在没有自定义时才使用）
  const customBaseUrl = process.env.GEMINI_PROXY_URL;
  if (customBaseUrl) {
    baseUrl = customBaseUrl;
  }


  const config: ProxyConfig = {
    baseUrl,
    urlTemplate,
    getApiKey,
  };

  return { ...config, provider };
};

// 构建 API URL
const buildApiUrl = (model: string): string => {
  const config = getProxyConfig();
  const url = config.baseUrl + config.urlTemplate.replace('{model}', model);
  return url;
};

// 获取 API Key
const getApiKey = (): string => {
  const config = getProxyConfig();
  return config.getApiKey();
};

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Fallback model to use when primary model fails (faster, more reliable)
const FALLBACK_MODEL = 'gemini-2.5-flash';

// 导出当前代理和模型信息，方便调试
export const getCurrentProxyInfo = () => {
  const config = getProxyConfig();
  return {
    provider: config.provider,
    baseUrl: config.baseUrl,
    urlTemplate: config.urlTemplate,
    hasApiKey: !!config.getApiKey(),
    model: getCurrentModel(),
    defaultModel: MODEL,
  };
};

interface GeminiConfig {
  model?: string;
  responseMimeType?: string;
  responseSchema?: any;
  /**
   * 启用 Google 搜索检索工具（联网搜索）
   * 当设置为 true 时，Gemini 可以调用 Google 搜索来获取实时信息
   */
  enableGoogleSearch?: boolean;
  /**
   * 最大输出 token 数
   * 默认使用模型支持的最大值 65536（Gemini 2.5 Flash 支持的最大值）
   * 可以显式指定其他值来覆盖默认值
   */
  maxOutputTokens?: number;
  /**
   * 推理模式（思考模式）
   * - "none": 禁用思考模式，直接输出结果（最快）
   * - "short": 短思考模式
   * - "long": 长思考模式
   * 默认值：对于性能敏感的场景（如关键词分析），使用 "none" 以加快速度
   */
  reasoningMode?: 'none' | 'short' | 'long';
  /**
   * 重试时的回调函数
   */
  onRetry?: (attempt: number, error: string, delay: number) => void;
  /**
   * 使用回退模型时的回调函数
   */
  onFallback?: (originalModel: string, fallbackModel: string) => void;
}

/**
 * Call Gemini API with automatic retries for network errors
 * Includes fallback to gemini-2.5-flash when primary model fails
 */
export async function callGeminiAPI(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
  const maxRetries = 3;
  let lastError: any;
  const currentModel = config?.model || MODEL;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await _callGeminiInternal(prompt, systemInstruction, config);
    } catch (error: any) {
      lastError = error;

      // Determine if it's a retryable network error
      const errorMessage = error.message?.toLowerCase() || '';
      const errorCode = error.code?.toLowerCase() || '';
      const errorName = error.name?.toLowerCase() || '';

      const isNetworkError =
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('reset') ||
        errorCode.includes('und_err') ||
        errorCode.includes('timeout') ||
        errorCode.includes('econn') ||
        errorName === 'typeerror' ||
        errorName === 'aborterror' ||
        errorName.includes('timeout');

      if (isNetworkError && attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`[Gemini API] Attempt ${attempt + 1} failed with network error. Retrying in ${delay}ms... (Error: ${error.message}${error.code ? ' [' + error.code + ']' : ''})`);

        if (config?.onRetry) {
          config.onRetry(attempt + 1, error.message, delay);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // For non-network errors or last attempt, throw it
      throw error;
    }
  }

  // After all retries failed, try fallback model if different from current model
  if (currentModel !== FALLBACK_MODEL) {
    console.warn(`[Gemini API] All retries failed with model ${currentModel}. Falling back to ${FALLBACK_MODEL}...`);
    // 通知调用者正在使用回退模型
    if (config?.onFallback) {
      config.onFallback(currentModel, FALLBACK_MODEL);
    }
    try {
      const fallbackConfig = { ...config, model: FALLBACK_MODEL };
      return await _callGeminiInternal(prompt, systemInstruction, fallbackConfig);
    } catch (fallbackError: any) {
      console.error(`[Gemini API] Fallback model ${FALLBACK_MODEL} also failed:`, fallbackError.message);
      // Throw the original error as it's more informative
      throw lastError;
    }
  }

  throw lastError;
}

/**
 * Internal function to handle the actual API request
 */
async function _callGeminiInternal(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
  const apiKey = getApiKey();
  const proxyInfo = getCurrentProxyInfo();

  if (!apiKey || apiKey.trim() === '') {
    console.error(`API Key is not configured for proxy provider: ${proxyInfo.provider}`);
    throw new Error(`API Key is not configured for ${proxyInfo.provider}. Please set GEMINI_API_KEY${proxyInfo.provider === 'tuzi' ? ' or GEMINI_TUZI_API_KEY' : ''} in environment variables.`);
  }

  // 优先级：config.model > requestModelOverride > 环境变量 MODEL
  const modelName = config?.model || getCurrentModel();
  const url = buildApiUrl(modelName);
  console.log(`[Gemini API] Using proxy: ${proxyInfo.provider}, model: ${modelName}, URL: ${url}`);

  const contents: any[] = [];
  if (systemInstruction) {
    contents.push({
      role: 'user',
      parts: [{ text: systemInstruction }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'Understood. I will follow these instructions.' }]
    });
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const requestBody: any = {
    contents: contents,
    generationConfig: {
      maxOutputTokens: config?.maxOutputTokens ?? 65536,
      reasoningMode: config?.reasoningMode ?? 'none'
    }
  };

  // Configure tools: Google Search
  if (config?.enableGoogleSearch) {
    requestBody.tools = [
      {
        googleSearchRetrieval: {
          disableAttribution: true
        }
      }
    ];
  }

  if (config?.responseMimeType === 'application/json') {
    requestBody.generationConfig.responseMimeType = 'application/json';
    if (config?.responseSchema) {
      requestBody.generationConfig.responseSchema = config.responseSchema;
    }
  }

  // Add timeout for fetch (240 seconds per request - balanced for performance and reliability)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minutes

  try {
    console.log(`[Gemini API] Requesting ${config?.model || MODEL} with timeout 240s`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Response Error:', response.status, errorText);
      throw new Error(`API Request Failed: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    let content = '';

    if (data.error) {
      console.error('API Error Response:', data.error);
      throw new Error(`API Error: ${data.error}`);
    }

    let searchResults: Array<{ title: string; url: string; snippet?: string }> = [];

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      const finishReason = candidate.finishReason || candidate.finish_reason;

      if (finishReason === 'LENGTH' || finishReason === 'MAX_TOKENS') {
        console.warn('⚠️ API response truncated (finishReason: ' + finishReason + ')');
      }

      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        content = candidate.content.parts[0].text || '';

        if (config?.enableGoogleSearch && config?.responseMimeType === 'application/json') {
          content = cleanJSONFromSearchReferences(content);
          if (content && typeof content === 'string') {
            const trimmedContent = content.trim();
            if (trimmedContent && typeof trimmedContent.startsWith === 'function' && (trimmedContent.startsWith('**') || trimmedContent.startsWith('*') || trimmedContent.startsWith('#'))) {
              const firstBrace = content.indexOf('{');
              if (firstBrace > 0) {
                content = content.substring(firstBrace);
              }
              content = content.replace(/^\*\*[^*]+\*\*/gm, '');
            }
            content = content.replace(/^\*[^*]+/gm, '');
            content = content.replace(/^#+\s+/gm, '');
            content = content.replace(/^```[\s\S]*?```/gm, '');
            content = content.trim();
          }
        }
      }

      if (candidate.groundingMetadata && candidate.groundingMetadata.groundingChunks) {
        const chunks = candidate.groundingMetadata.groundingChunks;
        searchResults = chunks
          .filter((chunk: any) => chunk.web && chunk.web.uri)
          .map((chunk: any) => ({
            title: chunk.web?.title || chunk.web?.uri || 'Untitled',
            url: chunk.web.uri,
            snippet: chunk.web?.snippet || undefined,
          }));

        const seenUrls = new Set<string>();
        searchResults = searchResults.filter((result) => {
          if (seenUrls.has(result.url)) return false;
          seenUrls.add(result.url);
          return true;
        });
      }
    }

    if (!content && data.output) {
      content = data.output;
    }

    if (!content) {
      console.warn('⚠️ No text content found in API response');
      throw new Error('No text content found in API response');
    }

    const finishReason = data.candidates?.[0]?.finishReason || data.candidates?.[0]?.finish_reason;

    return {
      text: content,
      raw: data,
      searchResults: searchResults.length > 0 ? searchResults : undefined,
      finishReason: finishReason,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('API Request Timeout (300s)');
    }
    console.error('Call Gemini API Failed:', error);
    throw error;
  }
}

/**
 * Clean Google Search reference markers from JSON response
 */
function cleanJSONFromSearchReferences(text: string): string {
  if (!text) return text;
  text = text.replace(/\[\d+\]/g, '');
  text = text.replace(/\[source\]/gi, '');
  text = text.replace(/\[citation\]/gi, '');
  text = text.replace(/\(source[^)]*\)/gi, '');
  text = text.replace(/\(from[^)]*\)/gi, '');
  text = text.replace(/\(citation[^)]*\)/gi, '');
  text = text.replace(/(?<!["'])\bhttps?:\/\/[^\s)]+(?!["'])/g, '');
  text = text.replace(/^(根据|基于|来自).{0,20}(搜索结果|搜索|资料)[:：]\s*/i, '');
  text = text.replace(/^(According to|Based on|From).{0,30}(search results|search|sources)[:：]\s*/i, '');

  const lines = text.split('\n');
  const cleanedLines = lines.filter(line => {
    const trimmed = line.trim();
    if (/^(\[\d+\]|\(source|\(from|\(citation|来源|参考)/i.test(trimmed)) return false;
    if (/^https?:\/\/.+$/.test(trimmed)) return false;
    return true;
  });

  return cleanedLines.join('\n').trim();
}

/**
 * Extract JSON from text that may contain thinking process or markdown
 */
export function extractJSON(text: string): string {
  if (!text) return '{}';
  text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');

  let startIdx = -1;
  let endIdx = -1;
  let isArray = false;

  if (firstBrace !== -1 && firstBracket !== -1) {
    if (firstBrace < firstBracket) {
      startIdx = firstBrace;
      endIdx = lastBrace;
      isArray = false;
    } else {
      startIdx = firstBracket;
      endIdx = lastBracket;
      isArray = true;
    }
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
    endIdx = lastBrace;
    isArray = false;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = lastBracket;
    isArray = true;
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const extracted = text.substring(startIdx, endIdx + 1).trim();
    if (extracted && typeof extracted === 'string') {
      if ((isArray && extracted.startsWith('[') && extracted.endsWith(']')) ||
        (!isArray && extracted.startsWith('{') && extracted.endsWith('}'))) {
        return extracted;
      }
    }
  }
  return text.trim() || '{}';
}

const getLanguageName = (code: TargetLanguage): string => {
  switch (code) {
    case 'en': return 'English';
    case 'fr': return 'French';
    case 'ru': return 'Russian';
    case 'ja': return 'Japanese';
    case 'ko': return 'Korean';
    case 'pt': return 'Portuguese';
    case 'id': return 'Indonesian';
    case 'es': return 'Spanish';
    case 'ar': return 'Arabic';
    default: return 'English';
  }
};

export const translatePromptToSystemInstruction = async (userPrompt: string): Promise<string> => {
  const response = await callGeminiAPI(
    `Translate and optimize the following prompt into a high-quality System Instruction for an AI SEO Agent targeting Google Search. Keep the instruction in English for better model performance:\n\n"${userPrompt}"`
  );
  return response.text || userPrompt;
};

export const translateText = async (text: string, targetLanguage: 'zh' | 'en'): Promise<string> => {
  const langName = targetLanguage === 'zh' ? 'Chinese' : 'English';
  const response = await callGeminiAPI(
    `Translate the following system instruction text into ${langName} for reference purposes. Preserve the original meaning and formatting:\n\n${text}`
  );
  return response.text || text;
};

export const translateKeywordToTarget = async (
  keyword: string,
  targetLanguage: TargetLanguage
): Promise<{ original: string; translated: string; translationBack: string }> => {
  const targetLangName = getLanguageName(targetLanguage);
  const prompt = `You are a professional SEO translator specializing in cross-market keyword translation. Translate the following keyword into ${targetLangName} for SEO purposes. Respond with ONLY the translated keyword. Keyword: "${keyword}"`;

  try {
    const response = await callGeminiAPI(prompt);
    const translated = response.text.trim();
    return {
      original: keyword,
      translated: translated,
      translationBack: keyword
    };
  } catch (error: any) {
    console.error(`Translation failed for keyword "${keyword}":`, error);
    return {
      original: keyword,
      translated: keyword,
      translationBack: keyword
    };
  }
};
