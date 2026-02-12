// Shared AI API service for Vercel serverless functions
// 当前使用: 302.ai DeepSeek V3 API (OpenAI 兼容格式)
import { TargetLanguage } from "./types.js";

/**
 * AI 模型代理服务商配置
 * 当前使用: 302.ai DeepSeek V3 API (OpenAI 兼容格式)
 * 
 * 环境变量:
 * - GEMINI_API_KEY: 302.ai 的 API Key
 * - GEMINI_MODEL: 模型名称，默认 "deepseek-chat"
 */

// 代理商类型（保留兼容性）
type ProxyProvider = '302' | 'tuzi';

// 代理商配置
interface ProxyConfig {
  baseUrl: string;
  // 获取 API Key 的方式
  getApiKey: () => string;
}

// 当前请求的模型覆盖（用于从前端动态切换）
let requestModelOverride: string | null = null;

/**
 * 设置当前请求的代理商（保留兼容性，实际不再使用）
 */
export function setRequestProxyProvider(provider: '302' | 'tuzi' | null): void {
  // 保留接口兼容性，不做任何操作
}

/**
 * 设置当前请求的模型（由 request-handler 调用）
 */
export function setRequestModel(model: string | null): void {
  requestModelOverride = model;
}

/**
 * 获取当前使用的模型
 */
export function getCurrentModel(): string {
  return requestModelOverride || MODEL;
}

/**
 * 清除当前请求的代理商覆盖（保留兼容性）
 */
export function clearRequestProxyProvider(): void {
  // 保留接口兼容性
}

/**
 * 清除当前请求的模型覆盖
 */
export function clearRequestModel(): void {
  requestModelOverride = null;
}

// 获取代理配置
const getProxyConfig = (): ProxyConfig => {
  return {
    baseUrl: 'https://api.302.ai',
    getApiKey: () => process.env.GEMINI_API_KEY || '',
  };
};

// 获取 API Key
const getApiKey = (): string => {
  const config = getProxyConfig();
  return config.getApiKey();
};

const MODEL = process.env.GEMINI_MODEL || 'sophnet/DeepSeek-V3.2-Fast';
// Fallback model (保持相同)
const FALLBACK_MODEL = 'sophnet/DeepSeek-V3.2-Fast';

// 导出当前代理和模型信息，方便调试
export const getCurrentProxyInfo = () => {
  const config = getProxyConfig();
  return {
    provider: '302.ai',
    baseUrl: config.baseUrl,
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
   * 启用联网搜索（DeepSeek 不支持，保留兼容性）
   */
  enableGoogleSearch?: boolean;
  /**
   * 最大输出 token 数
   */
  maxOutputTokens?: number;
  /**
   * 推理模式（DeepSeek 不支持，保留兼容性）
   */
  reasoningMode?: 'none' | 'short' | 'long';
  /**
   * 温度参数 (0-2)
   */
  temperature?: number;
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
 * Call DeepSeek API with streaming response (OpenAI compatible SSE)
 */
export async function callGeminiAPIStream(
  prompt: string,
  systemInstruction: string | undefined,
  config: GeminiConfig | undefined,
  onDelta: (delta: string, fullText: string) => void
) {
  const apiKey = getApiKey();
  const proxyInfo = getCurrentProxyInfo();

  if (!apiKey || apiKey.trim() === '') {
    console.error(`API Key is not configured`);
    throw new Error(`API Key is not configured. Please set GEMINI_API_KEY in environment variables.`);
  }

  const modelName = config?.model || getCurrentModel();
  const url = `${proxyInfo.baseUrl}/v1/chat/completions`;

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({
      role: 'system',
      content: systemInstruction
    });
  }
  messages.push({
    role: 'user',
    content: prompt
  });

  const requestBody: any = {
    model: modelName,
    messages: messages,
    stream: true,
    temperature: config?.temperature ?? 1.0,
  };

  if (config?.maxOutputTokens) {
    requestBody.max_tokens = config.maxOutputTokens;
  }

  if (config?.responseMimeType === 'application/json') {
    requestBody.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Stream Response Error:', response.status, errorText);
      throw new Error(`API Stream Request Failed: ${response.status} ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available for streaming response');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';
    let finishReason: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const payload = trimmed.replace(/^data:\s*/, '');
        if (!payload || payload === '[DONE]') continue;

        try {
          const json: any = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            onDelta(delta, fullText);
          }
          if (json.choices?.[0]?.finish_reason) {
            finishReason = json.choices[0].finish_reason;
          }
        } catch (e) {
          console.warn('[DeepSeek Stream] Failed to parse chunk:', e);
        }
      }
    }

    clearTimeout(timeoutId);

    if (!fullText) {
      throw new Error('No text content found in streaming response');
    }

    return {
      text: fullText,
      raw: undefined,
      finishReason,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('API Stream Request Timeout (300s)');
    }
    console.error('Call DeepSeek API Stream Failed:', error);
    throw error;
  }
}

/**
 * Internal function to handle the actual API request (OpenAI compatible format)
 */
async function _callGeminiInternal(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
  const apiKey = getApiKey();
  const proxyInfo = getCurrentProxyInfo();

  if (!apiKey || apiKey.trim() === '') {
    console.error(`API Key is not configured`);
    throw new Error(`API Key is not configured. Please set GEMINI_API_KEY in environment variables.`);
  }

  const modelName = config?.model || getCurrentModel();
  const url = `${proxyInfo.baseUrl}/v1/chat/completions`;

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({
      role: 'system',
      content: systemInstruction
    });
  }
  messages.push({
    role: 'user',
    content: prompt
  });

  const requestBody: any = {
    model: modelName,
    messages: messages,
    temperature: config?.temperature ?? 1.0,
  };

  if (config?.maxOutputTokens) {
    requestBody.max_tokens = config.maxOutputTokens;
  }

  if (config?.responseMimeType === 'application/json') {
    requestBody.response_format = { type: 'json_object' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
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
      throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    if (data.choices && data.choices.length > 0) {
      const choice = data.choices[0];
      const finishReason = choice.finish_reason;

      if (finishReason === 'length') {
        console.warn('⚠️ API response truncated (finish_reason: length)');
      }

      content = choice.message?.content || '';
    }

    if (!content) {
      console.warn('⚠️ No text content found in API response');
      throw new Error('No text content found in API response');
    }

    const finishReason = data.choices?.[0]?.finish_reason;

    return {
      text: content,
      raw: data,
      searchResults: undefined,
      finishReason: finishReason,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('API Request Timeout (300s)');
    }
    console.error('Call DeepSeek API Failed:', error);
    throw error;
  }
}

/**
 * Clean JSON response (simplified for DeepSeek)
 */
function cleanJSONFromSearchReferences(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  // DeepSeek 通常不会添加搜索引用，保持简单清理
  text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return text;
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
    if (extracted && typeof extracted === 'string' && extracted.length > 0) {
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

/**
 * 生成文档摘要（用于README更新）
 * 提炼文章的核心内容为2-3句话的简短摘要
 */
export const summarizeArticleForReadme = async (
  title: string,
  content: string
): Promise<string> => {
  const prompt = `You are a technical documentation expert. Summarize the following article into 2-3 concise sentences for a README file. Focus on the key value and main topics covered. Keep it professional and informative.

Article Title: "${title}"

Article Content:
${content.substring(0, 2000)}

Provide ONLY the summary text, no additional formatting or explanations.`;

  try {
    const response = await callGeminiAPI(prompt);
    return response.text.trim();
  } catch (error: any) {
    console.error(`Failed to generate summary for article "${title}":`, error);
    // 返回默认摘要
    return `Documentation for ${title}. This article covers key concepts and implementation details.`;
  }
};
