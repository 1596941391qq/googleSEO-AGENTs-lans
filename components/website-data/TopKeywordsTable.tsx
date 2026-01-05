import React from "react";
import {
  ArrowUp,
  ArrowDown,
  Minus,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface DomainKeyword {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  positionChange: number;
  searchVolume: number;
  cpc: number;
  competition: number;
  difficulty: number;
  trafficPercentage: number;
}

interface TopKeywordsTableProps {
  keywords: DomainKeyword[];
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  websiteId?: string;
  totalKeywordsCount?: number;
  onViewAll?: () => void; // 跳转到排名关键词页面的回调
}

export const TopKeywordsTable: React.FC<TopKeywordsTableProps> = ({
  keywords,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
  websiteId,
  totalKeywordsCount,
  onViewAll,
}) => {
  const [allKeywords, setAllKeywords] =
    React.useState<DomainKeyword[]>(keywords);
  const [showAll, setShowAll] = React.useState(false);

  const hasMore = totalKeywordsCount && totalKeywordsCount > 20;
  const displayedKeywords = showAll ? allKeywords : allKeywords.slice(0, 20);

  const handleViewAll = () => {
    if (onViewAll) {
      // 跳转到排名关键词页面
      onViewAll();
    }
  };

  // 当 keywords prop 变化时，更新 state
  React.useEffect(() => {
    setAllKeywords(keywords);
    setShowAll(false);
  }, [keywords]);
  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPositionChangeIcon = (change: number) => {
    if (change > 0) {
      return <ArrowUp className="w-4 h-4 text-emerald-500" />;
    } else if (change < 0) {
      return <ArrowDown className="w-4 h-4 text-red-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 30)
      return "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
    if (difficulty <= 60)
      return "text-amber-500 bg-amber-50 dark:bg-amber-500/10";
    return "text-red-500 bg-red-50 dark:bg-red-500/10";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 30) return uiLanguage === "zh" ? "简单" : "Easy";
    if (difficulty <= 60) return uiLanguage === "zh" ? "中等" : "Medium";
    return uiLanguage === "zh" ? "困难" : "Hard";
  };

  return (
    <Card
      className={cn(
        "col-span-1 lg:col-span-2",
        isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              "text-base font-semibold",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "Top 关键词" : "Top Keywords"}
            {totalKeywordsCount && (
              <span
                className={cn(
                  "ml-2 text-xs font-normal",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}
              >
                ({totalKeywordsCount})
              </span>
            )}
          </CardTitle>
          {hasMore && !showAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewAll}
            >
              {uiLanguage === "zh"
                ? `查看全部 (${totalKeywordsCount! - 20})`
                : `View All (${totalKeywordsCount! - 20})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2
              className={cn(
                "w-6 h-6 animate-spin",
                isDarkTheme ? "text-emerald-400" : "text-emerald-500"
              )}
            />
            <span
              className={cn(
                "ml-2 text-sm",
                isDarkTheme ? "text-zinc-400" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "加载中..." : "Loading..."}
            </span>
          </div>
        ) : keywords.length === 0 ? (
          <div
            className={cn(
              "text-center py-8 text-sm",
              isDarkTheme ? "text-zinc-500" : "text-gray-500"
            )}
          >
            {uiLanguage === "zh"
              ? "暂无数据 - 请先更新网站指标"
              : "No data yet - Please update metrics first"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={cn(
                    "border-b text-xs uppercase",
                    isDarkTheme
                      ? "border-zinc-800 text-zinc-400"
                      : "border-gray-200 text-gray-500"
                  )}
                >
                  <th className="pb-3 text-left font-medium">
                    {uiLanguage === "zh" ? "关键词" : "Keyword"}
                  </th>
                  <th className="pb-3 text-center font-medium">
                    {uiLanguage === "zh" ? "排名" : "Position"}
                  </th>
                  <th className="pb-3 text-center font-medium">
                    {uiLanguage === "zh" ? "变化" : "Change"}
                  </th>
                  <th className="pb-3 text-right font-medium">
                    {uiLanguage === "zh" ? "搜索量" : "Volume"}
                  </th>
                  <th className="pb-3 text-right font-medium">
                    {uiLanguage === "zh" ? "CPC" : "CPC"}
                  </th>
                  <th className="pb-3 text-center font-medium">
                    {uiLanguage === "zh" ? "难度" : "Difficulty"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedKeywords.map((kw, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "border-b text-sm",
                      isDarkTheme
                        ? "border-zinc-800 hover:bg-zinc-800/50"
                        : "border-gray-100 hover:bg-gray-50"
                    )}
                  >
                    <td className="py-3 pr-2">
                      <div
                        className={cn(
                          "font-medium",
                          isDarkTheme ? "text-white" : "text-gray-900"
                        )}
                        title={kw.keyword}
                      >
                        {kw.keyword || (
                          <span
                            className={cn(
                              "text-xs italic",
                              isDarkTheme ? "text-zinc-500" : "text-gray-400"
                            )}
                          >
                            {uiLanguage === "zh" ? "无关键词" : "No keyword"}
                          </span>
                        )}
                      </div>
                      {kw.keyword && (
                        <div
                          className={cn(
                            "text-xs mt-0.5",
                            isDarkTheme ? "text-zinc-500" : "text-gray-500"
                          )}
                        >
                          CPC: $
                          {typeof kw.cpc === "number"
                            ? kw.cpc.toFixed(2)
                            : (Number(kw.cpc) || 0).toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold",
                          kw.currentPosition <= 3
                            ? "bg-emerald-500 text-white"
                            : kw.currentPosition <= 10
                            ? "bg-blue-500 text-white"
                            : kw.currentPosition <= 50
                            ? "bg-amber-500 text-white"
                            : "bg-gray-500 text-white"
                        )}
                      >
                        {kw.currentPosition}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getPositionChangeIcon(kw.positionChange)}
                        <span
                          className={cn(
                            "text-xs",
                            kw.positionChange > 0
                              ? "text-emerald-500"
                              : kw.positionChange < 0
                              ? "text-red-500"
                              : "text-gray-400"
                          )}
                        >
                          {Math.abs(kw.positionChange)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={cn(
                          "text-sm",
                          isDarkTheme ? "text-zinc-300" : "text-gray-700"
                        )}
                      >
                        {formatNumber(kw.searchVolume)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={cn(
                          "text-sm",
                          isDarkTheme ? "text-zinc-300" : "text-gray-700"
                        )}
                      >
                        $
                        {typeof kw.cpc === "number" && !isNaN(kw.cpc)
                          ? kw.cpc.toFixed(2)
                          : (Number(kw.cpc) || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          getDifficultyColor(kw.difficulty)
                        )}
                      >
                        {kw.difficulty} - {getDifficultyLabel(kw.difficulty)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
