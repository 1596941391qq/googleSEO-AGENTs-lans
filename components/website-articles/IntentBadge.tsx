import React from 'react';
import { cn } from '../../lib/utils';
import { SearchIntent } from './types';
import { Info, ShoppingCart } from 'lucide-react';

interface IntentBadgeProps {
  intent: SearchIntent;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  size?: 'sm' | 'md';
}

export const IntentBadge: React.FC<IntentBadgeProps> = ({
  intent,
  isDarkTheme,
  uiLanguage,
  size = 'sm',
}) => {
  const getIntentConfig = () => {
    switch (intent) {
      case 'informational':
        return {
          icon: <Info className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: uiLanguage === 'zh' ? '信息型' : 'Info',
          shortLabel: uiLanguage === 'zh' ? '信息' : 'I',
          color: isDarkTheme
            ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            : 'text-blue-600 bg-blue-50 border-blue-200',
          description: uiLanguage === 'zh'
            ? '信息型内容 → 发布到 RTD/Cloudflare'
            : 'Informational → RTD/Cloudflare',
        };
      case 'commercial':
        return {
          icon: <ShoppingCart className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: uiLanguage === 'zh' ? '商业型' : 'Commercial',
          shortLabel: uiLanguage === 'zh' ? '商业' : 'C',
          color: isDarkTheme
            ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
            : 'text-purple-600 bg-purple-50 border-purple-200',
          description: uiLanguage === 'zh'
            ? '商业型内容 → 发布到 Netlify/Vercel'
            : 'Commercial → Netlify/Vercel',
        };
      default:
        return {
          icon: <Info className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />,
          label: intent,
          shortLabel: intent.charAt(0).toUpperCase(),
          color: isDarkTheme
            ? 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
            : 'text-gray-500 bg-gray-100 border-gray-200',
          description: '',
        };
    }
  };

  const config = getIntentConfig();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold transition-all duration-200",
        size === 'sm' ? 'text-[10px]' : 'text-xs',
        config.color
      )}
      title={config.description}
    >
      {config.icon}
      <span className="hidden sm:inline">{config.shortLabel}</span>
    </div>
  );
};
