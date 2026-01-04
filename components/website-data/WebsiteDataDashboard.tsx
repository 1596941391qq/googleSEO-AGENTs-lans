import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
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
  const [loadingParts, setLoadingParts] = useState({
    overview: true,
    keywords: true,
    competitors: true,
  });

  // 并行加载数据 - 哪个先返回就先显示哪个
  const loadDataParallel = async () => {
    setLoading(true);
    setError(null);
    setLoadingParts({ overview: true, keywords: true, competitors: true });

    // 初始化数据结构
    const initialData: WebsiteData = {
      hasData: false,
      overview: null,
      topKeywords: [],
      competitors: [],
      needsRefresh: false,
    };
    setData(initialData);

    const baseRequest = {
      websiteId,
      userId: 1, // TODO: Get from session
    };

    console.log("[Dashboard] 🚀 Starting parallel data loading for websiteId:", websiteId);

    // 并行发起所有请求
    const requests = {
      overview: fetch("/api/website-data/overview-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseRequest),
      }),
      keywords: fetch("/api/website-data/keywords-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseRequest, limit: 20 }),
      }),
      competitors: fetch("/api/website-data/competitors-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...baseRequest, limit: 5 }),
      }),
    };

    // 处理每个请求，哪个先返回就先更新
    const handleResponse = async (
      key: 'overview' | 'keywords' | 'competitors',
      responsePromise: Promise<Response>
    ) => {
      try {
        const startTime = Date.now();
        const response = await responsePromise;
        const loadTime = Date.now() - startTime;

        if (response.ok) {
          const result = await response.json();
          console.log(`[Dashboard] ✅ ${key} loaded in ${loadTime}ms:`, {
            success: result.success,
            cached: result.cached,
            dataLength: Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0,
          });

          // 增量更新数据
          setData((prev) => {
            if (!prev) return prev;
            const updated = { ...prev };

            if (key === 'overview' && result.data) {
              updated.overview = result.data;
              updated.hasData = true;
            } else if (key === 'keywords' && Array.isArray(result.data)) {
              updated.topKeywords = result.data;
            } else if (key === 'competitors' && Array.isArray(result.data)) {
              updated.competitors = result.data;
            }

            return updated;
          });

          setLoadingParts((prev) => ({ ...prev, [key]: false }));
        } else {
          console.error(`[Dashboard] ❌ ${key} API error:`, response.status);
          setLoadingParts((prev) => ({ ...prev, [key]: false }));
        }
      } catch (error: any) {
        console.error(`[Dashboard] ❌ ${key} failed:`, error.message);
        setLoadingParts((prev) => ({ ...prev, [key]: false }));
      }
    };

    // 并行处理所有请求
    await Promise.allSettled([
      handleResponse('overview', requests.overview),
      handleResponse('keywords', requests.keywords),
      handleResponse('competitors', requests.competitors),
    ]);

    // 等待所有请求完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 检查数据状态（不自动触发更新，只在用户访问时显示提示）
    setData((currentData) => {
      const hasAnyData = currentData?.overview || (currentData?.topKeywords?.length ?? 0) > 0 || (currentData?.competitors?.length ?? 0) > 0;

      if (!hasAnyData) {
        console.log("[Dashboard] ⚠️ No cached data found - user needs to manually refresh");
        // 不自动触发更新，只标记需要刷新
        return {
          ...currentData,
          needsRefresh: true,
        };
      }

      return currentData;
    });

    setLoading(false);
    console.log("[Dashboard] ✅ Parallel loading completed");
  };

  // 保持向后兼容的 loadData 方法
  const loadData = loadDataParallel;

  // Update metrics (refresh from DataForSEO/SE-Ranking) - 只在用户手动点击时调用
  const updateMetrics = async () => {
    setUpdating(true);
    setError(null);

    try {
      console.log("[Dashboard] 🔄 User manually triggered data update...");
      const response = await fetch("/api/website-data/update-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: 1,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("[Dashboard] ✅ Update completed:", result);
        // 更新完成后重新加载数据
        await loadData();
      } else {
        const errorText = await response.text();
        console.error("[Dashboard] Update error:", errorText);
        setError(uiLanguage === "zh" ? "更新失败，请稍后重试" : "Update failed, please try again");
      }
    } catch (error: any) {
      console.error("[Dashboard] Failed to update:", error);
      setError(uiLanguage === "zh" ? "网络错误，请检查连接" : "Network error, please check connection");
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
              ? "还没有网站数据。点击下方按钮从 DataForSEO 获取数据。"
              : "No website data yet. Click the button below to fetch data from DataForSEO."}
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
          {error && (
            <p className={cn(
              "text-xs mt-3",
              isDarkTheme ? "text-red-400" : "text-red-600"
            )}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
