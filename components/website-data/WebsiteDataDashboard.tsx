import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { OverviewCards } from "./OverviewCards";
import { RankingDistributionChart } from "./RankingDistributionChart";
import { TopKeywordsTable } from "./TopKeywordsTable";
import { CompetitorsComparison } from "./CompetitorsComparison";
import { cn } from "../../lib/utils";

interface WebsiteOverview {
  organicTraffic: number;
  paidTraffic: number;
  totalTraffic: number;
  totalKeywords: number;
  newKeywords: number;
  lostKeywords: number;
  improvedKeywords: number;
  declinedKeywords: number;
  avgPosition: number;
  trafficCost: number;
  rankingDistribution: {
    top3: number;
    top10: number;
    top50: number;
    top100: number;
  };
  updatedAt: string;
  expiresAt: string;
}

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

interface DomainCompetitor {
  domain: string;
  title: string;
  commonKeywords: number;
  organicTraffic: number;
  totalKeywords: number;
  gapKeywords: number;
  gapTraffic: number;
}

interface WebsiteData {
  hasData: boolean;
  overview: WebsiteOverview | null;
  topKeywords: DomainKeyword[];
  competitors: DomainCompetitor[];
  needsRefresh: boolean;
}

interface WebsiteDataDashboardProps {
  websiteId: string;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const WebsiteDataDashboard: React.FC<WebsiteDataDashboardProps> = ({
  websiteId,
  isDarkTheme,
  uiLanguage,
}) => {
  const [data, setData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true); // 初始为 true，显示加载状态
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load website data (异步，不阻塞渲染)
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/website-data/overview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: 1, // TODO: Get from session
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(
            uiLanguage === "zh"
              ? "数据格式错误"
              : "Invalid data format"
          );
          console.error("[Dashboard] Invalid response:", result);
        }
      } else {
        const errorText = await response.text();
        let errorMessage = uiLanguage === "zh"
          ? "加载网站数据失败"
          : "Failed to load website data";
        
        // 根据状态码提供更具体的错误信息
        if (response.status === 404) {
          errorMessage = uiLanguage === "zh"
            ? "网站不存在"
            : "Website not found";
        } else if (response.status === 403) {
          errorMessage = uiLanguage === "zh"
            ? "无权访问此网站"
            : "No permission to access this website";
        }
        
        setError(errorMessage);
        console.error("[Dashboard] API error:", response.status, errorText);
      }
    } catch (error: any) {
      console.error("[Dashboard] Failed to load:", error);
      setError(
        uiLanguage === "zh" ? "网络连接失败" : "Network connection failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Update metrics (refresh from SE-Ranking)
  const updateMetrics = async () => {
    setUpdating(true);

    try {
      const response = await fetch("/api/website-data/update-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: 1,
        }),
      });

      if (response.ok) {
        // Reload data after update
        await loadData();
      } else {
        const errorText = await response.text();
        console.error("[Dashboard] Update error:", errorText);
      }
    } catch (error: any) {
      console.error("[Dashboard] Failed to update:", error);
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (websiteId) {
      // 异步加载数据
      loadData();
    } else {
      // 如果没有 websiteId，重置状态
      setData(null);
      setLoading(false);
      setError(uiLanguage === "zh" ? "缺少网站ID" : "Missing website ID");
    }
  }, [websiteId, uiLanguage]);

  // 如果没有 websiteId，显示错误
  if (!websiteId) {
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-sm">
          {uiLanguage === "zh" ? "缺少网站ID" : "Missing website ID"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={cn(
              "text-lg font-semibold",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "网站数据概览" : "Website Data Overview"}
          </h2>
          {data?.overview && (
            <p
              className={cn(
                "text-xs mt-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "最后更新" : "Last updated"}:{" "}
              {new Date(data.overview.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={updateMetrics}
          disabled={updating}
        >
          {updating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Overview Cards - 始终显示，加载时显示骨架屏 */}
      <OverviewCards
        metrics={data?.overview ? {
          organicTraffic: data.overview.organicTraffic,
          totalKeywords: data.overview.totalKeywords,
          avgPosition: data.overview.avgPosition,
          improvedKeywords: data.overview.improvedKeywords,
          newKeywords: data.overview.newKeywords,
        } : undefined}
        isLoading={loading || !data}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
      />

      {/* Charts and Tables - 始终显示，加载时显示加载状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking Distribution */}
        <RankingDistributionChart
          distribution={data?.overview?.rankingDistribution}
          totalKeywords={data?.overview?.totalKeywords}
          isLoading={loading || !data?.overview}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />

        {/* Top Keywords Table */}
        <TopKeywordsTable
          keywords={data?.topKeywords || []}
          isLoading={loading || !data}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          websiteId={websiteId}
          totalKeywordsCount={data?.overview?.totalKeywords}
        />

        {/* Competitors Comparison */}
        <CompetitorsComparison
          competitors={data?.competitors || []}
          isLoading={loading || !data}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />
      </div>

      {/* 错误提示 - 显示在底部，不阻塞页面 */}
      {error && (
        <div
          className={cn(
            "p-4 rounded-lg border",
            isDarkTheme
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-red-50 border-red-200 text-red-600"
          )}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="ml-auto"
            >
              {uiLanguage === "zh" ? "重试" : "Retry"}
            </Button>
          </div>
        </div>
      )}

      {/* 无数据提示 - 只在没有数据且不在加载时显示 */}
      {!loading && (!data || !data.hasData) && (
        <div
          className={cn(
            "text-center py-8 rounded-lg border",
            isDarkTheme
              ? "bg-zinc-900/50 border-zinc-800 text-zinc-400"
              : "bg-gray-50 border-gray-200 text-gray-500"
          )}
        >
          <p className="text-sm mb-4">
            {uiLanguage === "zh"
              ? "还没有网站数据。请先从 SE-Ranking 获取数据。"
              : "No website data yet. Please fetch data from SE-Ranking first."}
          </p>
          <Button
            onClick={updateMetrics}
            disabled={updating}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uiLanguage === "zh" ? "获取数据中..." : "Fetching..."}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {uiLanguage === "zh" ? "获取数据" : "Fetch Data"}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
