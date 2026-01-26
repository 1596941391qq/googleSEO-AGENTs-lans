import React from 'react';
import { cn } from '../../lib/utils';
import { Website } from './types';
import { Globe, ChevronDown, BarChart3, FileText, TrendingUp } from 'lucide-react';

interface WebsiteSelectorProps {
  selectedWebsite: Website | null;
  websites: Website[];
  onSelectWebsite: (website: Website) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const WebsiteSelector: React.FC<WebsiteSelectorProps> = ({
  selectedWebsite,
  websites,
  onSelectWebsite,
  isDarkTheme,
  uiLanguage,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!selectedWebsite) return null;

  return (
    <div className={cn(
      "sticky top-0 z-10 backdrop-blur-sm border-b transition-all duration-300",
      isDarkTheme
        ? "bg-zinc-900/80 border-zinc-800"
        : "bg-white/80 border-gray-200"
    )}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Website Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-300",
                "hover:scale-[1.02] active:scale-[0.98]",
                isDarkTheme
                  ? "bg-zinc-800/50 border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-800"
                  : "bg-gray-50 border-gray-200 hover:border-emerald-500/50 hover:bg-white"
              )}
            >
              <div className={cn(
                "p-2 rounded-lg",
                isDarkTheme ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-600"
              )}>
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start">
                <span className={cn(
                  "text-sm font-bold",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}>
                  {selectedWebsite.domain}
                </span>
                <span className={cn(
                  "text-[10px] font-medium",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {selectedWebsite.url}
                </span>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 transition-transform duration-300",
                isOpen && "rotate-180",
                isDarkTheme ? "text-zinc-400" : "text-gray-400"
              )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsOpen(false)}
                />
                <div className={cn(
                  "absolute top-full left-0 mt-2 w-80 rounded-xl border shadow-2xl overflow-hidden z-20",
                  "animate-in fade-in slide-in-from-top-2 duration-200",
                  isDarkTheme
                    ? "bg-zinc-900 border-zinc-800"
                    : "bg-white border-gray-200"
                )}>
                  <div className="max-h-96 overflow-y-auto">
                    {websites.map((website) => (
                      <button
                        key={website.id}
                        onClick={() => {
                          onSelectWebsite(website);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-3 flex items-center gap-3 transition-all duration-200",
                          "hover:scale-[1.01] active:scale-[0.99]",
                          website.id === selectedWebsite.id
                            ? (isDarkTheme
                              ? "bg-emerald-500/10 border-l-2 border-emerald-500"
                              : "bg-emerald-50 border-l-2 border-emerald-600")
                            : (isDarkTheme
                              ? "hover:bg-zinc-800/50"
                              : "hover:bg-gray-50")
                        )}
                      >
                        <Globe className={cn(
                          "w-4 h-4",
                          website.id === selectedWebsite.id
                            ? "text-emerald-500"
                            : (isDarkTheme ? "text-zinc-500" : "text-gray-400")
                        )} />
                        <div className="flex-1 text-left">
                          <div className={cn(
                            "text-sm font-bold",
                            isDarkTheme ? "text-white" : "text-gray-900"
                          )}>
                            {website.domain}
                          </div>
                          <div className={cn(
                            "text-[10px] font-medium",
                            isDarkTheme ? "text-zinc-500" : "text-gray-500"
                          )}>
                            {website.totalArticles} {uiLanguage === 'zh' ? '篇文章' : 'articles'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats Cards */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border",
              isDarkTheme
                ? "bg-zinc-800/30 border-zinc-800"
                : "bg-gray-50 border-gray-200"
            )}>
              <FileText className={cn(
                "w-4 h-4",
                isDarkTheme ? "text-blue-400" : "text-blue-600"
              )} />
              <div className="flex flex-col">
                <span className={cn(
                  "text-lg font-bold leading-none",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}>
                  {selectedWebsite.totalArticles}
                </span>
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}>
                  {uiLanguage === 'zh' ? '文章' : 'Articles'}
                </span>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border",
              isDarkTheme
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-emerald-50 border-emerald-200"
            )}>
              <BarChart3 className={cn(
                "w-4 h-4",
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )} />
              <div className="flex flex-col">
                <span className={cn(
                  "text-lg font-bold leading-none",
                  isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                )}>
                  {selectedWebsite.publishedCount}
                </span>
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  isDarkTheme ? "text-emerald-500/60" : "text-emerald-600/60"
                )}>
                  {uiLanguage === 'zh' ? '已发布' : 'Published'}
                </span>
              </div>
            </div>

            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border",
              isDarkTheme
                ? "bg-violet-500/5 border-violet-500/20"
                : "bg-violet-50 border-violet-200"
            )}>
              <TrendingUp className={cn(
                "w-4 h-4",
                isDarkTheme ? "text-violet-400" : "text-violet-600"
              )} />
              <div className="flex flex-col">
                <span className={cn(
                  "text-lg font-bold leading-none",
                  isDarkTheme ? "text-violet-400" : "text-violet-600"
                )}>
                  {selectedWebsite.rankingCount}
                </span>
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  isDarkTheme ? "text-violet-500/60" : "text-violet-600/60"
                )}>
                  {uiLanguage === 'zh' ? '排名中' : 'Ranking'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
