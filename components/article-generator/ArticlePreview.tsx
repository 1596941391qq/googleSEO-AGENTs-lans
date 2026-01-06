
import React, { useState } from 'react';
import { Download, RefreshCw, X, Image as ImageIcon, Save, CheckCircle, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MarkdownContent } from '../ui/MarkdownContent';
import { ImageRevealAnimation } from './ImageRevealAnimation';
import { ImageLightbox } from './ImageLightbox';
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
  articleConfig?: {
    keyword?: string;
    tone?: string;
    visualStyle?: string;
    targetAudience?: string;
    targetMarket?: string;
  };
  uiLanguage?: 'en' | 'zh';
  isDarkTheme?: boolean;
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({ 
  finalArticle, 
  onClose,
  articleConfig,
  uiLanguage = 'en',
  isDarkTheme = true
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; prompt?: string } | null>(null);

  // Handle Export
  const handleExport = () => {
    // Create a markdown file with title and content
    const markdown = `# ${finalArticle.title}\n\n${finalArticle.content}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${finalArticle.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userId = 1; // TODO: Get from session/auth
      
      const response = await fetch('/api/articles/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          title: finalArticle.title,
          content: finalArticle.content,
          images: finalArticle.images || [],
          keyword: articleConfig?.keyword || null,
          tone: articleConfig?.tone || null,
          visualStyle: articleConfig?.visualStyle || null,
          targetAudience: articleConfig?.targetAudience || null,
          targetMarket: articleConfig?.targetMarket || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save article');
      }

      // 触发文章保存事件，通知 publish 页面刷新
      window.dispatchEvent(new CustomEvent('article-saved'));

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error('Error saving article:', error);
      alert(uiLanguage === 'zh' ? '保存失败，请重试' : 'Failed to save article. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
                    <div 
                      key={i} 
                      className="relative group rounded-xl overflow-hidden border border-white/10 shadow-2xl cursor-pointer"
                      onClick={() => setLightboxImage({ url: img.url, prompt: img.prompt })}
                    >
                        <ImageRevealAnimation
                          imageUrl={img.url}
                          prompt={img.prompt}
                          aspectRatio="4:3"
                        />
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex items-center space-x-2 text-white text-sm">
                            <Maximize2 size={18} />
                            <span>{uiLanguage === 'zh' ? '点击查看大图' : 'Click to view fullscreen'}</span>
                          </div>
                        </div>
                        {img.prompt && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-gray-300 italic line-clamp-2">"{img.prompt}"</p>
                          </div>
                        )}
                    </div>
                ))}
            </div>
          )}
          
          <MarkdownContent content={content} isDarkTheme={isDarkTheme} />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] relative">
        {/* Success Notification */}
        {showSuccess && (
          <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-emerald-500/90 backdrop-blur-sm border border-emerald-400/50 rounded-lg p-4 shadow-2xl flex items-center space-x-3 min-w-[280px]">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">
                  {uiLanguage === 'zh' ? '已保存到发布界面' : 'Saved to Publish'}
                </p>
                <p className="text-emerald-100 text-xs mt-0.5">
                  {uiLanguage === 'zh' ? '可以在发布标签页查看' : 'View in Publish tab'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Fixed on Right */}
        <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
          <button
            onClick={handleExport}
            className={cn(
              "p-3 rounded-lg text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30",
              "transition-all flex items-center space-x-2 shadow-lg backdrop-blur-sm",
              "hover:scale-105 active:scale-95"
            )}
            title="Export Article"
          >
            <Download size={18} />
            <span className="text-sm font-medium">Export</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "p-3 rounded-lg text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30",
              "transition-all flex items-center space-x-2 shadow-lg backdrop-blur-sm",
              "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title="Save Article"
          >
            {isSaving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm font-medium">{uiLanguage === 'zh' ? '保存中...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span className="text-sm font-medium">{uiLanguage === 'zh' ? '保存' : 'Save'}</span>
              </>
            )}
          </button>
        </div>

        {/* Content Area - Medium Style */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="max-w-3xl mx-auto px-8 py-16 bg-[#050505]">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight mb-8">
                    {finalArticle.title}
                </h1>
                
                {renderContent()}
            </div>
        </div>

        {/* Image Lightbox */}
        {lightboxImage && (
          <ImageLightbox
            imageUrl={lightboxImage.url}
            prompt={lightboxImage.prompt}
            isOpen={!!lightboxImage}
            onClose={() => setLightboxImage(null)}
            onDownload={() => {
              const a = document.createElement('a');
              a.href = lightboxImage.url;
              a.download = `image-${Date.now()}.jpg`;
              a.click();
            }}
            uiLanguage={uiLanguage}
          />
        )}
    </div>
  );
};
