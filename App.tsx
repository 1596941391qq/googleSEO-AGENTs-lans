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
  BookOpen, // Added
  Sparkles, // Added
  Copy, // Added
  Bug, // Added
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
  Hash,
  Network,
  Send,
  Layers,
  LayoutGrid,
  Cpu,
  Link2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Input } from "./components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { cn } from "./lib/utils";
import { useAuth } from "./contexts/AuthContext";
import { Sidebar } from "./components/layout/Sidebar";
import { TaskMenuModal } from "./components/layout/TaskMenuModal";
import { StrategyModal } from "./components/workflow/StrategyModal";
import { StepItem } from "./components/layout/StepItem";
import { TaskTab } from "./components/layout/TaskTab";
import { ArticleGeneratorLayout } from "./components/article-generator/ArticleGeneratorLayout";
import { KeywordTable } from "./components/mining/KeywordTable";
import { MarkdownContent } from "./components/ui/MarkdownContent";
import { TestAgentPanel } from "./components/TestAgentPanel";
import { ContentGenerationView } from "./components/ContentGenerationView";
import { WebsiteSelector } from "./components/WebsiteSelector";
import { GoogleSearchResults } from "./components/article-generator/GoogleSearchResults";
import {
  KeywordMiningGuide,
  MiningConfig,
} from "./components/workflow/KeywordMiningGuide";
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

// --- Constants & Translations ---

const TEXT = {
  en: {
    title: "Mine Hidden Alpha",
    step1: "1. Input",
    step2: "2. process",
    step3: "3. Results",
    inputTitle: "Define Your Niche",
    inputDesc:
      'Enter a seed keyword. The Agent will iterate until it finds a HIGH probability "Blue Ocean" keyword or "Weak Competitor" gap.',
    auditInputTitle: "Expand Your Reach",
    auditInputDesc:
      "Enter a established URL. The Agent will pivot from the core to find high-conversion long-tail clusters and cross-category opportunities within the existing traffic pool.",
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
    btnGenerateArticle: "Generate Article",
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

    batchTranslateDesc:
      "Will translate keywords to target language and analyze blue ocean opportunities.",
    batchInputPlaceholder: "Support multiple keywords (e.g manus,nanobanana)",
    btnBatchAnalyze: "Cross-Market Insights",
    batchAnalyzing: "Translating and analyzing...",
    batchResultsTitle: "BCross-Market Insights Results",
    originalKeyword: "Original",
    translatedKeyword: "Translated",
    tabMining: "Keyword Mining",
    tabBatch: "Cross-Market Insight",
    tabDeepDive: "Deep Dive Strategy",
    deepDiveTitle: "Deep Dive SEO Strategy",
    deepDiveDesc:
      "Build comprehensive SEO strategy for a core keyword and predict ranking probability for it and derived long-tail keywords.",
    deepDiveInputPlaceholder: "Enter core keyword (e.g., electric bike)",
    btnDeepDive: "Start Deep Dive",
    deepDiveArchives: "Deep Dive Archives",
    miningArchives: "Mining Archives",
    batchArchives: "Insight Archives",
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
    // Article Generator Agent Visualization
    agentTracker: "Tracker",
    agentResearcher: "Researcher",
    agentStrategist: "Strategist",
    agentWriter: "Writer",
    agentArtist: "Artist",
    agentSystem: "System",
    agentTrackerDesc: "Checking requirements and validating input...",
    agentResearcherDesc: "Analyzing competitors and collecting SEO data...",
    agentStrategistDesc: "Creating content strategy and outline...",
    agentWriterDesc: "Writing article content...",
    agentArtistDesc: "Generating visual assets...",
    cardTopCompetitors: "Top Competitors",
    cardStrategicOutline: "Strategic Outline",
    cardCompetitorAnalysis: "Competitor Analysis",
    cardGeneratingVisual: "Generating Visual",
    cardWinningFormula: "Winning Formula",
    cardContentGaps: "Content Gaps",
    cardTopCompetitorsBenchmark: "Top Competitors Benchmark",
    cardVolume: "Vol",
    cardDifficulty: "KD",
    cardAngle: "Angle",
    cardWeakness: "Weakness",
  },
  zh: {
    title: "Mine Hidden Alpha",
    step1: "1. 输入",
    step2: "2. 过程",
    step3: "3. 结果",
    inputTitle: "定义您的 利基市场",
    inputDesc:
      "输入核心关键词。Agent 将循环挖掘，直到发现“蓝海词”或“弱竞争对手”（如论坛、PDF）占位的机会。",
    auditInputTitle: "扩展您的 覆盖范围",
    auditInputDesc:
      "输入已建立的 URL。Agent 将从核心出发，在现有流量池中找到高转化的长尾词集群和跨类别机会。",
    placeholder: "输入初始词 (例如: manus,nanobanana)",
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
    btnGenerateArticle: "生成图文",
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

    batchTranslateDesc: "将翻译keyword到目标语言并分析蓝海机会。",
    batchInputPlaceholder: "支持输入多个关键词（e.g manus,nanobanana）",
    btnBatchAnalyze: "跨市场洞察",
    batchAnalyzing: "正在跨市场洞察...",
    batchResultsTitle: "跨市场洞察结果",
    originalKeyword: "原始词",
    translatedKeyword: "翻译词",
    tabMining: "关键词挖掘",
    tabBatch: "跨市场洞察",
    tabDeepDive: "深度策略",
    deepDiveTitle: "深度SEO策略",
    deepDiveDesc:
      "为一个核心keyword构建SEO策略及预测其与衍生长尾词的上首页概率。",
    deepDiveInputPlaceholder: "输入核心关键词 (例如：电动自行车)",
    btnDeepDive: "开始深度分析",
    deepDiveArchives: "深度挖掘历史",
    miningArchives: "挖掘历史",
    batchArchives: "洞察历史",
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
    batchWorkflow: "洞察工作流",
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
    // Article Generator Agent Visualization
    agentTracker: "追踪器",
    agentResearcher: "研究员",
    agentStrategist: "策略师",
    agentWriter: "写手",
    agentArtist: "艺术家",
    agentSystem: "系统",
    agentTrackerDesc: "正在检查需求并验证输入...",
    agentResearcherDesc: "正在分析竞争对手并收集SEO数据...",
    agentStrategistDesc: "正在创建内容策略和大纲...",
    agentWriterDesc: "正在撰写文章内容...",
    agentArtistDesc: "正在生成视觉素材...",
    cardTopCompetitors: "顶级竞争对手",
    cardStrategicOutline: "策略大纲",
    cardCompetitorAnalysis: "竞争对手分析",
    cardGeneratingVisual: "正在生成视觉",
    cardWinningFormula: "制胜公式",
    cardContentGaps: "内容缺口",
    cardTopCompetitorsBenchmark: "顶级竞争对手基准",
    cardVolume: "搜索量",
    cardDifficulty: "难度",
    cardAngle: "角度",
    cardWeakness: "弱点",
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
            ? "border-emerald-500/30 text-white/70"
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
                  ? "text-emerald-400"
                  : "text-emerald-600"
                : isDarkTheme
                ? "text-white"
                : "text-gray-700"
            }`}
          >
            <span
              className={`w-14 shrink-0 ${
                isDarkTheme ? "text-white/60" : "text-gray-500"
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
            ? "bg-black hover:bg-emerald-500/20 text-white border border-emerald-500/20"
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
              ? "bg-black border-emerald-500/20"
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
                          isDarkTheme ? "text-emerald-400" : "text-emerald-600"
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
                          isDarkTheme ? "text-white/90" : "text-gray-600"
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
                      ? "text-white/70 border-emerald-500/30"
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
                    ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border-emerald-500/30"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200"
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

// Render agent data as formatted table or cards
const renderAgentDataTable = (
  data: any,
  dataType: "keywords" | "analysis" | "website-content" | "competitor-analysis",
  isDarkTheme: boolean = true
) => {
  // 网站内容分析显示
  if (
    dataType === "website-content" ||
    (dataType === "analysis" && data.analysisType === "website-content")
  ) {
    return (
      <div
        className={`mt-2 p-4 rounded-lg border ${
          isDarkTheme
            ? "bg-black/40 border-blue-500/30"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Globe
            className={`w-4 h-4 ${
              isDarkTheme ? "text-blue-400" : "text-blue-600"
            }`}
          />
          <h4
            className={`text-sm font-bold ${
              isDarkTheme ? "text-blue-400" : "text-blue-700"
            }`}
          >
            {isDarkTheme ? "网站内容分析" : "Website Content Analysis"}
          </h4>
        </div>
        <div className="space-y-3">
          <div>
            <div
              className={`text-xs font-semibold mb-1 ${
                isDarkTheme ? "text-white/70" : "text-gray-600"
              }`}
            >
              {isDarkTheme ? "网站URL" : "Website URL"}
            </div>
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs break-all hover:underline ${
                isDarkTheme ? "text-blue-400" : "text-blue-600"
              }`}
            >
              {data.url}
            </a>
          </div>
          <div>
            <div
              className={`text-xs font-semibold mb-1 ${
                isDarkTheme ? "text-white/70" : "text-gray-600"
              }`}
            >
              {isDarkTheme ? "域名" : "Domain"}
            </div>
            <div
              className={`text-xs ${
                isDarkTheme ? "text-white" : "text-gray-800"
              }`}
            >
              {data.domain}
            </div>
          </div>
          <div>
            <div
              className={`text-xs font-semibold mb-1 ${
                isDarkTheme ? "text-white/70" : "text-gray-600"
              }`}
            >
              {isDarkTheme ? "内容长度" : "Content Length"}
            </div>
            <div
              className={`text-sm font-mono ${
                isDarkTheme ? "text-white" : "text-gray-800"
              }`}
            >
              {data.contentLength?.toLocaleString()}{" "}
              {isDarkTheme ? "字符" : "chars"}
            </div>
          </div>
          {data.summary && (
            <div>
              <div
                className={`text-xs font-semibold mb-2 ${
                  isDarkTheme ? "text-white/70" : "text-gray-600"
                }`}
              >
                {isDarkTheme ? "内容摘要" : "Content Summary"}
              </div>
              <div
                className={`text-xs leading-relaxed p-3 rounded border ${
                  isDarkTheme
                    ? "bg-black/60 border-blue-500/20 text-white/90"
                    : "bg-white border-blue-200 text-gray-700"
                }`}
              >
                {data.summary}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 竞争对手分析显示
  if (
    dataType === "competitor-analysis" ||
    (dataType === "analysis" && data.analysisType === "competitor-analysis")
  ) {
    return (
      <div
        className={`mt-2 p-4 rounded-lg border ${
          isDarkTheme
            ? "bg-black/40 border-amber-500/30"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Network
            className={`w-4 h-4 ${
              isDarkTheme ? "text-amber-400" : "text-amber-600"
            }`}
          />
          <h4
            className={`text-sm font-bold ${
              isDarkTheme ? "text-amber-400" : "text-amber-700"
            }`}
          >
            {isDarkTheme ? "竞争对手分析" : "Competitor Analysis"}
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`p-3 rounded-lg border ${
              isDarkTheme
                ? "bg-black/60 border-amber-500/20"
                : "bg-white border-amber-200"
            }`}
          >
            <div
              className={`text-xs font-semibold mb-1 ${
                isDarkTheme ? "text-amber-400" : "text-amber-700"
              }`}
            >
              {isDarkTheme ? "竞争对手关键词数" : "Competitor Keywords"}
            </div>
            <div
              className={`text-2xl font-bold ${
                isDarkTheme ? "text-white" : "text-gray-800"
              }`}
            >
              {data.competitorKeywordsCount?.toLocaleString() || 0}
            </div>
          </div>
          <div
            className={`p-3 rounded-lg border ${
              isDarkTheme
                ? "bg-black/60 border-amber-500/20"
                : "bg-white border-amber-200"
            }`}
          >
            <div
              className={`text-xs font-semibold mb-1 ${
                isDarkTheme ? "text-amber-400" : "text-amber-700"
              }`}
            >
              {isDarkTheme ? "发现的机会" : "Opportunities Found"}
            </div>
            <div
              className={`text-2xl font-bold ${
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              {data.opportunitiesFound?.toLocaleString() || 0}
            </div>
          </div>
        </div>
        {data.websiteUrl && (
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <div
              className={`text-xs font-semibold mb-1 ${
                isDarkTheme ? "text-white/70" : "text-gray-600"
              }`}
            >
              {isDarkTheme ? "分析网站" : "Analyzed Website"}
            </div>
            <a
              href={data.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs break-all hover:underline ${
                isDarkTheme ? "text-amber-400" : "text-amber-600"
              }`}
            >
              {data.websiteUrl}
            </a>
          </div>
        )}
      </div>
    );
  }
  if (dataType === "keywords") {
    return (
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr
              className={`border-b ${
                isDarkTheme
                  ? "border-emerald-500/30 bg-black"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <th
                className={`py-2 px-3 text-left font-semibold ${
                  isDarkTheme ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                Keyword
              </th>
              <th
                className={`py-2 px-3 text-left font-semibold ${
                  isDarkTheme ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                Translation
              </th>
              <th
                className={`py-2 px-3 text-left font-semibold ${
                  isDarkTheme ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                Intent
              </th>
              <th
                className={`py-2 px-3 text-left font-semibold ${
                  isDarkTheme ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                Volume
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item: any, i: number) => (
              <tr
                key={i}
                className={`border-b ${
                  isDarkTheme
                    ? "border-emerald-500/20 hover:bg-emerald-500/5"
                    : "border-gray-200 hover:bg-emerald-50"
                }`}
              >
                <td
                  className={`py-2 px-3 ${
                    isDarkTheme ? "text-white" : "text-gray-800"
                  }`}
                >
                  {item.keyword}
                </td>
                <td
                  className={`py-2 px-3 ${
                    isDarkTheme ? "text-white/80" : "text-gray-600"
                  }`}
                >
                  {item.translation}
                </td>
                <td
                  className={`py-2 px-3 ${
                    isDarkTheme ? "text-white/80" : "text-gray-600"
                  }`}
                >
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {item.intent}
                  </span>
                </td>
                <td
                  className={`py-2 px-3 font-mono ${
                    isDarkTheme ? "text-white" : "text-gray-800"
                  }`}
                >
                  {item.volume?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (dataType === "analysis") {
    // Single item or array of items
    const items = Array.isArray(data) ? data : [data];

    return (
      <div className="space-y-3 mt-2">
        {items.map((data, idx) => (
          <div key={idx} className="space-y-3">
            {/* Analysis Result Cards */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-3 rounded-lg border ${
                  isDarkTheme
                    ? "bg-black border-emerald-500/30"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`text-[10px] font-bold mb-1 ${
                    isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                  }`}
                >
                  PROBABILITY
                </div>
                <div
                  className={`text-lg font-bold ${
                    data.probability === "High"
                      ? isDarkTheme
                        ? "text-emerald-400"
                        : "text-emerald-600"
                      : data.probability === "Medium"
                      ? isDarkTheme
                        ? "text-yellow-400"
                        : "text-yellow-600"
                      : isDarkTheme
                      ? "text-red-400"
                      : "text-red-600"
                  }`}
                >
                  {data.probability || "N/A"}
                </div>
              </div>
              <div
                className={`p-3 rounded-lg border ${
                  isDarkTheme
                    ? "bg-black border-emerald-500/30"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div
                  className={`text-[10px] font-bold mb-1 ${
                    isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                  }`}
                >
                  DOMAIN TYPE
                </div>
                <div
                  className={`text-sm ${
                    isDarkTheme ? "text-white" : "text-gray-800"
                  }`}
                >
                  {data.topDomainType || "Unknown"}
                </div>
              </div>
            </div>

            {/* SERP Results */}
            {data.topSerpSnippets && data.topSerpSnippets.length > 0 && (
              <div
                className={`p-3 rounded-lg border ${
                  isDarkTheme
                    ? "bg-black border-emerald-500/30"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${
                    isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                  }`}
                >
                  🔍 TOP GOOGLE RESULTS ({data.serpResultCount || "N/A"} total)
                </div>
                <div className="space-y-2">
                  {data.topSerpSnippets.map((snippet: any, i: number) => (
                    <div
                      key={i}
                      className={`p-2 rounded border ${
                        isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div
                        className={`text-xs font-medium mb-1 ${
                          isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                        }`}
                      >
                        {snippet.title}
                      </div>
                      <div
                        className={`text-[10px] mb-1 ${
                          isDarkTheme ? "text-emerald-500/70" : "text-gray-500"
                        }`}
                      >
                        {snippet.url}
                      </div>
                      <div
                        className={`text-xs line-clamp-2 ${
                          isDarkTheme ? "text-white/90" : "text-gray-600"
                        }`}
                      >
                        {snippet.snippet}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reasoning */}
            {data.reasoning && (
              <div
                className={`p-3 rounded-lg border ${
                  isDarkTheme
                    ? "bg-black border-emerald-500/20"
                    : "bg-white border-gray-200"
                }`}
              >
                <div
                  className={`text-[10px] font-semibold mb-2 uppercase tracking-wider ${
                    isDarkTheme ? "text-white/70" : "text-gray-600"
                  }`}
                >
                  ANALYSIS REASONING
                </div>
                <div
                  className={`text-xs leading-relaxed ${
                    isDarkTheme ? "text-white" : "text-gray-700"
                  }`}
                >
                  {data.reasoning}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const AgentStream = ({
  thoughts,
  t,
  isDarkTheme = true,
  uiLanguage = "en",
}: {
  thoughts: AgentThought[];
  t: any;
  isDarkTheme?: boolean;
  uiLanguage?: "zh" | "en";
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
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
                    : thought.type === "analysis"
                    ? isDarkTheme
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
                    : isDarkTheme
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                ROUND {thought.round}
              </span>
              <span
                className={`text-xs uppercase font-semibold ${
                  isDarkTheme ? "text-white/70" : "text-gray-500"
                }`}
              >
                {thought.type}
              </span>
            </div>
            <p
              className={`text-sm mb-2 font-medium ${
                isDarkTheme ? "text-white" : "text-gray-700"
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
                        ? "bg-black border-emerald-500/20 text-white/90"
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

            {/* Keyword Research Data Cards - Display for each keyword with research data */}
            {thought.type === "analysis" && thought.analyzedKeywords && (
              <div className="mt-2 space-y-2">
                {thought.analyzedKeywords
                  .filter((kw) => kw.serankingData?.is_data_found)
                  .slice(0, 5) // Show top 5 keywords with research data
                  .map((kw) => (
                    <div
                      key={kw.id}
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
                        KEYWORD RESEARCH: {kw.keyword}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div
                          className={`p-2 rounded border ${
                            isDarkTheme
                              ? "bg-black border-emerald-500/20"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div
                            className={`text-[9px] font-bold mb-1 ${
                              isDarkTheme ? "text-white/70" : "text-gray-500"
                            }`}
                          >
                            VOLUME
                          </div>
                          <div
                            className={`text-sm font-bold ${
                              isDarkTheme
                                ? "text-emerald-400"
                                : "text-emerald-600"
                            }`}
                          >
                            {kw.serankingData?.volume?.toLocaleString() ||
                              "N/A"}
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded border ${
                            isDarkTheme
                              ? "bg-black border-emerald-500/20"
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
                              (kw.serankingData?.difficulty || 0) <= 40
                                ? isDarkTheme
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                                : (kw.serankingData?.difficulty || 0) <= 60
                                ? isDarkTheme
                                  ? "text-yellow-400"
                                  : "text-yellow-600"
                                : isDarkTheme
                                ? "text-red-400"
                                : "text-red-600"
                            }`}
                          >
                            {kw.serankingData?.difficulty || "N/A"}
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded border ${
                            isDarkTheme
                              ? "bg-black border-emerald-500/20"
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
                            ${kw.serankingData?.cpc?.toFixed(2) || "N/A"}
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded border ${
                            isDarkTheme
                              ? "bg-black border-emerald-500/20"
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
                              isDarkTheme
                                ? "text-emerald-400"
                                : "text-emerald-600"
                            }`}
                          >
                            {kw.serankingData?.competition?.toFixed(2) || "N/A"}
                          </div>
                        </div>
                      </div>
                      {kw.probability && (
                        <div className="mt-2">
                          <div
                            className={`text-[9px] font-bold mb-1 ${
                              isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                          >
                            PROBABILITY
                          </div>
                          <div
                            className={`text-xs font-bold px-2 py-1 rounded inline-block ${
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
                      )}
                    </div>
                  ))}
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

            {/* 联网搜索结果 */}
            {thought.searchResults && thought.searchResults.length > 0 && (
              <div className="mt-2">
                <GoogleSearchResults
                  results={thought.searchResults}
                  isDarkTheme={isDarkTheme}
                  uiLanguage={uiLanguage}
                />
              </div>
            )}

            {/* Table Display */}
            {/* {thought.table && <div className="mt-2">{thought.table}</div>} */}
            {thought.data && thought.dataType && (
              <div className="mt-2">
                {renderAgentDataTable(
                  thought.data,
                  // 如果 data 中有 analysisType，使用它作为 dataType
                  thought.data.analysisType || thought.dataType,
                  isDarkTheme
                )}
              </div>
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
            ? "border-emerald-500/30 text-white/90"
            : "border-gray-200 text-gray-500"
        }`}
      >
        <Languages className="w-3 h-3 text-emerald-500" />
        <span>Cross-Market Insights Stream</span>
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
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
                    : thought.type === "seranking"
                    ? isDarkTheme
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-orange-100 text-orange-700"
                    : thought.type === "serp-search"
                    ? isDarkTheme
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
                    : thought.type === "intent-analysis"
                    ? isDarkTheme
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
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
                  isDarkTheme ? "text-white/90" : "text-gray-600"
                }`}
              >
                {thought.keyword}
              </span>
            </div>
            <p
              className={`text-sm mb-2 ${
                isDarkTheme ? "text-white" : "text-gray-700"
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
                            ? "bg-black border-emerald-500/20"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${
                            isDarkTheme ? "text-white/70" : "text-gray-500"
                          }`}
                        >
                          VOLUME
                        </div>
                        <div
                          className={`text-sm font-bold ${
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          }`}
                        >
                          {thought.serankingData.volume?.toLocaleString() ||
                            "N/A"}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border ${
                          isDarkTheme
                            ? "bg-black border-emerald-500/20"
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
                            ? "bg-black border-emerald-500/20"
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
                            ? "bg-black border-emerald-500/20"
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
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
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
                      ? "bg-black border-emerald-500/30"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold mb-1 ${
                      isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                    }`}
                  >
                    USER INTENT
                  </div>
                  <p
                    className={`text-xs ${
                      isDarkTheme ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {thought.intentData.searchIntent}
                  </p>
                </div>
                <div
                  className={`p-2 rounded border ${
                    isDarkTheme
                      ? "bg-black border-emerald-500/30"
                      : "bg-emerald-50 border-emerald-200"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold mb-1 ${
                      isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                    }`}
                  >
                    INTENT vs SERP
                  </div>
                  <p
                    className={`text-xs ${
                      isDarkTheme ? "text-white" : "text-gray-700"
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
                      ? "border-emerald-500/30 bg-black"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="space-y-2 p-2">
                    {thought.serpSnippets.slice(0, 3).map((snippet, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs ${
                          isDarkTheme
                            ? "bg-black border-emerald-500/20"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div
                          className={`font-medium truncate ${
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          }`}
                        >
                          {snippet.title}
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            isDarkTheme
                              ? "text-emerald-500/70"
                              : "text-emerald-600"
                          }`}
                        >
                          {snippet.url}
                        </div>
                        <div
                          className={`mt-1 line-clamp-2 ${
                            isDarkTheme ? "text-white/90" : "text-gray-600"
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
                    ? "bg-black border-emerald-500/30"
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
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
                    : thought.type === "keyword-extraction"
                    ? isDarkTheme
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
                    : thought.type === "serp-verification"
                    ? isDarkTheme
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
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
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-emerald-100 text-emerald-700 border-emerald-300"
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
                <div className="mt-2 mb-2 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 p-3 rounded-md border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 font-bold mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    SE RANKING DATA
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {thought.data.serankingData.volume !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${
                          isDarkTheme
                            ? "bg-black border-emerald-500/20"
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
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
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
                            ? "bg-black border-emerald-500/20"
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
                              ? "text-emerald-400"
                              : "text-emerald-600"
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
                            ? "bg-black border-emerald-500/20"
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
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
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
                            ? "bg-black border-emerald-500/20"
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
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
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
                        ? "border-emerald-500/30 bg-black"
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
                                ? "bg-black border-emerald-500/20"
                                : "bg-white border-gray-200"
                            }`}
                          >
                            <div
                              className={`font-medium truncate ${
                                isDarkTheme
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
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
                      ? "bg-black border-emerald-500/20"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold border ${
                        thought.data.probability === ProbabilityLevel.HIGH
                          ? isDarkTheme
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-emerald-100 text-emerald-700 border-emerald-300"
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
  onDelete,
  t,
  isDarkTheme = true,
}: {
  workflowDef: any;
  currentConfig: WorkflowConfig | null;
  allConfigs: WorkflowConfig[];
  onSave: (config: WorkflowConfig) => Promise<void>;
  onLoad: (configId: string) => void;
  onReset: () => void;
  onDelete: (configId: string) => Promise<void>;
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

  const handleSaveConfig = async () => {
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

    console.log("[handleSaveConfig] Calling onSave with:", newConfig);
    console.log("[handleSaveConfig] onSave function:", onSave);
    console.log("[handleSaveConfig] onSave type:", typeof onSave);

    if (!onSave || typeof onSave !== "function") {
      console.error("[handleSaveConfig] onSave is not a function!", onSave);
      alert("保存功能未正确初始化，请刷新页面重试");
      return;
    }

    try {
      console.log("[handleSaveConfig] About to call onSave...");
      await onSave(newConfig);
      console.log("[handleSaveConfig] onSave completed successfully");
      setConfigName("");
    } catch (error) {
      console.error("[handleSaveConfig] Save failed:", error);
      alert(`保存失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
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
          ? "bg-black/20 border-emerald-500/20"
          : "bg-white border-emerald-200"
      }`}
    >
      <div className="mb-4">
        <h3
          className={`text-lg font-bold flex items-center gap-2 ${
            isDarkTheme ? "text-white" : "text-gray-900"
          }`}
        >
          <BrainCircuit className="w-5 h-5 text-emerald-400" />
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
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-emerald-300 bg-emerald-50"
                  : isDarkTheme
                  ? "border-emerald-500/20 bg-black/40"
                  : "border-emerald-200 bg-gray-50"
              } ${!node.configurable ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                        node.type === "agent"
                          ? "bg-emerald-500 text-black"
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
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-emerald-100 text-emerald-700"
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
                                ? "border-emerald-500/30 bg-black/60 text-white placeholder:text-slate-500 focus:ring-emerald-500/50"
                                : "border-emerald-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-emerald-500"
                            }`}
                            placeholder={t.editPrompt}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingNodeId(null)}
                              className="px-3 py-1 bg-emerald-500 text-black rounded text-xs hover:bg-emerald-600"
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
                              ? "bg-black/60 border-emerald-500/30 hover:border-emerald-400"
                              : "bg-gray-50 border-emerald-300 hover:border-emerald-400"
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
                <ArrowRight className="w-5 h-5 text-emerald-500/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Configuration Management */}
      <div className="border-t border-emerald-500/20 pt-4 space-y-4">
        {/* Save New Config */}
        <div className="flex gap-2">
          <input
            type="text"
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder={t.configNamePlaceholder}
            className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
              isDarkTheme
                ? "border-emerald-500/30 bg-black/60 text-white placeholder:text-slate-500 focus:ring-emerald-500/50"
                : "border-emerald-300 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-emerald-500"
            }`}
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("[Save Button] Clicked, calling handleSaveConfig");
              handleSaveConfig();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded hover:bg-emerald-600 text-sm font-medium"
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
                        ? "border-emerald-500/50 bg-emerald-500/20"
                        : "border-emerald-400 bg-emerald-100"
                      : isDarkTheme
                      ? "border-emerald-500/20 bg-black/40"
                      : "border-emerald-200 bg-gray-50"
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
                      <span className="text-xs bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded">
                        {t.currentlyUsing}
                      </span>
                    )}
                    <button
                      onClick={() => onLoad(config.id)}
                      className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30"
                      title={t.loadWorkflowConfig || "加载配置"}
                    >
                      <FolderOpen className="w-3 h-3" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (
                          confirm(t.deleteConfirm || "确定要删除此配置吗？")
                        ) {
                          console.log(
                            "[WorkflowConfigPanel] Deleting config:",
                            config.id
                          );
                          try {
                            await onDelete(config.id);
                          } catch (error) {
                            console.error(
                              "[WorkflowConfigPanel] Delete failed:",
                              error
                            );
                          }
                        }
                      }}
                      className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                      title={t.deleteConfig || "删除配置"}
                    >
                      <Trash2 className="w-3 h-3" />
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

export default function App() {
  const [state, setState] = useState<AppState>({
    // Task Management
    taskManager: {
      tasks: [],
      activeTaskId: null,
      maxTasks: 5,
    },

    step: "content-generation",
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

    // Batch Analysis
    batchKeywords: [],
    batchThoughts: [],
    batchCurrentIndex: 0,
    batchTotalCount: 0,
    batchInputKeywords: "",

    // Deep Dive
    deepDiveThoughts: [],
    logs: [],
    isDeepDiving: false,
    deepDiveProgress: 0,
    deepDiveCurrentStep: "",
    currentStrategyReport: null,
    deepDiveKeyword: null,
    showDeepDiveModal: false,
    showDetailedAnalysisModal: false,

    // Config
    uiLanguage: "en" as UILanguage,
    genPrompt: DEFAULT_GEN_PROMPT_EN,
    analyzePrompt: DEFAULT_ANALYZE_PROMPT_EN,
    showPrompts: false,
    showPromptTranslation: false,
    translatedGenPrompt: null,
    translatedAnalyzePrompt: null,
    agentConfigs: [],
    currentConfigId: null,
    workflowConfigs: [],
    currentWorkflowConfigIds: {},
    deepDiveConfigs: [],
    currentDeepDiveConfigId: null,
    deepDivePrompt: DEFAULT_DEEP_DIVE_PROMPT_EN,

    // Article Generator
    articleGeneratorState: {
      keyword: "",
      tone: "professional",
      targetAudience: "beginner",
      visualStyle: "realistic",
      targetMarket: "global",
      isGenerating: false,
      progress: 0,
      currentStage: "input",
      streamEvents: [],
      finalArticle: null,
    },

    // Website Generator
    generatedWebsite: null,
    isGeneratingWebsite: false,
    showWebsitePreview: false,
    websiteMessages: [],
    isOptimizing: false,
    websiteGenerationProgress: null,
    showSuccessPrompt: false,

    // Content Generation
    contentGeneration: {
      activeTab: "my-website" as const,
      website: null,
      onboardingStep: 0,
      websiteData: null,
    },

    // UI State
    isSidebarCollapsed: false,
  });

  // Batch translate and analyze state
  const [batchInput, setBatchInput] = useState("");
  const [articleGeneratorInput, setArticleGeneratorInput] = useState("");
  const [activeTab, setActiveTab] = useState<
    "mining" | "batch" | "articleGenerator"
  >("mining");
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true); // Theme toggle state
  const [showMiningGuide, setShowMiningGuide] = useState(false); // 挖词引导模态框
  const [selectedWebsite, setSelectedWebsite] = useState<any | null>(null); // Selected website for input page
  const [manualWebsiteUrl, setManualWebsiteUrl] = useState(""); // Manual website URL input
  const [urlValidationStatus, setUrlValidationStatus] = useState<
    "idle" | "valid" | "invalid" | "validating"
  >("idle"); // URL validation status
  const [miningMode, setMiningMode] = useState<
    "blue-ocean" | "existing-website-audit"
  >("blue-ocean"); // 挖掘模式
  const urlValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showWebsiteDropdown, setShowWebsiteDropdown] = useState(false); // Website dropdown visibility
  const [websiteListData, setWebsiteListData] = useState<{
    websites: Array<{
      id: string;
      url: string;
      isDefault: boolean;
    }>;
    currentWebsite: {
      id: string;
      url: string;
      isDefault: boolean;
    } | null;
  } | null>(null); // Website list data
  // Batch mode website selection state
  const [batchSelectedWebsite, setBatchSelectedWebsite] = useState<any | null>(
    null
  ); // Selected website for batch mode
  const [batchManualWebsiteUrl, setBatchManualWebsiteUrl] = useState(""); // Manual website URL input for batch mode
  const [batchUrlValidationStatus, setBatchUrlValidationStatus] = useState<
    "idle" | "valid" | "invalid" | "validating"
  >("idle"); // URL validation status for batch mode
  const [showBatchWebsiteDropdown, setShowBatchWebsiteDropdown] =
    useState(false); // Website dropdown visibility for batch mode
  const batchUrlValidationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to normalize URL (support formats like "302.ai" or "www.302.ai")
  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return trimmed;

    // If already has protocol, return as is
    if (trimmed.match(/^https?:\/\//i)) {
      return trimmed;
    }

    // If starts with //, add https:
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }

    // Otherwise, add https://
    return `https://${trimmed}`;
  };

  // Auto-validate URL with debounce
  useEffect(() => {
    // Clear previous timeout
    if (urlValidationTimeoutRef.current) {
      clearTimeout(urlValidationTimeoutRef.current);
    }

    // If input is empty, reset status
    if (!manualWebsiteUrl.trim()) {
      setUrlValidationStatus("idle");
      return;
    }

    // Set validating status
    setUrlValidationStatus("validating");

    // Debounce validation (wait 800ms after user stops typing)
    urlValidationTimeoutRef.current = setTimeout(() => {
      const trimmed = manualWebsiteUrl.trim();
      if (!trimmed) {
        setUrlValidationStatus("idle");
        return;
      }

      try {
        const normalizedUrl = normalizeUrl(trimmed);
        const urlObj = new URL(normalizedUrl);

        // URL is valid, automatically set as selected website
        setSelectedWebsite({
          id: `manual-${Date.now()}`,
          url: normalizedUrl,
          domain: urlObj.hostname.replace(/^www\./, ""),
          isDefault: false,
        });
        setUrlValidationStatus("valid");
      } catch (e) {
        // URL is invalid
        setUrlValidationStatus("invalid");
        setSelectedWebsite(null); // Clear selection if invalid
      }
    }, 800);

    // Cleanup function
    return () => {
      if (urlValidationTimeoutRef.current) {
        clearTimeout(urlValidationTimeoutRef.current);
      }
    };
  }, [manualWebsiteUrl]);

  // Load website list for dropdown
  const loadWebsiteList = async (mode?: "mining" | "batch") => {
    try {
      const response = await fetch(`/api/websites/list?user_id=1`);
      if (response.ok) {
        const result = await response.json();
        setWebsiteListData(result.data);
        // Auto-select current website if available and no selection yet AND user is not typing
        // Only auto-select if there's no manual input and no existing selection
        if (mode === "batch") {
          // For batch mode (cross-market insight)
          if (
            !batchSelectedWebsite &&
            !batchManualWebsiteUrl.trim() &&
            result.data?.currentWebsite
          ) {
            setBatchSelectedWebsite(result.data.currentWebsite);
          }
        } else {
          // For mining mode (default)
          if (
            !selectedWebsite &&
            !manualWebsiteUrl.trim() &&
            result.data?.currentWebsite
          ) {
            setSelectedWebsite(result.data.currentWebsite);
          }
        }
      } else {
        console.error("[App] Failed to load websites list");
      }
    } catch (error) {
      console.error("[App] Failed to load websites list:", error);
    }
  };

  // Auto-validate URL with debounce for batch mode
  useEffect(() => {
    // Clear previous timeout
    if (batchUrlValidationTimeoutRef.current) {
      clearTimeout(batchUrlValidationTimeoutRef.current);
    }

    // If input is empty, reset status
    if (!batchManualWebsiteUrl.trim()) {
      setBatchUrlValidationStatus("idle");
      return;
    }

    // Set validating status
    setBatchUrlValidationStatus("validating");

    // Debounce validation (wait 800ms after user stops typing)
    batchUrlValidationTimeoutRef.current = setTimeout(() => {
      const trimmed = batchManualWebsiteUrl.trim();
      if (!trimmed) {
        setBatchUrlValidationStatus("idle");
        return;
      }

      try {
        const normalizedUrl = normalizeUrl(trimmed);
        const urlObj = new URL(normalizedUrl);

        // URL is valid, automatically set as selected website
        setBatchSelectedWebsite({
          id: `manual-${Date.now()}`,
          url: normalizedUrl,
          domain: urlObj.hostname.replace(/^www\./, ""),
          isDefault: false,
        });
        setBatchUrlValidationStatus("valid");
      } catch (e) {
        // URL is invalid
        setBatchUrlValidationStatus("invalid");
        setBatchSelectedWebsite(null); // Clear selection if invalid
      }
    }, 800);

    // Cleanup function
    return () => {
      if (batchUrlValidationTimeoutRef.current) {
        clearTimeout(batchUrlValidationTimeoutRef.current);
      }
    };
  }, [batchManualWebsiteUrl]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        showWebsiteDropdown &&
        !target.closest(".website-dropdown-container")
      ) {
        setShowWebsiteDropdown(false);
      }
      if (
        showBatchWebsiteDropdown &&
        !target.closest(".batch-website-dropdown-container")
      ) {
        setShowBatchWebsiteDropdown(false);
      }
    };

    if (showWebsiteDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showWebsiteDropdown]);

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

  // Load theme and UI language from localStorage on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setIsDarkTheme(savedTheme === "dark");
      }
      const savedCollapsed = localStorage.getItem("sidebar_collapsed");
      if (savedCollapsed) {
        setState((prev) => ({
          ...prev,
          isSidebarCollapsed: savedCollapsed === "true",
        }));
      }
      const savedUiLanguage = localStorage.getItem("ui_language");
      if (savedUiLanguage === "zh" || savedUiLanguage === "en") {
        setState((prev) => ({ ...prev, uiLanguage: savedUiLanguage }));
      }
    } catch (e) {
      console.error("Error loading settings from localStorage:", e);
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

    // Load workflow configs from database
    const loadWorkflowConfigs = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        // Not authenticated, skip loading
        return;
      }

      try {
        const response = await makeWorkflowConfigRequest(
          "/api/workflow-configs",
          {
            method: "GET",
          }
        );

        if (response.ok) {
          const result = await response.json();
          setState((prev) => ({
            ...prev,
            workflowConfigs: result.data || [],
          }));
        } else {
          console.error("Failed to load workflow configs from API");
        }
      } catch (e) {
        console.error("Failed to load workflow configs", e);
      }
    };

    loadWorkflowConfigs();
  }, []);

  // Load workflow configs when user logs in
  useEffect(() => {
    if (authenticated && user) {
      const loadWorkflowConfigs = async () => {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        try {
          // 使用本地 API 端点
          const response = await fetch("/api/workflow-configs", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          if (response.ok) {
            const result = await response.json();
            setState((prev) => ({
              ...prev,
              workflowConfigs: result.data || [],
            }));

            // Migrate old localStorage configs to database (one-time)
            const oldConfigs = localStorage.getItem(
              "google_seo_workflow_configs"
            );
            if (oldConfigs) {
              try {
                const oldConfigsArray: WorkflowConfig[] =
                  JSON.parse(oldConfigs);
                const token = localStorage.getItem("auth_token");

                if (token && oldConfigsArray.length > 0) {
                  // Migrate each config to database
                  for (const oldConfig of oldConfigsArray) {
                    try {
                      await makeWorkflowConfigRequest("/api/workflow-configs", {
                        method: "POST",
                        body: JSON.stringify({
                          workflowId: oldConfig.workflowId,
                          name: oldConfig.name,
                          nodes: oldConfig.nodes,
                        }),
                      });
                    } catch (e) {
                      console.error("Failed to migrate config:", e);
                    }
                  }

                  // Clear old localStorage after migration
                  localStorage.removeItem("google_seo_workflow_configs");
                  console.log(
                    `Migrated ${oldConfigsArray.length} configs to database`
                  );

                  // Reload configs from database
                  const reloadResponse = await makeWorkflowConfigRequest(
                    "/api/workflow-configs",
                    {
                      method: "GET",
                    }
                  );
                  if (reloadResponse.ok) {
                    const reloadResult = await reloadResponse.json();
                    setState((prev) => ({
                      ...prev,
                      workflowConfigs: reloadResult.data || [],
                    }));
                  }
                }
              } catch (e) {
                console.error("Failed to parse old configs for migration", e);
              }
            }
          }
        } catch (e) {
          console.error("Failed to load workflow configs", e);
        }
      };

      loadWorkflowConfigs();
    }
  }, [authenticated, user]);

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
    state.articleGeneratorState.isGenerating,
    state.articleGeneratorState.streamEvents.length,
    state.articleGeneratorState.finalArticle,
    state.articleGeneratorState.currentStage,
  ]);

  // Sync activeTab with current task type when switching tasks
  useEffect(() => {
    if (state.taskManager.activeTaskId) {
      const activeTask = state.taskManager.tasks.find(
        (t) => t.id === state.taskManager.activeTaskId
      );
      if (activeTask && state.step === "input") {
        // Map task type to activeTab value
        const tabMap: Record<
          TaskType,
          "mining" | "batch" | "articleGenerator"
        > = {
          mining: "mining",
          batch: "batch",
          "article-generator": "articleGenerator",
        };
        setActiveTab(tabMap[activeTask.type]);
      }
    }
  }, [state.taskManager.activeTaskId, state.step]);

  // Save archive helper
  const saveToArchive = (currentState: AppState) => {
    if (currentState.keywords.length === 0) return;

    // 获取当前任务的网站信息（如果是存量拓新模式）
    const currentTask = currentState.taskManager.tasks.find(
      (t) => t.id === currentState.taskManager.activeTaskId
    );
    const miningState = currentTask?.miningState;

    const newEntry: ArchiveEntry = {
      id: `arc-${Date.now()}`,
      timestamp: Date.now(),
      seedKeyword: currentState.seedKeyword,
      keywords: currentState.keywords,
      miningRound: currentState.miningRound,
      targetLanguage: currentState.targetLanguage,
      // 保存存量拓新模式的数据
      miningMode: miningState?.miningMode,
      websiteId: miningState?.websiteId,
      websiteUrl: miningState?.websiteUrl,
      websiteDomain: miningState?.websiteDomain,
      websiteAnalysis: miningState?.websiteAnalysis,
      competitorAnalysis: miningState?.competitorAnalysis,
      agentThoughts: currentState.agentThoughts, // 保存思维流
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
    setState((prev) => {
      const updatedState = {
        ...prev,
        seedKeyword: entry.seedKeyword,
        targetLanguage: entry.targetLanguage || "en",
        keywords: entry.keywords,
        miningRound: entry.miningRound,
        step: "results" as const,
        agentThoughts: entry.agentThoughts || [], // 加载思维流
        logs: [],
        filterLevel: ProbabilityLevel.HIGH,
      };

      // 如果是存量拓新模式，恢复网站信息到当前任务
      if (entry.miningMode === "existing-website-audit" && entry.websiteUrl) {
        const currentTask = prev.taskManager.tasks.find(
          (t) => t.id === prev.taskManager.activeTaskId
        );
        if (currentTask && currentTask.miningState) {
          const updatedTasks = updatedState.taskManager.tasks.map((task) => {
            if (task.id === prev.taskManager.activeTaskId && task.miningState) {
              task.miningState.websiteId = entry.websiteId;
              task.miningState.websiteUrl = entry.websiteUrl;
              task.miningState.websiteDomain = entry.websiteDomain;
              task.miningState.miningMode = entry.miningMode;
              task.miningState.websiteAnalysis = entry.websiteAnalysis;
              task.miningState.competitorAnalysis = entry.competitorAnalysis;
            }
            return task;
          });
          updatedState.taskManager = {
            ...updatedState.taskManager,
            tasks: updatedTasks,
          };
        }
      }

      return updatedState;
    });
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
      // 只有在有 strategyReport 时才显示模态框
      showDetailedAnalysisModal: !!entry.strategyReport,
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
  const saveAgentConfig = async (name: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      addLog("请先登录才能保存配置", "error");
      return;
    }

    // New unified system: save as Mining Workflow Config
    const miningWorkflow = MINING_WORKFLOW;

    const configData = {
      workflowId: "mining",
      name:
        name.trim() ||
        `Mining Config ${
          state.workflowConfigs.filter((c) => c.workflowId === "mining")
            .length + 1
        }`,
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

    try {
      const response = await makeWorkflowConfigRequest(
        "/api/workflow-configs",
        {
          method: "POST",
          body: JSON.stringify(configData),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("[saveAgentConfig] API error:", {
          status: response.status,
          error: error,
        });
        throw new Error(error.message || error.error || "保存失败");
      }

      const result = await response.json();
      console.log("[saveAgentConfig] Success:", result);
      const newConfig = result.data;

      const updatedConfigs = [
        newConfig,
        ...state.workflowConfigs.filter((c) => c.id !== newConfig.id),
      ].slice(0, 50);
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
    } catch (error: any) {
      console.error("Failed to save agent config:", error);
      addLog(`保存失败: ${error.message}`, "error");
    }
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

  const updateAgentConfig = async (id: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      addLog("请先登录才能更新配置", "error");
      return;
    }

    const config = state.workflowConfigs.find(
      (c) => c.id === id && c.workflowId === "mining"
    );
    if (!config) {
      addLog("配置不存在", "error");
      return;
    }

    const updatedNodes = config.nodes.map((node) => ({
      ...node,
      prompt:
        node.id === "mining-gen"
          ? state.genPrompt
          : node.id === "mining-analyze"
          ? state.analyzePrompt
          : node.prompt,
    }));

    try {
      const response = await makeWorkflowConfigRequest(
        `/api/workflow-configs/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            nodes: updatedNodes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "更新失败");
      }

      const result = await response.json();
      const updatedConfig = result.data;

      const updatedConfigs = state.workflowConfigs.map((cfg) =>
        cfg.id === id ? updatedConfig : cfg
      );
      setState((prev) => ({ ...prev, workflowConfigs: updatedConfigs }));
      addLog("Mining config updated.", "success");
    } catch (error: any) {
      console.error("Failed to update agent config:", error);
      addLog(`更新失败: ${error.message}`, "error");
    }
  };

  const deleteAgentConfig = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("auth_token");
    if (!token) {
      addLog("请先登录才能删除配置", "error");
      return;
    }

    try {
      const response = await makeWorkflowConfigRequest(
        `/api/workflow-configs/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "删除失败");
      }

      const updated = state.workflowConfigs.filter((c) => c.id !== id);
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
      addLog("Config deleted.", "info");
    } catch (error: any) {
      console.error("Failed to delete agent config:", error);
      addLog(`删除失败: ${error.message}`, "error");
    }
  };

  // Typewriter effect helper function
  const typeWriterLog = async (
    fullMessage: string,
    taskId?: string,
    speed: number = 30
  ) => {
    const lines = fullMessage.split("\n");
    let currentLog = "";

    for (const line of lines) {
      if (line.trim()) {
        currentLog += line + "\n";
        addLog(currentLog.trim(), "info", taskId);
        await new Promise((resolve) => setTimeout(resolve, speed));
      }
    }
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
      batch: state.uiLanguage === "zh" ? "洞察" : "Insight",
      "article-generator": state.uiLanguage === "zh" ? "图文" : "Article",
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
      case "article-generator":
        // 根据targetMarket自动设置targetLanguage
        const getTargetLanguageFromMarket = (
          market: string
        ): TargetLanguage => {
          const marketToLanguage: Record<string, TargetLanguage> = {
            global: "en",
            us: "en",
            uk: "en",
            ca: "en",
            au: "en",
            de: "de",
            fr: "fr",
            jp: "ja",
            cn: "zh",
          };
          return marketToLanguage[market] || "en";
        };

        const articleTargetMarket = params.targetMarket || "global";
        baseTask.targetLanguage =
          getTargetLanguageFromMarket(articleTargetMarket);

        baseTask.articleGeneratorState = {
          keyword:
            typeof params.keyword === "string"
              ? params.keyword
              : params.keyword?.keyword || "",
          tone: "professional",
          targetAudience: "beginner",
          visualStyle: "realistic",
          targetMarket: articleTargetMarket,
          isGenerating: false,
          progress: 0,
          currentStage: "input",
          streamEvents: [],
          finalArticle: null,
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
            // 保留网站信息和分析数据
            websiteId: updated.miningState.websiteId,
            websiteUrl: updated.miningState.websiteUrl,
            websiteDomain: updated.miningState.websiteDomain,
            miningMode: updated.miningState.miningMode,
            websiteAnalysis: updated.miningState.websiteAnalysis,
            competitorAnalysis: updated.miningState.competitorAnalysis,
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
      case "article-generator":
        if (updated.articleGeneratorState) {
          updated.articleGeneratorState = {
            ...currentState.articleGeneratorState,
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
        case "article-generator":
          return {
            ...prev,
            ...baseState,
            step: "article-generator",
            articleGeneratorState:
              task.articleGeneratorState || prev.articleGeneratorState,
            // Clear other task types' state
            seedKeyword: "",
            keywords: [],
            miningRound: 0,
            agentThoughts: [],
            isMining: false,
            miningSuccess: false,
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
        // 确保所有任务都不是active，默认显示"我的网站"
        const tasksWithNoActive = tasks.map((t) => ({
          ...t,
          isActive: false,
        }));

        setState((prev) => ({
          ...prev,
          taskManager: {
            ...prev.taskManager,
            tasks: tasksWithNoActive,
            activeTaskId: null, // 确保没有active任务
          },
          // 确保显示"我的网站"页面
          step: "content-generation",
          contentGeneration: {
            ...prev.contentGeneration,
            activeTab: "my-website",
          },
        }));
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

        case "article-generator":
          // Determine step based on article generator state
          let articleStep: AppState["step"] = "article-generator";

          newState = {
            ...prev,
            ...baseState,
            step: articleStep,
            articleGeneratorState:
              targetTask.articleGeneratorState || prev.articleGeneratorState,
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
      // No tasks left, go to content generation screen
      setTimeout(() => {
        setState((prev) => ({ ...prev, step: "content-generation" }));
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

  // 挖词引导处理函数
  const handleMiningGuideStart = (config: MiningConfig) => {
    console.log("Mining config:", config);

    // 更新state以保存配置
    setState((prev) => ({
      ...prev,
      miningConfig: {
        industry: config.industry,
        additionalSuggestions: config.additionalSuggestions,
      },
    }));

    // 关闭模态框
    setShowMiningGuide(false);

    // 显示成功日志
    addLog(
      `✨ ${
        state.uiLanguage === "zh" ? "配置已保存" : "Configuration saved"
      }: ${state.uiLanguage === "zh" ? "行业" : "Industry"}="${
        config.industry
      }"${
        config.additionalSuggestions
          ? `, ${state.uiLanguage === "zh" ? "建议" : "Suggestions"}="${
              config.additionalSuggestions
            }"`
          : ""
      }`,
      "success",
      state.taskManager.activeTaskId || undefined
    );
  };

  const startMining = async (continueExisting = false) => {
    // Mode-specific validation
    if (miningMode === "blue-ocean" && !state.seedKeyword.trim()) {
      return;
    }
    if (
      miningMode === "existing-website-audit" &&
      !selectedWebsite &&
      !manualWebsiteUrl.trim()
    ) {
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? "请先选择或输入要分析的网站"
            : "Please select or enter a website to analyze",
      }));
      return;
    }

    // Check authentication
    if (!authenticated) {
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? "请先登录才能使用关键词挖掘功能"
            : "Please login to use keyword mining",
      }));
      return;
    }

    // Handle existing-website-audit mode
    if (miningMode === "existing-website-audit") {
      await startWebsiteAudit(continueExisting);
      return;
    }

    // Continue with blue-ocean mode (existing logic)
    if (!state.seedKeyword.trim()) return;

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

  // Start Website Audit (存量拓新)
  const startWebsiteAudit = async (continueExisting = false) => {
    // 获取当前任务的网站信息（如果是继续挖掘）
    const currentTask = state.taskManager.tasks.find(
      (t) => t.id === state.taskManager.activeTaskId
    );
    const taskWebsiteId = currentTask?.miningState?.websiteId;
    const taskWebsiteUrl = currentTask?.miningState?.websiteUrl;
    const taskMiningMode = currentTask?.miningState?.miningMode;

    // 确定要使用的网站：优先使用任务中保存的网站，否则使用当前选择的网站
    const websiteToUse =
      continueExisting && taskWebsiteUrl
        ? {
            id: taskWebsiteId,
            url: taskWebsiteUrl,
            domain: currentTask?.miningState?.websiteDomain || undefined,
          }
        : selectedWebsite;

    if (!websiteToUse) {
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? "请先选择要分析的网站"
            : "Please select a website to analyze",
      }));
      return;
    }

    // Check authentication
    if (!authenticated) {
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? "请先登录才能使用网站分析功能"
            : "Please login to use website audit",
      }));
      return;
    }

    // Auto-create task if no active task exists
    if (!state.taskManager.activeTaskId) {
      addTask({
        type: "mining",
        seedKeyword: `Website Audit: ${websiteToUse.url}`,
        targetLanguage: state.targetLanguage,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      return;
    }

    const currentTaskId = state.taskManager.activeTaskId;
    stopMiningRef.current = false;

    // 如果是继续挖掘，保留之前的思维流、关键词、轮次等
    const existingMiningState = currentTask?.miningState;
    const shouldContinue =
      continueExisting &&
      existingMiningState &&
      existingMiningState.miningMode === "existing-website-audit" &&
      existingMiningState.websiteUrl === websiteToUse.url;

    setState((prev) => ({
      ...prev,
      step: "mining",
      isMining: true,
      miningSuccess: false,
      error: null,
      logs: shouldContinue ? existingMiningState?.logs || [] : [],
      agentThoughts: shouldContinue
        ? existingMiningState?.agentThoughts || []
        : [],
      miningRound: shouldContinue ? existingMiningState?.miningRound || 0 : 0,
      keywords: shouldContinue ? existingMiningState?.keywords || [] : [],
    }));

    // 保存网站信息到任务状态
    const websiteId = websiteToUse.id?.startsWith("manual-")
      ? `temp-${Date.now()}`
      : websiteToUse.id;
    const websiteDomain =
      websiteToUse.domain ||
      new URL(websiteToUse.url).hostname.replace(/^www\./, "");

    // 更新任务状态，保存网站信息
    setState((prev) => {
      const updatedTasks = prev.taskManager.tasks.map((task) => {
        if (task.id === currentTaskId) {
          if (!task.miningState) {
            task.miningState = {
              seedKeyword: `Website Audit: ${websiteToUse.url}`,
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
          }
          task.miningState.websiteId = websiteId;
          task.miningState.websiteUrl = websiteToUse.url;
          task.miningState.websiteDomain = websiteDomain;
          task.miningState.miningMode = "existing-website-audit";
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
    });

    // 如果是继续挖掘且已经分析过网站，跳过网站分析，直接进行关键词挖掘
    if (
      shouldContinue &&
      existingMiningState?.websiteAnalysis &&
      existingMiningState?.competitorAnalysis
    ) {
      addLog(
        state.uiLanguage === "zh"
          ? `继续挖掘关键词... Round ${
              (existingMiningState.miningRound || 0) + 1
            }`
          : `Continuing keyword mining... Round ${
              (existingMiningState.miningRound || 0) + 1
            }`,
        "info",
        currentTaskId
      );

      // 直接调用关键词生成逻辑（类似 runMiningLoop 但针对存量拓新）
      // 这里需要实现一个类似 runMiningLoop 的函数，但针对存量拓新模式
      // 暂时先调用网站分析API，但后续应该优化为直接生成关键词
    }

    addLog(
      state.uiLanguage === "zh"
        ? `开始分析网站: ${websiteToUse.url}`
        : `Starting website audit: ${websiteToUse.url}`,
      "info",
      currentTaskId
    );

    // Step 1: 网站分析（存量拓新）- 可视化开始（仅在首次分析时显示）
    if (!shouldContinue || !existingMiningState?.websiteAnalysis) {
      addThought(
        "generation",
        state.uiLanguage === "zh"
          ? `开始分析网站: ${websiteToUse.url}`
          : `Starting website audit: ${websiteToUse.url}`,
        undefined,
        currentTaskId
      );
    }

    try {
      // 如果是继续挖掘且已经分析过，跳过网站分析步骤
      if (shouldContinue && existingMiningState?.websiteAnalysis) {
        // 直接进行关键词生成，跳过网站分析
        // 这里需要实现关键词生成逻辑
        return;
      }

      // Step 1.1: 获取网站内容
      addLog(
        state.uiLanguage === "zh"
          ? "📄 步骤 1: 正在获取网站内容..."
          : "📄 Step 1: Fetching website content...",
        "info",
        currentTaskId
      );

      addThought(
        "generation",
        state.uiLanguage === "zh"
          ? "正在使用 Firecrawl 抓取网站内容..."
          : "Scraping website content using Firecrawl...",
        undefined,
        currentTaskId
      );

      // Call website audit API
      const response = await fetch("/api/website-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId: websiteId,
          websiteUrl: websiteToUse.url,
          websiteDomain: websiteDomain,
          targetLanguage: state.targetLanguage,
          uiLanguage: state.uiLanguage,
          wordsPerRound: state.wordsPerRound || 10,
          miningStrategy: state.miningStrategy || "horizontal",
          industry: state.miningConfig?.industry,
          additionalSuggestions: state.miningConfig?.additionalSuggestions,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.keywords) {
        // Step 1.2: 显示网站内容摘要（更详细的显示）
        if (result.analysis?.websiteContentSummary) {
          addLog(
            state.uiLanguage === "zh"
              ? `✅ 网站内容已获取 (${result.analysis.websiteContentSummary.length} 字符)`
              : `✅ Website content fetched (${result.analysis.websiteContentSummary.length} chars)`,
            "success",
            currentTaskId
          );

          addThought(
            "analysis",
            state.uiLanguage === "zh"
              ? `网站内容分析完成，已提取 ${result.analysis.websiteContentSummary.length} 字符的内容摘要。正在分析现有内容覆盖和主题...`
              : `Website content analysis complete, extracted ${result.analysis.websiteContentSummary.length} chars summary. Analyzing existing content coverage and themes...`,
            {
              data: {
                summary: result.analysis.websiteContentSummary,
                url: websiteToUse.url,
                domain: websiteDomain,
                contentLength: result.analysis.websiteContentSummary.length,
                analysisType: "website-content",
              },
              dataType: "analysis",
            },
            currentTaskId
          );

          // 保存网站分析数据到任务状态
          setState((prev) => {
            const updatedTasks = prev.taskManager.tasks.map((task) => {
              if (task.id === currentTaskId && task.miningState) {
                task.miningState.websiteAnalysis = {
                  websiteContentSummary: result.analysis.websiteContentSummary,
                  contentLength: result.analysis.websiteContentSummary.length,
                  url: websiteToUse.url,
                  domain: websiteDomain,
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
          });
        }

        // Step 1.3: 显示竞争对手分析结果（更详细的显示）
        if (result.analysis?.competitorKeywordsCount !== undefined) {
          addLog(
            state.uiLanguage === "zh"
              ? `🔍 步骤 2: 发现 ${result.analysis.competitorKeywordsCount} 个竞争对手关键词`
              : `🔍 Step 2: Found ${result.analysis.competitorKeywordsCount} competitor keywords`,
            "info",
            currentTaskId
          );

          addThought(
            "analysis",
            state.uiLanguage === "zh"
              ? `竞争对手分析完成：发现 ${
                  result.analysis.competitorKeywordsCount
                } 个竞争对手关键词，识别出 ${
                  result.analysis.opportunitiesFound || result.keywords.length
                } 个流量机会（内容缺口、优化机会、扩展方向）`
              : `Competitor analysis complete: Found ${
                  result.analysis.competitorKeywordsCount
                } competitor keywords, identified ${
                  result.analysis.opportunitiesFound || result.keywords.length
                } traffic opportunities (content gaps, optimization opportunities, expansion directions)`,
            {
              data: {
                competitorKeywordsCount:
                  result.analysis.competitorKeywordsCount,
                opportunitiesFound:
                  result.analysis.opportunitiesFound || result.keywords.length,
                analysisType: "competitor-analysis",
                websiteUrl: websiteToUse.url,
              },
              dataType: "analysis",
            },
            currentTaskId
          );

          // 保存竞争对手分析数据到任务状态
          setState((prev) => {
            const updatedTasks = prev.taskManager.tasks.map((task) => {
              if (task.id === currentTaskId && task.miningState) {
                task.miningState.competitorAnalysis = {
                  competitorKeywordsCount:
                    result.analysis.competitorKeywordsCount,
                  opportunitiesFound:
                    result.analysis.opportunitiesFound ||
                    result.keywords.length,
                  websiteUrl: websiteToUse.url,
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
          });
        }

        // Step 1.4: 显示 AI 分析结果（初始关键词列表）
        addLog(
          state.uiLanguage === "zh"
            ? `🤖 步骤 3: AI 正在分析关键词机会...`
            : `🤖 Step 3: AI analyzing keyword opportunities...`,
          "info",
          currentTaskId
        );

        addThought(
          "generation",
          state.uiLanguage === "zh"
            ? `AI 分析完成，发现 ${result.keywords.length} 个关键词机会（待进一步分析）`
            : `AI analysis complete, found ${result.keywords.length} keyword opportunities (pending further analysis)`,
          {
            keywords: result.keywords.map((k: KeywordData) => k.keyword),
            data: result.keywords,
            dataType: "keywords",
          },
          currentTaskId
        );

        addLog(
          state.uiLanguage === "zh"
            ? `✨ 发现 ${result.keywords.length} 个关键词机会`
            : `✨ Found ${result.keywords.length} keyword opportunities`,
          "success",
          currentTaskId
        );

        // Step 2: 开始 Keyword Mining 循环挖掘
        addLog(
          state.uiLanguage === "zh"
            ? `🔄 步骤 2: 开始关键词挖掘循环（基于初始关键词作为种子）...`
            : `🔄 Step 2: Starting keyword mining loop (using initial keywords as seeds)...`,
          "info",
          currentTaskId
        );

        // 使用初始关键词作为种子，进行循环挖掘
        const initialKeywords = result.keywords.map(
          (k: KeywordData) => k.keyword
        );
        await runWebsiteAuditMiningLoop(initialKeywords, currentTaskId);
      } else {
        throw new Error(result.error || "Website audit failed");
      }
    } catch (error: any) {
      console.error("[Website Audit] Error:", error);
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? `网站分析失败: ${error.message}`
            : `Website audit failed: ${error.message}`,
        isMining: false,
      }));
      addLog(
        state.uiLanguage === "zh"
          ? `❌ 错误: ${error.message}`
          : `❌ Error: ${error.message}`,
        "error",
        currentTaskId
      );

      addThought(
        "decision",
        state.uiLanguage === "zh"
          ? `分析失败: ${error.message}`
          : `Analysis failed: ${error.message}`,
        undefined,
        currentTaskId
      );
    }
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

      // Add AI thinking logs
      addLog(
        `💭 ${
          state.uiLanguage === "zh"
            ? `准备分析 "${state.seedKeyword}" 的关键词机会`
            : `Preparing to analyze keyword opportunities for "${state.seedKeyword}"`
        }`,
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
      addLog(`💭 ${thoughtMessage}`, "info", taskId);

      try {
        addLog(
          `🤖 ${
            state.uiLanguage === "zh" ? "AI 正在思考..." : "AI is thinking..."
          }`,
          "info",
          taskId
        );

        const result = await generateKeywords(
          state.seedKeyword,
          state.targetLanguage,
          getWorkflowPrompt("mining", "mining-gen", state.genPrompt),
          allKeywordsRef.current,
          currentRound,
          state.wordsPerRound,
          state.miningStrategy,
          state.userSuggestion,
          state.uiLanguage,
          state.miningConfig?.industry,
          state.miningConfig?.additionalSuggestions
        );

        const generatedKeywords = result.keywords;
        const rawResponse = result.rawResponse;

        // Display AI's raw response with typewriter effect
        if (rawResponse && rawResponse.trim()) {
          addLog(
            state.uiLanguage === "zh"
              ? "以下内容由 keyword generate agent 生成："
              : "Below is generated by keyword generate agent:",
            "info",
            taskId
          );

          // Format JSON for display
          let formattedResponse = rawResponse;
          try {
            const parsed = JSON.parse(rawResponse);
            formattedResponse = JSON.stringify(parsed, null, 2);
          } catch (e) {
            // Not valid JSON, keep as is
          }

          // Typewriter effect - show chunks gradually
          const lines = formattedResponse.split("\n");
          const chunkSize = 5;
          for (let i = 0; i < lines.length; i += chunkSize) {
            const chunk = lines.slice(i, i + chunkSize).join("\n");
            addLog(chunk, "info", taskId);
            // Small delay for typewriter effect
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }

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
          {
            keywords: generatedKeywords.map((k) => k.keyword),
            data: generatedKeywords,
            dataType: "keywords",
            searchResults: result.searchResults, // 添加联网搜索结果
          },
          taskId
        );

        // Add success log with sample keywords
        const sampleKeywords = generatedKeywords
          .slice(0, 3)
          .map((k) => k.keyword)
          .join(", ");
        addLog(
          `✨ ${
            state.uiLanguage === "zh"
              ? `成功生成 ${generatedKeywords.length} 个候选关键词`
              : `Generated ${generatedKeywords.length} candidate keywords`
          }: ${sampleKeywords}...`,
          "success",
          taskId
        );

        addLog(
          `[Round ${currentRound}] Analyzing SERP probability (Google)...`,
          "api",
          taskId
        );
        addLog(
          `🔍 ${
            state.uiLanguage === "zh"
              ? "正在分析搜索引擎结果页面 (SERP) 估算排名概率..."
              : "Analyzing Search Engine Results Page (SERP) to estimate ranking probability..."
          }`,
          "info",
          taskId
        );

        // Real-time streaming: Analyze keywords one by one for real-time display
        const analyzedBatch: KeywordData[] = [];

        addLog(
          `[Round ${currentRound}] Analyzing ${generatedKeywords.length} keywords one by one (real-time streaming)...`,
          "info",
          taskId
        );

        // Process keywords one by one for real-time streaming
        for (let i = 0; i < generatedKeywords.length; i++) {
          if (stopMiningRef.current) {
            addLog("Mining stopped by user.", "warning", taskId);
            break;
          }

          const keyword = generatedKeywords[i];

          addLog(
            `[${i + 1}/${generatedKeywords.length}] Analyzing: "${
              keyword.keyword
            }"...`,
            "info",
            taskId
          );

          try {
            // Analyze single keyword (real-time)
            const singleAnalysis = await analyzeRankingProbability(
              [keyword],
              getWorkflowPrompt(
                "mining",
                "mining-analyze",
                state.analyzePrompt
              ),
              state.uiLanguage,
              state.targetLanguage
            );

            if (singleAnalysis.length > 0) {
              const analyzedKeyword = singleAnalysis[0];
              analyzedBatch.push(analyzedKeyword);

              // Real-time display: Add keyword research data thought if available
              if (analyzedKeyword.serankingData?.is_data_found) {
                addThought(
                  "analysis",
                  `Keyword Research: "${analyzedKeyword.keyword}"`,
                  {
                    analyzedKeywords: [analyzedKeyword],
                    data: [analyzedKeyword],
                    dataType: "analysis",
                  },
                  taskId
                );
              }

              // Real-time display: Add analysis result thought
              addThought(
                "analysis",
                `Analyzed "${analyzedKeyword.keyword}": ${analyzedKeyword.probability} probability`,
                {
                  analyzedKeywords: [analyzedKeyword],
                  data: [analyzedKeyword],
                  dataType: "analysis",
                },
                taskId
              );

              addLog(
                `[${i + 1}/${generatedKeywords.length}] ✅ "${
                  analyzedKeyword.keyword
                }": ${analyzedKeyword.probability}`,
                "success",
                taskId
              );
            }
          } catch (error: any) {
            console.error(
              `Error analyzing keyword "${keyword.keyword}":`,
              error
            );
            addLog(
              `[${i + 1}/${generatedKeywords.length}] ❌ Error analyzing "${
                keyword.keyword
              }": ${error.message}`,
              "error",
              taskId
            );
            // Continue with next keyword even if one fails
          }
        }

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

        // Filter HIGH probability keywords for detailed display
        const highProbKeywords = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.HIGH
        );

        // 收集所有关键词的联网搜索结果并去重
        const allSearchResults: Array<{
          title: string;
          url: string;
          snippet?: string;
        }> = [];
        const seenUrls = new Set<string>();
        analyzedBatch.forEach((keyword) => {
          if (keyword.searchResults) {
            keyword.searchResults.forEach((result) => {
              if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                allSearchResults.push(result);
              }
            });
          }
        });

        // Add summary thought after all keywords are analyzed
        addThought(
          "analysis",
          `Analysis Complete. ${high} High, ${medium} Medium, ${low} Low.`,
          {
            stats: { high, medium, low },
            analyzedKeywords: analyzedBatch,
            table: undefined,
            data: highProbKeywords,
            dataType: "analysis",
            searchResults:
              allSearchResults.length > 0 ? allSearchResults : undefined, // 添加联网搜索结果
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
                    showSuccessPrompt: true,
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
                showSuccessPrompt: true,
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

  // Website Audit Mining Loop (存量拓新的关键词挖掘循环)
  const runWebsiteAuditMiningLoop = async (
    seedKeywords: string[],
    taskId: string
  ) => {
    let currentRound = 0;
    const allKeywords: KeywordData[] = [];

    // 将初始关键词添加到 allKeywords
    const currentTask = state.taskManager.tasks.find((t) => t.id === taskId);
    if (currentTask?.miningState?.keywords) {
      allKeywords.push(...currentTask.miningState.keywords);
    }

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
        state.uiLanguage === "zh"
          ? `[轮次 ${currentRound}] 正在生成候选关键词...`
          : `[Round ${currentRound}] Generating candidate keywords...`,
        "info",
        taskId
      );

      // 使用种子关键词（初始关键词）进行挖掘
      const seedKeyword = seedKeywords.join(", ");
      addLog(
        state.uiLanguage === "zh"
          ? `💭 基于初始关键词 "${seedKeyword}" 进行挖掘`
          : `💭 Mining based on initial keywords "${seedKeyword}"`,
        "info",
        taskId
      );

      addThought(
        "generation",
        state.uiLanguage === "zh"
          ? `轮次 ${currentRound}: 基于网站分析发现的初始关键词进行扩展挖掘`
          : `Round ${currentRound}: Expanding mining based on initial keywords from website audit`,
        undefined,
        taskId
      );

      try {
        addLog(
          state.uiLanguage === "zh"
            ? "🤖 AI 正在思考..."
            : "🤖 AI is thinking...",
          "info",
          taskId
        );

        const result = await generateKeywords(
          seedKeyword,
          state.targetLanguage,
          getWorkflowPrompt("mining", "mining-gen", state.genPrompt),
          allKeywords.map((k) => k.keyword),
          currentRound,
          state.wordsPerRound || 10,
          state.miningStrategy || "horizontal",
          state.userSuggestion || "",
          state.uiLanguage,
          state.miningConfig?.industry,
          state.miningConfig?.additionalSuggestions
        );

        const generatedKeywords = result.keywords;

        if (generatedKeywords.length === 0) {
          addLog(
            state.uiLanguage === "zh"
              ? `[轮次 ${currentRound}] 未生成关键词，继续...`
              : `[Round ${currentRound}] No keywords generated. Continuing...`,
            "warning",
            taskId
          );
          continue;
        }

        addThought(
          "generation",
          state.uiLanguage === "zh"
            ? `生成了 ${generatedKeywords.length} 个候选关键词`
            : `Generated ${generatedKeywords.length} candidate keywords`,
          {
            keywords: generatedKeywords.map((k) => k.keyword),
            data: generatedKeywords,
            dataType: "keywords",
          },
          taskId
        );

        addLog(
          state.uiLanguage === "zh"
            ? `✨ 成功生成 ${generatedKeywords.length} 个候选关键词`
            : `✨ Generated ${generatedKeywords.length} candidate keywords`,
          "success",
          taskId
        );

        addLog(
          state.uiLanguage === "zh"
            ? `🔍 正在分析 SERP 估算排名概率...`
            : `🔍 Analyzing SERP to estimate ranking probability...`,
          "info",
          taskId
        );

        // 分析排名概率
        const analyzedBatch = await analyzeRankingProbability(
          generatedKeywords,
          getWorkflowPrompt("mining", "mining-analyze", state.analyzePrompt),
          state.uiLanguage,
          state.targetLanguage
        );

        // 更新关键词列表
        allKeywords.push(...analyzedBatch);

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
            return {
              ...prev,
              taskManager: {
                ...prev.taskManager,
                tasks: updatedTasks,
              },
            };
          }
        });

        const highProbCount = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.HIGH
        ).length;
        const mediumProbCount = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.MEDIUM
        ).length;
        const lowProbCount = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.LOW
        ).length;

        addLog(
          state.uiLanguage === "zh"
            ? `📊 分析完成：高概率 ${highProbCount} 个，中概率 ${mediumProbCount} 个，低概率 ${lowProbCount} 个`
            : `📊 Analysis complete: High ${highProbCount}, Medium ${mediumProbCount}, Low ${lowProbCount}`,
          "success",
          taskId
        );

        // 检查是否有高概率关键词
        const highProbKeywords = analyzedBatch.filter(
          (k) => k.probability === ProbabilityLevel.HIGH
        );

        if (highProbKeywords.length > 0) {
          addLog(
            state.uiLanguage === "zh"
              ? `✅ 发现 ${highProbKeywords.length} 个高概率上首页的关键词！`
              : `✅ Found ${highProbKeywords.length} high-probability keywords!`,
            "success",
            taskId
          );

          addThought(
            "generation",
            state.uiLanguage === "zh"
              ? `发现高概率关键词：${highProbKeywords
                  .map((k) => k.keyword)
                  .join(", ")}`
              : `High-probability keywords found: ${highProbKeywords
                  .map((k) => k.keyword)
                  .join(", ")}`,
            {
              keywords: highProbKeywords.map((k) => k.keyword),
              data: highProbKeywords,
              dataType: "keywords",
            },
            taskId
          );
        }

        // 显示所有关键词
        addThought(
          "generation",
          state.uiLanguage === "zh"
            ? `关键词挖掘完成，共 ${allKeywords.length} 个关键词（高概率: ${
                allKeywords.filter(
                  (k) => k.probability === ProbabilityLevel.HIGH
                ).length
              }）`
            : `Keyword mining complete, ${
                allKeywords.length
              } keywords total (High: ${
                allKeywords.filter(
                  (k) => k.probability === ProbabilityLevel.HIGH
                ).length
              })`,
          {
            keywords: allKeywords.map((k) => k.keyword),
            data: allKeywords,
            dataType: "keywords",
          },
          taskId
        );

        // 如果找到足够的高概率关键词，可以停止或继续
        // 这里我们继续挖掘，直到用户停止
        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch (err: any) {
        console.error("[Website Audit Mining Loop] Error:", err);
        addLog(
          state.uiLanguage === "zh"
            ? `❌ 轮次 ${currentRound} 出错: ${err.message}`
            : `❌ Error in Round ${currentRound}: ${err.message}`,
          "error",
          taskId
        );
        // 继续挖掘，不因为单次错误而停止
      }
    }

    // 挖掘结束，显示最终结果
    const finalHighProb = allKeywords.filter(
      (k) => k.probability === ProbabilityLevel.HIGH
    ).length;
    const finalMediumProb = allKeywords.filter(
      (k) => k.probability === ProbabilityLevel.MEDIUM
    ).length;
    const finalLowProb = allKeywords.filter(
      (k) => k.probability === ProbabilityLevel.LOW
    ).length;

    setState((prev) => {
      const updatedState: AppState = {
        ...prev,
        keywords: allKeywords,
        isMining: false,
        miningSuccess: true,
        step: "results" as const,
      };
      saveToArchive(updatedState);
      return updatedState;
    });

    addLog(
      state.uiLanguage === "zh"
        ? `✅ 关键词挖掘完成！共发现 ${allKeywords.length} 个关键词 (高概率: ${finalHighProb}, 中概率: ${finalMediumProb}, 低概率: ${finalLowProb})`
        : `✅ Keyword mining complete! Found ${allKeywords.length} keywords (High: ${finalHighProb}, Medium: ${finalMediumProb}, Low: ${finalLowProb})`,
      "success",
      taskId
    );
  };

  const handleStop = () => {
    const currentTaskId = state.taskManager.activeTaskId;

    stopMiningRef.current = true;
    addLog("User requested stop.", "warning", currentTaskId || undefined);

    // Show success window even when manually stopped, so user can view results
    setState((prev) => {
      if (!currentTaskId) {
        saveToArchive(prev);
        return {
          ...prev,
          isMining: false,
          miningSuccess: true,
          showSuccessPrompt: true,
        };
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
              showSuccessPrompt: true,
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
        showSuccessPrompt: true,
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
      setState((prev) => ({
        ...prev,
        error:
          state.uiLanguage === "zh"
            ? "请先登录才能使用生成图文功能"
            : "Please login to use article generation",
      }));
      return;
    }

    // Auto-create task if no active task exists
    if (!state.taskManager.activeTaskId) {
      addTask({
        type: "article-generator",
        keyword: keyword,
        targetLanguage: state.targetLanguage,
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      return; // Exit and let user start article generator in the new task
    }

    // Capture taskId at the start for isolation
    const currentTaskId = state.taskManager.activeTaskId;

    setState((prev) => ({
      ...prev,
      step: "article-generator",
      articleGeneratorState: {
        ...prev.articleGeneratorState,
        keyword: keyword.keyword,
        isGenerating: false,
        currentStage: "input",
      },
      logs: [],
    }));

    // Start the article generator flow
    runArticleGenerator(keyword, currentTaskId);
  };

  const runArticleGenerator = async (keyword: KeywordData, taskId: string) => {
    try {
      // Direct jump to article-generator view for this task
      setState((prev) => ({
        ...prev,
        step: "article-generator",
        articleGeneratorState: {
          ...prev.articleGeneratorState,
          keyword: keyword.keyword,
          isGenerating: false, // Wait for user to confirm in the view
          currentStage: "input",
        },
      }));

      addLog(
        `Switching to Article Generator for "${keyword.keyword}"`,
        "info",
        taskId
      );
    } catch (error: any) {
      console.error("Failed to start article generator:", error);
      addLog(`启动失败: ${error.message}`, "error", taskId);
    }
  };

  const runEnhancedDeepDive = async (keyword: KeywordData, taskId: string) => {
    try {
      // Step 1: Generate strategy report using enhanced deep dive API
      addLog("Starting enhanced deep dive analysis...", "info", taskId);
      const report = await enhancedDeepDive(
        keyword,
        state.uiLanguage,
        state.targetLanguage,
        getWorkflowPrompt("deepDive", "deepdive-strategy", state.deepDivePrompt)
      );

      // Consume credits after successfully generating strategy (fixed 30 credits for deep dive)
      // Skip credit consumption in local development environment
      const isLocalDev =
        import.meta.env.DEV ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isLocalDev) {
        addLog(
          state.uiLanguage === "zh"
            ? "本地测试模式：跳过 credit 消耗"
            : "Local dev mode: Skipping credit consumption",
          "info",
          taskId
        );
      } else {
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

  // === Workflow Configuration Management ===

  // Check and get API key (按照 SUBPROJECT_API_KEY_INTEGRATION.md 文档实现)
  const checkAndGetApiKey = async (): Promise<string | null> => {
    const MAIN_APP_URL =
      import.meta.env.VITE_MAIN_APP_URL || "https://www.nichedigger.ai";

    // 1. 先检查 localStorage 中是否有保存的 API key
    const savedApiKey = localStorage.getItem("nichedigger_api_key");
    if (savedApiKey && savedApiKey.startsWith("nm_live_")) {
      console.log("[checkAndGetApiKey] Found saved API key in localStorage");
      return savedApiKey;
    }

    try {
      // 2. 检查用户登录状态（按照文档要求）
      const sessionResponse = await fetch(`${MAIN_APP_URL}/api/auth/session`, {
        method: "GET",
        credentials: "include", // 重要：发送 cookie
      });

      const session = await sessionResponse.json();
      if (!session.authenticated) {
        console.warn("[checkAndGetApiKey] User not authenticated");
        return null;
      }

      console.log(
        "[checkAndGetApiKey] User authenticated, checking API keys..."
      );

      // 3. 获取用户的 API Keys（按照文档要求）
      const keysResponse = await fetch(`${MAIN_APP_URL}/api/v1/api-keys`, {
        method: "GET",
        credentials: "include", // 重要：发送 cookie（包含 JWT token）
        headers: { "Content-Type": "application/json" },
      });

      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        if (keysData.success && keysData.data?.apiKeys?.length > 0) {
          // 用户已有 API Keys，但 GET 接口只返回前缀，不返回完整 Key
          // 如果之前保存过完整 Key，可以从本地存储获取
          // 否则返回 null，需要创建新的
          console.log(
            "[checkAndGetApiKey] User has API keys, but full key not available from GET endpoint"
          );
          // 如果之前保存过，应该已经在第一步返回了
          // 这里返回 null，表示需要创建新的或使用已保存的
          return null;
        }
      }

      console.log("[checkAndGetApiKey] No API keys found");
      return null;
    } catch (error) {
      console.error("[checkAndGetApiKey] Failed to check API keys:", error);
      return null;
    }
  };

  // Create API key (按照 SUBPROJECT_API_KEY_INTEGRATION.md 文档实现)
  const createApiKey = async (): Promise<string | null> => {
    const MAIN_APP_URL =
      import.meta.env.VITE_MAIN_APP_URL || "https://www.nichedigger.ai";

    try {
      // 按照文档要求：先检查登录状态
      const sessionResponse = await fetch(`${MAIN_APP_URL}/api/auth/session`, {
        method: "GET",
        credentials: "include",
      });

      const session = await sessionResponse.json();
      if (!session.authenticated) {
        throw new Error("用户未登录，无法创建 API Key");
      }

      console.log("[createApiKey] User authenticated, creating API key...");

      // 创建新的 API Key（按照文档要求）
      const response = await fetch(`${MAIN_APP_URL}/api/v1/api-keys`, {
        method: "POST",
        credentials: "include", // 重要：发送 cookie（包含 JWT token）
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Google SEO Agent API Key" }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "创建 API Key 失败");
      }

      const data = await response.json();
      if (data.success && data.data?.apiKey) {
        const apiKey = data.data.apiKey;
        // 重要：创建 API Key 时，响应中会返回完整的 API Key
        // 这是唯一一次可以看到完整 Key 的机会，必须妥善保存
        localStorage.setItem("nichedigger_api_key", apiKey);
        console.log("[createApiKey] API key created and saved successfully");
        return apiKey;
      }

      console.error(
        "[createApiKey] API key creation failed: invalid response format"
      );
      return null;
    } catch (error: any) {
      console.error("[createApiKey] Failed to create API key:", error);
      throw error;
    }
  };

  // Handle authentication error and prompt for API key
  const handleAuthError = async (
    error: any,
    operation: string
  ): Promise<string | null> => {
    // Check if it's a token expired error
    if (error.errorType === "expired" || error.message?.includes("expired")) {
      // User is logged in but token expired
      if (authenticated && user) {
        // Check if user has API key
        const apiKey = await checkAndGetApiKey();
        if (!apiKey) {
          // Ask user if they want to create API key
          const shouldCreate = window.confirm(
            state.uiLanguage === "zh"
              ? "登录令牌已过期。检测到您没有 API Key，是否创建 API Key 以继续使用工作流配置功能？"
              : "Login token expired. You don't have an API Key. Would you like to create one to continue using workflow configuration?"
          );

          if (shouldCreate) {
            try {
              const newApiKey = await createApiKey();
              if (newApiKey) {
                addLog(
                  state.uiLanguage === "zh"
                    ? "API Key 创建成功！"
                    : "API Key created successfully!",
                  "success"
                );
                return newApiKey; // Return the new API key for retry
              }
            } catch (createError: any) {
              addLog(
                state.uiLanguage === "zh"
                  ? `创建 API Key 失败: ${createError.message}`
                  : `Failed to create API Key: ${createError.message}`,
                "error"
              );
              return null;
            }
          } else {
            addLog(
              state.uiLanguage === "zh"
                ? "操作已取消。请刷新页面重新登录或创建 API Key。"
                : "Operation cancelled. Please refresh the page to re-login or create an API Key.",
              "info"
            );
            return null;
          }
        } else {
          // User has API key, return it for retry
          return apiKey;
        }
      } else {
        // User not logged in
        addLog(
          state.uiLanguage === "zh"
            ? "请先登录才能使用此功能"
            : "Please login first to use this feature",
          "error"
        );
        return null;
      }
    }

    return null;
  };

  // Helper function to make authenticated API calls using JWT token
  // 现在使用本地 API 端点，避免跨域请求
  const makeWorkflowConfigRequest = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    // 使用本地 API 端点（相对路径）
    // 确保使用 /api/workflow-configs 而不是 /api/v1/workflow-configs
    const url = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    console.log("[makeWorkflowConfigRequest] Calling local API:", url);

    const token = localStorage.getItem("auth_token");
    if (!token) {
      throw new Error("请先登录才能使用此功能");
    }

    // 确保 token 没有多余的空格
    const cleanToken = token.trim();

    const defaultHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cleanToken}`,
    };

    console.log("[makeWorkflowConfigRequest] Request options:", {
      method: options.method,
      body: options.body ? JSON.parse(options.body as string) : undefined,
      headers: {
        ...defaultHeaders,
        Authorization: `Bearer ${cleanToken.substring(0, 20)}...`, // 只显示前20个字符
      },
      tokenLength: cleanToken.length,
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        credentials: "include",
      });

      console.log(
        "[makeWorkflowConfigRequest] Response status:",
        response.status,
        response.statusText
      );

      // 如果是 401，只记录状态，不读取 body（让调用者读取）
      if (response.status === 401) {
        console.error(
          "[makeWorkflowConfigRequest] 401 Unauthorized - response body will be read by caller"
        );
      }

      // 返回 response，调用者可以读取 body
      return response;
    } catch (fetchError: any) {
      console.error("[makeWorkflowConfigRequest] Fetch error:", fetchError);
      console.error("[makeWorkflowConfigRequest] Error details:", {
        message: fetchError.message,
        name: fetchError.name,
        stack: fetchError.stack,
      });

      // Check if it's a CORS error
      if (
        fetchError.message?.includes("Failed to fetch") ||
        fetchError.name === "TypeError"
      ) {
        const isCrossOrigin = new URL(url).origin !== window.location.origin;
        const errorMsg = isCrossOrigin
          ? `跨域请求失败（CORS 错误）。\n\n当前域名: ${
              window.location.origin
            }\n目标域名: ${
              new URL(url).origin
            }\n\n可能的原因：\n1. 主应用 ${MAIN_APP_URL} 未配置允许来自 ${
              window.location.origin
            } 的跨域请求\n2. 需要检查主应用的 CORS 配置（Access-Control-Allow-Origin）\n3. 或者需要通过本地 API 代理转发请求`
          : `网络请求失败。请检查：\n1. 主应用 ${MAIN_APP_URL} 是否可访问\n2. 网络连接是否正常\n3. 浏览器控制台是否有其他错误`;
        throw new Error(errorMsg);
      }
      throw fetchError;
    }
  };

  const saveWorkflowConfig = async (config: WorkflowConfig) => {
    console.log("[saveWorkflowConfig] Function called with config:", config);

    const token = localStorage.getItem("auth_token");
    if (!token) {
      console.error("[saveWorkflowConfig] No token found!");
      addLog("请先登录才能保存工作流配置", "error");
      return;
    }

    console.log("[saveWorkflowConfig] Token exists, proceeding with save");
    console.log("[saveWorkflowConfig] Saving config:", {
      workflowId: config.workflowId,
      name: config.name,
      nodesCount: config.nodes?.length,
    });

    try {
      console.log(
        "[saveWorkflowConfig] About to call makeWorkflowConfigRequest"
      );
      const response = await makeWorkflowConfigRequest(
        "/api/workflow-configs",
        {
          method: "POST",
          body: JSON.stringify({
            workflowId: config.workflowId,
            name: config.name,
            nodes: config.nodes,
          }),
        }
      );

      console.log("[saveWorkflowConfig] Response received:", {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
      });

      if (!response.ok) {
        let error: any = {};
        try {
          error = await response.json();
        } catch (e) {
          // If response is not JSON, get text
          const text = await response.text();
          error = {
            message: text || `HTTP ${response.status}: ${response.statusText}`,
          };
        }

        console.error("[saveWorkflowConfig] API error:", {
          status: response.status,
          statusText: response.statusText,
          error: error,
        });

        // Handle specific error cases
        if (response.status === 401) {
          // 检查是否是 token 过期
          if (
            error.errorType === "expired" ||
            error.message?.includes("expired") ||
            error.message?.includes("Token expired")
          ) {
            addLog("登录令牌已过期，请重新登录", "error");
            // 清除过期的 token
            localStorage.removeItem("auth_token");
            localStorage.removeItem("user");
            // 提示用户重新登录
            if (window.confirm("登录令牌已过期，是否重新登录？")) {
              window.location.reload();
            }
            throw new Error("登录令牌已过期，请重新登录");
          }
          throw new Error("认证失败，请重新登录");
        }

        throw new Error(
          error.message || error.error || `保存失败 (${response.status})`
        );
      }

      const result = await response.json();
      console.log("[saveWorkflowConfig] Success:", result);
      const savedConfig = result.data;

      // Update local state
      const updated = [
        savedConfig,
        ...state.workflowConfigs.filter((c) => c.id !== savedConfig.id),
      ];
      setState((prev) => ({
        ...prev,
        workflowConfigs: updated,
        currentWorkflowConfigIds: {
          ...prev.currentWorkflowConfigIds,
          [savedConfig.workflowId]: savedConfig.id,
        },
      }));
      addLog(`工作流配置 "${savedConfig.name}" 已保存`, "success");
    } catch (error: any) {
      console.error(
        "[saveWorkflowConfig] Failed to save workflow config:",
        error
      );
      console.error("[saveWorkflowConfig] Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack,
      });

      const errorMessage = error.message || "保存失败";
      addLog(`保存失败: ${errorMessage}`, "error");

      // Show alert for critical errors
      if (
        error.message?.includes("网络请求失败") ||
        error.message?.includes("Failed to fetch")
      ) {
        alert(
          `保存失败：${errorMessage}\n\n请检查：\n1. 网络连接是否正常\n2. 主应用 https://www.nichedigger.ai 是否可访问\n3. 浏览器控制台是否有 CORS 错误\n4. 是否已登录`
        );
      }
    }
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

  const deleteWorkflowConfig = async (configId: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      addLog("请先登录才能删除工作流配置", "error");
      return;
    }

    try {
      console.log("[deleteWorkflowConfig] Deleting config:", configId);
      const response = await makeWorkflowConfigRequest(
        `/api/workflow-configs/${configId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("[deleteWorkflowConfig] API error:", {
          status: response.status,
          error: error,
        });
        throw new Error(error.message || error.error || "删除失败");
      }

      // Update local state
      const updated = state.workflowConfigs.filter((c) => c.id !== configId);
      setState((prev) => ({
        ...prev,
        workflowConfigs: updated,
        currentWorkflowConfigIds: Object.fromEntries(
          Object.entries(prev.currentWorkflowConfigIds).filter(
            ([_, id]) => id !== configId
          )
        ),
      }));
      addLog("工作流配置已删除", "success");
    } catch (error: any) {
      console.error("Failed to delete workflow config:", error);
      addLog(`删除失败: ${error.message}`, "error");
    }
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

    // Skip credit check in local development environment
    const isLocalDev =
      import.meta.env.DEV ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    // Check if user has enough credits (skip in local dev)
    if (!isLocalDev && !checkCreditsBalance(requiredCredits)) {
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

    // Consume credits before starting (skip in local dev)
    if (isLocalDev) {
      addLog(
        state.uiLanguage === "zh"
          ? "本地测试模式：跳过 credit 消耗"
          : "Local dev mode: Skipping credit consumption",
        "info"
      );
    } else {
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
      // Step-by-step execution for real-time streaming display
      addLog(
        `Starting step-by-step analysis for ${keywordList.length} keywords...`,
        "info",
        taskId
      );

      const allKeywords: KeywordData[] = [];
      const systemInstruction = getWorkflowPrompt(
        "batch",
        "batch-analyze",
        state.analyzePrompt
      );

      // Process each keyword one by one (real-time streaming)
      for (let i = 0; i < keywordList.length; i++) {
        if (stopBatchRef.current) {
          addLog("Batch analysis stopped by user.", "warning", taskId);
          break;
        }

        const originalKeyword = keywordList[i];

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
          `[${i + 1}/${keywordList.length}] Processing: "${originalKeyword}"`,
          "info",
          taskId
        );

        try {
          // Step 1: Translate keyword (real-time display)
          addLog(
            `[${i + 1}/${
              keywordList.length
            }] Step 1: Translating "${originalKeyword}"...`,
            "info",
            taskId
          );

          // Call translateAndAnalyzeSingle API which handles translation, DataForSEO, and analysis
          const singleResult = await translateAndAnalyzeSingle(
            originalKeyword,
            state.targetLanguage,
            systemInstruction,
            state.uiLanguage
          );

          if (!singleResult.success) {
            throw new Error(`Failed to analyze keyword: ${originalKeyword}`);
          }

          const result = singleResult.keyword;
          const translated = singleResult.translated;

          // Show translation thought (real-time)
          addBatchThought(
            "translation",
            originalKeyword,
            `Translated to: "${translated}"`,
            { keyword: translated },
            taskId
          );
          // Allow React to render before next update
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Show DataForSEO thought (real-time)
          if (result.serankingData) {
            if (result.serankingData.is_data_found) {
              addBatchThought(
                "seranking",
                result.keyword,
                `DataForSEO: Volume=${result.serankingData.volume}, KD=${result.serankingData.difficulty}, CPC=$${result.serankingData.cpc}`,
                { serankingData: result.serankingData },
                taskId
              );
              await new Promise((resolve) => setTimeout(resolve, 50));
            } else {
              addBatchThought(
                "seranking",
                result.keyword,
                `DataForSEO: No data found (Blue Ocean Signal!)`,
                { serankingData: { is_data_found: false } },
                taskId
              );
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }

          // Show SERP search thought (real-time)
          if (result.topSerpSnippets && result.topSerpSnippets.length > 0) {
            addBatchThought(
              "serp-search",
              result.keyword,
              `Analyzed top ${result.topSerpSnippets.length} search results from Google`,
              { serpSnippets: result.topSerpSnippets },
              taskId
            );
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          // Show intent analysis thought (real-time)
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
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          // Show final analysis thought (real-time)
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
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Add to state with task isolation (real-time)
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

          allKeywords.push(result);

          addLog(
            `[${i + 1}/${
              keywordList.length
            }] Completed: "${originalKeyword}" → ${result.probability}`,
            "success",
            taskId
          );
        } catch (error: any) {
          console.error(
            `[Batch Analysis] Error processing keyword "${originalKeyword}":`,
            error
          );
          addLog(
            `[${i + 1}/${
              keywordList.length
            }] Error processing "${originalKeyword}": ${error.message}`,
            "error",
            taskId
          );
          // Continue with next keyword even if one fails
        }
      }

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
            allKeywords.length
          } keywords (${state.targetLanguage.toUpperCase()})`,
          allKeywords.length
        );
        addLog(
          `✅ Credits consumed: ${
            Math.ceil(allKeywords.length / 10) * 20
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

      // Analysis complete
      addLog(
        `Batch analysis complete! Processed ${allKeywords.length}/${keywordList.length} keywords.`,
        "success",
        taskId
      );
      playCompletionSound();

      // Save to batch archives and update state with task isolation
      setState((prev) => {
        const task = prev.taskManager.tasks.find((t) => t.id === taskId);
        if (!task || !task.batchState) {
          console.warn(
            `[Batch Analysis] Task not found or no batchState: ${taskId}`
          );
          return prev;
        }

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

        // Always navigate to batch-results if this task has keywords and is active
        const hasResults =
          task.batchState.batchKeywords &&
          task.batchState.batchKeywords.length > 0;
        const isActiveTask = taskId === prev.taskManager.activeTaskId;

        console.log(
          `[Batch Analysis] Completing task ${taskId}, activeTaskId: ${prev.taskManager.activeTaskId}, hasResults: ${hasResults}, isActiveTask: ${isActiveTask}`
        );

        if (hasResults && isActiveTask) {
          // Active task with results - navigate to results page
          console.log(
            `[Batch Analysis] ✅ Active task with results - navigating to batch-results page`
          );
          return {
            ...prev,
            step: "batch-results",
            batchArchives: updatedArchives,
            // Also update global batchKeywords for backward compatibility
            batchKeywords: task.batchState.batchKeywords,
            batchThoughts: task.batchState.batchThoughts || [],
          };
        } else if (hasResults && !isActiveTask) {
          // Background task - still update archives, but don't navigate
          console.log(
            `[Batch Analysis] ⚠️ Background task completed (taskId: ${taskId} !== activeTaskId: ${prev.taskManager.activeTaskId})`
          );
          return {
            ...prev,
            batchArchives: updatedArchives,
          };
        } else {
          // No results - stay on current step
          console.warn(
            `[Batch Analysis] Task completed but no results found or task is not active`
          );
          return {
            ...prev,
            batchArchives: updatedArchives,
          };
        }
      });

      // Force a re-render check after state update
      // Use setTimeout to ensure state update has been processed
      setTimeout(() => {
        setState((prev) => {
          // Double-check: if we're still on batch-analyzing step but have results, force navigation
          if (
            prev.step === "batch-analyzing" &&
            prev.taskManager.activeTaskId === taskId
          ) {
            const activeTask = prev.taskManager.tasks.find(
              (t) => t.id === taskId
            );
            if (
              activeTask?.batchState?.batchKeywords &&
              activeTask.batchState.batchKeywords.length > 0
            ) {
              console.log(
                `[Batch Analysis] 🔄 Force navigation to batch-results (step was still batch-analyzing)`
              );
              return {
                ...prev,
                step: "batch-results",
                batchKeywords: activeTask.batchState.batchKeywords,
                batchThoughts: activeTask.batchState.batchThoughts || [],
              };
            }
          }
          return prev;
        });
      }, 100);
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

  // Handler for sidebar collapse
  const handleToggleSidebar = () => {
    setState((prev) => {
      const newState = !prev.isSidebarCollapsed;
      localStorage.setItem("sidebar_collapsed", String(newState));
      return { ...prev, isSidebarCollapsed: newState };
    });
  };

  return (
    <div
      className={`flex h-screen overflow-hidden ${
        isDarkTheme ? "bg-[#050505] text-[#e5e5e5]" : "bg-gray-50 text-gray-900"
      }`}
    >
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
        onLanguageToggle={() => {
          setState((prev) => {
            const newLanguage = prev.uiLanguage === "en" ? "zh" : "en";
            // Save to localStorage
            try {
              localStorage.setItem("ui_language", newLanguage);
            } catch (e) {
              console.error("Failed to save UI language to localStorage:", e);
            }
            return {
              ...prev,
              uiLanguage: newLanguage,
            };
          });
        }}
        onThemeToggle={handleThemeToggle}
        uiLanguage={state.uiLanguage}
        step={state.step}
        isDarkTheme={isDarkTheme}
        onContentGeneration={(tab) =>
          setState((prev) => ({
            ...prev,
            step: "content-generation",
            // 切换到"我的网站"时，清除activeTaskId，确保任务不是active
            taskManager: {
              ...prev.taskManager,
              activeTaskId: null,
              // 确保所有任务都不是active
              tasks: prev.taskManager.tasks.map((t) => ({
                ...t,
                isActive: false,
              })),
            },
            contentGeneration: {
              ...prev.contentGeneration,
              activeTab: tab || prev.contentGeneration.activeTab,
            },
          }))
        }
        contentGenerationTab={state.contentGeneration.activeTab}
        onTestAgents={() =>
          setState((prev) => ({ ...prev, step: "test-agents" }))
        }
        onDeepDive={() =>
          setState((prev) => ({ ...prev, step: "article-generator" }))
        }
        isCollapsed={state.isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header: Process Indicators & User Info */}
        {state.step !== "article-generator" && (
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
                    {state.uiLanguage === "zh"
                      ? "前往主应用"
                      : "Go to Main App"}
                  </a>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-grid-40 px-8 py-6">
          {state.step === "article-generator" && (
            <ArticleGeneratorLayout
              onBack={() => {
                // Switch to a different task or go back to input
                const activeTask = state.taskManager.tasks.find(
                  (t) => t.id === state.taskManager.activeTaskId
                );
                if (activeTask && activeTask.type === "article-generator") {
                  // Save current state before going back
                  setState((prev) => {
                    const updatedTasks = prev.taskManager.tasks.map((task) => {
                      if (task.id === prev.taskManager.activeTaskId) {
                        return {
                          ...task,
                          articleGeneratorState: {
                            ...prev.articleGeneratorState,
                            currentStage: "input",
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
                  });
                } else {
                  setState((prev) => ({ ...prev, step: "input" }));
                }
              }}
              uiLanguage={state.uiLanguage}
              articleGeneratorState={{
                keyword: state.articleGeneratorState.keyword,
                tone: state.articleGeneratorState.tone,
                targetAudience: state.articleGeneratorState.targetAudience,
                visualStyle: state.articleGeneratorState.visualStyle,
                targetMarket: state.articleGeneratorState.targetMarket,
                isGenerating: state.articleGeneratorState.isGenerating,
                progress: state.articleGeneratorState.progress,
                currentStage: state.articleGeneratorState.currentStage,
                streamEvents: state.articleGeneratorState.streamEvents,
                finalArticle: state.articleGeneratorState.finalArticle,
              }}
              onStateChange={(updates) => {
                setState((prev) => ({
                  ...prev,
                  articleGeneratorState: {
                    ...prev.articleGeneratorState,
                    ...updates,
                  },
                }));
                // Also update the task state
                const activeTask = state.taskManager.tasks.find(
                  (t) => t.id === state.taskManager.activeTaskId
                );
                if (activeTask && activeTask.type === "article-generator") {
                  setTimeout(() => {
                    setState((prev) => {
                      const updatedTasks = prev.taskManager.tasks.map(
                        (task) => {
                          if (task.id === prev.taskManager.activeTaskId) {
                            return {
                              ...task,
                              articleGeneratorState: {
                                ...prev.articleGeneratorState,
                                ...updates,
                              },
                            };
                          }
                          return task;
                        }
                      );
                      return {
                        ...prev,
                        taskManager: {
                          ...prev.taskManager,
                          tasks: updatedTasks,
                        },
                      };
                    });
                  }, 0);
                }
              }}
            />
          )}

          {state.step === "content-generation" && (
            <ContentGenerationView
              state={state.contentGeneration}
              setState={(update) =>
                setState((prev) => ({
                  ...prev,
                  contentGeneration: { ...prev.contentGeneration, ...update },
                }))
              }
              isDarkTheme={isDarkTheme}
              uiLanguage={state.uiLanguage}
            />
          )}

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
              {/* Hero Text */}
              <div className="text-center space-y-6">
                <div className="space-y-4">
                  <h2
                    className={cn(
                      "text-4xl font-black tracking-tight",
                      isDarkTheme ? "text-white" : "text-gray-900"
                    )}
                  >
                    {miningMode === "existing-website-audit"
                      ? (() => {
                          const title =
                            t.auditInputTitle || "Expand Your Reach";
                          // 如果是中文，取最后四个字符；如果是英文，取最后一个单词
                          if (state.uiLanguage === "zh") {
                            const lastFourChars = title.slice(-4);
                            const restChars = title.slice(0, -4);
                            return (
                              <>
                                {restChars}
                                <span className="text-emerald-500">
                                  {lastFourChars}
                                </span>
                              </>
                            );
                          } else {
                            const words = title.split(" ");
                            const lastWord = words.pop() || "";
                            const restWords = words.join(" ");
                            return (
                              <>
                                {restWords}{" "}
                                <span className="text-emerald-500">
                                  {lastWord}
                                </span>
                              </>
                            );
                          }
                        })()
                      : (() => {
                          const title = t.inputTitle || "Define Your Niche";
                          // 如果是中文，取最后四个字符；如果是英文，取最后一个单词
                          if (state.uiLanguage === "zh") {
                            const lastFourChars = title.slice(-4);
                            const restChars = title.slice(0, -4);
                            return (
                              <>
                                {restChars}
                                <span className="text-emerald-500">
                                  {lastFourChars}
                                </span>
                              </>
                            );
                          } else {
                            const words = title.split(" ");
                            const lastWord = words.pop() || "";
                            const restWords = words.join(" ");
                            return (
                              <>
                                {restWords}{" "}
                                <span className="text-emerald-500">
                                  {lastWord}
                                </span>
                              </>
                            );
                          }
                        })()}
                  </h2>
                  <p
                    className={cn(
                      "text-sm max-w-xl mx-auto leading-relaxed px-4",
                      isDarkTheme ? "text-neutral-400" : "text-gray-600"
                    )}
                  >
                    {miningMode === "existing-website-audit"
                      ? t.auditInputDesc
                      : t.inputDesc}
                  </p>
                </div>

                {/* Redesigned Major Mode Switcher */}
                <div className="flex items-center justify-center pt-2">
                  <div
                    className={cn(
                      "inline-flex p-1 rounded-xl shadow-2xl border",
                      isDarkTheme
                        ? "bg-neutral-900/80 border-white/10"
                        : "bg-gray-100 border-gray-200"
                    )}
                  >
                    <button
                      onClick={() => setMiningMode("blue-ocean")}
                      className={cn(
                        "flex items-center space-x-3 px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                        miningMode === "blue-ocean"
                          ? "bg-emerald-600 text-white shadow-lg"
                          : isDarkTheme
                          ? "text-neutral-500 hover:text-neutral-300"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <Layers size={14} />
                      <span>
                        {state.uiLanguage === "zh" ? "蓝海发现" : "Blue Ocean"}
                      </span>
                    </button>
                    <button
                      onClick={() => setMiningMode("existing-website-audit")}
                      className={cn(
                        "flex items-center space-x-3 px-8 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                        miningMode === "existing-website-audit"
                          ? "bg-emerald-600 text-white shadow-lg"
                          : isDarkTheme
                          ? "text-neutral-500 hover:text-neutral-300"
                          : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      <RefreshCw size={14} />
                      <span>
                        {state.uiLanguage === "zh"
                          ? "存量拓新"
                          : "Website Audit"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sub Tabs */}
                <div className="flex items-center justify-center space-x-2 pt-4">
                  <button
                    onClick={() => setActiveTab("mining")}
                    className={cn(
                      "px-5 py-2 rounded-md text-sm font-medium transition-all border",
                      activeTab === "mining"
                        ? "bg-emerald-500 text-white shadow-sm border-emerald-500"
                        : isDarkTheme
                        ? "text-neutral-500 hover:text-neutral-300 border-white/10"
                        : "text-gray-600 hover:text-gray-900 border-gray-200"
                    )}
                  >
                    {t.tabMining}
                  </button>
                  <button
                    onClick={() => setActiveTab("batch")}
                    className={cn(
                      "px-5 py-2 rounded-md text-sm font-medium transition-all border",
                      activeTab === "batch"
                        ? "bg-emerald-500 text-white shadow-sm border-emerald-500"
                        : isDarkTheme
                        ? "text-neutral-500 hover:text-neutral-300 border-white/10"
                        : "text-gray-600 hover:text-gray-900 border-gray-200"
                    )}
                  >
                    {t.tabBatch}
                  </button>
                </div>
              </div>

              {/* Mining Tab Content */}
              {activeTab === "mining" && (
                <div className="max-w-3xl mx-auto">
                  {/* Blue Ocean Mode - Show keyword input */}
                  {miningMode === "blue-ocean" && (
                    <>
                      {/* Refine Industry Button */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-emerald-400" />
                          <span
                            className={`text-sm font-semibold ${
                              isDarkTheme ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {state.uiLanguage === "zh"
                              ? "需要帮助？"
                              : "Need Help?"}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowMiningGuide(true)}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500/20 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium transition-all duration-200 flex items-center gap-2"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          {state.uiLanguage === "zh"
                            ? "精确行业"
                            : "Refine Industry"}
                        </button>
                      </div>

                      {/* Display Saved Mining Configuration */}
                      {state.miningConfig && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-400">
                              {state.uiLanguage === "zh"
                                ? "已保存的配置"
                                : "Saved Configuration"}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p
                              className={
                                isDarkTheme ? "text-white" : "text-gray-700"
                              }
                            >
                              <span className="text-emerald-400 font-medium">
                                {state.uiLanguage === "zh"
                                  ? "行业:"
                                  : "Industry:"}
                              </span>{" "}
                              {state.miningConfig.industry}
                            </p>
                            {state.miningConfig.additionalSuggestions && (
                              <p
                                className={
                                  isDarkTheme ? "text-white" : "text-gray-700"
                                }
                              >
                                <span className="text-emerald-400 font-medium">
                                  {state.uiLanguage === "zh"
                                    ? "建议:"
                                    : "Suggestions:"}
                                </span>{" "}
                                {state.miningConfig.additionalSuggestions}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Redesigned Input Design */}
                      <div
                        className={cn(
                          "flex flex-col md:flex-row gap-2 p-1.5 rounded-xl shadow-2xl border",
                          isDarkTheme
                            ? "bg-[#0f0f0f] border-white/10"
                            : "bg-gray-50 border-gray-200"
                        )}
                      >
                        {/* Target Language Selector */}
                        <Select
                          value={state.targetLanguage}
                          onValueChange={(value) =>
                            setState((prev) => ({
                              ...prev,
                              targetLanguage: value as TargetLanguage,
                            }))
                          }
                        >
                          <SelectTrigger
                            hideIcon
                            className={cn(
                              "md:w-48 h-14 rounded-lg px-4 flex items-center justify-between cursor-pointer transition-all border",
                              isDarkTheme
                                ? "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5 text-white"
                                : "bg-white border-gray-200 hover:border-gray-300 text-gray-900"
                            )}
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <Globe
                                size={14}
                                className={cn(
                                  "shrink-0",
                                  isDarkTheme
                                    ? "text-emerald-500"
                                    : "text-emerald-600"
                                )}
                              />
                              <span className="text-[11px] font-bold truncate">
                                <SelectValue />
                              </span>
                            </div>
                            <ChevronRight
                              size={14}
                              className={cn(
                                "shrink-0",
                                isDarkTheme
                                  ? "text-neutral-700"
                                  : "text-gray-500"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent
                            className={cn(
                              isDarkTheme
                                ? "bg-black/90 border-emerald-500/30"
                                : "bg-white border-emerald-500/30"
                            )}
                          >
                            {LANGUAGES.map((l) => (
                              <SelectItem
                                key={l.code}
                                value={l.code}
                                className={cn(
                                  isDarkTheme
                                    ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                    : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                                )}
                              >
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Input Field */}
                        <div
                          className={cn(
                            "flex-1 rounded-lg flex items-center px-4 h-14 transition-all border",
                            isDarkTheme
                              ? "bg-white/5 border-transparent focus-within:bg-black focus-within:border-emerald-500/30"
                              : "bg-white border-gray-200 focus-within:border-emerald-500/50"
                          )}
                        >
                          <Search
                            className={cn(
                              isDarkTheme ? "text-neutral-600" : "text-gray-400"
                            )}
                            size={18}
                          />
                          <input
                            type="text"
                            placeholder={t.placeholder}
                            className={cn(
                              "bg-transparent border-none outline-none w-full text-sm font-medium px-4 h-14",
                              isDarkTheme
                                ? "text-white placeholder:text-neutral-700"
                                : "text-gray-900 placeholder:text-gray-500"
                            )}
                            value={state.seedKeyword}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                seedKeyword: e.target.value,
                              }))
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" && startMining(false)
                            }
                          />
                        </div>
                        <button
                          onClick={() => startMining(false)}
                          disabled={!state.seedKeyword.trim()}
                          className={cn(
                            "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-10 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/10 active:scale-[0.98] h-14 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
                            isDarkTheme && "shadow-emerald-900/20"
                          )}
                        >
                          {t.btnStart}
                        </button>
                      </div>
                    </>
                  )}

                  {/* Existing Website Audit Mode - Show website selector and audit button */}
                  {miningMode === "existing-website-audit" && (
                    <>
                      {/* Refine Industry Button */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-5 h-5 text-emerald-400" />
                          <span
                            className={`text-sm font-semibold ${
                              isDarkTheme ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {state.uiLanguage === "zh"
                              ? "需要帮助？"
                              : "Need Help?"}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowMiningGuide(true)}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500/20 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium transition-all duration-200 flex items-center gap-2"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          {state.uiLanguage === "zh"
                            ? "精确行业"
                            : "Refine Industry"}
                        </button>
                      </div>

                      {/* Display Saved Mining Configuration */}
                      {state.miningConfig && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Lightbulb className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-400">
                              {state.uiLanguage === "zh"
                                ? "已保存的配置"
                                : "Saved Configuration"}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p
                              className={
                                isDarkTheme ? "text-white" : "text-gray-700"
                              }
                            >
                              <span className="text-emerald-400 font-medium">
                                {state.uiLanguage === "zh"
                                  ? "行业:"
                                  : "Industry:"}
                              </span>{" "}
                              {state.miningConfig.industry}
                            </p>
                            {state.miningConfig.additionalSuggestions && (
                              <p
                                className={
                                  isDarkTheme ? "text-white" : "text-gray-700"
                                }
                              >
                                <span className="text-emerald-400 font-medium">
                                  {state.uiLanguage === "zh"
                                    ? "建议:"
                                    : "Suggestions:"}
                                </span>{" "}
                                {state.miningConfig.additionalSuggestions}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Redesigned Input Design - Similar to Blue Ocean Mode */}
                      <div
                        className={cn(
                          "flex flex-col md:flex-row gap-2 p-1.5 rounded-xl shadow-2xl border",
                          isDarkTheme
                            ? "bg-[#0f0f0f] border-white/10"
                            : "bg-gray-50 border-gray-200"
                        )}
                      >
                        {/* Target Language Selector */}
                        <Select
                          value={state.targetLanguage}
                          onValueChange={(value) =>
                            setState((prev) => ({
                              ...prev,
                              targetLanguage: value as TargetLanguage,
                            }))
                          }
                        >
                          <SelectTrigger
                            hideIcon
                            className={cn(
                              "md:w-48 h-14 rounded-lg px-4 flex items-center justify-between cursor-pointer transition-all border",
                              isDarkTheme
                                ? "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5 text-white"
                                : "bg-white border-gray-200 hover:border-gray-300 text-gray-900"
                            )}
                          >
                            <div className="flex items-center space-x-3 overflow-hidden">
                              <Globe
                                size={14}
                                className={cn(
                                  "shrink-0",
                                  isDarkTheme
                                    ? "text-emerald-500"
                                    : "text-emerald-600"
                                )}
                              />
                              <span className="text-[11px] font-bold truncate">
                                <SelectValue />
                              </span>
                            </div>
                            <ChevronRight
                              size={14}
                              className={cn(
                                "shrink-0",
                                isDarkTheme
                                  ? "text-neutral-700"
                                  : "text-gray-500"
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent
                            className={cn(
                              isDarkTheme
                                ? "bg-black/90 border-emerald-500/30"
                                : "bg-white border-emerald-500/30"
                            )}
                          >
                            {LANGUAGES.map((l) => (
                              <SelectItem
                                key={l.code}
                                value={l.code}
                                className={cn(
                                  isDarkTheme
                                    ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                    : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                                )}
                              >
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Website Input Field with Dropdown */}
                        <div className="flex-1 relative website-dropdown-container">
                          <div
                            className={cn(
                              "flex items-center rounded-lg px-4 h-14 transition-all border relative",
                              isDarkTheme
                                ? "bg-white/5 border-transparent focus-within:bg-black focus-within:border-emerald-500/30"
                                : "bg-white border-gray-200 focus-within:border-emerald-500/50"
                            )}
                          >
                            <Globe
                              className={cn(
                                "w-4 h-4 mr-3 shrink-0",
                                isDarkTheme
                                  ? "text-neutral-600"
                                  : "text-gray-400"
                              )}
                            />
                            <input
                              type="text"
                              value={
                                manualWebsiteUrl.trim()
                                  ? manualWebsiteUrl
                                  : selectedWebsite?.url || ""
                              }
                              onChange={(e) => {
                                const value = e.target.value;
                                setManualWebsiteUrl(value);
                                setShowWebsiteDropdown(false); // Close dropdown when typing
                                // Clear selected website from dropdown when typing manually
                                if (value.trim()) {
                                  setSelectedWebsite(null);
                                }
                              }}
                              placeholder={
                                state.uiLanguage === "zh"
                                  ? "例如: 302.ai 或 https://example.com"
                                  : "e.g., 302.ai or https://example.com"
                              }
                              className={cn(
                                "bg-transparent border-none outline-none w-full text-sm font-medium flex-1",
                                isDarkTheme
                                  ? "text-white placeholder:text-neutral-700"
                                  : "text-gray-900 placeholder:text-gray-500"
                              )}
                              onFocus={() => {
                                // Load websites when input is focused
                                if (!websiteListData) {
                                  loadWebsiteList();
                                }
                                setShowWebsiteDropdown(true); // Show dropdown when focused
                              }}
                            />
                            {/* Dropdown Arrow */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!websiteListData) {
                                  loadWebsiteList();
                                }
                                setShowWebsiteDropdown(!showWebsiteDropdown);
                              }}
                              className={cn(
                                "ml-2 p-1 shrink-0 transition-colors",
                                isDarkTheme
                                  ? "text-neutral-600 hover:text-white"
                                  : "text-gray-400 hover:text-gray-600"
                              )}
                            >
                              <ChevronDown
                                size={16}
                                className={cn(
                                  "transition-transform",
                                  showWebsiteDropdown && "rotate-180"
                                )}
                              />
                            </button>
                            {/* Validation Status Icon */}
                            {manualWebsiteUrl.trim() && (
                              <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                {urlValidationStatus === "validating" && (
                                  <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                                )}
                                {urlValidationStatus === "valid" && (
                                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                                )}
                                {urlValidationStatus === "invalid" && (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            )}
                          </div>
                          {/* Website Dropdown */}
                          {showWebsiteDropdown && websiteListData && (
                            <div
                              className={cn(
                                "absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto",
                                isDarkTheme
                                  ? "bg-black/90 border-emerald-500/30"
                                  : "bg-white border-emerald-500/30"
                              )}
                            >
                              {websiteListData.websites.length === 0 ? (
                                <div
                                  className={cn(
                                    "p-4 text-center text-sm",
                                    isDarkTheme
                                      ? "text-zinc-400"
                                      : "text-gray-500"
                                  )}
                                >
                                  {state.uiLanguage === "zh"
                                    ? "还没有绑定网站"
                                    : "No websites bound yet"}
                                </div>
                              ) : (
                                websiteListData.websites.map((website) => (
                                  <button
                                    key={website.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedWebsite(website);
                                      setManualWebsiteUrl("");
                                      setUrlValidationStatus("idle");
                                      setShowWebsiteDropdown(false);
                                    }}
                                    className={cn(
                                      "w-full px-4 py-3 text-left hover:bg-emerald-500/10 transition-colors flex items-center justify-between",
                                      selectedWebsite?.id === website.id &&
                                        "bg-emerald-500/20",
                                      isDarkTheme
                                        ? "text-white"
                                        : "text-gray-900"
                                    )}
                                  >
                                    <span className="truncate">
                                      {website.url}
                                    </span>
                                    {website.isDefault && (
                                      <Badge
                                        variant="secondary"
                                        className="flex-shrink-0 text-xs ml-2"
                                      >
                                        <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                        {state.uiLanguage === "zh"
                                          ? "默认"
                                          : "Default"}
                                      </Badge>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                          {/* Validation Status Message */}
                          {manualWebsiteUrl.trim() &&
                            urlValidationStatus !== "idle" && (
                              <div
                                className={cn(
                                  "text-xs flex items-center gap-1 mt-1",
                                  urlValidationStatus === "valid" &&
                                    "text-emerald-500",
                                  urlValidationStatus === "invalid" &&
                                    "text-red-500",
                                  urlValidationStatus === "validating" &&
                                    "text-yellow-500"
                                )}
                              >
                                {urlValidationStatus === "validating" && (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    <span>
                                      {state.uiLanguage === "zh"
                                        ? "正在验证..."
                                        : "Validating..."}
                                    </span>
                                  </>
                                )}
                                {urlValidationStatus === "valid" && (
                                  <>
                                    <CheckCircle className="w-3 h-3" />
                                    <span>
                                      {state.uiLanguage === "zh"
                                        ? "网址有效，将用于关键词挖掘分析"
                                        : "URL valid, will be used for keyword mining analysis"}
                                    </span>
                                  </>
                                )}
                                {urlValidationStatus === "invalid" && (
                                  <>
                                    <AlertCircle className="w-3 h-3" />
                                    <span>
                                      {state.uiLanguage === "zh"
                                        ? "请输入有效的网址"
                                        : "Please enter a valid URL"}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                        </div>
                        <button
                          onClick={() => startMining(false)}
                          disabled={!selectedWebsite}
                          className={cn(
                            "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-10 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/10 active:scale-[0.98] h-14 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
                            isDarkTheme && "shadow-emerald-900/20"
                          )}
                        >
                          {state.uiLanguage === "zh"
                            ? "开始分析网站"
                            : "Start Website Audit"}
                        </button>
                      </div>

                      {/* Mining Settings Panel - Same as blue-ocean mode */}
                      <section className="space-y-4 mt-8">
                        <div className="flex items-center space-x-2 px-2">
                          <Settings
                            size={14}
                            className={cn(
                              isDarkTheme
                                ? "text-emerald-500"
                                : "text-emerald-600"
                            )}
                          />
                          <h3
                            className={cn(
                              "text-[10px] font-black uppercase tracking-[0.2em]",
                              isDarkTheme ? "text-neutral-400" : "text-gray-600"
                            )}
                          >
                            {state.uiLanguage === "zh"
                              ? "挖词设置"
                              : "Mining Settings"}
                          </h3>
                        </div>
                        <div
                          className={cn(
                            "grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-lg border",
                            isDarkTheme
                              ? "bg-black/40 border-emerald-500/20"
                              : "bg-white border-emerald-500/30"
                          )}
                        >
                          {/* Words Per Round */}
                          <div className="space-y-2">
                            <label
                              className={cn(
                                "flex items-center gap-2 text-xs font-semibold",
                                isDarkTheme
                                  ? "text-neutral-400"
                                  : "text-gray-600"
                              )}
                            >
                              <Cpu
                                size={14}
                                className={cn(
                                  isDarkTheme
                                    ? "text-emerald-500"
                                    : "text-emerald-600"
                                )}
                              />
                              {state.uiLanguage === "zh"
                                ? "每轮词语数"
                                : "Words Per Round"}
                            </label>
                            <Input
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
                              className={cn(
                                "text-sm font-medium h-10",
                                isDarkTheme
                                  ? "border-white/10 bg-white/5 text-white"
                                  : "border-gray-200 bg-white text-gray-900"
                              )}
                            />
                            <p
                              className={cn(
                                "text-[10px]",
                                isDarkTheme
                                  ? "text-neutral-600"
                                  : "text-gray-500"
                              )}
                            >
                              {state.uiLanguage === "zh"
                                ? "范围: 5-20"
                                : "Range: 5-20"}
                            </p>
                          </div>

                          {/* Mining Strategy */}
                          <div className="space-y-2">
                            <label
                              className={cn(
                                "flex items-center gap-2 text-xs font-semibold",
                                isDarkTheme
                                  ? "text-neutral-400"
                                  : "text-gray-600"
                              )}
                            >
                              <LayoutGrid
                                size={14}
                                className={cn(
                                  isDarkTheme
                                    ? "text-emerald-500"
                                    : "text-emerald-600"
                                )}
                              />
                              {state.uiLanguage === "zh"
                                ? "挖掘策略"
                                : "Mining Strategy"}
                            </label>
                            <Select
                              value={state.miningStrategy}
                              onValueChange={(value) =>
                                setState((prev) => ({
                                  ...prev,
                                  miningStrategy: value as
                                    | "horizontal"
                                    | "vertical",
                                }))
                              }
                            >
                              <SelectTrigger
                                className={cn(
                                  "text-sm font-medium h-10",
                                  isDarkTheme
                                    ? "border-white/10 bg-white/5 text-white"
                                    : "border-gray-200 bg-white text-gray-900"
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent
                                className={cn(
                                  isDarkTheme
                                    ? "bg-black/90 border-emerald-500/30"
                                    : "bg-white border-emerald-500/30"
                                )}
                              >
                                <SelectItem
                                  value="horizontal"
                                  className={cn(
                                    isDarkTheme
                                      ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                      : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                                  )}
                                >
                                  {state.uiLanguage === "zh"
                                    ? "横向挖掘(广泛主题)"
                                    : "Horizontal Mining (Broad Topics)"}
                                </SelectItem>
                                <SelectItem
                                  value="vertical"
                                  className={cn(
                                    isDarkTheme
                                      ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                      : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                                  )}
                                >
                                  {state.uiLanguage === "zh"
                                    ? "纵向挖掘(深度挖掘)"
                                    : "Vertical Mining (Deep Dive)"}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p
                              className={cn(
                                "text-[10px]",
                                isDarkTheme
                                  ? "text-neutral-600"
                                  : "text-gray-500"
                              )}
                            >
                              {state.uiLanguage === "zh"
                                ? "探索不同的平行主题"
                                : "Explore different parallel topics"}
                            </p>
                          </div>
                        </div>
                      </section>
                    </>
                  )}

                  {/* Mining Settings Panel - Only show for blue-ocean mode */}
                  {miningMode === "blue-ocean" && (
                    <section className="space-y-4 mt-8">
                      <div className="flex items-center space-x-2 px-2">
                        <Settings
                          size={14}
                          className={cn(
                            isDarkTheme
                              ? "text-emerald-500"
                              : "text-emerald-600"
                          )}
                        />
                        <h3
                          className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            isDarkTheme ? "text-neutral-400" : "text-gray-600"
                          )}
                        >
                          {state.uiLanguage === "zh"
                            ? "挖词设置"
                            : "Mining Settings"}
                        </h3>
                      </div>
                      <div
                        className={cn(
                          "grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-lg border",
                          isDarkTheme
                            ? "bg-black/40 border-emerald-500/20"
                            : "bg-white border-emerald-500/30"
                        )}
                      >
                        {/* Words Per Round */}
                        <div className="space-y-2">
                          <label
                            className={cn(
                              "flex items-center gap-2 text-xs font-semibold",
                              isDarkTheme ? "text-neutral-400" : "text-gray-600"
                            )}
                          >
                            <Cpu
                              size={14}
                              className={cn(
                                isDarkTheme
                                  ? "text-emerald-500"
                                  : "text-emerald-600"
                              )}
                            />
                            {state.uiLanguage === "zh"
                              ? "每轮词语数"
                              : "Words Per Round"}
                          </label>
                          <Input
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
                            className={cn(
                              "text-sm font-medium h-10",
                              isDarkTheme
                                ? "border-white/10 bg-white/5 text-white"
                                : "border-gray-200 bg-white text-gray-900"
                            )}
                          />
                          <p
                            className={cn(
                              "text-[10px]",
                              isDarkTheme ? "text-neutral-600" : "text-gray-500"
                            )}
                          >
                            {state.uiLanguage === "zh"
                              ? "范围: 5-20"
                              : "Range: 5-20"}
                          </p>
                        </div>

                        {/* Mining Strategy */}
                        <div className="space-y-2">
                          <label
                            className={cn(
                              "flex items-center gap-2 text-xs font-semibold",
                              isDarkTheme ? "text-neutral-400" : "text-gray-600"
                            )}
                          >
                            <LayoutGrid
                              size={14}
                              className={cn(
                                isDarkTheme
                                  ? "text-emerald-500"
                                  : "text-emerald-600"
                              )}
                            />
                            {state.uiLanguage === "zh"
                              ? "挖掘策略"
                              : "Mining Strategy"}
                          </label>
                          <Select
                            value={state.miningStrategy}
                            onValueChange={(value) =>
                              setState((prev) => ({
                                ...prev,
                                miningStrategy: value as
                                  | "horizontal"
                                  | "vertical",
                              }))
                            }
                          >
                            <SelectTrigger
                              className={cn(
                                "text-sm font-medium h-10",
                                isDarkTheme
                                  ? "border-white/10 bg-white/5 text-white"
                                  : "border-gray-200 bg-white text-gray-900"
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                              className={cn(
                                isDarkTheme
                                  ? "bg-black/90 border-emerald-500/30"
                                  : "bg-white border-emerald-500/30"
                              )}
                            >
                              <SelectItem
                                value="horizontal"
                                className={cn(
                                  isDarkTheme
                                    ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                    : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                                )}
                              >
                                {state.uiLanguage === "zh"
                                  ? "横向挖掘(广泛主题)"
                                  : "Horizontal Mining (Broad Topics)"}
                              </SelectItem>
                              <SelectItem
                                value="vertical"
                                className={cn(
                                  isDarkTheme
                                    ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                    : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                                )}
                              >
                                {state.uiLanguage === "zh"
                                  ? "纵向挖掘(深度挖掘)"
                                  : "Vertical Mining (Deep Dive)"}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p
                            className={cn(
                              "text-[10px]",
                              isDarkTheme ? "text-neutral-600" : "text-gray-500"
                            )}
                          >
                            {state.uiLanguage === "zh"
                              ? "探索不同的平行主题"
                              : "Explore different parallel topics"}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Mining Archive List */}
                  {state.archives.length > 0 && (
                    <section className="space-y-4 mt-12">
                      <div className="flex items-center space-x-2 px-2">
                        <History
                          size={14}
                          className={cn(
                            isDarkTheme
                              ? "text-emerald-500"
                              : "text-emerald-600"
                          )}
                        />
                        <h3
                          className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em]",
                            isDarkTheme ? "text-neutral-400" : "text-gray-600"
                          )}
                        >
                          {t.miningArchives}
                        </h3>
                      </div>
                      <div className="space-y-2 pb-12">
                        {state.archives.map((arch) => (
                          <div
                            key={arch.id}
                            onClick={() => loadArchive(arch)}
                            className={cn(
                              "group flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer",
                              isDarkTheme
                                ? "bg-[#0a0a0a] border-white/5 hover:border-emerald-500/30"
                                : "bg-white border-gray-200 hover:border-emerald-500/30"
                            )}
                          >
                            <div className="flex items-center space-x-4">
                              <div
                                className={cn(
                                  "w-10 h-10 rounded flex items-center justify-center transition-all group-hover:scale-105",
                                  isDarkTheme
                                    ? "bg-neutral-900 border border-white/10 text-emerald-500"
                                    : "bg-gray-100 border border-gray-200 text-emerald-600"
                                )}
                              >
                                {miningMode === "blue-ocean" ? (
                                  <Search size={16} />
                                ) : (
                                  <Link2 size={16} />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={cn(
                                      "text-sm font-bold transition-colors",
                                      isDarkTheme
                                        ? "text-white group-hover:text-emerald-400"
                                        : "text-gray-900 group-hover:text-emerald-600"
                                    )}
                                  >
                                    {arch.seedKeyword}
                                  </span>
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded-[2px] text-[8px] font-black uppercase",
                                      isDarkTheme
                                        ? "bg-emerald-500/10 text-emerald-500"
                                        : "bg-emerald-50 text-emerald-600"
                                    )}
                                  >
                                    {arch.targetLanguage.toUpperCase()}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 mt-1">
                                  <span
                                    className={cn(
                                      "text-[10px] mono",
                                      isDarkTheme
                                        ? "text-neutral-600"
                                        : "text-gray-500"
                                    )}
                                  >
                                    {new Date(arch.timestamp).toLocaleString()}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold uppercase tracking-widest",
                                      isDarkTheme
                                        ? "text-neutral-500"
                                        : "text-gray-600"
                                    )}
                                  >
                                    {arch.keywords.length}{" "}
                                    {state.uiLanguage === "zh"
                                      ? "个关键词"
                                      : "keywords discovered"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteArchive(arch.id, e)}
                              className={cn(
                                "p-2 transition-colors opacity-0 group-hover:opacity-100",
                                isDarkTheme
                                  ? "text-neutral-700 hover:text-red-400"
                                  : "text-gray-400 hover:text-red-600"
                              )}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {/* Batch Translation Tab Content */}
              {activeTab === "batch" && (
                <div className="max-w-3xl mx-auto">
                  {/* Refine Industry Button */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="w-5 h-5 text-emerald-400" />
                      <span
                        className={`text-sm font-semibold ${
                          isDarkTheme ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {state.uiLanguage === "zh"
                          ? "将翻译keyword到目标语言并分析蓝海机会"
                          : "Will translate keywords to target language and analyze blue ocean opportunities"}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowMiningGuide(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 to-emerald-500/20 border border-emerald-500/30 hover:from-emerald-500/30 hover:to-emerald-500/30 rounded-lg text-emerald-400 text-xs font-medium transition-all duration-200 flex items-center gap-2"
                    >
                      <Lightbulb className="w-3.5 h-3.5" />
                      {state.uiLanguage === "zh"
                        ? "精确行业"
                        : "Refine Industry"}
                    </button>
                  </div>

                  {/* Display Saved Mining Configuration */}
                  {state.miningConfig && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-400">
                          {state.uiLanguage === "zh"
                            ? "已保存的配置"
                            : "Saved Configuration"}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p
                          className={
                            isDarkTheme ? "text-white" : "text-gray-700"
                          }
                        >
                          <span className="text-emerald-400 font-medium">
                            {state.uiLanguage === "zh" ? "行业:" : "Industry:"}
                          </span>{" "}
                          {state.miningConfig.industry}
                        </p>
                        {state.miningConfig.additionalSuggestions && (
                          <p
                            className={
                              isDarkTheme ? "text-white" : "text-gray-700"
                            }
                          >
                            <span className="text-emerald-400 font-medium">
                              {state.uiLanguage === "zh"
                                ? "建议:"
                                : "Suggestions:"}
                            </span>{" "}
                            {state.miningConfig.additionalSuggestions}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Redesigned Input Design - Similar to Blue Ocean Mode */}
                  <div
                    className={cn(
                      "flex flex-col md:flex-row gap-2 p-1.5 rounded-xl shadow-2xl border",
                      isDarkTheme
                        ? "bg-[#0f0f0f] border-white/10"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    {/* Target Language Selector */}
                    <Select
                      value={state.targetLanguage}
                      onValueChange={(value) =>
                        setState((prev) => ({
                          ...prev,
                          targetLanguage: value as TargetLanguage,
                        }))
                      }
                    >
                      <SelectTrigger
                        hideIcon
                        className={cn(
                          "md:w-48 h-14 rounded-lg px-4 flex items-center justify-between cursor-pointer transition-all border",
                          isDarkTheme
                            ? "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5 text-white"
                            : "bg-white border-gray-200 hover:border-gray-300 text-gray-900"
                        )}
                      >
                        <div className="flex items-center space-x-3 overflow-hidden">
                          <Globe
                            size={14}
                            className={cn(
                              "shrink-0",
                              isDarkTheme
                                ? "text-emerald-500"
                                : "text-emerald-600"
                            )}
                          />
                          <span className="text-[11px] font-bold truncate">
                            <SelectValue />
                          </span>
                        </div>
                        <ChevronRight
                          size={14}
                          className={cn(
                            "shrink-0",
                            isDarkTheme ? "text-neutral-700" : "text-gray-500"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent
                        className={cn(
                          isDarkTheme
                            ? "bg-black/90 border-emerald-500/30"
                            : "bg-white border-emerald-500/30"
                        )}
                      >
                        {LANGUAGES.map((l) => (
                          <SelectItem
                            key={l.code}
                            value={l.code}
                            className={cn(
                              isDarkTheme
                                ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                            )}
                          >
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Website Input Field with Dropdown - Only show for existing-website-audit mode */}
                    {miningMode === "existing-website-audit" && (
                      <div className="flex-1 min-w-0 relative batch-website-dropdown-container">
                        <div
                          className={cn(
                            "flex items-center rounded-lg px-4 h-14 transition-all border relative",
                            isDarkTheme
                              ? "bg-white/5 border-transparent focus-within:bg-black focus-within:border-emerald-500/30"
                              : "bg-white border-gray-200 focus-within:border-emerald-500/50"
                          )}
                        >
                          <Globe
                            className={cn(
                              "w-4 h-4 mr-3 shrink-0",
                              isDarkTheme ? "text-neutral-600" : "text-gray-400"
                            )}
                          />
                          <input
                            type="text"
                            value={
                              batchManualWebsiteUrl.trim()
                                ? batchManualWebsiteUrl
                                : batchSelectedWebsite?.url || ""
                            }
                            onChange={(e) => {
                              const value = e.target.value;
                              setBatchManualWebsiteUrl(value);
                              setShowBatchWebsiteDropdown(false); // Close dropdown when typing
                              // Clear selected website from dropdown when typing manually
                              if (value.trim()) {
                                setBatchSelectedWebsite(null);
                              }
                            }}
                            placeholder={
                              state.uiLanguage === "zh"
                                ? "例如: 302.ai 或 https://example.com"
                                : "e.g., 302.ai or https://example.com"
                            }
                            className={cn(
                              "bg-transparent border-none outline-none w-full text-sm font-medium flex-1",
                              isDarkTheme
                                ? "text-white placeholder:text-neutral-700"
                                : "text-gray-900 placeholder:text-gray-500"
                            )}
                            onFocus={() => {
                              // Load websites when input is focused
                              if (!websiteListData) {
                                loadWebsiteList("batch");
                              }
                              setShowBatchWebsiteDropdown(true); // Show dropdown when focused
                            }}
                          />
                          {/* Dropdown Arrow */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!websiteListData) {
                                loadWebsiteList("batch");
                              }
                              setShowBatchWebsiteDropdown(
                                !showBatchWebsiteDropdown
                              );
                            }}
                            className={cn(
                              "ml-2 p-1 shrink-0 transition-colors",
                              isDarkTheme
                                ? "text-neutral-600 hover:text-white"
                                : "text-gray-400 hover:text-gray-600"
                            )}
                          >
                            <ChevronDown
                              size={16}
                              className={cn(
                                "transition-transform",
                                showBatchWebsiteDropdown && "rotate-180"
                              )}
                            />
                          </button>
                          {/* Validation Status Icon */}
                          {batchManualWebsiteUrl.trim() && (
                            <div className="absolute right-10 top-1/2 -translate-y-1/2">
                              {batchUrlValidationStatus === "validating" && (
                                <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
                              )}
                              {batchUrlValidationStatus === "valid" && (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              )}
                              {batchUrlValidationStatus === "invalid" && (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                          )}
                        </div>
                        {/* Website Dropdown */}
                        {showBatchWebsiteDropdown && websiteListData && (
                          <div
                            className={cn(
                              "absolute z-50 w-full mt-1 rounded-lg border shadow-lg max-h-60 overflow-y-auto",
                              isDarkTheme
                                ? "bg-black/90 border-emerald-500/30"
                                : "bg-white border-emerald-500/30"
                            )}
                          >
                            {websiteListData.websites.length === 0 ? (
                              <div
                                className={cn(
                                  "p-4 text-center text-sm",
                                  isDarkTheme
                                    ? "text-zinc-400"
                                    : "text-gray-500"
                                )}
                              >
                                {state.uiLanguage === "zh"
                                  ? "还没有绑定网站"
                                  : "No websites bound yet"}
                              </div>
                            ) : (
                              websiteListData.websites.map((website) => (
                                <button
                                  key={website.id}
                                  type="button"
                                  onClick={() => {
                                    setBatchSelectedWebsite(website);
                                    setBatchManualWebsiteUrl("");
                                    setBatchUrlValidationStatus("idle");
                                    setShowBatchWebsiteDropdown(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-3 text-left hover:bg-emerald-500/10 transition-colors flex items-center justify-between",
                                    batchSelectedWebsite?.id === website.id &&
                                      "bg-emerald-500/20",
                                    isDarkTheme ? "text-white" : "text-gray-900"
                                  )}
                                >
                                  <span className="truncate">
                                    {website.url}
                                  </span>
                                  {website.isDefault && (
                                    <Badge
                                      variant="secondary"
                                      className="flex-shrink-0 text-xs ml-2"
                                    >
                                      <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                      {state.uiLanguage === "zh"
                                        ? "默认"
                                        : "Default"}
                                    </Badge>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                        {/* Validation Status Message */}
                        {batchManualWebsiteUrl.trim() &&
                          batchUrlValidationStatus !== "idle" && (
                            <div
                              className={cn(
                                "text-xs flex items-center gap-1 mt-1",
                                batchUrlValidationStatus === "valid" &&
                                  "text-emerald-500",
                                batchUrlValidationStatus === "invalid" &&
                                  "text-red-500",
                                batchUrlValidationStatus === "validating" &&
                                  "text-yellow-500"
                              )}
                            >
                              {batchUrlValidationStatus === "validating" && (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>
                                    {state.uiLanguage === "zh"
                                      ? "正在验证..."
                                      : "Validating..."}
                                  </span>
                                </>
                              )}
                              {batchUrlValidationStatus === "valid" && (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>
                                    {state.uiLanguage === "zh"
                                      ? "网址有效，将用于跨市场分析"
                                      : "URL valid, will be used for cross-market analysis"}
                                  </span>
                                </>
                              )}
                              {batchUrlValidationStatus === "invalid" && (
                                <>
                                  <AlertCircle className="w-3 h-3" />
                                  <span>
                                    {state.uiLanguage === "zh"
                                      ? "请输入有效的网址"
                                      : "Please enter a valid URL"}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                      </div>
                    )}

                    {/* Keyword Input Field - Only show for blue-ocean mode */}
                    {miningMode === "blue-ocean" && (
                      <div
                        className={cn(
                          "flex-1 min-w-0 rounded-lg flex items-center px-4 h-14 transition-all border",
                          isDarkTheme
                            ? "bg-white/5 border-transparent focus-within:bg-black focus-within:border-emerald-500/30"
                            : "bg-white border-gray-200 focus-within:border-emerald-500/50"
                        )}
                      >
                        <Search
                          className={cn(
                            isDarkTheme ? "text-neutral-600" : "text-gray-400"
                          )}
                          size={18}
                        />
                        <input
                          type="text"
                          placeholder={t.batchInputPlaceholder}
                          className={cn(
                            "bg-transparent border-none outline-none w-full text-sm font-medium px-4 h-14",
                            isDarkTheme
                              ? "text-white placeholder:text-neutral-700"
                              : "text-gray-900 placeholder:text-gray-500"
                          )}
                          value={batchInput}
                          onChange={(e) => setBatchInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleBatchAnalyze()
                          }
                        />
                      </div>
                    )}
                    <button
                      onClick={handleBatchAnalyze}
                      disabled={
                        miningMode === "blue-ocean"
                          ? !batchInput.trim()
                          : miningMode === "existing-website-audit"
                          ? !batchSelectedWebsite
                          : !batchInput.trim()
                      }
                      className={cn(
                        "bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-10 rounded-lg transition-all uppercase tracking-widest shadow-lg shadow-emerald-900/10 active:scale-[0.98] h-14 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap",
                        isDarkTheme && "shadow-emerald-900/20"
                      )}
                    >
                      <Search className="w-4 h-4 inline-block mr-2" />
                      {t.btnBatchAnalyze}
                    </button>
                  </div>

                  {/* Mining Settings Panel - Same as blue-ocean mode */}
                  <section className="space-y-4 mt-8">
                    <div className="flex items-center space-x-2 px-2">
                      <Settings
                        size={14}
                        className={cn(
                          isDarkTheme ? "text-emerald-500" : "text-emerald-600"
                        )}
                      />
                      <h3
                        className={cn(
                          "text-[10px] font-black uppercase tracking-[0.2em]",
                          isDarkTheme ? "text-neutral-400" : "text-gray-600"
                        )}
                      >
                        {state.uiLanguage === "zh"
                          ? "挖词设置"
                          : "Mining Settings"}
                      </h3>
                    </div>
                    <div
                      className={cn(
                        "grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-lg border",
                        isDarkTheme
                          ? "bg-black/40 border-emerald-500/20"
                          : "bg-white border-emerald-500/30"
                      )}
                    >
                      {/* Words Per Round */}
                      <div className="space-y-2">
                        <label
                          className={cn(
                            "flex items-center gap-2 text-xs font-semibold",
                            isDarkTheme ? "text-neutral-400" : "text-gray-600"
                          )}
                        >
                          <Cpu
                            size={14}
                            className={cn(
                              isDarkTheme
                                ? "text-emerald-500"
                                : "text-emerald-600"
                            )}
                          />
                          {state.uiLanguage === "zh"
                            ? "每轮词语数"
                            : "Words Per Round"}
                        </label>
                        <Input
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
                          className={cn(
                            "text-sm font-medium h-10",
                            isDarkTheme
                              ? "border-white/10 bg-white/5 text-white"
                              : "border-gray-200 bg-white text-gray-900"
                          )}
                        />
                        <p
                          className={cn(
                            "text-[10px]",
                            isDarkTheme ? "text-neutral-600" : "text-gray-500"
                          )}
                        >
                          {state.uiLanguage === "zh"
                            ? "范围: 5-20"
                            : "Range: 5-20"}
                        </p>
                      </div>

                      {/* Mining Strategy */}
                      <div className="space-y-2">
                        <label
                          className={cn(
                            "flex items-center gap-2 text-xs font-semibold",
                            isDarkTheme ? "text-neutral-400" : "text-gray-600"
                          )}
                        >
                          <LayoutGrid
                            size={14}
                            className={cn(
                              isDarkTheme
                                ? "text-emerald-500"
                                : "text-emerald-600"
                            )}
                          />
                          {state.uiLanguage === "zh"
                            ? "挖掘策略"
                            : "Mining Strategy"}
                        </label>
                        <Select
                          value={state.miningStrategy}
                          onValueChange={(value) =>
                            setState((prev) => ({
                              ...prev,
                              miningStrategy: value as
                                | "horizontal"
                                | "vertical",
                            }))
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "text-sm font-medium h-10",
                              isDarkTheme
                                ? "border-white/10 bg-white/5 text-white"
                                : "border-gray-200 bg-white text-gray-900"
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent
                            className={cn(
                              isDarkTheme
                                ? "bg-black/90 border-emerald-500/30"
                                : "bg-white border-emerald-500/30"
                            )}
                          >
                            <SelectItem
                              value="horizontal"
                              className={cn(
                                isDarkTheme
                                  ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                  : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                              )}
                            >
                              {state.uiLanguage === "zh"
                                ? "横向挖掘(广泛主题)"
                                : "Horizontal Mining (Broad Topics)"}
                            </SelectItem>
                            <SelectItem
                              value="vertical"
                              className={cn(
                                isDarkTheme
                                  ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                                  : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
                              )}
                            >
                              {state.uiLanguage === "zh"
                                ? "纵向挖掘(深度挖掘)"
                                : "Vertical Mining (Deep Dive)"}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p
                          className={cn(
                            "text-[10px]",
                            isDarkTheme ? "text-neutral-600" : "text-gray-500"
                          )}
                        >
                          {state.uiLanguage === "zh"
                            ? "探索不同的平行主题"
                            : "Explore different parallel topics"}
                        </p>
                      </div>
                    </div>
                  </section>

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
                            ? "bg-black/40 border-emerald-500/20"
                            : "bg-white border-emerald-200"
                        }`}
                      >
                        <div
                          className={`divide-y max-h-96 overflow-y-auto custom-scrollbar ${
                            isDarkTheme
                              ? "divide-emerald-500/10"
                              : "divide-gray-200"
                          }`}
                        >
                          {state.batchArchives.map((arch) => (
                            <div
                              key={arch.id}
                              onClick={() => loadBatchArchive(arch)}
                              className={`p-4 flex items-center justify-between cursor-pointer group transition-colors ${
                                isDarkTheme
                                  ? "hover:bg-emerald-500/10"
                                  : "hover:bg-emerald-50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded text-emerald-400 transition-colors ${
                                    isDarkTheme
                                      ? "bg-emerald-500/20 group-hover:bg-emerald-500/30"
                                      : "bg-emerald-100 group-hover:bg-emerald-200"
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
                                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                          : "bg-emerald-100 text-emerald-700 border-emerald-300"
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

              {/* Prompt Config (Collapsible) */}
              <div
                className={`mt-12 border rounded-xl backdrop-blur-sm shadow-sm overflow-hidden max-w-2xl mx-auto ${
                  isDarkTheme
                    ? "border-emerald-500/20 bg-black/40"
                    : "border-emerald-200 bg-white"
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
                      ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-white"
                      : "bg-emerald-50 hover:bg-emerald-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-emerald-400" />
                    {t.configPrompts}
                  </div>
                  <div
                    className={`transform transition-transform ${
                      state.showPrompts ? "rotate-180" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 text-emerald-400" />
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
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-emerald-100 text-emerald-700 border-emerald-300"
                            : isDarkTheme
                            ? "bg-black/60 text-slate-400 border-emerald-500/20"
                            : "bg-gray-100 text-gray-600 border-emerald-200"
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
                          className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" />{" "}
                          {t.btnTranslatePrompt}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <textarea
                          className={`w-full h-32 p-3 border rounded-md text-sm font-mono focus:ring-2 outline-none ${
                            isDarkTheme
                              ? "border-emerald-500/30 bg-black/60 focus:ring-emerald-500/50 text-white placeholder:text-slate-500"
                              : "border-emerald-300 bg-white focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400"
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
                                ? "bg-black/60 border-emerald-500/30 text-slate-300"
                                : "bg-gray-50 border-emerald-200 text-gray-700"
                            }`}
                          >
                            <div
                              className={`text-[10px] uppercase font-bold mb-1 ${
                                isDarkTheme
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
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
                          className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          <RefreshCw className="w-3 h-3" />{" "}
                          {t.btnTranslatePrompt}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <textarea
                          className={`w-full h-32 p-3 border rounded-md text-sm font-mono focus:ring-2 outline-none ${
                            isDarkTheme
                              ? "border-emerald-500/30 bg-black/60 focus:ring-emerald-500/50 text-white placeholder:text-slate-500"
                              : "border-emerald-300 bg-white focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400"
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
                                ? "bg-black/60 border-emerald-500/30 text-slate-300"
                                : "bg-gray-50 border-emerald-200 text-gray-700"
                            }`}
                          >
                            <div
                              className={`text-[10px] uppercase font-bold mb-1 ${
                                isDarkTheme
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
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
                          <FolderOpen className="w-4 h-4 text-emerald-500" />
                          {t.agentConfigs}
                        </h4>
                        <button
                          onClick={() =>
                            setState((prev) => ({
                              ...prev,
                              step: "workflow-config",
                            }))
                          }
                          className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium"
                        >
                          <Settings className="w-3 h-3" />
                          {state.uiLanguage === "zh" ? "高级配置" : "Advanced"}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mb-4 bg-emerald-50 border border-emerald-100 rounded p-2">
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
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
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
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
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
                                    ? "bg-emerald-50 border-emerald-200"
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
                                      <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold">
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
                                      className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors font-medium"
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
                  <div className="bg-emerald-500 p-3 rounded-lg">
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
                      ? "text-slate-400 hover:text-emerald-400"
                      : "text-gray-600 hover:text-emerald-600"
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
                      ? "bg-black/40 border-emerald-500/20"
                      : "bg-white border-emerald-200"
                  }`}
                >
                  <h3
                    className={`text-xl font-bold mb-2 flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Search className="w-5 h-5 text-emerald-400" />
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
                    onDelete={deleteWorkflowConfig}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>

                {/* Batch Workflow */}
                <div
                  className={`backdrop-blur-sm rounded-xl shadow-sm border p-6 ${
                    isDarkTheme
                      ? "bg-black/40 border-emerald-500/20"
                      : "bg-white border-emerald-200"
                  }`}
                >
                  <h3
                    className={`text-xl font-bold mb-2 flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Languages className="w-5 h-5 text-emerald-400" />
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
                    onDelete={deleteWorkflowConfig}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>

                {/* Deep Dive Workflow */}
                <div
                  className={`backdrop-blur-sm rounded-xl shadow-sm border p-6 ${
                    isDarkTheme
                      ? "bg-black/40 border-emerald-500/20"
                      : "bg-white border-emerald-200"
                  }`}
                >
                  <h3
                    className={`text-xl font-bold mb-2 flex items-center gap-2 ${
                      isDarkTheme ? "text-white" : "text-gray-900"
                    }`}
                  >
                    <Lightbulb className="w-5 h-5 text-emerald-400" />
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
                    onDelete={deleteWorkflowConfig}
                    t={t}
                    isDarkTheme={isDarkTheme}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test Agent Mode */}
          {state.step === "test-agents" && (
            <TestAgentPanel
              isDarkTheme={isDarkTheme}
              onClose={() => setState((prev) => ({ ...prev, step: "input" }))}
            />
          )}

          {/* STEP 2: MINING */}
          {state.step === "mining" && (
            <div className="flex-1 flex flex-col h-[calc(100vh-200px)] min-h-[500px] relative">
              {/* SUCCESS OVERLAY */}
              {state.miningSuccess && state.showSuccessPrompt && (
                <div className="absolute inset-0 z-10 bg-black/90 backdrop-blur-sm rounded-xl flex items-start justify-center p-4 pt-8 animate-fade-in overflow-y-auto">
                  <div className="relative bg-black/80 backdrop-blur-sm rounded-xl shadow-2xl border border-emerald-500/30 p-8 max-w-md w-full text-center">
                    {/* Close Button */}
                    <button
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          showSuccessPrompt: false,
                        }))
                      }
                      className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors p-1 rounded hover:bg-zinc-700/50"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {t.miningSuccessTitle}
                    </h3>
                    <p className="text-slate-400 mb-6">{t.miningSuccessDesc}</p>

                    <div className="bg-black/60 rounded-lg p-4 mb-6 border border-emerald-500/20">
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
                        className="w-full py-3 bg-emerald-500 text-black rounded-lg hover:bg-emerald-600 transition-colors font-bold shadow-lg shadow-emerald-500/20"
                      >
                        {t.viewResults}
                      </button>
                      <button
                        onClick={continueMining}
                        className="w-full py-3 bg-black/60 text-white border border-emerald-500/30 rounded-lg hover:bg-emerald-500/10 transition-colors font-medium"
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
                    className={`w-6 h-6 text-emerald-400 ${
                      !state.miningSuccess && "animate-spin"
                    }`}
                  />
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {t.generating}
                      <span className="text-sm font-normal bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">
                        Round {state.miningRound}
                      </span>
                    </h3>
                    <p className="text-sm text-slate-400">{t.analyzing}</p>
                  </div>
                </div>
                {state.miningSuccess && !state.showSuccessPrompt && (
                  <button
                    onClick={() =>
                      setState((prev) => ({ ...prev, showSuccessPrompt: true }))
                    }
                    className={`flex items-center gap-2 px-4 py-2 border rounded-md transition-colors text-sm font-medium shadow-sm ${
                      isDarkTheme
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {state.uiLanguage === "zh" ? "完成查看" : "Complete"}
                  </button>
                )}
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
                      ? "bg-black/40 border-emerald-500/20"
                      : "bg-white border-emerald-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4 text-emerald-400" />
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
                            ? "border-emerald-500/30 bg-black/60 focus:ring-emerald-500/50 text-white"
                            : "border-emerald-300 bg-white focus:ring-emerald-500 text-gray-900"
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
                            ? "border-emerald-500/30 bg-black/60 focus:ring-emerald-500/50 text-white"
                            : "border-emerald-300 bg-white focus:ring-emerald-500 text-gray-900"
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
                            ? "border-emerald-500/30 bg-black/60 focus:ring-emerald-500/50 text-white placeholder:text-slate-500"
                            : "border-emerald-300 bg-white focus:ring-emerald-500 text-gray-900 placeholder:text-gray-400"
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
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {t.batchAnalyzing}
                      <span className="text-sm font-normal bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">
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
                    <Languages className="w-6 h-6 text-emerald-400" />
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
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-md hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    {t.downloadCSV}
                  </button>
                  <button
                    onClick={reset}
                    className={`px-4 py-2 text-sm font-medium transition-colors border rounded-md ${
                      isDarkTheme
                        ? "text-slate-400 hover:text-emerald-400 border-emerald-500/30 bg-black/60 hover:bg-emerald-500/10"
                        : "text-gray-700 hover:text-emerald-600 border-emerald-300 bg-white hover:bg-emerald-50"
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
                    ? "bg-black/40 border-emerald-500/20"
                    : "bg-white border-emerald-200"
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
                          ? "bg-black/60 text-slate-400 border-emerald-500/20"
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
                    <tbody className="divide-y divide-emerald-500/10">
                      {state.batchKeywords.map((item) => {
                        const isExpanded = state.expandedRowId === item.id;

                        return (
                          <React.Fragment key={item.id}>
                            <tr
                              className={`transition-colors ${
                                isExpanded
                                  ? "bg-emerald-500/10"
                                  : "hover:bg-emerald-500/5"
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
                                  <ChevronUp className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-emerald-400" />
                                )}
                              </td>
                              <td
                                className={`px-4 py-4 cursor-pointer ${
                                  isDarkTheme
                                    ? "text-white/80"
                                    : "text-gray-700"
                                }`}
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
                                className={`px-4 py-4 font-medium cursor-pointer ${
                                  isDarkTheme ? "text-white" : "text-gray-900"
                                }`}
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {item.topDomainType || "-"}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    item.probability === ProbabilityLevel.HIGH
                                      ? "bg-emerald-500/30 text-emerald-400 border-emerald-500/50"
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
                                    className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors text-xs font-medium border border-emerald-500/30"
                                    title={t.verifyBtn}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {t.verifyBtn}
                                  </a>

                                  <button
                                    className={`text-xs flex items-center gap-1 transition-colors ${
                                      isDarkTheme
                                        ? "text-white/70 hover:text-emerald-400"
                                        : "text-gray-600 hover:text-emerald-600"
                                    }`}
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
                                    className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors text-xs font-medium"
                                    title={t.btnGenerateArticle || t.deepDive}
                                  >
                                    <FileText className="w-3 h-3" />
                                    {t.btnGenerateArticle || t.deepDive}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Detail View */}
                            {isExpanded && (
                              <tr
                                className={`animate-fade-in border-b ${
                                  isDarkTheme
                                    ? "bg-black border-emerald-500/20"
                                    : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <td colSpan={6} className="px-4 py-6">
                                  <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1 space-y-4">
                                      {/* SE Ranking Data Section */}
                                      {item.serankingData &&
                                        item.serankingData.is_data_found && (
                                          <Card
                                            className={cn(
                                              isDarkTheme
                                                ? "bg-black border-emerald-500/20"
                                                : "bg-white border-emerald-200"
                                            )}
                                          >
                                            <CardHeader className="pb-3">
                                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <TrendingUp
                                                  className={cn(
                                                    "w-4 h-4",
                                                    isDarkTheme
                                                      ? "text-emerald-400"
                                                      : "text-emerald-600"
                                                  )}
                                                />
                                                <span
                                                  className={cn(
                                                    isDarkTheme
                                                      ? "text-white"
                                                      : "text-slate-900"
                                                  )}
                                                >
                                                  SEO词研究工具 (SE Ranking
                                                  Data)
                                                </span>
                                              </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                {/* Search Volume */}
                                                <Card
                                                  className={cn(
                                                    isDarkTheme
                                                      ? "bg-black border-emerald-500/20"
                                                      : "bg-emerald-50 border-emerald-200"
                                                  )}
                                                >
                                                  <CardContent className="p-4">
                                                    <div
                                                      className={cn(
                                                        "text-xs font-medium mb-1.5",
                                                        isDarkTheme
                                                          ? "text-white/70"
                                                          : "text-emerald-700"
                                                      )}
                                                    >
                                                      SEARCH VOLUME
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xl font-bold",
                                                        isDarkTheme
                                                          ? "text-emerald-400"
                                                          : "text-emerald-600"
                                                      )}
                                                    >
                                                      {item.serankingData.volume?.toLocaleString() ||
                                                        "N/A"}
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xs mt-1",
                                                        isDarkTheme
                                                          ? "text-white/60"
                                                          : "text-emerald-600/70"
                                                      )}
                                                    >
                                                      monthly searches
                                                    </div>
                                                  </CardContent>
                                                </Card>

                                                {/* Keyword Difficulty */}
                                                <Card
                                                  className={cn(
                                                    isDarkTheme
                                                      ? "bg-black border-emerald-500/20"
                                                      : "bg-emerald-50 border-emerald-200"
                                                  )}
                                                >
                                                  <CardContent className="p-4">
                                                    <div
                                                      className={cn(
                                                        "text-xs font-medium mb-1.5",
                                                        isDarkTheme
                                                          ? "text-white/70"
                                                          : "text-emerald-700"
                                                      )}
                                                    >
                                                      KEYWORD DIFFICULTY
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xl font-bold",
                                                        (item.serankingData
                                                          .difficulty || 0) <=
                                                          40
                                                          ? isDarkTheme
                                                            ? "text-emerald-400"
                                                            : "text-emerald-600"
                                                          : (item.serankingData
                                                              .difficulty ||
                                                              0) <= 60
                                                          ? isDarkTheme
                                                            ? "text-yellow-400"
                                                            : "text-yellow-600"
                                                          : isDarkTheme
                                                          ? "text-red-400"
                                                          : "text-red-600"
                                                      )}
                                                    >
                                                      {item.serankingData
                                                        .difficulty || "N/A"}
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xs mt-1",
                                                        isDarkTheme
                                                          ? "text-white/60"
                                                          : "text-emerald-600/70"
                                                      )}
                                                    >
                                                      {(item.serankingData
                                                        .difficulty || 0) <= 40
                                                        ? "Low competition"
                                                        : (item.serankingData
                                                            .difficulty || 0) <=
                                                          60
                                                        ? "Medium competition"
                                                        : "High competition"}
                                                    </div>
                                                  </CardContent>
                                                </Card>

                                                {/* CPC */}
                                                <Card
                                                  className={cn(
                                                    isDarkTheme
                                                      ? "bg-black border-emerald-500/20"
                                                      : "bg-emerald-50 border-emerald-200"
                                                  )}
                                                >
                                                  <CardContent className="p-4">
                                                    <div
                                                      className={cn(
                                                        "text-xs font-medium mb-1.5",
                                                        isDarkTheme
                                                          ? "text-white/70"
                                                          : "text-emerald-700"
                                                      )}
                                                    >
                                                      CPC
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xl font-bold",
                                                        isDarkTheme
                                                          ? "text-emerald-400"
                                                          : "text-emerald-600"
                                                      )}
                                                    >
                                                      $
                                                      {item.serankingData.cpc?.toFixed(
                                                        2
                                                      ) || "N/A"}
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xs mt-1",
                                                        isDarkTheme
                                                          ? "text-white/60"
                                                          : "text-emerald-600/70"
                                                      )}
                                                    >
                                                      cost per click
                                                    </div>
                                                  </CardContent>
                                                </Card>

                                                {/* Competition */}
                                                <Card
                                                  className={cn(
                                                    isDarkTheme
                                                      ? "bg-black border-emerald-500/20"
                                                      : "bg-emerald-50 border-emerald-200"
                                                  )}
                                                >
                                                  <CardContent className="p-4">
                                                    <div
                                                      className={cn(
                                                        "text-xs font-medium mb-1.5",
                                                        isDarkTheme
                                                          ? "text-white/70"
                                                          : "text-emerald-700"
                                                      )}
                                                    >
                                                      COMPETITION
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xl font-bold",
                                                        isDarkTheme
                                                          ? "text-emerald-400"
                                                          : "text-emerald-600"
                                                      )}
                                                    >
                                                      {item.serankingData
                                                        .competition
                                                        ? typeof item
                                                            .serankingData
                                                            .competition ===
                                                          "number"
                                                          ? (
                                                              item.serankingData
                                                                .competition *
                                                              100
                                                            ).toFixed(1) + "%"
                                                          : item.serankingData
                                                              .competition
                                                        : "N/A"}
                                                    </div>
                                                    <div
                                                      className={cn(
                                                        "text-xs mt-1",
                                                        isDarkTheme
                                                          ? "text-white/60"
                                                          : "text-emerald-600/70"
                                                      )}
                                                    >
                                                      advertiser competition
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              </div>

                                              {/* History Trend - Full Width Below */}
                                              {item.serankingData
                                                .history_trend &&
                                                Object.keys(
                                                  item.serankingData
                                                    .history_trend
                                                ).length > 0 && (
                                                  <Card
                                                    className={cn(
                                                      isDarkTheme
                                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                                        : "bg-emerald-50 border-emerald-200"
                                                    )}
                                                  >
                                                    <CardContent className="p-4">
                                                      <div
                                                        className={cn(
                                                          "text-xs font-semibold mb-3 flex items-center gap-2",
                                                          isDarkTheme
                                                            ? "text-emerald-300"
                                                            : "text-emerald-700"
                                                        )}
                                                      >
                                                        <TrendingUp
                                                          className={cn(
                                                            "w-4 h-4",
                                                            isDarkTheme
                                                              ? "text-emerald-400"
                                                              : "text-emerald-600"
                                                          )}
                                                        />
                                                        SEARCH VOLUME TREND
                                                        (Last 12 Months)
                                                      </div>
                                                      <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                                        {Object.entries(
                                                          item.serankingData
                                                            .history_trend
                                                        )
                                                          .sort(
                                                            (
                                                              [dateA],
                                                              [dateB]
                                                            ) =>
                                                              dateA.localeCompare(
                                                                dateB
                                                              )
                                                          )
                                                          .map(
                                                            ([
                                                              date,
                                                              volume,
                                                            ]) => {
                                                              const monthYear =
                                                                new Date(
                                                                  date
                                                                ).toLocaleDateString(
                                                                  "en-US",
                                                                  {
                                                                    month:
                                                                      "short",
                                                                    year: "2-digit",
                                                                  }
                                                                );
                                                              return (
                                                                <Card
                                                                  key={date}
                                                                  className={cn(
                                                                    "text-center",
                                                                    isDarkTheme
                                                                      ? "bg-black border-emerald-500/20"
                                                                      : "bg-white border-emerald-200"
                                                                  )}
                                                                >
                                                                  <CardContent className="p-2">
                                                                    <div
                                                                      className={cn(
                                                                        "text-xs font-medium mb-1",
                                                                        isDarkTheme
                                                                          ? "text-emerald-300/80"
                                                                          : "text-emerald-600/80"
                                                                      )}
                                                                    >
                                                                      {
                                                                        monthYear
                                                                      }
                                                                    </div>
                                                                    <div
                                                                      className={cn(
                                                                        "text-sm font-bold",
                                                                        isDarkTheme
                                                                          ? "text-emerald-400"
                                                                          : "text-emerald-600"
                                                                      )}
                                                                    >
                                                                      {typeof volume ===
                                                                      "number"
                                                                        ? volume.toLocaleString()
                                                                        : volume}
                                                                    </div>
                                                                  </CardContent>
                                                                </Card>
                                                              );
                                                            }
                                                          )}
                                                      </div>
                                                    </CardContent>
                                                  </Card>
                                                )}
                                            </CardContent>
                                          </Card>
                                        )}

                                      {/* Search Intent Section */}
                                      {(item.searchIntent ||
                                        item.intentAnalysis) && (
                                        <Card
                                          className={cn(
                                            isDarkTheme
                                              ? "bg-black border-emerald-500/30"
                                              : "bg-white border-emerald-200"
                                          )}
                                        >
                                          <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                              <BrainCircuit
                                                className={cn(
                                                  "w-4 h-4",
                                                  isDarkTheme
                                                    ? "text-emerald-400"
                                                    : "text-emerald-600"
                                                )}
                                              />
                                              <span
                                                className={cn(
                                                  isDarkTheme
                                                    ? "text-white"
                                                    : "text-slate-900"
                                                )}
                                              >
                                                Search Intent Analysis
                                              </span>
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="space-y-3">
                                            {item.searchIntent && (
                                              <Card
                                                className={cn(
                                                  isDarkTheme
                                                    ? "bg-black border-emerald-500/30"
                                                    : "bg-emerald-50 border-emerald-200"
                                                )}
                                              >
                                                <CardContent className="p-4">
                                                  <div
                                                    className={cn(
                                                      "text-xs font-semibold mb-2",
                                                      isDarkTheme
                                                        ? "text-emerald-400"
                                                        : "text-emerald-700"
                                                    )}
                                                  >
                                                    USER INTENT
                                                  </div>
                                                  <p
                                                    className={cn(
                                                      "text-sm leading-relaxed",
                                                      isDarkTheme
                                                        ? "text-white"
                                                        : "text-slate-700"
                                                    )}
                                                  >
                                                    {item.searchIntent}
                                                  </p>
                                                </CardContent>
                                              </Card>
                                            )}
                                            {item.intentAnalysis && (
                                              <Card
                                                className={cn(
                                                  isDarkTheme
                                                    ? "bg-black border-emerald-500/30"
                                                    : "bg-emerald-50 border-emerald-200"
                                                )}
                                              >
                                                <CardContent className="p-4">
                                                  <div
                                                    className={cn(
                                                      "text-xs font-semibold mb-2",
                                                      isDarkTheme
                                                        ? "text-emerald-400"
                                                        : "text-emerald-700"
                                                    )}
                                                  >
                                                    INTENT vs SERP MATCH
                                                  </div>
                                                  <p
                                                    className={cn(
                                                      "text-sm leading-relaxed",
                                                      isDarkTheme
                                                        ? "text-white"
                                                        : "text-slate-700"
                                                    )}
                                                  >
                                                    {item.intentAnalysis}
                                                  </p>
                                                </CardContent>
                                              </Card>
                                            )}
                                          </CardContent>
                                        </Card>
                                      )}

                                      {/* Analysis Reasoning */}
                                      <Card
                                        className={cn(
                                          isDarkTheme
                                            ? "bg-black border-emerald-500/20"
                                            : "bg-white border-emerald-200"
                                        )}
                                      >
                                        <CardHeader className="pb-3">
                                          <CardTitle
                                            className={cn(
                                              "text-sm font-semibold",
                                              isDarkTheme
                                                ? "text-white"
                                                : "text-slate-900"
                                            )}
                                          >
                                            Analysis Reasoning
                                          </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div
                                            className={cn(
                                              "prose prose-sm max-w-none",
                                              isDarkTheme
                                                ? "prose-invert prose-emerald prose-headings:text-white prose-p:text-white prose-strong:text-white prose-li:text-white"
                                                : "prose-slate"
                                            )}
                                          >
                                            <MarkdownContent
                                              content={
                                                item.reasoning ||
                                                "No reasoning provided"
                                              }
                                              isDarkTheme={isDarkTheme}
                                            />
                                          </div>
                                        </CardContent>
                                      </Card>

                                      {/* Summary Stats */}
                                      <Card
                                        className={cn(
                                          isDarkTheme
                                            ? "bg-black border-emerald-500/20"
                                            : "bg-white border-emerald-200"
                                        )}
                                      >
                                        <CardContent className="p-4">
                                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            {/* SE Ranking Volume (replaces SERP estimate) */}
                                            {item.serankingData &&
                                            item.serankingData.is_data_found ? (
                                              <div>
                                                <span
                                                  className={cn(
                                                    "text-xs block mb-1",
                                                    isDarkTheme
                                                      ? "text-emerald-300/80"
                                                      : "text-emerald-700"
                                                  )}
                                                >
                                                  Search Volume (SE Ranking)
                                                </span>
                                                <span
                                                  className={cn(
                                                    "text-sm font-semibold",
                                                    isDarkTheme
                                                      ? "text-emerald-400"
                                                      : "text-emerald-600"
                                                  )}
                                                >
                                                  {item.serankingData.volume?.toLocaleString() ||
                                                    "N/A"}
                                                </span>
                                              </div>
                                            ) : (
                                              <div>
                                                <span
                                                  className={cn(
                                                    "text-xs block mb-1",
                                                    isDarkTheme
                                                      ? "text-emerald-300/80"
                                                      : "text-emerald-700"
                                                  )}
                                                >
                                                  Reference SERP Count
                                                </span>
                                                <span
                                                  className={cn(
                                                    "text-sm font-semibold",
                                                    isDarkTheme
                                                      ? "text-emerald-100"
                                                      : "text-slate-900"
                                                  )}
                                                >
                                                  {item.serpResultCount === -1
                                                    ? "Unknown (Many)"
                                                    : item.serpResultCount ??
                                                      "Unknown"}
                                                </span>
                                              </div>
                                            )}

                                            {/* Keyword Difficulty (if SE Ranking data available) */}
                                            {item.serankingData &&
                                              item.serankingData
                                                .is_data_found && (
                                                <div>
                                                  <span
                                                    className={cn(
                                                      "text-xs block mb-1",
                                                      isDarkTheme
                                                        ? "text-emerald-300/80"
                                                        : "text-emerald-700"
                                                    )}
                                                  >
                                                    Keyword Difficulty
                                                  </span>
                                                  <span
                                                    className={cn(
                                                      "text-sm font-semibold",
                                                      (item.serankingData
                                                        .difficulty || 0) <= 40
                                                        ? isDarkTheme
                                                          ? "text-emerald-400"
                                                          : "text-emerald-600"
                                                        : (item.serankingData
                                                            .difficulty || 0) <=
                                                          60
                                                        ? isDarkTheme
                                                          ? "text-yellow-400"
                                                          : "text-yellow-600"
                                                        : isDarkTheme
                                                        ? "text-red-400"
                                                        : "text-red-600"
                                                    )}
                                                  >
                                                    {item.serankingData
                                                      .difficulty || "N/A"}
                                                  </span>
                                                </div>
                                              )}

                                            <div>
                                              <span
                                                className={cn(
                                                  "text-xs block mb-1",
                                                  isDarkTheme
                                                    ? "text-emerald-300/80"
                                                    : "text-emerald-700"
                                                )}
                                              >
                                                Top Competitor Type
                                              </span>
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "text-xs",
                                                  isDarkTheme
                                                    ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                                                    : "border-emerald-300 text-emerald-700 bg-emerald-50"
                                                )}
                                              >
                                                {item.topDomainType ?? "-"}
                                              </Badge>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>

                                      {/* SERP EVIDENCE IN DETAILS */}
                                      {item.serpResultCount === 0 ? (
                                        <Card
                                          className={cn(
                                            isDarkTheme
                                              ? "bg-emerald-500/10 border-emerald-500/30"
                                              : "bg-emerald-50 border-emerald-200"
                                          )}
                                        >
                                          <CardContent className="p-4">
                                            <div
                                              className={cn(
                                                "flex items-center gap-2 text-sm font-medium",
                                                isDarkTheme
                                                  ? "text-emerald-300"
                                                  : "text-emerald-700"
                                              )}
                                            >
                                              <Lightbulb
                                                className={cn(
                                                  "w-4 h-4",
                                                  isDarkTheme
                                                    ? "text-emerald-400"
                                                    : "text-emerald-600"
                                                )}
                                              />
                                              No direct competitors found in
                                              search.
                                            </div>
                                          </CardContent>
                                        </Card>
                                      ) : (
                                        item.topSerpSnippets &&
                                        item.topSerpSnippets.length > 0 && (
                                          <Card
                                            className={cn(
                                              isDarkTheme
                                                ? "bg-black/40 border-emerald-500/20"
                                                : "bg-white border-emerald-200"
                                            )}
                                          >
                                            <CardHeader className="pb-3">
                                              <div className="flex justify-between items-center">
                                                <CardTitle
                                                  className={cn(
                                                    "text-sm font-semibold",
                                                    isDarkTheme
                                                      ? "text-emerald-100"
                                                      : "text-slate-900"
                                                  )}
                                                >
                                                  {t.serpEvidence}
                                                </CardTitle>
                                                <Badge
                                                  variant="outline"
                                                  className={cn(
                                                    "text-[10px]",
                                                    isDarkTheme
                                                      ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10"
                                                      : "border-emerald-200 text-emerald-700 bg-emerald-50"
                                                  )}
                                                >
                                                  {t.serpEvidenceDisclaimer}
                                                </Badge>
                                              </div>
                                            </CardHeader>
                                            <CardContent>
                                              <div className="space-y-3">
                                                {item.topSerpSnippets
                                                  .slice(0, 3)
                                                  .map((snip, i) => (
                                                    <Card
                                                      key={i}
                                                      className={cn(
                                                        isDarkTheme
                                                          ? "bg-emerald-500/10 border-emerald-500/30"
                                                          : "bg-emerald-50 border-emerald-200"
                                                      )}
                                                    >
                                                      <CardContent className="p-3">
                                                        <div
                                                          className={cn(
                                                            "text-sm font-semibold mb-1 truncate",
                                                            isDarkTheme
                                                              ? "text-emerald-300"
                                                              : "text-emerald-700"
                                                          )}
                                                        >
                                                          {snip.title}
                                                        </div>
                                                        <div
                                                          className={cn(
                                                            "text-xs mb-2 truncate",
                                                            isDarkTheme
                                                              ? "text-emerald-400"
                                                              : "text-emerald-600"
                                                          )}
                                                        >
                                                          {snip.url}
                                                        </div>
                                                        <div
                                                          className={cn(
                                                            "text-xs line-clamp-2 leading-relaxed",
                                                            isDarkTheme
                                                              ? "text-emerald-100/80"
                                                              : "text-slate-600"
                                                          )}
                                                        >
                                                          {snip.snippet}
                                                        </div>
                                                      </CardContent>
                                                    </Card>
                                                  ))}
                                              </div>
                                            </CardContent>
                                          </Card>
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
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
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
              <div className="mb-6 bg-black/40 backdrop-blur-sm rounded-xl shadow-sm border border-emerald-500/20 p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-bold text-white">
                    {state.deepDiveCurrentStep ||
                      (state.uiLanguage === "zh"
                        ? "初始化..."
                        : "Initializing...")}
                  </div>
                  <div className="text-sm font-bold text-emerald-400">
                    {Math.round(state.deepDiveProgress)}%
                  </div>
                </div>
                <div className="w-full bg-black/60 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
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
                      <FileText className="w-6 h-6 text-emerald-400" />
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
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      {t.exportHTML || "Export HTML"}
                    </button>
                    <button
                      onClick={() =>
                        setState((prev) => ({ ...prev, step: "results" }))
                      }
                      className="px-4 py-2 text-sm text-slate-500 hover:text-emerald-600 font-medium transition-colors border border-slate-200 rounded-md bg-white hover:bg-slate-50"
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
                                    // 只有在有 currentStrategyReport 时才显示模态框
                                    showDetailedAnalysisModal:
                                      !!prev.currentStrategyReport,
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
                {state.showDetailedAnalysisModal &&
                  state.currentStrategyReport && (
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
                                      ? "bg-emerald-100 text-emerald-800 border-2 border-emerald-300"
                                      : state.currentStrategyReport
                                          .rankingProbability ===
                                        ProbabilityLevel.MEDIUM
                                      ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
                                      : "bg-red-100 text-red-800 border-2 border-red-300"
                                  }`}
                                >
                                  {
                                    state.currentStrategyReport
                                      .rankingProbability
                                  }
                                </span>
                              </div>

                              {/* Core Keywords */}
                              {state.currentStrategyReport.coreKeywords &&
                                state.currentStrategyReport.coreKeywords
                                  .length > 0 && (
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
                                      state.currentStrategyReport
                                        .rankingAnalysis
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
                                                      ? "text-emerald-600"
                                                      : (data.serankingData
                                                          .difficulty || 0) <=
                                                        60
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
                                                <div className="text-sm font-bold text-emerald-600">
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
                                                  {data.serankingData
                                                    .competition
                                                    ? typeof data.serankingData
                                                        .competition ===
                                                      "number"
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
                                                    <div className="text-emerald-700 text-[10px] truncate mt-1">
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
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-emerald-100 text-emerald-700 border-emerald-300"
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
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-md hover:bg-emerald-600 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    {t.btnExpand}
                  </button>
                  <button
                    onClick={reset}
                    className={`px-4 py-2 text-sm font-medium transition-colors border rounded-md ${
                      isDarkTheme
                        ? "text-slate-400 hover:text-emerald-400 border-emerald-500/30 bg-black/60 hover:bg-emerald-500/10"
                        : "text-gray-700 hover:text-emerald-600 border-emerald-300 bg-white hover:bg-emerald-50"
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
                    ? "bg-black/40 border-emerald-500/20"
                    : "bg-gray-100 border-emerald-200"
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
                          ? "bg-black/60 border-emerald-500/30 focus:ring-emerald-500/50 text-white"
                          : "bg-white border-emerald-300 focus:ring-emerald-500 text-gray-900"
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
                          ? "bg-black/60 border-emerald-500/30 focus:ring-emerald-500/50 text-white"
                          : "bg-white border-emerald-300 focus:ring-emerald-500 text-gray-900"
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
                      ? "text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10"
                      : "text-gray-700 hover:text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  <Download className="w-4 h-4" /> {t.downloadCSV}
                </button>
              </div>

              {/* Table */}
              <div
                className={`backdrop-blur-sm rounded-b-xl shadow-sm border overflow-hidden min-h-[400px] ${
                  isDarkTheme
                    ? "bg-black/40 border-emerald-500/20"
                    : "bg-white border-emerald-200"
                }`}
              >
                <KeywordTable
                  keywords={getProcessedKeywords()}
                  expandedRowId={state.expandedRowId}
                  onToggleExpand={(id) =>
                    setState((prev) => ({ ...prev, expandedRowId: id }))
                  }
                  onDeepDive={handleDeepDive}
                  isDarkTheme={isDarkTheme}
                  uiLanguage={state.uiLanguage}
                  t={t}
                  MarkdownContent={MarkdownContent}
                />
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

        {/* Mining Guide Modal */}
        {showMiningGuide && (
          <KeywordMiningGuide
            uiLanguage={state.uiLanguage}
            onStart={handleMiningGuideStart}
            onCancel={() => setShowMiningGuide(false)}
          />
        )}
      </div>
    </div>
  );
}
