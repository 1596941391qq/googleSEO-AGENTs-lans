import React from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, FileText, Eye, Sparkles } from 'lucide-react';
import { KeywordWithStatus, ProbabilityLevel, IntentType } from '../../types';

export interface SortConfig {
  field: 'keyword' | 'volume' | 'difficulty' | 'probability' | 'created_at' | 'intent';
  order: 'asc' | 'desc';
}

interface KeywordDataTableProps {
  keywords: KeywordWithStatus[];
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectOne: (id: string, checked: boolean) => void;
  onSort: (field: SortConfig['field']) => void;
  sortConfig: SortConfig;
  onGenerate: (keyword: KeywordWithStatus) => void;
  onViewDraft: (keyword: KeywordWithStatus) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const KeywordDataTable: React.FC<KeywordDataTableProps> = ({
  keywords,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onSort,
  sortConfig,
  onGenerate,
  onViewDraft,
  isDarkTheme,
  uiLanguage,
}) => {
  const allSelected = keywords.length > 0 && selectedIds.length === keywords.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < keywords.length;

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

  const getIntentColor = (intent: IntentType) => {
    switch (intent) {
      case 'Commercial':
        return isDarkTheme ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700';
      case 'Informational':
        return isDarkTheme ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-700';
      case 'Navigational':
        return isDarkTheme ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700';
      case 'Transactional':
        return isDarkTheme ? 'bg-pink-500/10 text-pink-400' : 'bg-pink-50 text-pink-700';
      default:
        return isDarkTheme ? 'bg-zinc-500/10 text-zinc-400' : 'bg-gray-50 text-gray-700';
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
            'border-b text-xs font-bold uppercase tracking-wider',
            isDarkTheme ? 'border-zinc-800 text-zinc-500' : 'border-gray-200 text-gray-500'
          )}>
            <th className="p-3 text-left w-10">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => el && (el.indeterminate = someSelected)}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900"
              />
            </th>
            <th className="p-3 text-left">
              <button
                onClick={() => onSort('keyword')}
                className="flex items-center hover:text-emerald-500 transition-colors"
              >
                {uiLanguage === 'zh' ? '关键词' : 'Keyword'}
                {getSortIcon('keyword')}
              </button>
            </th>
            <th className="p-3 text-left">{uiLanguage === 'zh' ? '翻译' : 'Translation'}</th>
            <th className="p-3 text-left">
              <button
                onClick={() => onSort('intent')}
                className="flex items-center hover:text-emerald-500 transition-colors"
              >
                {uiLanguage === 'zh' ? '意图' : 'Intent'}
                {getSortIcon('intent')}
              </button>
            </th>
            <th className="p-3 text-right">
              <button
                onClick={() => onSort('volume')}
                className="flex items-center justify-end hover:text-emerald-500 transition-colors ml-auto"
              >
                {uiLanguage === 'zh' ? '搜索量' : 'Volume'}
                {getSortIcon('volume')}
              </button>
            </th>
            <th className="p-3 text-right">
              <button
                onClick={() => onSort('difficulty')}
                className="flex items-center justify-end hover:text-emerald-500 transition-colors ml-auto"
              >
                {uiLanguage === 'zh' ? '难度' : 'Difficulty'}
                {getSortIcon('difficulty')}
              </button>
            </th>
            <th className="p-3 text-left">
              <button
                onClick={() => onSort('probability')}
                className="flex items-center hover:text-emerald-500 transition-colors"
              >
                {uiLanguage === 'zh' ? '概率' : 'Probability'}
                {getSortIcon('probability')}
              </button>
            </th>
            <th className="p-3 text-left">{uiLanguage === 'zh' ? '来源项目' : 'Project'}</th>
            <th className="p-3 text-left">
              <button
                onClick={() => onSort('created_at')}
                className="flex items-center hover:text-emerald-500 transition-colors"
              >
                {uiLanguage === 'zh' ? '创建时间' : 'Created'}
                {getSortIcon('created_at')}
              </button>
            </th>
            <th className="p-3 text-center">{uiLanguage === 'zh' ? '操作' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((keyword) => {
            const isSelected = selectedIds.includes(keyword.id);
            const isHighProbability = keyword.probability === 'High';

            return (
              <tr
                key={keyword.id}
                className={cn(
                  'border-b transition-colors group',
                  isDarkTheme ? 'border-zinc-800 hover:bg-zinc-900/50' : 'border-gray-100 hover:bg-gray-50',
                  isHighProbability && 'border-l-4 border-l-emerald-500'
                )}
              >
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelectOne(keyword.id, e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900"
                  />
                </td>
                <td className={cn('p-3 font-medium', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                  <div className="max-w-[200px] truncate" title={keyword.keyword}>
                    {keyword.keyword}
                  </div>
                </td>
                <td className={cn('p-3 text-sm', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                  <div className="max-w-[150px] truncate" title={keyword.translation}>
                    {keyword.translation || '-'}
                  </div>
                </td>
                <td className="p-3">
                  <Badge className={cn('text-[10px] font-bold', getIntentColor(keyword.intent))}>
                    {keyword.intent}
                  </Badge>
                </td>
                <td className={cn('p-3 text-right font-medium', isDarkTheme ? 'text-zinc-300' : 'text-gray-700')}>
                  {keyword.volume ? keyword.volume.toLocaleString() : '-'}
                </td>
                <td className={cn('p-3 text-right font-medium', isDarkTheme ? 'text-zinc-300' : 'text-gray-700')}>
                  {keyword.difficulty || '-'}
                </td>
                <td className="p-3">
                  <Badge className={cn('text-[10px] font-bold border', getProbabilityColor(keyword.probability))}>
                    {keyword.probability}
                  </Badge>
                </td>
                <td className={cn('p-3 text-sm', isDarkTheme ? 'text-zinc-400' : 'text-gray-600')}>
                  <div className="max-w-[150px] truncate" title={keyword.project_name}>
                    {keyword.project_name || '-'}
                  </div>
                </td>
                <td className={cn('p-3 text-sm', isDarkTheme ? 'text-zinc-500' : 'text-gray-500')}>
                  {keyword.created_at ? formatTimeAgo(keyword.created_at) : '-'}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onGenerate(keyword)}
                      className={cn(
                        'h-7 px-2 text-xs font-medium',
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
                          'h-7 px-2 text-xs font-medium',
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
