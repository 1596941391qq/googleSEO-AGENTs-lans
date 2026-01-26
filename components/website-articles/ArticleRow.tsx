import React from 'react';
import { cn } from '../../lib/utils';
import { Article, PublishPlatform } from './types';
import { StatusBadge } from './StatusBadge';
import { IntentBadge } from './IntentBadge';
import { MoreVertical, Eye, Edit, Trash2, ExternalLink } from 'lucide-react';

interface ArticleRowProps {
  article: Article;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (article: Article) => void;
  onEdit?: (article: Article) => void;
  onDelete?: (article: Article) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const ArticleRow: React.FC<ArticleRowProps> = ({
  article,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  isDarkTheme,
  uiLanguage,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  const getPlatformBadge = (platform: PublishPlatform) => {
    const configs = {
      rtd: { label: 'RTD', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      github: { label: 'GH', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
      gitlab: { label: 'GL', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
      cloudflare: { label: 'CF', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      netlify: { label: 'NTL', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
      vercel: { label: 'VCL', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' },
      none: { label: '-', color: 'bg-zinc-800/30 text-zinc-600 border-zinc-800' },
    };
    return configs[platform] || configs.none;
  };

  const platformConfig = getPlatformBadge(article.platform);

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 border-b transition-all duration-200",
        "hover:scale-[1.005] hover:z-10",
        isDarkTheme
          ? "border-zinc-800/50 hover:bg-zinc-800/30 hover:border-emerald-500/20"
          : "border-gray-100 hover:bg-gray-50 hover:border-emerald-500/20",
        isSelected && (isDarkTheme
          ? "bg-emerald-500/5 border-emerald-500/30"
          : "bg-emerald-50 border-emerald-200")
      )}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(article.id)}
          className={cn(
            "w-4 h-4 rounded border-2 transition-all duration-200 cursor-pointer",
            "focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0",
            isDarkTheme
              ? "bg-zinc-900 border-zinc-700 checked:bg-emerald-500 checked:border-emerald-500"
              : "bg-white border-gray-300 checked:bg-emerald-600 checked:border-emerald-600"
          )}
        />
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        <StatusBadge
          status={article.status}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          size="sm"
        />
      </div>

      {/* Title - Clickable */}
      <button
        onClick={() => onView(article)}
        className={cn(
          "flex-1 min-w-0 text-left group/title",
          "transition-all duration-200"
        )}
      >
        <div className={cn(
          "text-sm font-bold truncate transition-colors duration-200",
          "group-hover/title:text-emerald-500",
          isDarkTheme ? "text-white" : "text-gray-900"
        )}>
          {article.title}
        </div>
      </button>

      {/* Keyword */}
      <div className="w-32 flex-shrink-0">
        <div className={cn(
          "text-xs font-medium truncate px-2 py-1 rounded-md",
          isDarkTheme
            ? "bg-zinc-800/50 text-zinc-400"
            : "bg-gray-100 text-gray-600"
        )} title={article.keyword}>
          {article.keyword}
        </div>
      </div>

      {/* Intent */}
      <div className="w-16 flex-shrink-0">
        <IntentBadge
          intent={article.intent}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          size="sm"
        />
      </div>

      {/* URL Path */}
      <div className="w-24 flex-shrink-0">
        <div className={cn(
          "text-xs font-bold px-2 py-1 rounded-md border text-center",
          article.urlPath.startsWith('/lab/')
            ? (isDarkTheme ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-200")
            : article.urlPath.startsWith('/guide/')
            ? (isDarkTheme ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-600 border-blue-200")
            : article.urlPath.startsWith('/tool/')
            ? (isDarkTheme ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-purple-50 text-purple-600 border-purple-200")
            : article.urlPath.startsWith('/compare/')
            ? (isDarkTheme ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-green-50 text-green-600 border-green-200")
            : (isDarkTheme ? "bg-zinc-800/30 text-zinc-500 border-zinc-800" : "bg-gray-100 text-gray-500 border-gray-200")
        )}>
          {article.urlPath || '-'}
        </div>
      </div>

      {/* Platform */}
      <div className="w-16 flex-shrink-0">
        <div className={cn(
          "text-[10px] font-bold px-2 py-1 rounded-md border text-center",
          isDarkTheme ? platformConfig.color : platformConfig.color
        )}>
          {platformConfig.label}
        </div>
      </div>

      {/* Ranking */}
      <div className="w-20 flex-shrink-0 text-center">
        {article.ranking ? (
          <div className={cn(
            "inline-flex items-center gap-1 text-sm font-bold",
            article.ranking <= 10
              ? (isDarkTheme ? "text-emerald-400" : "text-emerald-600")
              : article.ranking <= 50
              ? (isDarkTheme ? "text-blue-400" : "text-blue-600")
              : (isDarkTheme ? "text-zinc-500" : "text-gray-500")
          )}>
            #{article.ranking}
          </div>
        ) : (
          <span className={cn(
            "text-xs font-medium",
            isDarkTheme ? "text-zinc-600" : "text-gray-400"
          )}>-</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 relative">
        <button
          onClick={() => setShowActions(!showActions)}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-200",
            "opacity-0 group-hover:opacity-100",
            isDarkTheme
              ? "hover:bg-zinc-700 text-zinc-400 hover:text-white"
              : "hover:bg-gray-200 text-gray-500 hover:text-gray-900"
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Actions Dropdown */}
        {showActions && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowActions(false)}
            />
            <div className={cn(
              "absolute right-0 top-full mt-1 w-40 rounded-lg border shadow-xl overflow-hidden z-20",
              "animate-in fade-in slide-in-from-top-1 duration-150",
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800"
                : "bg-white border-gray-200"
            )}>
              <button
                onClick={() => {
                  onView(article);
                  setShowActions(false);
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium transition-colors",
                  isDarkTheme
                    ? "hover:bg-zinc-800 text-zinc-300"
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                {uiLanguage === 'zh' ? '查看' : 'View'}
              </button>
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit(article);
                    setShowActions(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium transition-colors",
                    isDarkTheme
                      ? "hover:bg-zinc-800 text-zinc-300"
                      : "hover:bg-gray-50 text-gray-700"
                  )}
                >
                  <Edit className="w-3.5 h-3.5" />
                  {uiLanguage === 'zh' ? '编辑' : 'Edit'}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete(article);
                    setShowActions(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium transition-colors",
                    isDarkTheme
                      ? "hover:bg-red-500/10 text-red-400"
                      : "hover:bg-red-50 text-red-600"
                  )}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {uiLanguage === 'zh' ? '删除' : 'Delete'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
