import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface GoogleSearchResult {
  title: string;
  url: string;
  snippet?: string;
}

export interface GoogleSearchResultsProps {
  results?: GoogleSearchResult[];
  isDarkTheme?: boolean;
  uiLanguage?: 'zh' | 'en';
}

/**
 * 显示折叠的联网搜索结果组件
 * 用于在思维流中展示 Gemini 联网搜索获取的信息
 */
export const GoogleSearchResults: React.FC<GoogleSearchResultsProps> = ({
  results = [],
  isDarkTheme = true,
  uiLanguage = 'en',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!results || results.length === 0) {
    return null;
  }

  const t = {
    en: {
      title: 'Web Search Results',
      subtitle: 'Information retrieved from Google Search',
      expand: 'Show Results',
      collapse: 'Hide Results',
      resultsCount: (count: number) => `${count} result${count > 1 ? 's' : ''}`},
    zh: {
      title: '联网搜索结果',
      subtitle: '从 Google 搜索获取的信息',
      expand: '显示结果',
      collapse: '隐藏结果',
      resultsCount: (count: number) => `${count} 个结果`,
    },
  }[uiLanguage];

  return (
    <div
      className={cn(
        'mt-3 rounded-lg border transition-all duration-200',
        isDarkTheme
          ? 'bg-black/40 border-emerald-500/20'
          : 'bg-blue-50/50 border-blue-200'
      )}
    >
      {/* 折叠头部 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-3 hover:opacity-80 transition-opacity',
          isDarkTheme ? 'text-emerald-400' : 'text-blue-700'
        )}
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4" />
          <div className="text-left">
            <div className="text-xs font-semibold">{t.title}</div>
            <div
              className={cn(
                'text-[10px] mt-0.5',
                isDarkTheme ? 'text-emerald-400/70' : 'text-blue-600/70'
              )}
            >
              {t.resultsCount(results.length)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium">
            {isExpanded ? t.collapse : t.expand}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* 展开的内容 */}
      {isExpanded && (
        <div
          className={cn(
            'border-t px-3 py-2 space-y-2 max-h-96 overflow-y-auto',
            isDarkTheme
              ? 'border-emerald-500/20'
              : 'border-blue-200',
            'custom-scrollbar'
          )}
        >
          <div
            className={cn(
              'text-[10px] mb-2',
              isDarkTheme ? 'text-emerald-400/60' : 'text-blue-600/60'
            )}
          >
            {t.subtitle}
          </div>
          {results.map((result, index) => (
            <div
              key={index}
              className={cn(
                'p-2 rounded border transition-colors hover:border-opacity-60',
                isDarkTheme
                  ? 'bg-black/60 border-emerald-500/10 hover:border-emerald-500/30'
                  : 'bg-white border-blue-200 hover:border-blue-300'
              )}
            >
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        'text-xs font-semibold mb-1 line-clamp-2 group-hover:underline',
                        isDarkTheme ? 'text-emerald-300' : 'text-blue-700'
                      )}
                    >
                      {result.title}
                    </div>
                    {result.snippet && (
                      <div
                        className={cn(
                          'text-[11px] line-clamp-2',
                          isDarkTheme ? 'text-gray-400' : 'text-gray-600'
                        )}
                      >
                        {result.snippet}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-1.5">
                      <div
                        className={cn(
                          'text-[10px] truncate max-w-[200px]',
                          isDarkTheme ? 'text-gray-500' : 'text-gray-500'
                        )}
                      >
                        {result.url}
                      </div>
                      <ExternalLink
                        className={cn(
                          'w-3 h-3 flex-shrink-0',
                          isDarkTheme ? 'text-gray-500' : 'text-gray-400'
                        )}
                      />
                    </div>
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

