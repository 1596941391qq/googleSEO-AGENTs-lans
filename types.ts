
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

export interface SErankingData {
  is_data_found: boolean;
  volume?: number;
  cpc?: number;
  competition?: number;
  difficulty?: number; // Keyword Difficulty (KD)
  history_trend?: { [date: string]: number };
}

export interface KeywordData {
  id: string;
  keyword: string; // The keyword in target language
  translation: string; // Meaning for the user
  intent: IntentType;
  volume: number; // Estimated monthly volume

  // SE Ranking API Data (before SERP analysis)
  serankingData?: SErankingData;

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

  // New fields for deep dive analysis
  coreKeywords?: string[]; // Extracted core keywords for verification
  htmlContent?: string; // Generated HTML content
  rankingProbability?: ProbabilityLevel; // Probability of ranking on page 1
  rankingAnalysis?: string; // Analysis of ranking probability
  searchIntent?: string; // User search intent analysis
  intentMatch?: string; // Whether content matches intent
  serpCompetitionData?: {
    keyword: string;
    serpResults: SerpSnippet[];
    analysis: string;
  }[];
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
export interface DeepDiveThought {
  id: string;
  type: 'content-generation' | 'keyword-extraction' | 'serp-verification' | 'probability-analysis';
  content: string;
  data?: {
    keywords?: string[];
    serpResults?: SerpSnippet[];
    analysis?: string;
    probability?: ProbabilityLevel;
  };
}

// === Workflow Configuration System ===

export type NodeType = 'agent' | 'tool';

export interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string; // Display name
  description: string;
  configurable: boolean; // Whether user can edit this node
  prompt?: string; // Agent prompt (only for agent nodes)
  defaultPrompt?: string; // Default prompt for reset
  isSystem?: boolean; // Whether this is a system tool (non-configurable, special styling)
}

export interface WorkflowDefinition {
  id: string;
  name: string; // e.g., "Mining Workflow", "Batch Translation Workflow"
  description: string;
  nodes: WorkflowNode[];
}

export interface WorkflowConfig {
  id: string; // Unique config ID
  workflowId: string; // Which workflow this config is for
  name: string; // User-defined config name
  createdAt: number;
  updatedAt: number;
  nodes: WorkflowNode[]; // Customized nodes
}

// Old AgentConfig - keeping for backward compatibility
export interface AgentConfig {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  genPrompt: string;
  analyzePrompt: string;
  targetLanguage: TargetLanguage;
}

export interface DeepDiveConfig {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  strategyPrompt: string;
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
  type: 'translation' | 'seranking' | 'serp-search' | 'intent-analysis' | 'analysis';
  keyword: string; // Original or translated keyword
  content: string;
  serpSnippets?: SerpSnippet[];
  serankingData?: {
    is_data_found: boolean;
    volume?: number;
    difficulty?: number;
    cpc?: number;
    competition?: number;
    history_trend?: Record<string, number>;
  };
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

export interface DeepDiveThought {
  id: string;
  type: 'content-generation' | 'keyword-extraction' | 'serp-verification' | 'probability-analysis';
  content: string;
  data?: {
    keywords?: string[];
    serpResults?: SerpSnippet[];
    analysis?: string;
    probability?: ProbabilityLevel;
  };
}

export interface AppState {
  step: 'input' | 'mining' | 'results' | 'batch-analyzing' | 'batch-results' | 'deep-dive-analyzing' | 'deep-dive-results' | 'workflow-config';
  seedKeyword: string;
  targetLanguage: TargetLanguage;
  keywords: KeywordData[];
  error: string | null;

  // Mining Loop State
  isMining: boolean;
  miningRound: number;
  agentThoughts: AgentThought[];
  miningSuccess: boolean;
  wordsPerRound: number; // 5-20
  miningStrategy: 'horizontal' | 'vertical'; // horizontal: broad topics, vertical: deep dive into specific
  userSuggestion: string; // Real-time user suggestions during mining

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
  deepDiveThoughts: DeepDiveThought[];
  deepDiveKeyword: KeywordData | null;
  showDetailedAnalysisModal: boolean;
  deepDiveProgress: number; // 0-100
  deepDiveCurrentStep: string;

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

  // Agent Config Archives (deprecated - use workflowConfigs instead)
  agentConfigs: AgentConfig[];
  currentConfigId: string | null;

  // Workflow Configuration System
  workflowConfigs: WorkflowConfig[]; // All saved workflow configs
  currentWorkflowConfigIds: {
    mining?: string;
    batch?: string;
    deepDive?: string;
  };

  // Deep Dive Config (deprecated - use workflowConfigs instead)
  deepDiveConfigs: DeepDiveConfig[];
  currentDeepDiveConfigId: string | null;
  deepDivePrompt: string;

  // Batch Analysis State
  batchKeywords: KeywordData[];
  batchThoughts: BatchAnalysisThought[];
  batchCurrentIndex: number;
  batchTotalCount: number;
  batchInputKeywords: string; // Store original input for archiving
}