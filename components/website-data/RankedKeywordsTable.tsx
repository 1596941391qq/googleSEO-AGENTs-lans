import React, { useState, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { postWithAuth } from "../../lib/api-client";

interface RankedKeyword {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  positionChange: number;
  searchVolume: number;
  etv?: number; // 可选，使用 trafficPercentage 替代
  trafficPercentage?: number; // 从 keywords-only 接口获取
  url?: string;
  cpc?: number;
  competition?: number;
  difficulty?: number;
  serpFeatures?: Record<string, any>; // SERP特性数据
}

type SortField = 'difficulty' | 'searchVolume' | 'cpc' | 'position'; // 支持更多排序字段
type SortOrder = 'asc' | 'desc';

interface RankedKeywordsTableProps {
  websiteId: string;
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  limit?: number;
  region?: string;
}

export const RankedKeywordsTable: React.FC<RankedKeywordsTableProps> = ({
  websiteId,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
  limit = 100,
  region = "us",
}) => {
  const { user } = useAuth();
  const [keywords, setKeywords] = useState<RankedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('searchVolume'); // 默认按搜索量排序
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // 默认降序（搜索量最高的在前）

  // localStorage 缓存
  const getCacheKey = () => `keywords_only_${websiteId}_${region}_${sortBy}_${sortOrder}`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

  const getCachedData = (): RankedKeyword[] | null => {
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

  const setCachedData = (data: RankedKeyword[]) => {
    try {
      localStorage.setItem(getCacheKey(), JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('[RankedKeywords] Failed to cache data:', error);
    }
  };

  useEffect(() => {
    if (websiteId) {
      // 切换地区时，重置状态
      setKeywords([]);
      setLoading(true);
      
      // 先尝试从缓存加载
      const cached = getCachedData();
      if (cached && cached.length > 0) {
        setKeywords(cached);
        setLoading(false);
        return;
      }
      loadKeywords();
    }
  }, [websiteId, sortBy, sortOrder, region]);

  const loadKeywords = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await postWithAuth("/api/website-data/ranked-keywords", {
        websiteId,
        limit,
        sortBy,
        sortOrder,
        region,
      });

      if (response.ok) {
        const result = await response.json();
        const keywordsData = (result.data || []).map((kw: any) => ({
          ...kw,
          etv: kw.trafficPercentage || kw.etv || 0, // 使用 trafficPercentage 作为 etv
          url: kw.url || '', // 确保 url 字段存在
        }));
        setKeywords(keywordsData);
        // 保存到缓存
        if (keywordsData.length > 0) {
          setCachedData(keywordsData);
        }
      } else {
        setError(uiLanguage === "zh" ? "加载失败" : "Failed to load");
      }
    } catch (err: any) {
      setError(err.message || (uiLanguage === "zh" ? "加载出错" : "Error loading"));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // 如果点击的是当前排序字段，切换排序方向
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新字段，设置为该字段
      setSortBy(field);
      // 排名和搜索量默认降序，其他字段默认升序
      setSortOrder(field === 'position' || field === 'searchVolume' ? 'desc' : 'asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  // 移除 SERP 特性显示（keywords-only 接口不提供此数据）
  // 如果需要，可以从其他数据源获取

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
            {uiLanguage === "zh" ? "排名关键词" : "Ranked Keywords"}
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
            {uiLanguage === "zh" ? "排名关键词" : "Ranked Keywords"}
          </CardTitle>
          <Badge variant="outline" className={cn(
            "text-xs",
            isDarkTheme ? "border-zinc-700 text-zinc-400" : "border-gray-300 text-gray-500"
          )}>
            {keywords.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={cn(
                "border-b",
                isDarkTheme ? "border-zinc-800" : "border-gray-200"
              )}>
                <th className={cn(
                  "text-left py-2 px-3 text-xs font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh" ? "关键词" : "Keyword"}
                </th>
                <th className={cn(
                  "text-center py-2 px-3 text-xs font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh" ? "排名" : "Position"}
                </th>
                <th className={cn(
                  "text-center py-2 px-3 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )} onClick={() => handleSort('searchVolume')}>
                  <div className="flex items-center justify-center">
                    {uiLanguage === "zh" ? "搜索量" : "Volume"}
                    {getSortIcon('searchVolume')}
                  </div>
                </th>
                <th className={cn(
                  "text-center py-2 px-3 text-xs font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  CPC
                </th>
                <th className={cn(
                  "text-center py-2 px-3 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )} onClick={() => handleSort('difficulty')}>
                  <div className="flex items-center justify-center">
                    {uiLanguage === "zh" ? "难度" : "Difficulty"}
                    {getSortIcon('difficulty')}
                  </div>
                </th>
                <th className={cn(
                  "text-center py-2 px-3 text-xs font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  ETV
                </th>
                <th className={cn(
                  "text-center py-2 px-3 text-xs font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh" ? "SERP特性" : "SERP Features"}
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cn(
                    "text-center py-8 text-sm",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}>
                    {uiLanguage === "zh" ? "暂无数据" : "No data available"}
                  </td>
                </tr>
              ) : (
                keywords.map((kw, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "border-b",
                      isDarkTheme ? "border-zinc-800 hover:bg-zinc-800/50" : "border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          isDarkTheme ? "text-white" : "text-gray-900"
                        )}>
                          {kw.keyword}
                        </span>
                        {kw.url && (
                          <a
                            href={kw.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "opacity-60 hover:opacity-100",
                              isDarkTheme ? "text-zinc-400" : "text-gray-500"
                            )}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}>
                      <span className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold",
                        kw.currentPosition <= 3
                          ? "bg-emerald-500 text-white"
                          : kw.currentPosition <= 10
                          ? "bg-blue-500 text-white"
                          : kw.currentPosition <= 50
                          ? "bg-amber-500 text-white"
                          : "bg-gray-500 text-white"
                      )}>
                        {kw.currentPosition || "-"}
                      </span>
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}>
                      {kw.searchVolume?.toLocaleString() || "-"}
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}>
                      {kw.cpc !== undefined && kw.cpc !== null 
                        ? `$${Number(kw.cpc).toFixed(2)}` 
                        : "-"}
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}>
                      {kw.difficulty !== undefined && kw.difficulty !== null ? kw.difficulty : "-"}
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm font-medium",
                      isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                    )}>
                      {(kw.etv || kw.trafficPercentage) ? Number(kw.etv || kw.trafficPercentage).toLocaleString() : "-"}
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}>
                      {kw.serpFeatures && typeof kw.serpFeatures === 'object' && Object.keys(kw.serpFeatures).length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                          {Object.entries(kw.serpFeatures).map(([key, value]: [string, any]) => 
                            value ? (
                              <Badge key={key} variant="outline" className={cn(
                                "text-xs",
                                isDarkTheme ? "border-zinc-700 text-zinc-400" : "border-gray-300 text-gray-500"
                              )}>
                                {key}
                              </Badge>
                            ) : null
                          )}
                        </div>
                      ) : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
