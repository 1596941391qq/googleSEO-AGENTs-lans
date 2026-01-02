// Type definitions for Vercel serverless functions
// Copied from root types.ts to avoid import path issues

export enum IntentType {
  INFORMATIONAL = 'Informational',
  TRANSACTIONAL = 'Transactional',
  LOCAL = 'Local',
  COMMERCIAL = 'Commercial'
}

export enum ProbabilityLevel {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface SerpSnippet {
  title: string;
  url: string;
  snippet: string;
}

export interface SErankingData {
  is_data_found: boolean;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  history_trend?: { [date: string]: number };
}

export interface KeywordData {
  id: string;
  keyword: string;
  translation: string;
  intent: IntentType;
  volume: number;

  // SE Ranking API Data
  serankingData?: SErankingData;

  // Analysis Metrics
  serpResultCount?: number;
  topDomainType?: 'Big Brand' | 'Niche Site' | 'Forum/Social' | 'Weak Page' | 'Gov/Edu' | 'Unknown';
  probability?: ProbabilityLevel;
  reasoning?: string;
  topSerpSnippets?: SerpSnippet[];

  // Search Intent Analysis
  searchIntent?: string;
  intentAnalysis?: string;

  // Verification
  isIndexed?: boolean;

  // Debug
  rawResponse?: string;
}

export interface SEOStrategyReport {
  targetKeyword: string;
  pageTitleH1: string;
  pageTitleH1_trans?: string;
  metaDescription: string;
  metaDescription_trans?: string;
  urlSlug: string;
  userIntentSummary: string;
  contentStructure: {
    header: string;
    header_trans?: string;
    description: string;
    description_trans?: string;
  }[];
  longTailKeywords: string[];
  longTailKeywords_trans?: string[];
  recommendedWordCount: number;

  // New fields for deep dive analysis
  coreKeywords?: string[];
  htmlContent?: string;
  rankingProbability?: ProbabilityLevel;
  rankingAnalysis?: string;
  searchIntent?: string;
  intentMatch?: string;
  serpCompetitionData?: {
    keyword: string;
    serpResults: SerpSnippet[];
    analysis: string;
    serankingData?: SErankingData;
  }[];
}

export type TargetLanguage = 'en' | 'fr' | 'ru' | 'ja' | 'ko' | 'pt' | 'id' | 'es' | 'ar' | 'zh';

