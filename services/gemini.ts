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
  roundIndex: number = 1
): Promise<KeywordData[]> => {
  const result = await apiCall('/api/generate-keywords', {
    seedKeyword,
    targetLanguage,
    systemInstruction,
    existingKeywords,
    roundIndex,
  });
  return result.keywords;
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

// Defaults (exported for frontend use)
export const DEFAULT_GEN_PROMPT_EN = `
You are a Senior SEO Specialist for Google Search.
Your task is to generate a comprehensive list of high-potential keywords in the target language.

Rules:
1. **Grammar**: Ensure perfect grammar and native phrasing for the target language.
2. **Intent**: Mix Informational (How-to, guide) and Commercial (Best, Review, Buy).
3. **LSI**: Include synonyms and semantically related terms.
4. **Volume**: Estimate realistic monthly search volume for Google.
`;

export const DEFAULT_ANALYZE_PROMPT_EN = `
You are a Google SERP Analysis AI.
Estimate "Page 1 Probability" based on COMPETITION STRENGTH.

**High Probability Indicators**:
- Top results are Forums (Reddit, Quora), Social Media, or PDF files.
- Top results do not have the keyword in the Title tag.
- Very few results (< 20) in total index.

**Low Probability Indicators**:
- Top results are Wikipedia, Government sites, or Major Brands (Amazon, etc).
- Top results are highly optimized niche authority sites.
- Exact match optimized pages.
`;

export const DEFAULT_DEEP_DIVE_PROMPT_EN = `
You are a Strategic SEO Content Manager.
Your mission: Design a comprehensive content strategy for this keyword.

Content Strategy Requirements:
1. **Page Title (H1)**: Compelling, keyword-rich title that matches search intent
2. **Meta Description**: 150-160 characters, persuasive, includes target keyword
3. **URL Slug**: Clean, readable, keyword-focused URL structure
4. **User Intent**: Detailed analysis of what users expect when searching this keyword
5. **Content Structure**: Logical H2 sections that cover the topic comprehensively
6. **Long-tail Keywords**: Semantic variations and related queries to include
7. **Recommended Word Count**: Based on SERP analysis and topic complexity

Focus on creating content that:
- Directly answers user search intent
- Covers the topic more thoroughly than current top-ranking pages
- Includes natural keyword variations
- Provides genuine value to readers
`;
