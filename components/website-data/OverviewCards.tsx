import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Hash,
  Target,
  BarChart3,
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
  metrics: {
    organicTraffic: number;
    totalKeywords: number;
    avgPosition: number;
    improvedKeywords: number;
    newKeywords: number;
  };
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  metrics,
  isDarkTheme,
  uiLanguage,
}) => {
  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Define cards
  const cards: OverviewMetric[] = [
    {
      label: uiLanguage === "zh" ? "有机流量" : "Organic Traffic",
      value: formatNumber(metrics.organicTraffic),
      icon: <Users className="w-4 h-4" />,
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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
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
                  isDarkTheme
                    ? "bg-emerald-500/10"
                    : "bg-emerald-50"
                )}
              >
                {card.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
