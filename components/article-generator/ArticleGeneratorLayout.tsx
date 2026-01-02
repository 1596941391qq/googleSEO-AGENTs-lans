
import React, { useState } from 'react';
import { AgentStreamFeed } from './AgentStreamFeed';
import { ArticleInputConfig, ArticleConfig } from './ArticleInputConfig';
import { ArticlePreview } from './ArticlePreview';
import { AgentStreamEvent } from '../../types';
import { X, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

// Redefine interface locally to match strict type checking or import properly
// We'll trust the types pass through, but for now mocking the state logic here for UI demo

interface ArticleGeneratorLayoutProps {
  onBack: () => void;
  // In a real implementation, these would be passed down from AppState
  // For now, we manage local state for the UI demo flow
}

export const ArticleGeneratorLayout: React.FC<ArticleGeneratorLayoutProps> = ({ onBack }) => {
  const [stage, setStage] = useState<'input' | 'generating' | 'preview'>('input');
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [finalArticle, setFinalArticle] = useState<any>(null);

  const startGeneration = async (config: ArticleConfig) => {
    setStage('generating');
    setEvents([]);
    setFinalArticle(null);
    
    try {
        const response = await fetch('/api/visual-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...config,
                uiLanguage: 'zh', // or from state
                targetLanguage: 'en' // or from state
            })
        });

        if (!response.ok) throw new Error('Failed to start generation');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim() || !line.startsWith('data: ')) continue;
                
                try {
                    const json = JSON.parse(line.replace('data: ', ''));
                    
                    if (json.type === 'event') {
                        setEvents(prev => [...prev, json.data]);
                    } else if (json.type === 'done') {
                        setFinalArticle(json.data);
                        // Delay transition slightly to let user see final logs
                        setTimeout(() => setStage('preview'), 1500);
                    } else if (json.type === 'error') {
                        setEvents(prev => [...prev, {
                            id: Math.random().toString(),
                            agentId: 'tracker',
                            type: 'error',
                            timestamp: Date.now(),
                            message: json.message
                        } as AgentStreamEvent]);
                    }
                } catch (e) {
                    console.error('Error parsing stream line:', e);
                }
            }
        }
    } catch (error: any) {
        setEvents(prev => [...prev, {
            id: Math.random().toString(),
            agentId: 'tracker',
            type: 'error',
            timestamp: Date.now(),
            message: `Connection Error: ${error.message}`
        } as AgentStreamEvent]);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white overflow-hidden font-sans relative">
        
        {/* Background Ambient Effect */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
             <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px]"></div>
             <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]"></div>
        </div>

        {/* Content Container (Center Stage) */}
        <div className="relative z-10 w-full h-full flex flex-col max-w-5xl mx-auto border-x border-white/5 bg-[#050505]/50 backdrop-blur-sm shadow-2xl">
            
            {/* Top Bar (Navigation) */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center space-x-4">
                    <button 
                       onClick={onBack}
                       className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    {(stage === 'generating' || stage === 'preview') ? (
                       <span className="text-sm font-bold text-gray-400">Mission Active</span>
                    ) : (
                       <span className="text-sm font-bold text-white tracking-wide">AI Visual Article</span>
                    )}
                </div>
            </div>

            {/* Stage Content */}
            <div className="flex-1 overflow-hidden relative">
                {stage === 'input' && (
                    <ArticleInputConfig onStart={startGeneration} />
                )}
                
                {stage === 'generating' && (
                    <div className="h-full flex flex-col">
                        <AgentStreamFeed events={events} />
                    </div>
                )}
                
                {stage === 'preview' && finalArticle && (
                    <ArticlePreview 
                       finalArticle={finalArticle} 
                       onClose={() => setStage('input')} 
                    />
                )}
            </div>
            
        </div>
    </div>
  );
};
