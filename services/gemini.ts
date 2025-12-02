// Frontend service - calls backend API instead of Gemini directly
import { KeywordData, SEOStrategyReport, TargetLanguage } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiCall = async (endpoint: string, body: any) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
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
  systemInstruction: string
): Promise<KeywordData[]> => {
  const result = await apiCall('/api/analyze-ranking', {
    keywords,
    systemInstruction,
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
