import React, { useState, useEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink,
  Sparkles,
  FileText,
  HelpCircle,
  Video,
  Image,
  Loader2,
  ArrowUpDown,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface RankedKeyword {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  positionChange: number;
  searchVolume: number;
  etv: number;
  serpFeatures: {
    aiOverview?: boolean;
    featuredSnippet?: boolean;
    peopleAlsoAsk?: boolean;
    relatedQuestions?: boolean;
    video?: boolean;
    image?: boolean;
  };
  url: string;
  cpc?: number;
  competition?: number;
  difficulty?: number;
}

type SortField = 'position' | 'cpc' | 'difficulty' | 'searchVolume';
type SortOrder = 'asc' | 'desc';

interface RankedKeywordsTableProps {
  websiteId: string;
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  limit?: number;
}

export const RankedKeywordsTable: React.FC<RankedKeywordsTableProps> = ({
  websiteId,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
  limit = 100,
}) => {
  const [keywords, setKeywords] = useState<RankedKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('position');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    if (websiteId) {
      loadKeywords();
    }
  }, [websiteId, sortBy, sortOrder]);

  const loadKeywords = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/website-data/ranked-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: 1,
          limit,
          sortBy,
          sortOrder,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setKeywords(result.data || []);
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
      // 如果点击的是新字段，设置为该字段并默认升序
      setSortBy(field);
      setSortOrder('asc');
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

  const getSerpFeatureBadges = (features: RankedKeyword["serpFeatures"]) => {
    const badges = [];
    if (features.aiOverview) {
      badges.push(
        <Badge
          key="ai"
          className={cn(
            "text-xs mr-1",
            isDarkTheme
              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
              : "bg-purple-100 text-purple-700 border-purple-200"
          )}
        >
          <Sparkles className="w-3 h-3 mr-1" />
          AI
        </Badge>
      );
    }
    if (features.featuredSnippet) {
      badges.push(
        <Badge
          key="snippet"
          className={cn(
            "text-xs mr-1",
            isDarkTheme
              ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
              : "bg-blue-100 text-blue-700 border-blue-200"
          )}
        >
          <FileText className="w-3 h-3 mr-1" />
          {uiLanguage === "zh" ? "摘要" : "Snippet"}
        </Badge>
      );
    }
    if (features.peopleAlsoAsk) {
      badges.push(
        <Badge
          key="paa"
          className={cn(
            "text-xs mr-1",
            isDarkTheme
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-green-100 text-green-700 border-green-200"
          )}
        >
          <HelpCircle className="w-3 h-3 mr-1" />
          PAA
        </Badge>
      );
    }
    if (features.video) {
      badges.push(
        <Badge
          key="video"
          className={cn(
            "text-xs mr-1",
            isDarkTheme
              ? "bg-red-500/20 text-red-400 border-red-500/30"
              : "bg-red-100 text-red-700 border-red-200"
          )}
        >
          <Video className="w-3 h-3 mr-1" />
          {uiLanguage === "zh" ? "视频" : "Video"}
        </Badge>
      );
    }
    if (features.image) {
      badges.push(
        <Badge
          key="image"
          className={cn(
            "text-xs mr-1",
            isDarkTheme
              ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              : "bg-yellow-100 text-yellow-700 border-yellow-200"
          )}
        >
          <Image className="w-3 h-3 mr-1" />
          {uiLanguage === "zh" ? "图片" : "Image"}
        </Badge>
      );
    }
    return badges;
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
                  "text-center py-2 px-3 text-xs font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh" ? "搜索量" : "Volume"}
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
                <th className={cn(
                  "text-center py-2 px-3 text-xs font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh" ? "变化" : "Change"}
                </th>
              </tr>
            </thead>
            <tbody>
              {keywords.length === 0 ? (
                <tr>
                  <td colSpan={5} className={cn(
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
                    <td className="py-3 px-3 text-center">
                      <span className={cn(
                        "text-sm font-semibold",
                        isDarkTheme ? "text-white" : "text-gray-900"
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
                      {kw.cpc ? `$${kw.cpc.toFixed(2)}` : "-"}
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}>
                      {kw.difficulty !== undefined ? kw.difficulty : "-"}
                    </td>
                    <td className={cn(
                      "py-3 px-3 text-center text-sm font-medium",
                      isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                    )}>
                      {kw.etv?.toLocaleString() || "-"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center flex-wrap gap-1">
                        {getSerpFeatureBadges(kw.serpFeatures)}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {kw.positionChange !== 0 ? (
                        <span className={cn(
                          "flex items-center justify-center text-xs",
                          kw.positionChange > 0
                            ? "text-emerald-500"
                            : kw.positionChange < 0
                            ? "text-red-500"
                            : "text-gray-500"
                        )}>
                          {kw.positionChange > 0 ? (
                            <ArrowUp className="w-3 h-3 mr-1" />
                          ) : kw.positionChange < 0 ? (
                            <ArrowDown className="w-3 h-3 mr-1" />
                          ) : (
                            <Minus className="w-3 h-3 mr-1" />
                          )}
                          {Math.abs(kw.positionChange)}
                        </span>
                      ) : (
                        <span className={cn(
                          "text-xs",
                          isDarkTheme ? "text-zinc-500" : "text-gray-400"
                        )}>
                          —
                        </span>
                      )}
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
