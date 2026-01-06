import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Hash,
  Target,
  BarChart3,
  Loader2,
  DollarSign,
  Activity,
  ArrowDown,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

interface OverviewMetric {
  label: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  icon: React.ReactNode;
  unit?: string;
}

interface OverviewCardsProps {
  metrics?: {
    organicTraffic: number;
    paidTraffic?: number;
    totalTraffic?: number;
    totalKeywords: number;
    avgPosition: number;
    trafficCost?: number;
  };
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  metrics,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
}) => {
  // Format numbers
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) {
      return "0";
    }
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format currency
  const formatCurrency = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) {
      return "$0.00";
    }
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  // Define cards - 移除 Paid Traffic, Traffic Cost, Average Position
  const cards: OverviewMetric[] = metrics ? [
    {
      label: uiLanguage === "zh" ? "有机流量" : "Organic Traffic",
      value: formatNumber(metrics.organicTraffic ?? 0),
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: uiLanguage === "zh" ? "总流量" : "Total Traffic",
      value: formatNumber(metrics.totalTraffic ?? 0),
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: uiLanguage === "zh" ? "总关键词数" : "Total Keywords",
      value: formatNumber(metrics.totalKeywords ?? 0),
      icon: <Hash className="w-4 h-4" />,
    },
  ] : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {isLoading || !metrics ? (
        // 加载骨架屏
        Array.from({ length: 3 }).map((_, index) => (
          <Card
            key={index}
            className={cn(
              "overflow-hidden rounded-2xl",
              isDarkTheme
                ? "bg-[#1a1a1a] border border-zinc-800/50"
                : "bg-white border-gray-200"
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div
                    className={cn(
                      "h-4 w-24 mb-3 rounded animate-pulse",
                      isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                    )}
                  />
                  <div
                    className={cn(
                      "h-10 w-32 rounded animate-pulse",
                      isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl animate-pulse",
                    isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        cards.map((card, index) => {
          const isHighlighted = index === 0; // 第一个卡片高亮
          return (
            <Card
              key={index}
              className={cn(
                "overflow-hidden rounded-2xl transition-all duration-300",
                isDarkTheme
                  ? "bg-[#1a1a1a] border"
                  : "bg-white border-gray-200",
                isHighlighted && isDarkTheme
                  ? "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                  : isDarkTheme
                  ? "border-zinc-800/50"
                  : "border-gray-200"
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {/* 图标 */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      isDarkTheme
                        ? "bg-zinc-800/50 text-white"
                        : "bg-gray-100 text-gray-700"
                    )}
                  >
                    {card.icon}
                  </div>
                  {/* 趋势指示器 - 右上角 */}
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">
                      +12.5%
                    </span>
                  </div>
                </div>

                {/* 中文标签 */}
                <p
                  className={cn(
                    "text-base font-semibold mb-2",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  {uiLanguage === "zh" 
                    ? (card.label === "有机流量" ? "月度自然流量" : 
                       card.label === "总流量" ? "总流量" : 
                       card.label === "总关键词数" ? "关键词总数" : card.label)
                    : card.label}
                </p>

                {/* 大号数字 */}
                <h3
                  className={cn(
                    "text-4xl font-bold mb-2",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  {card.value}
                </h3>

                {/* 英文标签 */}
                <p
                  className={cn(
                    "text-xs uppercase tracking-wider",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}
                >
                  {card.label.toUpperCase()}
                </p>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};
