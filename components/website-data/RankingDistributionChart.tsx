import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";

interface RankingDistribution {
  top3: number;
  top10: number;
  top50: number;
  top100: number;
}

interface RankingDistributionChartProps {
  distribution: RankingDistribution;
  totalKeywords: number;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const RankingDistributionChart: React.FC<
  RankingDistributionChartProps
> = ({ distribution, totalKeywords, isDarkTheme, uiLanguage }) => {
  // Calculate percentages
  const getPercentage = (value: number): number => {
    if (totalKeywords === 0) return 0;
    return Math.round((value / totalKeywords) * 100);
  };

  const data = [
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
  ];

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
          {uiLanguage === "zh" ? "排名分布" : "Ranking Distribution"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((item) => (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span
                className={cn(
                  "font-medium",
                  isDarkTheme ? "text-zinc-300" : "text-gray-700"
                )}
              >
                {item.label}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-semibold",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  {item.count}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}
                >
                  ({item.percentage}%)
                </span>
              </div>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-zinc-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  item.color
                )}
                style={{ width: `${Math.min(item.percentage, 100)}%` }}
              />
            </div>
          </div>
        ))}

        {totalKeywords === 0 && (
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
