
import React, { useRef, useEffect } from 'react';
import { AgentStreamEvent, UILanguage } from '../../types';
import { CheckCircle, Search, FileText, PenTool, Image as ImageIcon, Loader2, Target, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

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

const StreamEventDetails: React.FC<{ event: AgentStreamEvent; uiLanguage: UILanguage }> = ({ event, uiLanguage }) => {
    const t = AGENT_TEXT[uiLanguage];
    switch (event.cardType) {
        case 'serp': return <SerpCard data={event.data} uiLanguage={uiLanguage} />;
        case 'data': return <DataCard data={event.data} uiLanguage={uiLanguage} />;
        case 'outline': return <OutlineCard data={event.data} uiLanguage={uiLanguage} />;
        case 'competitor-analysis': return <CompetitorAnalysisCard data={event.data} uiLanguage={uiLanguage} />;
        case 'image-gen': 
            return (
                <div className="mt-2 bg-purple-500/5 border border-purple-500/20 rounded-lg p-2 flex items-center space-x-3">
                    <div className="w-16 h-16 bg-black/50 rounded flex items-center justify-center overflow-hidden">
                       {event.data.imageUrl ? (
                           <img src={event.data.imageUrl} alt="Generated" className="w-full h-full object-cover" />
                       ) : (
                           <Loader2 className="animate-spin text-purple-500" size={20} />
                       )}
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{t.cardGeneratingVisual}</div>
                        <div className="text-xs text-purple-200 italic">"{event.data.prompt}"</div>
                    </div>
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

interface AgentStreamFeedProps {
  events: AgentStreamEvent[];
  uiLanguage?: UILanguage;
}

export const AgentStreamFeed: React.FC<AgentStreamFeedProps> = ({ events, uiLanguage = 'en' }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {events.map((event) => {
        const agentDesc = getAgentDescription(event.agentId, uiLanguage);
        return (
          <div key={event.id} className="flex space-x-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={cn(
               "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg border border-white/5",
               "bg-[#111]"
            )}>
              {getAgentIcon(event.agentId)}
            </div>
            
            <div className="flex-1 max-w-2xl">
               <div className="flex items-center space-x-2 mb-1">
                   <span className="text-xs font-bold text-white/90">{getAgentName(event.agentId, uiLanguage)}</span>
                   <span className="text-[10px] text-white/30">{new Date(event.timestamp).toLocaleTimeString()}</span>
               </div>
               
               {/* Agent Description - Show when no message and no card */}
               {!event.message && !event.cardType && agentDesc && (
                   <div className="text-xs text-gray-400 italic mb-2">
                       {agentDesc}
                   </div>
               )}
               
               {/* Message Bubble */}
               {event.message && (
                   <div className={cn(
                       "text-sm leading-relaxed p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl inline-block",
                       event.type === 'error' ? "bg-red-500/10 text-red-200" : "bg-white/5 text-gray-300"
                   )}>
                      {event.message}
                   </div>
               )}

               {/* Functional Cards */}
               {event.type === 'card' && (
                   <div className="w-full">
                       <StreamEventDetails event={event} uiLanguage={uiLanguage} />
                   </div>
               )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
