import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  CheckCircle,
  ArrowRight,
  Loader2,
  AlertCircle,
  Terminal,
  Settings,
  RefreshCw,
  Languages,
  Plus,
  Play,
  Square,
  BrainCircuit,
  Lightbulb,
  Download,
  Filter,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  X,
  Trash2,
  ExternalLink,
  Globe,
  Save,
  FolderOpen,
  TrendingUp,
  CreditCard,
  Database,
  Workflow,
  SunMoon,
  ChevronRight,
  LogOut,
  User,
  Coins,
} from "lucide-react";
import { WebsiteRenderer } from "./components/website/WebsiteRenderer";
import { useAuth } from "./contexts/AuthContext";
import {
  AppState,
  KeywordData,
  ProbabilityLevel,
  IntentType,
  LogEntry,
  AgentThought,
  BatchAnalysisThought,
  DeepDiveThought,
  ArchiveEntry,
  BatchArchiveEntry,
  DeepDiveArchiveEntry,
  SEOStrategyReport,
  TargetLanguage,
  UILanguage,
  AgentConfig,
  DeepDiveConfig,
  WorkflowConfig,
  TaskType,
  TaskState,
  TaskManagerState,
  CreateTaskParams,
  STORAGE_KEYS,
  WebsiteMessage,
} from "./types";
import {
  generateKeywords,
  analyzeRankingProbability,
  translatePromptToSystemInstruction,
  translateText,
  generateDeepDiveStrategy,
  enhancedDeepDive,
  batchTranslateAndAnalyze,
  translateAndAnalyzeSingle,
  DEFAULT_GEN_PROMPT_EN,
  DEFAULT_ANALYZE_PROMPT_EN,
  DEFAULT_DEEP_DIVE_PROMPT_EN,
} from "./services/gemini";
import {
  MINING_WORKFLOW,
  BATCH_WORKFLOW,
  DEEP_DIVE_WORKFLOW,
  createDefaultConfig,
} from "./workflows";

// --- Markdown Parser ---
const parseMarkdown = (text: string): string => {
  if (!text) return "";

  let html = text;

  // Headers (### ## #)
  html = html.replace(
    /^### (.*$)/gim,
    '<h3 class="text-sm font-bold text-slate-900 mt-2 mb-1">$1</h3>'
  );
  html = html.replace(
    /^## (.*$)/gim,
    '<h2 class="text-base font-bold text-slate-900 mt-2 mb-1">$1</h2>'
  );
  html = html.replace(
    /^# (.*$)/gim,
    '<h1 class="text-lg font-bold text-slate-900 mt-3 mb-1">$1</h1>'
  );

  // Bold (**text** or __text__)
  html = html.replace(
    /\*\*(.+?)\*\*/g,
    '<strong class="font-semibold text-slate-900">$1</strong>'
  );
  html = html.replace(
    /__(.+?)__/g,
    '<strong class="font-semibold text-slate-900">$1</strong>'
  );

  // Italic (*text* or _text_)
  html = html.replace(
    /\*(.+?)\*/g,
    '<em class="italic text-slate-700">$1</em>'
  );
  html = html.replace(/_(.+?)_/g, '<em class="italic text-slate-700">$1</em>');

  // Lists (- item or * item or 1. item)
  html = html.replace(
    /^\s*[-*]\s+(.+)$/gim,
    '<li class="ml-4 mb-0.5 list-disc list-inside text-slate-700">$1</li>'
  );
  html = html.replace(
    /^\s*\d+\.\s+(.+)$/gim,
    '<li class="ml-4 mb-0.5 list-decimal list-inside text-slate-700">$1</li>'
  );

  // Wrap consecutive <li> tags in <ul>
  html = html.replace(
    /(<li class="ml-4 mb-0.5 list-disc[^>]*>.*?<\/li>\s*)+/gs,
    '<ul class="my-1">$&</ul>'
  );
  html = html.replace(
    /(<li class="ml-4 mb-0.5 list-decimal[^>]*>.*?<\/li>\s*)+/gs,
    '<ol class="my-1">$&</ol>'
  );

  // Links [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>'
  );

  // Inline code `code`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-xs font-mono">$1</code>'
  );

  // Line breaks
  html = html.replace(/\n/g, "<br/>");

  return html;
};

// Markdown display component
const MarkdownContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div
      className="markdown-content text-sm text-slate-700 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};

// --- Constants & Translations ---

const TEXT = {
  en: {
    title: "Google SEO Agent",
    step1: "1. Input",
    step2: "2. Mining Loop",
    step3: "3. Results",
    inputTitle: "Define Your Niche",
    inputDesc:
      'Enter a seed keyword. The Agent will iterate until it finds a HIGH probability "Blue Ocean" keyword or "Weak Competitor" gap.',
    placeholder: "Enter keyword (e.g., Tractor parts)",
    targetMarket: "Target Market",
    btnStart: "Start Mining",
    btnStop: "Stop Mining",
    btnTranslatePrompt: "Optimize Prompt (AI)",
    generating: "Mining Keywords...",
    analyzing: "Analyzing Google SERP...",
    resultsTitle: "Strategy Report",
    foundOpp: "Found",
    opps: "opportunities",
    recTitle: "Top Recommendation",
    colKw: "Keyword",
    colTrans: "Translation",
    colVol: "Vol.",
    colType: "Top Type",
    colProb: "Probability",
    colStrat: "Strategy / Reason",
    configPrompts: "Configure Agent Prompts",
    promptGenLabel: "Generation Agent Prompt (Step 1)",
    promptAnlzLabel: "Analysis Agent Prompt (Step 2)",
    logsTitle: "System Logs",
    agentStreamTitle: "Agent Thoughts",
    btnExpand: "Continue Mining",
    newAnalysis: "New Analysis",
    archivesTitle: "Archives",
    noArchives: "No saved reports yet.",
    filterAll: "All Probabilities",
    filterHigh: "High Only",
    downloadCSV: "Export CSV",
    deepDive: "Deep Dive Strategy",
    viewReport: "Generate SEO Report",
    generatingReport: "Generating Strategy...",
    modalTitle: "SEO Content Strategy",
    close: "Close",
    archiveSaved: "Session archived automatically.",
    viewResults: "View Results",
    miningSuccessTitle: "Mining Complete",
    miningSuccessDesc: "HIGH probability keywords found!",
    foundCount: "High Probability Keywords",
    serpEvidence: "Top 3 Google Search Results",
    serpEvidenceDisclaimer: "* Showing top 3 results analyzed for competition.",
    showTransRef: "Show Translation Reference",
    transRefLabel: "Translated Prompt Reference (Read-only)",
    verifyBtn: "Google Verify",
    agentConfigs: "Agent Configurations",
    saveConfig: "Save Config",
    updateConfig: "Update",
    loadConfig: "Load",
    configName: "Config Name",
    noConfigs: "No saved configurations yet.",
    configSaved: "Configuration saved",
    enterConfigName: "Enter config name...",
    batchTranslateTitle: "Batch Translate & Analyze",
    batchTranslateDesc:
      "Enter multiple keywords (comma-separated) to translate and analyze for blue ocean opportunities.",
    batchInputPlaceholder: "e.g., dog food, cat toys, bird cage",
    btnBatchAnalyze: "Batch Analyze",
    batchAnalyzing: "Translating and analyzing...",
    batchResultsTitle: "Batch Analysis Results",
    originalKeyword: "Original",
    translatedKeyword: "Translated",
    tabMining: "Keyword Mining",
    tabBatch: "Batch Translation",
    tabDeepDive: "Deep Dive Strategy",
    deepDiveTitle: "Deep Dive SEO Strategy",
    deepDiveDesc:
      "Build comprehensive SEO strategy for a core keyword and predict ranking probability for it and derived long-tail keywords.",
    deepDiveInputPlaceholder: "Enter core keyword (e.g., electric bike)",
    btnDeepDive: "Start Deep Dive",
    deepDiveArchives: "Deep Dive Archives",
    miningArchives: "Mining Archives",
    batchArchives: "Batch Archives",
    deepDiveAnalyzing: "Deep Dive Analysis",
    deepDiveResults: "Deep Dive Results",
    exportHTML: "Export HTML",
    backToResults: "Back to Results",
    rankingProbability: "Ranking Probability",
    searchIntent: "Search Intent",
    intentMatch: "Content-Intent Match",
    rankingAnalysis: "Analysis",
    translationReference: "Translation Reference",
    pageTitleTranslation: "Page Title Translation",
    metaDescriptionTranslation: "Meta Description Translation",
    contentStructureTranslation: "Content Structure Translation",
    longTailKeywordsTranslation: "Long-tail Keywords Translation",
    userIntentSummary: "User Intent Summary",
    // Workflow Configuration
    workflowConfig: "Workflow Configuration",
    workflowConfigDesc: "Configure AI agents for each workflow",
    miningWorkflow: "Mining Workflow",
    batchWorkflow: "Batch Translation Workflow",
    deepDiveWorkflow: "Deep Dive Workflow",
    agentNode: "Agent",
    toolNode: "Tool",
    configurable: "Configurable",
    notConfigurable: "Not Configurable",
    editPrompt: "Edit Prompt",
    saveWorkflowConfig: "Save Configuration",
    loadWorkflowConfig: "Load Configuration",
    resetToDefault: "Reset to Default",
    configNamePlaceholder: "Enter configuration name...",
    noSavedConfigs: "No saved configurations",
    currentlyUsing: "Currently Using",
    // Mining Configuration
    miningSettings: "Mining Settings",
    wordsPerRound: "Words per Round",
    miningStrategy: "Mining Strategy",
    horizontal: "Horizontal (Broad Topics)",
    vertical: "Vertical (Deep Dive)",
    userSuggestion: "Your Suggestions",
    suggestionPlaceholder:
      "Enter suggestions for next round (e.g., focus on low competition niches)...",
    applyNextRound: "Will apply in next round",
  },
  zh: {
    title: "Google SEO 智能 Agent",
    step1: "1. 输入",
    step2: "2. 挖掘循环",
    step3: "3. 结果",
    inputTitle: "定义您的利基市场",
    inputDesc:
      "输入核心关键词。Agent 将循环挖掘，直到发现“蓝海词”或“弱竞争对手”（如论坛、PDF）占位的机会。",
    placeholder: "输入关键词 (例如: 拖拉机配件)",
    targetMarket: "目标市场语言",
    btnStart: "开始挖掘",
    btnStop: "停止挖掘",
    btnTranslatePrompt: "AI 优化提示词",
    generating: "正在挖掘关键词...",
    analyzing: "正在分析 Google SERP...",
    resultsTitle: "SEO 策略报告",
    foundOpp: "发现",
    opps: "个机会",
    recTitle: "首选推荐",
    colKw: "关键词",
    colTrans: "翻译/含义",
    colVol: "搜索量",
    colType: "首页类型",
    colProb: "上首页概率",
    colStrat: "策略 / 理由",
    configPrompts: "配置 Agent 提示词 (Prompt)",
    promptGenLabel: "生成 Agent 提示词 (第一步)",
    promptAnlzLabel: "分析 Agent 提示词 (第二步)",
    logsTitle: "系统运行日志",
    agentStreamTitle: "Agent 思维流",
    btnExpand: "继续挖掘",
    newAnalysis: "开始新分析",
    archivesTitle: "历史存档",
    noArchives: "暂无存档记录",
    filterAll: "所有概率",
    filterHigh: "仅看 HIGH (推荐)",
    downloadCSV: "下载表格",
    deepDive: "深度挖掘",
    viewReport: "生成网站策略报告",
    generatingReport: "正在生成策略报告...",
    modalTitle: "SEO 网站内容策略",
    close: "关闭",
    archiveSaved: "结果已自动存档",
    viewResults: "直接查看结果",
    miningSuccessTitle: "挖掘完成",
    miningSuccessDesc: "已发现 HIGH (高概率) 关键词！",
    foundCount: "个高概率机会",
    serpEvidence: "前3个 Google 搜索结果",
    serpEvidenceDisclaimer: "* 显示分析的前3个搜索结果。",
    showTransRef: "显示翻译对照",
    transRefLabel: "提示词翻译参考 (只读)",
    verifyBtn: "Google 验证",
    agentConfigs: "Agent 配置存档",
    saveConfig: "保存配置",
    updateConfig: "更新",
    loadConfig: "加载",
    configName: "配置名称",
    noConfigs: "暂无保存的配置",
    configSaved: "配置已保存",
    enterConfigName: "输入配置名称...",
    batchTranslateTitle: "批量翻译并分析",
    batchTranslateDesc:
      "输入多个关键词（用逗号分隔），自动翻译到目标语言并分析蓝海机会。",
    batchInputPlaceholder: "例如：狗粮, 猫玩具, 鸟笼",
    btnBatchAnalyze: "批量分析",
    batchAnalyzing: "正在翻译和分析...",
    batchResultsTitle: "批量分析结果",
    originalKeyword: "原始词",
    translatedKeyword: "翻译词",
    tabMining: "关键词挖掘",
    tabBatch: "翻译分析",
    tabDeepDive: "深度策略",
    deepDiveTitle: "深度SEO策略",
    deepDiveDesc:
      "为一个核心keyword构建SEO策略及预测其与衍生长尾词的上首页概率。",
    deepDiveInputPlaceholder: "输入核心关键词 (例如：电动自行车)",
    btnDeepDive: "开始深度分析",
    deepDiveArchives: "深度挖掘历史",
    miningArchives: "挖掘历史",
    batchArchives: "批量历史",
    deepDiveAnalyzing: "深度挖掘分析中",
    deepDiveResults: "深度挖掘结果",
    exportHTML: "导出 HTML",
    backToResults: "返回结果",
    rankingProbability: "上首页概率",
    searchIntent: "搜索意图",
    intentMatch: "内容匹配度",
    rankingAnalysis: "分析结果",
    translationReference: "翻译对照",
    pageTitleTranslation: "页面标题翻译",
    metaDescriptionTranslation: "描述翻译",
    contentStructureTranslation: "内容结构翻译",
    longTailKeywordsTranslation: "长尾词翻译",
    userIntentSummary: "用户意图摘要",
    // Workflow Configuration
    workflowConfig: "工作流配置",
    workflowConfigDesc: "为每个工作流配置AI代理",
    miningWorkflow: "挖掘工作流",
    batchWorkflow: "批量翻译工作流",
    deepDiveWorkflow: "深度挖掘工作流",
    agentNode: "代理节点",
    toolNode: "工具节点",
    configurable: "可配置",
    notConfigurable: "不可配置",
    editPrompt: "编辑提示词",
    saveWorkflowConfig: "保存配置",
    loadWorkflowConfig: "加载配置",
    resetToDefault: "恢复默认",
    configNamePlaceholder: "输入配置名称...",
    noSavedConfigs: "暂无保存的配置",
    currentlyUsing: "当前使用",
    // Mining Configuration
    miningSettings: "挖掘设置",
    wordsPerRound: "每轮词数",
    miningStrategy: "挖掘策略",
    horizontal: "横向挖掘（广泛主题）",
    vertical: "纵向挖掘（深度挖掘）",
    userSuggestion: "您的建议",
    suggestionPlaceholder: "输入下一轮的建议（例如：关注低竞争细分市场）...",
    applyNextRound: "将在下一轮生效",
  },
};

const LANGUAGES: { code: TargetLanguage; label: string }[] = [
  { code: "en", label: "English (Global/US)" },
  { code: "zh", label: "Chinese (CN)" },
  { code: "ru", label: "Russian (Ru)" },
  { code: "fr", label: "French (Fr)" },
  { code: "ja", label: "Japanese (Jp)" },
  { code: "ko", label: "Korean (Kr)" },
  { code: "pt", label: "Portuguese (Pt)" },
  { code: "id", label: "Indonesian (Id)" },
  { code: "es", label: "Spanish (Es)" },
  { code: "ar", label: "Arabic (Ar)" },
];

// --- Components ---

const TerminalLog = ({
  logs,
  isDarkTheme = true,
}: {
  logs: LogEntry[];
  isDarkTheme?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={`rounded-lg p-3 font-mono text-xs h-full overflow-hidden flex flex-col shadow-inner ${
        isDarkTheme
          ? "bg-[#0a0a0a] text-emerald-400 border border-white/10"
          : "bg-white text-emerald-600 border border-gray-200"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${
          isDarkTheme
            ? "border-white/10 text-neutral-500"
            : "border-gray-200 text-gray-500"
        }`}
      >
        <Terminal className="w-3 h-3 text-emerald-500" />
        <span>System Logs</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 space-y-1"
      >
        {logs.map((log, i) => (
          <div
            key={i}
            className={`flex gap-2 ${
              log.type === "error"
                ? isDarkTheme
                  ? "text-red-400"
                  : "text-red-600"
                : log.type === "api"
                ? isDarkTheme
                  ? "text-blue-400"
                  : "text-blue-600"
                : isDarkTheme
                ? "text-neutral-300"
                : "text-gray-700"
            }`}
          >
            <span
              className={`w-14 shrink-0 ${
                isDarkTheme ? "text-neutral-600" : "text-gray-500"
              }`}
            >
              [{log.timestamp.split(" ")[0]}]
            </span>
            <span className="break-words">
              {log.type === "api" ? "> " : ""}
              {log.message}
            </span>
          </div>
        ))}
        <div className="animate-pulse">_</div>
      </div>
    </div>
  );
};

const SerpPreview = ({
  keywords,
  label,
  disclaimer,
  t,
  isDarkTheme = true,
}: {
  keywords: KeywordData[];
  label: string;
  disclaimer: string;
  t: any;
  isDarkTheme?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(true); // Default open

  if (!keywords || keywords.length === 0) return null;

  return (
    <div
      className={`mt-2 border rounded-md overflow-hidden ${
        isDarkTheme
          ? "border-white/10 bg-black/40"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-2 text-xs font-medium transition-colors ${
          isDarkTheme
            ? "bg-white/5 hover:bg-white/10 text-neutral-300"
            : "bg-white hover:bg-gray-100 text-gray-700"
        }`}
      >
        <div className="flex items-center gap-2">
          <Search className="w-3 h-3" />
          {label} ({keywords.length})
        </div>
        {isOpen ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>

      {isOpen && (
        <div
          className={`p-2 space-y-3 border-t ${
            isDarkTheme
              ? "bg-black/20 border-white/10"
              : "bg-white border-gray-200"
          }`}
        >
          <div
            className={`text-[10px] px-2 italic mb-2 ${
              isDarkTheme ? "text-amber-400" : "text-amber-600"
            }`}
          >
            {disclaimer}
          </div>
          {keywords.map((kw) => (
            <div
              key={kw.id}
              className={`border-b last:border-0 pb-2 last:pb-0 ${
                isDarkTheme ? "border-white/10" : "border-gray-200"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div
                  className={`font-bold text-xs ${
                    isDarkTheme ? "text-white" : "text-gray-900"
                  }`}
                >
                  {kw.keyword}
                </div>
                <div
                  className={`text-[10px] px-1.5 rounded-full ${
                    kw.probability === ProbabilityLevel.HIGH
                      ? isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-100 text-emerald-700"
                      : kw.probability === ProbabilityLevel.MEDIUM
                      ? isDarkTheme
                        ? "bg-yellow-500/20 text-yellow-400"
                        : "bg-yellow-100 text-yellow-700"
                      : isDarkTheme
                      ? "bg-red-500/20 text-red-400"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {kw.probability}
                </div>
              </div>
              {kw.topSerpSnippets && kw.topSerpSnippets.length > 0 ? (
                <div
                  className={`space-y-1.5 pl-2 border-l-2 ${
                    isDarkTheme ? "border-white/10" : "border-gray-200"
                  }`}
                >
                  {kw.topSerpSnippets.slice(0, 3).map((snippet, idx) => (
                    <div key={idx} className="text-[10px]">
                      <div
                        className={`truncate hover:underline cursor-pointer ${
                          isDarkTheme ? "text-blue-400" : "text-blue-600"
                        }`}
                        title={snippet.title}
                      >
                        {snippet.title}
                      </div>
                      <div
                        className={`truncate text-[9px] ${
                          isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                        }`}
                      >
                        {snippet.url}
                      </div>
                      <div
                        className={`line-clamp-2 ${
                          isDarkTheme ? "text-neutral-400" : "text-gray-600"
                        }`}
                      >
                        {snippet.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`text-[10px] italic pl-2 border-l-2 ${
                    isDarkTheme
                      ? "text-neutral-500 border-white/10"
                      : "text-gray-500 border-gray-200"
                  }`}
                >
                  No SERP snippets returned. (May be zero results or API missing
                  data)
                </div>
              )}
              {/* Verify Button in Stream */}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(
                  kw.keyword
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-2 flex w-full items-center justify-center gap-1 text-[10px] py-1 rounded border transition-colors font-medium ${
                  isDarkTheme
                    ? "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
                    : "bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                }`}
              >
                <ExternalLink className="w-3 h-3" />
                {t.verifyBtn}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AgentStream = ({
  thoughts,
  t,
  isDarkTheme = true,
}: {
  thoughts: AgentThought[];
  t: any;
  isDarkTheme?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div
      className={`rounded-lg p-4 h-full overflow-hidden flex flex-col shadow-sm border ${
        isDarkTheme
          ? "bg-[#0a0a0a] border-white/10"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${
          isDarkTheme
            ? "border-white/10 text-neutral-400"
            : "border-gray-200 text-gray-500"
        }`}
      >
        <BrainCircuit className="w-3 h-3 text-emerald-500" />
        <span>{t.agentStreamTitle}</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2"
      >
        {thoughts.map((thought) => (
          <div key={thought.id} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  thought.type === "generation"
                    ? isDarkTheme
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-blue-100 text-blue-700"
                    : thought.type === "analysis"
                    ? isDarkTheme
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-purple-100 text-purple-700"
                    : isDarkTheme
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                ROUND {thought.round}
              </span>
              <span
                className={`text-xs uppercase font-semibold ${
                  isDarkTheme ? "text-neutral-500" : "text-gray-500"
                }`}
              >
                {thought.type}
              </span>
            </div>
            <p
              className={`text-sm mb-2 font-medium ${
                isDarkTheme ? "text-neutral-300" : "text-gray-700"
              }`}
            >
              {thought.content}
            </p>

            {thought.keywords && thought.type === "generation" && (
              <div className="flex flex-wrap gap-1 mb-2">
                {thought.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-1 border rounded text-xs ${
                      isDarkTheme
                        ? "bg-white/5 border-white/10 text-neutral-400"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {thought.stats && (
              <div className="flex gap-2 text-xs items-center">
                <span
                  className={`font-bold px-2 py-0.5 rounded ${
                    isDarkTheme
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-emerald-700 bg-emerald-100"
                  }`}
                >
                  {thought.stats.high} High
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    isDarkTheme
                      ? "text-yellow-400 bg-yellow-500/10"
                      : "text-yellow-700 bg-yellow-100"
                  }`}
                >
                  {thought.stats.medium} Medium
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    isDarkTheme
                      ? "text-red-400 bg-red-500/10"
                      : "text-red-700 bg-red-100"
                  }`}
                >
                  {thought.stats.low} Low
                </span>
              </div>
            )}

            {/* SERP PREVIEW Section */}
            {thought.type === "analysis" && thought.analyzedKeywords && (
              <SerpPreview
                keywords={thought.analyzedKeywords}
                label={t.serpEvidence}
                disclaimer={t.serpEvidenceDisclaimer}
                t={t}
                isDarkTheme={isDarkTheme}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const BatchAnalysisStream = ({
  thoughts,
  t,
  isDarkTheme = true,
}: {
  thoughts: BatchAnalysisThought[];
  t: any;
  isDarkTheme?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div
      className={`rounded-lg p-4 h-full overflow-hidden flex flex-col shadow-sm border ${
        isDarkTheme
          ? "bg-[#0a0a0a] border-white/10"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${
          isDarkTheme
            ? "border-white/10 text-neutral-400"
            : "border-gray-200 text-gray-500"
        }`}
      >
        <Languages className="w-3 h-3 text-emerald-500" />
        <span>Batch Analysis Stream</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2"
      >
        {thoughts.map((thought) => (
          <div key={thought.id} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  thought.type === "translation"
                    ? isDarkTheme
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-blue-100 text-blue-700"
                    : thought.type === "seranking"
                    ? isDarkTheme
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-orange-100 text-orange-700"
                    : thought.type === "serp-search"
                    ? isDarkTheme
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-purple-100 text-purple-700"
                    : thought.type === "intent-analysis"
                    ? isDarkTheme
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-indigo-100 text-indigo-700"
                    : isDarkTheme
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {thought.type === "seranking"
                  ? "SEO RESEARCH"
                  : thought.type.toUpperCase().replace("-", " ")}
              </span>
              <span
                className={`text-xs font-medium truncate ${
                  isDarkTheme ? "text-neutral-400" : "text-gray-600"
                }`}
              >
                {thought.keyword}
              </span>
            </div>
            <p
              className={`text-sm mb-2 ${
                isDarkTheme ? "text-neutral-300" : "text-gray-700"
              }`}
            >
              {thought.content}
            </p>

            {/* SE Ranking Data Display */}
            {thought.type === "seranking" && thought.serankingData && (
              <div className="mt-2">
                {thought.serankingData.is_data_found ? (
                  <div
                    className={`p-3 rounded border ${
                      isDarkTheme
                        ? "bg-black/40 border-orange-500/30"
                        : "bg-orange-50 border-orange-200"
                    }`}
                  >
                    <div
                      className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${
                        isDarkTheme ? "text-orange-400" : "text-orange-600"
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      SE RANKING DATA
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className={`p-2 rounded border ${
                          isDarkTheme
                            ? "bg-white/5 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          VOLUME
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isDarkTheme ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {thought.serankingData.volume?.toLocaleString() ||
                            "N/A"}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border ${
                          isDarkTheme
                            ? "bg-white/5 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          KD
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            (thought.serankingData.difficulty || 0) <= 40
                              ? isDarkTheme
                                ? "text-emerald-400"
                                : "text-emerald-600"
                              : (thought.serankingData.difficulty || 0) <= 60
                              ? isDarkTheme
                                ? "text-yellow-400"
                                : "text-yellow-600"
                              : isDarkTheme
                              ? "text-red-400"
                              : "text-red-600"
                          }`}
                        >
                          {thought.serankingData.difficulty || "N/A"}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border ${
                          isDarkTheme
                            ? "bg-white/5 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          CPC
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          }`}
                        >
                          ${thought.serankingData.cpc?.toFixed(2) || "N/A"}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border ${
                          isDarkTheme
                            ? "bg-white/5 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          COMP
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isDarkTheme ? "text-purple-400" : "text-purple-600"
                          }`}
                        >
                          {thought.serankingData.competition
                            ? typeof thought.serankingData.competition ===
                              "number"
                              ? (
                                  thought.serankingData.competition * 100
                                ).toFixed(1) + "%"
                              : thought.serankingData.competition
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded border ${
                      isDarkTheme
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-emerald-50 border-emerald-200"
                    }`}
                  >
                    <div
                      className={`text-xs font-medium flex items-center gap-2 ${
                        isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                      }`}
                    >
                      <Lightbulb className="w-4 h-4" />
                      Blue Ocean Signal - No competition data found!
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Intent Analysis Display */}
            {thought.type === "intent-analysis" && thought.intentData && (
              <div className="mt-2 space-y-2">
                <div
                  className={`p-2 rounded border ${
                    isDarkTheme
                      ? "bg-purple-500/10 border-purple-500/20"
                      : "bg-purple-50 border-purple-200"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold mb-1 ${
                      isDarkTheme ? "text-purple-400" : "text-purple-700"
                    }`}
                  >
                    USER INTENT
                  </div>
                  <p
                    className={`text-xs ${
                      isDarkTheme ? "text-neutral-300" : "text-gray-700"
                    }`}
                  >
                    {thought.intentData.searchIntent}
                  </p>
                </div>
                <div
                  className={`p-2 rounded border ${
                    isDarkTheme
                      ? "bg-blue-500/10 border-blue-500/20"
                      : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold mb-1 ${
                      isDarkTheme ? "text-blue-400" : "text-blue-700"
                    }`}
                  >
                    INTENT vs SERP
                  </div>
                  <p
                    className={`text-xs ${
                      isDarkTheme ? "text-neutral-300" : "text-gray-700"
                    }`}
                  >
                    {thought.intentData.intentAnalysis}
                  </p>
                </div>
              </div>
            )}

            {/* SERP Snippets */}
            {thought.type === "serp-search" &&
              thought.serpSnippets &&
              thought.serpSnippets.length > 0 && (
                <div
                  className={`mt-2 border rounded-md overflow-hidden ${
                    isDarkTheme
                      ? "border-white/10 bg-black/40"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="space-y-2 p-2">
                    {thought.serpSnippets.slice(0, 3).map((snippet, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs ${
                          isDarkTheme
                            ? "bg-white/5 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`font-medium truncate ${
                            isDarkTheme ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {snippet.title}
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          }`}
                        >
                          {snippet.url}
                        </div>
                        <div
                          className={`mt-1 line-clamp-2 ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-600"
                          }`}
                        >
                          {snippet.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Analysis Result */}
            {thought.type === "analysis" && thought.analysis && (
              <div
                className={`mt-2 p-3 rounded border ${
                  isDarkTheme
                    ? "bg-black/40 border-white/10"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      thought.analysis.probability === ProbabilityLevel.HIGH
                        ? isDarkTheme
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-700"
                        : thought.analysis.probability ===
                          ProbabilityLevel.MEDIUM
                        ? isDarkTheme
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-yellow-100 text-yellow-700"
                        : isDarkTheme
                        ? "bg-red-500/20 text-red-400"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {thought.analysis.probability}
                  </span>
                  <span
                    className={`text-xs ${
                      isDarkTheme ? "text-neutral-400" : "text-gray-600"
                    }`}
                  >
                    {thought.analysis.topDomainType}
                  </span>
                  <span
                    className={`text-xs ${
                      isDarkTheme ? "text-neutral-500" : "text-gray-500"
                    }`}
                  >
                    (
                    {thought.analysis.serpResultCount === -1
                      ? "Many"
                      : thought.analysis.serpResultCount}{" "}
                    results)
                  </span>
                </div>
                <p
                  className={`text-xs whitespace-pre-wrap ${
                    isDarkTheme ? "text-neutral-300" : "text-gray-700"
                  }`}
                >
                  {thought.analysis.reasoning}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const DeepDiveAnalysisStream = ({
  thoughts,
  t,
  isDarkTheme = true,
}: {
  thoughts: DeepDiveThought[];
  t: any;
  isDarkTheme?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div
      className={`rounded-lg p-4 h-full overflow-hidden flex flex-col shadow-sm border ${
        isDarkTheme
          ? "bg-[#0a0a0a] border-white/10"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${
          isDarkTheme
            ? "border-white/10 text-neutral-400"
            : "border-gray-200 text-gray-500"
        }`}
      >
        <BrainCircuit className="w-3 h-3 text-emerald-500" />
        <span>Deep Dive Analysis Stream</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2"
      >
        {thoughts.map((thought) => (
          <div key={thought.id} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  thought.type === "content-generation"
                    ? isDarkTheme
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-blue-100 text-blue-700"
                    : thought.type === "keyword-extraction"
                    ? isDarkTheme
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-purple-100 text-purple-700"
                    : thought.type === "serp-verification"
                    ? isDarkTheme
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-indigo-100 text-indigo-700"
                    : isDarkTheme
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {thought.type.toUpperCase().replace("-", " ")}
              </span>
            </div>
            <p
              className={`text-sm mb-2 ${
                isDarkTheme ? "text-neutral-300" : "text-gray-700"
              }`}
            >
              {thought.content}
            </p>

            {/* Core Keywords Display */}
            {thought.type === "keyword-extraction" &&
              thought.data?.keywords && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {thought.data.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded-md text-xs font-medium border ${
                        isDarkTheme
                          ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                          : "bg-purple-100 text-purple-700 border-purple-300"
                      }`}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

            {/* SE Ranking Data Display */}
            {thought.type === "serp-verification" &&
              thought.data?.serankingData && (
                <div className="mt-2 mb-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-3 rounded-md border border-blue-500/30">
                  <div className="text-[10px] text-blue-400 font-bold mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    SE RANKING DATA
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {thought.data.serankingData.volume !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${
                          isDarkTheme
                            ? "bg-black/40 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          Volume
                        </div>
                        <div
                          className={`font-bold ${
                            isDarkTheme ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {thought.data.serankingData.volume.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {thought.data.serankingData.difficulty !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${
                          isDarkTheme
                            ? "bg-black/40 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          KD
                        </div>
                        <div
                          className={`font-bold ${
                            thought.data.serankingData.difficulty > 40
                              ? isDarkTheme
                                ? "text-red-400"
                                : "text-red-600"
                              : thought.data.serankingData.difficulty > 20
                              ? isDarkTheme
                                ? "text-yellow-400"
                                : "text-yellow-600"
                              : isDarkTheme
                              ? "text-green-400"
                              : "text-green-600"
                          }`}
                        >
                          {thought.data.serankingData.difficulty}
                        </div>
                      </div>
                    )}
                    {thought.data.serankingData.cpc !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${
                          isDarkTheme
                            ? "bg-black/40 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          CPC
                        </div>
                        <div
                          className={`font-bold ${
                            isDarkTheme ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          ${thought.data.serankingData.cpc.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {thought.data.serankingData.competition !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${
                          isDarkTheme
                            ? "bg-black/40 border-white/10"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${
                            isDarkTheme ? "text-neutral-400" : "text-gray-500"
                          }`}
                        >
                          Competition
                        </div>
                        <div
                          className={`font-bold ${
                            isDarkTheme ? "text-blue-400" : "text-blue-600"
                          }`}
                        >
                          {thought.data.serankingData.competition.toFixed(2)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* SERP Results Display */}
            {thought.type === "serp-verification" &&
              thought.data?.serpResults &&
              thought.data.serpResults.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div
                    className={`border rounded-md overflow-hidden ${
                      isDarkTheme
                        ? "border-white/10 bg-black/20"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="space-y-2 p-2">
                      {thought.data.serpResults
                        .slice(0, 3)
                        .map((snippet, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded border text-xs ${
                              isDarkTheme
                                ? "bg-white/5 border-white/10"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div
                              className={`font-medium truncate ${
                                isDarkTheme ? "text-blue-400" : "text-blue-600"
                              }`}
                            >
                              {snippet.title}
                            </div>
                            <div
                              className={`text-[10px] truncate ${
                                isDarkTheme
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                              }`}
                            >
                              {snippet.url}
                            </div>
                            <div
                              className={`mt-1 line-clamp-2 ${
                                isDarkTheme
                                  ? "text-neutral-400"
                                  : "text-gray-600"
                              }`}
                            >
                              {snippet.snippet}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  {thought.data.analysis && (
                    <div
                      className={`p-2 rounded border ${
                        isDarkTheme
                          ? "bg-indigo-500/10 border-indigo-500/30"
                          : "bg-indigo-50 border-indigo-200"
                      }`}
                    >
                      <div
                        className={`text-[10px] font-bold mb-1 ${
                          isDarkTheme ? "text-indigo-400" : "text-indigo-700"
                        }`}
                      >
                        COMPETITION ANALYSIS
                      </div>
                      <p
                        className={`text-xs whitespace-pre-wrap ${
                          isDarkTheme ? "text-neutral-300" : "text-gray-700"
                        }`}
                      >
                        {thought.data.analysis}
                      </p>
                    </div>
                  )}
                </div>
              )}

            {/* Probability Analysis Display */}
            {thought.type === "probability-analysis" &&
              thought.data?.probability &&
              thought.data?.analysis && (
                <div
                  className={`mt-2 p-3 rounded border ${
                    isDarkTheme
                      ? "bg-black/20 border-white/10"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold border ${
                        thought.data.probability === ProbabilityLevel.HIGH
                          ? isDarkTheme
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-green-100 text-green-700 border-green-300"
                          : thought.data.probability === ProbabilityLevel.MEDIUM
                          ? isDarkTheme
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : isDarkTheme
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-red-100 text-red-700 border-red-300"
                      }`}
                    >
                      {thought.data.probability} Probability
                    </span>
                  </div>
                  <p
                    className={`text-xs whitespace-pre-wrap ${
                      isDarkTheme ? "text-neutral-300" : "text-gray-700"
                    }`}
                  >
                    {thought.data.analysis}
                  </p>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Workflow Configuration Panel
const WorkflowConfigPanel = ({
  workflowDef,
  currentConfig,
  allConfigs,
  onSave,
  onLoad,
  onReset,
  t,
  isDarkTheme = true,
}: {
  workflowDef: any;
  currentConfig: WorkflowConfig | null;
  allConfigs: WorkflowConfig[];
  onSave: (config: WorkflowConfig) => void;
  onLoad: (configId: string) => void;
  onReset: () => void;
  t: any;
  isDarkTheme?: boolean;
}) => {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [configName, setConfigName] = useState("");
  const [nodes, setNodes] = useState(workflowDef.nodes);

  useEffect(() => {
    if (currentConfig) {
      setNodes(currentConfig.nodes);
    } else {
      setNodes(workflowDef.nodes);
    }
  }, [currentConfig, workflowDef]);

  const handleNodePromptChange = (nodeId: string, newPrompt: string) => {
    setNodes((prev: any[]) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, prompt: newPrompt } : node
      )
    );
  };

  const handleSaveConfig = () => {
    if (!configName.trim()) {
      alert(t.configNamePlaceholder);
      return;
    }

    const newConfig: WorkflowConfig = {
      id: `${workflowDef.id}-${Date.now()}`,
      workflowId: workflowDef.id,
      name: configName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: JSON.parse(JSON.stringify(nodes)),
    };

    onSave(newConfig);
    setConfigName("");
  };

  const handleResetToDefault = () => {
    if (confirm(t.resetToDefault + "?")) {
      setNodes(workflowDef.nodes);
      onReset();
    }
  };

  const workflowConfigs = allConfigs.filter(
    (c) => c.workflowId === workflowDef.id
  );

  return (
    <div
      className={`backdrop-blur-sm rounded-xl shadow-sm border p-6 mb-6 ${
        isDarkTheme
          ? "bg-black/20 border-green-500/20"
          : "bg-white border-green-200"
      }`}
    >
      <div className="mb-4">
        <h3
          className={`text-lg font-bold flex items-center gap-2 ${
            isDarkTheme ? "text-white" : "text-gray-900"
          }`}
        >
          <BrainCircuit className="w-5 h-5 text-green-400" />
          {workflowDef.name}
        </h3>
        <p
          className={`text-sm mt-1 ${
            isDarkTheme ? "text-slate-400" : "text-gray-600"
          }`}
        >
          {workflowDef.description}
        </p>
      </div>

      {/* Workflow Nodes Visualization */}
      <div className="space-y-3 mb-6">
        {nodes.map((node: any, index: number) => (
          <div key={node.id}>
            <div
              className={`p-4 rounded-lg border-2 ${
                node.type === "agent"
                  ? isDarkTheme
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-green-300 bg-green-50"
                  : isDarkTheme
                  ? "border-green-500/20 bg-black/40"
                  : "border-green-200 bg-gray-50"
              } ${!node.configurable ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        node.type === "agent"
                          ? "bg-green-500 text-black"
                          : isDarkTheme
                          ? "bg-slate-600 text-white"
                          : "bg-gray-600 text-white"
                      }`}
                    >
                      {node.type === "agent" ? t.agentNode : t.toolNode}
                    </span>
                    <span
                      className={`font-bold text-sm ${
                        isDarkTheme ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {node.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        node.configurable
                          ? isDarkTheme
                            ? "bg-green-500/20 text-green-400"
                            : "bg-green-100 text-green-700"
                          : isDarkTheme
                          ? "bg-slate-500/20 text-slate-400"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {node.configurable ? t.configurable : t.notConfigurable}
                    </span>
                  </div>
                  <p
                    className={`text-xs ${
                      isDarkTheme ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {node.description}
                  </p>

                  {/* Editable Prompt Area */}
                  {node.configurable && node.type === "agent" && (
                    <div className="mt-3">
                      {editingNodeId === node.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={node.prompt || ""}
                            onChange={(e) =>
                              handleNodePromptChange(node.id, e.target.value)
                            }
                            className={`w-full h-32 p-2 text-xs font-mono border rounded focus:outline-none focus:ring-2 ${
                              isDarkTheme
                                ? "border-green-500/30 bg-black/60 text-white placeholder:text-slate-500 focus:ring-green-500/50"
                                : "border-green-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-green-500"
                            }`}
                            placeholder={t.editPrompt}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingNodeId(null)}
                              className="px-3 py-1 bg-green-500 text-black rounded text-xs hover:bg-green-600"
                            >
                              {t.close}
                            </button>
                            <button
                              onClick={() => {
                                handleNodePromptChange(
                                  node.id,
                                  node.defaultPrompt || ""
                                );
                              }}
                              className="px-3 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-500"
                            >
                              {t.resetToDefault}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => setEditingNodeId(node.id)}
                          className={`mt-2 p-2 border rounded cursor-pointer transition-colors ${
                            isDarkTheme
                              ? "bg-black/60 border-green-500/30 hover:border-green-400"
                              : "bg-gray-50 border-green-300 hover:border-green-400"
                          }`}
                        >
                          <div
                            className={`text-[10px] mb-1 ${
                              isDarkTheme ? "text-slate-500" : "text-gray-500"
                            }`}
                          >
                            {t.editPrompt}
                          </div>
                          <div
                            className={`text-xs line-clamp-2 font-mono ${
                              isDarkTheme ? "text-slate-300" : "text-gray-700"
                            }`}
                          >
                            {node.prompt || "No prompt"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connector Arrow */}
            {index < nodes.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowRight className="w-5 h-5 text-green-500/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Configuration Management */}
      <div className="border-t border-green-500/20 pt-4 space-y-4">
        {/* Save New Config */}
        <div className="flex gap-2">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder={t.configNamePlaceholder}
            className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
              isDarkTheme
                ? "border-green-500/30 bg-black/60 text-white placeholder:text-slate-500 focus:ring-green-500/50"
                : "border-green-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-green-500"
            }`}
          />
          <button
            onClick={handleSaveConfig}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black rounded hover:bg-green-600 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {t.saveWorkflowConfig}
          </button>
          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            {t.resetToDefault}
          </button>
        </div>

        {/* Saved Configs List */}
        {workflowConfigs.length > 0 && (
          <div>
            <div
              className={`text-xs uppercase font-bold mb-2 ${
                isDarkTheme ? "text-slate-400" : "text-gray-600"
              }`}
            >
              {t.loadWorkflowConfig}
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
              {workflowConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-2 rounded border ${
                    currentConfig?.id === config.id
                      ? isDarkTheme
                        ? "border-green-500/50 bg-green-500/20"
                        : "border-green-400 bg-green-100"
                      : isDarkTheme
                      ? "border-green-500/20 bg-black/40"
                      : "border-green-200 bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <div
                      className={`text-sm font-medium ${
                        isDarkTheme ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {config.name}
                    </div>
                    <div
                      className={`text-xs ${
                        isDarkTheme ? "text-slate-500" : "text-gray-500"
                      }`}
                    >
                      {new Date(config.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {currentConfig?.id === config.id && (
                      <span className="text-xs bg-green-500/30 text-green-400 px-2 py-1 rounded">
                        {t.currentlyUsing}
                      </span>
                    )}
                    <button
                      onClick={() => onLoad(config.id)}
                      className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                    >
                      <FolderOpen className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {workflowConfigs.length === 0 && (
          <div
            className={`text-center py-4 text-sm ${
              isDarkTheme ? "text-slate-500" : "text-gray-500"
            }`}
          >
            {t.noSavedConfigs}
          </div>
        )}
      </div>
    </div>
  );
};

// Modal for Deep Dive Strategy
const StrategyModal = ({
  report,
  onClose,
  title,
  labels,
}: {
  report: SEOStrategyReport;
  onClose: () => void;
  title: string;
  labels: any;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <FileText className="w-5 h-5" />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-start">
            <div>
              <div className="text-xs text-blue-600 uppercase font-bold mb-1">
                Target Keyword
              </div>
              <div className="text-xl font-bold text-slate-900">
                {report.targetKeyword}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-blue-600 uppercase font-bold mb-1">
                URL Slug
              </div>
              <div className="font-mono text-sm text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">
                {report.urlSlug}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Original */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>{" "}
                Content (Target Lang)
              </h4>

              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">
                  Page Title (H1)
                </div>
                <div className="font-medium text-slate-800">
                  {report.pageTitleH1}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">
                  Meta Description
                </div>
                <div className="text-sm text-slate-700">
                  {report.metaDescription}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-bold text-slate-700">
                  Structure (Headers)
                </div>
                {report.contentStructure.map((item, idx) => (
                  <div key={idx} className="border-l-2 border-slate-300 pl-3">
                    <div className="font-bold text-slate-800 text-sm">
                      {item.header}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-sm font-bold text-slate-700 mb-2">
                  Long-tail Keywords
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.longTailKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Translation */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>{" "}
                Translation Reference
              </h4>

              <div className="p-3 bg-green-50/50 rounded border border-green-100">
                <div className="text-xs text-green-500 uppercase font-bold mb-1">
                  Translated Title
                </div>
                <div className="font-medium text-slate-800">
                  {report.pageTitleH1_trans || "-"}
                </div>
              </div>

              <div className="p-3 bg-green-50/50 rounded border border-green-100">
                <div className="text-xs text-green-500 uppercase font-bold mb-1">
                  Translated Description
                </div>
                <div className="text-sm text-slate-700">
                  {report.metaDescription_trans || "-"}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-bold text-slate-700">
                  Structure (Translated)
                </div>
                {report.contentStructure.map((item, idx) => (
                  <div key={idx} className="border-l-2 border-green-200 pl-3">
                    <div className="font-bold text-slate-800 text-sm">
                      {item.header_trans || "-"}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {item.description_trans || "-"}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-sm font-bold text-slate-700 mb-2">
                  Translated Keywords
                </div>
                <div className="flex flex-wrap gap-2">
                  {report.longTailKeywords_trans?.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-green-50 border border-green-100 text-green-700 rounded text-xs font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200">
            <div className="text-sm font-bold text-slate-700 mb-2">
              User Intent Summary
            </div>
            <p className="text-sm text-slate-600">{report.userIntentSummary}</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 pt-4 border-t border-slate-100">
            <span>Recommended Length:</span>
            <span className="font-bold text-slate-900">
              {report.recommendedWordCount} words
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm font-medium"
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- toUI-style Helper Components ---

// StepItem Component (for header process indicators)
const StepItem: React.FC<{
  number: number;
  label: string;
  active: boolean;
  isDarkTheme?: boolean;
}> = ({ number, label, active, isDarkTheme = true }) => (
  <div
    className={`flex items-center space-x-3 transition-all ${
      active ? "opacity-100" : "opacity-30"
    }`}
  >
    <div
      className={`text-xs font-black ${
        active
          ? "text-emerald-500"
          : isDarkTheme
          ? "text-neutral-500"
          : "text-gray-500"
      }`}
    >
      {number}.
    </div>
    <span
      className={`text-xs font-bold tracking-widest uppercase ${
        active
          ? isDarkTheme
            ? "text-white"
            : "text-gray-900"
          : isDarkTheme
          ? "text-neutral-600"
          : "text-gray-500"
      }`}
    >
      {label}
    </span>
  </div>
);

// SidebarLink Component (for sidebar options)
const SidebarLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  isDarkTheme?: boolean;
}> = ({ icon, label, onClick, active, isDarkTheme = true }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2 rounded transition-all text-xs font-bold uppercase tracking-wider ${
      active
        ? isDarkTheme
          ? "text-white bg-white/5 border border-white/10"
          : "text-gray-900 bg-emerald-50 border border-emerald-200"
        : isDarkTheme
        ? "text-neutral-500 hover:text-white hover:bg-white/5 border border-transparent"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent"
    }`}
  >
    <span className={`shrink-0 ${active ? "opacity-100" : "opacity-60"}`}>
      {icon}
    </span>
    <span>{label}</span>
  </button>
);

// Sidebar Component (toUI-style left sidebar)
interface SidebarProps {
  tasks: TaskState[];
  activeTaskId: string | null;
  maxTasks: number;
  onTaskSwitch: (taskId: string) => void;
  onTaskAdd: () => void;
  onTaskDelete: (taskId: string, e: React.MouseEvent) => void;
  onWorkflowConfig: () => void;
  onLanguageToggle: () => void;
  onThemeToggle: () => void;
  uiLanguage: UILanguage;
  step: string;
  isDarkTheme: boolean;
}

// === Website Preview Modal ===

interface WebsitePreviewModalProps {
  code: { html: string; css: string; js: string };
  onClose: () => void;
  strategyReport: SEOStrategyReport;
  isDarkTheme: boolean;
}

const WebsitePreviewModal: React.FC<WebsitePreviewModalProps> = ({
  code,
  onClose,
  strategyReport,
  isDarkTheme,
}) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");

  // Combine code into single HTML file
  const combinedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strategyReport.pageTitleH1}</title>
  <meta name="description" content="${strategyReport.metaDescription}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${code.css}</style>
</head>
<body>
  ${code.html}
  <script>${code.js}</script>
</body>
</html>`;

  const downloadHTML = () => {
    const blob = new Blob([combinedHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${strategyReport.urlSlug}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div
        className={`w-full h-full max-w-7xl max-h-[90vh] m-4 rounded-lg overflow-hidden ${
          isDarkTheme ? "bg-neutral-900" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDarkTheme
              ? "border-neutral-700 bg-neutral-800"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <h2
            className={`text-xl font-bold ${
              isDarkTheme ? "text-white" : "text-gray-900"
            }`}
          >
            网站预览 - {strategyReport.targetKeyword}
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadHTML}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              下载HTML
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkTheme
                  ? "hover:bg-neutral-700 text-neutral-400"
                  : "hover:bg-gray-200 text-gray-600"
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div
          className={`flex border-b ${
            isDarkTheme
              ? "border-neutral-700 bg-neutral-800"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "preview"
                ? "border-b-2 border-green-500 text-green-500"
                : isDarkTheme
                ? "text-neutral-400 hover:text-neutral-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            预览
          </button>
          <button
            onClick={() => setActiveTab("code")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "code"
                ? "border-b-2 border-green-500 text-green-500"
                : isDarkTheme
                ? "text-neutral-400 hover:text-neutral-200"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            代码
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-8rem)] overflow-auto">
          {activeTab === "preview" ? (
            <SandpackProvider
              template="static"
              files={{
                "/index.html": combinedHTML,
              }}
              theme={isDarkTheme ? "dark" : "light"}
            >
              <SandpackPreview
                showNavigator={false}
                showRefreshButton={true}
                style={{ height: "100%" }}
              />
            </SandpackProvider>
          ) : (
            <SandpackProvider
              template="static"
              files={{
                "/index.html": code.html,
                "/styles.css": code.css,
                "/script.js": code.js || "// No JavaScript",
              }}
              theme={isDarkTheme ? "dark" : "light"}
            >
              <SandpackCodeEditor
                showTabs
                showLineNumbers
                showInlineErrors
                wrapContent
                style={{ height: "100%" }}
              />
            </SandpackProvider>
          )}
        </div>
      </div>
    </div>
  );
};

// === Website Builder Page (Bolt/V0 Style) ===

interface WebsiteBuilderProps {
  websiteData: WebsiteData | null; // ✅ v0-style: structured data instead of code
  messages: WebsiteMessage[];
  isOptimizing: boolean;
  isGenerating: boolean;
  progress: { current: number; total: number; currentFile: string } | null;
  strategyReport: SEOStrategyReport;
  targetLanguage: TargetLanguage;
  onSendMessage: (message: string) => void;
  onBack: () => void;
  onWebsiteGenerated: (data: WebsiteData) => void; // ✅ Changed from onCodeGenerated
  onProgressUpdate: (progress: {
    current: number;
    total: number;
    currentFile: string;
  }) => void;
  isDarkTheme: boolean;
}

const WebsiteBuilder: React.FC<WebsiteBuilderProps> = ({
  websiteData,
  messages,
  isOptimizing,
  isGenerating,
  progress,
  strategyReport,
  targetLanguage,
  onSendMessage,
  onBack,
  onWebsiteGenerated,
  onProgressUpdate,
  isDarkTheme,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ Generate website data on component mount
  useEffect(() => {
    if (!websiteData && isGenerating) {
      generateWebsiteData();
    }
  }, []);

  const generateWebsiteData = async () => {
    try {
      // ✅ Single API call - generate website data (JSON)
      onProgressUpdate({
        current: 1,
        total: 1,
        currentFile: "生成网站配置...",
      });

      const response = await fetch("/api/generate-app-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyReport,
          projectStructure: null, // Not needed anymore
          targetLanguage,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate website");
      const { data } = await response.json();

      console.log("[WebsiteBuilder] Website data generated:", data);

      // ✅ Success - update with structured data
      onWebsiteGenerated(data);
    } catch (error: any) {
      console.error("[WebsiteBuilder] Generation failed:", error);
      // Handle error (show error message in chat)
    }
  };

  const handleSend = () => {
    if (input.trim() && !isOptimizing && websiteData) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const downloadProject = () => {
    if (!websiteData) return;

    // ✅ Generate complete HTML file with all sections
    const htmlContent = generateHTMLFromData(websiteData, strategyReport);

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${strategyReport.urlSlug || "website"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ✅ Helper function to generate complete HTML
  const generateHTMLFromData = (
    data: WebsiteData,
    strategy: SEOStrategyReport
  ): string => {
    // Import WebsiteRenderer component code and render to HTML string
    // For now, return a simple HTML structure
    return `<!DOCTYPE html>
<html lang="${targetLanguage}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${strategy.pageTitleH1}</title>
  <meta name="description" content="${strategy.metaDescription}">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
  <!-- Generated website data: ${JSON.stringify(data)} -->
  <div id="root">
    <!-- Website sections will be rendered here by WebsiteRenderer -->
    <!-- This is a placeholder - actual rendering happens in React -->
  </div>
</body>
</html>`;
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full ${
        isDarkTheme ? "bg-neutral-900" : "bg-gray-50"
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between px-6 py-4 border-b ${
          isDarkTheme
            ? "border-neutral-700 bg-neutral-800"
            : "border-gray-200 bg-white"
        }`}
      >
        <div>
          <h1
            className={`text-2xl font-bold ${
              isDarkTheme ? "text-white" : "text-gray-900"
            }`}
          >
            网站生成器
          </h1>
          <p
            className={`text-sm mt-1 ${
              isDarkTheme ? "text-neutral-400" : "text-gray-600"
            }`}
          >
            {strategyReport.targetKeyword}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadProject}
            disabled={!websiteData}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            下载HTML
          </button>
          <button
            onClick={onBack}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              isDarkTheme
                ? "bg-neutral-700 text-white hover:bg-neutral-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <ArrowRight size={16} className="rotate-180" />
            返回
          </button>
        </div>
      </div>

      {/* Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat Area (40%) */}
        <div
          className={`w-2/5 flex flex-col border-r ${
            isDarkTheme
              ? "border-neutral-700 bg-neutral-900"
              : "border-gray-200 bg-white"
          }`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    msg.role === "user"
                      ? isDarkTheme
                        ? "bg-green-600 text-white"
                        : "bg-green-500 text-white"
                      : msg.role === "system"
                      ? isDarkTheme
                        ? "bg-neutral-800 text-neutral-300 border border-neutral-700"
                        : "bg-gray-100 text-gray-700 border border-gray-200"
                      : isDarkTheme
                      ? "bg-neutral-800 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  {msg.code && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <div className="text-xs opacity-70">代码已更新</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isOptimizing && (
              <div className="flex justify-start">
                <div
                  className={`rounded-lg px-4 py-3 ${
                    isDarkTheme
                      ? "bg-neutral-800 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">正在优化网站...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            className={`p-4 border-t ${
              isDarkTheme
                ? "border-neutral-700 bg-neutral-800"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入优化需求，例如：'改成蓝色主题'、'添加联系表单'..."
                disabled={isOptimizing}
                rows={3}
                className={`flex-1 px-3 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  isDarkTheme
                    ? "bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                } disabled:opacity-50`}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isOptimizing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isOptimizing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <ArrowRight size={20} />
                )}
              </button>
            </div>
            <p
              className={`text-xs mt-2 ${
                isDarkTheme ? "text-neutral-500" : "text-gray-500"
              }`}
            >
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>

        {/* Right: Preview Area (60%) */}
        <div
          className={`w-3/5 flex flex-col ${
            isDarkTheme ? "bg-neutral-800" : "bg-gray-100"
          }`}
        >
          {/* ✅ Show loading state while generating */}
          {isGenerating && !websiteData && progress ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2
                  size={48}
                  className="animate-spin mx-auto mb-4 text-green-500"
                />
                <h3
                  className={`text-xl font-bold mb-2 ${
                    isDarkTheme ? "text-white" : "text-gray-900"
                  }`}
                >
                  {progress.currentFile}
                </h3>
                <div className="w-64 bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(progress.current / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <p
                  className={`text-sm ${
                    isDarkTheme ? "text-neutral-400" : "text-gray-600"
                  }`}
                >
                  {progress.current} / {progress.total}
                </p>
              </div>
            </div>
          ) : websiteData ? (
            /* ✅ v0-style: Render using WebsiteRenderer component */
            <div className="h-full w-full overflow-auto">
              <WebsiteRenderer data={websiteData} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className={isDarkTheme ? "text-neutral-400" : "text-gray-600"}>
                等待生成...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  tasks,
  activeTaskId,
  maxTasks,
  onTaskSwitch,
  onTaskAdd,
  onTaskDelete,
  onWorkflowConfig,
  onLanguageToggle,
  onThemeToggle,
  uiLanguage,
  step,
  isDarkTheme,
}) => {
  const labels =
    uiLanguage === "zh"
      ? {
          activeTasks: "进行中的任务",
          options: "配置选项",
          workflow: "工作流编排",
          language: "中英切换",
          theme: "日夜间主题",
          version: "V2.8.5 System Online",
        }
      : {
          activeTasks: "Active Tasks",
          options: "Options",
          workflow: "Workflow",
          language: "Language",
          theme: "Theme",
          version: "V2.8.5 System Online",
        };

  // Get task icon and status indicator
  const getTaskIcon = (task: TaskState) => {
    const isBatchRunning =
      task.batchState &&
      task.batchState.batchCurrentIndex < task.batchState.batchTotalCount;

    if (
      task.miningState?.isMining ||
      isBatchRunning ||
      task.deepDiveState?.isDeepDiving
    ) {
      return <Loader2 size={14} className="animate-spin text-emerald-500" />;
    }
    if (task.miningState?.miningSuccess) {
      return <CheckCircle size={14} className="text-emerald-500" />;
    }
    return (
      <Search
        size={14}
        className={
          activeTaskId === task.id ? "text-emerald-500" : "text-neutral-600"
        }
      />
    );
  };

  return (
    <aside
      className={`w-64 border-r flex flex-col shrink-0 ${
        isDarkTheme ? "border-white/5 bg-[#0a0a0a]" : "border-gray-200 bg-white"
      }`}
    >
      {/* Logo Area */}
      <div
        className={`p-6 border-b ${
          isDarkTheme ? "border-white/5" : "border-gray-200"
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          <div>
            <h1
              className={`text-xs font-black tracking-widest leading-none ${
                isDarkTheme ? "text-white" : "text-gray-900"
              }`}
            >
              Niche Digger
            </h1>
            <p className="text-[9px] text-emerald-500 font-bold tracking-tight uppercase mt-1">
              Google SEO Agent
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        {/* Active Tasks Section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-4">
            <span
              className={`text-[10px] font-black uppercase tracking-widest ${
                isDarkTheme ? "text-neutral-500" : "text-gray-500"
              }`}
            >
              {labels.activeTasks}
            </span>
            {tasks.length < maxTasks && (
              <button
                onClick={onTaskAdd}
                className="text-emerald-500 hover:text-emerald-400 p-1 transition-colors"
              >
                <Plus size={14} />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`group flex items-center justify-between p-3 rounded transition-all border ${
                  activeTaskId === task.id
                    ? isDarkTheme
                      ? "bg-white/5 border-white/10"
                      : "bg-emerald-50 border-emerald-200"
                    : isDarkTheme
                    ? "border-transparent hover:bg-white/[0.02]"
                    : "border-transparent hover:bg-gray-50"
                }`}
              >
                <button
                  onClick={() => onTaskSwitch(task.id)}
                  className="flex items-center space-x-3 flex-1"
                >
                  {getTaskIcon(task)}
                  <span
                    className={`text-xs font-bold ${
                      activeTaskId === task.id
                        ? isDarkTheme
                          ? "text-white"
                          : "text-gray-900"
                        : isDarkTheme
                        ? "text-neutral-400"
                        : "text-gray-600"
                    }`}
                  >
                    {task.name}
                  </span>
                </button>
                <div className="flex items-center space-x-2">
                  {activeTaskId === task.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                  )}
                  <button
                    onClick={(e) => onTaskDelete(task.id, e)}
                    className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                      isDarkTheme
                        ? "text-neutral-500 hover:text-red-400 hover:bg-red-500/10"
                        : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                    title={uiLanguage === "zh" ? "关闭任务" : "Close task"}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div
                className={`text-center py-4 text-xs ${
                  isDarkTheme ? "text-neutral-600" : "text-gray-500"
                }`}
              >
                {uiLanguage === "zh"
                  ? "点击 + 创建任务"
                  : "Click + to create task"}
              </div>
            )}
          </div>
        </div>

        {/* Options Section */}
        <div>
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-3 block mb-4 ${
              isDarkTheme ? "text-neutral-500" : "text-gray-500"
            }`}
          >
            {labels.options}
          </span>
          <div className="space-y-1">
            <SidebarLink
              icon={<Workflow size={14} />}
              label={labels.workflow}
              onClick={onWorkflowConfig}
              active={step === "workflow-config"}
              isDarkTheme={isDarkTheme}
            />
            <SidebarLink
              icon={<Languages size={14} />}
              label={labels.language}
              onClick={onLanguageToggle}
              isDarkTheme={isDarkTheme}
            />
            <SidebarLink
              icon={<SunMoon size={14} />}
              label={labels.theme}
              onClick={onThemeToggle}
              isDarkTheme={isDarkTheme}
            />
          </div>
        </div>
      </div>

      {/* Bottom Status */}
      <div
        className={`p-4 border-t text-[10px] font-bold uppercase tracking-widest text-center ${
          isDarkTheme
            ? "border-white/5 text-neutral-600"
            : "border-gray-200 text-gray-500"
        }`}
      >
        {labels.version}
      </div>
    </aside>
  );
};

// Task Tab Component
interface TaskTabProps {
  task: TaskState;
  isActive: boolean;
  onSwitch: () => void;
  onClose: (e: React.MouseEvent) => void;
  onRename: (name: string) => void;
  uiLanguage: UILanguage;
}

const TaskTab: React.FC<TaskTabProps> = ({
  task,
  isActive,
  onSwitch,
  onClose,
  onRename,
  uiLanguage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(task.name);

  // Update editName when task name changes
  useEffect(() => {
    setEditName(task.name);
  }, [task.name]);

  const handleDoubleClick = () => {
    if (isActive) {
      setIsEditing(true);
    }
  };

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditName(task.name);
      setIsEditing(false);
    }
  };

  // Task status indicator - read from task object itself
  const isRunning =
    task.miningState?.isMining || task.deepDiveState?.isDeepDiving;
  const hasResults =
    (task.miningState?.keywords && task.miningState.keywords.length > 0) ||
    (task.batchState?.batchKeywords &&
      task.batchState.batchKeywords.length > 0) ||
    (task.deepDiveState?.currentStrategyReport !== null &&
      task.deepDiveState?.currentStrategyReport !== undefined);

  // Task icon
  const TaskIcon =
    task.type === "mining"
      ? Search
      : task.type === "batch"
      ? Languages
      : FileText;

  return (
    <div
      onClick={onSwitch}
      onDoubleClick={handleDoubleClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-t-md border-t border-x cursor-pointer
        transition-all flex-shrink-0 max-w-[200px] group
        ${
          isActive
            ? "bg-black/80 border-green-500/30 text-white"
            : "bg-black/40 border-green-500/10 text-slate-400 hover:bg-black/60 hover:text-green-400"
        }
      `}
    >
      {/* Task Icon */}
      <TaskIcon
        className={`w-3.5 h-3.5 flex-shrink-0 ${
          isRunning ? "animate-pulse text-green-400" : ""
        }`}
      />

      {/* Task Name (editable) */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={handleKeyDown}
          autoFocus
          className="flex-1 bg-transparent outline-none text-xs font-medium border-b border-green-500/50 text-white"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-xs font-medium truncate">{task.name}</span>
      )}

      {/* Status Indicator */}
      {isRunning && (
        <Loader2 className="w-3 h-3 animate-spin text-green-400 flex-shrink-0" />
      )}
      {!isRunning && hasResults && (
        <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className={`
          p-0.5 rounded hover:bg-red-500/20 transition-colors flex-shrink-0
          ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
      >
        <X className="w-3 h-3 text-slate-400 hover:text-red-400" />
      </button>
    </div>
  );
};

// Task Menu Modal Component
interface TaskMenuModalProps {
  show: boolean;
  onClose: () => void;
  onCreate: (type: TaskType) => void;
  uiLanguage: UILanguage;
}

const TaskMenuModal: React.FC<TaskMenuModalProps> = ({
  show,
  onClose,
  onCreate,
  uiLanguage,
}) => {
  if (!show) return null;

  const t = TEXT[uiLanguage];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-black/90 border border-green-500/30 rounded-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white mb-4">
          {uiLanguage === "zh" ? "创建新任务" : "Create New Task"}
        </h3>

        <div className="space-y-3">
          <button
            onClick={() => {
              onCreate("mining");
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5 text-green-400" />
            <div className="text-left">
              <div className="font-semibold text-white">{t.tabMining}</div>
              <div className="text-xs text-slate-400">
                {uiLanguage === "zh"
                  ? "基于种子关键词挖掘相关关键词"
                  : "Mine keywords from seed keyword"}
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onCreate("batch");
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg transition-colors"
          >
            <Languages className="w-5 h-5 text-blue-400" />
            <div className="text-left">
              <div className="font-semibold text-white">{t.tabBatch}</div>
              <div className="text-xs text-slate-400">
                {uiLanguage === "zh"
                  ? "批量翻译和分析关键词"
                  : "Batch translate and analyze keywords"}
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onCreate("deep-dive");
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 text-purple-400" />
            <div className="text-left">
              <div className="font-semibold text-white">{t.tabDeepDive}</div>
              <div className="text-xs text-slate-400">
                {uiLanguage === "zh"
                  ? "为关键词生成详细内容策略"
                  : "Generate detailed content strategy"}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>({
    // Task Management
    taskManager: {
      tasks: [],
      activeTaskId: null,
      maxTasks: 5,
    },

    step: "input",
    seedKeyword: "",
    targetLanguage: "en",
    keywords: [],
    error: null,
    isMining: false,
    miningRound: 0,
    agentThoughts: [],
    miningSuccess: false,
    wordsPerRound: 10,
    miningStrategy: "horizontal",
    userSuggestion: "",
    archives: [],
    batchArchives: [],
    deepDiveArchives: [],

    // View Config
    filterLevel: ProbabilityLevel.HIGH,
    sortBy: "probability",
    expandedRowId: null,

    // Deep Dive
    showDeepDiveModal: false,
    isDeepDiving: false,
    currentStrategyReport: null,
    deepDiveThoughts: [],
    deepDiveKeyword: null,
    showDetailedAnalysisModal: false,
    deepDiveProgress: 0,
    deepDiveCurrentStep: "",

    uiLanguage: "zh",
    genPrompt: DEFAULT_GEN_PROMPT_EN,
    analyzePrompt: DEFAULT_ANALYZE_PROMPT_EN,
    logs: [],
    showPrompts: false,

    showPromptTranslation: false,
    translatedGenPrompt: null,
    translatedAnalyzePrompt: null,

    agentConfigs: [],
    currentConfigId: null,

    // Workflow Configuration System
    workflowConfigs: [],
    currentWorkflowConfigIds: {},

    // Deep Dive Config (deprecated)
    deepDiveConfigs: [],
    currentDeepDiveConfigId: null,
    deepDivePrompt: DEFAULT_DEEP_DIVE_PROMPT_EN,

    // Batch Analysis
    batchKeywords: [],
    batchThoughts: [],
    batchCurrentIndex: 0,
    batchTotalCount: 0,
    batchInputKeywords: "",

    // Website Generator
    generatedWebsite: null,
    isGeneratingWebsite: false,
    showWebsitePreview: false,
    websiteMessages: [],
    isOptimizing: false,
    websiteGenerationProgress: null,
  });

  // Batch translate and analyze state
  const [batchInput, setBatchInput] = useState("");
  const [deepDiveInput, setDeepDiveInput] = useState("");
  const [activeTab, setActiveTab] = useState<"mining" | "batch" | "deepDive">(
    "mining"
  );
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Theme toggle state
  const stopBatchRef = useRef(false);

  const stopMiningRef = useRef(false);
  const allKeywordsRef = useRef<string[]>([]);
  const t = TEXT[state.uiLanguage];

  // Auth and Credits
  const { user, authenticated, loading: authLoading, logout } = useAuth();
  const [credits, setCredits] = useState<{
    total: number;
    used: number;
    remaining: number;
    bonus: number;
  } | null>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);

  // Main App URL
  const MAIN_APP_URL =
    import.meta.env.VITE_MAIN_APP_URL || "https://niche-mining-web.vercel.app";

  // Get user credits
  const getUserCredits = async () => {
    const token = localStorage.getItem("auth_token");

    console.log("[Credits] Getting credits, token exists:", !!token);
    console.log("[Credits] API URL:", `${MAIN_APP_URL}/api/user/dashboard`);

    if (!token) {
      console.error("[Credits] No auth token found");
      return null;
    }

    try {
      const response = await fetch(`${MAIN_APP_URL}/api/user/dashboard`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("[Credits] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Credits] API error:", errorText);
        throw new Error(`Failed to fetch credits: ${response.status}`);
      }

      const data = await response.json();
      console.log("[Credits] Response data:", data);

      return data.credits;
    } catch (error) {
      console.error("[Credits] Error fetching credits:", error);
      return null;
    }
  };

  // Consume credits
  const consumeCredits = async (
    modeId: string,
    description: string,
    keywordCount?: number
  ) => {
    const token = localStorage.getItem("auth_token");

    console.log(
      "[Credits] Consuming credits for mode:",
      modeId,
      "keyword count:",
      keywordCount
    );

    // Credit costs for each mode (per 10 keywords)
    const creditsMap: { [key: string]: number } = {
      keyword_mining: 20,
      batch_translation: 20,
      deep_mining: 30,
    };

    const baseAmount = creditsMap[modeId];
    if (!baseAmount) {
      throw new Error(`Invalid mode ID: ${modeId}`);
    }

    // Calculate actual amount based on keyword count (per 10 keywords)
    // For mining/batch: every 10 keywords = baseAmount credits
    // For deep-dive: fixed baseAmount (not based on keyword count)
    let amount = baseAmount;
    if (
      keywordCount &&
      (modeId === "keyword_mining" || modeId === "batch_translation")
    ) {
      // Round up: 1-10 keywords = 1x, 11-20 = 2x, 21-30 = 3x, etc.
      const multiplier = Math.ceil(keywordCount / 10);
      amount = baseAmount * multiplier;
      console.log(
        `[Credits] Calculated amount: ${amount} (${keywordCount} keywords, ${multiplier}x multiplier)`
      );
    }

    if (!token) {
      throw new Error("No authentication token found");
    }

    try {
      const response = await fetch(`${MAIN_APP_URL}/api/credits/consume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credits: amount,
          description,
          relatedEntity: "seo_agent",
          modeId,
        }),
      });

      console.log("[Credits] Consume response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Credits] Consume error:", errorData);

        // Handle specific errors
        if (errorData.error === "Insufficient credits") {
          throw new Error("INSUFFICIENT_CREDITS");
        }

        throw new Error(errorData.error || "Failed to consume credits");
      }

      const result = await response.json();
      console.log("[Credits] Consume success:", result);

      // Update local credits state
      setCredits((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          remaining: result.remaining,
          used: result.used,
        };
      });

      return result;
    } catch (error) {
      console.error("[Credits] Error consuming credits:", error);
      throw error;
    }
  };

  // Check if user has enough credits
  const checkCreditsBalance = (requiredCredits: number): boolean => {
    if (!credits) {
      return false;
    }

    return credits.remaining >= requiredCredits;
  };

  // Fetch credits when authenticated
  useEffect(() => {
    if (authenticated) {
      setCreditsLoading(true);
      getUserCredits()
        .then((data) => {
          if (data) {
            setCredits(data);
          }
        })
        .finally(() => {
          setCreditsLoading(false);
        });
    }
  }, [authenticated]);

  // Load theme from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDarkTheme(savedTheme === "dark");
      }
    } catch (e) {
      console.error("Error loading theme from localStorage:", e);
    }
  }, []);

  // Load archives and agent configs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("google_seo_archives");
      if (saved) {
        setState((prev) => ({ ...prev, archives: JSON.parse(saved) }));
      }
    } catch (e) {
      console.error("Failed to load archives", e);
    }

    try {
      const savedBatchArchives = localStorage.getItem(
        "google_seo_batch_archives"
      );
      if (savedBatchArchives) {
        setState((prev) => ({
          ...prev,
          batchArchives: JSON.parse(savedBatchArchives),
        }));
      }
    } catch (e) {
      console.error("Failed to load batch archives", e);
    }

    try {
      const savedDeepDiveArchives = localStorage.getItem(
        "google_seo_deepdive_archives"
      );
      if (savedDeepDiveArchives) {
        setState((prev) => ({
          ...prev,
          deepDiveArchives: JSON.parse(savedDeepDiveArchives),
        }));
      }
    } catch (e) {
      console.error("Failed to load deep dive archives", e);
    }

    try {
      const savedConfigs = localStorage.getItem("google_seo_agent_configs");
      if (savedConfigs) {
        setState((prev) => ({
          ...prev,
          agentConfigs: JSON.parse(savedConfigs),
        }));
      }
    } catch (e) {
      console.error("Failed to load agent configs", e);
    }

    // Load workflow configs
    try {
      const savedWorkflowConfigs = localStorage.getItem(
        "google_seo_workflow_configs"
      );
      if (savedWorkflowConfigs) {
        setState((prev) => ({
          ...prev,
          workflowConfigs: JSON.parse(savedWorkflowConfigs),
        }));
      }
    } catch (e) {
      console.error("Failed to load workflow configs", e);
    }

    // Migrate old agentConfigs to new workflowConfigs system (one-time migration)
    try {
      const oldConfigs = localStorage.getItem("google_seo_agent_configs");
      const existingWorkflowConfigs = localStorage.getItem(
        "google_seo_workflow_configs"
      );

      if (oldConfigs && !existingWorkflowConfigs) {
        console.log("Migrating old agent configs to new workflow configs...");
        const oldAgentConfigs: AgentConfig[] = JSON.parse(oldConfigs);

        const migratedConfigs: WorkflowConfig[] = oldAgentConfigs.map(
          (oldCfg) => ({
            id: oldCfg.id,
            workflowId: "mining",
            name: oldCfg.name,
            createdAt: oldCfg.createdAt,
            updatedAt: oldCfg.updatedAt,
            nodes: MINING_WORKFLOW.nodes.map((node) => ({
              ...node,
              prompt:
                node.id === "mining-gen"
                  ? oldCfg.genPrompt
                  : node.id === "mining-analyze"
                  ? oldCfg.analyzePrompt
                  : node.prompt,
            })),
          })
        );

        localStorage.setItem(
          "google_seo_workflow_configs",
          JSON.stringify(migratedConfigs)
        );
        setState((prev) => ({
          ...prev,
          workflowConfigs: migratedConfigs,
        }));
        console.log(`Migrated ${migratedConfigs.length} configs to new system`);
      }
    } catch (e) {
      console.error("Failed to migrate old configs", e);
    }
  }, []);

  // Load tasks from localStorage on mount
  useEffect(() => {
    loadTasksFromLocalStorage();
  }, []);

  // Auto-save tasks to localStorage (debounced only)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        state.taskManager.tasks.length > 0 &&
        state.taskManager.activeTaskId
      ) {
        // Before saving, sync current task state
        setState((prev) => {
          const activeTask = prev.taskManager.tasks.find(
            (t) => t.id === prev.taskManager.activeTaskId
          );
          if (!activeTask) return prev;

          const updatedTask = snapshotCurrentTask(prev, activeTask);
          const updatedTasks = prev.taskManager.tasks.map((t) =>
            t.id === prev.taskManager.activeTaskId ? updatedTask : t
          );

          // Save to localStorage
          try {
            localStorage.setItem(
              STORAGE_KEYS.TASKS,
              JSON.stringify(updatedTasks)
            );
          } catch (e) {
            console.error("Failed to save tasks", e);
          }

          return {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        });
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [
    state.keywords,
    state.batchKeywords,
    state.currentStrategyReport,
    state.miningRound,
    state.agentThoughts.length,
    state.batchThoughts.length,
    state.deepDiveThoughts.length,
    state.logs.length,
    state.isMining,
    state.isDeepDiving,
    state.miningSuccess,
    state.step,
  ]);

  // Sync activeTab with current task type when switching tasks
  useEffect(() => {
    if (state.taskManager.activeTaskId) {
      const activeTask = state.taskManager.tasks.find(
        (t) => t.id === state.taskManager.activeTaskId
      );
      if (activeTask && state.step === "input") {
        // Map task type to activeTab value
        const tabMap: Record<TaskType, "mining" | "batch" | "deepDive"> = {
          mining: "mining",
          batch: "batch",
          "deep-dive": "deepDive",
        };
        setActiveTab(tabMap[activeTask.type]);
      }
    }
  }, [state.taskManager.activeTaskId, state.step]);

  // Save archive helper
  const saveToArchive = (currentState: AppState) => {
    if (currentState.keywords.length === 0) return;

    const newEntry: ArchiveEntry = {
      id: `arc-${Date.now()}`,
      timestamp: Date.now(),
      seedKeyword: currentState.seedKeyword,
      keywords: currentState.keywords,
      miningRound: currentState.miningRound,
      targetLanguage: currentState.targetLanguage,
    };

    const updatedArchives = [newEntry, ...currentState.archives].slice(0, 20);
    localStorage.setItem(
      "google_seo_archives",
      JSON.stringify(updatedArchives)
    );
    setState((prev) => ({ ...prev, archives: updatedArchives }));
    addLog(t.archiveSaved, "success");
  };

  const loadArchive = (entry: ArchiveEntry) => {
    setState((prev) => ({
      ...prev,
      seedKeyword: entry.seedKeyword,
      targetLanguage: entry.targetLanguage || "en",
      keywords: entry.keywords,
      miningRound: entry.miningRound,
      step: "results",
      agentThoughts: [],
      logs: [],
      filterLevel: ProbabilityLevel.HIGH,
    }));
  };

  const deleteArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.archives.filter((a) => a.id !== id);
    localStorage.setItem("google_seo_archives", JSON.stringify(updated));
    setState((prev) => ({ ...prev, archives: updated }));
  };

  const loadBatchArchive = (entry: BatchArchiveEntry) => {
    setState((prev) => ({
      ...prev,
      batchInputKeywords: entry.inputKeywords,
      targetLanguage: entry.targetLanguage || "en",
      batchKeywords: entry.keywords,
      step: "batch-results",
      batchThoughts: [],
      logs: [],
      filterLevel: ProbabilityLevel.HIGH,
    }));
  };

  const deleteBatchArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.batchArchives.filter((a) => a.id !== id);
    localStorage.setItem("google_seo_batch_archives", JSON.stringify(updated));
    setState((prev) => ({ ...prev, batchArchives: updated }));
  };

  const loadDeepDiveArchive = (entry: DeepDiveArchiveEntry) => {
    setState((prev) => ({
      ...prev,
      targetLanguage: entry.targetLanguage || "en",
      currentStrategyReport: entry.strategyReport,
      deepDiveKeyword: {
        id: `dd-${Date.now()}`,
        keyword: entry.keyword,
        translation: entry.keyword,
        intent: IntentType.INFORMATIONAL,
        volume: 0,
      },
      step: "deep-dive-results",
      deepDiveThoughts: [],
      logs: [],
      showDetailedAnalysisModal: true,
    }));
  };

  const deleteDeepDiveArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.deepDiveArchives.filter((a) => a.id !== id);
    localStorage.setItem(
      "google_seo_deepdive_archives",
      JSON.stringify(updated)
    );
    setState((prev) => ({ ...prev, deepDiveArchives: updated }));
  };

  // Agent Config management
  const saveAgentConfig = (name: string) => {
    // New unified system: save as Mining Workflow Config
    const miningWorkflow = MINING_WORKFLOW;

    const newConfig: WorkflowConfig = {
      id: `cfg-${Date.now()}`,
      workflowId: "mining",
      name:
        name.trim() ||
        `Mining Config ${
          state.workflowConfigs.filter((c) => c.workflowId === "mining")
            .length + 1
        }`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: miningWorkflow.nodes.map((node) => ({
        ...node,
        prompt:
          node.id === "mining-gen"
            ? state.genPrompt
            : node.id === "mining-analyze"
            ? state.analyzePrompt
            : node.prompt,
      })),
    };

    const updatedConfigs = [newConfig, ...state.workflowConfigs].slice(0, 50);
    localStorage.setItem(
      "google_seo_workflow_configs",
      JSON.stringify(updatedConfigs)
    );
    setState((prev) => ({
      ...prev,
      workflowConfigs: updatedConfigs,
      currentWorkflowConfigIds: {
        ...prev.currentWorkflowConfigIds,
        mining: newConfig.id,
      },
      currentConfigId: newConfig.id, // Keep for backward compatibility
    }));
    addLog(`Mining config "${newConfig.name}" saved.`, "success");
  };

  const loadAgentConfig = (config: AgentConfig | WorkflowConfig) => {
    // Support both old AgentConfig and new WorkflowConfig
    if ("workflowId" in config) {
      // New WorkflowConfig
      const genNode = config.nodes.find((n) => n.id === "mining-gen");
      const analyzeNode = config.nodes.find((n) => n.id === "mining-analyze");

      setState((prev) => ({
        ...prev,
        genPrompt: genNode?.prompt || DEFAULT_GEN_PROMPT_EN,
        analyzePrompt: analyzeNode?.prompt || DEFAULT_ANALYZE_PROMPT_EN,
        currentWorkflowConfigIds: {
          ...prev.currentWorkflowConfigIds,
          mining: config.id,
        },
        currentConfigId: config.id,
        translatedGenPrompt: null,
        translatedAnalyzePrompt: null,
      }));
    } else {
      // Old AgentConfig - backward compatibility
      setState((prev) => ({
        ...prev,
        genPrompt: config.genPrompt,
        analyzePrompt: config.analyzePrompt,
        targetLanguage: config.targetLanguage,
        currentConfigId: config.id,
        translatedGenPrompt: null,
        translatedAnalyzePrompt: null,
      }));
    }
    addLog(`Loaded config: "${config.name}"`, "info");
  };

  const updateAgentConfig = (id: string) => {
    // Update in WorkflowConfig
    const updatedConfigs = state.workflowConfigs.map((cfg) =>
      cfg.id === id && cfg.workflowId === "mining"
        ? {
            ...cfg,
            updatedAt: Date.now(),
            nodes: cfg.nodes.map((node) => ({
              ...node,
              prompt:
                node.id === "mining-gen"
                  ? state.genPrompt
                  : node.id === "mining-analyze"
                  ? state.analyzePrompt
                  : node.prompt,
            })),
          }
        : cfg
    );
    localStorage.setItem(
      "google_seo_workflow_configs",
      JSON.stringify(updatedConfigs)
    );
    setState((prev) => ({ ...prev, workflowConfigs: updatedConfigs }));
    addLog("Mining config updated.", "success");
  };

  const deleteAgentConfig = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.workflowConfigs.filter((c) => c.id !== id);
    localStorage.setItem(
      "google_seo_workflow_configs",
      JSON.stringify(updated)
    );
    setState((prev) => ({
      ...prev,
      workflowConfigs: updated,
      currentConfigId:
        prev.currentConfigId === id ? null : prev.currentConfigId,
      currentWorkflowConfigIds: {
        ...prev.currentWorkflowConfigIds,
        mining:
          prev.currentWorkflowConfigIds.mining === id
            ? undefined
            : prev.currentWorkflowConfigIds.mining,
      },
    }));
  };

  const addLog = (
    message: string,
    type: LogEntry["type"] = "info",
    taskId?: string
  ) => {
    const logEntry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type,
    };

    setState((prev) => {
      // If no taskId provided, use current active task (backward compatibility)
      const targetTaskId = taskId || prev.taskManager.activeTaskId;

      if (!targetTaskId) {
        // No task context, just add to global logs
        return {
          ...prev,
          logs: [...prev.logs, logEntry],
        };
      }

      // Check if this log belongs to the currently active task
      if (targetTaskId === prev.taskManager.activeTaskId) {
        // Update both global logs (for UI) and task logs
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId) {
            const taskCopy = { ...task };
            if (taskCopy.miningState) {
              taskCopy.miningState = {
                ...taskCopy.miningState,
                logs: [...taskCopy.miningState.logs, logEntry],
              };
            } else if (taskCopy.batchState) {
              taskCopy.batchState = {
                ...taskCopy.batchState,
                logs: [...taskCopy.batchState.logs, logEntry],
              };
            } else if (taskCopy.deepDiveState) {
              taskCopy.deepDiveState = {
                ...taskCopy.deepDiveState,
                logs: [...taskCopy.deepDiveState.logs, logEntry],
              };
            }
            return taskCopy;
          }
          return task;
        });

        return {
          ...prev,
          logs: [...prev.logs, logEntry],
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      } else {
        // Background task - only update task object, not global state
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId) {
            const taskCopy = { ...task };
            if (taskCopy.miningState) {
              taskCopy.miningState = {
                ...taskCopy.miningState,
                logs: [...taskCopy.miningState.logs, logEntry],
              };
            } else if (taskCopy.batchState) {
              taskCopy.batchState = {
                ...taskCopy.batchState,
                logs: [...taskCopy.batchState.logs, logEntry],
              };
            } else if (taskCopy.deepDiveState) {
              taskCopy.deepDiveState = {
                ...taskCopy.deepDiveState,
                logs: [...taskCopy.deepDiveState.logs, logEntry],
              };
            }
            return taskCopy;
          }
          return task;
        });

        return {
          ...prev,
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      }
    });
  };

  // ========== Task Management Functions ==========

  // Generate default task name based on type
  const generateTaskName = (type: TaskType, index: number): string => {
    const names = {
      mining: state.uiLanguage === "zh" ? "挖掘" : "Mining",
      batch: state.uiLanguage === "zh" ? "批量" : "Batch",
      "deep-dive": state.uiLanguage === "zh" ? "深度" : "Deep Dive",
    };
    return `${names[type]} #${index + 1}`;
  };

  // Create a new task
  const createTask = (params: CreateTaskParams): TaskState => {
    const taskId = `task-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const name =
      params.name ||
      generateTaskName(params.type, state.taskManager.tasks.length);

    const baseTask: TaskState = {
      type: params.type,
      id: taskId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: false,
      targetLanguage: params.targetLanguage || state.targetLanguage || "en",
      filterLevel: ProbabilityLevel.HIGH,
      sortBy: "probability",
      expandedRowId: null,
    };

    // Initialize type-specific state
    switch (params.type) {
      case "mining":
        baseTask.miningState = {
          seedKeyword: params.seedKeyword || "",
          keywords: [],
          miningRound: 0,
          agentThoughts: [],
          isMining: false,
          miningSuccess: false,
          wordsPerRound: 10,
          miningStrategy: "horizontal",
          userSuggestion: "",
          logs: [],
        };
        break;
      case "batch":
        baseTask.batchState = {
          batchInputKeywords: params.inputKeywords || "",
          batchKeywords: [],
          batchThoughts: [],
          batchCurrentIndex: 0,
          batchTotalCount: 0,
          logs: [],
        };
        break;
      case "deep-dive":
        baseTask.deepDiveState = {
          deepDiveKeyword: params.keyword || null,
          currentStrategyReport: null,
          deepDiveThoughts: [],
          isDeepDiving: false,
          deepDiveProgress: 0,
          deepDiveCurrentStep: "",
          logs: [],
        };
        break;
    }

    return baseTask;
  };

  // Save current task state to task object (snapshot)
  const snapshotCurrentTask = (
    currentState: AppState,
    task: TaskState
  ): TaskState => {
    const updated = { ...task, updatedAt: Date.now() };

    switch (task.type) {
      case "mining":
        if (updated.miningState) {
          updated.miningState = {
            ...updated.miningState,
            seedKeyword: currentState.seedKeyword,
            keywords: currentState.keywords,
            miningRound: currentState.miningRound,
            agentThoughts: currentState.agentThoughts,
            isMining: currentState.isMining,
            miningSuccess: currentState.miningSuccess,
            wordsPerRound: currentState.wordsPerRound,
            miningStrategy: currentState.miningStrategy,
            userSuggestion: currentState.userSuggestion,
            logs: currentState.logs,
          };
        }
        break;
      case "batch":
        if (updated.batchState) {
          updated.batchState = {
            ...updated.batchState,
            batchInputKeywords: currentState.batchInputKeywords,
            batchKeywords: currentState.batchKeywords,
            batchThoughts: currentState.batchThoughts,
            batchCurrentIndex: currentState.batchCurrentIndex,
            batchTotalCount: currentState.batchTotalCount,
            logs: currentState.logs,
          };
        }
        break;
      case "deep-dive":
        if (updated.deepDiveState) {
          updated.deepDiveState = {
            ...updated.deepDiveState,
            deepDiveKeyword: currentState.deepDiveKeyword,
            currentStrategyReport: currentState.currentStrategyReport,
            deepDiveThoughts: currentState.deepDiveThoughts,
            isDeepDiving: currentState.isDeepDiving,
            deepDiveProgress: currentState.deepDiveProgress,
            deepDiveCurrentStep: currentState.deepDiveCurrentStep,
            logs: currentState.logs,
          };
        }
        break;
    }

    return updated;
  };

  // Hydrate task state into current AppState
  const hydrateTask = (taskId: string) => {
    setState((prev) => {
      const task = prev.taskManager.tasks.find((t) => t.id === taskId);
      if (!task) return prev;

      const baseState: Partial<AppState> = {
        targetLanguage: task.targetLanguage,
        filterLevel: task.filterLevel,
        sortBy: task.sortBy,
        expandedRowId: task.expandedRowId,
        error: null,
      };

      switch (task.type) {
        case "mining":
          // Step logic: if mining -> 'mining', else if has results -> 'results', else -> 'input'
          let miningStep: AppState["step"] = "input";
          if (task.miningState?.isMining) {
            miningStep = "mining";
          } else if (
            task.miningState?.keywords &&
            task.miningState.keywords.length > 0
          ) {
            miningStep = "results";
          }

          return {
            ...prev,
            ...baseState,
            step: miningStep,
            seedKeyword: task.miningState?.seedKeyword || "",
            keywords: task.miningState?.keywords || [],
            miningRound: task.miningState?.miningRound || 0,
            agentThoughts: task.miningState?.agentThoughts || [],
            isMining: task.miningState?.isMining || false,
            miningSuccess: task.miningState?.miningSuccess || false,
            wordsPerRound: task.miningState?.wordsPerRound || 10,
            miningStrategy: task.miningState?.miningStrategy || "horizontal",
            userSuggestion: task.miningState?.userSuggestion || "",
            logs: task.miningState?.logs || [],
            // Clear other task types' state
            batchKeywords: [],
            batchThoughts: [],
            batchInputKeywords: "",
            batchCurrentIndex: 0,
            batchTotalCount: 0,
            deepDiveKeyword: null,
            currentStrategyReport: null,
            deepDiveThoughts: [],
            isDeepDiving: false,
            deepDiveProgress: 0,
            deepDiveCurrentStep: "",
          };
        case "batch":
          let batchStep: AppState["step"] = "input";
          if (
            task.batchState?.batchKeywords &&
            task.batchState.batchKeywords.length > 0
          ) {
            batchStep = "batch-results";
          }

          return {
            ...prev,
            ...baseState,
            step: batchStep,
            batchInputKeywords: task.batchState?.batchInputKeywords || "",
            batchKeywords: task.batchState?.batchKeywords || [],
            batchThoughts: task.batchState?.batchThoughts || [],
            batchCurrentIndex: task.batchState?.batchCurrentIndex || 0,
            batchTotalCount: task.batchState?.batchTotalCount || 0,
            logs: task.batchState?.logs || [],
            // Clear other task types' state
            seedKeyword: "",
            keywords: [],
            miningRound: 0,
            agentThoughts: [],
            isMining: false,
            miningSuccess: false,
            wordsPerRound: 10,
            miningStrategy: "horizontal",
            userSuggestion: "",
            deepDiveKeyword: null,
            currentStrategyReport: null,
            deepDiveThoughts: [],
            isDeepDiving: false,
            deepDiveProgress: 0,
            deepDiveCurrentStep: "",
          };
        case "deep-dive":
          let deepDiveStep: AppState["step"] = "input";
          if (task.deepDiveState?.isDeepDiving) {
            deepDiveStep = "deep-dive-analyzing";
          } else if (task.deepDiveState?.currentStrategyReport) {
            deepDiveStep = "deep-dive-results";
          }

          return {
            ...prev,
            ...baseState,
            step: deepDiveStep,
            deepDiveKeyword: task.deepDiveState?.deepDiveKeyword || null,
            currentStrategyReport:
              task.deepDiveState?.currentStrategyReport || null,
            deepDiveThoughts: task.deepDiveState?.deepDiveThoughts || [],
            isDeepDiving: task.deepDiveState?.isDeepDiving || false,
            deepDiveProgress: task.deepDiveState?.deepDiveProgress || 0,
            deepDiveCurrentStep: task.deepDiveState?.deepDiveCurrentStep || "",
            logs: task.deepDiveState?.logs || [],
            // Clear other task types' state
            seedKeyword: "",
            keywords: [],
            miningRound: 0,
            agentThoughts: [],
            isMining: false,
            miningSuccess: false,
            wordsPerRound: 10,
            miningStrategy: "horizontal",
            userSuggestion: "",
            batchKeywords: [],
            batchThoughts: [],
            batchInputKeywords: "",
            batchCurrentIndex: 0,
            batchTotalCount: 0,
          };
        default:
          return prev;
      }
    });
  };

  // Save tasks to localStorage
  const saveTasksToLocalStorage = () => {
    try {
      const tasksToSave = state.taskManager.tasks.map((task) => {
        if (task.id === state.taskManager.activeTaskId) {
          return snapshotCurrentTask(state, task);
        }
        return task;
      });

      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasksToSave));
    } catch (e) {
      console.error("Failed to save tasks", e);
    }
  };

  // Load tasks from localStorage
  const loadTasksFromLocalStorage = () => {
    try {
      const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (savedTasks) {
        const tasks: TaskState[] = JSON.parse(savedTasks);
        const activeTask = tasks.find((t) => t.isActive) || tasks[0];

        setState((prev) => ({
          ...prev,
          taskManager: {
            ...prev.taskManager,
            tasks,
            activeTaskId: activeTask?.id || null,
          },
        }));

        // Hydrate active task
        if (activeTask) {
          setTimeout(() => hydrateTask(activeTask.id), 0);
        }
      }
    } catch (e) {
      console.error("Failed to load tasks", e);
    }
  };

  // Add a new task
  const addTask = (params: CreateTaskParams) => {
    if (state.taskManager.tasks.length >= state.taskManager.maxTasks) {
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? "最多只能同时开启5个任务，请先关闭一个任务。"
            : "Maximum 5 tasks allowed. Please close a task first.",
      }));
      return;
    }

    const newTask = createTask(params);

    setState((prev) => {
      // Save current task state before switching
      const updatedTasks = prev.taskManager.activeTaskId
        ? prev.taskManager.tasks.map((task) =>
            task.id === prev.taskManager.activeTaskId
              ? snapshotCurrentTask(prev, task)
              : task
          )
        : prev.taskManager.tasks;

      return {
        ...prev,
        taskManager: {
          ...prev.taskManager,
          tasks: [...updatedTasks, { ...newTask, isActive: true }].map((t) => ({
            ...t,
            isActive: t.id === newTask.id,
          })),
          activeTaskId: newTask.id,
        },
      };
    });

    // Hydrate new task into current state
    setTimeout(() => {
      hydrateTask(newTask.id);
      saveTasksToLocalStorage();
    }, 0);
  };

  // Switch to a different task
  const switchTask = (taskId: string) => {
    if (state.taskManager.activeTaskId === taskId) return;

    // First save current task state
    setState((prev) => {
      const currentTask = prev.taskManager.tasks.find(
        (t) => t.id === prev.taskManager.activeTaskId
      );
      const targetTask = prev.taskManager.tasks.find((t) => t.id === taskId);

      if (!targetTask) return prev;

      // Save current task's snapshot
      const updatedTasks = prev.taskManager.tasks.map((task) => {
        if (task.id === prev.taskManager.activeTaskId && currentTask) {
          return { ...snapshotCurrentTask(prev, currentTask), isActive: false };
        }
        if (task.id === taskId) {
          return { ...task, isActive: true, updatedAt: Date.now() };
        }
        return { ...task, isActive: false };
      });

      // Prepare new state by loading target task
      const baseState: Partial<AppState> = {
        targetLanguage: targetTask.targetLanguage,
        filterLevel: targetTask.filterLevel,
        sortBy: targetTask.sortBy,
        expandedRowId: targetTask.expandedRowId,
        error: null,
      };

      let newState: AppState;

      switch (targetTask.type) {
        case "mining":
          let miningStep: AppState["step"] = "input";
          if (targetTask.miningState?.isMining) {
            miningStep = "mining";
          } else if (
            targetTask.miningState?.keywords &&
            targetTask.miningState.keywords.length > 0
          ) {
            miningStep = "results";
          }

          newState = {
            ...prev,
            ...baseState,
            step: miningStep,
            seedKeyword: targetTask.miningState?.seedKeyword || "",
            keywords: targetTask.miningState?.keywords || [],
            miningRound: targetTask.miningState?.miningRound || 0,
            agentThoughts: targetTask.miningState?.agentThoughts || [],
            isMining: targetTask.miningState?.isMining || false,
            miningSuccess: targetTask.miningState?.miningSuccess || false,
            wordsPerRound: targetTask.miningState?.wordsPerRound || 10,
            miningStrategy:
              targetTask.miningState?.miningStrategy || "horizontal",
            userSuggestion: targetTask.miningState?.userSuggestion || "",
            logs: targetTask.miningState?.logs || [],
            // Clear other task types
            batchKeywords: [],
            batchThoughts: [],
            batchInputKeywords: "",
            batchCurrentIndex: 0,
            batchTotalCount: 0,
            deepDiveKeyword: null,
            currentStrategyReport: null,
            deepDiveThoughts: [],
            isDeepDiving: false,
            deepDiveProgress: 0,
            deepDiveCurrentStep: "",
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
              activeTaskId: taskId,
            },
          };
          break;

        case "batch":
          let batchStep: AppState["step"] = "input";
          if (
            targetTask.batchState?.batchKeywords &&
            targetTask.batchState.batchKeywords.length > 0
          ) {
            batchStep = "batch-results";
          }

          newState = {
            ...prev,
            ...baseState,
            step: batchStep,
            batchInputKeywords: targetTask.batchState?.batchInputKeywords || "",
            batchKeywords: targetTask.batchState?.batchKeywords || [],
            batchThoughts: targetTask.batchState?.batchThoughts || [],
            batchCurrentIndex: targetTask.batchState?.batchCurrentIndex || 0,
            batchTotalCount: targetTask.batchState?.batchTotalCount || 0,
            logs: targetTask.batchState?.logs || [],
            // Clear other task types
            seedKeyword: "",
            keywords: [],
            miningRound: 0,
            agentThoughts: [],
            isMining: false,
            miningSuccess: false,
            wordsPerRound: 10,
            miningStrategy: "horizontal",
            userSuggestion: "",
            deepDiveKeyword: null,
            currentStrategyReport: null,
            deepDiveThoughts: [],
            isDeepDiving: false,
            deepDiveProgress: 0,
            deepDiveCurrentStep: "",
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
              activeTaskId: taskId,
            },
          };
          break;

        case "deep-dive":
          let deepDiveStep: AppState["step"] = "input";
          if (targetTask.deepDiveState?.isDeepDiving) {
            deepDiveStep = "deep-dive-analyzing";
          } else if (targetTask.deepDiveState?.currentStrategyReport) {
            deepDiveStep = "deep-dive-results";
          }

          newState = {
            ...prev,
            ...baseState,
            step: deepDiveStep,
            deepDiveKeyword: targetTask.deepDiveState?.deepDiveKeyword || null,
            currentStrategyReport:
              targetTask.deepDiveState?.currentStrategyReport || null,
            deepDiveThoughts: targetTask.deepDiveState?.deepDiveThoughts || [],
            isDeepDiving: targetTask.deepDiveState?.isDeepDiving || false,
            deepDiveProgress: targetTask.deepDiveState?.deepDiveProgress || 0,
            deepDiveCurrentStep:
              targetTask.deepDiveState?.deepDiveCurrentStep || "",
            logs: targetTask.deepDiveState?.logs || [],
            // Clear other task types
            seedKeyword: "",
            keywords: [],
            miningRound: 0,
            agentThoughts: [],
            isMining: false,
            miningSuccess: false,
            wordsPerRound: 10,
            miningStrategy: "horizontal",
            userSuggestion: "",
            batchKeywords: [],
            batchThoughts: [],
            batchInputKeywords: "",
            batchCurrentIndex: 0,
            batchTotalCount: 0,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
              activeTaskId: taskId,
            },
          };
          break;

        default:
          newState = {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
              activeTaskId: taskId,
            },
          };
      }

      return newState;
    });

    // Save to localStorage after switch
    setTimeout(() => saveTasksToLocalStorage(), 100);
  };

  // Delete a task
  const deleteTask = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const taskToDelete = state.taskManager.tasks.find((t) => t.id === taskId);
    if (!taskToDelete) return;

    // Prevent deletion of running tasks
    if (
      taskToDelete.miningState?.isMining ||
      taskToDelete.deepDiveState?.isDeepDiving
    ) {
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? "无法删除正在运行的任务，请先停止它。"
            : "Cannot delete a running task. Please stop it first.",
      }));
      return;
    }

    setState((prev) => {
      const remainingTasks = prev.taskManager.tasks.filter(
        (t) => t.id !== taskId
      );
      const wasActive = prev.taskManager.activeTaskId === taskId;

      // If deleting active task, switch to most recent task
      let newActiveId = prev.taskManager.activeTaskId;
      if (wasActive && remainingTasks.length > 0) {
        const sortedTasks = remainingTasks.sort(
          (a, b) => b.updatedAt - a.updatedAt
        );
        newActiveId = sortedTasks[0].id;
      } else if (wasActive) {
        newActiveId = null;
      }

      return {
        ...prev,
        taskManager: {
          ...prev.taskManager,
          tasks: remainingTasks.map((t) => ({
            ...t,
            isActive: t.id === newActiveId,
          })),
          activeTaskId: newActiveId,
        },
      };
    });

    const wasActive = state.taskManager.activeTaskId === taskId;
    const remainingTasks = state.taskManager.tasks.filter(
      (t) => t.id !== taskId
    );

    if (wasActive && remainingTasks.length > 0) {
      const sortedTasks = remainingTasks.sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      setTimeout(() => {
        hydrateTask(sortedTasks[0].id);
        saveTasksToLocalStorage();
      }, 0);
    } else if (remainingTasks.length === 0) {
      // No tasks left, reset to input screen
      setTimeout(() => {
        setState((prev) => ({ ...prev, step: "input" }));
        saveTasksToLocalStorage();
      }, 0);
    } else {
      setTimeout(() => saveTasksToLocalStorage(), 0);
    }
  };

  // Rename a task
  const renameTask = (taskId: string, newName: string) => {
    if (!newName.trim()) return;

    setState((prev) => ({
      ...prev,
      taskManager: {
        ...prev.taskManager,
        tasks: prev.taskManager.tasks.map((task) =>
          task.id === taskId
            ? { ...task, name: newName.trim(), updatedAt: Date.now() }
            : task
        ),
      },
    }));

    setTimeout(() => saveTasksToLocalStorage(), 0);
  };

  // ========== End Task Management Functions ==========

  // Play completion sound
  const playCompletionSound = () => {
    try {
      const audio = new Audio("/voice/stop.mp3");
      audio.volume = 0.5; // Set volume to 50%
      audio.play().catch((error) => {
        console.log("Audio playback failed:", error);
        // Silently fail if audio can't play (e.g., autoplay restrictions)
      });
    } catch (error) {
      console.log("Audio initialization failed:", error);
    }
  };

  const addThought = (
    type: AgentThought["type"],
    content: string,
    extra?: Partial<AgentThought>,
    taskId?: string
  ) => {
    setState((prev) => {
      // If no taskId provided, use current active task (backward compatibility)
      const targetTaskId = taskId || prev.taskManager.activeTaskId;

      const thoughtEntry = {
        id: `t-${Date.now()}`,
        round: prev.miningRound,
        type,
        content,
        ...extra,
      };

      if (!targetTaskId) {
        // No task context, just add to global thoughts
        return {
          ...prev,
          agentThoughts: [...prev.agentThoughts, thoughtEntry],
        };
      }

      // Check if this thought belongs to the currently active task
      if (targetTaskId === prev.taskManager.activeTaskId) {
        // Update both global thoughts (for UI) and task thoughts
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId && task.miningState) {
            return {
              ...task,
              miningState: {
                ...task.miningState,
                agentThoughts: [
                  ...task.miningState.agentThoughts,
                  thoughtEntry,
                ],
              },
            };
          }
          return task;
        });

        return {
          ...prev,
          agentThoughts: [...prev.agentThoughts, thoughtEntry],
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      } else {
        // Background task - only update task object, not global state
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId && task.miningState) {
            return {
              ...task,
              miningState: {
                ...task.miningState,
                agentThoughts: [
                  ...task.miningState.agentThoughts,
                  thoughtEntry,
                ],
              },
            };
          }
          return task;
        });

        return {
          ...prev,
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      }
    });
  };

  const addBatchThought = (
    type: BatchAnalysisThought["type"],
    keyword: string,
    content: string,
    extra?: Partial<BatchAnalysisThought>,
    taskId?: string
  ) => {
    setState((prev) => {
      // If no taskId provided, use current active task (backward compatibility)
      const targetTaskId = taskId || prev.taskManager.activeTaskId;

      const thoughtEntry = {
        id: `bt-${Date.now()}`,
        type,
        keyword,
        content,
        ...extra,
      };

      if (!targetTaskId) {
        // No task context, just add to global thoughts
        return {
          ...prev,
          batchThoughts: [...prev.batchThoughts, thoughtEntry],
        };
      }

      // Check if this thought belongs to the currently active task
      if (targetTaskId === prev.taskManager.activeTaskId) {
        // Update both global thoughts (for UI) and task thoughts
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId && task.batchState) {
            return {
              ...task,
              batchState: {
                ...task.batchState,
                batchThoughts: [...task.batchState.batchThoughts, thoughtEntry],
              },
            };
          }
          return task;
        });

        return {
          ...prev,
          batchThoughts: [...prev.batchThoughts, thoughtEntry],
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      } else {
        // Background task - only update task object, not global state
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId && task.batchState) {
            return {
              ...task,
              batchState: {
                ...task.batchState,
                batchThoughts: [...task.batchState.batchThoughts, thoughtEntry],
              },
            };
          }
          return task;
        });

        return {
          ...prev,
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      }
    });
  };

  const addDeepDiveThought = (
    type: DeepDiveThought["type"],
    content: string,
    data?: DeepDiveThought["data"],
    taskId?: string
  ) => {
    setState((prev) => {
      // If no taskId provided, use current active task (backward compatibility)
      const targetTaskId = taskId || prev.taskManager.activeTaskId;

      const thoughtEntry = {
        id: `ddt-${Date.now()}`,
        type,
        content,
        data,
      };

      if (!targetTaskId) {
        // No task context, just add to global thoughts
        return {
          ...prev,
          deepDiveThoughts: [...prev.deepDiveThoughts, thoughtEntry],
        };
      }

      // Check if this thought belongs to the currently active task
      if (targetTaskId === prev.taskManager.activeTaskId) {
        // Update both global thoughts (for UI) and task thoughts
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                deepDiveThoughts: [
                  ...task.deepDiveState.deepDiveThoughts,
                  thoughtEntry,
                ],
              },
            };
          }
          return task;
        });

        return {
          ...prev,
          deepDiveThoughts: [...prev.deepDiveThoughts, thoughtEntry],
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      } else {
        // Background task - only update task object, not global state
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === targetTaskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                deepDiveThoughts: [
                  ...task.deepDiveState.deepDiveThoughts,
                  thoughtEntry,
                ],
              },
            };
          }
          return task;
        });

        return {
          ...prev,
          taskManager: {
            ...prev.taskManager,
            tasks: updatedTasks,
          },
        };
      }
    });
  };

  const handleTranslatePrompt = async (promptType: "gen" | "analyze") => {
    const currentPrompt =
      promptType === "gen" ? state.genPrompt : state.analyzePrompt;
    if (!currentPrompt) return;

    addLog(`Optimizing ${promptType} prompt...`, "info");
    try {
      const optimized = await translatePromptToSystemInstruction(currentPrompt);
      setState((prev) => ({
        ...prev,
        [promptType === "gen" ? "genPrompt" : "analyzePrompt"]: optimized,
      }));
      addLog(`Prompt optimized successfully.`, "success");
    } catch (e) {
      addLog(`Prompt optimization failed.`, "error");
    }
  };

  const togglePromptTranslation = async () => {
    if (!state.showPromptTranslation) {
      setState((prev) => ({ ...prev, showPromptTranslation: true }));

      if (!state.translatedGenPrompt && state.genPrompt) {
        try {
          const trans = await translateText(state.genPrompt, state.uiLanguage);
          setState((prev) => ({ ...prev, translatedGenPrompt: trans }));
        } catch (e) {
          console.error(e);
        }
      }

      if (!state.translatedAnalyzePrompt && state.analyzePrompt) {
        try {
          const trans = await translateText(
            state.analyzePrompt,
            state.uiLanguage
          );
          setState((prev) => ({ ...prev, translatedAnalyzePrompt: trans }));
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      setState((prev) => ({ ...prev, showPromptTranslation: false }));
    }
  };

  // --- MINING LOGIC ---

  const startMining = async (continueExisting = false) => {
    if (!state.seedKeyword.trim()) return;

    // Check authentication
    if (!authenticated) {
      setState((prev) => ({
        ...prev,
        error: "请先登录才能使用关键词挖掘功能",
      }));
      return;
    }

    // Auto-create task if no active task exists
    if (!state.taskManager.activeTaskId) {
      addTask({
        type: "mining",
        seedKeyword: state.seedKeyword,
        targetLanguage: state.targetLanguage,
      });
      // Wait for task creation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
      return; // Exit and let user start mining in the new task
    }

    // Capture taskId at the start for isolation
    const currentTaskId = state.taskManager.activeTaskId;

    stopMiningRef.current = false;

    // Initialize or keep existing keywords for deduplication
    if (continueExisting) {
      allKeywordsRef.current = state.keywords.map((k) => k.keyword);
    } else {
      allKeywordsRef.current = [];
    }

    setState((prev) => ({
      ...prev,
      step: "mining",
      isMining: true,
      miningSuccess: false,
      error: null,
      logs: continueExisting ? prev.logs : [],
      agentThoughts: continueExisting ? prev.agentThoughts : [],
      miningRound: continueExisting ? prev.miningRound : 0,
      keywords: continueExisting ? prev.keywords : [],
    }));

    addLog(
      continueExisting
        ? "Resuming mining..."
        : `Starting mining loop for: "${
            state.seedKeyword
          }" (${state.targetLanguage.toUpperCase()})...`,
      "info",
      currentTaskId
    );

    runMiningLoop(continueExisting ? state.miningRound : 0, currentTaskId);
  };

  const runMiningLoop = async (startRound: number, taskId: string) => {
    let currentRound = startRound;

    while (!stopMiningRef.current) {
      currentRound++;

      // Update miningRound with task isolation
      setState((prev) => {
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === taskId && task.miningState) {
            return {
              ...task,
              miningState: {
                ...task.miningState,
                miningRound: currentRound,
              },
            };
          }
          return task;
        });

        // Only update global state if this is the active task
        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            miningRound: currentRound,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        } else {
          // Background task - only update task object
          return {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        }
      });

      addLog(
        `[Round ${currentRound}] Generating candidates...`,
        "info",
        taskId
      );

      // Dynamic thought message based on mining strategy
      let thoughtMessage = "";
      if (currentRound === 1) {
        thoughtMessage = `Initial expansion of "${
          state.seedKeyword
        }" in ${state.targetLanguage.toUpperCase()}.`;
      } else {
        if (state.miningStrategy === "horizontal") {
          thoughtMessage = `Round ${currentRound}: Lateral thinking mode. Exploring semantically distant concepts.`;
        } else {
          thoughtMessage = `Round ${currentRound}: Vertical deep dive mode. Exploring long-tail variations and specific use cases.`;
        }
      }

      addThought("generation", thoughtMessage, undefined, taskId);

      try {
        const generatedKeywords = await generateKeywords(
          state.seedKeyword,
          state.targetLanguage,
          getWorkflowPrompt("mining", "mining-gen", state.genPrompt),
          allKeywordsRef.current,
          currentRound,
          state.wordsPerRound,
          state.miningStrategy,
          state.userSuggestion
        );

        if (generatedKeywords.length === 0) {
          addLog(
            `[Round ${currentRound}] No keywords generated. Retrying...`,
            "warning",
            taskId
          );
          continue;
        }

        addThought(
          "generation",
          `Generated ${generatedKeywords.length} candidates.`,
          { keywords: generatedKeywords.map((k) => k.keyword) },
          taskId
        );

        addLog(
          `[Round ${currentRound}] Analyzing SERP probability (Google)...`,
          "api",
          taskId
        );

        // This is now parallel individual execution with batching
        // First fetch real SERP data, then analyze based on real data
        const analyzedBatch = await analyzeRankingProbability(
          generatedKeywords,
          getWorkflowPrompt("mining", "mining-analyze", state.analyzePrompt),
          state.uiLanguage,
          state.targetLanguage
        );

        // Consume credits on first successful round (after getting keywords)
        if (currentRound === 1 && analyzedBatch.length > 0) {
          try {
            addLog(
              "Consuming credits based on keywords generated...",
              "info",
              taskId
            );
            await consumeCredits(
              "keyword_mining",
              `Keyword Mining - "${
                state.seedKeyword
              }" (${state.targetLanguage.toUpperCase()})`,
              analyzedBatch.length
            );
            addLog(
              `✅ Credits consumed: ${
                Math.ceil(analyzedBatch.length / 10) * 20
              } credits. Remaining: ${credits?.remaining || 0}`,
              "success",
              taskId
            );
          } catch (error: any) {
            console.error("[Credits] Failed to consume credits:", error);
            addLog(
              `⚠️ Warning: Credits consumption failed - ${error.message}`,
              "warning",
              taskId
            );
            // Continue mining even if credits fail (already got the keywords)
          }
        }

        const highProbCandidate = analyzedBatch.find(
          (k) => k.probability === ProbabilityLevel.HIGH
        );

        // Update ref for deduplication in next round
        allKeywordsRef.current = [
          ...allKeywordsRef.current,
          ...analyzedBatch.map((k) => k.keyword),
        ];

        // Update keywords with task isolation
        setState((prev) => {
          const updatedTasks = prev.taskManager.tasks.map((task) => {
            if (task.id === taskId && task.miningState) {
              return {
                ...task,
                miningState: {
                  ...task.miningState,
                  keywords: [...task.miningState.keywords, ...analyzedBatch],
                },
              };
            }
            return task;
          });

          // Only update global state if this is the active task
          if (taskId === prev.taskManager.activeTaskId) {
            return {
              ...prev,
              keywords: [...prev.keywords, ...analyzedBatch],
              taskManager: {
                ...prev.taskManager,
                tasks: updatedTasks,
              },
            };
          } else {
            // Background task - only update task object
            return {
              ...prev,
              taskManager: {
                ...prev.taskManager,
                tasks: updatedTasks,
              },
            };
          }
        });

        const high = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.HIGH
        ).length;
        const medium = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.MEDIUM
        ).length;
        const low = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.LOW
        ).length;

        addThought(
          "analysis",
          `Analysis Complete.`,
          {
            stats: { high, medium, low },
            analyzedKeywords: analyzedBatch,
          },
          taskId
        );

        if (highProbCandidate) {
          addThought(
            "decision",
            `Found HIGH probability opportunity: "${highProbCandidate.keyword}". Stopping.`,
            undefined,
            taskId
          );
          addLog(`Success! Opportunity found.`, "success", taskId);

          setState((prev) => {
            // Update task object
            const updatedTasks = prev.taskManager.tasks.map((task) => {
              if (task.id === taskId && task.miningState) {
                return {
                  ...task,
                  miningState: {
                    ...task.miningState,
                    isMining: false,
                    miningSuccess: true,
                  },
                };
              }
              return task;
            });

            // Save archive before updating state
            saveToArchive(prev);

            // Only update global state if this is the active task
            if (taskId === prev.taskManager.activeTaskId) {
              return {
                ...prev,
                isMining: false,
                miningSuccess: true,
                taskManager: {
                  ...prev.taskManager,
                  tasks: updatedTasks,
                },
              };
            } else {
              // Background task - only update task object
              return {
                ...prev,
                taskManager: {
                  ...prev.taskManager,
                  tasks: updatedTasks,
                },
              };
            }
          });

          playCompletionSound(); // Play sound on mining completion

          // Only scroll if this is the active task
          if (taskId === state.taskManager.activeTaskId) {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }

        addThought(
          "decision",
          `No HIGH probability keywords found in Round ${currentRound}. Continuing loop...`,
          undefined,
          taskId
        );
        addLog(
          `Round ${currentRound} complete. No HIGH opportunities. Continuing...`,
          "warning",
          taskId
        );

        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err) {
        console.error(err);
        addLog(`Error in Round ${currentRound}: ${err}`, "error", taskId);
        stopMiningRef.current = true;
      }
    }
  };

  const handleStop = () => {
    const currentTaskId = state.taskManager.activeTaskId;

    stopMiningRef.current = true;
    addLog("User requested stop.", "warning", currentTaskId || undefined);

    // Show success window even when manually stopped, so user can view results
    setState((prev) => {
      if (!currentTaskId) {
        saveToArchive(prev);
        return { ...prev, isMining: false, miningSuccess: true };
      }

      // Update task object
      const updatedTasks = prev.taskManager.tasks.map((task) => {
        if (task.id === currentTaskId && task.miningState) {
          return {
            ...task,
            miningState: {
              ...task.miningState,
              isMining: false,
              miningSuccess: true,
            },
          };
        }
        return task;
      });

      saveToArchive(prev);

      // Update global state
      return {
        ...prev,
        isMining: false,
        miningSuccess: true,
        taskManager: {
          ...prev.taskManager,
          tasks: updatedTasks,
        },
      };
    });

    // Scroll to top to show success window
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToResults = () => {
    setState((prev) => ({ ...prev, step: "results", miningSuccess: false }));
  };

  const continueMining = () => {
    startMining(true);
  };

  const reset = () => {
    setState((prev) => ({
      ...prev,
      step: "input",
      seedKeyword: "",
      keywords: [],
      error: null,
      logs: [],
      agentThoughts: [],
      miningRound: 0,
      expandedRowId: null,
      miningSuccess: false,
    }));
  };

  const handleDeepDive = async (keyword: KeywordData) => {
    // Check authentication
    if (!authenticated) {
      setState((prev) => ({ ...prev, error: "请先登录才能使用Deep Dive功能" }));
      return;
    }

    // Auto-create task if no active task exists
    if (!state.taskManager.activeTaskId) {
      addTask({
        type: "deep-dive",
        keyword: keyword,
        targetLanguage: state.targetLanguage,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      return; // Exit and let user start deep dive in the new task
    }

    // Capture taskId at the start for isolation
    const currentTaskId = state.taskManager.activeTaskId;

    setState((prev) => ({
      ...prev,
      step: "deep-dive-analyzing",
      deepDiveKeyword: keyword,
      deepDiveThoughts: [],
      currentStrategyReport: null,
      isDeepDiving: true,
      logs: [],
    }));

    // Start the enhanced deep dive workflow
    runEnhancedDeepDive(keyword, currentTaskId);
  };

  const runEnhancedDeepDive = async (keyword: KeywordData, taskId: string) => {
    try {
      // Step 1: Initialize
      setState((prev) => {
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === taskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                deepDiveProgress: 10,
                deepDiveCurrentStep:
                  state.uiLanguage === "zh"
                    ? "正在生成内容策略..."
                    : "Generating content strategy...",
              },
            };
          }
          return task;
        });

        // Only update global state if this is the active task
        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            deepDiveProgress: 10,
            deepDiveCurrentStep:
              state.uiLanguage === "zh"
                ? "正在生成内容策略..."
                : "Generating content strategy...",
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        } else {
          // Background task - only update task object
          return {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        }
      });

      addDeepDiveThought(
        "content-generation",
        `Generating comprehensive SEO content strategy for "${keyword.keyword}"...`,
        undefined,
        taskId
      );
      addLog("Starting enhanced deep dive analysis...", "info", taskId);

      setState((prev) => {
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === taskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                deepDiveProgress: 25,
                deepDiveCurrentStep:
                  state.uiLanguage === "zh"
                    ? "调用AI生成策略..."
                    : "Calling AI to generate strategy...",
              },
            };
          }
          return task;
        });

        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            deepDiveProgress: 25,
            deepDiveCurrentStep:
              state.uiLanguage === "zh"
                ? "调用AI生成策略..."
                : "Calling AI to generate strategy...",
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        } else {
          return {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        }
      });

      const report = await enhancedDeepDive(
        keyword,
        state.uiLanguage,
        state.targetLanguage,
        getWorkflowPrompt("deepDive", "deepdive-strategy", state.deepDivePrompt)
      );

      // Consume credits after successfully generating strategy (fixed 30 credits for deep dive)
      try {
        addLog("Consuming credits for deep dive analysis...", "info", taskId);
        await consumeCredits(
          "deep_mining",
          `Deep Dive Strategy - "${
            keyword.keyword
          }" (${state.targetLanguage.toUpperCase()})`
        );
        addLog(
          `✅ Credits consumed: 30 credits. Remaining: ${
            credits?.remaining || 0
          }`,
          "success",
          taskId
        );
      } catch (error: any) {
        console.error("[Credits] Failed to consume credits:", error);
        addLog(
          `⚠️ Warning: Credits consumption failed - ${error.message}`,
          "warning",
          taskId
        );
        // Continue showing results even if credits fail
      }

      // Step 2: Core keyword extraction (done by API)
      setState((prev) => {
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === taskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                deepDiveProgress: 50,
                deepDiveCurrentStep:
                  state.uiLanguage === "zh"
                    ? "提取核心关键词..."
                    : "Extracting core keywords...",
              },
            };
          }
          return task;
        });

        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            deepDiveProgress: 50,
            deepDiveCurrentStep:
              state.uiLanguage === "zh"
                ? "提取核心关键词..."
                : "Extracting core keywords...",
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        } else {
          return {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        }
      });

      if (report.coreKeywords && report.coreKeywords.length > 0) {
        addDeepDiveThought(
          "keyword-extraction",
          `Extracted ${report.coreKeywords.length} core keywords from generated content`,
          { keywords: report.coreKeywords },
          taskId
        );
        addLog(
          `Core keywords: ${report.coreKeywords.join(", ")}`,
          "success",
          taskId
        );
      }

      // Step 3: SERP verification (done by API)
      setState((prev) => {
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === taskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                deepDiveProgress: 70,
                deepDiveCurrentStep:
                  state.uiLanguage === "zh"
                    ? "验证SERP竞争情况..."
                    : "Verifying SERP competition...",
              },
            };
          }
          return task;
        });

        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            deepDiveProgress: 70,
            deepDiveCurrentStep:
              state.uiLanguage === "zh"
                ? "验证SERP竞争情况..."
                : "Verifying SERP competition...",
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        } else {
          return {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        }
      });

      if (report.serpCompetitionData && report.serpCompetitionData.length > 0) {
        for (const serpData of report.serpCompetitionData) {
          addDeepDiveThought(
            "serp-verification",
            `Searched SERP for "${serpData.keyword}"`,
            {
              keywords: [serpData.keyword],
              serpResults: serpData.serpResults,
              analysis: serpData.analysis,
              serankingData: serpData.serankingData,
            },
            taskId
          );
        }
        addLog(
          `Analyzed competition for ${report.serpCompetitionData.length} core keywords`,
          "success",
          taskId
        );
      }

      // Step 4: Ranking probability analysis (done by API)
      setState((prev) => {
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === taskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                deepDiveProgress: 90,
                deepDiveCurrentStep:
                  state.uiLanguage === "zh"
                    ? "分析上首页概率..."
                    : "Analyzing ranking probability...",
              },
            };
          }
          return task;
        });

        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            deepDiveProgress: 90,
            deepDiveCurrentStep:
              state.uiLanguage === "zh"
                ? "分析上首页概率..."
                : "Analyzing ranking probability...",
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        } else {
          return {
            ...prev,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        }
      });

      if (report.rankingProbability && report.rankingAnalysis) {
        addDeepDiveThought(
          "probability-analysis",
          `Estimated ranking probability: ${report.rankingProbability}`,
          {
            probability: report.rankingProbability,
            analysis: report.rankingAnalysis,
          },
          taskId
        );
        addLog(
          `Ranking probability: ${report.rankingProbability}`,
          report.rankingProbability === ProbabilityLevel.HIGH
            ? "success"
            : report.rankingProbability === ProbabilityLevel.MEDIUM
            ? "warning"
            : "error",
          taskId
        );
      }

      // Complete - navigate to results with task isolation
      const newDeepDiveEntry: DeepDiveArchiveEntry = {
        id: `dd-arc-${Date.now()}`,
        timestamp: Date.now(),
        keyword: keyword.keyword,
        strategyReport: report,
        targetLanguage: state.targetLanguage,
      };

      setState((prev) => {
        const updatedArchives = [
          newDeepDiveEntry,
          ...prev.deepDiveArchives,
        ].slice(0, 20);
        localStorage.setItem(
          "google_seo_deepdive_archives",
          JSON.stringify(updatedArchives)
        );

        // Update task object
        const updatedTasks = prev.taskManager.tasks.map((task) => {
          if (task.id === taskId && task.deepDiveState) {
            return {
              ...task,
              deepDiveState: {
                ...task.deepDiveState,
                isDeepDiving: false,
                currentStrategyReport: report,
                deepDiveProgress: 100,
                deepDiveCurrentStep:
                  state.uiLanguage === "zh"
                    ? "分析完成！"
                    : "Analysis complete!",
              },
            };
          }
          return task;
        });

        // Only update global state if this is the active task
        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            step: "deep-dive-results",
            isDeepDiving: false,
            currentStrategyReport: report,
            deepDiveProgress: 100,
            deepDiveCurrentStep:
              state.uiLanguage === "zh" ? "分析完成！" : "Analysis complete!",
            deepDiveArchives: updatedArchives,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        } else {
          // Background task - only update archives and task object
          return {
            ...prev,
            deepDiveArchives: updatedArchives,
            taskManager: {
              ...prev.taskManager,
              tasks: updatedTasks,
            },
          };
        }
      });

      addLog("Deep dive analysis complete!", "success", taskId);
      playCompletionSound(); // Play sound on deep dive completion
    } catch (e: any) {
      console.error("Enhanced deep dive error:", e);
      addLog(`Deep dive failed: ${e.message}`, "error", taskId);
      setState((prev) => ({
        ...prev,
        isDeepDiving: false,
        error: "Failed to complete deep dive analysis",
        step: "results", // Go back to results page
        deepDiveProgress: 0,
        deepDiveCurrentStep: "",
      }));
    }
  };

  // === Website Generator ===

  const generateWebsite = async (
    strategyReport: SEOStrategyReport,
    targetLanguage: TargetLanguage
  ) => {
    // Check authentication
    if (!authenticated) {
      addLog("❌ 请先登录才能使用网站生成功能", "error");
      setState((prev) => ({ ...prev, error: "请先登录才能使用网站生成功能" }));
      return;
    }

    // ✅ Navigate to independent route using URL hash
    setState((prev) => ({
      ...prev,
      currentStrategyReport: strategyReport,
      targetLanguage: targetLanguage,
      isGeneratingWebsite: true,
      generatedWebsite: null,
      websiteMessages: [
        {
          id: Date.now().toString(),
          role: "system",
          content: "正在初始化项目...",
          timestamp: Date.now(),
        },
      ],
      websiteGenerationProgress: {
        current: 0,
        total: 2,
        currentFile: "准备中...",
      },
    }));

    // Jump to independent website builder route
    window.location.hash = "#/website";

    addLog("🚀 开始生成网站...", "info");
  };

  // Optimize website based on user request
  const optimizeWebsite = async (userRequest: string) => {
    if (!state.generatedWebsite || !userRequest.trim()) return;

    try {
      setState((prev) => ({ ...prev, isOptimizing: true }));

      // Add user message
      const userMessage: WebsiteMessage = {
        id: Date.now().toString(),
        role: "user",
        content: userRequest,
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        websiteMessages: [...prev.websiteMessages, userMessage],
      }));

      // ✅ Send WebsiteData to optimize API
      const response = await fetch("/api/optimize-component", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentData: state.generatedWebsite,
          userRequest,
          chatHistory: state.websiteMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Optimization failed");
      }

      const responseData = await response.json();

      // Add assistant response
      const assistantMessage: WebsiteMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseData.message || "✅ 已根据您的要求优化网站",
        timestamp: Date.now() + 1,
      };

      // ✅ Update with new WebsiteData
      setState((prev) => ({
        ...prev,
        generatedWebsite: responseData.data,
        websiteMessages: [...prev.websiteMessages, assistantMessage],
        isOptimizing: false,
      }));
    } catch (error: any) {
      console.error("[optimizeWebsite] Error:", error);

      const errorMessage: WebsiteMessage = {
        id: (Date.now() + 2).toString(),
        role: "assistant",
        content: `❌ 优化失败: ${error.message}`,
        timestamp: Date.now() + 2,
      };

      setState((prev) => ({
        ...prev,
        websiteMessages: [...prev.websiteMessages, errorMessage],
        isOptimizing: false,
      }));
    }
  };

  // === Workflow Configuration Management ===

  const saveWorkflowConfig = (config: WorkflowConfig) => {
    const updated = [config, ...state.workflowConfigs];
    localStorage.setItem(
      "google_seo_workflow_configs",
      JSON.stringify(updated)
    );
    setState((prev) => ({
      ...prev,
      workflowConfigs: updated,
      currentWorkflowConfigIds: {
        ...prev.currentWorkflowConfigIds,
        [config.workflowId]: config.id,
      },
    }));
    addLog(`Workflow config "${config.name}" saved`, "success");
  };

  const loadWorkflowConfig = (workflowId: string, configId: string) => {
    setState((prev) => ({
      ...prev,
      currentWorkflowConfigIds: {
        ...prev.currentWorkflowConfigIds,
        [workflowId]: configId,
      },
    }));
    addLog("Workflow config loaded", "success");
  };

  const resetWorkflowToDefault = (workflowId: string) => {
    setState((prev) => {
      const updated = { ...prev.currentWorkflowConfigIds };
      delete updated[workflowId];
      return {
        ...prev,
        currentWorkflowConfigIds: updated,
      };
    });
    addLog("Workflow reset to default", "info");
  };

  const getCurrentWorkflowConfig = (
    workflowId: string
  ): WorkflowConfig | null => {
    const configId = state.currentWorkflowConfigIds[workflowId];
    if (!configId) return null;
    return state.workflowConfigs.find((c) => c.id === configId) || null;
  };

  // Get prompt from workflow config or use default
  const getWorkflowPrompt = (
    workflowId: string,
    nodeId: string,
    defaultPrompt: string
  ): string => {
    const config = getCurrentWorkflowConfig(workflowId);
    if (!config) return defaultPrompt;

    const node = config.nodes.find((n) => n.id === nodeId);
    return node?.prompt || defaultPrompt;
  };

  const downloadCSV = () => {
    const headers = [
      "Keyword",
      "Translation",
      "Intent",
      "Volume",
      "Top Type",
      "Probability",
      "Result Count",
      "Reasoning",
    ];
    const rows = state.keywords.map((k) => [
      k.keyword,
      k.translation,
      k.intent,
      k.volume,
      k.topDomainType || "-",
      k.probability || "-",
      k.serpResultCount || "-",
      `"${k.reasoning || ""}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `google_seo_${state.seedKeyword}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Batch translate and analyze handler
  const handleBatchAnalyze = async () => {
    if (!batchInput.trim()) return;

    // Check authentication
    if (!authenticated) {
      setState((prev) => ({ ...prev, error: "请先登录才能使用批量分析功能" }));
      return;
    }

    // Check credits balance before starting
    const requiredCredits = 20; // batch_translation costs 20 credits

    // Check if user has enough credits
    if (!checkCreditsBalance(requiredCredits)) {
      const confirmRecharge = window.confirm(
        state.uiLanguage === "zh"
          ? `余额不足！此操作需要 ${requiredCredits} Credits，您当前剩余 ${
              credits?.remaining || 0
            } Credits。\n\n是否前往主应用充值？`
          : `Insufficient credits! This operation requires ${requiredCredits} Credits, you have ${
              credits?.remaining || 0
            } Credits.\n\nGo to main app to recharge?`
      );

      if (confirmRecharge) {
        window.open(MAIN_APP_URL, "_blank");
      }
      return;
    }

    // Parse keywords for confirmation count
    const keywordList = batchInput
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    if (keywordList.length === 0) {
      setState((prev) => ({
        ...prev,
        error: "No valid keywords provided",
      }));
      return;
    }

    // Consume credits before starting
    try {
      addLog("Consuming credits...", "info");
      await consumeCredits(
        "batch_translation",
        `Batch Translation - ${
          keywordList.length
        } keywords (${state.targetLanguage.toUpperCase()})`
      );
      addLog(
        `✅ Credits consumed successfully. Remaining: ${
          credits?.remaining || 0
        }`,
        "success"
      );
    } catch (error: any) {
      console.error("[Credits] Failed to consume credits:", error);

      if (error.message === "INSUFFICIENT_CREDITS") {
        const confirmRecharge = window.confirm(
          state.uiLanguage === "zh"
            ? "Credits余额不足，是否��往主应用充值？"
            : "Insufficient credits. Go to main app to recharge?"
        );

        if (confirmRecharge) {
          window.open(MAIN_APP_URL, "_blank");
        }
      } else {
        setState((prev) => ({
          ...prev,
          error:
            state.uiLanguage === "zh"
              ? `Credits扣费失败: ${error.message}`
              : `Failed to consume credits: ${error.message}`,
        }));
      }
      return;
    }

    // Auto-create task if no active task exists
    if (!state.taskManager.activeTaskId) {
      addTask({
        type: "batch",
        inputKeywords: batchInput,
        targetLanguage: state.targetLanguage,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      return; // Exit and let user start batch analysis in the new task
    }

    // Capture taskId at the start for isolation
    const currentTaskId = state.taskManager.activeTaskId;

    stopBatchRef.current = false;

    // Initialize batch analysis state
    setState((prev) => ({
      ...prev,
      step: "batch-analyzing",
      batchKeywords: [],
      batchThoughts: [],
      batchCurrentIndex: 0,
      batchTotalCount: keywordList.length,
      batchInputKeywords: batchInput, // Store original input
      logs: [],
      error: null,
    }));

    addLog(
      `Starting batch analysis for ${keywordList.length} keywords...`,
      "info",
      currentTaskId
    );

    // Run batch analysis
    runBatchAnalysis(keywordList, currentTaskId);
  };

  const runBatchAnalysis = async (keywordList: string[], taskId: string) => {
    try {
      // Call batch API (translates all keywords and gets SE Ranking data in ONE request)
      addLog(
        `Calling batch translation and SE Ranking API for ${keywordList.length} keywords...`,
        "api",
        taskId
      );

      const batchResult = await batchTranslateAndAnalyze(
        keywordList.join(", "),
        state.targetLanguage,
        getWorkflowPrompt("batch", "batch-analyze", state.analyzePrompt),
        state.uiLanguage
      );

      if (!batchResult.success) {
        throw new Error("Batch analysis failed");
      }

      addLog(
        `Batch API completed: ${batchResult.total} keywords processed`,
        "success",
        taskId
      );

      // Consume credits based on number of keywords processed
      try {
        addLog(
          "Consuming credits based on keywords processed...",
          "info",
          taskId
        );
        await consumeCredits(
          "batch_translation",
          `Batch Translation - ${
            batchResult.total
          } keywords (${state.targetLanguage.toUpperCase()})`,
          batchResult.total
        );
        addLog(
          `✅ Credits consumed: ${
            Math.ceil(batchResult.total / 10) * 20
          } credits. Remaining: ${credits?.remaining || 0}`,
          "success",
          taskId
        );
      } catch (error: any) {
        console.error("[Credits] Failed to consume credits:", error);
        addLog(
          `⚠️ Warning: Credits consumption failed - ${error.message}`,
          "warning",
          taskId
        );
        // Continue showing results even if credits fail
      }

      // Display results one by one (for UI streaming effect)
      for (let i = 0; i < batchResult.keywords.length; i++) {
        if (stopBatchRef.current) {
          addLog("Batch analysis stopped by user.", "warning", taskId);
          break;
        }

        const result = batchResult.keywords[i];
        const original =
          batchResult.translationResults[i]?.original || `Keyword ${i + 1}`;

        // Update batchCurrentIndex with task isolation
        setState((prev) => {
          const updatedTasks = prev.taskManager.tasks.map((task) => {
            if (task.id === taskId && task.batchState) {
              return {
                ...task,
                batchState: {
                  ...task.batchState,
                  batchCurrentIndex: i + 1,
                },
              };
            }
            return task;
          });

          // Only update global state if this is the active task
          if (taskId === prev.taskManager.activeTaskId) {
            return {
              ...prev,
              batchCurrentIndex: i + 1,
              taskManager: {
                ...prev.taskManager,
                tasks: updatedTasks,
              },
            };
          } else {
            // Background task - only update task object
            return {
              ...prev,
              taskManager: {
                ...prev.taskManager,
                tasks: updatedTasks,
              },
            };
          }
        });

        addLog(
          `[${i + 1}/${batchResult.total}] Processing: "${original}"`,
          "info",
          taskId
        );

        // Show translation thought
        addBatchThought(
          "translation",
          original,
          `Translated to: "${result.keyword}"`,
          { keyword: result.keyword },
          taskId
        );

        // Show SE Ranking thought
        if (result.serankingData) {
          if (result.serankingData.is_data_found) {
            addBatchThought(
              "seranking",
              result.keyword,
              `SE Ranking: Volume=${result.serankingData.volume}, KD=${result.serankingData.difficulty}, CPC=$${result.serankingData.cpc}`,
              { serankingData: result.serankingData },
              taskId
            );
          } else {
            addBatchThought(
              "seranking",
              result.keyword,
              `SE Ranking: No data found (Blue Ocean Signal!)`,
              { serankingData: { is_data_found: false } },
              taskId
            );
          }
        }

        // Show SERP search thought
        if (result.topSerpSnippets && result.topSerpSnippets.length > 0) {
          addBatchThought(
            "serp-search",
            result.keyword,
            `Analyzed top ${result.topSerpSnippets.length} search results from Google`,
            { serpSnippets: result.topSerpSnippets },
            taskId
          );
        }

        // Show intent analysis thought
        if (result.searchIntent && result.intentAnalysis) {
          addBatchThought(
            "intent-analysis",
            result.keyword,
            `Search intent analyzed`,
            {
              intentData: {
                searchIntent: result.searchIntent,
                intentAnalysis: result.intentAnalysis,
              },
            },
            taskId
          );
        }

        // Show final analysis thought
        addBatchThought(
          "analysis",
          result.keyword,
          `Analysis complete: ${result.probability} probability`,
          {
            analysis: {
              probability: result.probability || ProbabilityLevel.LOW,
              topDomainType: result.topDomainType || "Unknown",
              serpResultCount: result.serpResultCount || -1,
              reasoning: result.reasoning || "No reasoning provided",
            },
          },
          taskId
        );

        // Add to state with task isolation
        setState((prev) => {
          const updatedTasks = prev.taskManager.tasks.map((task) => {
            if (task.id === taskId && task.batchState) {
              return {
                ...task,
                batchState: {
                  ...task.batchState,
                  batchKeywords: [...task.batchState.batchKeywords, result],
                },
              };
            }
            return task;
          });

          // Only update global state if this is the active task
          if (taskId === prev.taskManager.activeTaskId) {
            return {
              ...prev,
              batchKeywords: [...prev.batchKeywords, result],
              taskManager: {
                ...prev.taskManager,
                tasks: updatedTasks,
              },
            };
          } else {
            // Background task - only update task object
            return {
              ...prev,
              taskManager: {
                ...prev.taskManager,
                tasks: updatedTasks,
              },
            };
          }
        });

        addLog(
          `Completed: "${original}" → ${result.probability}`,
          "success",
          taskId
        );

        // Small delay for UI streaming effect
        if (i < batchResult.keywords.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }

      // Analysis complete
      addLog(
        `Batch analysis complete! Processed ${batchResult.keywords.length}/${batchResult.total} keywords.`,
        "success",
        taskId
      );
      playCompletionSound();

      // Save to batch archives and update state with task isolation
      setState((prev) => {
        const task = prev.taskManager.tasks.find((t) => t.id === taskId);
        if (!task || !task.batchState) return prev;

        const newArchive: BatchArchiveEntry = {
          id: `batch-${Date.now()}`,
          timestamp: Date.now(),
          inputKeywords: task.batchState.batchInputKeywords,
          keywords: [...task.batchState.batchKeywords],
          targetLanguage: prev.targetLanguage,
          totalCount: task.batchState.batchKeywords.length,
        };

        const updatedArchives = [newArchive, ...prev.batchArchives].slice(
          0,
          50
        );
        localStorage.setItem(
          "google_seo_batch_archives",
          JSON.stringify(updatedArchives)
        );

        // Only update global step if this is the active task
        if (taskId === prev.taskManager.activeTaskId) {
          return {
            ...prev,
            step: "batch-results",
            batchArchives: updatedArchives,
          };
        } else {
          // Background task - just update archives
          return {
            ...prev,
            batchArchives: updatedArchives,
          };
        }
      });
    } catch (error: any) {
      console.error("Batch analysis error:", error);
      addLog(`Batch analysis failed: ${error.message}`, "error", taskId);
      setState((prev) => ({
        ...prev,
        error: `Batch analysis failed: ${error.message}`,
        step: "input",
      }));
    }
  };

  const stopBatchAnalysis = () => {
    stopBatchRef.current = true;
    addLog("Stopping batch analysis...", "warning");
  };

  const downloadBatchCSV = () => {
    const headers = [
      "Original",
      "Translated",
      "Intent",
      "Volume",
      "Top Type",
      "Probability",
      "Result Count",
      "Reasoning",
    ];
    const rows = state.batchKeywords.map((k) => [
      k.translation, // original
      k.keyword, // translated
      k.intent,
      k.volume,
      k.topDomainType || "-",
      k.probability || "-",
      k.serpResultCount || "-",
      `"${k.reasoning || ""}"`,
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `batch_analysis_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getProcessedKeywords = () => {
    let filtered = state.keywords;

    if (state.filterLevel !== "ALL") {
      filtered = filtered.filter((k) => k.probability === state.filterLevel);
    }

    return filtered.sort((a, b) => {
      if (state.sortBy === "volume") return b.volume - a.volume;
      if (state.sortBy === "probability") {
        const map = {
          [ProbabilityLevel.HIGH]: 3,
          [ProbabilityLevel.MEDIUM]: 2,
          [ProbabilityLevel.LOW]: 1,
        };
        return (
          (map[b.probability || "Low"] || 0) -
          (map[a.probability || "Low"] || 0)
        );
      }
      return 0;
    });
  };

  // Determine if we should use dark theme (all pages now use dark theme)
  // Handler for theme toggle
  const handleThemeToggle = () => {
    setIsDarkTheme((prev) => !prev);
    // Persist to localStorage
    localStorage.setItem("theme", !isDarkTheme ? "dark" : "light");
  };

  // ✅ Check if current route is /website (independent page)
  const currentHash = typeof window !== "undefined" ? window.location.hash : "";
  const isWebsiteBuilderRoute = currentHash === "#/website";

  // ✅ If on /website route, render full-screen WebsiteBuilder (no sidebar, no other UI)
  if (isWebsiteBuilderRoute && state.currentStrategyReport) {
    return (
      <div
        className={`h-screen w-screen ${
          isDarkTheme
            ? "bg-[#050505] text-[#e5e5e5]"
            : "bg-gray-50 text-gray-900"
        }`}
      >
        <WebsiteBuilder
          websiteData={state.generatedWebsite}
          messages={state.websiteMessages}
          isOptimizing={state.isOptimizing}
          isGenerating={state.isGeneratingWebsite}
          progress={state.websiteGenerationProgress}
          strategyReport={state.currentStrategyReport}
          targetLanguage={state.targetLanguage}
          onSendMessage={optimizeWebsite}
          onBack={() => {
            window.location.hash = "";
            setState((prev) => ({ ...prev, step: "deep-dive-results" }));
          }}
          onWebsiteGenerated={(data) => {
            setState((prev) => ({
              ...prev,
              generatedWebsite: data,
              isGeneratingWebsite: false,
              websiteGenerationProgress: null,
              websiteMessages: [
                ...prev.websiteMessages,
                {
                  id: Date.now().toString(),
                  role: "assistant",
                  content:
                    "✅ 网站已生成！您可以在右侧预览效果。如需优化，请告诉我您的需求。",
                  timestamp: Date.now(),
                },
              ],
            }));
          }}
          onProgressUpdate={(progress) => {
            setState((prev) => ({
              ...prev,
              websiteGenerationProgress: progress,
              websiteMessages: [
                ...prev.websiteMessages.slice(0, -1),
                {
                  id: Date.now().toString(),
                  role: "system",
                  content: progress.currentFile,
                  timestamp: Date.now(),
                },
              ],
            }));
          }}
          isDarkTheme={isDarkTheme}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        isDarkTheme ? "bg-[#050505] text-[#e5e5e5]" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Sidebar */}
      <Sidebar
        tasks={state.taskManager.tasks}
        activeTaskId={state.taskManager.activeTaskId}
        maxTasks={state.taskManager.maxTasks}
        onTaskSwitch={switchTask}
        onTaskAdd={() => setShowTaskMenu(true)}
        onTaskDelete={deleteTask}
        onWorkflowConfig={() =>
          setState((prev) => ({ ...prev, step: "workflow-config" }))
        }
        onLanguageToggle={() =>
          setState((prev) => ({
            ...prev,
            uiLanguage: prev.uiLanguage === "en" ? "zh" : "en",
          }))
        }
        onThemeToggle={handleThemeToggle}
        uiLanguage={state.uiLanguage}
        step={state.step}
        isDarkTheme={isDarkTheme}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header: Process Indicators & User Info */}
        <header
          className={`h-16 border-b backdrop-blur-md flex items-center justify-between px-8 shrink-0 ${
            isDarkTheme
              ? "border-white/5 bg-[#0a0a0a]/50"
              : "border-gray-200 bg-white/80"
          }`}
        >
          {/* Left: Step Indicators */}
          <div className="flex items-center space-x-8">
            <StepItem
              number={1}
              label={t.step1}
              active={state.step === "input"}
              isDarkTheme={isDarkTheme}
            />
            <ChevronRight
              size={14}
              className={isDarkTheme ? "text-neutral-800" : "text-gray-300"}
            />
            <StepItem
              number={2}
              label={t.step2}
              active={
                state.step === "mining" ||
                state.step === "batch-analyzing" ||
                state.step === "deep-dive-analyzing"
              }
              isDarkTheme={isDarkTheme}
            />
            <ChevronRight
              size={14}
              className={isDarkTheme ? "text-neutral-800" : "text-gray-300"}
            />
            <StepItem
              number={3}
              label={t.step3}
              active={
                state.step === "results" ||
                state.step === "batch-results" ||
                state.step === "deep-dive-results"
              }
              isDarkTheme={isDarkTheme}
            />
          </div>

          {/* Right: Credits + User Info */}
          <div className="flex items-center space-x-6">
            {/* Credits */}
            {(authenticated || (import.meta.env.DEV && credits)) && (
              <div className="flex items-center space-x-3 bg-emerald-500/5 border border-emerald-500/10 px-4 py-2 rounded">
                {creditsLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
                    <span
                      className={`text-[9px] font-black uppercase tracking-widest ${
                        isDarkTheme ? "text-neutral-400" : "text-gray-600"
                      }`}
                    >
                      {state.uiLanguage === "zh" ? "加载中..." : "Loading..."}
                    </span>
                  </>
                ) : credits !== null ? (
                  <>
                    <div className="p-1 bg-emerald-500/10 rounded">
                      <CreditCard size={14} className="text-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-black mono leading-none tracking-tight ${
                          isDarkTheme ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {credits.remaining.toLocaleString()}
                      </span>
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter mt-0.5">
                        {state.uiLanguage === "zh" ? "可用点数" : "Credits"}
                      </span>
                    </div>
                    <div
                      className={`w-[1px] h-6 mx-2 ${
                        isDarkTheme ? "bg-white/10" : "bg-gray-300"
                      }`}
                    />
                    <button
                      className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                        isDarkTheme
                          ? "text-neutral-400 hover:text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      onClick={() => window.open(MAIN_APP_URL, "_blank")}
                    >
                      {state.uiLanguage === "zh" ? "充值" : "Recharge"}
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className={`p-1 rounded ${
                        isDarkTheme ? "bg-white/5" : "bg-gray-100"
                      }`}
                    >
                      <Coins
                        size={14}
                        className={
                          isDarkTheme ? "text-neutral-600" : "text-gray-400"
                        }
                      />
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        isDarkTheme ? "text-neutral-600" : "text-gray-500"
                      }`}
                    >
                      --
                    </span>
                  </>
                )}
              </div>
            )}

            {/* User Profile */}
            {authLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
                <span
                  className={`text-xs font-bold ${
                    isDarkTheme ? "text-neutral-400" : "text-gray-600"
                  }`}
                >
                  {state.uiLanguage === "zh" ? "验证中..." : "Verifying..."}
                </span>
              </div>
            ) : authenticated ? (
              <div
                className={`flex items-center space-x-4 border-l pl-6 ${
                  isDarkTheme ? "border-white/5" : "border-gray-200"
                }`}
              >
                <div className="text-right">
                  <p
                    className={`text-xs font-bold leading-none ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {user?.name || user?.email}
                  </p>
                  <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">
                    {state.uiLanguage === "zh" ? "已登录" : "Logged In"}
                  </p>
                </div>
                {user?.picture && (
                  <img
                    src={user.picture}
                    className={`w-8 h-8 rounded border ${
                      isDarkTheme ? "border-white/10" : "border-gray-200"
                    }`}
                    alt="avatar"
                  />
                )}
                <button
                  onClick={logout}
                  className={`p-2 transition-colors ${
                    isDarkTheme
                      ? "text-neutral-500 hover:text-white"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title={state.uiLanguage === "zh" ? "登出" : "Logout"}
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <User
                  className={`w-4 h-4 ${
                    isDarkTheme ? "text-neutral-500" : "text-gray-500"
                  }`}
                />
                <span
                  className={`text-xs font-bold ${
                    isDarkTheme ? "text-neutral-400" : "text-gray-600"
                  }`}
                >
                  {state.uiLanguage === "zh" ? "未登录" : "Not Logged In"}
                </span>
                <a
                  href={MAIN_APP_URL}
                  className="text-emerald-500 hover:text-emerald-400 text-xs font-bold uppercase tracking-widest transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {state.uiLanguage === "zh" ? "前往主应用" : "Go to Main App"}
                </a>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-grid-40 px-8 py-6">
          {state.error && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center ${
                isDarkTheme
                  ? "bg-red-950/50 border border-red-500/30 text-red-400"
                  : "bg-red-50 border border-red-200 text-red-700"
              }`}
            >
              <AlertCircle className="w-5 h-5 mr-2" />
              {state.error}
            </div>
          )}

          {/* WEBSITE BUILDER PAGE - Now using independent route #/website */}

          {/* STEP 1: INPUT */}
          {state.step === "input" && (
            <div className="max-w-6xl mx-auto mt-8 flex-1 w-full">
              <div className="text-center mb-10">
                <h2
                  className={`text-3xl font-bold mb-4 ${
                    isDarkTheme ? "text-white" : "text-gray-900"
                  }`}
                >
                  {t.inputTitle}
                </h2>
                <p
                  className={`mb-8 ${
                    isDarkTheme ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  {t.inputDesc}
                </p>

                {/* Target Language Selector */}
                <div className="mb-6 flex justify-center">
                  <div
                    className={`flex items-center gap-2 backdrop-blur-sm px-4 py-2 rounded-full border shadow-sm text-sm font-medium ${
                      isDarkTheme
                        ? "bg-black/40 border-green-500/30 text-slate-300"
                        : "bg-white border-green-500/30 text-gray-700"
                    }`}
                  >
                    <Globe className="w-4 h-4 text-green-400" />
                    <span>{t.targetMarket}:</span>
                    <select
                      value={state.targetLanguage}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          targetLanguage: e.target.value as TargetLanguage,
                        }))
                      }
                      className={`outline-none text-green-400 font-bold cursor-pointer border-none ${
                        isDarkTheme ? "bg-black/60" : "bg-white"
                      }`}
                    >
                      {LANGUAGES.map((l) => (
                        <option
                          key={l.code}
                          value={l.code}
                          className={isDarkTheme ? "bg-black" : "bg-white"}
                        >
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center mb-8">
                  <div
                    className={`inline-flex backdrop-blur-sm rounded-lg border shadow-sm p-1 ${
                      isDarkTheme
                        ? "bg-black/40 border-green-500/20"
                        : "bg-white border-green-500/30"
                    }`}
                  >
                    <button
                      onClick={() => setActiveTab("mining")}
                      className={`px-6 py-2.5 rounded-md font-semibold text-sm transition-all ${
                        activeTab === "mining"
                          ? "bg-green-500 text-black shadow-sm"
                          : isDarkTheme
                          ? "text-slate-400 hover:text-green-400"
                          : "text-gray-600 hover:text-green-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4" />
                        {t.tabMining}
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("batch")}
                      className={`px-6 py-2.5 rounded-md font-semibold text-sm transition-all ${
                        activeTab === "batch"
                          ? "bg-green-500 text-black shadow-sm"
                          : isDarkTheme
                          ? "text-slate-400 hover:text-green-400"
                          : "text-gray-600 hover:text-green-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        {t.tabBatch}
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab("deepDive")}
                      className={`px-6 py-2.5 rounded-md font-semibold text-sm transition-all ${
                        activeTab === "deepDive"
                          ? "bg-green-500 text-black shadow-sm"
                          : isDarkTheme
                          ? "text-slate-400 hover:text-green-400"
                          : "text-gray-600 hover:text-green-600"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {t.tabDeepDive}
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mining Tab Content */}
              {activeTab === "mining" && (
                <div className="max-w-3xl mx-auto">
                  {/* Clean Input Design */}
                  <div
                    className={`flex w-full backdrop-blur-sm rounded-lg shadow-lg border overflow-hidden focus-within:ring-2 focus-within:ring-green-500/50 transition-all ${
                      isDarkTheme
                        ? "bg-black/40 border-green-500/30"
                        : "bg-white border-green-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-center pl-4 text-green-400/60">
                      <Search className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      placeholder={t.placeholder}
                      className={`flex-1 p-4 text-lg outline-none bg-transparent placeholder:text-slate-500 ${
                        isDarkTheme ? "text-white" : "text-gray-900"
                      }`}
                      value={state.seedKeyword}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          seedKeyword: e.target.value,
                        }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && startMining(false)}
                    />
                    <button
                      onClick={() => startMining(false)}
                      disabled={!state.seedKeyword.trim()}
                      className="bg-green-500 hover:bg-green-600 text-black px-8 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t.btnStart}
                    </button>
                  </div>

                  {/* Mining Settings Panel */}
                  <div
                    className={`mt-6 backdrop-blur-sm rounded-xl border shadow-sm p-6 ${
                      isDarkTheme
                        ? "bg-black/40 border-green-500/20"
                        : "bg-white border-green-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Settings className="w-4 h-4 text-green-400" />
                      <h4
                        className={`text-sm font-bold ${
                          isDarkTheme ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {state.uiLanguage === "zh"
                          ? "挖词设置"
                          : "Mining Settings"}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Words Per Round */}
                      <div>
                        <label
                          className={`block text-xs font-semibold mb-2 ${
                            isDarkTheme ? "text-slate-400" : "text-gray-600"
                          }`}
                        >
                          {state.uiLanguage === "zh"
                            ? "每轮词语数"
                            : "Words Per Round"}
                        </label>
                        <input
                          type="number"
                          min="5"
                          max="20"
                          value={state.wordsPerRound}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              wordsPerRound: Math.max(
                                5,
                                Math.min(20, parseInt(e.target.value) || 10)
                              ),
                            }))
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-green-500/50 outline-none ${
                            isDarkTheme
                              ? "border-green-500/30 bg-black/60 text-white"
                              : "border-green-500/30 bg-white text-gray-900"
                          }`}
                        />
                        <p
                          className={`text-xs mt-1 ${
                            isDarkTheme ? "text-slate-500" : "text-gray-500"
                          }`}
                        >
                          {state.uiLanguage === "zh"
                            ? "范围: 5-20"
                            : "Range: 5-20"}
                        </p>
                      </div>

                      {/* Mining Strategy */}
                      <div>
                        <label
                          className={`block text-xs font-semibold mb-2 ${
                            isDarkTheme ? "text-slate-400" : "text-gray-600"
                          }`}
                        >
                          {state.uiLanguage === "zh"
                            ? "挖词策略"
                            : "Mining Strategy"}
                        </label>
                        <select
                          value={state.miningStrategy}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              miningStrategy: e.target.value as
                                | "horizontal"
                                | "vertical",
                            }))
                          }
                          className={`w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-green-500/50 outline-none cursor-pointer ${
                            isDarkTheme
                              ? "border-green-500/30 bg-black/60 text-white"
                              : "border-green-500/30 bg-white text-gray-900"
                          }`}
                        >
                          <option
                            value="horizontal"
                            className={isDarkTheme ? "bg-black" : "bg-white"}
                          >
                            {state.uiLanguage === "zh"
                              ? "🌐 横向挖词 (广泛主题)"
                              : "🌐 Horizontal (Broad Topics)"}
                          </option>
                          <option
                            value="vertical"
                            className={isDarkTheme ? "bg-black" : "bg-white"}
                          >
                            {state.uiLanguage === "zh"
                              ? "🎯 纵向挖词 (深度挖掘)"
                              : "🎯 Vertical (Deep Dive)"}
                          </option>
                        </select>
                        <p
                          className={`text-xs mt-1 ${
                            isDarkTheme ? "text-slate-500" : "text-gray-500"
                          }`}
                        >
                          {state.miningStrategy === "horizontal"
                            ? state.uiLanguage === "zh"
                              ? "探索不同的平行主题"
                              : "Explore different parallel topics"
                            : state.uiLanguage === "zh"
                            ? "深入挖掘同一主题"
                            : "Deep dive into same topic"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mining Archive List */}
                  {state.archives.length > 0 && (
                    <div className="mt-12">
                      <h3
                        className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                          isDarkTheme ? "text-slate-400" : "text-gray-600"
                        }`}
                      >
                        <History className="w-4 h-4" /> {t.miningArchives}
                      </h3>
                      <div
                        className={`backdrop-blur-sm rounded-xl border shadow-sm overflow-hidden ${
                          isDarkTheme
                            ? "bg-black/40 border-green-500/20"
                            : "bg-white border-green-200"
                        }`}
                      >
                        <div
                          className={`divide-y max-h-96 overflow-y-auto custom-scrollbar ${
                            isDarkTheme
                              ? "divide-green-500/10"
                              : "divide-gray-200"
                          }`}
                        >
                          {state.archives.map((arch) => (
                            <div
                              key={arch.id}
                              onClick={() => loadArchive(arch)}
                              className={`p-4 flex items-center justify-between cursor-pointer group transition-colors ${
                                isDarkTheme
                                  ? "hover:bg-green-500/10"
                                  : "hover:bg-green-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded text-green-400 transition-colors ${
                                    isDarkTheme
                                      ? "bg-green-500/20 group-hover:bg-green-500/30"
                                      : "bg-green-100 group-hover:bg-green-200"
                                  }`}
                                >
                                  <Search className="w-4 h-4" />
                                </div>
                                <div>
                                  <div
                                    className={`font-medium flex items-center gap-2 ${
                                      isDarkTheme
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {arch.seedKeyword}
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded border uppercase ${
                                        isDarkTheme
                                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                                          : "bg-green-100 text-green-700 border-green-300"
                                      }`}
                                    >
                                      {arch.targetLanguage}
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      isDarkTheme
                                        ? "text-slate-500"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {new Date(arch.timestamp).toLocaleString()}{" "}
                                    • {arch.keywords.length} keywords
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => deleteArchive(arch.id, e)}
                                className={`p-2 transition-colors ${
                                  isDarkTheme
                                    ? "text-slate-600 hover:text-red-400"
                                    : "text-gray-500 hover:text-red-600"
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Batch Translation Tab Content */}
              {activeTab === "batch" && (
                <div className="max-w-3xl mx-auto">
                  <div
                    className={`backdrop-blur-sm rounded-xl border shadow-sm p-6 ${
                      isDarkTheme
                        ? "bg-black/40 border-green-500/20"
                        : "bg-white border-green-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Languages className="w-5 h-5 text-green-400" />
                      <h3
                        className={`text-lg font-bold ${
                          isDarkTheme ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {t.batchTranslateTitle}
                      </h3>
                    </div>
                    <p
                      className={`text-sm mb-4 ${
                        isDarkTheme ? "text-slate-400" : "text-gray-600"
                      }`}
                    >
                      {t.batchTranslateDesc}
                    </p>

                    <div className="space-y-4">
                      {/* Batch Input */}
                      <div>
                        <textarea
                          value={batchInput}
                          onChange={(e) => setBatchInput(e.target.value)}
                          placeholder={t.batchInputPlaceholder}
                          className={`w-full h-32 px-4 py-3 border rounded-lg text-sm outline-none focus:ring-2 resize-none ${
                            isDarkTheme
                              ? "border-green-500/30 bg-black/60 focus:ring-green-500/50 text-white placeholder:text-slate-500"
                              : "border-green-300 bg-white focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                          }`}
                        />
                      </div>

                      {/* Batch Analyze Button */}
                      <button
                        onClick={handleBatchAnalyze}
                        disabled={!batchInput.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Search className="w-5 h-5" />
                        {t.btnBatchAnalyze}
                      </button>
                    </div>
                  </div>

                  {/* Batch Archive List */}
                  {state.batchArchives.length > 0 && (
                    <div className="mt-12">
                      <h3
                        className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                          isDarkTheme ? "text-slate-400" : "text-gray-600"
                        }`}
                      >
                        <History className="w-4 h-4" /> {t.batchArchives}
                      </h3>
                      <div
                        className={`backdrop-blur-sm rounded-xl border shadow-sm overflow-hidden ${
                          isDarkTheme
                            ? "bg-black/40 border-green-500/20"
                            : "bg-white border-green-200"
                        }`}
                      >
                        <div
                          className={`divide-y max-h-96 overflow-y-auto custom-scrollbar ${
                            isDarkTheme
                              ? "divide-green-500/10"
                              : "divide-gray-200"
                          }`}
                        >
                          {state.batchArchives.map((arch) => (
                            <div
                              key={arch.id}
                              onClick={() => loadBatchArchive(arch)}
                              className={`p-4 flex items-center justify-between cursor-pointer group transition-colors ${
                                isDarkTheme
                                  ? "hover:bg-green-500/10"
                                  : "hover:bg-green-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded text-green-400 transition-colors ${
                                    isDarkTheme
                                      ? "bg-green-500/20 group-hover:bg-green-500/30"
                                      : "bg-green-100 group-hover:bg-green-200"
                                  }`}
                                >
                                  <Languages className="w-4 h-4" />
                                </div>
                                <div>
                                  <div
                                    className={`font-medium flex items-center gap-2 ${
                                      isDarkTheme
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {arch.inputKeywords
                                      .split(",")
                                      .slice(0, 3)
                                      .join(", ")}
                                    {arch.inputKeywords.split(",").length > 3 &&
                                      "..."}
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${
                                        isDarkTheme
                                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                                          : "bg-green-100 text-green-700 border-green-300"
                                      }`}
                                    >
                                      {arch.targetLanguage}
                                    </span>
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      isDarkTheme
                                        ? "text-slate-500"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {new Date(arch.timestamp).toLocaleString()}{" "}
                                    • {arch.totalCount} keywords
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => deleteBatchArchive(arch.id, e)}
                                className={`p-2 transition-colors ${
                                  isDarkTheme
                                    ? "text-slate-600 hover:text-red-400"
                                    : "text-gray-500 hover:text-red-600"
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Deep Dive Tab Content */}
              {activeTab === "deepDive" && (
                <div className="max-w-3xl mx-auto">
                  <div
                    className={`backdrop-blur-sm rounded-xl border shadow-sm p-6 ${
                      isDarkTheme
                        ? "bg-black/40 border-green-500/20"
                        : "bg-white border-green-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-5 h-5 text-green-400" />
                      <h3
                        className={`text-lg font-bold ${
                          isDarkTheme ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {t.deepDiveTitle}
                      </h3>
                    </div>
                    <p
                      className={`text-sm mb-4 ${
                        isDarkTheme ? "text-slate-400" : "text-gray-600"
                      }`}
                    >
                      {t.deepDiveDesc}
                    </p>

                    <div className="space-y-4">
                      {/* Deep Dive Input */}
                      <div>
                        <input
                          type="text"
                          value={deepDiveInput}
                          onChange={(e) => setDeepDiveInput(e.target.value)}
                          placeholder={t.deepDiveInputPlaceholder}
                          className={`w-full px-4 py-3 border rounded-lg text-sm outline-none focus:ring-2 ${
                            isDarkTheme
                              ? "border-green-500/30 bg-black/60 focus:ring-green-500/50 text-white placeholder:text-slate-500"
                              : "border-green-300 bg-white focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && deepDiveInput.trim()) {
                              const keywordData: KeywordData = {
                                id: `dd-${Date.now()}`,
                                keyword: deepDiveInput.trim(),
                                intent: IntentType.INFORMATIONAL,
                                volume: 0,
                              };
                              handleDeepDive(keywordData);
                            }
                          }}
                        />
                      </div>

                      {/* Deep Dive Button */}
                      <button
                        onClick={() => {
                          if (deepDiveInput.trim()) {
                            const keywordData: KeywordData = {
                              id: `dd-${Date.now()}`,
                              keyword: deepDiveInput.trim(),
                              intent: IntentType.INFORMATIONAL,
                              volume: 0,
                            };
                            handleDeepDive(keywordData);
                          }
                        }}
                        disabled={!deepDiveInput.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FileText className="w-5 h-5" />
                        {t.btnDeepDive}
                      </button>
                    </div>
                  </div>

                  {/* Deep Dive Archive List */}
                  {state.deepDiveArchives &&
                    state.deepDiveArchives.length > 0 && (
                      <div className="mt-12">
                        <h3
                          className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${
                            isDarkTheme ? "text-slate-400" : "text-gray-600"
                          }`}
                        >
                          <History className="w-4 h-4" /> {t.deepDiveArchives}
                        </h3>
                        <div
                          className={`backdrop-blur-sm rounded-xl border shadow-sm overflow-hidden ${
                            isDarkTheme
                              ? "bg-black/40 border-green-500/20"
                              : "bg-white border-green-200"
                          }`}
                        >
                          <div
                            className={`divide-y max-h-96 overflow-y-auto custom-scrollbar ${
                              isDarkTheme
                                ? "divide-green-500/10"
                                : "divide-gray-200"
                            }`}
                          >
                            {state.deepDiveArchives.map((arch) => (
                              <div
                                key={arch.id}
                                onClick={() => loadDeepDiveArchive(arch)}
                                className={`p-4 flex items-center justify-between cursor-pointer group transition-colors ${
                                  isDarkTheme
                                    ? "hover:bg-green-500/10"
                                    : "hover:bg-green-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`p-2 rounded text-green-400 transition-colors ${
                                      isDarkTheme
                                        ? "bg-green-500/20 group-hover:bg-green-500/30"
                                        : "bg-green-100 group-hover:bg-green-200"
                                    }`}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div
                                      className={`font-medium ${
                                        isDarkTheme
                                          ? "text-white"
                                          : "text-gray-900"
                                      }`}
                                    >
                                      {arch.keyword}
                                    </div>
                                    <div
                                      className={`text-xs ${
                                        isDarkTheme
                                          ? "text-slate-500"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {new Date(
                                        arch.timestamp
                                      ).toLocaleString()}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) =>
                                    deleteDeepDiveArchive(arch.id, e)
                                  }
                                  className={`p-2 transition-colors ${
                                    isDarkTheme
                                      ? "text-slate-600 hover:text-red-400"
                                      : "text-gray-500 hover:text-red-600"
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* Prompt Config (Collapsible) */}
              <div
                className={`mt-12 border rounded-xl backdrop-blur-sm shadow-sm overflow-hidden max-w-2xl mx-auto ${
                  isDarkTheme
                    ? "border-green-500/20 bg-black/40"
                    : "border-green-200 bg-white"
                }`}
              >
                <button
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      showPrompts: !prev.showPrompts,
                    }))
                  }
                  className={`w-full flex items-center justify-between p-4 transition-colors font-medium ${
                    isDarkTheme
                      ? "bg-green-500/10 hover:bg-green-500/20 text-white"
                      : "bg-green-50 hover:bg-green-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-green-400" />
                    {t.configPrompts}
                  </div>
                  <div
                    className={`transform transition-transform ${
                      state.showPrompts ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 text-green-400" />
                  </div>
                </button>

                {state.showPrompts && (
                  <div className="p-6 space-y-6">
                    {/* Translation Toggle */}
                    <div className="flex items-center justify-end">
                      <button
                        onClick={togglePromptTranslation}
                        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                          state.showPromptTranslation
                            ? isDarkTheme
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-green-100 text-green-700 border-green-300"
                            : isDarkTheme
                            ? "bg-black/60 text-slate-400 border-green-500/20"
                            : "bg-gray-100 text-gray-600 border-green-200"
                        }`}
                      >
                        <Languages className="w-3 h-3" />
                        {t.showTransRef}
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label
                          className={`text-sm font-semibold ${
                            isDarkTheme ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {t.promptGenLabel}
                        </label>
                        <button
                          onClick={() => handleTranslatePrompt("gen")}
                          className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" />{" "}
                          {t.btnTranslatePrompt}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <textarea
                          className={`w-full h-32 p-3 border rounded-md text-sm font-mono focus:ring-2 outline-none ${
                            isDarkTheme
                              ? "border-green-500/30 bg-black/60 focus:ring-green-500/50 text-white placeholder:text-slate-500"
                              : "border-green-300 bg-white focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                          }`}
                          value={state.genPrompt}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              genPrompt: e.target.value,
                            }))
                          }
                        />
                        {state.showPromptTranslation && (
                          <div
                            className={`w-full h-32 p-3 border rounded-md text-sm overflow-y-auto ${
                              isDarkTheme
                                ? "bg-black/60 border-green-500/30 text-slate-300"
                                : "bg-gray-50 border-green-200 text-gray-700"
                            }`}
                          >
                            <div
                              className={`text-[10px] uppercase font-bold mb-1 ${
                                isDarkTheme
                                  ? "text-green-400"
                                  : "text-green-600"
                              }`}
                            >
                              {t.transRefLabel}
                            </div>
                            {state.translatedGenPrompt ? (
                              state.translatedGenPrompt
                            ) : (
                              <div
                                className={`animate-pulse ${
                                  isDarkTheme
                                    ? "text-slate-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Translating...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label
                          className={`text-sm font-semibold ${
                            isDarkTheme ? "text-white" : "text-gray-900"
                          }`}
                        >
                          {t.promptAnlzLabel}
                        </label>
                        <button
                          onClick={() => handleTranslatePrompt("analyze")}
                          className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" />{" "}
                          {t.btnTranslatePrompt}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <textarea
                          className={`w-full h-32 p-3 border rounded-md text-sm font-mono focus:ring-2 outline-none ${
                            isDarkTheme
                              ? "border-green-500/30 bg-black/60 focus:ring-green-500/50 text-white placeholder:text-slate-500"
                              : "border-green-300 bg-white focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                          }`}
                          value={state.analyzePrompt}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              analyzePrompt: e.target.value,
                            }))
                          }
                        />
                        {state.showPromptTranslation && (
                          <div
                            className={`w-full h-32 p-3 border rounded-md text-sm overflow-y-auto ${
                              isDarkTheme
                                ? "bg-black/60 border-green-500/30 text-slate-300"
                                : "bg-gray-50 border-green-200 text-gray-700"
                            }`}
                          >
                            <div
                              className={`text-[10px] uppercase font-bold mb-1 ${
                                isDarkTheme
                                  ? "text-green-400"
                                  : "text-green-600"
                              }`}
                            >
                              {t.transRefLabel}
                            </div>
                            {state.translatedAnalyzePrompt ? (
                              state.translatedAnalyzePrompt
                            ) : (
                              <div
                                className={`animate-pulse ${
                                  isDarkTheme
                                    ? "text-slate-500"
                                    : "text-gray-500"
                                }`}
                              >
                                Translating...
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Agent Config Archive Section */}
                    <div className="border-t border-slate-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-purple-500" />
                          {t.agentConfigs}
                        </h4>
                        <button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              step: "workflow-config",
                            }))
                          }
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
                        >
                          <Settings className="w-3 h-3" />
                          {state.uiLanguage === "zh" ? "高级配置" : "Advanced"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 bg-blue-50 border border-blue-100 rounded p-2">
                        {state.uiLanguage === "zh"
                          ? "💡 这些配置同时保存在 Workflow 配置页面中，两者共通。"
                          : "💡 These configs are shared with the Workflow Configuration page."}
                      </p>

                      {/* Save New Config */}
                      <div className="flex gap-2 mb-4">
                        <input
                          type="text"
                          id="configNameInput"
                          placeholder={t.enterConfigName}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const input = e.target as HTMLInputElement;
                              saveAgentConfig(input.value);
                              input.value = "";
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            const input = document.getElementById(
                              "configNameInput"
                            ) as HTMLInputElement;
                            saveAgentConfig(input?.value || "");
                            if (input) input.value = "";
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                        >
                          <Save className="w-4 h-4" />
                          {t.saveConfig}
                        </button>
                      </div>

                      {/* Config List */}
                      {state.workflowConfigs.filter(
                        (c) => c.workflowId === "mining"
                      ).length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {state.workflowConfigs
                            .filter((c) => c.workflowId === "mining")
                            .map((cfg) => (
                              <div
                                key={cfg.id}
                                className={`p-3 rounded-lg border flex items-center justify-between group transition-colors ${
                                  state.currentConfigId === cfg.id
                                    ? "bg-purple-50 border-purple-200"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                                    {cfg.name}
                                    <span className="text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                      MINING
                                    </span>
                                    {state.currentConfigId === cfg.id && (
                                      <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-bold">
                                        ACTIVE
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {new Date(cfg.updatedAt).toLocaleString()}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {state.currentConfigId === cfg.id ? (
                                    <button
                                      onClick={() => updateAgentConfig(cfg.id)}
                                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors font-medium"
                                    >
                                      {t.updateConfig}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => loadAgentConfig(cfg)}
                                      className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors font-medium"
                                    >
                                      {t.loadConfig}
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) =>
                                      deleteAgentConfig(cfg.id, e)
                                    }
                                    className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div
                          className={`text-sm text-center py-4 rounded-lg border border-dashed ${
                            isDarkTheme
                              ? "text-slate-400 bg-slate-50 border-slate-200"
                              : "text-gray-600 bg-gray-50 border-gray-200"
                          }`}
                        >
                          {t.noConfigs}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* WORKFLOW CONFIGURATION PAGE */}
          {state.step === "workflow-config" && (
            <div className="max-w-7xl mx-auto mt-8 flex-1 w-full">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="bg-green-500 p-3 rounded-lg">
                    <BrainCircuit className="w-8 h-8 text-black" />
                  </div>
                  <h2
                    className={`text-3xl font-bold ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {t.workflowConfig}
                  </h2>
                </div>
                <p
                  className={`mb-4 ${
                    isDarkTheme ? "text-slate-400" : "text-gray-600"
                  }`}
                >
                  {t.workflowConfigDesc}
                </p>
                <button
                  onClick={() =>
                    setState((prev) => ({ ...prev, step: "input" }))
                  }
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                    isDarkTheme
                      ? "text-slate-400 hover:text-green-400"
                      : "text-gray-600 hover:text-green-600"
                  }`}
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  {state.uiLanguage === "en" ? "Back to Home" : "返回首页"}
                </button>
              </div>

              <div className="space-y-8">
                {/* Mining Workflow */}
                <div
                  className={`backdrop-blur-sm rounded-xl shadow-sm border p-6 ${
                    isDarkTheme
                      ? "bg-black/40 border-green-500/20"
                      : "bg-white border-green-200"
                  }`}
                >
                  <h3
                    className={`text-xl font-bold mb-2 flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Search className="w-5 h-5 text-green-400" />
                    {t.miningWorkflow}
                  </h3>
                  <p
                    className={`text-sm mb-6 ${
                      isDarkTheme ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {MINING_WORKFLOW.description}
                  </p>
                  <WorkflowConfigPanel
                    workflowDef={MINING_WORKFLOW}
                    currentConfig={getCurrentWorkflowConfig("mining")}
                    allConfigs={state.workflowConfigs}
                    onSave={saveWorkflowConfig}
                    onLoad={(configId) =>
                      loadWorkflowConfig("mining", configId)
                    }
                    onReset={() => resetWorkflowToDefault("mining")}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>

                {/* Batch Workflow */}
                <div
                  className={`backdrop-blur-sm rounded-xl shadow-sm border p-6 ${
                    isDarkTheme
                      ? "bg-black/40 border-green-500/20"
                      : "bg-white border-green-200"
                  }`}
                >
                  <h3
                    className={`text-xl font-bold mb-2 flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Languages className="w-5 h-5 text-green-400" />
                    {t.batchWorkflow}
                  </h3>
                  <p
                    className={`text-sm mb-6 ${
                      isDarkTheme ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {BATCH_WORKFLOW.description}
                  </p>
                  <WorkflowConfigPanel
                    workflowDef={BATCH_WORKFLOW}
                    currentConfig={getCurrentWorkflowConfig("batch")}
                    allConfigs={state.workflowConfigs}
                    onSave={saveWorkflowConfig}
                    onLoad={(configId) => loadWorkflowConfig("batch", configId)}
                    onReset={() => resetWorkflowToDefault("batch")}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>

                {/* Deep Dive Workflow */}
                <div
                  className={`backdrop-blur-sm rounded-xl shadow-sm border p-6 ${
                    isDarkTheme
                      ? "bg-black/40 border-green-500/20"
                      : "bg-white border-green-200"
                  }`}
                >
                  <h3
                    className={`text-xl font-bold mb-2 flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Lightbulb className="w-5 h-5 text-green-400" />
                    {t.deepDiveWorkflow}
                  </h3>
                  <p
                    className={`text-sm mb-6 ${
                      isDarkTheme ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {DEEP_DIVE_WORKFLOW.description}
                  </p>
                  <WorkflowConfigPanel
                    workflowDef={DEEP_DIVE_WORKFLOW}
                    currentConfig={getCurrentWorkflowConfig("deepDive")}
                    allConfigs={state.workflowConfigs}
                    onSave={saveWorkflowConfig}
                    onLoad={(configId) =>
                      loadWorkflowConfig("deepDive", configId)
                    }
                    onReset={() => resetWorkflowToDefault("deepDive")}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MINING */}
          {state.step === "mining" && (
            <div className="flex-1 flex flex-col h-[calc(100vh-200px)] min-h-[500px] relative">
              {/* SUCCESS OVERLAY */}
              {state.miningSuccess && (
                <div className="absolute inset-0 z-10 bg-black/90 backdrop-blur-sm rounded-xl flex items-start justify-center p-4 pt-8 animate-fade-in overflow-y-auto">
                  <div className="bg-black/80 backdrop-blur-sm rounded-xl shadow-2xl border border-green-500/30 p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {t.miningSuccessTitle}
                    </h3>
                    <p className="text-slate-400 mb-6">{t.miningSuccessDesc}</p>

                    <div className="bg-black/60 rounded-lg p-4 mb-6 border border-green-500/20">
                      <div className="text-3xl font-bold text-white">
                        {
                          state.keywords.filter(
                            (k) => k.probability === ProbabilityLevel.HIGH
                          ).length
                        }
                      </div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">
                        {t.foundCount}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={goToResults}
                        className="w-full py-3 bg-green-500 text-black rounded-lg hover:bg-green-600 transition-colors font-bold shadow-lg shadow-green-500/20"
                      >
                        {t.viewResults}
                      </button>
                      <button
                        onClick={continueMining}
                        className="w-full py-3 bg-black/60 text-white border border-green-500/30 rounded-lg hover:bg-green-500/10 transition-colors font-medium"
                      >
                        {t.btnExpand}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Loader2
                    className={`w-6 h-6 text-green-400 ${
                      !state.miningSuccess && "animate-spin"
                    }`}
                  />
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {t.generating}
                      <span className="text-sm font-normal bg-green-500/20 px-2 py-0.5 rounded-full text-green-400">
                        Round {state.miningRound}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-400">{t.analyzing}</p>
                  </div>
                </div>
                {!state.miningSuccess && (
                  <button
                    onClick={handleStop}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-md transition-colors text-sm font-medium shadow-sm ${
                      isDarkTheme
                        ? "bg-black/60 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        : "bg-white border-red-300 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    <Square className="w-4 h-4 fill-current" />
                    {t.btnStop}
                  </button>
                )}
              </div>

              {/* Mining Control Panel */}
              {!state.miningSuccess && (
                <div
                  className={`mb-4 backdrop-blur-sm rounded-xl shadow-sm border p-4 ${
                    isDarkTheme
                      ? "bg-black/40 border-green-500/20"
                      : "bg-white border-green-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-green-400" />
                    <h4
                      className={`text-sm font-bold ${
                        isDarkTheme ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {t.miningSettings}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Words Per Round */}
                    <div>
                      <label
                        className={`block text-xs font-medium mb-2 ${
                          isDarkTheme ? "text-slate-400" : "text-gray-600"
                        }`}
                      >
                        {t.wordsPerRound}
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="20"
                        value={state.wordsPerRound}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            wordsPerRound: Math.max(
                              5,
                              Math.min(20, parseInt(e.target.value) || 10)
                            ),
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                          isDarkTheme
                            ? "border-green-500/30 bg-black/60 focus:ring-green-500/50 text-white"
                            : "border-green-300 bg-white focus:ring-green-500 text-gray-900"
                        }`}
                      />
                      <p
                        className={`text-xs mt-1 ${
                          isDarkTheme ? "text-slate-500" : "text-gray-500"
                        }`}
                      >
                        {t.applyNextRound}
                      </p>
                    </div>

                    {/* Mining Strategy */}
                    <div>
                      <label
                        className={`block text-xs font-medium mb-2 ${
                          isDarkTheme ? "text-slate-400" : "text-gray-600"
                        }`}
                      >
                        {t.miningStrategy}
                      </label>
                      <select
                        value={state.miningStrategy}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            miningStrategy: e.target.value as
                              | "horizontal"
                              | "vertical",
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                          isDarkTheme
                            ? "border-green-500/30 bg-black/60 focus:ring-green-500/50 text-white"
                            : "border-green-300 bg-white focus:ring-green-500 text-gray-900"
                        }`}
                      >
                        <option
                          value="horizontal"
                          className={isDarkTheme ? "bg-black" : "bg-white"}
                        >
                          {t.horizontal}
                        </option>
                        <option
                          value="vertical"
                          className={isDarkTheme ? "bg-black" : "bg-white"}
                        >
                          {t.vertical}
                        </option>
                      </select>
                      <p
                        className={`text-xs mt-1 ${
                          isDarkTheme ? "text-slate-500" : "text-gray-500"
                        }`}
                      >
                        {t.applyNextRound}
                      </p>
                    </div>

                    {/* User Suggestion */}
                    <div className="md:col-span-1">
                      <label
                        className={`block text-xs font-medium mb-2 ${
                          isDarkTheme ? "text-slate-400" : "text-gray-600"
                        }`}
                      >
                        {t.userSuggestion}
                      </label>
                      <input
                        type="text"
                        value={state.userSuggestion}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            userSuggestion: e.target.value,
                          }))
                        }
                        placeholder={t.suggestionPlaceholder}
                        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${
                          isDarkTheme
                            ? "border-green-500/30 bg-black/60 focus:ring-green-500/50 text-white placeholder:text-slate-500"
                            : "border-green-300 bg-white focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-xs mt-1 ${
                          isDarkTheme ? "text-slate-500" : "text-gray-500"
                        }`}
                      >
                        {t.applyNextRound}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
                <div className="w-full md:w-1/3 h-full">
                  <TerminalLog logs={state.logs} isDarkTheme={isDarkTheme} />
                </div>
                <div className="w-full md:w-2/3 h-full">
                  <AgentStream
                    thoughts={state.agentThoughts}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>
              </div>
            </div>
          )}

          {/* BATCH ANALYZING PAGE */}
          {state.step === "batch-analyzing" && (
            <div className="flex-1 flex flex-col h-[calc(100vh-200px)] min-h-[500px] relative">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {t.batchAnalyzing}
                      <span className="text-sm font-normal bg-green-500/20 px-2 py-0.5 rounded-full text-green-400">
                        {state.batchCurrentIndex} / {state.batchTotalCount}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-400">
                      Translating and analyzing keywords...
                    </p>
                  </div>
                </div>
                <button
                  onClick={stopBatchAnalysis}
                  className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-md transition-colors text-sm font-medium shadow-sm"
                >
                  <Square className="w-4 h-4 fill-current" />
                  {t.btnStop}
                </button>
              </div>

              <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
                <div className="w-full md:w-1/3 h-full">
                  <TerminalLog logs={state.logs} isDarkTheme={isDarkTheme} />
                </div>
                <div className="w-full md:w-2/3 h-full">
                  <BatchAnalysisStream
                    thoughts={state.batchThoughts}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>
              </div>
            </div>
          )}

          {/* BATCH RESULTS PAGE */}
          {state.step === "batch-results" && (
            <div className="animate-fade-in flex-1">
              <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                <div>
                  <h2
                    className={`text-2xl font-bold flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Languages className="w-6 h-6 text-green-400" />
                    {t.batchResultsTitle}
                  </h2>
                  <p
                    className={`mt-1 ${
                      isDarkTheme ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {t.foundOpp} {state.batchKeywords.length} {t.opps}.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={downloadBatchCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    {t.downloadCSV}
                  </button>
                  <button
                    onClick={reset}
                    className={`px-4 py-2 text-sm font-medium transition-colors border rounded-md ${
                      isDarkTheme
                        ? "text-slate-400 hover:text-green-400 border-green-500/30 bg-black/60 hover:bg-green-500/10"
                        : "text-gray-700 hover:text-green-600 border-green-300 bg-white hover:bg-green-50"
                    }`}
                  >
                    {t.newAnalysis}
                  </button>
                </div>
              </div>

              {/* Batch Results Table */}
              <div
                className={`backdrop-blur-sm rounded-xl shadow-sm border overflow-hidden min-h-[400px] ${
                  isDarkTheme
                    ? "bg-black/40 border-green-500/20"
                    : "bg-white border-green-200"
                }`}
              >
                <div className="overflow-x-auto custom-scrollbar">
                  <table
                    className={`w-full text-left text-sm ${
                      isDarkTheme ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    <thead
                      className={`text-xs uppercase font-semibold border-b ${
                        isDarkTheme
                          ? "bg-black/60 text-slate-400 border-green-500/20"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <tr>
                        <th className="px-4 py-4 w-10"></th>
                        <th className="px-4 py-4">{t.originalKeyword}</th>
                        <th className="px-4 py-4">{t.translatedKeyword}</th>
                        <th className="px-4 py-4">{t.colType}</th>
                        <th className="px-4 py-4 text-center">{t.colProb}</th>
                        <th className="px-4 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-500/10">
                      {state.batchKeywords.map((item) => {
                        const isExpanded = state.expandedRowId === item.id;

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              className={`transition-colors ${
                                isExpanded
                                  ? "bg-green-500/10"
                                  : "hover:bg-green-500/5"
                              }`}
                            >
                              <td
                                className="px-4 py-4 text-center cursor-pointer"
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    expandedRowId: isExpanded ? null : item.id,
                                  }))
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-green-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-green-400" />
                                )}
                              </td>
                              <td
                                className="px-4 py-4 text-slate-300 cursor-pointer"
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    expandedRowId: isExpanded ? null : item.id,
                                  }))
                                }
                              >
                                {item.translation}
                              </td>
                              <td
                                className="px-4 py-4 font-medium text-white cursor-pointer"
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    expandedRowId: isExpanded ? null : item.id,
                                  }))
                                }
                              >
                                {item.keyword}
                              </td>
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                  {item.topDomainType || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    item.probability === ProbabilityLevel.HIGH
                                      ? "bg-green-500/30 text-green-400 border-green-500/50"
                                      : item.probability ===
                                        ProbabilityLevel.MEDIUM
                                      ? "bg-yellow-500/30 text-yellow-400 border-yellow-500/50"
                                      : "bg-red-500/30 text-red-400 border-red-500/50"
                                  }`}
                                >
                                  {item.probability}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(
                                      item.keyword
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-xs font-medium border border-green-500/30"
                                    title={t.verifyBtn}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {t.verifyBtn}
                                  </a>

                                  <button
                                    className="text-slate-400 hover:text-green-400 text-xs flex items-center gap-1"
                                    onClick={() =>
                                      setState((prev) => ({
                                        ...prev,
                                        expandedRowId: isExpanded
                                          ? null
                                          : item.id,
                                      }))
                                    }
                                  >
                                    Details
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeepDive(item);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-xs font-medium"
                                    title={t.deepDive}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {t.deepDive}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Detail View */}
                            {isExpanded && (
                              <tr
                                className={`animate-fade-in border-b ${
                                  isDarkTheme
                                    ? "bg-slate-50/80 border-slate-100"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <td colSpan={6} className="px-4 py-4">
                                  <div className="flex flex-col md:flex-row gap-6 px-4">
                                    <div className="flex-1 space-y-2">
                                      {/* SE Ranking Data Section */}
                                      {item.serankingData &&
                                        item.serankingData.is_data_found && (
                                          <div className="mb-3">
                                            <h4 className="text-xs font-bold uppercase text-blue-600 mb-2 flex items-center gap-1">
                                              <TrendingUp className="w-3 h-3" />
                                              SEO词研究工具 (SE Ranking Data)
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                              {/* Search Volume */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  SEARCH VOLUME
                                                </div>
                                                <div className="text-lg font-bold text-blue-600">
                                                  {item.serankingData.volume?.toLocaleString() ||
                                                    "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  monthly searches
                                                </div>
                                              </div>

                                              {/* Keyword Difficulty */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  KEYWORD DIFFICULTY
                                                </div>
                                                <div
                                                  className={`text-lg font-bold ${
                                                    (item.serankingData
                                                      .difficulty || 0) <= 40
                                                      ? "text-green-600"
                                                      : (item.serankingData
                                                          .difficulty || 0) <=
                                                        60
                                                      ? "text-yellow-600"
                                                      : "text-red-600"
                                                  }`}
                                                >
                                                  {item.serankingData
                                                    .difficulty || "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  {(item.serankingData
                                                    .difficulty || 0) <= 40
                                                    ? "Low competition"
                                                    : (item.serankingData
                                                        .difficulty || 0) <= 60
                                                    ? "Medium competition"
                                                    : "High competition"}
                                                </div>
                                              </div>

                                              {/* CPC */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  CPC
                                                </div>
                                                <div className="text-lg font-bold text-green-600">
                                                  $
                                                  {item.serankingData.cpc?.toFixed(
                                                    2
                                                  ) || "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  cost per click
                                                </div>
                                              </div>

                                              {/* Competition */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  COMPETITION
                                                </div>
                                                <div className="text-lg font-bold text-purple-600">
                                                  {item.serankingData
                                                    .competition
                                                    ? typeof item.serankingData
                                                        .competition ===
                                                      "number"
                                                      ? (
                                                          item.serankingData
                                                            .competition * 100
                                                        ).toFixed(1) + "%"
                                                      : item.serankingData
                                                          .competition
                                                    : "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  advertiser competition
                                                </div>
                                              </div>
                                            </div>

                                            {/* History Trend - Full Width Below */}
                                            {item.serankingData.history_trend &&
                                              Object.keys(
                                                item.serankingData.history_trend
                                              ).length > 0 && (
                                                <div className="mt-4 bg-white p-4 rounded border border-slate-200 shadow-sm">
                                                  <div className="text-[10px] text-slate-500 font-bold mb-3 flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    SEARCH VOLUME TREND (Last 12
                                                    Months)
                                                  </div>
                                                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                                    {Object.entries(
                                                      item.serankingData
                                                        .history_trend
                                                    )
                                                      .sort(
                                                        ([dateA], [dateB]) =>
                                                          dateA.localeCompare(
                                                            dateB
                                                          )
                                                      )
                                                      .map(([date, volume]) => {
                                                        const monthYear =
                                                          new Date(
                                                            date
                                                          ).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                              month: "short",
                                                              year: "2-digit",
                                                            }
                                                          );
                                                        return (
                                                          <div
                                                            key={date}
                                                            className="text-center p-2 bg-slate-50 rounded border border-slate-100"
                                                          >
                                                            <div className="text-[9px] text-slate-400 font-medium mb-1">
                                                              {monthYear}
                                                            </div>
                                                            <div className="text-sm font-bold text-blue-600">
                                                              {typeof volume ===
                                                              "number"
                                                                ? volume.toLocaleString()
                                                                : volume}
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        )}

                                      {/* Search Intent Section */}
                                      {(item.searchIntent ||
                                        item.intentAnalysis) && (
                                        <div className="mb-3">
                                          <h4 className="text-xs font-bold uppercase text-purple-600 mb-2 flex items-center gap-1">
                                            <BrainCircuit className="w-3 h-3" />
                                            Search Intent Analysis
                                          </h4>
                                          {item.searchIntent && (
                                            <div className="bg-purple-50 p-3 rounded border border-purple-100 mb-2">
                                              <div className="text-[10px] text-purple-600 font-bold mb-1">
                                                USER INTENT
                                              </div>
                                              <p className="text-sm text-slate-700">
                                                {item.searchIntent}
                                              </p>
                                            </div>
                                          )}
                                          {item.intentAnalysis && (
                                            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                              <div className="text-[10px] text-blue-600 font-bold mb-1">
                                                INTENT vs SERP MATCH
                                              </div>
                                              <p className="text-sm text-slate-700">
                                                {item.intentAnalysis}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      <h4 className="text-xs font-bold uppercase text-slate-500">
                                        Analysis Reasoning
                                      </h4>
                                      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                        <MarkdownContent
                                          content={
                                            item.reasoning ||
                                            "No reasoning provided"
                                          }
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                                        {/* SE Ranking Volume (replaces SERP estimate) */}
                                        {item.serankingData &&
                                        item.serankingData.is_data_found ? (
                                          <div>
                                            <span className="text-xs text-slate-400 block">
                                              Search Volume (SE Ranking)
                                            </span>
                                            <span className="text-sm font-medium text-blue-600">
                                              {item.serankingData.volume?.toLocaleString() ||
                                                "N/A"}
                                            </span>
                                          </div>
                                        ) : (
                                          <div>
                                            <span className="text-xs text-slate-400 block">
                                              Reference SERP Count
                                            </span>
                                            <span className="text-sm font-medium">
                                              {item.serpResultCount === -1
                                                ? "Unknown (Many)"
                                                : item.serpResultCount ??
                                                  "Unknown"}
                                            </span>
                                          </div>
                                        )}

                                        {/* Keyword Difficulty (if SE Ranking data available) */}
                                        {item.serankingData &&
                                          item.serankingData.is_data_found && (
                                            <div>
                                              <span className="text-xs text-slate-400 block">
                                                Keyword Difficulty
                                              </span>
                                              <span
                                                className={`text-sm font-bold ${
                                                  (item.serankingData
                                                    .difficulty || 0) <= 40
                                                    ? "text-green-600"
                                                    : (item.serankingData
                                                        .difficulty || 0) <= 60
                                                    ? "text-yellow-600"
                                                    : "text-red-600"
                                                }`}
                                              >
                                                {item.serankingData
                                                  .difficulty || "N/A"}
                                              </span>
                                            </div>
                                          )}

                                        <div>
                                          <span className="text-xs text-slate-400 block">
                                            Top Competitor Type
                                          </span>
                                          <span className="text-sm font-medium">
                                            {item.topDomainType ?? "-"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* SERP EVIDENCE IN DETAILS */}
                                      {item.serpResultCount === 0 ? (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded text-amber-800 text-xs font-medium flex items-center gap-2">
                                          <Lightbulb className="w-4 h-4" />
                                          No direct competitors found in search.
                                        </div>
                                      ) : (
                                        item.topSerpSnippets &&
                                        item.topSerpSnippets.length > 0 && (
                                          <div className="mt-4">
                                            <div className="flex justify-between items-center mb-2">
                                              <h4 className="text-xs font-bold uppercase text-slate-500">
                                                {t.serpEvidence}
                                              </h4>
                                              <span className="text-[10px] text-amber-600 italic">
                                                {t.serpEvidenceDisclaimer}
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              {item.topSerpSnippets
                                                .slice(0, 3)
                                                .map((snip, i) => (
                                                  <div
                                                    key={i}
                                                    className="bg-white p-2 rounded border border-slate-100 text-xs"
                                                  >
                                                    <div className="text-blue-700 font-medium truncate">
                                                      {snip.title}
                                                    </div>
                                                    <div className="text-green-700 text-[10px] truncate">
                                                      {snip.url}
                                                    </div>
                                                    <div className="text-slate-500 mt-1 line-clamp-2">
                                                      {snip.snippet}
                                                    </div>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {state.batchKeywords.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-slate-400"
                          >
                            No results yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DEEP DIVE ANALYZING PAGE */}
          {state.step === "deep-dive-analyzing" && (
            <div className="flex-1 flex flex-col h-[calc(100vh-200px)] min-h-[500px] relative">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {t.deepDiveAnalyzing || "Deep Dive Analysis"}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {state.deepDiveKeyword?.keyword || "Analyzing keyword..."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setState((prev) => ({
                      ...prev,
                      step: "results",
                      isDeepDiving: false,
                    }));
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black/60 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-md transition-colors text-sm font-medium shadow-sm"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6 bg-black/40 backdrop-blur-sm rounded-xl shadow-sm border border-green-500/20 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white">
                    {state.deepDiveCurrentStep ||
                      (state.uiLanguage === "zh"
                        ? "初始化..."
                        : "Initializing...")}
                  </div>
                  <div className="text-sm font-bold text-green-400">
                    {Math.round(state.deepDiveProgress)}%
                  </div>
                </div>
                <div className="w-full bg-black/60 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                    style={{ width: `${state.deepDiveProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
                <div className="w-full md:w-1/3 h-full">
                  <TerminalLog logs={state.logs} isDarkTheme={isDarkTheme} />
                </div>
                <div className="w-full md:w-2/3 h-full">
                  <DeepDiveAnalysisStream
                    thoughts={state.deepDiveThoughts}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>
              </div>
            </div>
          )}

          {/* DEEP DIVE RESULTS PAGE */}
          {state.step === "deep-dive-results" &&
            state.currentStrategyReport && (
              <div className="animate-fade-in flex-1">
                <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <FileText className="w-6 h-6 text-green-400" />
                      {t.deepDiveResults || "Deep Dive Results"}
                    </h2>
                    <p className="text-slate-400 mt-1">
                      {state.currentStrategyReport.targetKeyword}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      disabled={true}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-400 text-white rounded-md text-sm font-medium cursor-not-allowed opacity-50"
                      title="网站生成功能正在维护中，暂时不可用"
                    >
                      <Globe className="w-4 h-4" />
                      生成网站 (维护中)
                    </button>
                    <button
                      onClick={() => {
                        const report = state.currentStrategyReport;
                        if (report?.htmlContent) {
                          const blob = new Blob([report.htmlContent], {
                            type: "text/html;charset=utf-8;",
                          });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.setAttribute(
                            "download",
                            `${report.urlSlug || "seo-content"}.html`
                          );
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      {t.exportHTML || "Export HTML"}
                    </button>
                    <button
                      onClick={() =>
                        setState((prev) => ({ ...prev, step: "results" }))
                      }
                      className="px-4 py-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors border border-slate-200 rounded-md bg-white hover:bg-slate-50"
                    >
                      {t.backToResults || "Back to Results"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Content Strategy (Target Language) */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        {t.contentStrategy || "Content Strategy"} (
                        {state.targetLanguage.toUpperCase()})
                      </h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-4">
                      {/* Page Title */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                          Page Title (H1)
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {state.currentStrategyReport.pageTitleH1}
                        </div>
                      </div>

                      {/* Meta Description */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                          Meta Description
                        </div>
                        <div className="text-sm text-slate-700">
                          {state.currentStrategyReport.metaDescription}
                        </div>
                      </div>

                      {/* URL Slug */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                          URL Slug
                        </div>
                        <div className="font-mono text-sm text-blue-600">
                          {state.currentStrategyReport.urlSlug}
                        </div>
                      </div>

                      {/* Content Structure */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-3">
                          Content Structure
                        </div>
                        <div className="space-y-3">
                          {state.currentStrategyReport.contentStructure.map(
                            (section, idx) => (
                              <div
                                key={idx}
                                className="p-3 bg-white rounded border border-slate-100"
                              >
                                <div className="font-bold text-sm text-slate-900 mb-1">
                                  {section.header}
                                </div>
                                <div className="text-xs text-slate-600">
                                  {section.description}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Long-tail Keywords with Analysis Button */}
                      {state.currentStrategyReport.longTailKeywords &&
                        state.currentStrategyReport.longTailKeywords.length >
                          0 && (
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center justify-between mb-3">
                              <div className="text-xs text-slate-500 uppercase font-bold">
                                Long-tail Keywords
                              </div>
                              <button
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    showDetailedAnalysisModal: true,
                                  }))
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all text-xs font-medium shadow-sm hover:shadow-md"
                              >
                                <Search className="w-3.5 h-3.5" />
                                {state.uiLanguage === "zh"
                                  ? "详细分析"
                                  : "Detailed Analysis"}
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {state.currentStrategyReport.longTailKeywords.map(
                                (kw, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-white text-blue-700 rounded-md text-xs font-medium border border-blue-200"
                                  >
                                    {kw}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* User Intent Summary */}
                      {state.currentStrategyReport.userIntentSummary && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                            User Intent Summary
                          </div>
                          <div className="text-sm text-slate-700">
                            {state.currentStrategyReport.userIntentSummary}
                          </div>
                        </div>
                      )}

                      {/* Recommended Word Count */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                          Recommended Word Count
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                          {state.currentStrategyReport.recommendedWordCount}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Translation Reference (UI Language) */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Languages className="w-5 h-5 text-purple-600" />
                        {t.translationReference || "Translation Reference"} (
                        {state.uiLanguage.toUpperCase()})
                      </h3>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar p-6 space-y-4">
                      {/* Page Title Translation */}
                      {state.currentStrategyReport.pageTitleH1_trans && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                            {t.pageTitleTranslation || "Page Title Translation"}
                          </div>
                          <div className="text-lg font-bold text-slate-900">
                            {state.currentStrategyReport.pageTitleH1_trans}
                          </div>
                        </div>
                      )}

                      {/* Meta Description Translation */}
                      {state.currentStrategyReport.metaDescription_trans && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                            {t.metaDescriptionTranslation ||
                              "Meta Description Translation"}
                          </div>
                          <div className="text-sm text-slate-700">
                            {state.currentStrategyReport.metaDescription_trans}
                          </div>
                        </div>
                      )}

                      {/* URL Slug (Same) */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                          URL Slug
                        </div>
                        <div className="font-mono text-sm text-purple-600">
                          {state.currentStrategyReport.urlSlug}
                        </div>
                      </div>

                      {/* Content Structure Translations */}
                      {state.currentStrategyReport.contentStructure.some(
                        (s) => s.header_trans || s.description_trans
                      ) && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-3">
                            {t.contentStructureTranslation ||
                              "Content Structure Translation"}
                          </div>
                          <div className="space-y-3">
                            {state.currentStrategyReport.contentStructure.map(
                              (section, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-white rounded border border-slate-100"
                                >
                                  {section.header_trans && (
                                    <div className="font-bold text-sm text-slate-900 mb-1">
                                      {section.header_trans}
                                    </div>
                                  )}
                                  {section.description_trans && (
                                    <div className="text-xs text-slate-600">
                                      {section.description_trans}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Long-tail Keywords Translation */}
                      {state.currentStrategyReport.longTailKeywords_trans &&
                        state.currentStrategyReport.longTailKeywords_trans
                          .length > 0 && (
                          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                              {t.longTailKeywordsTranslation ||
                                "Long-tail Keywords Translation"}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {state.currentStrategyReport.longTailKeywords_trans.map(
                                (kw, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 bg-white text-purple-700 rounded-md text-xs font-medium border border-purple-200"
                                  >
                                    {kw}
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        )}

                      {/* User Intent Summary (Same if no translation) */}
                      {state.currentStrategyReport.userIntentSummary && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                            {t.userIntentSummary || "User Intent Summary"}
                          </div>
                          <div className="text-sm text-slate-700">
                            {state.currentStrategyReport.userIntentSummary}
                          </div>
                        </div>
                      )}

                      {/* Recommended Word Count (Same) */}
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                          {state.uiLanguage === "zh"
                            ? "建议字数"
                            : "Recommended Word Count"}
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                          {state.currentStrategyReport.recommendedWordCount}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Analysis Modal */}
                {state.showDetailedAnalysisModal && (
                  <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        showDetailedAnalysisModal: false,
                      }))
                    }
                  >
                    <div
                      className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Modal Header */}
                      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-lg">
                              <Search className="w-6 h-6" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold">
                                {state.uiLanguage === "zh"
                                  ? "上首页概率验证结果"
                                  : "Ranking Probability Analysis"}
                              </h3>
                              <p className="text-sm text-white/80 mt-1">
                                {state.currentStrategyReport?.targetKeyword}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              setState((prev) => ({
                                ...prev,
                                showDetailedAnalysisModal: false,
                              }))
                            }
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Modal Body */}
                      <div className="flex-1 overflow-auto p-6 space-y-6">
                        {/* Ranking Probability Badge */}
                        {state.currentStrategyReport?.rankingProbability && (
                          <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="text-sm text-slate-500 uppercase font-bold mb-3">
                              {state.uiLanguage === "zh"
                                ? "上首页概率"
                                : "Ranking Probability"}
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                              <span
                                className={`px-6 py-3 rounded-xl text-xl font-bold shadow-lg ${
                                  state.currentStrategyReport
                                    .rankingProbability ===
                                  ProbabilityLevel.HIGH
                                    ? "bg-green-100 text-green-800 border-2 border-green-300"
                                    : state.currentStrategyReport
                                        .rankingProbability ===
                                      ProbabilityLevel.MEDIUM
                                    ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
                                    : "bg-red-100 text-red-800 border-2 border-red-300"
                                }`}
                              >
                                {state.currentStrategyReport.rankingProbability}
                              </span>
                            </div>

                            {/* Core Keywords */}
                            {state.currentStrategyReport.coreKeywords &&
                              state.currentStrategyReport.coreKeywords.length >
                                0 && (
                                <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
                                  <div className="text-xs text-slate-500 uppercase font-bold mb-2">
                                    {state.uiLanguage === "zh"
                                      ? "核心关键词"
                                      : "Core Keywords"}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {state.currentStrategyReport.coreKeywords.map(
                                      (kw, idx) => (
                                        <span
                                          key={idx}
                                          className="px-3 py-1 bg-purple-50 text-purple-700 rounded-md text-sm font-medium border border-purple-200"
                                        >
                                          {kw}
                                        </span>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Search Intent */}
                            {state.currentStrategyReport.searchIntent && (
                              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs text-blue-600 uppercase font-bold mb-2 flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" />
                                  {state.uiLanguage === "zh"
                                    ? "搜索意图"
                                    : "Search Intent"}
                                </div>
                                <MarkdownContent
                                  content={
                                    state.currentStrategyReport.searchIntent
                                  }
                                />
                              </div>
                            )}

                            {/* Intent Match */}
                            {state.currentStrategyReport.intentMatch && (
                              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                                <div className="text-xs text-purple-600 uppercase font-bold mb-2 flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4" />
                                  {state.uiLanguage === "zh"
                                    ? "内容匹配度"
                                    : "Content-Intent Match"}
                                </div>
                                <MarkdownContent
                                  content={
                                    state.currentStrategyReport.intentMatch
                                  }
                                />
                              </div>
                            )}

                            {/* Ranking Analysis */}
                            {state.currentStrategyReport.rankingAnalysis && (
                              <div className="p-4 bg-white rounded-lg border border-slate-200">
                                <div className="text-xs text-slate-600 uppercase font-bold mb-2">
                                  {state.uiLanguage === "zh"
                                    ? "详细分析"
                                    : "Detailed Analysis"}
                                </div>
                                <MarkdownContent
                                  content={
                                    state.currentStrategyReport.rankingAnalysis
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* SERP Competition Data */}
                        {state.currentStrategyReport?.serpCompetitionData &&
                          state.currentStrategyReport.serpCompetitionData
                            .length > 0 && (
                            <div>
                              <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Search className="w-5 h-5 text-indigo-600" />
                                {state.uiLanguage === "zh"
                                  ? "SERP竞争分析"
                                  : "SERP Competition Analysis"}
                              </h4>
                              <div className="space-y-4">
                                {state.currentStrategyReport.serpCompetitionData.map(
                                  (data, idx) => (
                                    <div
                                      key={idx}
                                      className="p-4 bg-slate-50 rounded-lg border border-slate-200"
                                    >
                                      <div className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                          #{idx + 1}
                                        </span>
                                        {data.keyword}
                                      </div>
                                      <div className="mb-3">
                                        <MarkdownContent
                                          content={data.analysis}
                                        />
                                      </div>

                                      {/* SE Ranking Data for this keyword */}
                                      {data.serankingData && (
                                        <div className="mb-3 p-3 bg-white rounded border border-blue-200">
                                          <div className="text-xs text-blue-600 uppercase font-bold mb-2 flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3" />
                                            SEO词研究工具 (SE Ranking Data)
                                          </div>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                              <div className="text-[9px] text-slate-500 font-bold mb-1">
                                                VOLUME
                                              </div>
                                              <div className="text-sm font-bold text-blue-600">
                                                {data.serankingData.volume?.toLocaleString() ||
                                                  "N/A"}
                                              </div>
                                            </div>
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                              <div className="text-[9px] text-slate-500 font-bold mb-1">
                                                KD
                                              </div>
                                              <div
                                                className={`text-sm font-bold ${
                                                  (data.serankingData
                                                    .difficulty || 0) <= 40
                                                    ? "text-green-600"
                                                    : (data.serankingData
                                                        .difficulty || 0) <= 60
                                                    ? "text-yellow-600"
                                                    : "text-red-600"
                                                }`}
                                              >
                                                {data.serankingData
                                                  .difficulty || "N/A"}
                                              </div>
                                            </div>
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                              <div className="text-[9px] text-slate-500 font-bold mb-1">
                                                CPC
                                              </div>
                                              <div className="text-sm font-bold text-green-600">
                                                $
                                                {data.serankingData.cpc?.toFixed(
                                                  2
                                                ) || "N/A"}
                                              </div>
                                            </div>
                                            <div className="p-2 bg-slate-50 rounded border border-slate-100">
                                              <div className="text-[9px] text-slate-500 font-bold mb-1">
                                                COMP
                                              </div>
                                              <div className="text-sm font-bold text-purple-600">
                                                {data.serankingData.competition
                                                  ? typeof data.serankingData
                                                      .competition === "number"
                                                    ? (
                                                        data.serankingData
                                                          .competition * 100
                                                      ).toFixed(1) + "%"
                                                    : data.serankingData
                                                        .competition
                                                  : "N/A"}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {data.serpResults &&
                                        data.serpResults.length > 0 && (
                                          <div className="space-y-2">
                                            <div className="text-xs text-slate-500 uppercase font-bold">
                                              {state.uiLanguage === "zh"
                                                ? "前三名SERP结果"
                                                : "Top 3 SERP Results"}
                                            </div>
                                            {data.serpResults
                                              .slice(0, 3)
                                              .map((result, ridx) => (
                                                <div
                                                  key={ridx}
                                                  className="bg-white p-3 rounded border border-slate-200 text-xs hover:border-blue-300 transition-colors"
                                                >
                                                  <div className="text-blue-700 font-medium truncate">
                                                    {result.title}
                                                  </div>
                                                  <div className="text-green-700 text-[10px] truncate mt-1">
                                                    {result.url}
                                                  </div>
                                                  <div className="text-slate-500 mt-2 line-clamp-2">
                                                    {result.snippet}
                                                  </div>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Modal Footer */}
                      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                        <button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              showDetailedAnalysisModal: false,
                            }))
                          }
                          className="px-6 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                        >
                          {state.uiLanguage === "zh" ? "关闭" : "Close"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* STEP 3: RESULTS */}
          {state.step === "results" && (
            <div className="animate-fade-in flex-1">
              <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
                <div>
                  <h2
                    className={`text-2xl font-bold flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <span
                      className={`px-2 py-1 rounded text-base border ${
                        isDarkTheme
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : "bg-green-100 text-green-700 border-green-300"
                      }`}
                    >
                      {state.seedKeyword}
                    </span>
                    {t.resultsTitle}
                  </h2>
                  <p
                    className={`mt-1 ${
                      isDarkTheme ? "text-slate-400" : "text-gray-600"
                    }`}
                  >
                    {t.foundOpp} {state.keywords.length} {t.opps}.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => startMining(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500 text-black rounded-md hover:bg-green-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    {t.btnExpand}
                  </button>
                  <button
                    onClick={reset}
                    className={`px-4 py-2 text-sm font-medium transition-colors border rounded-md ${
                      isDarkTheme
                        ? "text-slate-400 hover:text-green-400 border-green-500/30 bg-black/60 hover:bg-green-500/10"
                        : "text-gray-700 hover:text-green-600 border-green-300 bg-white hover:bg-green-50"
                    }`}
                  >
                    {t.newAnalysis}
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              <div
                className={`backdrop-blur-sm p-3 rounded-t-xl border border-b-0 flex flex-wrap gap-4 items-center justify-between ${
                  isDarkTheme
                    ? "bg-black/40 border-green-500/20"
                    : "bg-gray-100 border-green-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Filter */}
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      isDarkTheme ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <select
                      value={state.filterLevel}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          filterLevel: e.target.value as any,
                        }))
                      }
                      className={`border rounded px-2 py-1 outline-none focus:ring-1 ${
                        isDarkTheme
                          ? "bg-black/60 border-green-500/30 focus:ring-green-500/50 text-white"
                          : "bg-white border-green-300 focus:ring-green-500 text-gray-900"
                      }`}
                    >
                      <option
                        value={ProbabilityLevel.HIGH}
                        className={isDarkTheme ? "bg-black" : "bg-white"}
                      >
                        {t.filterHigh}
                      </option>
                      <option
                        value="ALL"
                        className={isDarkTheme ? "bg-black" : "bg-white"}
                      >
                        {t.filterAll}
                      </option>
                    </select>
                  </div>

                  {/* Sort */}
                  <div
                    className={`flex items-center gap-2 text-sm ${
                      isDarkTheme ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    <ArrowUpDown className="w-4 h-4" />
                    <select
                      value={state.sortBy}
                      onChange={(e) =>
                        setState((prev) => ({
                          ...prev,
                          sortBy: e.target.value as any,
                        }))
                      }
                      className={`border rounded px-2 py-1 outline-none focus:ring-1 ${
                        isDarkTheme
                          ? "bg-black/60 border-green-500/30 focus:ring-green-500/50 text-white"
                          : "bg-white border-green-300 focus:ring-green-500 text-gray-900"
                      }`}
                    >
                      <option
                        value="probability"
                        className={isDarkTheme ? "bg-black" : "bg-white"}
                      >
                        Sort: Probability
                      </option>
                      <option
                        value="volume"
                        className={isDarkTheme ? "bg-black" : "bg-white"}
                      >
                        Sort: Volume
                      </option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={downloadCSV}
                  className={`flex items-center gap-2 text-sm px-3 py-1 rounded transition-colors ${
                    isDarkTheme
                      ? "text-slate-300 hover:text-green-400 hover:bg-green-500/10"
                      : "text-gray-700 hover:text-green-600 hover:bg-green-50"
                  }`}
                >
                  <Download className="w-4 h-4" /> {t.downloadCSV}
                </button>
              </div>

              {/* Table */}
              <div
                className={`backdrop-blur-sm rounded-b-xl shadow-sm border overflow-hidden min-h-[400px] ${
                  isDarkTheme
                    ? "bg-black/40 border-green-500/20"
                    : "bg-white border-green-200"
                }`}
              >
                <div className="overflow-x-auto custom-scrollbar">
                  <table
                    className={`w-full text-left text-sm ${
                      isDarkTheme ? "text-slate-300" : "text-gray-700"
                    }`}
                  >
                    <thead
                      className={`text-xs uppercase font-semibold border-b ${
                        isDarkTheme
                          ? "bg-black/60 text-slate-400 border-green-500/20"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <tr>
                        <th className="px-4 py-4 w-10"></th>
                        <th className="px-4 py-4">{t.colKw}</th>
                        <th className="px-4 py-4">{t.colTrans}</th>
                        <th className="px-4 py-4">{t.colVol}</th>
                        <th className="px-4 py-4">{t.colType}</th>
                        <th className="px-4 py-4 text-center">{t.colProb}</th>
                        <th className="px-4 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-500/10">
                      {getProcessedKeywords().map((item) => {
                        const isExpanded = state.expandedRowId === item.id;

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              className={`transition-colors ${
                                isExpanded
                                  ? "bg-green-500/10"
                                  : "hover:bg-green-500/5"
                              }`}
                            >
                              <td
                                className="px-4 py-4 text-center cursor-pointer"
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    expandedRowId: isExpanded ? null : item.id,
                                  }))
                                }
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-green-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-green-400" />
                                )}
                              </td>
                              <td
                                className={`px-4 py-4 font-medium ${
                                  isDarkTheme ? "text-white" : "text-gray-900"
                                }`}
                                onClick={() =>
                                  setState((prev) => ({
                                    ...prev,
                                    expandedRowId: isExpanded ? null : item.id,
                                  }))
                                }
                              >
                                <div className="cursor-pointer">
                                  {item.keyword}
                                </div>
                              </td>
                              <td
                                className={`px-4 py-4 ${
                                  isDarkTheme
                                    ? "text-slate-400"
                                    : "text-gray-600"
                                }`}
                              >
                                {item.translation}
                              </td>
                              <td
                                className={`px-4 py-4 font-mono ${
                                  isDarkTheme ? "text-white" : "text-gray-900"
                                }`}
                              >
                                {item.volume.toLocaleString()}
                              </td>
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                  {item.topDomainType || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    item.probability === ProbabilityLevel.HIGH
                                      ? "bg-green-500/30 text-green-400 border-green-500/50"
                                      : item.probability ===
                                        ProbabilityLevel.MEDIUM
                                      ? "bg-yellow-500/30 text-yellow-400 border-yellow-500/50"
                                      : "bg-red-500/30 text-red-400 border-red-500/50"
                                  }`}
                                >
                                  {item.probability}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex items-center justify-end gap-3">
                                  {/* Google Verify Button in Table */}
                                  <a
                                    href={`https://www.google.com/search?q=${encodeURIComponent(
                                      item.keyword
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-xs font-medium border border-green-500/30"
                                    title={t.verifyBtn}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {t.verifyBtn}
                                  </a>

                                  <button
                                    className="text-slate-400 hover:text-green-400 text-xs flex items-center gap-1"
                                    onClick={() =>
                                      setState((prev) => ({
                                        ...prev,
                                        expandedRowId: isExpanded
                                          ? null
                                          : item.id,
                                      }))
                                    }
                                  >
                                    Details
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeepDive(item);
                                    }}
                                    className="flex items-center gap-1 px-2 py-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-xs font-medium"
                                    title={t.deepDive}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {t.deepDive}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Detail View */}
                            {isExpanded && (
                              <tr
                                className={`animate-fade-in border-b ${
                                  isDarkTheme
                                    ? "bg-slate-50/80 border-slate-100"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <td colSpan={7} className="px-4 py-4">
                                  <div className="flex flex-col md:flex-row gap-6 px-4">
                                    <div className="flex-1 space-y-2">
                                      {/* Search Intent Section */}
                                      {(item.searchIntent ||
                                        item.intentAnalysis) && (
                                        <div className="mb-3">
                                          <h4 className="text-xs font-bold uppercase text-purple-600 mb-2 flex items-center gap-1">
                                            <BrainCircuit className="w-3 h-3" />
                                            Search Intent Analysis
                                          </h4>
                                          {item.searchIntent && (
                                            <div className="bg-purple-50 p-3 rounded border border-purple-100 mb-2">
                                              <div className="text-[10px] text-purple-600 font-bold mb-1">
                                                USER INTENT
                                              </div>
                                              <p className="text-sm text-slate-700">
                                                {item.searchIntent}
                                              </p>
                                            </div>
                                          )}
                                          {item.intentAnalysis && (
                                            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                              <div className="text-[10px] text-blue-600 font-bold mb-1">
                                                INTENT vs SERP MATCH
                                              </div>
                                              <p className="text-sm text-slate-700">
                                                {item.intentAnalysis}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* SE Ranking Data Section */}
                                      {item.serankingData &&
                                        item.serankingData.is_data_found && (
                                          <div className="mb-3">
                                            <h4 className="text-xs font-bold uppercase text-blue-600 mb-2 flex items-center gap-1">
                                              <TrendingUp className="w-3 h-3" />
                                              SEO词研究工具 (SE Ranking Data)
                                            </h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                              {/* Search Volume */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  SEARCH VOLUME
                                                </div>
                                                <div className="text-lg font-bold text-blue-600">
                                                  {item.serankingData.volume?.toLocaleString() ||
                                                    "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  monthly searches
                                                </div>
                                              </div>

                                              {/* Keyword Difficulty */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  KEYWORD DIFFICULTY
                                                </div>
                                                <div
                                                  className={`text-lg font-bold ${
                                                    (item.serankingData
                                                      .difficulty || 0) <= 40
                                                      ? "text-green-600"
                                                      : (item.serankingData
                                                          .difficulty || 0) <=
                                                        60
                                                      ? "text-yellow-600"
                                                      : "text-red-600"
                                                  }`}
                                                >
                                                  {item.serankingData
                                                    .difficulty || "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  {(item.serankingData
                                                    .difficulty || 0) <= 40
                                                    ? "Low competition"
                                                    : (item.serankingData
                                                        .difficulty || 0) <= 60
                                                    ? "Medium competition"
                                                    : "High competition"}
                                                </div>
                                              </div>

                                              {/* CPC */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  CPC
                                                </div>
                                                <div className="text-lg font-bold text-green-600">
                                                  $
                                                  {item.serankingData.cpc?.toFixed(
                                                    2
                                                  ) || "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  cost per click
                                                </div>
                                              </div>

                                              {/* Competition */}
                                              <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="text-[10px] text-slate-500 font-bold mb-1">
                                                  COMPETITION
                                                </div>
                                                <div className="text-lg font-bold text-purple-600">
                                                  {item.serankingData
                                                    .competition
                                                    ? typeof item.serankingData
                                                        .competition ===
                                                      "number"
                                                      ? (
                                                          item.serankingData
                                                            .competition * 100
                                                        ).toFixed(1) + "%"
                                                      : item.serankingData
                                                          .competition
                                                    : "N/A"}
                                                </div>
                                                <div className="text-[9px] text-slate-400">
                                                  advertiser competition
                                                </div>
                                              </div>
                                            </div>

                                            {/* History Trend - Full Width Below */}
                                            {item.serankingData.history_trend &&
                                              Object.keys(
                                                item.serankingData.history_trend
                                              ).length > 0 && (
                                                <div className="mt-4 bg-white p-4 rounded border border-slate-200 shadow-sm">
                                                  <div className="text-[10px] text-slate-500 font-bold mb-3 flex items-center gap-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    SEARCH VOLUME TREND (Last 12
                                                    Months)
                                                  </div>
                                                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                                    {Object.entries(
                                                      item.serankingData
                                                        .history_trend
                                                    )
                                                      .sort(
                                                        ([dateA], [dateB]) =>
                                                          dateA.localeCompare(
                                                            dateB
                                                          )
                                                      )
                                                      .map(([date, volume]) => {
                                                        const monthYear =
                                                          new Date(
                                                            date
                                                          ).toLocaleDateString(
                                                            "en-US",
                                                            {
                                                              month: "short",
                                                              year: "2-digit",
                                                            }
                                                          );
                                                        return (
                                                          <div
                                                            key={date}
                                                            className="text-center p-2 bg-slate-50 rounded border border-slate-100"
                                                          >
                                                            <div className="text-[9px] text-slate-400 font-medium mb-1">
                                                              {monthYear}
                                                            </div>
                                                            <div className="text-sm font-bold text-blue-600">
                                                              {typeof volume ===
                                                              "number"
                                                                ? volume.toLocaleString()
                                                                : volume}
                                                            </div>
                                                          </div>
                                                        );
                                                      })}
                                                  </div>
                                                </div>
                                              )}
                                          </div>
                                        )}

                                      <h4 className="text-xs font-bold uppercase text-slate-500">
                                        Analysis Reasoning
                                      </h4>
                                      <div className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                        <MarkdownContent
                                          content={
                                            item.reasoning ||
                                            "No reasoning provided"
                                          }
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-4 mt-2">
                                        <div>
                                          <span className="text-xs text-slate-400 block">
                                            Reference SERP Count
                                          </span>
                                          <span className="text-sm font-medium">
                                            {item.serpResultCount === -1
                                              ? "Unknown (Many)"
                                              : item.serpResultCount ??
                                                "Unknown"}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-xs text-slate-400 block">
                                            Top Competitor Type
                                          </span>
                                          <span className="text-sm font-medium">
                                            {item.topDomainType ?? "-"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* SERP EVIDENCE IN DETAILS - Conditional Rendering */}
                                      {item.serpResultCount === 0 ? (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded text-amber-800 text-xs font-medium flex items-center gap-2">
                                          <Lightbulb className="w-4 h-4" />
                                          No direct competitors found in search.
                                        </div>
                                      ) : (
                                        item.topSerpSnippets &&
                                        item.topSerpSnippets.length > 0 && (
                                          <div className="mt-4">
                                            <div className="flex justify-between items-center mb-2">
                                              <h4 className="text-xs font-bold uppercase text-slate-500">
                                                {t.serpEvidence}
                                              </h4>
                                              <span className="text-[10px] text-amber-600 italic">
                                                {t.serpEvidenceDisclaimer}
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              {item.topSerpSnippets
                                                .slice(0, 3)
                                                .map((snip, i) => (
                                                  <div
                                                    key={i}
                                                    className="bg-white p-2 rounded border border-slate-100 text-xs"
                                                  >
                                                    <div className="text-blue-700 font-medium truncate">
                                                      {snip.title}
                                                    </div>
                                                    <div className="text-green-700 text-[10px] truncate">
                                                      {snip.url}
                                                    </div>
                                                    <div className="text-slate-500 mt-1 line-clamp-2">
                                                      {snip.snippet}
                                                    </div>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {getProcessedKeywords().length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="text-center py-12 text-slate-400"
                          >
                            No keywords match the current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Modal */}
          {state.showDeepDiveModal &&
            (state.isDeepDiving ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-xl shadow-xl flex flex-col items-center">
                  <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">
                    {t.generatingReport}
                  </h3>
                  <p className="text-slate-500 text-sm">
                    Drafting H1, H2s, and Long-tail keywords...
                  </p>
                </div>
              </div>
            ) : (
              state.currentStrategyReport && (
                <StrategyModal
                  report={state.currentStrategyReport}
                  onClose={() =>
                    setState((prev) => ({ ...prev, showDeepDiveModal: false }))
                  }
                  title={t.modalTitle}
                  labels={{ close: t.close }}
                />
              )
            ))}
        </main>

        {/* Task Menu Modal */}
        <TaskMenuModal
          show={showTaskMenu}
          onClose={() => setShowTaskMenu(false)}
          onCreate={(type) => addTask({ type })}
          uiLanguage={state.uiLanguage}
        />
      </div>
    </div>
  );
}
