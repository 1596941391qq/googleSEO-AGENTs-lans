import React from 'react';
import { XCircle, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export type ErrorType = 'image-generation' | 'content-generation' | 'api-error' | 'network-error' | 'unknown';

export interface ErrorCardProps {
  type: ErrorType;
  message: string;
  details?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  uiLanguage?: 'en' | 'zh';
  className?: string;
}

const ERROR_TYPE_INFO: Record<ErrorType, { en: string; zh: string; icon: React.ReactNode }> = {
  'image-generation': {
    en: 'Image Generation Failed',
    zh: '图像生成失败',
    icon: <XCircle className="text-red-500" size={20} />
  },
  'content-generation': {
    en: 'Content Generation Failed',
    zh: '内容生成失败',
    icon: <XCircle className="text-red-500" size={20} />
  },
  'api-error': {
    en: 'API Error',
    zh: 'API错误',
    icon: <AlertTriangle className="text-orange-500" size={20} />
  },
  'network-error': {
    en: 'Network Error',
    zh: '网络错误',
    icon: <AlertTriangle className="text-orange-500" size={20} />
  },
  'unknown': {
    en: 'Unknown Error',
    zh: '未知错误',
    icon: <XCircle className="text-red-500" size={20} />
  },
};

export const ErrorCard: React.FC<ErrorCardProps> = ({
  type,
  message,
  details,
  onRetry,
  onDismiss,
  uiLanguage = 'en',
  className,
}) => {
  const errorInfo = ERROR_TYPE_INFO[type];

  return (
    <div className={cn(
      "bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3 animate-in slide-in-from-top-4 fade-in duration-300",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          {errorInfo.icon}
          <div>
            <div className="text-sm font-bold text-red-400">
              {uiLanguage === 'zh' ? errorInfo.zh : errorInfo.en}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Error Message */}
      <div className="text-sm text-red-200 bg-black/20 rounded p-2 border border-red-500/20">
        {message}
      </div>

      {/* Details */}
      {details && (
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-300 transition-colors">
            {uiLanguage === 'zh' ? '查看详情' : 'View Details'}
          </summary>
          <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] overflow-x-auto">
            {details}
          </pre>
        </details>
      )}

      {/* Actions */}
      {onRetry && (
        <div className="flex items-center space-x-2 pt-2 border-t border-red-500/20">
          <Button
            onClick={onRetry}
            variant="outline"
            size="sm"
            className="bg-red-500/20 border-red-500/50 text-red-300 hover:bg-red-500/30"
          >
            <RefreshCw size={14} className="mr-2" />
            {uiLanguage === 'zh' ? '重试' : 'Retry'}
          </Button>
        </div>
      )}
    </div>
  );
};

