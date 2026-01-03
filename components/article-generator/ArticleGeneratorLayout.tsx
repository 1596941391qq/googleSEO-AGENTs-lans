
import React, { useState } from 'react';
import { AgentStreamFeed } from './AgentStreamFeed';
import { ArticleInputConfig, ArticleConfig } from './ArticleInputConfig';
import { ArticlePreview } from './ArticlePreview';
import { OverallProgressBar, GenerationStage } from './OverallProgressBar';
import { AgentStreamEvent, TargetLanguage } from '../../types';
import { cn } from '../../lib/utils';

/**
 * 根据目标市场获取对应的输出语言
 */
function getTargetLanguageFromMarket(targetMarket: string): TargetLanguage {
  const marketToLanguage: Record<string, TargetLanguage> = {
    'global': 'en',
    'us': 'en',
    'uk': 'en',
    'ca': 'en',
    'au': 'en',
    'de': 'de', // German
    'fr': 'fr', // French
    'jp': 'ja', // Japanese
    'cn': 'zh', // Chinese
  };
  
  return marketToLanguage[targetMarket] || 'en';
}

// Redefine interface locally to match strict type checking or import properly
// We'll trust the types pass through, but for now mocking the state logic here for UI demo

interface ArticleGeneratorLayoutProps {
  onBack: () => void;
  uiLanguage?: 'en' | 'zh';
  articleGeneratorState?: {
    keyword: string;
    tone: string;
    targetAudience: string;
    visualStyle: string;
    isGenerating: boolean;
    progress: number;
    currentStage: 'input' | 'research' | 'strategy' | 'writing' | 'visualizing' | 'complete';
    streamEvents: AgentStreamEvent[];
    finalArticle: {
      title: string;
      content: string;
      images: { url: string; prompt: string; placement: string }[];
    } | null;
  };
  onStateChange?: (state: Partial<{
    keyword: string;
    tone: string;
    targetAudience: string;
    visualStyle: string;
    isGenerating: boolean;
    progress: number;
    currentStage: 'input' | 'research' | 'strategy' | 'writing' | 'visualizing' | 'complete';
    streamEvents: AgentStreamEvent[];
    finalArticle: {
      title: string;
      content: string;
      images: { url: string; prompt: string; placement: string }[];
    } | null;
  }>) => void;
}

export const ArticleGeneratorLayout: React.FC<ArticleGeneratorLayoutProps> = ({ 
  onBack, 
  uiLanguage = 'en',
  articleGeneratorState,
  onStateChange
}) => {
  // Use global state if provided, otherwise fallback to local state
  const defaultState = {
    currentStage: 'input' as const,
    streamEvents: [] as AgentStreamEvent[],
    finalArticle: null as any,
  };
  
  const state = articleGeneratorState || defaultState;
  // Determine stage based on state: if generating -> generating, if has finalArticle -> preview, else -> input
  const stage = state.isGenerating ? 'generating' : 
                state.finalArticle ? 'preview' : 
                'input';
  
  const events = state.streamEvents || [];
  const finalArticle = state.finalArticle;
  
  const updateState = (updates: Partial<typeof state>) => {
    if (onStateChange) {
      onStateChange(updates);
    }
  };

  const startGeneration = async (config: ArticleConfig) => {
    updateState({
      currentStage: 'research', // Use a valid stage from the type
      streamEvents: [],
      finalArticle: null,
      isGenerating: true,
      keyword: config.keyword,
      tone: config.tone,
      targetAudience: config.targetAudience,
      visualStyle: config.visualStyle,
      targetMarket: config.targetMarket,
    });
    
    // Track events locally for this generation session
    let currentEvents: AgentStreamEvent[] = [];
    
    try {
        const response = await fetch('/api/visual-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...config,
                uiLanguage: uiLanguage || 'en',
                targetLanguage: getTargetLanguageFromMarket(config.targetMarket)
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
                        const event = json.data as AgentStreamEvent;
                        currentEvents = [...currentEvents, event];
                        
                        // Update progress and stage based on agent
                        let newProgress = state.progress || 0;
                        let newStage: GenerationStage = state.currentStage || 'research';
                        
                        // Calculate progress based on agent activity
                        if (event.agentId === 'researcher') {
                            newStage = 'research';
                            newProgress = Math.max(newProgress, 20);
                        } else if (event.agentId === 'strategist') {
                            newStage = 'strategy';
                            newProgress = Math.max(newProgress, 40);
                        } else if (event.agentId === 'writer') {
                            newStage = 'writing';
                            newProgress = Math.max(newProgress, 60);
                        } else if (event.agentId === 'artist') {
                            newStage = 'visualizing';
                            newProgress = Math.max(newProgress, 80);
                        }
                        
                        updateState({
                            streamEvents: currentEvents,
                            progress: newProgress,
                            currentStage: newStage,
                        });
                    } else if (json.type === 'done') {
                        updateState({
                            finalArticle: json.data,
                            isGenerating: false,
                            currentStage: 'complete',
                            progress: 100,
                        });
                    } else if (json.type === 'error') {
                        const errorEvent: AgentStreamEvent = {
                            id: Math.random().toString(),
                            agentId: 'tracker',
                            type: 'error',
                            timestamp: Date.now(),
                            message: json.message,
                            data: {
                                errorType: 'api-error',
                                details: json.message
                            }
                        };
                        currentEvents = [...currentEvents, errorEvent];
                        updateState({
                            streamEvents: currentEvents,
                            isGenerating: false,
                        });
                    }
                } catch (e) {
                    console.error('Error parsing stream line:', e);
                }
            }
        }
    } catch (error: any) {
        const errorEvent: AgentStreamEvent = {
            id: Math.random().toString(),
            agentId: 'tracker',
            type: 'error',
            timestamp: Date.now(),
            message: `Connection Error: ${error.message}`
        };
        currentEvents = [...currentEvents, errorEvent];
        updateState({
            streamEvents: currentEvents,
            isGenerating: false,
        });
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
        <div className="relative z-10 w-full h-full flex flex-col max-w-5xl mx-auto bg-[#050505]/50 backdrop-blur-sm shadow-2xl">
            
            {/* Stage Content */}
            <div className="flex-1 overflow-hidden relative">
                {stage === 'input' && (
                    <ArticleInputConfig onStart={startGeneration} uiLanguage={uiLanguage} />
                )}
                
                {stage === 'generating' && (
                    <div className="h-full flex flex-col">
                        {/* Overall Progress Bar */}
                        <div className="p-6 pb-4 shrink-0">
                            <OverallProgressBar
                                currentStage={state.currentStage || 'research'}
                                progress={state.progress || 0}
                                uiLanguage={uiLanguage}
                            />
                        </div>
                        
                        {/* Agent Stream Feed */}
                        <div className="flex-1 min-h-0">
                            <AgentStreamFeed events={events} uiLanguage={uiLanguage} />
                        </div>
                    </div>
                )}
                
                {stage === 'preview' && finalArticle && (
                    <ArticlePreview 
                       finalArticle={finalArticle} 
                       onClose={() => updateState({ 
                         currentStage: 'input', 
                         finalArticle: null,
                         isGenerating: false,
                       })}
                       articleConfig={{
                         keyword: state.keyword,
                         tone: state.tone,
                         visualStyle: state.visualStyle,
                         targetAudience: state.targetAudience,
                         targetMarket: state.targetMarket,
                       }}
                       uiLanguage={uiLanguage}
                    />
                )}
            </div>
            
        </div>
    </div>
  );
};
