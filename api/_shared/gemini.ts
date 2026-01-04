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
}

export async function callGeminiAPI(prompt: string, systemInstruction?: string, config?: GeminiConfig) {
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
      maxOutputTokens: 8192
    }
  };

  // 配置工具：启用 Google 搜索检索（联网搜索）
  if (config?.enableGoogleSearch) {
    requestBody.tools = [
      {
        googleSearchRetrieval: {
          // disableAttribution: true  // 可选：禁用来源归属
        }
      }
    ];
  }

  if (config?.responseMimeType === 'application/json') {
    if (!prompt.includes('JSON') && !prompt.includes('json')) {
      contents[contents.length - 1].parts[0].text += '\n\nPlease respond with valid JSON only, no markdown formatting.';
    }
    if (config?.responseSchema) {
      requestBody.generationConfig.responseSchema = config.responseSchema;
      requestBody.generationConfig.responseMimeType = 'application/json';
    }
  }

  try {
    // Add timeout for fetch (600 seconds per request - increased to avoid premature timeouts)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 600 seconds = 10 minutes

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': API_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('API request timeout (600s)');
      }
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API 响应错误:', response.status, errorText);
      throw new Error(`API 请求失败: ${response.status} ${errorText}`);
    }

    const data: any = await response.json();
    let content = '';

    if (data.error) {
      console.error('API 返回错误:', data.error);
      throw new Error(`API 错误: ${data.error}`);
    }

    // 提取联网搜索结果（groundingMetadata）
    let searchResults: Array<{ title: string; url: string; snippet?: string }> = [];
    
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      
      // 提取文本内容
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        content = candidate.content.parts[0].text || '';
      }
      
      // 提取联网搜索结果（groundingMetadata）
      if (candidate.groundingMetadata && candidate.groundingMetadata.groundingChunks) {
        const chunks = candidate.groundingMetadata.groundingChunks;
        searchResults = chunks
          .filter((chunk: any) => chunk.web && chunk.web.uri)
          .map((chunk: any) => ({
            title: chunk.web?.title || chunk.web?.uri || 'Untitled',
            url: chunk.web.uri,
            snippet: chunk.web?.snippet || undefined,
          }));
        
        // 去重（基于 URL）
        const seenUrls = new Set<string>();
        searchResults = searchResults.filter((result) => {
          if (seenUrls.has(result.url)) {
            return false;
          }
          seenUrls.add(result.url);
          return true;
        });
      }
    }

    if (!content && data.output) {
      content = data.output;
    }

    if (!content) {
      console.warn('⚠️  API 响应中没有找到文本内容');
      throw new Error('API 响应中没有找到文本内容');
    }

    return {
      text: content,
      raw: data,
      searchResults: searchResults.length > 0 ? searchResults : undefined,
    };
  } catch (error: any) {
    console.error('调用 Gemini API 失败:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.substring(0, 500)
    });
    throw error;
  } finally {
    // Ensure function completes even if there's an error
  }
}

/**
 * Extract JSON from text that may contain thinking process or markdown
 */
function extractJSON(text: string): string {
  if (!text) return '{}';

  // Remove markdown code blocks
  text = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

  // Try to find JSON object or array
  // Look for first { or [ and last } or ]
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');

  let startIdx = -1;
  let endIdx = -1;
  let isArray = false;

  if (firstBrace !== -1 && firstBracket !== -1) {
    // Both found, use the one that comes first
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
    // Basic validation: check if it starts and ends correctly
    if ((isArray && extracted.startsWith('[') && extracted.endsWith(']')) ||
      (!isArray && extracted.startsWith('{') && extracted.endsWith('}'))) {
      return extracted;
    }
  }

  // If no valid JSON found, return default based on context
  // For analyze-ranking, we expect an object, so return {}
  // For generate-keywords, we expect an array, but we can't know context here
  // So we'll return the cleaned text and let the caller handle it
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

/**
 * Translate a keyword to target market language
 * Used for batch translation and analysis feature
 */
export const translateKeywordToTarget = async (
  keyword: string,
  targetLanguage: TargetLanguage
): Promise<{ original: string; translated: string; translationBack: string }> => {
  const targetLangName = getLanguageName(targetLanguage);

  const prompt = `You are a professional SEO translator specializing in cross-market keyword translation.

Translate the following keyword into ${targetLangName} for SEO purposes in the ${targetLangName} market.

Requirements:
1. The translation must be the exact phrase that users in ${targetLangName} market would search for
2. Consider cultural context and local search habits
3. Preserve the search intent (informational, commercial, transactional, etc.)
4. Use natural, commonly searched expressions in ${targetLangName}
5. If the keyword is a brand name or proper noun, keep it as is

Keyword: "${keyword}"

Respond with ONLY the translated keyword in ${targetLangName}. Do not include any explanations, notes, or additional text.`;

  try {
    const response = await callGeminiAPI(prompt);
    const translated = response.text.trim();

    return {
      original: keyword,
      translated: translated,
      translationBack: keyword // We can keep the original as the "back translation" for reference
    };
  } catch (error: any) {
    console.error(`Translation failed for keyword "${keyword}":`, error);
    // Return original if translation fails
    return {
      original: keyword,
      translated: keyword,
      translationBack: keyword
    };
  }
};

// End of shared Gemini service

