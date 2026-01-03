import React from 'react';
import { Loader2, CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ImageGenerationStatus = 'pending' | 'extracting' | 'prompting' | 'generating' | 'processing' | 'completed' | 'failed';

export interface ImageGenerationProgressCardProps {
  theme: string;
  prompt?: string;
  status: ImageGenerationStatus;
  progress?: number; // 0-100
  estimatedTime?: number; // seconds
  error?: string;
  imageUrl?: string;
  uiLanguage?: 'en' | 'zh';
}

const STATUS_TEXT: Record<ImageGenerationStatus, { en: string; zh: string }> = {
  pending: { en: 'Pending', zh: '等待中' },
  extracting: { en: 'Extracting theme...', zh: '提取主题中...' },
  prompting: { en: 'Generating prompt...', zh: '生成提示词中...' },
  generating: { en: 'Generating image...', zh: '生成图像中...' },
  processing: { en: 'Processing image...', zh: '处理图像中...' },
  completed: { en: 'Completed', zh: '已完成' },
  failed: { en: 'Failed', zh: '生成失败' },
};

export const ImageGenerationProgressCard: React.FC<ImageGenerationProgressCardProps> = ({
  theme,
  prompt,
  status,
  progress = 0,
  estimatedTime,
  error,
  imageUrl,
  uiLanguage = 'en',
}) => {
  const t = STATUS_TEXT[status][uiLanguage];
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';
  const isLoading = !isCompleted && !isFailed;

  const getStatusIcon = () => {
    if (isCompleted) {
      return <CheckCircle className="text-emerald-500" size={16} />;
    }
    if (isFailed) {
      return <XCircle className="text-red-500" size={16} />;
    }
    return <Loader2 className="text-purple-500 animate-spin" size={16} />;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return uiLanguage === 'zh' ? `${seconds}秒` : `${seconds}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return uiLanguage === 'zh' ? `${mins}分${secs}秒` : `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-purple-500/5 border border-purple-500/20 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon className="text-purple-400" size={16} />
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
            {uiLanguage === 'zh' ? '图像生成' : 'Image Generation'}
          </span>
        </div>
        {getStatusIcon()}
      </div>

      {/* Theme */}
      <div className="text-sm font-medium text-white">{theme}</div>

      {/* Prompt */}
      {prompt && (
        <div className="text-xs text-gray-400 italic bg-black/20 rounded p-2 border border-white/5">
          "{prompt}"
        </div>
      )}

      {/* Progress Bar */}
      {isLoading && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{t}</span>
            {progress > 0 && (
              <span className="text-purple-400 font-mono">{Math.round(progress)}%</span>
            )}
          </div>
          <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
            <div
              className={cn(
                "h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300 relative overflow-hidden",
                progress === 0 && "animate-pulse"
              )}
              style={{ width: `${Math.max(progress, 5)}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      )}

      {/* Estimated Time */}
      {isLoading && estimatedTime && estimatedTime > 0 && (
        <div className="flex items-center space-x-1 text-xs text-gray-500">
          <Clock size={12} />
          <span>
            {uiLanguage === 'zh' 
              ? `预计剩余: ${formatTime(estimatedTime)}`
              : `Est. remaining: ${formatTime(estimatedTime)}`
            }
          </span>
        </div>
      )}

      {/* Error Message */}
      {isFailed && error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
          {error}
        </div>
      )}

      {/* Preview Image */}
      {imageUrl && (
        <div className="mt-2 rounded overflow-hidden border border-white/10">
          <img 
            src={imageUrl} 
            alt={theme} 
            className="w-full h-32 object-cover"
          />
        </div>
      )}
    </div>
  );
};

