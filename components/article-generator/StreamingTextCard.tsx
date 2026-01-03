import React, { useState, useEffect, useRef } from 'react';
import { PenTool, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StreamingTextCardProps {
  content: string;
  speed?: number; // characters per interval
  interval?: number; // milliseconds
  onComplete?: () => void;
  uiLanguage?: 'en' | 'zh';
  className?: string;
}

export const StreamingTextCard: React.FC<StreamingTextCardProps> = ({
  content,
  speed = 3,
  interval = 50,
  onComplete,
  uiLanguage = 'en',
  className,
}) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!content) return;

    let currentIndex = 0;
    const timer = setInterval(() => {
      if (currentIndex < content.length) {
        const nextIndex = Math.min(currentIndex + speed, content.length);
        setDisplayedContent(content.substring(0, nextIndex));
        currentIndex = nextIndex;

        // Auto scroll to bottom
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [content, speed, interval, onComplete]);

  // Reset when content changes
  useEffect(() => {
    setDisplayedContent('');
    setIsComplete(false);
  }, [content]);

  return (
    <div className={cn("bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <PenTool className="text-amber-500" size={16} />
        <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
          {uiLanguage === 'zh' ? '内容生成中' : 'Writing Content'}
        </span>
        {!isComplete && (
          <Loader2 className="text-amber-500 animate-spin" size={14} />
        )}
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className={cn(
          "text-sm text-gray-300 leading-relaxed max-h-96 overflow-y-auto",
          "prose prose-invert prose-sm max-w-none"
        )}
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
        }}
      >
        {displayedContent}
        {!isComplete && (
          <span className="inline-block w-2 h-4 bg-amber-500 ml-1 animate-pulse" />
        )}
      </div>

      {/* Progress Indicator */}
      {content.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {Math.round((displayedContent.length / content.length) * 100)}% {uiLanguage === 'zh' ? '完成' : 'complete'}
          </span>
          <span>
            {displayedContent.length} / {content.length} {uiLanguage === 'zh' ? '字符' : 'chars'}
          </span>
        </div>
      )}
    </div>
  );
};

