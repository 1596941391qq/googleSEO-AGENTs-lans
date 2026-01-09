import React, { useState, useEffect } from "react";
import { ExternalLink, Loader2, TrendingUp, FileText, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { getUserId } from "./utils";

interface RelevantPage {
  url: string;
  organicTraffic: number;
  keywordsCount: number;
  avgPosition: number;
  topKeywords: Array<{
    keyword: string;
    position: number;
    searchVolume: number;
  }>;
  title?: string;
  description?: string;
  pageType?: string;
}

interface RelevantPagesTableProps {
  websiteId: string;
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  limit?: number;
  region?: string;
}

export const RelevantPagesTable: React.FC<RelevantPagesTableProps> = ({
  websiteId,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
  limit = 20,
  region = "us",
}) => {
  const { user } = useAuth();
  const [pages, setPages] = useState<RelevantPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // localStorage 缓存
  const getCacheKey = () => `relevant_pages_${websiteId}_${region}`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

  const getCachedData = (): RelevantPage[] | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(getCacheKey());
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  const setCachedData = (data: RelevantPage[]) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('[RelevantPages] Failed to cache data:', error);
    }
  };

  useEffect(() => {
    if (websiteId) {
      // 先尝试从缓存加载
      const cached = getCachedData();
      if (cached && cached.length > 0) {
        setPages(cached);
        setLoading(false);
        return;
      }
      loadPages();
    }
  }, [websiteId]);

  const loadPages = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/website-data/relevant-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: getUserId(user),
          limit,
          region,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPages(result.data || []);
      } else {
        setError(uiLanguage === "zh" ? "加载失败" : "Failed to load");
      }
    } catch (err: any) {
      setError(err.message || (uiLanguage === "zh" ? "加载出错" : "Error loading"));
    } finally {
      setLoading(false);
    }
  };

  if (loading || isLoading) {
    return (
      <Card
        className={cn(
          isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn(
              "text-lg",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "相关页面" : "Relevant Pages"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn(
          isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
        )}
      >
        <CardContent className="pt-6">
          <p className={cn("text-sm text-center", isDarkTheme ? "text-red-400" : "text-red-600")}>
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              "text-lg",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "相关页面" : "Relevant Pages"}
          </CardTitle>
          <Badge variant="outline" className={cn(
            "text-xs",
            isDarkTheme ? "border-zinc-700 text-zinc-400" : "border-gray-300 text-gray-500"
          )}>
            {pages.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pages.length === 0 ? (
            <p className={cn(
              "text-center py-8 text-sm",
              isDarkTheme ? "text-zinc-500" : "text-gray-500"
            )}>
              {uiLanguage === "zh" ? "暂无数据" : "No data available"}
            </p>
          ) : (
            pages.map((page, index) => (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border",
                  isDarkTheme
                    ? "bg-zinc-800/50 border-zinc-700"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <Globe className={cn(
                        "w-4 h-4 mt-0.5 flex-shrink-0",
                        isDarkTheme ? "text-zinc-500" : "text-gray-400"
                      )} />
                      <div className="flex-1 min-w-0">
                        {page.title ? (
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "text-sm font-semibold hover:underline block mb-1",
                              isDarkTheme ? "text-blue-400" : "text-blue-600"
                            )}
                          >
                            {page.title}
                          </a>
                        ) : null}
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            "text-xs hover:underline flex items-center gap-1 break-all",
                            isDarkTheme ? "text-zinc-400" : "text-gray-600"
                          )}
                        >
                          {page.url}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                        {page.description && (
                          <p className={cn(
                            "text-xs mt-2 line-clamp-2",
                            isDarkTheme ? "text-zinc-500" : "text-gray-500"
                          )}>
                            {page.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <div className={cn(
                      "text-xs mb-1 flex items-center gap-1",
                      isDarkTheme ? "text-zinc-400" : "text-gray-500"
                    )}>
                      <TrendingUp className="w-3 h-3" />
                      {uiLanguage === "zh" ? "自然流量" : "Organic Traffic"}
                    </div>
                    <div className={cn(
                      "text-lg font-semibold",
                      isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                    )}>
                      {page.organicTraffic?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div>
                    <div className={cn(
                      "text-xs mb-1 flex items-center gap-1",
                      isDarkTheme ? "text-zinc-400" : "text-gray-500"
                    )}>
                      <FileText className="w-3 h-3" />
                      {uiLanguage === "zh" ? "关键词数" : "Keywords"}
                    </div>
                    <div className={cn(
                      "text-lg font-semibold",
                      isDarkTheme ? "text-white" : "text-gray-900"
                    )}>
                      {page.keywordsCount || 0}
                    </div>
                  </div>
                  <div>
                    <div className={cn(
                      "text-xs mb-1",
                      isDarkTheme ? "text-zinc-400" : "text-gray-500"
                    )}>
                      {uiLanguage === "zh" ? "平均排名" : "Avg Position"}
                    </div>
                    <div className={cn(
                      "text-lg font-semibold",
                      isDarkTheme ? "text-white" : "text-gray-900"
                    )}>
                      {page.avgPosition ? (
                        <span className={cn(
                          page.avgPosition <= 10 ? (isDarkTheme ? "text-emerald-400" : "text-emerald-600") :
                          page.avgPosition <= 30 ? (isDarkTheme ? "text-amber-400" : "text-amber-600") :
                          isDarkTheme ? "text-zinc-400" : "text-gray-500"
                        )}>
                          {page.avgPosition.toFixed(1)}
                        </span>
                      ) : "-"}
                    </div>
                  </div>
                </div>
                {page.topKeywords && page.topKeywords.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <div className={cn(
                      "text-xs mb-2",
                      isDarkTheme ? "text-zinc-400" : "text-gray-500"
                    )}>
                      {uiLanguage === "zh" ? "主要关键词" : "Top Keywords"}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {page.topKeywords.slice(0, 5).map((kw, kwIndex) => (
                        <Badge
                          key={kwIndex}
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isDarkTheme
                              ? "border-zinc-600 text-zinc-300"
                              : "border-gray-300 text-gray-700"
                          )}
                        >
                          {kw.keyword} (#{kw.position})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
