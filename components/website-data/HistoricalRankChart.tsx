import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface HistoricalRankOverview {
  date: string;
  top1Count: number;
  top3Count: number;
  top10Count: number;
  top50Count: number;
  top100Count: number;
}

interface HistoricalRankChartProps {
  websiteId: string;
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  days?: number;
}

export const HistoricalRankChart: React.FC<HistoricalRankChartProps> = ({
  websiteId,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
  days = 30,
}) => {
  const [history, setHistory] = useState<HistoricalRankOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState(days);

  useEffect(() => {
    if (websiteId) {
      loadHistory();
    }
  }, [websiteId, selectedDays]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/website-data/historical-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: 1,
          days: selectedDays,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setHistory(result.data || []);
      } else {
        setError(uiLanguage === "zh" ? "加载失败" : "Failed to load");
      }
    } catch (err: any) {
      setError(err.message || (uiLanguage === "zh" ? "加载出错" : "Error loading"));
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期显示
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // 准备图表数据
  const chartData = history.map((item) => ({
    date: formatDate(item.date),
    "Top 1": item.top1Count,
    "Top 3": item.top3Count,
    "Top 10": item.top10Count,
    "Top 50": item.top50Count,
    "Top 100": item.top100Count,
  }));

  const colors = {
    "Top 1": "#10b981", // emerald
    "Top 3": "#3b82f6", // blue
    "Top 10": "#8b5cf6", // purple
    "Top 50": "#f59e0b", // amber
    "Top 100": "#ef4444", // red
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
            {uiLanguage === "zh" ? "历史排名概览" : "Historical Rank Overview"}
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
            {uiLanguage === "zh" ? "历史排名概览" : "Historical Rank Overview"}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={selectedDays === 7 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDays(7)}
              className={cn(
                "text-xs",
                selectedDays === 7
                  ? isDarkTheme
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : isDarkTheme
                  ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              7{uiLanguage === "zh" ? "天" : "d"}
            </Button>
            <Button
              variant={selectedDays === 30 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDays(30)}
              className={cn(
                "text-xs",
                selectedDays === 30
                  ? isDarkTheme
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : isDarkTheme
                  ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              30{uiLanguage === "zh" ? "天" : "d"}
            </Button>
            <Button
              variant={selectedDays === 90 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDays(90)}
              className={cn(
                "text-xs",
                selectedDays === 90
                  ? isDarkTheme
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : isDarkTheme
                  ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              )}
            >
              90{uiLanguage === "zh" ? "天" : "d"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className={cn(
            "text-center py-8 text-sm",
            isDarkTheme ? "text-zinc-500" : "text-gray-500"
          )}>
            {uiLanguage === "zh" ? "暂无数据" : "No data available"}
          </p>
        ) : (
          <div className="w-full">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkTheme ? "#3f3f46" : "#e5e7eb"}
                />
                <XAxis
                  dataKey="date"
                  stroke={isDarkTheme ? "#a1a1aa" : "#6b7280"}
                  tick={{ fill: isDarkTheme ? "#a1a1aa" : "#6b7280" }}
                />
                <YAxis
                  stroke={isDarkTheme ? "#a1a1aa" : "#6b7280"}
                  tick={{ fill: isDarkTheme ? "#a1a1aa" : "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkTheme ? "#18181b" : "#ffffff",
                    border: isDarkTheme ? "1px solid #3f3f46" : "1px solid #e5e7eb",
                    borderRadius: "8px",
                    color: isDarkTheme ? "#ffffff" : "#111827",
                  }}
                />
                <Legend
                  wrapperStyle={{
                    color: isDarkTheme ? "#ffffff" : "#111827",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="Top 1"
                  stroke={colors["Top 1"]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Top 3"
                  stroke={colors["Top 3"]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Top 10"
                  stroke={colors["Top 10"]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Top 50"
                  stroke={colors["Top 50"]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Top 100"
                  stroke={colors["Top 100"]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-5 gap-4">
              {["Top 1", "Top 3", "Top 10", "Top 50", "Top 100"].map((label) => {
                const latest = history[history.length - 1];
                const previous = history.length > 1 ? history[history.length - 2] : null;
                const current = latest?.[label.toLowerCase().replace(" ", "") as keyof HistoricalRankOverview] as number || 0;
                const prev = previous?.[label.toLowerCase().replace(" ", "") as keyof HistoricalRankOverview] as number || 0;
                const change = current - prev;
                return (
                  <div
                    key={label}
                    className={cn(
                      "p-3 rounded-lg border",
                      isDarkTheme
                        ? "bg-zinc-800/50 border-zinc-700"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <div className={cn(
                      "text-xs mb-1",
                      isDarkTheme ? "text-zinc-400" : "text-gray-500"
                    )}>
                      {label}
                    </div>
                    <div className={cn(
                      "text-lg font-semibold",
                      isDarkTheme ? "text-white" : "text-gray-900"
                    )}>
                      {current}
                    </div>
                    {previous && change !== 0 && (
                      <div className={cn(
                        "text-xs mt-1",
                        change > 0 ? "text-emerald-500" : "text-red-500"
                      )}>
                        {change > 0 ? "+" : ""}{change}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
