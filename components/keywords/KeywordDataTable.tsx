import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, FileText, Eye, Sparkles, ChevronDown, ChevronUp, ExternalLink, Star } from 'lucide-react';
import { KeywordWithStatus, ProbabilityLevel } from '../../types';

export interface SortConfig {
  field: 'keyword' | 'volume' | 'difficulty' | 'probability' | 'created_at' | 'intent';
  order: 'asc' | 'desc';
}

interface KeywordDataTableProps {
  keywords: KeywordWithStatus[];
  favoritedIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onSort: (field: SortConfig['field']) => void;
  sortConfig: SortConfig;
  onGenerate: (keyword: KeywordWithStatus) => void;
  onViewDraft: (keyword: KeywordWithStatus) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const KeywordDataTable: React.FC<KeywordDataTableProps> = ({
  keywords,
  favoritedIds,
  onToggleFavorite,
  onSort,
  sortConfig,
  onGenerate,
  onViewDraft,
  isDarkTheme,
  uiLanguage,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getSortIcon = (field: SortConfig['field']) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    }
    return sortConfig.order === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const getProbabilityColor = (probability: ProbabilityLevel) => {
    switch (probability) {
      case 'High':
        return isDarkTheme ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Medium':
        return isDarkTheme ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return isDarkTheme ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return isDarkTheme ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSourceColor = (source: string | null | undefined) => {
    switch (source) {
      case 'website-audit':
        return isDarkTheme ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700';
      case 'manual':
        return isDarkTheme ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700';
      default:
        // 默认处理：如果不是 website-audit，则视为蓝海发现
        return isDarkTheme ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700';
    }
  };

  const getSourceLabel = (source: string | null | undefined) => {
    switch (source) {
      case 'website-audit':
        return uiLanguage === 'zh' ? '存量拓新' : 'Website Audit';
      case 'manual':
      default:
        // 默认处理：如果不是 website-audit，则视为蓝海发现
        return uiLanguage === 'zh' ? '蓝海发现' : 'Blue Ocean Discovery';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return uiLanguage === 'zh' ? `${diffMins}分钟前` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return uiLanguage === 'zh' ? `${diffHours}小时前` : `${diffHours}h ago`;
    } else {
      return uiLanguage === 'zh' ? `${diffDays}天前` : `${diffDays}d ago`;
    }
  };

  if (keywords.length === 0) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center py-20 rounded-xl border border-dashed',
        isDarkTheme ? 'border-zinc-800 text-zinc-600' : 'border-gray-200 text-gray-400'
      )}>
        <p className="text-sm font-medium">
          {uiLanguage === 'zh' ? '暂无关键词数据' : 'No keywords found'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className={cn(
            'border-b text-[10px] font-bold uppercase tracking-wider',
            isDarkTheme ? 'border-zinc-800 text-zinc-500' : 'border-gray-200 text-gray-500'
          )}>
            <th className="p-2 text-center w-10">{uiLanguage === 'zh' ? '收藏' : '⭐'}</th>
            <th className="p-2 text-left">
              <button
                onClick={() => onSort('keyword')}
                className="flex items-center hover:text-emerald-500 transition-colors"
              >
                {uiLanguage === 'zh' ? '关键词' : 'Keyword'}
                {getSortIcon('keyword')}
              </button>
            </th>
            <th className="p-2 text-left">{uiLanguage === 'zh' ? '来源' : 'Source'}</th>
            <th className="p-2 text-right">
              <button
                onClick={() => onSort('volume')}
                className="flex items-center justify-end hover:text-emerald-500 transition-colors ml-auto"
              >
                {uiLanguage === 'zh' ? '搜索量' : 'Volume'}
                {getSortIcon('volume')}
              </button>
            </th>
            <th className="p-2 text-right">
              <button
                onClick={() => onSort('difficulty')}
                className="flex items-center justify-end hover:text-emerald-500 transition-colors ml-auto"
              >
                {uiLanguage === 'zh' ? '难度' : 'Difficulty'}
                {getSortIcon('difficulty')}
              </button>
            </th>
            <th className="p-2 text-left">
              <button
                onClick={() => onSort('probability')}
                className="flex items-center hover:text-emerald-500 transition-colors"
              >
                {uiLanguage === 'zh' ? '概率' : 'Probability'}
                {getSortIcon('probability')}
              </button>
            </th>
            <th className="p-2 text-left">{uiLanguage === 'zh' ? '来源项目' : 'Project'}</th>
            <th className="p-2 text-center w-16">{uiLanguage === 'zh' ? '详情' : 'Details'}</th>
            <th className="p-2 text-center">{uiLanguage === 'zh' ? '操作' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((keyword) => {
            const isSelected = selectedIds.includes(keyword.id);
            const isHighProbability = keyword.probability === 'High';

            return (
              <React.Fragment key={keyword.id}>
                <tr
                  className={cn(
                    'border-b transition-colors group',
                    isDarkTheme ? 'border-zinc-800 hover:bg-zinc-900/50' : 'border-gray-100 hover:bg-gray-50',
                    isHighProbability && 'border-l-4 border-l-emerald-500'
                  )}
                >
                <td className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onToggleFavorite(keyword.id)}
                    className={cn(
                      'h-6 w-6 p-0',
                      favoritedIds.has(keyword.id)
                        ? (isDarkTheme ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700')
                        : (isDarkTheme ? 'text-zinc-500 hover:text-yellow-400' : 'text-gray-400 hover:text-yellow-500')
                    )}
                  >
                    <Star className={cn('w-4 h-4', favoritedIds.has(keyword.id) && 'fill-current')} />
                  </Button>
                </td>
                <td className={cn('p-2 font-medium text-xs', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                    <div className="max-w-[200px] truncate" title={keyword.keyword}>
                      {keyword.keyword}
                    </div>
                  </td>
                  <td className="p-2">
                    <Badge className={cn('text-[9px] font-bold px-1.5 py-0.5', getSourceColor(keyword.source))}>
                      {getSourceLabel(keyword.source)}
                    </Badge>
                  </td>
                  <td className={cn('p-2 text-right text-xs font-medium', isDarkTheme ? 'text-zinc-300' : 'text-gray-700')}>
                    {keyword.volume ? keyword.volume.toLocaleString() : '-'}
                  </td>
                  <td className={cn('p-2 text-right text-xs font-medium', isDarkTheme ? 'text-zinc-300' : 'text-gray-700')}>
                    {keyword.difficulty || '-'}
                  </td>
                  <td className="p-2">
                    <Badge className={cn('text-[9px] font-bold border px-1.5 py-0.5', getProbabilityColor(keyword.probability))}>
                      {keyword.probability}
                    </Badge>
                  </td>
                  <td className={cn('p-2 text-xs', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                    <div className="max-w-[120px] truncate" title={keyword.project_name}>
                      {keyword.project_name || '-'}
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(keyword.id)}
                      className={cn(
                        'h-6 w-6 p-0',
                        isDarkTheme ? 'text-zinc-400 hover:bg-zinc-800' : 'text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      {expandedRows.has(keyword.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onGenerate(keyword)}
                        className={cn(
                          'h-6 px-2 text-[10px] font-medium',
                          isDarkTheme ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-50'
                        )}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {uiLanguage === 'zh' ? '生成' : 'Generate'}
                      </Button>
                      {keyword.has_draft && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewDraft(keyword)}
                          className={cn(
                            'h-6 px-2 text-[10px] font-medium',
                            isDarkTheme ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'
                          )}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          {uiLanguage === 'zh' ? '查看' : 'View'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedRows.has(keyword.id) && (
                  <tr className={cn(isDarkTheme ? 'bg-zinc-900/50' : 'bg-gray-50')}>
                    <td colSpan={9} className="p-4">
                    <div className={cn('space-y-4 text-sm', isDarkTheme ? 'text-zinc-300' : 'text-gray-700')}>
                      {/* Metrics Row */}
                      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b', isDarkTheme ? 'border-zinc-800' : 'border-gray-200')}>
                        <div>
                          <p className={cn('text-xs font-medium mb-1', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                            {uiLanguage === 'zh' ? '搜索量' : 'Search Volume'}
                          </p>
                          <p className="font-semibold">{keyword.volume ? keyword.volume.toLocaleString() : '-'}</p>
                        </div>
                        <div>
                          <p className={cn('text-xs font-medium mb-1', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                            {uiLanguage === 'zh' ? '难度' : 'Difficulty'}
                          </p>
                          <p className="font-semibold">{keyword.difficulty || '-'}</p>
                        </div>
                        <div>
                          <p className={cn('text-xs font-medium mb-1', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                            {uiLanguage === 'zh' ? 'CPC' : 'CPC'}
                          </p>
                          <p className="font-semibold">
                            {keyword.cpc != null && !isNaN(Number(keyword.cpc)) 
                              ? `$${Number(keyword.cpc).toFixed(2)}` 
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <p className={cn('text-xs font-medium mb-1', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                            {uiLanguage === 'zh' ? 'SERP类型' : 'SERP Type'}
                          </p>
                          <p className="font-semibold">{keyword.top_domain_type || '-'}</p>
                        </div>
                      </div>

                      {/* Analysis Content */}
                      {keyword.reasoning && (
                        <div>
                          <p className={cn('text-xs font-medium mb-2', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                            {uiLanguage === 'zh' ? '分析内容' : 'Analysis'}
                          </p>
                          <p className={cn('text-xs leading-relaxed', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                            {keyword.reasoning}
                          </p>
                        </div>
                      )}

                      {/* SERP Results */}
                      {keyword.top_serp_snippets && keyword.top_serp_snippets.length > 0 && (
                        <div>
                          <p className={cn('text-xs font-medium mb-2', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                            {uiLanguage === 'zh' ? 'SERP结果' : 'SERP Results'}
                          </p>
                          <div className="space-y-2">
                            {keyword.top_serp_snippets.slice(0, 5).map((snippet, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  'p-2 rounded border',
                                  isDarkTheme ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-white'
                                )}
                              >
                                {snippet.title && (
                                  <p className={cn('text-xs font-medium mb-1', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                                    {snippet.title}
                                  </p>
                                )}
                                {snippet.url && (
                                  <a
                                    href={snippet.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      'text-xs flex items-center gap-1 hover:underline',
                                      isDarkTheme ? 'text-blue-400' : 'text-blue-600'
                                    )}
                                  >
                                    {snippet.url}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {snippet.snippet && (
                                  <p className={cn('text-xs mt-1 line-clamp-2', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                                    {snippet.snippet}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
