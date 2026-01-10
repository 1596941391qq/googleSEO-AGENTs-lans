// Shared Gemini API service for Vercel serverless functions
import { TargetLanguage } from "./types.js";

const PROXY_BASE_URL = process.env.GEMINI_PROXY_URL || 'https://api.302.ai';
const API_KEY = process.env.GEMINI_API_KEY || 'sk-BMlZyFmI7p2DVrv53P0WOiigC4H6fcgYTevils2nXkW0Wv9s';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
}

/**
 * Call Gemini API with automatic retries for network errors
 */
export async function callGeminiAPI(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
  const maxRetries = 3;
  let lastError: any;

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
  throw lastError;
}

/**
 * Internal function to handle the actual API request
 */
async function _callGeminiInternal(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
  if (!API_KEY || API_KEY.trim() === '') {
    console.error('GEMINI_API_KEY is not configured');
    throw new Error('GEMINI_API_KEY is not configured. Please set it in Vercel environment variables.');
  }

  const url = `${PROXY_BASE_URL}/v1/v1beta/models/${config?.model || MODEL}:generateContent`;

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
      // 禁用思考模式以加快响应速度（默认使用 "none"）
      // 对于性能敏感的场景（如批量关键词分析），禁用思考模式可以显著提升速度
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
        'x-goog-api-key': API_KEY,
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
