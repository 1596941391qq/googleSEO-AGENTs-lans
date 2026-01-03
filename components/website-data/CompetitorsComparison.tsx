import React from "react";
import { Globe, TrendingUp, ArrowUpRight, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

interface DomainCompetitor {
  domain: string;
  title: string;
  commonKeywords: number;
  organicTraffic: number;
  totalKeywords: number;
  gapKeywords: number;
  gapTraffic: number;
}

interface CompetitorsComparisonProps {
  competitors: DomainCompetitor[];
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const CompetitorsComparison: React.FC<CompetitorsComparisonProps> = ({
  competitors,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

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
          {uiLanguage === "zh" ? "竞争对手" : "Competitors"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className={cn(
              "w-6 h-6 animate-spin",
              isDarkTheme ? "text-emerald-400" : "text-emerald-500"
            )} />
            <span className={cn(
              "ml-2 text-sm",
              isDarkTheme ? "text-zinc-400" : "text-gray-500"
            )}>
              {uiLanguage === "zh" ? "加载中..." : "Loading..."}
            </span>
          </div>
        ) : competitors.length === 0 ? (
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
          <div className="space-y-4">
            {competitors.map((competitor, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border transition-colors hover:bg-zinc-800/50",
                  isDarkTheme
                    ? "bg-zinc-900/50 border-zinc-800"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={cn(
                        "p-1.5 rounded-lg",
                        isDarkTheme
                          ? "bg-emerald-500/10"
                          : "bg-emerald-50"
                      )}
                    >
                      <Globe className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "font-medium text-sm truncate",
                          isDarkTheme ? "text-white" : "text-gray-900"
                        )}
                      >
                        {competitor.title || competitor.domain}
                      </div>
                      <div
                        className={cn(
                          "text-xs truncate",
                          isDarkTheme ? "text-zinc-500" : "text-gray-500"
                        )}
                      >
                        {competitor.domain}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs shrink-0 ml-2",
                      isDarkTheme
                        ? "border-zinc-700 text-zinc-400"
                        : "border-gray-300 text-gray-600"
                    )}
                  >
                    #{index + 1}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div
                    className={cn(
                      "p-2 rounded",
                      isDarkTheme ? "bg-zinc-800" : "bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {uiLanguage === "zh" ? "共同关键词" : "Common"}
                    </div>
                    <div
                      className={cn(
                        "font-semibold",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {formatNumber(competitor.commonKeywords)}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-2 rounded",
                      isDarkTheme ? "bg-zinc-800" : "bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {uiLanguage === "zh" ? "有机流量" : "Traffic"}
                    </div>
                    <div
                      className={cn(
                        "font-semibold",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {formatNumber(competitor.organicTraffic)}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-2 rounded",
                      isDarkTheme ? "bg-zinc-800" : "bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {uiLanguage === "zh" ? "差距关键词" : "Gap"}
                    </div>
                    <div
                      className={cn(
                        "font-semibold text-amber-500",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {formatNumber(competitor.gapKeywords)}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "p-2 rounded",
                      isDarkTheme ? "bg-zinc-800" : "bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {uiLanguage === "zh" ? "总关键词" : "Total"}
                    </div>
                    <div
                      className={cn(
                        "font-semibold",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {formatNumber(competitor.totalKeywords)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
