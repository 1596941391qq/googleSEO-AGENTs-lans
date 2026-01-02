
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Wand2, Type, Image as ImageIcon, Users } from 'lucide-react';
import { cn } from '../../lib/utils';

// Tone Options
const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', emoji: '👔' },
  { id: 'casual', label: 'Casual', emoji: '☕' },
  { id: 'persuasive', label: 'Persuasive', emoji: '🔥' },
  { id: 'educational', label: 'Educational', emoji: '📚' },
];

// Visual Styles
const VISUAL_STYLES = [
  { id: 'realistic', label: 'Realistic Photo', emoji: '📷' },
  { id: 'minimalist', label: 'Minimalist', emoji: '🎨' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🤖' },
  { id: 'watercolor', label: 'Watercolor', emoji: '🖌️' },
];

interface ArticleInputConfigProps {
  onStart: (config: ArticleConfig) => void;
  isDarkTheme?: boolean;
}

export interface ArticleConfig {
  keyword: string;
  tone: string;
  visualStyle: string;
  targetAudience: 'beginner' | 'expert';
}

export const ArticleInputConfig: React.FC<ArticleInputConfigProps> = ({ onStart, isDarkTheme }) => {
  const [keyword, setKeyword] = useState('');
  const [tone, setTone] = useState(TONE_OPTIONS[0].id);
  const [visualStyle, setVisualStyle] = useState(VISUAL_STYLES[0].id);
  const [audience, setAudience] = useState<'beginner' | 'expert'>('beginner');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onStart({ keyword, tone, visualStyle, targetAudience: audience });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
           <Wand2 className="text-emerald-500 w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">
          AI Visual Article Generator
        </h1>
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          Transform a single keyword into a rich, structured article with AI-generated visuals.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        
        {/* Main Input */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter your topic keyword (e.g. 'Best Coffee Grinders')"
              className="w-full bg-[#111] border border-white/10 text-xl p-6 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-2xl"
              autoFocus
            />
            <button 
               type="submit"
               disabled={!keyword.trim()}
               className="absolute right-3 top-3 bottom-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 rounded-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <span>Generate</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Options Toggles */}
        <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center space-x-1"
            >
               <span>{isAdvancedOpen ? 'Hide' : 'Show'} Advanced Options</span>
            </button>
        </div>

        {/* Advanced Options Panel */}
        {isAdvancedOpen && (
           <div className="bg-[#111] border border-white/5 rounded-xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
               
               {/* Grid Layout */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   
                   {/* Tone */}
                   <div className="space-y-3">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                           <Type size={12} className="mr-2" /> Tone
                       </label>
                       <div className="grid grid-cols-2 gap-2">
                           {TONE_OPTIONS.map(opt => (
                               <button
                                 key={opt.id}
                                 type="button"
                                 onClick={() => setTone(opt.id)}
                                 className={cn(
                                     "p-2 rounded border text-xs font-medium transition-all text-left flex items-center space-x-2",
                                     tone === opt.id 
                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                                        : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                                 )}
                               >
                                   <span>{opt.emoji}</span>
                                   <span>{opt.label}</span>
                               </button>
                           ))}
                       </div>
                   </div>

                   {/* Visual Style */}
                   <div className="space-y-3">
                       <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                           <ImageIcon size={12} className="mr-2" /> Visual Style
                       </label>
                       <div className="grid grid-cols-2 gap-2">
                           {VISUAL_STYLES.map(style => (
                               <button
                                 key={style.id}
                                 type="button"
                                 onClick={() => setVisualStyle(style.id)}
                                 className={cn(
                                     "p-2 rounded border text-xs font-medium transition-all text-left flex items-center space-x-2",
                                     visualStyle === style.id 
                                        ? "bg-purple-500/20 border-purple-500/50 text-purple-400" 
                                        : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                                 )}
                               >
                                   <span>{style.emoji}</span>
                                   <span>{style.label}</span>
                               </button>
                           ))}
                       </div>
                   </div>
               </div>

               {/* Audience Slider (Simple Toggle for now) */}
               <div className="space-y-3 pt-2 border-t border-white/5">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                        <Users size={12} className="mr-2" /> Target Audience
                   </label>
                   <div className="flex bg-black/40 p-1 rounded-lg w-full max-w-md mx-auto border border-white/5">
                        <button
                          type="button"
                          onClick={() => setAudience('beginner')}
                          className={cn(
                              "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                              audience === 'beginner' ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-gray-300"
                          )}
                        >
                            Beginner
                        </button>
                        <button
                          type="button"
                          onClick={() => setAudience('expert')}
                          className={cn(
                              "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                              audience === 'expert' ? "bg-white/10 text-white shadow" : "text-gray-500 hover:text-gray-300"
                          )}
                        >
                            Expert
                        </button>
                   </div>
               </div>

           </div>
        )}
      </form>
    </div>
  );
};
