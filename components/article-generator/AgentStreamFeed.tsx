
import React, { useRef, useEffect, useState } from 'react';
import { AgentStreamEvent, UILanguage } from '../../types';
import { CheckCircle, Search, FileText, PenTool, Image as ImageIcon, Loader2, Target, TrendingUp, Minus, Square, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EnhancedImageGenCard, ImageGenerationStatus } from './EnhancedImageGenCard';
import { StreamingTextCard } from './StreamingTextCard';
import { ErrorCard, ErrorType } from './ErrorCard';
import { ImageLightbox } from './ImageLightbox';

// Import TEXT from App.tsx - we'll need to pass it as a prop or create a separate translations file
// For now, we'll define it locally to avoid circular dependencies
const AGENT_TEXT: Record<UILanguage, any> = {
  en: {
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
    cardSearchPreferences: "Search Engine Preferences",
    cardSemanticLandscape: "Semantic Landscape",
    cardEngineStrategies: "Engine Strategies",
    cardGeoRecommendations: "GEO Recommendations",
    cardGoogle: "Google",
    cardPerplexity: "Perplexity",
    cardGenerativeAI: "Generative AI",
    cardRankingLogic: "Ranking Logic",
    cardContentGap: "Content Gap",
    cardActionItem: "Action Item",
    cardCitationLogic: "Citation Logic",
    cardStructureHint: "Structure Hint",
    cardLlmPreference: "LLM Preference",
  },
  zh: {
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
    cardSearchPreferences: "搜索引擎偏好",
    cardSemanticLandscape: "语义分布",
    cardEngineStrategies: "引擎策略",
    cardGeoRecommendations: "GEO优化建议",
    cardGoogle: "Google",
    cardPerplexity: "Perplexity",
    cardGenerativeAI: "生成式AI",
    cardRankingLogic: "排名逻辑",
    cardContentGap: "内容缺口",
    cardActionItem: "行动项",
    cardCitationLogic: "引用逻辑",
    cardStructureHint: "结构建议",
    cardLlmPreference: "LLM偏好",
  },
};

// Sub-components for specific cards
const SerpCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Search size={12} className="mr-1" /> {t.cardTopCompetitors}
      </h4>
      <div className="space-y-2">
        {data.results?.slice(0, 3).map((result: any, i: number) => (
          <a key={i} href={result.url} target="_blank" rel="noopener noreferrer" 
             className="block p-2 bg-black/20 rounded hover:bg-black/30 transition-colors">
            <div className="text-xs font-medium text-emerald-400 truncate">{result.title}</div>
            <div className="text-[10px] text-gray-500 truncate">{result.url}</div>
          </a>
        ))}
      </div>
    </div>
  );
};

const DataCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="flex space-x-2 mt-2">
      {data.volume > 0 && (
         <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded text-xs text-blue-400 font-mono">
           {t.cardVolume}: {data.volume}
         </div>
      )}
      {data.difficulty > 0 && (
         <div className={cn("bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded text-xs text-orange-400 font-mono")}>
           {t.cardDifficulty}: {data.difficulty}
         </div>
      )}
    </div>
  );
};

const OutlineCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 font-mono text-xs text-gray-300">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
        <FileText size={12} className="mr-1" /> {t.cardStrategicOutline}
      </h4>
      <ul className="space-y-1 list-none pl-1">
        <li className="font-bold text-white text-sm pb-1">{data.h1}</li>
        {data.structure?.map((section: any, i: number) => (
          <li key={i} className="pl-2 border-l-2 border-white/10 ml-1">
             <span className="text-emerald-500 mr-2">H2</span>
             {section.header}
             {section.subsections && (
                <ul className="mt-1 ml-2 space-y-0.5 opacity-60 text-[10px]">
                    {section.subsections.map((sub: string, j: number) => (
                        <li key={j}>• {sub}</li>
                    ))}
                </ul>
             )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const SearchPreferencesCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 space-y-4">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Search size={12} className="mr-1" /> {t.cardSearchPreferences}
      </h4>
      
      {/* Semantic Landscape */}
      {data.semantic_landscape && (
        <div className="space-y-1">
          <div className="text-[10px] text-purple-400/70 uppercase tracking-wider flex items-center">
            <TrendingUp size={10} className="mr-1" /> {t.cardSemanticLandscape}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed bg-purple-500/5 border border-purple-500/20 rounded p-2">
            {data.semantic_landscape}
          </div>
        </div>
      )}

      {/* Engine Strategies */}
      {data.engine_strategies && (
        <div className="space-y-3">
          <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider">{t.cardEngineStrategies}</div>
          
          {/* Google Strategy */}
          {data.engine_strategies.google && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded p-2 space-y-2">
              <div className="text-xs font-medium text-cyan-400">{t.cardGoogle}</div>
              {data.engine_strategies.google.ranking_logic && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-cyan-400/70">{t.cardRankingLogic}:</span> {data.engine_strategies.google.ranking_logic}
                </div>
              )}
              {data.engine_strategies.google.content_gap && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-cyan-400/70">{t.cardContentGap}:</span> {data.engine_strategies.google.content_gap}
                </div>
              )}
              {data.engine_strategies.google.action_item && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-cyan-400/70">{t.cardActionItem}:</span> {data.engine_strategies.google.action_item}
                </div>
              )}
            </div>
          )}

          {/* Perplexity Strategy */}
          {data.engine_strategies.perplexity && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2 space-y-2">
              <div className="text-xs font-medium text-blue-400">{t.cardPerplexity}</div>
              {data.engine_strategies.perplexity.citation_logic && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-blue-400/70">{t.cardCitationLogic}:</span> {data.engine_strategies.perplexity.citation_logic}
                </div>
              )}
              {data.engine_strategies.perplexity.structure_hint && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-blue-400/70">{t.cardStructureHint}:</span> {data.engine_strategies.perplexity.structure_hint}
                </div>
              )}
            </div>
          )}

          {/* Generative AI Strategy */}
          {data.engine_strategies.generative_ai && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2 space-y-2">
              <div className="text-xs font-medium text-emerald-400">{t.cardGenerativeAI}</div>
              {data.engine_strategies.generative_ai.llm_preference && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-emerald-400/70">{t.cardLlmPreference}:</span> {data.engine_strategies.generative_ai.llm_preference}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GEO Recommendations */}
      {data.geo_recommendations && (
        <div className="space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wider">{t.cardGeoRecommendations}</div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2 space-y-2 text-xs text-gray-300">
            {data.geo_recommendations.format_engineering && (
              <div><span className="text-amber-400/70">格式工程:</span> {data.geo_recommendations.format_engineering}</div>
            )}
            {data.geo_recommendations.entity_engineering && (
              <div><span className="text-amber-400/70">实体工程:</span> {data.geo_recommendations.entity_engineering}</div>
            )}
            {data.geo_recommendations.information_gain && (
              <div><span className="text-amber-400/70">信息增益:</span> {data.geo_recommendations.information_gain}</div>
            )}
            {data.geo_recommendations.structure_optimization && (
              <div><span className="text-amber-400/70">结构优化:</span> {data.geo_recommendations.structure_optimization}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CompetitorAnalysisCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 space-y-4">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Target size={12} className="mr-1" /> {t.cardCompetitorAnalysis}
      </h4>
      
      {/* Winning Formula */}
      {data.winning_formula && (
        <div className="space-y-1">
          <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider flex items-center">
            <TrendingUp size={10} className="mr-1" /> {t.cardWinningFormula}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
            {data.winning_formula}
          </div>
        </div>
      )}

      {/* Content Gaps */}
      {data.contentGaps && data.contentGaps.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wider">{t.cardContentGaps}</div>
          <div className="space-y-1">
            {data.contentGaps.map((gap: string, i: number) => (
              <div key={i} className="text-xs text-gray-300 bg-amber-500/5 border border-amber-500/20 rounded p-2 flex items-start">
                <span className="text-amber-400 mr-2">•</span>
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Benchmark (Top 3) */}
      {data.competitor_benchmark && data.competitor_benchmark.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-blue-400/70 uppercase tracking-wider">{t.cardTopCompetitorsBenchmark}</div>
          <div className="space-y-2">
            {data.competitor_benchmark.slice(0, 3).map((competitor: any, i: number) => (
              <div key={i} className="text-xs bg-blue-500/5 border border-blue-500/20 rounded p-2 space-y-1">
                {competitor.domain && (
                  <div className="text-blue-400 font-medium">{competitor.domain}</div>
                )}
                {competitor.content_angle && (
                  <div className="text-gray-300 text-[11px]">{t.cardAngle}: {competitor.content_angle}</div>
                )}
                {competitor.weakness && (
                  <div className="text-gray-400 text-[11px] italic">{t.cardWeakness}: {competitor.weakness}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StreamEventDetails: React.FC<{ 
  event: AgentStreamEvent; 
  uiLanguage: UILanguage;
  onImageFullscreen?: (url: string, prompt?: string, theme?: string) => void;
}> = ({ event, uiLanguage, onImageFullscreen }) => {
    const t = AGENT_TEXT[uiLanguage];
    switch (event.cardType) {
        case 'serp': return <SerpCard data={event.data} uiLanguage={uiLanguage} />;
        case 'data': return <DataCard data={event.data} uiLanguage={uiLanguage} />;
        case 'outline': return <OutlineCard data={event.data} uiLanguage={uiLanguage} />;
        case 'competitor-analysis': return <CompetitorAnalysisCard data={event.data} uiLanguage={uiLanguage} />;
        case 'search-preferences': return <SearchPreferencesCard data={event.data} uiLanguage={uiLanguage} />;
        case 'image-gen': 
            // Determine status from event data
            const imageStatus: ImageGenerationStatus = event.data.status || 
                (event.data.imageUrl ? 'completed' : 
                 event.data.error ? 'failed' : 'generating');
            
            return (
                <div className="mt-2">
                    <EnhancedImageGenCard
                        theme={event.data.theme || 'Image'}
                        prompt={event.data.prompt || ''}
                        status={imageStatus}
                        progress={event.data.progress}
                        imageUrl={event.data.imageUrl}
                        error={event.data.error}
                        estimatedTime={event.data.estimatedTime}
                        onRegenerate={event.data.onRegenerate}
                        onDownload={event.data.onDownload}
                        onViewFullscreen={onImageFullscreen ? () => onImageFullscreen(event.data.imageUrl, event.data.prompt, event.data.theme) : event.data.onViewFullscreen}
                        uiLanguage={uiLanguage}
                    />
                </div>
            );
        case 'streaming-text':
            return (
                <div className="mt-2">
                    <StreamingTextCard
                        content={event.data.content || ''}
                        speed={event.data.speed}
                        interval={event.data.interval}
                        onComplete={event.data.onComplete}
                        uiLanguage={uiLanguage}
                    />
                </div>
            );
        default: return null;
    }
};

const getAgentIcon = (id: string) => {
    switch(id) {
        case 'tracker': return <Search className="text-blue-500" size={16} />;
        case 'researcher': return <Search className="text-blue-500" size={16} />;
        case 'strategist': return <FileText className="text-emerald-500" size={16} />;
        case 'writer': return <PenTool className="text-amber-500" size={16} />;
        case 'artist': return <ImageIcon className="text-purple-500" size={16} />;
        default: return <CheckCircle className="text-gray-500" size={16} />;
    }
};

const getAgentName = (id: string, uiLanguage: UILanguage) => {
    const t = AGENT_TEXT[uiLanguage];
    switch(id) {
        case 'tracker': return t.agentTracker;
        case 'researcher': return t.agentResearcher;
        case 'strategist': return t.agentStrategist;
        case 'writer': return t.agentWriter;
        case 'artist': return t.agentArtist;
        default: return t.agentSystem;
    }
}

const getAgentDescription = (id: string, uiLanguage: UILanguage): string | null => {
    const t = AGENT_TEXT[uiLanguage];
    switch(id) {
        case 'tracker': return t.agentTrackerDesc;
        case 'researcher': return t.agentResearcherDesc;
        case 'strategist': return t.agentStrategistDesc;
        case 'writer': return t.agentWriterDesc;
        case 'artist': return t.agentArtistDesc;
        default: return null;
    }
}

// Terminal Window Frame Component
const TerminalWindow: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden shadow-2xl h-full flex flex-col">
      {/* Terminal Header */}
      <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
        {/* Window Controls */}
        <div className="flex items-center space-x-2">
          <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group">
            <X size={8} className="text-red-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center group">
            <Minus size={8} className="text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center group">
            <Square size={6} className="text-green-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
        
        {/* Terminal Title */}
        <div className="flex-1 text-center">
          <span className="text-xs text-gray-400 font-mono">agent-terminal</span>
        </div>
        
        {/* Spacer for symmetry */}
        <div className="w-12"></div>
      </div>
      
      {/* Terminal Content - Scrollable */}
      <div className="bg-[#0a0a0a] flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
};

// Typing Effect Component
const TypingText: React.FC<{ text: string; speed?: number; onComplete?: () => void }> = ({ 
  text, 
  speed = 30,
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (text.length === 0) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {!isComplete && <Cursor />}
    </span>
  );
};

// Blinking Cursor Component
const Cursor: React.FC = () => {
  return (
    <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 animate-pulse" />
  );
};

// Terminal Prompt Component
const TerminalPrompt: React.FC<{ agentName: string }> = ({ agentName }) => {
  return (
    <span className="text-emerald-400 font-mono">
      <span className="text-gray-500">$</span>{' '}
      <span className="text-blue-400">{agentName.toLowerCase()}</span>
      <span className="text-gray-500">:</span>
      <span className="text-emerald-400">~</span>
      <span className="text-gray-500">$</span>{' '}
    </span>
  );
};

// Code Highlight Component
const CodeHighlight: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <span className="bg-black/30 text-emerald-300 font-mono text-xs px-1.5 py-0.5 rounded border border-emerald-500/20">
      {children}
    </span>
  );
};

// Loading Animation Component
const LoadingDots: React.FC = () => {
  return (
    <span className="inline-flex items-center space-x-1 ml-1">
      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
    </span>
  );
};

// Agent Working Animation
const AgentWorkingIndicator: React.FC<{ agentName: string }> = ({ agentName }) => {
  return (
    <div className="flex items-center space-x-2 text-gray-400 text-xs italic">
      <Loader2 className="animate-spin text-emerald-400" size={12} />
      <span>{agentName} is working</span>
      <LoadingDots />
    </div>
  );
};

interface AgentStreamFeedProps {
  events: AgentStreamEvent[];
  uiLanguage?: UILanguage;
}

export const AgentStreamFeed: React.FC<AgentStreamFeedProps> = ({ events, uiLanguage = 'en' }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<{ url: string; prompt?: string; theme?: string } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Handle image fullscreen view
  const handleImageFullscreen = (imageUrl: string, prompt?: string, theme?: string) => {
    setLightboxImage({ url: imageUrl, prompt, theme });
  };

  const handleTypingComplete = (eventId: string) => {
    setTypingStates(prev => ({ ...prev, [eventId]: true }));
  };

  // Check if message contains code-like patterns for highlighting
  const highlightCodeInText = (text: string) => {
    // Match code patterns: backticks, file paths, URLs, commands
    const codePatterns = [
      /`([^`]+)`/g,  // Backtick code
      /(\/[^\s]+)/g,  // File paths
      /(https?:\/\/[^\s]+)/g,  // URLs
      /(\$ [^\n]+)/g,  // Commands
      /([A-Z_]+_[A-Z_]+)/g,  // CONSTANTS
    ];

    let parts: Array<{ text: string; isCode: boolean }> = [{ text, isCode: false }];

    codePatterns.forEach(pattern => {
      const newParts: Array<{ text: string; isCode: boolean }> = [];
      parts.forEach(part => {
        if (part.isCode) {
          newParts.push(part);
        } else {
          let lastIndex = 0;
          let match;
          while ((match = pattern.exec(part.text)) !== null) {
            if (match.index > lastIndex) {
              newParts.push({ text: part.text.slice(lastIndex, match.index), isCode: false });
            }
            newParts.push({ text: match[0], isCode: true });
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < part.text.length) {
            newParts.push({ text: part.text.slice(lastIndex), isCode: false });
          }
        }
      });
      parts = newParts;
    });

    return parts;
  };

  return (
    <TerminalWindow>
      <div className="p-6 space-y-4 font-mono text-sm">
        {events.length === 0 && (
          <div className="text-gray-500 text-xs">
            <TerminalPrompt agentName="system" />
            <span className="text-gray-400">Waiting for agents to start</span>
            <LoadingDots />
            <Cursor />
          </div>
        )}
        
        {events.map((event) => {
          const agentDesc = getAgentDescription(event.agentId, uiLanguage);
          const agentName = getAgentName(event.agentId, uiLanguage);
          const isTyping = !typingStates[event.id];
          const showTyping = event.message && isTyping;

          return (
            <div key={event.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Terminal-style line with prompt */}
              <div className="flex items-start space-x-2 mb-2">
                <TerminalPrompt agentName={agentName} />
                
                {/* Agent Description - Show when no message and no card */}
                {!event.message && !event.cardType && agentDesc && (
                  <div className="text-xs text-gray-400 italic flex items-center space-x-2">
                    <span>{agentDesc}</span>
                    <LoadingDots />
                    <Cursor />
                  </div>
                )}
                
                {/* Message with typing effect */}
                {event.message && (
                  <div className={cn(
                    "text-sm leading-relaxed flex-1",
                    event.type === 'error' ? "text-red-400" : "text-gray-300"
                  )}>
                    {showTyping ? (
                      <TypingText 
                        text={event.message} 
                        speed={20}
                        onComplete={() => handleTypingComplete(event.id)}
                      />
                    ) : (
                      <>
                        {highlightCodeInText(event.message).map((part, i) => 
                          part.isCode ? (
                            <CodeHighlight key={i}>{part.text}</CodeHighlight>
                          ) : (
                            <span key={i}>{part.text}</span>
                          )
                        )}
                        <Cursor />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Functional Cards */}
              {event.type === 'card' && (
                <div className="ml-8 mt-2">
                  <StreamEventDetails 
                    event={event} 
                    uiLanguage={uiLanguage}
                    onImageFullscreen={handleImageFullscreen}
                  />
                </div>
              )}

              {/* Error Card */}
              {event.type === 'error' && (
                <div className="ml-8 mt-2">
                  <ErrorCard
                    type={(event.data?.errorType as ErrorType) || 'unknown'}
                    message={event.message || 'An error occurred'}
                    details={event.data?.details}
                    onRetry={event.data?.onRetry}
                    uiLanguage={uiLanguage}
                  />
                </div>
              )}

              {/* Timestamp (subtle) */}
              <div className="ml-8 text-[10px] text-gray-600 mt-1">
                [{new Date(event.timestamp).toLocaleTimeString()}]
              </div>
            </div>
          );
        })}
        
        {/* Always show cursor at the end */}
        {events.length > 0 && (
          <div className="text-gray-500 text-xs mt-4">
            <TerminalPrompt agentName="system" />
            <Cursor />
          </div>
        )}
        
        <div ref={bottomRef} />
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          prompt={lightboxImage.prompt}
          theme={lightboxImage.theme}
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          uiLanguage={uiLanguage}
        />
      )}
    </TerminalWindow>
  );
};
