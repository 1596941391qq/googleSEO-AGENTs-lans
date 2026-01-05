import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface RankingDistribution {
  top3: number;
  top10: number;
  top50: number;
  top100: number;
}

interface RankingDistributionChartProps {
  distribution?: RankingDistribution;
  totalKeywords?: number;
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  changes?: {
    top3?: number;
    top10?: number;
    top100?: number;
  };
}

export const RankingDistributionChart: React.FC<
  RankingDistributionChartProps
> = ({
  distribution,
  totalKeywords = 0,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
  changes,
}) => {
  // Calculate percentages
  const getPercentage = (value: number): number => {
    if (totalKeywords === 0) return 0;
    return Math.round((value / totalKeywords) * 100);
  };

  const data = distribution
    ? [
        {
          label: "Top 3",
          count: distribution.top3,
          percentage: getPercentage(distribution.top3),
          color: "bg-emerald-500",
          bgColor: isDarkTheme ? "bg-emerald-500/20" : "bg-emerald-100",
        },
        {
          label: "Top 10",
          count: distribution.top10,
          percentage: getPercentage(distribution.top10),
          color: "bg-blue-500",
          bgColor: isDarkTheme ? "bg-blue-500/20" : "bg-blue-100",
        },
        {
          label: "Top 50",
          count: distribution.top50,
          percentage: getPercentage(distribution.top50),
          color: "bg-amber-500",
          bgColor: isDarkTheme ? "bg-amber-500/20" : "bg-amber-100",
        },
        {
          label: "Top 100",
          count: distribution.top100,
          percentage: getPercentage(distribution.top100),
          color: "bg-gray-500",
          bgColor: isDarkTheme ? "bg-gray-500/20" : "bg-gray-100",
        },
      ]
    : [];

  return (
    <Card
      className={cn(
        "col-span-1",
        isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
      )}
    >
      <CardHeader>
        <CardTitle
          className={cn(
            "text-base font-semibold",
            isDarkTheme ? "text-white" : "text-gray-900"
          )}
        >
          {uiLanguage === "zh" ? "排名分布" : "RANK DISTRIBUTION"}
          <span
            className={cn(
              "ml-2 text-xs font-normal",
              isDarkTheme ? "text-zinc-500" : "text-gray-500"
            )}
          >
            (RANK TRACKING API)
          </span>
        </CardTitle>
        <p
          className={cn(
            "text-xs mt-2",
            isDarkTheme ? "text-zinc-400" : "text-gray-500"
          )}
        >
          {uiLanguage === "zh"
            ? "📊 显示您的网站在 Google 搜索结果中的排名情况。例如：TOP 3 表示有 x 个关键词排在前 3 名，这些关键词能带来最多的流量。"
            : "📊 Shows your website's ranking positions on Google. For example: TOP 3 means x keywords rank in the top 3 positions, bringing the most traffic."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
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
        ) : data.length > 0 ? (
          data.map((item) => {
            const getDescription = (label: string) => {
              if (uiLanguage === "zh") {
                if (label.includes("TOP 3"))
                  return "前 3 名 - 最佳位置，流量最多";
                if (label.includes("TOP 10"))
                  return "前 10 名 - 第一页，流量较高";
                if (label.includes("TOP 50"))
                  return "前 50 名 - 前 5 页，有一定流量";
                if (label.includes("TOP 100"))
                  return "前 100 名 - 前 10 页，总关键词数";
              } else {
                if (label.includes("TOP 3"))
                  return "Top 3 - Best positions, most traffic";
                if (label.includes("TOP 10"))
                  return "Top 10 - First page, high traffic";
                if (label.includes("TOP 50"))
                  return "Top 50 - First 5 pages, moderate traffic";
                if (label.includes("TOP 100"))
                  return "Top 100 - First 10 pages, total keywords";
              }
              return "";
            };

            return (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-sm font-medium uppercase",
                        isDarkTheme ? "text-zinc-300" : "text-gray-700"
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        "text-xs mt-0.5",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {getDescription(item.label)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-lg font-bold",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {item.count.toLocaleString()}
                    </span>
                    {item.change !== undefined && item.change !== null && (
                      <span
                        className={cn(
                          "text-sm font-medium",
                          item.change >= 0 ? "text-emerald-400" : "text-red-400"
                        )}
                      >
                        {item.change >= 0 ? "+" : ""}
                        {item.change}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "relative h-2 w-full overflow-hidden rounded-full",
                    isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                  )}
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      item.color
                    )}
                    style={{ width: `${Math.min(item.percentage, 100)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
};
