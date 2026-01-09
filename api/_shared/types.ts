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

// DataForSEO 数据接口（取代 SE-Ranking）
export interface DataForSEOData {
  is_data_found: boolean;

  // 基础数据
  volume?: number;
  cpc?: number;
  competition?: number; // 0-1 scale
  competition_level?: string; // 'LOW', 'MEDIUM', 'HIGH'

  // DataForSEO 独有：关键词难度
  difficulty?: number; // Keyword Difficulty (0-100)

  // 历史数据 - DataForSEO 提供12个月历史数据
  monthly_searches?: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;

  // 出价范围
  low_top_of_page_bid?: number;
  high_top_of_page_bid?: number;

  // 趋势数据（简化版）
  history_trend?: { [date: string]: number };
}

// 保留向后兼容
export type SErankingData = DataForSEOData;

export interface KeywordData {
  id: string;
  keyword: string;
  translation: string;
  intent: IntentType;
  volume: number;

  // Source tracking
  source?: 'manual' | 'website-audit'; // 标记关键词来源：手动输入 或 存量拓新

  // DataForSEO API Data
  dataForSEOData?: DataForSEOData;

  // 保留向后兼容
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

  // Domain Authority (new for "Big fish eats small fish")
  websiteDR?: number;
  competitorDRs?: number[];
  canOutrankPositions?: number[];
  top3Probability?: ProbabilityLevel;
  top10Probability?: ProbabilityLevel;
  relevanceScore?: number; // 0-1

  // Blue Ocean Scoring (new)
  blueOceanScore?: number; // 0-100
  blueOceanScoreBreakdown?: {
    totalScore: number;
    factors: Array<{
      name: string;
      score: number;
      reason: string;
    }>;
  };

  // Verification
  isIndexed?: boolean;

  // Debug
  rawResponse?: string;
}

export interface SEOStrategyReport {
  targetKeyword?: string;
  pageTitleH1?: string;
  pageTitleH1_trans?: string;
  metaDescription?: string;
  metaDescription_trans?: string;
  urlSlug?: string;
  userIntentSummary?: string;
  contentStructure?: {
    header: string;
    header_trans?: string;
    description: string;
    description_trans?: string;
  }[];
  longTailKeywords?: string[];
  longTailKeywords_trans?: string[];
  recommendedWordCount?: number;

  // Markdown format support (new)
  markdown?: string;

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
    dataForSEOData?: DataForSEOData;
    serankingData?: SErankingData; // 保留向后兼容
  }[];
}

export type TargetLanguage = 'en' | 'fr' | 'ru' | 'ja' | 'ko' | 'pt' | 'id' | 'es' | 'ar' | 'zh';

