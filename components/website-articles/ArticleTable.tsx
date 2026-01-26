import React from 'react';
import { cn } from '../../lib/utils';
import { Article, SortField, SortOrder } from './types';
import { ArticleRow } from './ArticleRow';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface ArticleTableProps {
  articles: Article[];
  selectedArticles: string[];
  onSelectArticle: (id: string) => void;
  onSelectAll: () => void;
  onViewArticle: (article: Article) => void;
  onEditArticle?: (article: Article) => void;
  onDeleteArticle?: (article: Article) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const ArticleTable: React.FC<ArticleTableProps> = ({
  articles,
  selectedArticles,
  onSelectArticle,
  onSelectAll,
  onViewArticle,
  onEditArticle,
  onDeleteArticle,
  sortBy,
  sortOrder,
  onSort,
  isDarkTheme,
  uiLanguage,
}) => {
  const allSelected = articles.length > 0 && selectedArticles.length === articles.length;
  const someSelected = selectedArticles.length > 0 && !allSelected;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
    }
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5" />
      : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const headers = [
    { key: 'select', label: '', width: 'w-10', sortable: false },
    { key: 'status', label: uiLanguage === 'zh' ? '状态' : 'Status', width: 'w-24', sortable: true, field: 'status' as SortField },
    { key: 'title', label: uiLanguage === 'zh' ? '标题' : 'Title', width: 'flex-1', sortable: true, field: 'title' as SortField },
    { key: 'keyword', label: uiLanguage === 'zh' ? '关键词' : 'Keyword', width: 'w-32', sortable: false },
    { key: 'intent', label: uiLanguage === 'zh' ? '意图' : 'Intent', width: 'w-16', sortable: false },
    { key: 'urlPath', label: uiLanguage === 'zh' ? 'URL路径' : 'URL Path', width: 'w-24', sortable: false },
    { key: 'platform', label: uiLanguage === 'zh' ? '平台' : 'Platform', width: 'w-16', sortable: false },
    { key: 'ranking', label: uiLanguage === 'zh' ? '排名' : 'Rank', width: 'w-20', sortable: true, field: 'ranking' as SortField },
    { key: 'actions', label: '', width: 'w-10', sortable: false },
  ];

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      isDarkTheme
        ? "bg-zinc-900/50 border-zinc-800"
        : "bg-white border-gray-200"
    )}>
      {/* Table Header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 border-b",
        isDarkTheme
          ? "bg-zinc-900/80 border-zinc-800"
          : "bg-gray-50 border-gray-200"
      )}>
        {headers.map((header) => (
          <div
            key={header.key}
            className={cn(
              "flex items-center gap-2",
              header.width,
              header.key === 'select' && "flex-shrink-0"
            )}
          >
            {header.key === 'select' ? (
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={onSelectAll}
                className={cn(
                  "w-4 h-4 rounded border-2 transition-all duration-200 cursor-pointer",
                  "focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0",
                  isDarkTheme
                    ? "bg-zinc-900 border-zinc-700 checked:bg-emerald-500 checked:border-emerald-500"
                    : "bg-white border-gray-300 checked:bg-emerald-600 checked:border-emerald-600"
                )}
              />
            ) : header.sortable && header.field ? (
              <button
                onClick={() => onSort(header.field!)}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors",
                  "hover:text-emerald-500",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}
              >
                {header.label}
                <SortIcon field={header.field} />
              </button>
            ) : (
              <span className={cn(
                "text-xs font-bold uppercase tracking-wider",
                isDarkTheme ? "text-zinc-400" : "text-gray-600"
              )}>
                {header.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div className="divide-y divide-zinc-800/50">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className={cn(
              "text-sm font-medium",
              isDarkTheme ? "text-zinc-500" : "text-gray-500"
            )}>
              {uiLanguage === 'zh' ? '暂无文章' : 'No articles yet'}
            </div>
          </div>
        ) : (
          articles.map((article) => (
            <ArticleRow
              key={article.id}
              article={article}
              isSelected={selectedArticles.includes(article.id)}
              onSelect={onSelectArticle}
              onView={onViewArticle}
              onEdit={onEditArticle}
              onDelete={onDeleteArticle}
              isDarkTheme={isDarkTheme}
              uiLanguage={uiLanguage}
            />
          ))
        )}
      </div>
    </div>
  );
};
