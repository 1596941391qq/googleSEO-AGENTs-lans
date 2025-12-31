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

const apiCall = async (endpoint: string, body: any) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

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
  additionalSuggestions?: string
): Promise<{ keywords: KeywordData[]; rawResponse: string }> => {
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
  });
  return { keywords: result.keywords, rawResponse: result.rawResponse || '' };
};

export const analyzeRankingProbability = async (
  keywords: KeywordData[],
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en',
  targetLanguage: TargetLanguage = 'en'
): Promise<KeywordData[]> => {
  const result = await apiCall('/api/analyze-ranking', {
    keywords,
    systemInstruction,
    uiLanguage,
    targetLanguage,
  });
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

export const enhancedDeepDive = async (
  keyword: KeywordData,
  uiLanguage: 'zh' | 'en',
  targetLanguage: TargetLanguage,
  strategyPrompt?: string
): Promise<SEOStrategyReport> => {
  const result = await apiCall('/api/deep-dive-enhanced', {
    keyword,
    uiLanguage,
    targetLanguage,
    strategyPrompt,
  });
  return result.report;
};

export const batchTranslateAndAnalyze = async (
  keywords: string, // comma-separated keywords
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en'
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
  });
  return result;
};

export const translateAndAnalyzeSingle = async (
  keyword: string,
  targetLanguage: TargetLanguage,
  systemInstruction: string,
  uiLanguage: 'zh' | 'en' = 'en'
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
  });
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
