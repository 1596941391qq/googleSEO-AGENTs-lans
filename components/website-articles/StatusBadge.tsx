import React from 'react';
import { cn } from '../../lib/utils';
import { ArticleStatus } from './types';
import { Circle, Loader2, CheckCircle2, TrendingUp, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: ArticleStatus;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  isDarkTheme,
  uiLanguage,
  size = 'md',
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          icon: <Circle className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: uiLanguage === 'zh' ? '草稿' : 'Draft',
          color: isDarkTheme
            ? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
            : 'text-gray-500 bg-gray-100 border-gray-200',
        };
      case 'generating':
        return {
          icon: <Loader2 className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5', 'animate-spin')} />,
          label: uiLanguage === 'zh' ? '生成中' : 'Generating',
          color: isDarkTheme
            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            : 'text-amber-600 bg-amber-50 border-amber-200',
        };
      case 'published':
        return {
          icon: <CheckCircle2 className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: uiLanguage === 'zh' ? '已发布' : 'Published',
          color: isDarkTheme
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : 'text-emerald-600 bg-emerald-50 border-emerald-200',
        };
      case 'ranking':
        return {
          icon: <TrendingUp className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: uiLanguage === 'zh' ? '排名中' : 'Ranking',
          color: isDarkTheme
            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            : 'text-blue-600 bg-blue-50 border-blue-200',
        };
      case 'failed':
        return {
          icon: <AlertCircle className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: uiLanguage === 'zh' ? '失败' : 'Failed',
          color: isDarkTheme
            ? 'text-red-400 bg-red-500/10 border-red-500/20'
            : 'text-red-600 bg-red-50 border-red-200',
        };
      default:
        return {
          icon: <Circle className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: status,
          color: isDarkTheme
            ? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
            : 'text-gray-500 bg-gray-100 border-gray-200',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold transition-all duration-200",
      size === 'sm' ? 'text-[10px]' : 'text-xs',
      config.color
    )}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};
