import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { 
  Bold, Italic, List, ListOrdered, Link, 
  Sparkles, Save, Eye, Edit3, Loader2,
  Undo, Redo, Check, X, History, Image as ImageIcon,
  ChevronRight, Calendar, User
} from 'lucide-react';

interface RichTextEditorProps {
  initialContent: string;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  onSave: (content: string) => Promise<void>;
  draftId?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent,
  isDarkTheme,
  uiLanguage,
  onSave,
  draftId,
}) => {
  const [content, setContent] = useState(initialContent);
  const [mode, setStep] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectionPos, setSelectionPos] = useState({ top: 0, left: 0 });
  const [versions, setVersions] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (draftId) {
      fetchDraftDetails();
    }
  }, [draftId]);

  const fetchDraftDetails = async () => {
    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/articles/get-draft?id=${draftId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setVersions(result.data.versions || []);
        setImages(result.data.images || []);
      }
    } catch (err) {
      console.error('Failed to fetch draft details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleVersionSelect = (versionContent: string) => {
    if (window.confirm(uiLanguage === 'zh' ? '确定要切换到此版本吗？当前未保存的更改将丢失。' : 'Are you sure you want to switch to this version? Unsaved changes will be lost.')) {
      setContent(versionContent);
      setShowHistory(false);
    }
  };

  const insertImage = (imageUrl: string, altText: string) => {
    if (!textareaRef.current) return;
    
    const { selectionStart, selectionEnd } = textareaRef.current;
    const imageMarkdown = `\n![${altText}](${imageUrl})\n`;
    
    const newContent = 
      content.substring(0, selectionStart) + 
      imageMarkdown + 
      content.substring(selectionEnd);
      
    setContent(newContent);
    setShowImages(false);
    
    // Set focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = selectionStart + imageMarkdown.length;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleSelection = () => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    if (selectionStart !== selectionEnd) {
      const selectedText = value.substring(selectionStart, selectionEnd);
      
      // Calculate position for popover
      const rect = textareaRef.current.getBoundingClientRect();
      // This is a rough estimation of cursor position
      // For more accuracy, we could use a hidden mirror div
      setSelectionPos({
        top: 0, // We'll show it fixed at the top of selection or in toolbar for now
        left: 0
      });
      
      setSelection({ start: selectionStart, end: selectionEnd, text: selectedText });
    } else {
      setSelection(null);
    }
  };

  const applyAiModification = async (instruction: string) => {
    if (!selection) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/translate-text', { // Reuse translation or create a generic AI edit API
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: selection.text,
          targetLanguage: uiLanguage === 'zh' ? 'Chinese' : 'English',
          prompt: `You are an expert SEO editor. Please ${instruction} for the following text while maintaining the original meaning and optimizing for readability and SEO. Return ONLY the modified text.\n\nText: "${selection.text}"`
        })
      });
      const result = await response.json();
      if (result.translatedText) {
        const newContent = 
          content.substring(0, selection.start) + 
          result.translatedText + 
          content.substring(selection.end);
        setContent(newContent);
        setSelection(null);
      }
    } catch (err) {
      console.error('AI modification failed:', err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(content);
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className={cn(
        "flex items-center justify-between p-2 border-b",
        isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
      )}>
        <div className="flex items-center gap-1">
          <Button 
            variant={mode === 'edit' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setStep('edit')}
            className="h-8 gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {uiLanguage === 'zh' ? '编辑' : 'Edit'}
          </Button>
          <Button 
            variant={mode === 'preview' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setStep('preview')}
            className="h-8 gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            {uiLanguage === 'zh' ? '预览' : 'Preview'}
          </Button>
          
          <div className="w-px h-4 mx-2 bg-zinc-700" />
          
          <Button 
            variant={showHistory ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => {
              setShowHistory(!showHistory);
              setShowImages(false);
            }}
            className="h-8 gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            {uiLanguage === 'zh' ? '版本' : 'History'}
          </Button>

          <Button 
            variant={showImages ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => {
              setShowImages(!showImages);
              setShowHistory(false);
            }}
            className="h-8 gap-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {uiLanguage === 'zh' ? '图片库' : 'Images'}
          </Button>

          <div className="w-px h-4 mx-2 bg-zinc-700" />
          
          {mode === 'edit' && (
            <>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Bold className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Italic className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8"><List className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Link className="w-4 h-4" /></Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selection && mode === 'edit' && (
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
              <span className="text-[10px] text-zinc-500 mr-2 uppercase font-bold tracking-wider">
                AI Edit Selection:
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={aiLoading}
                className="h-8 border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                onClick={() => applyAiModification("rewrite this more professionally")}
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {uiLanguage === 'zh' ? '润色' : 'Polished'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={aiLoading}
                className="h-8 border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                onClick={() => applyAiModification("make this text shorter and more concise")}
              >
                {uiLanguage === 'zh' ? '精简' : 'Shorter'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={aiLoading}
                className="h-8 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                onClick={() => applyAiModification("expand this with more details and examples")}
              >
                {uiLanguage === 'zh' ? '扩写' : 'Expand'}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelection(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <Button 
            disabled={isSaving}
            onClick={handleSave}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {uiLanguage === 'zh' ? '保存' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor / Preview Area */}
      <div className="flex-1 overflow-hidden relative flex">
        {/* Main Content */}
        <div className="flex-1 overflow-hidden relative">
          {mode === 'edit' ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onSelect={handleSelection}
              className={cn(
                "w-full h-full p-8 outline-none resize-none font-mono text-sm leading-relaxed",
                isDarkTheme ? "bg-black text-zinc-300" : "bg-white text-gray-800"
              )}
              placeholder={uiLanguage === 'zh' ? '在这里输入或粘贴 Markdown 内容...' : 'Type or paste your markdown here...'}
            />
          ) : (
            <div className={cn(
              "w-full h-full p-8 overflow-y-auto",
              isDarkTheme ? "bg-black" : "bg-white"
            )}>
              <div className={cn(
                "max-w-3xl mx-auto prose prose-sm md:prose-base lg:prose-lg",
                isDarkTheme ? "prose-invert" : ""
              )}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className={cn(
            "w-64 border-l overflow-y-auto animate-in slide-in-from-right duration-200",
            isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
          )}>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-inherit z-10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {uiLanguage === 'zh' ? '版本历史' : 'Version History'}
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowHistory(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="p-2 space-y-1">
              {versions.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-500 italic">
                  {uiLanguage === 'zh' ? '暂无历史版本' : 'No history versions'}
                </div>
              )}
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => handleVersionSelect(v.content)}
                  className={cn(
                    "w-full p-3 text-left rounded-lg transition-all border",
                    isDarkTheme 
                      ? "hover:bg-zinc-800 border-transparent hover:border-zinc-700" 
                      : "hover:bg-white border-transparent hover:border-gray-300 shadow-sm"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-emerald-500">v{v.version}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(v.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate mb-2">
                    {v.content?.substring(0, 60)}...
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {v.status || 'draft'}
                    </span>
                    {v.quality_score && (
                      <span className="text-[10px] font-mono text-emerald-400">
                        {v.quality_score}%
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Images Panel */}
        {showImages && (
          <div className={cn(
            "w-80 border-l overflow-y-auto animate-in slide-in-from-right duration-200",
            isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-gray-50 border-gray-200"
          )}>
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-inherit z-10">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {uiLanguage === 'zh' ? '项目图片' : 'Project Images'}
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowImages(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="p-4 grid grid-cols-1 gap-4">
              {images.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-500 italic">
                  {uiLanguage === 'zh' ? '暂无图片' : 'No images found'}
                </div>
              )}
              {images.map((img, i) => (
                <div 
                  key={img.id} 
                  className={cn(
                    "group relative rounded-lg overflow-hidden border transition-all",
                    isDarkTheme ? "bg-black border-zinc-800 hover:border-emerald-500/50" : "bg-white border-gray-200 hover:border-emerald-500/50 shadow-sm"
                  )}
                >
                  <img 
                    src={img.image_url} 
                    alt={img.alt_text} 
                    className="w-full h-40 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                    <p className="text-[10px] text-white text-center mb-3 line-clamp-3">
                      {img.prompt || img.alt_text}
                    </p>
                    <Button 
                      size="sm" 
                      className="h-7 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => insertImage(img.image_url, img.alt_text || img.prompt || 'image')}
                    >
                      {uiLanguage === 'zh' ? '插入文章' : 'Insert to Article'}
                    </Button>
                  </div>
                  {img.metadata?.isScreenshot && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-blue-600 text-[8px] font-bold text-white rounded uppercase">
                      Screenshot
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
