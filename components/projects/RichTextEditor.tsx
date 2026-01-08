import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { 
  Bold, Italic, List, ListOrdered, Link, 
  Sparkles, Save, Eye, Edit3, Loader2,
  Undo, Redo, Check, X
} from 'lucide-react';

interface RichTextEditorProps {
  initialContent: string;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  onSave: (content: string) => Promise<void>;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialContent,
  isDarkTheme,
  uiLanguage,
  onSave,
}) => {
  const [content, setContent] = useState(initialContent);
  const [mode, setStep] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [selectionPos, setSelectionPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    </div>
  );
};
