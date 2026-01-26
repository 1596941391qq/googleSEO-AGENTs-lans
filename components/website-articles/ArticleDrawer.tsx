import React from 'react';
import { cn } from '../../lib/utils';
import { Article } from './types';
import { StatusBadge } from './StatusBadge';
import { IntentBadge } from './IntentBadge';
import { X, Calendar, Eye, Edit, ExternalLink, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '../ui/button';

interface ArticleDrawerProps {
  article: Article | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (article: Article) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const ArticleDrawer: React.FC<ArticleDrawerProps> = ({
  article,
  isOpen,
  onClose,
  onEdit,
  isDarkTheme,
  uiLanguage,
}) => {
  if (!article) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(uiLanguage === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full md:w-[600px] z-50 shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          isDarkTheme
            ? "bg-zinc-900 border-l border-zinc-800"
            : "bg-white border-l border-gray-200"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-6 py-4 border-b",
            isDarkTheme ? "border-zinc-800" : "border-gray-200"
          )}>
            <div className="flex items-center gap-3">
              <StatusBadge
                status={article.status}
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
              />
              <h2 className={cn(
                "text-lg font-bold",
                isDarkTheme ? "text-white" : "text-gray-900"
              )}>
                {uiLanguage === 'zh' ? '文章详情' : 'Article Details'}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn(
                "rounded-lg",
                isDarkTheme
                  ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
              )}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Title Section */}
            <div className="space-y-2">
              <label className={cn(
                "text-xs font-bold uppercase tracking-wider",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}>
                {uiLanguage === 'zh' ? '标题' : 'Title'}
              </label>
              <h3 className={cn(
                "text-xl font-bold",
                isDarkTheme ? "text-white" : "text-gray-900"
              )}>
                {article.title}
              </h3>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={cn(
                "p-4 rounded-xl border",
                isDarkTheme
                  ? "bg-zinc-800/30 border-zinc-800"
                  : "bg-gray-50 border-gray-200"
              )}>
                <div className={cn(
                  "text-xs font-bold uppercase tracking-wider mb-2",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '关键词' : 'Keyword'}
                </div>
                <div className={cn(
                  "text-sm font-bold",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}>
                  {article.keyword}
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-xl border",
                isDarkTheme
                  ? "bg-zinc-800/30 border-zinc-800"
                  : "bg-gray-50 border-gray-200"
              )}>
                <div className={cn(
                  "text-xs font-bold uppercase tracking-wider mb-2",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '内容类型' : 'Content Type'}
                </div>
                <IntentBadge
                  intent={article.intent}
                  isDarkTheme={isDarkTheme}
                  uiLanguage={uiLanguage}
                  size="md"
                />
              </div>

              <div className={cn(
                "p-4 rounded-xl border",
                isDarkTheme
                  ? "bg-zinc-800/30 border-zinc-800"
                  : "bg-gray-50 border-gray-200"
              )}>
                <div className={cn(
                  "text-xs font-bold uppercase tracking-wider mb-2",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? 'URL路径' : 'URL Path'}
                </div>
                <div className={cn(
                  "text-sm font-bold",
                  isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                )}>
                  {article.urlPath || '-'}
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-xl border",
                isDarkTheme
                  ? "bg-zinc-800/30 border-zinc-800"
                  : "bg-gray-50 border-gray-200"
              )}>
                <div className={cn(
                  "text-xs font-bold uppercase tracking-wider mb-2",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '发布平台' : 'Platform'}
                </div>
                <div className={cn(
                  "text-sm font-bold uppercase",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}>
                  {article.platform === 'none' ? '-' : article.platform.toUpperCase()}
                </div>
              </div>

              <div className={cn(
                "p-4 rounded-xl border",
                isDarkTheme
                  ? "bg-zinc-800/30 border-zinc-800"
                  : "bg-gray-50 border-gray-200"
              )}>
                <div className={cn(
                  "text-xs font-bold uppercase tracking-wider mb-2",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '排名' : 'Ranking'}
                </div>
                <div className={cn(
                  "text-sm font-bold",
                  article.ranking
                    ? (article.ranking <= 10
                      ? (isDarkTheme ? "text-emerald-400" : "text-emerald-600")
                      : (isDarkTheme ? "text-blue-400" : "text-blue-600"))
                    : (isDarkTheme ? "text-zinc-600" : "text-gray-400")
                )}>
                  {article.ranking ? `#${article.ranking}` : '-'}
                </div>
              </div>
            </div>

            {/* Stats */}
            {(article.traffic || article.ranking) && (
              <div className={cn(
                "p-4 rounded-xl border",
                isDarkTheme
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-emerald-50 border-emerald-200"
              )}>
                <div className="flex items-center gap-4">
                  {article.ranking && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className={cn(
                        "w-4 h-4",
                        isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                      )} />
                      <div>
                        <div className={cn(
                          "text-xs font-medium",
                          isDarkTheme ? "text-emerald-500/60" : "text-emerald-600/60"
                        )}>
                          {uiLanguage === 'zh' ? '排名' : 'Rank'}
                        </div>
                        <div className={cn(
                          "text-lg font-bold",
                          isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                        )}>
                          #{article.ranking}
                        </div>
                      </div>
                    </div>
                  )}
                  {article.traffic && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className={cn(
                        "w-4 h-4",
                        isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                      )} />
                      <div>
                        <div className={cn(
                          "text-xs font-medium",
                          isDarkTheme ? "text-emerald-500/60" : "text-emerald-600/60"
                        )}>
                          {uiLanguage === 'zh' ? '流量' : 'Traffic'}
                        </div>
                        <div className={cn(
                          "text-lg font-bold",
                          isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                        )}>
                          {article.traffic}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Meta Description */}
            {article.metaDescription && (
              <div className="space-y-2">
                <label className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? 'Meta描述' : 'Meta Description'}
                </label>
                <p className={cn(
                  "text-sm leading-relaxed",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}>
                  {article.metaDescription}
                </p>
              </div>
            )}

            {/* Content Preview */}
            {article.content && (
              <div className="space-y-2">
                <label className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '内容预览' : 'Content Preview'}
                </label>
                <div className={cn(
                  "p-4 rounded-xl border max-h-64 overflow-y-auto",
                  isDarkTheme
                    ? "bg-zinc-800/30 border-zinc-800 text-zinc-400"
                    : "bg-gray-50 border-gray-200 text-gray-600"
                )}>
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                    {article.content.substring(0, 500)}
                    {article.content.length > 500 && '...'}
                  </div>
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="space-y-3 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-xs">
                <Calendar className={cn(
                  "w-3.5 h-3.5",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )} />
                <span className={cn(
                  "font-medium",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '创建于' : 'Created'}:
                </span>
                <span className={cn(
                  "font-bold",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}>
                  {formatDate(article.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className={cn(
                  "w-3.5 h-3.5",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )} />
                <span className={cn(
                  "font-medium",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '更新于' : 'Updated'}:
                </span>
                <span className={cn(
                  "font-bold",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}>
                  {formatDate(article.updatedAt)}
                </span>
              </div>
              {article.publishedAt && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className={cn(
                    "w-3.5 h-3.5",
                    isDarkTheme ? "text-emerald-500" : "text-emerald-600"
                  )} />
                  <span className={cn(
                    "font-medium",
                    isDarkTheme ? "text-emerald-500" : "text-emerald-600"
                  )}>
                    {uiLanguage === 'zh' ? '发布于' : 'Published'}:
                  </span>
                  <span className={cn(
                    "font-bold",
                    isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                  )}>
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={cn(
            "flex items-center gap-3 px-6 py-4 border-t",
            isDarkTheme ? "border-zinc-800" : "border-gray-200"
          )}>
            {onEdit && (
              <Button
                onClick={() => onEdit(article)}
                className={cn(
                  "flex-1 font-bold",
                  isDarkTheme
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                <Edit className="w-4 h-4 mr-2" />
                {uiLanguage === 'zh' ? '编辑文章' : 'Edit Article'}
              </Button>
            )}
            {article.urlPath && article.platform !== 'none' && (
              <Button
                variant="outline"
                className={cn(
                  "flex-1 font-bold",
                  isDarkTheme
                    ? "border-zinc-700 hover:bg-zinc-800"
                    : "border-gray-300 hover:bg-gray-50"
                )}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {uiLanguage === 'zh' ? '查看发布' : 'View Live'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
