// Frontend service - calls backend API instead of Gemini directly
import { KeywordData, SEOStrategyReport, TargetLanguage } from "../types";

// API Base URL configuration:
// - In Vercel production: use relative paths (empty string) to use same domain
// - In development with vercel dev: use relative paths (same as production)
// - If VITE_API_URL is explicitly set, use it (useful for custom deployments)
const getApiBaseUrl = (): string => {
  // If explicitly set, use it
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // In both development and production, use relative paths
  // This works for:
  // - Vercel production: same domain
  // - vercel dev: API runs on same port as frontend (localhost:3000/api/*)
  // - npm run dev only: will fail, but user should use vercel dev instead
  return '';
};

const API_BASE_URL = getApiBaseUrl();

interface ApiCallOptions {
  retries?: number;
  onRetry?: (attempt: number, error: string, delay: number) => void;
}

const apiCall = async (endpoint: string, body: any, options: ApiCallOptions | number = 3) => {
  // 兼容旧的调用方式（直接传递 retries 数字）
  const opts: ApiCallOptions = typeof options === 'number' 
    ? { retries: options } 
    : options;
  const retries = opts.retries ?? 3;
  const onRetry = opts.onRetry;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5分钟超时

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, try to get text
          const text = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
        }

        const errorMessage = errorData?.error || errorData?.message || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      // 如果是最后一次尝试，或者错误不是网络错误，直接抛出
      if (attempt === retries || (error.name !== 'TypeError' && error.name !== 'AbortError')) {
        // 提供更详细的错误信息
        if (error.name === 'AbortError') {
          throw new Error(`请求超时 (5分钟): ${endpoint}`);
        } else if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
          throw new Error(`网络请求失败: ${endpoint}。请检查网络连接或服务器状态。错误详情: ${error.message}`);
        }
        throw error;
      }

      // 等待后重试（指数退避）
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.warn(`API调用失败 (尝试 ${attempt}/${retries})，${delay}ms 后重试:`, error.message);
      
      // 调用重试回调，通知调用者
      if (onRetry) {
        onRetry(attempt, error.message, delay);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`API调用失败: ${endpoint} (已重试 ${retries} 次)`);
};

export const translatePromptToSystemInstruction = async (userPrompt: string): Promise<string> => {
  const result = await apiCall('/api/translate-prompt', { prompt: userPrompt });
  return result.optimized;
};

export const translateText = async (text: string, targetLanguage: 'zh' | 'en'): Promise<string> => {
  const result = await apiCall('/api/translate-text', { text, targetLanguage });
  return result.translated;
};

export const generateKeywords = async (
  seedKeyword: string,
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  existingKeywords: string[] = [],
  roundIndex: number = 1,
  wordsPerRound: number = 10,
  miningStrategy: 'horizontal' | 'vertical' = 'horizontal',
  userSuggestion: string = '',
  uiLanguage: 'zh' | 'en' = 'en',
  industry?: string,
  additionalSuggestions?: string,
  onRetry?: (attempt: number, error: string, delay: number) => void
): Promise<{ keywords: KeywordData[]; rawResponse: string; searchResults?: Array<{ title: string; url: string; snippet?: string }> }> => {
  const result = await apiCall('/api/generate-keywords', {
    seedKeyword,
    targetLanguage,
    systemInstruction,
    existingKeywords,
    roundIndex,
    wordsPerRound,
    miningStrategy,
    userSuggestion,
    uiLanguage,
    industry,
    additionalSuggestions,
  }, { retries: 3, onRetry });
  return {
    keywords: result.keywords,
    rawResponse: result.rawResponse || '',
    searchResults: result.searchResults
  };
};

export const analyzeRankingProbability = async (
  keywords: KeywordData[],
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en',
  websiteUrl?: string,
  websiteDR?: number,
  targetSearchEngine: string = 'google',
  onRetry?: (attempt: number, error: string, delay: number) => void,
  onProgressLogs?: (logs: Array<{ message: string; timestamp: number }>) => void
): Promise<KeywordData[]> => {
  const result = await apiCall('/api/analyze-ranking', {
    keywords,
    systemInstruction,
    uiLanguage,
    targetLanguage,
    websiteUrl,
    websiteDR,
    targetSearchEngine
  }, { retries: 3, onRetry });
  
  // 如果有进度日志，通过回调返回
  if (result.progressLogs && onProgressLogs) {
    onProgressLogs(result.progressLogs);
  }
  
  return result.keywords;
};

export const generateDeepDiveStrategy = async (
  keyword: KeywordData,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage
): Promise<SEOStrategyReport> => {
  const result = await apiCall('/api/deep-dive-strategy', {
    keyword,
    uiLanguage,
    targetLanguage,
  });
  return result.report;
};

export const batchTranslateAndAnalyze = async (
  keywords: string, // comma-separated keywords
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en',
  targetSearchEngine: string = 'google',
  websiteUrl?: string,
  websiteDR?: number
): Promise<{
  success: boolean;
  total: number;
  keywords: KeywordData[];
  translationResults: Array<{ original: string; translated: string; translationBack: string }>;
}> => {
  const result = await apiCall('/api/batch-translate-analyze', {
    keywords,
    targetLanguage,
    systemInstruction,
    uiLanguage,
    targetSearchEngine,
    websiteUrl,
    websiteDR
  });
  return result;
};

export const translateAndAnalyzeSingle = async (
  keyword: string,
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en',
  targetSearchEngine: string = 'google',
  websiteUrl?: string,
  websiteDR?: number,
  skipTranslation: boolean = false,
  onRetry?: (attempt: number, error: string, delay: number) => void,
  onProgressLogs?: (logs: Array<{ message: string; timestamp: number }>) => void
): Promise<{
  success: boolean;
  original: string;
  translated: string;
  keyword: KeywordData;
}> => {
  const result = await apiCall('/api/translate-and-analyze-single', {
    keyword,
    targetLanguage,
    systemInstruction,
    uiLanguage,
    targetSearchEngine,
    websiteUrl,
    websiteDR,
    skipTranslation
  }, { retries: 3, onRetry });
  
  // 如果有进度日志，通过回调返回
  if (result.progressLogs && onProgressLogs) {
    onProgressLogs(result.progressLogs);
  }
  
  return result;
};

// Import default prompts from prompts/index.ts
import {
  DEFAULT_GEN_PROMPT_EN,
  DEFAULT_ANALYZE_PROMPT_EN,
  DEFAULT_DEEP_DIVE_PROMPT_EN,
  getKeywordMiningPrompt,
} from './prompts/index';

// Re-export for frontend use (maintains backward compatibility)
// Note: DEFAULT_GEN_PROMPT_EN now uses KEYWORD_MINING_PROMPTS.base.en for enhanced keyword generation
export {
  DEFAULT_GEN_PROMPT_EN,
  DEFAULT_ANALYZE_PROMPT_EN,
  DEFAULT_DEEP_DIVE_PROMPT_EN,
  getKeywordMiningPrompt, // Export the new keyword mining prompt function
};
