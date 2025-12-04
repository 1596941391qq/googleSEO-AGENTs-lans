
export enum IntentType {
  INFORMATIONAL = 'Informational', // e.g., How to...
  TRANSACTIONAL = 'Transactional', // e.g., Buy...
  LOCAL = 'Local', // e.g., Near me
  COMMERCIAL = 'Commercial' // e.g., Best X for Y
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

export interface KeywordData {
  id: string;
  keyword: string; // The keyword in target language
  translation: string; // Meaning for the user
  intent: IntentType;
  volume: number; // Estimated monthly volume

  // Analysis Metrics (Step 2)
  serpResultCount?: number; // Estimated number of results
  topDomainType?: 'Big Brand' | 'Niche Site' | 'Forum/Social' | 'Weak Page' | 'Gov/Edu' | 'Unknown';
  probability?: ProbabilityLevel;
  reasoning?: string; // Why this probability?
  topSerpSnippets?: SerpSnippet[]; // For manual verification

  // Search Intent Analysis
  searchIntent?: string; // Predicted user search intent
  intentAnalysis?: string; // Analysis of the intent

  // Verification (Step 3)
  isIndexed?: boolean;
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
}

export interface ArchiveEntry {
  id: string;
  timestamp: number;
  seedKeyword: string;
  keywords: KeywordData[];
  miningRound: number;
  targetLanguage: TargetLanguage;
}

export interface BatchArchiveEntry {
  id: string;
  timestamp: number;
  inputKeywords: string; // comma-separated original keywords
  keywords: KeywordData[];
  targetLanguage: TargetLanguage;
  totalCount: number;
}

export type UILanguage = 'en' | 'zh';
export type TargetLanguage = 'en' | 'fr' | 'ru' | 'ja' | 'ko' | 'pt' | 'id' | 'es' | 'ar';

// Agent配置存档
export interface AgentConfig {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  genPrompt: string;
  analyzePrompt: string;
  targetLanguage: TargetLanguage;
}

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'api';
}

export interface AgentThought {
  id: string;
  round: number;
  type: 'generation' | 'analysis' | 'decision';
  content: string;
  keywords?: string[]; 
  stats?: {
    high: number;
    medium: number;
    low: number;
  };
  analyzedKeywords?: KeywordData[];
}

export interface BatchAnalysisThought {
  id: string;
  type: 'translation' | 'serp-search' | 'intent-analysis' | 'analysis';
  keyword: string; // Original or translated keyword
  content: string;
  serpSnippets?: SerpSnippet[];
  intentData?: {
    searchIntent: string;
    intentAnalysis: string;
  };
  analysis?: {
    probability: ProbabilityLevel;
    topDomainType: string;
    serpResultCount: number;
    reasoning: string;
  };
}

export interface AppState {
  step: 'input' | 'mining' | 'results' | 'batch-analyzing' | 'batch-results';
  seedKeyword: string;
  targetLanguage: TargetLanguage;
  keywords: KeywordData[];
  error: string | null;

  // Mining Loop State
  isMining: boolean;
  miningRound: number;
  agentThoughts: AgentThought[];
  miningSuccess: boolean;

  // Archives
  archives: ArchiveEntry[];
  batchArchives: BatchArchiveEntry[];

  // Results View Configuration
  filterLevel: ProbabilityLevel | 'ALL';
  sortBy: 'volume' | 'probability' | 'difficulty';
  expandedRowId: string | null;

  // Deep Dive State
  showDeepDiveModal: boolean;
  isDeepDiving: boolean;
  currentStrategyReport: SEOStrategyReport | null;

  // Config
  uiLanguage: UILanguage;
  genPrompt: string;
  analyzePrompt: string;
  logs: LogEntry[];
  showPrompts: boolean;

  // Prompt Translation Reference
  showPromptTranslation: boolean;
  translatedGenPrompt: string | null;
  translatedAnalyzePrompt: string | null;

  // Agent Config Archives
  agentConfigs: AgentConfig[];
  currentConfigId: string | null;

  // Batch Analysis State
  batchKeywords: KeywordData[];
  batchThoughts: BatchAnalysisThought[];
  batchCurrentIndex: number;
  batchTotalCount: number;
  batchInputKeywords: string; // Store original input for archiving
}