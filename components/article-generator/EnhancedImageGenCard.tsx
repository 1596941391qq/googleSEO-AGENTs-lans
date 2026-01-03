import React, { useState } from 'react';
import { RefreshCw, Download, X, Maximize2, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImageRevealAnimation } from './ImageRevealAnimation';
import { ImageGenerationProgressCard, ImageGenerationStatus } from './ImageGenerationProgressCard';
import { Button } from '../ui/button';

export interface EnhancedImageGenCardProps {
  theme: string;
  prompt: string;
  status: ImageGenerationStatus;
  progress?: number;
  imageUrl?: string;
  error?: string;
  onRegenerate?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
  onViewFullscreen?: () => void;
  estimatedTime?: number;
  uiLanguage?: 'en' | 'zh';
}

export const EnhancedImageGenCard: React.FC<EnhancedImageGenCardProps> = ({
  theme,
  prompt,
  status,
  progress,
  imageUrl,
  error,
  onRegenerate,
  onDownload,
  onRemove,
  onViewFullscreen,
  estimatedTime,
  uiLanguage = 'en',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isCompleted = status === 'completed';
  const isLoading = status !== 'completed' && status !== 'failed';

  return (
    <div
      className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 space-y-3 transition-all hover:border-purple-500/40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
            {uiLanguage === 'zh' ? '图像生成' : 'Image Generation'}
          </span>
          {isCompleted && (
            <CheckCircle className="text-emerald-500" size={14} />
          )}
          {isLoading && (
            <Loader2 className="text-purple-500 animate-spin" size={14} />
          )}
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className={cn(
              "text-gray-400 hover:text-red-400 transition-colors",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Theme */}
      <div className="text-sm font-medium text-white">{theme}</div>

      {/* Prompt */}
      <div className="text-xs text-gray-400 italic bg-black/20 rounded p-2 border border-white/5">
        "{prompt}"
      </div>

      {/* Progress or Image */}
      {isLoading ? (
        <ImageGenerationProgressCard
          theme={theme}
          prompt={prompt}
          status={status}
          progress={progress}
          estimatedTime={estimatedTime}
          error={error}
          uiLanguage={uiLanguage}
        />
      ) : imageUrl ? (
        <div className="relative group">
          <ImageRevealAnimation
            imageUrl={imageUrl}
            prompt={prompt}
            aspectRatio="4:3"
          />
          
          {/* Action Buttons Overlay */}
          <div
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center space-x-2 transition-opacity",
              isHovered ? "opacity-100" : "opacity-0"
            )}
          >
            {onViewFullscreen && (
              <Button
                onClick={onViewFullscreen}
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Maximize2 size={14} className="mr-2" />
                {uiLanguage === 'zh' ? '全屏' : 'Fullscreen'}
              </Button>
            )}
            {onDownload && (
              <Button
                onClick={onDownload}
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download size={14} className="mr-2" />
                {uiLanguage === 'zh' ? '下载' : 'Download'}
              </Button>
            )}
            {onRegenerate && (
              <Button
                onClick={onRegenerate}
                size="sm"
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <RefreshCw size={14} className="mr-2" />
                {uiLanguage === 'zh' ? '重新生成' : 'Regenerate'}
              </Button>
            )}
          </div>
        </div>
      ) : error ? (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </div>
      ) : null}

      {/* Action Buttons (Bottom) */}
      {isCompleted && !isHovered && (
        <div className="flex items-center space-x-2 pt-2 border-t border-white/5">
          {onRegenerate && (
            <Button
              onClick={onRegenerate}
              size="sm"
              variant="ghost"
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              <RefreshCw size={12} className="mr-1" />
              {uiLanguage === 'zh' ? '重新生成' : 'Regenerate'}
            </Button>
          )}
          {onDownload && (
            <Button
              onClick={onDownload}
              size="sm"
              variant="ghost"
              className="text-xs text-purple-400 hover:text-purple-300"
            >
              <Download size={12} className="mr-1" />
              {uiLanguage === 'zh' ? '下载' : 'Download'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

