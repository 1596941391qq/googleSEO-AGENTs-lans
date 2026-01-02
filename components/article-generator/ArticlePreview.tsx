
import React from 'react';
import { Download, RefreshCw, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MarkdownContent } from '../ui/MarkdownContent';
// We'll use a markdown library or just simple HTML rendering
// For simplicity, we assume 'content' is marked up HTML string for now
// In a real app, use react-markdown

interface ArticlePreviewProps {
  finalArticle: {
    title: string;
    content: string;
    images: { url: string; prompt: string; placement: string }[];
  };
  onClose: () => void;
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({ finalArticle, onClose }) => {
  // Simple helper to inject images into content
  // This is a naive implementation; production would use a proper parser
  const renderContent = () => {
    let content = finalArticle.content;
    
    // Naive image injection - this should be handled by the backend Agent 3 logic ideally, 
    // but here we just render them at the top or specific placeholders if we had them.
    // For this MVP, let's just render images at the top after title.
    
    return (
      <div className="prose prose-invert prose-lg max-w-none">
          {/* Images Grid */}
          {finalArticle.images.length > 0 && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mb-8">
                {finalArticle.images.map((img, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                        <img src={img.url} alt={img.prompt} className="w-full h-64 object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/80 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400">
                           {img.prompt}
                        </div>
                    </div>
                ))}
            </div>
          )}
          
          <MarkdownContent content={content} isDarkTheme={true} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#050505]">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a]">
            <div>
                <h2 className="text-sm font-bold text-gray-300">Article Preview</h2>
            </div>
            <div className="flex items-center space-x-2">
                <button className={cn(
                    "p-2 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors",
                    "flex items-center space-x-2 text-xs font-bold"
                )}>
                    <Download size={16} /> <span>Export</span>
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        </div>

        {/* Content Area - Medium Style */}
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-16 bg-[#050505]">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-8">
                    {finalArticle.title}
                </h1>
                
                {renderContent()}
            </div>
        </div>
    </div>
  );
};
