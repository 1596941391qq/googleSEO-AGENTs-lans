
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
  keyword: string; // The keyword in target language
  translation: string; // Meaning for the user
  intent: IntentType;
  volume: number; // Estimated monthly volume

  // Source tracking
  source?: 'manual' | 'website-audit'; // 标记关键词来源：手动输入 或 存量拓新

  // DataForSEO API Data (before SERP analysis)
  dataForSEOData?: DataForSEOData;

  // 保留向后兼容
  serankingData?: SErankingData;

  // Analysis Metrics (Step 2)
  serpResultCount?: number; // Estimated number of results
  topDomainType?: 'Big Brand' | 'Niche Site' | 'Forum/Social' | 'Weak Page' | 'Gov/Edu' | 'Unknown';
  probability?: ProbabilityLevel;
  reasoning?: string; // Why this probability?
  topSerpSnippets?: SerpSnippet[]; // For manual verification

  // Search Intent Analysis
  searchResults?: Array<{ title: string; url: string; snippet?: string }>; // 联网搜索结果
  intentAssessment?: string; // 合并的搜索意图分析：包含用户意图 + 与SERP匹配度判断
  // 向后兼容字段（已废弃，保留仅为兼容旧数据）
  searchIntent?: string; // Predicted user search intent (deprecated: use intentAssessment)
  intentAnalysis?: string; // Analysis of the intent (deprecated: use intentAssessment)

  // Domain Authority (for "Big fish eats small fish" mode)
  websiteDR?: number;
  competitorDRs?: number[];
  canOutrankPositions?: number[];
  top3Probability?: ProbabilityLevel;
  top10Probability?: ProbabilityLevel;
  relevanceScore?: number; // 0-1

  // Blue Ocean Scoring
  blueOceanScore?: number; // 0-100
  blueOceanScoreBreakdown?: {
    totalScore: number;
    factors: Array<{
      name: string;
      score: number;
      reason: string;
    }>;
  };

  // Verification (Step 3)
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
    dataForSEOData?: DataForSEOData;
    serankingData?: SErankingData; // 保留向后兼容
  }[];
}

export interface ArchiveEntry {
  id: string;
  timestamp: number;
  seedKeyword: string;
  keywords: KeywordData[];
  miningRound: number;
  targetLanguage: TargetLanguage;
  taskName?: string; // 任务名称/项目名称
  // 存量拓新模式相关字段
  miningMode?: 'blue-ocean' | 'existing-website-audit';
  websiteId?: string | null;
  websiteUrl?: string | null;
  websiteDomain?: string | null;
  websiteAnalysis?: {
    websiteContentSummary?: string;
    contentLength?: number;
    url?: string;
    domain?: string;
  };
  competitorAnalysis?: {
    competitorKeywordsCount?: number;
    opportunitiesFound?: number;
    websiteUrl?: string;
  };
  agentThoughts?: AgentThought[]; // 保存思维流
}

export interface BatchArchiveEntry {
  id: string;
  timestamp: number;
  inputKeywords: string; // comma-separated original keywords
  keywords: KeywordData[];
  targetLanguage: TargetLanguage;
  totalCount: number;
}

export interface DeepDiveArchiveEntry {
  id: string;
  timestamp: number;
  keyword: string; // The core keyword analyzed
  strategyReport: SEOStrategyReport;
  targetLanguage: TargetLanguage;
}

export type UILanguage = 'en' | 'zh';
export type TargetLanguage = 'en' | 'zh' | 'fr' | 'ru' | 'ja' | 'ko' | 'pt' | 'id' | 'es' | 'ar';

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
    serankingData?: {
      volume?: number;
      difficulty?: number;
      cpc?: number;
      competition?: number;
    };
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
  data?: any; // Raw data for structured display (replaces table)
  dataType?: 'keywords' | 'analysis' | 'website-content' | 'competitor-analysis'; // Type of data to render
  table?: any; // @deprecated - Table data for structured display (JSX not serializable)
  searchResults?: Array<{ title: string; url: string; snippet?: string }>; // 联网搜索结果
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


// === Task Management System ===

export type TaskType = 'mining' | 'batch' | 'article-generator' | 'deep-dive';

export interface TaskState {
  // Common fields
  type: TaskType;
  id: string;
  name: string; // User-editable name
  createdAt: number;
  updatedAt: number;
  isActive: boolean; // Currently selected tab

  // Mining-specific state
  miningState?: {
    seedKeyword: string;
    keywords: KeywordData[];
    miningRound: number;
    agentThoughts: AgentThought[];
    isMining: boolean;
    miningSuccess: boolean;
    wordsPerRound: number;
    miningStrategy: 'horizontal' | 'vertical';
    userSuggestion: string;
    logs: LogEntry[];
    // 存量拓新模式相关字段
    websiteId?: string | null;
    websiteUrl?: string | null;
    websiteDomain?: string | null;
    miningMode?: 'blue-ocean' | 'existing-website-audit';
    // 网站分析和竞争对手分析数据
    websiteAnalysis?: {
      websiteContentSummary?: string;
      contentLength?: number;
      url?: string;
      domain?: string;
    };
    competitorAnalysis?: {
      competitorKeywordsCount?: number;
      opportunitiesFound?: number;
      websiteUrl?: string;
    };
    // 网站审计分析报告（文本格式）
    websiteAuditReport?: string;
  };

  // Batch-specific state
  batchState?: {
    batchInputKeywords: string;
    batchKeywords: KeywordData[];
    batchThoughts: BatchAnalysisThought[];
    batchCurrentIndex: number;
    batchTotalCount: number;
    logs: LogEntry[];
  };

  // Article Generator specific state
  articleGeneratorState?: ArticleGeneratorState;

  // Backward compatibility
  deepDiveState?: any;

  // Shared state
  targetLanguage: TargetLanguage;
  filterLevel: ProbabilityLevel | 'ALL';
  sortBy: 'volume' | 'probability' | 'difficulty';
  expandedRowId: string | null;
}

export interface TaskManagerState {
  tasks: TaskState[];
  activeTaskId: string | null;
  maxTasks: number; // = 5
}

export interface CreateTaskParams {
  type: TaskType;
  name?: string; // Auto-generated if not provided
  targetLanguage?: TargetLanguage;
  targetMarket?: string; // For article-generator tasks
  seedKeyword?: string; // For mining tasks
  inputKeywords?: string; // For batch tasks
  keyword?: KeywordData; // For deep-dive tasks
}

export const STORAGE_KEYS = {
  TASKS: 'google_seo_tasks',
  ARCHIVES: 'google_seo_archives',
  BATCH_ARCHIVES: 'google_seo_batch_archives',
  DEEPDIVE_ARCHIVES: 'google_seo_deepdive_archives',
  WORKFLOW_CONFIGS: 'google_seo_workflow_configs',
} as const;

export interface AppState {
  // Task Management
  taskManager: TaskManagerState;

  step: 'input' | 'mining' | 'results' | 'batch-analyzing' | 'batch-results' | 'deep-dive-analyzing' | 'deep-dive-results' | 'workflow-config' | 'article-generator' | 'content-generation';
  seedKeyword: string;
  targetLanguage: TargetLanguage;
  targetSearchEngine: 'google' | 'baidu' | 'bing' | 'yandex';
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
  miningIndustry?: string; // User selected industry for targeted keyword generation
  miningConfig?: {
    industry?: string;
    additionalSuggestions?: string; // User's additional suggestions for AI
  };
  
  // Thinking Status - tracks what the AI is currently doing
  thinkingStatus: {
    isThinking: boolean;
    message: string; // e.g. "AI正在挖掘manus相关的词" or "AI正在分析keyword难度"
    startTime: number; // timestamp when thinking started
    phase: 'generating' | 'analyzing' | 'searching' | 'idle';
    subPhase?: 'ai-generating' | 'keyword-research-api' | 'ai-analyzing'; // 细分子阶段: AI生成 vs Keyword Research API
    phaseStartTime?: number; // 当前子阶段开始时间
  };

  // Archives
  archives: ArchiveEntry[];
  batchArchives: BatchArchiveEntry[];
  deepDiveArchives: DeepDiveArchiveEntry[];

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


  // Success Prompt UI
  showSuccessPrompt: boolean; // Controls whether to show the success prompt overlay

  // Website Generator
  generatedWebsite: any | null;
  isGeneratingWebsite: boolean;
  showWebsitePreview: boolean;
  websiteMessages: any[];
  isOptimizing: boolean;
  websiteGenerationProgress: any | null;

  // Content Generation
  contentGeneration: {
    activeTab: 'my-website' | 'website-data' | 'projects' | 'publish';
    website: any | null;
    onboardingStep: number;
    websiteData: any | null;
  };

  // Article Generator State
  articleGeneratorState: ArticleGeneratorState;

  // UI State
  isSidebarCollapsed: boolean;
}

// === Project Management System ===

export interface Project {
  id: string;
  user_id: number;
  name: string;
  seed_keyword: string | null;
  target_language: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithStats extends Project {
  keyword_count: number;
  draft_count: number;
  published_count: number;
  type?: 'project' | 'task';
  status?: string;
  task_type?: string;
}

export interface KeywordWithStatus {
  id: string;
  project_id: string;
  keyword: string;
  translation: string | null;
  intent: string | null;
  volume: number | null;
  probability: string | null;
  is_selected: boolean;
  status: 'selected' | 'generating' | 'completed' | 'failed';
  content_status?: string;
  created_at: string;
}

export interface ProjectStats {
  total: number;
  selected: number;
  generating: number;
  completed: number;
  failed: number;
}


export interface ArticleGeneratorState {
  keyword: string;
  tone: string;
  targetAudience: string;
  visualStyle: string;
  targetMarket: string;
  promotedWebsites?: string[];
  promotionIntensity?: "natural" | "strong";

  isGenerating: boolean;
  progress: number; // 0-100
  currentStage: 'input' | 'research' | 'strategy' | 'writing' | 'visualizing' | 'complete';

  // Visual Stream Feed
  streamEvents: AgentStreamEvent[];

  // Results
  finalArticle: {
    title: string;
    content: string; // HTML/Markdown
    images: { url: string; prompt: string; placement: string }[];
  } | null;
}

export interface AgentStreamEvent {
  id: string;
  agentId: 'tracker' | 'researcher' | 'strategist' | 'writer' | 'artist';
  type: 'log' | 'card' | 'error';
  timestamp: number;
  message?: string;

  // For 'card' type
  cardType?: 'serp' | 'data' | 'outline' | 'streaming-text' | 'image-gen' | 'competitor-analysis' | 'search-preferences' | 'google-search-results' | 'firecrawl-result' | 'dataforseo-competitors' | 'dataforseo-keywords' | 'website-audit-report' | 'quality-review' | 'final-article';
  data?: any;
}