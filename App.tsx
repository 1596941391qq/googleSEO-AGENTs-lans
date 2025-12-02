
import React, { useState, useEffect, useRef } from 'react';
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
  FolderOpen
} from 'lucide-react';
import { AppState, KeywordData, ProbabilityLevel, LogEntry, AgentThought, ArchiveEntry, SEOStrategyReport, TargetLanguage, UILanguage, AgentConfig } from './types';
import { 
  generateKeywords, 
  analyzeRankingProbability, 
  translatePromptToSystemInstruction,
  translateText,
  generateDeepDiveStrategy,
  DEFAULT_GEN_PROMPT_EN,
  DEFAULT_ANALYZE_PROMPT_EN
} from './services/gemini';

// --- Constants & Translations ---

const TEXT = {
  en: {
    title: 'Google SEO Agent',
    step1: '1. Input',
    step2: '2. Mining Loop',
    step3: '3. Results',
    inputTitle: 'Define Your Niche',
    inputDesc: 'Enter a seed keyword. The Agent will iterate until it finds a HIGH probability "Blue Ocean" keyword or "Weak Competitor" gap.',
    placeholder: 'Enter keyword (e.g., Tractor parts)',
    targetMarket: 'Target Market',
    btnStart: 'Start Mining',
    btnStop: 'Stop Mining',
    btnTranslatePrompt: 'Optimize Prompt (AI)',
    generating: 'Mining Keywords...',
    analyzing: 'Analyzing Google SERP...',
    resultsTitle: 'Strategy Report',
    foundOpp: 'Found',
    opps: 'opportunities',
    recTitle: 'Top Recommendation',
    colKw: 'Keyword',
    colTrans: 'Translation',
    colVol: 'Vol.',
    colType: 'Top Type',
    colProb: 'Probability',
    colStrat: 'Strategy / Reason',
    configPrompts: 'Configure Agent Prompts',
    promptGenLabel: 'Generation Agent Prompt (Step 1)',
    promptAnlzLabel: 'Analysis Agent Prompt (Step 2)',
    logsTitle: 'System Logs',
    agentStreamTitle: 'Agent Thoughts',
    btnExpand: 'Continue Mining',
    newAnalysis: 'New Analysis',
    archivesTitle: 'Archives',
    noArchives: 'No saved reports yet.',
    filterAll: 'All Probabilities',
    filterHigh: 'High Only',
    downloadCSV: 'Export CSV',
    deepDive: 'Deep Dive Strategy',
    viewReport: 'Generate SEO Report',
    generatingReport: 'Generating Strategy...',
    modalTitle: 'SEO Content Strategy',
    close: 'Close',
    archiveSaved: 'Session archived automatically.',
    viewResults: 'View Results',
    miningSuccessTitle: 'Mining Complete',
    miningSuccessDesc: 'HIGH probability keywords found!',
    foundCount: 'High Probability Keywords',
    serpEvidence: 'Google Search Evidence',
    serpEvidenceDisclaimer: '* Data based on Google Search grounding.',
    showTransRef: 'Show Translation Reference',
    transRefLabel: 'Translated Prompt Reference (Read-only)',
    verifyBtn: 'Google Verify',
    agentConfigs: 'Agent Configurations',
    saveConfig: 'Save Config',
    updateConfig: 'Update',
    loadConfig: 'Load',
    configName: 'Config Name',
    noConfigs: 'No saved configurations yet.',
    configSaved: 'Configuration saved',
    enterConfigName: 'Enter config name...'
  },
  zh: {
    title: 'Google SEO 智能 Agent',
    step1: '1. 输入',
    step2: '2. 挖掘循环',
    step3: '3. 结果',
    inputTitle: '定义您的利基市场',
    inputDesc: '输入核心关键词。Agent 将循环挖掘，直到发现“蓝海词”或“弱竞争对手”（如论坛、PDF）占位的机会。',
    placeholder: '输入关键词 (例如: 拖拉机配件)',
    targetMarket: '目标市场语言',
    btnStart: '开始挖掘',
    btnStop: '停止挖掘',
    btnTranslatePrompt: 'AI 优化提示词',
    generating: '正在挖掘关键词...',
    analyzing: '正在分析 Google SERP...',
    resultsTitle: 'SEO 策略报告',
    foundOpp: '发现',
    opps: '个机会',
    recTitle: '首选推荐',
    colKw: '关键词',
    colTrans: '翻译/含义',
    colVol: '搜索量',
    colType: '首页类型',
    colProb: '上首页概率',
    colStrat: '策略 / 理由',
    configPrompts: '配置 Agent 提示词 (Prompt)',
    promptGenLabel: '生成 Agent 提示词 (第一步)',
    promptAnlzLabel: '分析 Agent 提示词 (第二步)',
    logsTitle: '系统运行日志',
    agentStreamTitle: 'Agent 思维流',
    btnExpand: '继续挖掘',
    newAnalysis: '开始新分析',
    archivesTitle: '历史存档',
    noArchives: '暂无存档记录',
    filterAll: '所有概率',
    filterHigh: '仅看 HIGH (推荐)',
    downloadCSV: '下载表格',
    deepDive: '深度挖掘',
    viewReport: '生成网站策略报告',
    generatingReport: '正在生成策略报告...',
    modalTitle: 'SEO 网站内容策略',
    close: '关闭',
    archiveSaved: '结果已自动存档',
    viewResults: '直接查看结果',
    miningSuccessTitle: '挖掘完成',
    miningSuccessDesc: '已发现 HIGH (高概率) 关键词！',
    foundCount: '个高概率机会',
    serpEvidence: 'Google 搜索证据',
    serpEvidenceDisclaimer: '* 数据基于 Google 搜索实时分析。',
    showTransRef: '显示翻译对照',
    transRefLabel: '提示词翻译参考 (只读)',
    verifyBtn: 'Google 验证',
    agentConfigs: 'Agent 配置存档',
    saveConfig: '保存配置',
    updateConfig: '更新',
    loadConfig: '加载',
    configName: '配置名称',
    noConfigs: '暂无保存的配置',
    configSaved: '配置已保存',
    enterConfigName: '输入配置名称...'
  }
};

const LANGUAGES: { code: TargetLanguage, label: string }[] = [
  { code: 'en', label: 'English (Global/US)' },
  { code: 'ru', label: 'Russian (Ru)' },
  { code: 'fr', label: 'French (Fr)' },
  { code: 'ja', label: 'Japanese (Jp)' },
  { code: 'ko', label: 'Korean (Kr)' },
  { code: 'pt', label: 'Portuguese (Pt)' },
  { code: 'id', label: 'Indonesian (Id)' },
  { code: 'es', label: 'Spanish (Es)' },
  { code: 'ar', label: 'Arabic (Ar)' },
];

// --- Components ---

const TerminalLog = ({ logs }: { logs: LogEntry[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-green-400 h-full overflow-hidden flex flex-col shadow-inner border border-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2 text-slate-500 uppercase tracking-wider text-[10px]">
        <Terminal className="w-3 h-3" />
        <span>System Logs</span>
      </div>
      <div ref={scrollRef} className="overflow-y-auto custom-scrollbar flex-1 space-y-1">
        {logs.map((log, i) => (
          <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'api' ? 'text-blue-300' : 'text-slate-300'}`}>
            <span className="text-slate-600 w-14 shrink-0">[{log.timestamp.split(' ')[0]}]</span>
            <span className="break-words">{log.type === 'api' ? '> ' : ''}{log.message}</span>
          </div>
        ))}
        <div className="animate-pulse">_</div>
      </div>
    </div>
  );
};

const SerpPreview = ({ keywords, label, disclaimer, t }: { keywords: KeywordData[], label: string, disclaimer: string, t: any }) => {
  const [isOpen, setIsOpen] = useState(true); // Default open

  if (!keywords || keywords.length === 0) return null;

  return (
    <div className="mt-2 border border-slate-200 rounded-md overflow-hidden bg-white">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 text-xs text-slate-600 font-medium transition-colors"
      >
        <div className="flex items-center gap-2">
           <Search className="w-3 h-3" />
           {label} ({keywords.length})
        </div>
        {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {isOpen && (
        <div className="bg-white p-2 space-y-3 border-t border-slate-100">
           <div className="text-[10px] text-amber-600 px-2 italic mb-2">{disclaimer}</div>
           {keywords.map((kw) => (
             <div key={kw.id} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0">
                <div className="flex justify-between items-start mb-1">
                   <div className="font-bold text-xs text-slate-800">{kw.keyword}</div>
                   <div className={`text-[10px] px-1.5 rounded-full ${
                      kw.probability === ProbabilityLevel.HIGH ? 'bg-green-100 text-green-700' : 
                      kw.probability === ProbabilityLevel.MEDIUM ? 'bg-yellow-100 text-yellow-700' : 'bg-red-50 text-red-500'
                   }`}>
                      {kw.probability}
                   </div>
                </div>
                {kw.topSerpSnippets && kw.topSerpSnippets.length > 0 ? (
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-100">
                    {kw.topSerpSnippets.slice(0, 3).map((snippet, idx) => (
                      <div key={idx} className="text-[10px]">
                        <div className="text-blue-600 truncate hover:underline cursor-pointer" title={snippet.title}>{snippet.title}</div>
                        <div className="text-green-700 truncate text-[9px]">{snippet.url}</div>
                        <div className="text-slate-500 line-clamp-2">{snippet.snippet}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic pl-2 border-l-2 border-slate-100">
                    No SERP snippets returned. (May be zero results or API missing data)
                  </div>
                )}
                {/* Verify Button in Stream */}
                <a 
                   href={`https://www.google.com/search?q=${encodeURIComponent(kw.keyword)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="mt-2 flex w-full items-center justify-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] py-1 rounded border border-blue-200 transition-colors font-medium"
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

const AgentStream = ({ thoughts, t }: { thoughts: AgentThought[], t: any }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div className="bg-white rounded-lg p-4 h-full overflow-hidden flex flex-col shadow-sm border border-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2 text-slate-500 uppercase tracking-wider text-[10px]">
        <BrainCircuit className="w-3 h-3 text-purple-600" />
        <span>{t.agentStreamTitle}</span>
      </div>
      <div ref={scrollRef} className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2">
        {thoughts.map((thought) => (
          <div key={thought.id} className="animate-fade-in">
             <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  thought.type === 'generation' ? 'bg-blue-100 text-blue-700' : 
                  thought.type === 'analysis' ? 'bg-purple-100 text-purple-700' : 
                  'bg-green-100 text-green-700'
                }`}>
                  ROUND {thought.round}
                </span>
                <span className="text-xs text-slate-400 uppercase font-semibold">{thought.type}</span>
             </div>
             <p className="text-sm text-slate-700 mb-2 font-medium">{thought.content}</p>
             
             {thought.keywords && thought.type === 'generation' && (
               <div className="flex flex-wrap gap-1 mb-2">
                 {thought.keywords.map((kw, idx) => (
                   <span key={idx} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                     {kw}
                   </span>
                 ))}
               </div>
             )}

             {thought.stats && (
               <div className="flex gap-2 text-xs items-center">
                 <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">{thought.stats.high} High</span>
                 <span className="text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">{thought.stats.medium} Medium</span>
                 <span className="text-red-400 bg-red-50 px-2 py-0.5 rounded">{thought.stats.low} Low</span>
               </div>
             )}

             {/* SERP PREVIEW Section */}
             {thought.type === 'analysis' && thought.analyzedKeywords && (
               <SerpPreview keywords={thought.analyzedKeywords} label={t.serpEvidence} disclaimer={t.serpEvidenceDisclaimer} t={t} />
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Modal for Deep Dive Strategy
const StrategyModal = ({ report, onClose, title, labels }: { report: SEOStrategyReport, onClose: () => void, title: string, labels: any }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-blue-600 font-bold">
            <FileText className="w-5 h-5" />
            <span>{title}</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-start">
            <div>
                <div className="text-xs text-blue-600 uppercase font-bold mb-1">Target Keyword</div>
                <div className="text-xl font-bold text-slate-900">{report.targetKeyword}</div>
            </div>
            <div className="text-right">
                <div className="text-xs text-blue-600 uppercase font-bold mb-1">URL Slug</div>
                <div className="font-mono text-sm text-blue-600 bg-white px-2 py-1 rounded border border-blue-200">{report.urlSlug}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Left Column: Original */}
             <div className="space-y-4">
                 <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Content (Target Lang)
                 </h4>
                 
                 <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Page Title (H1)</div>
                    <div className="font-medium text-slate-800">{report.pageTitleH1}</div>
                 </div>

                 <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Meta Description</div>
                    <div className="text-sm text-slate-700">{report.metaDescription}</div>
                 </div>

                 <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-700">Structure (Headers)</div>
                    {report.contentStructure.map((item, idx) => (
                        <div key={idx} className="border-l-2 border-slate-300 pl-3">
                            <div className="font-bold text-slate-800 text-sm">{item.header}</div>
                            <div className="text-xs text-slate-500 mt-1">{item.description}</div>
                        </div>
                    ))}
                 </div>
                 
                 <div>
                    <div className="text-sm font-bold text-slate-700 mb-2">Long-tail Keywords</div>
                    <div className="flex flex-wrap gap-2">
                        {report.longTailKeywords.map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600">
                                {kw}
                            </span>
                        ))}
                    </div>
                 </div>
             </div>

             {/* Right Column: Translation */}
             <div className="space-y-4">
                 <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Translation Reference
                 </h4>

                 <div className="p-3 bg-green-50/50 rounded border border-green-100">
                    <div className="text-xs text-green-500 uppercase font-bold mb-1">Translated Title</div>
                    <div className="font-medium text-slate-800">{report.pageTitleH1_trans || '-'}</div>
                 </div>

                 <div className="p-3 bg-green-50/50 rounded border border-green-100">
                    <div className="text-xs text-green-500 uppercase font-bold mb-1">Translated Description</div>
                    <div className="text-sm text-slate-700">{report.metaDescription_trans || '-'}</div>
                 </div>

                 <div className="space-y-3">
                    <div className="text-sm font-bold text-slate-700">Structure (Translated)</div>
                    {report.contentStructure.map((item, idx) => (
                        <div key={idx} className="border-l-2 border-green-200 pl-3">
                            <div className="font-bold text-slate-800 text-sm">{item.header_trans || '-'}</div>
                            <div className="text-xs text-slate-500 mt-1">{item.description_trans || '-'}</div>
                        </div>
                    ))}
                 </div>

                 <div>
                    <div className="text-sm font-bold text-slate-700 mb-2">Translated Keywords</div>
                    <div className="flex flex-wrap gap-2">
                        {report.longTailKeywords_trans?.map((kw, i) => (
                            <span key={i} className="px-2 py-1 bg-green-50 border border-green-100 text-green-700 rounded text-xs font-medium">
                                {kw}
                            </span>
                        ))}
                    </div>
                 </div>
             </div>
          </div>

          <div className="bg-slate-50 p-4 rounded border border-slate-200">
             <div className="text-sm font-bold text-slate-700 mb-2">User Intent Summary</div>
             <p className="text-sm text-slate-600">{report.userIntentSummary}</p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 pt-4 border-t border-slate-100">
            <span>Recommended Length:</span>
            <span className="font-bold text-slate-900">{report.recommendedWordCount} words</span>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 text-sm font-medium">
            {labels.close}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>({
    step: 'input',
    seedKeyword: '',
    targetLanguage: 'en',
    keywords: [],
    error: null,
    isMining: false,
    miningRound: 0,
    agentThoughts: [],
    miningSuccess: false,
    archives: [],
    
    // View Config
    filterLevel: ProbabilityLevel.HIGH,
    sortBy: 'probability',
    expandedRowId: null,

    // Deep Dive
    showDeepDiveModal: false,
    isDeepDiving: false,
    currentStrategyReport: null,

    uiLanguage: 'zh',
    genPrompt: DEFAULT_GEN_PROMPT_EN,
    analyzePrompt: DEFAULT_ANALYZE_PROMPT_EN,
    logs: [],
    showPrompts: false,
    
    showPromptTranslation: false,
    translatedGenPrompt: null,
    translatedAnalyzePrompt: null,
    
    agentConfigs: [],
    currentConfigId: null
  });
  
  const stopMiningRef = useRef(false);
  const allKeywordsRef = useRef<string[]>([]);
  const t = TEXT[state.uiLanguage];

  // Load archives and agent configs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('google_seo_archives');
      if (saved) {
        setState(prev => ({ ...prev, archives: JSON.parse(saved) }));
      }
    } catch (e) {
      console.error("Failed to load archives", e);
    }
    
    try {
      const savedConfigs = localStorage.getItem('google_seo_agent_configs');
      if (savedConfigs) {
        setState(prev => ({ ...prev, agentConfigs: JSON.parse(savedConfigs) }));
      }
    } catch (e) {
      console.error("Failed to load agent configs", e);
    }
  }, []);

  // Save archive helper
  const saveToArchive = (currentState: AppState) => {
    if (currentState.keywords.length === 0) return;
    
    const newEntry: ArchiveEntry = {
      id: `arc-${Date.now()}`,
      timestamp: Date.now(),
      seedKeyword: currentState.seedKeyword,
      keywords: currentState.keywords,
      miningRound: currentState.miningRound,
      targetLanguage: currentState.targetLanguage
    };

    const updatedArchives = [newEntry, ...currentState.archives].slice(0, 20); 
    localStorage.setItem('google_seo_archives', JSON.stringify(updatedArchives));
    setState(prev => ({ ...prev, archives: updatedArchives }));
    addLog(t.archiveSaved, 'success');
  };

  const loadArchive = (entry: ArchiveEntry) => {
    setState(prev => ({
      ...prev,
      seedKeyword: entry.seedKeyword,
      targetLanguage: entry.targetLanguage || 'en',
      keywords: entry.keywords,
      miningRound: entry.miningRound,
      step: 'results',
      agentThoughts: [],
      logs: [],
      filterLevel: ProbabilityLevel.HIGH 
    }));
  };

  const deleteArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.archives.filter(a => a.id !== id);
    localStorage.setItem('google_seo_archives', JSON.stringify(updated));
    setState(prev => ({ ...prev, archives: updated }));
  };

  // Agent Config management
  const saveAgentConfig = (name: string) => {
    const newConfig: AgentConfig = {
      id: `cfg-${Date.now()}`,
      name: name.trim() || `Config ${state.agentConfigs.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      genPrompt: state.genPrompt,
      analyzePrompt: state.analyzePrompt,
      targetLanguage: state.targetLanguage
    };
    
    const updatedConfigs = [newConfig, ...state.agentConfigs].slice(0, 20);
    localStorage.setItem('google_seo_agent_configs', JSON.stringify(updatedConfigs));
    setState(prev => ({ ...prev, agentConfigs: updatedConfigs, currentConfigId: newConfig.id }));
    addLog(`Agent config "${newConfig.name}" saved.`, 'success');
  };

  const loadAgentConfig = (config: AgentConfig) => {
    setState(prev => ({
      ...prev,
      genPrompt: config.genPrompt,
      analyzePrompt: config.analyzePrompt,
      targetLanguage: config.targetLanguage,
      currentConfigId: config.id,
      translatedGenPrompt: null,
      translatedAnalyzePrompt: null
    }));
    addLog(`Loaded config: "${config.name}"`, 'info');
  };

  const updateAgentConfig = (id: string) => {
    const updatedConfigs = state.agentConfigs.map(cfg => 
      cfg.id === id 
        ? { ...cfg, updatedAt: Date.now(), genPrompt: state.genPrompt, analyzePrompt: state.analyzePrompt, targetLanguage: state.targetLanguage }
        : cfg
    );
    localStorage.setItem('google_seo_agent_configs', JSON.stringify(updatedConfigs));
    setState(prev => ({ ...prev, agentConfigs: updatedConfigs }));
    addLog('Config updated.', 'success');
  };

  const deleteAgentConfig = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = state.agentConfigs.filter(c => c.id !== id);
    localStorage.setItem('google_seo_agent_configs', JSON.stringify(updated));
    setState(prev => ({ 
      ...prev, 
      agentConfigs: updated, 
      currentConfigId: prev.currentConfigId === id ? null : prev.currentConfigId 
    }));
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { timestamp: new Date().toLocaleTimeString(), message, type }]
    }));
  };

  const addThought = (type: AgentThought['type'], content: string, extra?: Partial<AgentThought>) => {
    setState(prev => ({
      ...prev,
      agentThoughts: [...prev.agentThoughts, {
        id: `t-${Date.now()}`,
        round: prev.miningRound,
        type,
        content,
        ...extra
      }]
    }));
  };

  const handleTranslatePrompt = async (promptType: 'gen' | 'analyze') => {
    const currentPrompt = promptType === 'gen' ? state.genPrompt : state.analyzePrompt;
    if (!currentPrompt) return;
    
    addLog(`Optimizing ${promptType} prompt...`, 'info');
    try {
      const optimized = await translatePromptToSystemInstruction(currentPrompt);
      setState(prev => ({
        ...prev,
        [promptType === 'gen' ? 'genPrompt' : 'analyzePrompt']: optimized
      }));
      addLog(`Prompt optimized successfully.`, 'success');
    } catch (e) {
      addLog(`Prompt optimization failed.`, 'error');
    }
  };
  
  const togglePromptTranslation = async () => {
    if (!state.showPromptTranslation) {
        setState(prev => ({ ...prev, showPromptTranslation: true }));
        
        if (!state.translatedGenPrompt && state.genPrompt) {
            try {
                const trans = await translateText(state.genPrompt, state.uiLanguage);
                setState(prev => ({ ...prev, translatedGenPrompt: trans }));
            } catch(e) { console.error(e); }
        }
        
        if (!state.translatedAnalyzePrompt && state.analyzePrompt) {
            try {
                const trans = await translateText(state.analyzePrompt, state.uiLanguage);
                setState(prev => ({ ...prev, translatedAnalyzePrompt: trans }));
            } catch(e) { console.error(e); }
        }
    } else {
        setState(prev => ({ ...prev, showPromptTranslation: false }));
    }
  };

  // --- MINING LOGIC ---

  const startMining = async (continueExisting = false) => {
    if (!state.seedKeyword.trim()) return;
    
    stopMiningRef.current = false;
    
    // Initialize or keep existing keywords for deduplication
    if (continueExisting) {
      allKeywordsRef.current = state.keywords.map(k => k.keyword);
    } else {
      allKeywordsRef.current = [];
    }
    
    setState(prev => ({
      ...prev,
      step: 'mining',
      isMining: true,
      miningSuccess: false,
      error: null,
      logs: continueExisting ? prev.logs : [],
      agentThoughts: continueExisting ? prev.agentThoughts : [],
      miningRound: continueExisting ? prev.miningRound : 0,
      keywords: continueExisting ? prev.keywords : [] 
    }));

    addLog(continueExisting ? "Resuming mining..." : `Starting mining loop for: "${state.seedKeyword}" (${state.targetLanguage.toUpperCase()})...`, 'info');

    runMiningLoop(continueExisting ? state.miningRound : 0);
  };

  const runMiningLoop = async (startRound: number) => {
    let currentRound = startRound;

    while (!stopMiningRef.current) {
      currentRound++;
      
      setState(prev => ({ ...prev, miningRound: currentRound }));
      
      addLog(`[Round ${currentRound}] Generating candidates...`, 'info');
      addThought('generation', currentRound === 1 
        ? `Initial expansion of "${state.seedKeyword}" in ${state.targetLanguage.toUpperCase()}.` 
        : `Round ${currentRound}: Lateral thinking mode. Exploring semantically distant concepts.`
      );

      try {
        const generatedKeywords = await generateKeywords(
          state.seedKeyword, 
          state.targetLanguage,
          state.genPrompt, 
          allKeywordsRef.current,
          currentRound
        );

        if (generatedKeywords.length === 0) {
           addLog(`[Round ${currentRound}] No keywords generated. Retrying...`, 'warning');
           continue; 
        }

        addThought('generation', `Generated ${generatedKeywords.length} candidates.`, { keywords: generatedKeywords.map(k => k.keyword) });

        addLog(`[Round ${currentRound}] Analyzing SERP probability (Google)...`, 'api');
        
        // This is now parallel individual execution with batching
        const analyzedBatch = await analyzeRankingProbability(generatedKeywords, state.analyzePrompt);
        
        const highProbCandidate = analyzedBatch.find(k => k.probability === ProbabilityLevel.HIGH);
        
        // Update ref for deduplication in next round
        allKeywordsRef.current = [...allKeywordsRef.current, ...analyzedBatch.map(k => k.keyword)];
        
        setState(prev => ({
          ...prev,
          keywords: [...prev.keywords, ...analyzedBatch]
        }));
        
        const high = analyzedBatch.filter(k => k.probability === ProbabilityLevel.HIGH).length;
        const medium = analyzedBatch.filter(k => k.probability === ProbabilityLevel.MEDIUM).length;
        const low = analyzedBatch.filter(k => k.probability === ProbabilityLevel.LOW).length;

        addThought('analysis', `Analysis Complete.`, { 
            stats: { high, medium, low },
            analyzedKeywords: analyzedBatch 
        });

        if (highProbCandidate) {
            addThought('decision', `Found HIGH probability opportunity: "${highProbCandidate.keyword}". Stopping.`);
            addLog(`Success! Opportunity found.`, 'success');
            setState(prev => {
                saveToArchive(prev);
                return { ...prev, isMining: false, miningSuccess: true };
            });
            return; 
        }

        addThought('decision', `No HIGH probability keywords found in Round ${currentRound}. Continuing loop...`);
        addLog(`Round ${currentRound} complete. No HIGH opportunities. Continuing...`, 'warning');

        await new Promise(resolve => setTimeout(resolve, 1500));

      } catch (err) {
        console.error(err);
        addLog(`Error in Round ${currentRound}: ${err}`, 'error');
        stopMiningRef.current = true;
      }
    }
  };

  const handleStop = () => {
    stopMiningRef.current = true;
    addLog("User requested stop.", 'warning');
    setState(prev => ({ ...prev, isMining: false }));
  };

  const goToResults = () => {
      setState(prev => ({ ...prev, step: 'results', miningSuccess: false }));
  };

  const continueMining = () => {
      startMining(true);
  };

  const reset = () => {
    setState(prev => ({
      ...prev,
      step: 'input',
      seedKeyword: '',
      keywords: [],
      error: null,
      logs: [],
      agentThoughts: [],
      miningRound: 0,
      expandedRowId: null,
      miningSuccess: false
    }));
  };

  const handleDeepDive = async (keyword: KeywordData) => {
    setState(prev => ({ ...prev, isDeepDiving: true, currentStrategyReport: null, showDeepDiveModal: true }));
    try {
        const report = await generateDeepDiveStrategy(keyword, state.uiLanguage, state.targetLanguage);
        setState(prev => ({ ...prev, isDeepDiving: false, currentStrategyReport: report }));
    } catch (e) {
        console.error(e);
        setState(prev => ({ ...prev, isDeepDiving: false, showDeepDiveModal: false, error: 'Failed to generate report' }));
    }
  };

  const downloadCSV = () => {
    const headers = ['Keyword', 'Translation', 'Intent', 'Volume', 'Top Type', 'Probability', 'Result Count', 'Reasoning'];
    const rows = state.keywords.map(k => [
        k.keyword, 
        k.translation, 
        k.intent, 
        k.volume, 
        k.topDomainType || '-', 
        k.probability || '-', 
        k.serpResultCount || '-', 
        `"${k.reasoning || ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `google_seo_${state.seedKeyword}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getProcessedKeywords = () => {
    let filtered = state.keywords;
    
    if (state.filterLevel !== 'ALL') {
        filtered = filtered.filter(k => k.probability === state.filterLevel);
    }

    return filtered.sort((a, b) => {
        if (state.sortBy === 'volume') return b.volume - a.volume;
        if (state.sortBy === 'probability') {
            const map = { [ProbabilityLevel.HIGH]: 3, [ProbabilityLevel.MEDIUM]: 2, [ProbabilityLevel.LOW]: 1 };
            return (map[b.probability || 'Low'] || 0) - (map[a.probability || 'Low'] || 0);
        }
        return 0;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm flex-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={reset}>
            <div className="bg-blue-600 p-2 rounded-lg">
              <span className="text-white font-bold text-xl leading-none">G</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden sm:block">
              Google SEO <span className="text-blue-600">Agent</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-4 text-sm font-medium text-slate-500">
              <span className={state.step === 'input' ? "text-blue-600" : ""}>{t.step1}</span>
              <ArrowRight className="w-4 h-4" />
              <span className={state.step === 'mining' ? "text-blue-600 animate-pulse" : ""}>{t.step2}</span>
              <ArrowRight className="w-4 h-4" />
              <span className={state.step === 'results' ? "text-blue-600" : ""}>{t.step3}</span>
            </div>

            <button 
              onClick={() => setState(prev => ({ ...prev, uiLanguage: prev.uiLanguage === 'en' ? 'zh' : 'en' }))}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-3 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">{state.uiLanguage === 'en' ? 'EN' : '中文'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col">
        
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-5 h-5 mr-2" />
            {state.error}
          </div>
        )}

        {/* STEP 1: INPUT */}
        {state.step === 'input' && (
          <div className="max-w-3xl mx-auto mt-8 flex-1 w-full">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-4 text-slate-900">{t.inputTitle}</h2>
              <p className="text-slate-500 mb-8">{t.inputDesc}</p>
              
              {/* Target Language Selector */}
              <div className="mb-6 flex justify-center">
                 <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm text-sm font-medium text-slate-700">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span>{t.targetMarket}:</span>
                    <select 
                        value={state.targetLanguage}
                        onChange={(e) => setState(prev => ({ ...prev, targetLanguage: e.target.value as TargetLanguage }))}
                        className="bg-transparent outline-none text-blue-600 font-bold cursor-pointer"
                    >
                        {LANGUAGES.map(l => (
                            <option key={l.code} value={l.code}>{l.label}</option>
                        ))}
                    </select>
                 </div>
              </div>

              {/* Clean Input Design */}
              <div className="flex w-full max-w-2xl mx-auto bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                <div className="flex items-center justify-center pl-4 text-slate-400">
                   <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder={t.placeholder}
                  className="flex-1 p-4 text-lg outline-none text-slate-700 placeholder:text-slate-400"
                  value={state.seedKeyword}
                  onChange={(e) => setState(prev => ({ ...prev, seedKeyword: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && startMining(false)}
                />
                <button
                  onClick={() => startMining(false)}
                  disabled={!state.seedKeyword.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-semibold transition-colors disabled:opacity-70"
                >
                  {t.btnStart}
                </button>
              </div>
            </div>

            {/* Archive List */}
            {state.archives.length > 0 && (
              <div className="mt-12 max-w-2xl mx-auto">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <History className="w-4 h-4" /> {t.archivesTitle}
                </h3>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                   <div className="divide-y divide-slate-100">
                     {state.archives.map(arch => (
                       <div 
                        key={arch.id} 
                        onClick={() => loadArchive(arch)}
                        className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer group transition-colors"
                       >
                         <div className="flex items-center gap-3">
                           <div className="bg-slate-100 p-2 rounded text-slate-500 group-hover:bg-white group-hover:text-blue-500 transition-colors">
                              <Search className="w-4 h-4" />
                           </div>
                           <div>
                              <div className="font-medium text-slate-800 flex items-center gap-2">
                                {arch.seedKeyword}
                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">{arch.targetLanguage}</span>
                              </div>
                              <div className="text-xs text-slate-400">{new Date(arch.timestamp).toLocaleString()} • {arch.keywords.length} keywords</div>
                           </div>
                         </div>
                         <button 
                            onClick={(e) => deleteArchive(arch.id, e)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            )}

            {/* Prompt Config (Collapsible) */}
            <div className="mt-12 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden max-w-2xl mx-auto">
              <button 
                onClick={() => setState(prev => ({ ...prev, showPrompts: !prev.showPrompts }))}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 font-medium"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-500" />
                  {t.configPrompts}
                </div>
                <div className={`transform transition-transform ${state.showPrompts ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
              
              {state.showPrompts && (
                <div className="p-6 space-y-6">
                  {/* Translation Toggle */}
                  <div className="flex items-center justify-end">
                     <button 
                        onClick={togglePromptTranslation}
                        className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${state.showPromptTranslation ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-500 border-slate-200'}`}
                     >
                        <Languages className="w-3 h-3" />
                        {t.showTransRef}
                     </button>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-slate-700">{t.promptGenLabel}</label>
                      <button onClick={() => handleTranslatePrompt('gen')} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                        <RefreshCw className="w-3 h-3" /> {t.btnTranslatePrompt}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <textarea 
                          className="w-full h-32 p-3 border border-slate-300 rounded-md text-sm font-mono text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={state.genPrompt}
                          onChange={(e) => setState(prev => ({ ...prev, genPrompt: e.target.value }))}
                        />
                        {state.showPromptTranslation && (
                            <div className="w-full h-32 p-3 bg-slate-50 border border-blue-200 rounded-md text-sm text-slate-600 overflow-y-auto">
                                <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">{t.transRefLabel}</div>
                                {state.translatedGenPrompt ? state.translatedGenPrompt : <div className="animate-pulse">Translating...</div>}
                            </div>
                        )}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-slate-700">{t.promptAnlzLabel}</label>
                      <button onClick={() => handleTranslatePrompt('analyze')} className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                        <RefreshCw className="w-3 h-3" /> {t.btnTranslatePrompt}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <textarea 
                          className="w-full h-32 p-3 border border-slate-300 rounded-md text-sm font-mono text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={state.analyzePrompt}
                          onChange={(e) => setState(prev => ({ ...prev, analyzePrompt: e.target.value }))}
                        />
                        {state.showPromptTranslation && (
                            <div className="w-full h-32 p-3 bg-slate-50 border border-blue-200 rounded-md text-sm text-slate-600 overflow-y-auto">
                                <div className="text-[10px] uppercase font-bold text-blue-500 mb-1">{t.transRefLabel}</div>
                                {state.translatedAnalyzePrompt ? state.translatedAnalyzePrompt : <div className="animate-pulse">Translating...</div>}
                            </div>
                        )}
                    </div>
                  </div>

                  {/* Agent Config Archive Section */}
                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-purple-500" />
                      {t.agentConfigs}
                    </h4>
                    
                    {/* Save New Config */}
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        id="configNameInput"
                        placeholder={t.enterConfigName}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.target as HTMLInputElement;
                            saveAgentConfig(input.value);
                            input.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('configNameInput') as HTMLInputElement;
                          saveAgentConfig(input?.value || '');
                          if (input) input.value = '';
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        {t.saveConfig}
                      </button>
                    </div>

                    {/* Config List */}
                    {state.agentConfigs.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {state.agentConfigs.map(cfg => (
                          <div
                            key={cfg.id}
                            className={`p-3 rounded-lg border flex items-center justify-between group transition-colors ${
                              state.currentConfigId === cfg.id 
                                ? 'bg-purple-50 border-purple-200' 
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="font-medium text-slate-800 text-sm flex items-center gap-2">
                                {cfg.name}
                                <span className="text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                                  {cfg.targetLanguage}
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
                                onClick={(e) => deleteAgentConfig(cfg.id, e)}
                                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        {t.noConfigs}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: MINING */}
        {state.step === 'mining' && (
          <div className="flex-1 flex flex-col h-[calc(100vh-200px)] min-h-[500px] relative">
            
            {/* SUCCESS OVERLAY */}
            {state.miningSuccess && (
              <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm rounded-xl flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-xl shadow-2xl border border-green-200 p-8 max-w-md w-full text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">{t.miningSuccessTitle}</h3>
                      <p className="text-slate-500 mb-6">{t.miningSuccessDesc}</p>
                      
                      <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
                          <div className="text-3xl font-bold text-slate-800">
                              {state.keywords.filter(k => k.probability === ProbabilityLevel.HIGH).length}
                          </div>
                          <div className="text-xs text-slate-400 uppercase font-semibold">{t.foundCount}</div>
                      </div>

                      <div className="flex flex-col gap-3">
                          <button 
                            onClick={goToResults}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-200"
                          >
                            {t.viewResults}
                          </button>
                          <button 
                            onClick={continueMining}
                            className="w-full py-3 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                          >
                            {t.btnExpand}
                          </button>
                      </div>
                  </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                 <Loader2 className={`w-6 h-6 text-blue-600 ${!state.miningSuccess && 'animate-spin'}`} />
                 <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      {t.generating} 
                      <span className="text-sm font-normal bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">Round {state.miningRound}</span>
                    </h3>
                    <p className="text-sm text-slate-500">{t.analyzing}</p>
                 </div>
              </div>
              {!state.miningSuccess && (
                <button 
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-md transition-colors text-sm font-medium shadow-sm"
                >
                  <Square className="w-4 h-4 fill-current" />
                  {t.btnStop}
                </button>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
               <div className="w-full md:w-1/3 h-full">
                  <TerminalLog logs={state.logs} />
               </div>
               <div className="w-full md:w-2/3 h-full">
                  <AgentStream thoughts={state.agentThoughts} t={t} />
               </div>
            </div>
          </div>
        )}

        {/* STEP 3: RESULTS */}
        {state.step === 'results' && (
          <div className="animate-fade-in flex-1">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-base">{state.seedKeyword}</span>
                  {t.resultsTitle}
                </h2>
                <p className="text-slate-500 mt-1">{t.foundOpp} {state.keywords.length} {t.opps}.</p>
              </div>
              <div className="flex gap-3">
                 <button 
                  onClick={() => startMining(true)} 
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {t.btnExpand}
                </button>
                <button onClick={reset} className="px-4 py-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors border border-slate-200 rounded-md bg-white hover:bg-slate-50">
                  {t.newAnalysis}
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-3 rounded-t-xl border border-b-0 border-slate-200 flex flex-wrap gap-4 items-center justify-between">
               <div className="flex items-center gap-4">
                 {/* Filter */}
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Filter className="w-4 h-4" />
                    <select 
                      value={state.filterLevel}
                      onChange={(e) => setState(prev => ({ ...prev, filterLevel: e.target.value as any }))}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value={ProbabilityLevel.HIGH}>{t.filterHigh}</option>
                      <option value="ALL">{t.filterAll}</option>
                    </select>
                 </div>

                 {/* Sort */}
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                    <ArrowUpDown className="w-4 h-4" />
                    <select 
                      value={state.sortBy}
                      onChange={(e) => setState(prev => ({ ...prev, sortBy: e.target.value as any }))}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="probability">Sort: Probability</option>
                      <option value="volume">Sort: Volume</option>
                    </select>
                 </div>
               </div>

               <button 
                 onClick={downloadCSV}
                 className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 px-3 py-1 rounded hover:bg-slate-50 transition-colors"
               >
                 <Download className="w-4 h-4" /> {t.downloadCSV}
               </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
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
                  <tbody className="divide-y divide-slate-100">
                    {getProcessedKeywords().map((item) => {
                      const isBlueOcean = item.serpResultCount !== undefined && item.serpResultCount !== -1 && item.serpResultCount < 20;
                      const isExpanded = state.expandedRowId === item.id;
                      
                      return (
                        <React.Fragment key={item.id}>
                          <tr 
                            className={`transition-colors ${isExpanded ? 'bg-blue-50/50' : isBlueOcean ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-slate-50'}`}
                          >
                            <td 
                                className="px-4 py-4 text-center cursor-pointer" 
                                onClick={() => setState(prev => ({ ...prev, expandedRowId: isExpanded ? null : item.id }))}
                            >
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400"/> : <ChevronDown className="w-4 h-4 text-slate-400"/>}
                            </td>
                            <td className="px-4 py-4 font-medium text-slate-900" onClick={() => setState(prev => ({ ...prev, expandedRowId: isExpanded ? null : item.id }))}>
                                <div className="flex items-center gap-2 cursor-pointer">
                                  {item.keyword}
                                  {isBlueOcean && (
                                      <span title="Very low search results found" className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                          <Lightbulb className="w-3 h-3" /> BLUE OCEAN
                                      </span>
                                  )}
                                </div>
                            </td>
                            <td className="px-4 py-4 text-slate-500">{item.translation}</td>
                            <td className="px-4 py-4 font-mono">{item.volume.toLocaleString()}</td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {item.topDomainType || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                  item.probability === ProbabilityLevel.HIGH 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : item.probability === ProbabilityLevel.MEDIUM 
                                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                                      : 'bg-red-100 text-red-800 border-red-200'
                                }`}
                              >
                                {item.probability}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right">
                               <div className="flex items-center justify-end gap-3">
                                   {/* Google Verify Button in Table */}
                                   <a 
                                      href={`https://www.google.com/search?q=${encodeURIComponent(item.keyword)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 text-slate-600 rounded hover:bg-blue-50 hover:text-blue-600 transition-colors text-xs font-medium border border-slate-200"
                                      title={t.verifyBtn}
                                      onClick={(e) => e.stopPropagation()}
                                   >
                                      <ExternalLink className="w-3 h-3" />
                                      {t.verifyBtn}
                                   </a>

                                   <button 
                                      className="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1"
                                      onClick={() => setState(prev => ({ ...prev, expandedRowId: isExpanded ? null : item.id }))}
                                   >
                                      Details
                                   </button>
                                   <button 
                                      onClick={(e) => { e.stopPropagation(); handleDeepDive(item); }}
                                      className="flex items-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-xs font-medium"
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
                            <tr className="bg-slate-50/80 animate-fade-in border-b border-slate-100">
                                <td colSpan={7} className="px-4 py-4">
                                    <div className="flex flex-col md:flex-row gap-6 px-4">
                                        <div className="flex-1 space-y-2">
                                            <h4 className="text-xs font-bold uppercase text-slate-500">Analysis Reasoning</h4>
                                            <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200 shadow-sm whitespace-pre-wrap break-words">{item.reasoning}</p>
                                            
                                            <div className="grid grid-cols-2 gap-4 mt-2">
                                                <div>
                                                    <span className="text-xs text-slate-400 block">SERP Results (Est.)</span>
                                                    <span className="text-sm font-medium">
                                                      {item.serpResultCount === -1 ? 'Unknown (Many)' : (item.serpResultCount ?? 'Unknown')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-slate-400 block">Top Competitor Type</span>
                                                    <span className="text-sm font-medium">{item.topDomainType ?? '-'}</span>
                                                </div>
                                            </div>

                                            {/* SERP EVIDENCE IN DETAILS - Conditional Rendering */}
                                            {item.serpResultCount === 0 ? (
                                                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded text-amber-800 text-xs font-medium flex items-center gap-2">
                                                   <Lightbulb className="w-4 h-4" />
                                                   No direct competitors found in search (Blue Ocean).
                                                </div>
                                            ) : (
                                                item.topSerpSnippets && item.topSerpSnippets.length > 0 && (
                                                  <div className="mt-4">
                                                     <div className="flex justify-between items-center mb-2">
                                                        <h4 className="text-xs font-bold uppercase text-slate-500">{t.serpEvidence}</h4>
                                                        <span className="text-[10px] text-amber-600 italic">{t.serpEvidenceDisclaimer}</span>
                                                     </div>
                                                     <div className="space-y-2">
                                                        {item.topSerpSnippets.slice(0, 3).map((snip, i) => (
                                                          <div key={i} className="bg-white p-2 rounded border border-slate-100 text-xs">
                                                             <div className="text-blue-700 font-medium truncate">{snip.title}</div>
                                                             <div className="text-green-700 text-[10px] truncate">{snip.url}</div>
                                                             <div className="text-slate-500 mt-1 line-clamp-2">{snip.snippet}</div>
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
                            <td colSpan={7} className="text-center py-12 text-slate-400">
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
        {state.showDeepDiveModal && (
            state.isDeepDiving ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white p-8 rounded-xl shadow-xl flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                        <h3 className="text-lg font-bold text-slate-800">{t.generatingReport}</h3>
                        <p className="text-slate-500 text-sm">Drafting H1, H2s, and Long-tail keywords...</p>
                    </div>
                </div>
            ) : (
                state.currentStrategyReport && (
                    <StrategyModal 
                        report={state.currentStrategyReport} 
                        onClose={() => setState(prev => ({ ...prev, showDeepDiveModal: false }))}
                        title={t.modalTitle}
                        labels={{ close: t.close }}
                    />
                )
            )
        )}

      </main>
    </div>
  );
}