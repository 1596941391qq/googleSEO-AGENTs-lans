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
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load website data
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
        setData(result.data);
      } else {
        const errorText = await response.text();
        setError(
          uiLanguage === "zh"
            ? "加载网站数据失败"
            : "Failed to load website data"
        );
        console.error("[Dashboard] API error:", errorText);
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
      loadData();
    }
  }, [websiteId]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-16",
          isDarkTheme ? "bg-zinc-900" : "bg-white"
        )}
      >
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-3" />
          <span
            className={cn(
              "block text-sm",
              isDarkTheme ? "text-zinc-400" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh" ? "加载中..." : "Loading..."}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-16",
          isDarkTheme ? "bg-zinc-900 text-zinc-400" : "bg-white text-gray-500"
        )}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData}>
            {uiLanguage === "zh" ? "重试" : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  if (!data || !data.hasData) {
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "bg-zinc-900 text-zinc-500" : "bg-white text-gray-500"
        )}
      >
        <div className="max-w-md mx-auto">
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
          {data.overview && (
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

      {/* Overview Cards */}
      {data.overview && (
        <OverviewCards
          metrics={{
            organicTraffic: data.overview.organicTraffic,
            totalKeywords: data.overview.totalKeywords,
            avgPosition: data.overview.avgPosition,
            improvedKeywords: data.overview.improvedKeywords,
            newKeywords: data.overview.newKeywords,
          }}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />
      )}

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ranking Distribution */}
        {data.overview && (
          <RankingDistributionChart
            distribution={data.overview.rankingDistribution}
            totalKeywords={data.overview.totalKeywords}
            isDarkTheme={isDarkTheme}
            uiLanguage={uiLanguage}
          />
        )}

        {/* Top Keywords Table */}
        <TopKeywordsTable
          keywords={data.topKeywords}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />

        {/* Competitors Comparison */}
        <CompetitorsComparison
          competitors={data.competitors}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />
      </div>
    </div>
  );
};
