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
    improvedKeywords: number;
    newKeywords: number;
    lostKeywords?: number;
    declinedKeywords?: number;
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
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format currency
  const formatCurrency = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  // Define cards
  const cards: OverviewMetric[] = metrics ? [
    {
      label: uiLanguage === "zh" ? "有机流量" : "Organic Traffic",
      value: formatNumber(metrics.organicTraffic),
      icon: <Users className="w-4 h-4" />,
    },
    {
      label: uiLanguage === "zh" ? "付费流量" : "Paid Traffic",
      value: formatNumber(metrics.paidTraffic || 0),
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      label: uiLanguage === "zh" ? "总流量" : "Total Traffic",
      value: formatNumber(metrics.totalTraffic || 0),
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: uiLanguage === "zh" ? "总关键词数" : "Total Keywords",
      value: formatNumber(metrics.totalKeywords),
      icon: <Hash className="w-4 h-4" />,
    },
    {
      label: uiLanguage === "zh" ? "平均排名" : "Avg Position",
      value: metrics.avgPosition.toFixed(1),
      icon: <Target className="w-4 h-4" />,
      unit: uiLanguage === "zh" ? "名" : "#",
    },
    {
      label: uiLanguage === "zh" ? "提升关键词" : "Improved",
      value: formatNumber(metrics.improvedKeywords),
      icon: <TrendingUp className="w-4 h-4" />,
      changeType: "increase",
    },
    {
      label: uiLanguage === "zh" ? "新增关键词" : "New Keywords",
      value: formatNumber(metrics.newKeywords),
      icon: <BarChart3 className="w-4 h-4" />,
      changeType: "increase",
    },
    {
      label: uiLanguage === "zh" ? "丢失关键词" : "Lost Keywords",
      value: formatNumber(metrics.lostKeywords || 0),
      icon: <TrendingDown className="w-4 h-4" />,
      changeType: "decrease",
    },
    {
      label: uiLanguage === "zh" ? "下降关键词" : "Declined Keywords",
      value: formatNumber(metrics.declinedKeywords || 0),
      icon: <ArrowDown className="w-4 h-4" />,
      changeType: "decrease",
    },
    {
      label: uiLanguage === "zh" ? "流量成本" : "Traffic Cost",
      value: formatCurrency(metrics.trafficCost || 0),
      icon: <DollarSign className="w-4 h-4" />,
    },
  ] : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {isLoading || !metrics ? (
        // 加载骨架屏
        Array.from({ length: 5 }).map((_, index) => (
          <Card
            key={index}
            className={cn(
              "overflow-hidden",
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800"
                : "bg-white border-gray-200"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div
                    className={cn(
                      "h-3 w-20 mb-2 rounded animate-pulse",
                      isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                    )}
                  />
                  <div
                    className={cn(
                      "h-8 w-16 rounded animate-pulse",
                      isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                    )}
                  />
                </div>
                <div
                  className={cn(
                    "p-2 rounded-lg animate-pulse",
                    isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                  )}
                >
                  <div className="w-4 h-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        cards.map((card, index) => (
          <Card
            key={index}
            className={cn(
              "overflow-hidden",
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800"
                : "bg-white border-gray-200"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-xs font-medium mb-1",
                      isDarkTheme ? "text-zinc-400" : "text-gray-500"
                    )}
                  >
                    {card.label}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <h3
                      className={cn(
                        "text-2xl font-bold",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {card.unit && `${card.unit} `}
                      {card.value}
                    </h3>
                  </div>
                </div>
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    card.changeType === "decrease"
                      ? isDarkTheme
                        ? "bg-red-500/10"
                        : "bg-red-50"
                      : card.changeType === "increase"
                      ? isDarkTheme
                        ? "bg-emerald-500/10"
                        : "bg-emerald-50"
                      : isDarkTheme
                      ? "bg-blue-500/10"
                      : "bg-blue-50"
                  )}
                >
                  <div
                    className={cn(
                      card.changeType === "decrease"
                        ? "text-red-500"
                        : card.changeType === "increase"
                        ? "text-emerald-500"
                        : "text-blue-500"
                    )}
                  >
                    {card.icon}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};
