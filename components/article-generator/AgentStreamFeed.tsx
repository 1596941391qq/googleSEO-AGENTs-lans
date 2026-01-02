
import React, { useRef, useEffect } from 'react';
import { AgentStreamEvent } from '../../types';
import { CheckCircle, Search, FileText, PenTool, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

// Sub-components for specific cards
const SerpCard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Search size={12} className="mr-1" /> Top Competitors
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

const DataCard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="flex space-x-2 mt-2">
      {data.volume > 0 && (
         <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded text-xs text-blue-400 font-mono">
           Vol: {data.volume}
         </div>
      )}
      {data.difficulty > 0 && (
         <div className={cn("bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded text-xs text-orange-400 font-mono")}>
           KD: {data.difficulty}
         </div>
      )}
    </div>
  );
};

const OutlineCard: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 font-mono text-xs text-gray-300">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
        <FileText size={12} className="mr-1" /> Strategic Outline
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

const StreamEventDetails: React.FC<{ event: AgentStreamEvent }> = ({ event }) => {
    switch (event.cardType) {
        case 'serp': return <SerpCard data={event.data} />;
        case 'data': return <DataCard data={event.data} />;
        case 'outline': return <OutlineCard data={event.data} />;
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
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Generating Visual</div>
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

const getAgentName = (id: string) => {
    switch(id) {
        case 'tracker': return 'Tracker';
        case 'researcher': return 'Researcher';
        case 'strategist': return 'Strategist';
        case 'writer': return 'Writer';
        case 'artist': return 'Artist';
        default: return 'System';
    }
}

interface AgentStreamFeedProps {
  events: AgentStreamEvent[];
}

export const AgentStreamFeed: React.FC<AgentStreamFeedProps> = ({ events }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {events.map((event) => (
        <div key={event.id} className="flex space-x-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={cn(
             "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg border border-white/5",
             "bg-[#111]"
          )}>
            {getAgentIcon(event.agentId)}
          </div>
          
          <div className="flex-1 max-w-2xl">
             <div className="flex items-center space-x-2 mb-1">
                 <span className="text-xs font-bold text-white/90">{getAgentName(event.agentId)}</span>
                 <span className="text-[10px] text-white/30">{new Date(event.timestamp).toLocaleTimeString()}</span>
             </div>
             
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
                     <StreamEventDetails event={event} />
                 </div>
             )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
