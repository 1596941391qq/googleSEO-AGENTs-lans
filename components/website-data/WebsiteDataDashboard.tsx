import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { OverviewCards } from "./OverviewCards";
import { RankingDistributionChart } from "./RankingDistributionChart";
import { TopKeywordsTable } from "./TopKeywordsTable";
import { CompetitorsComparison } from "./CompetitorsComparison";
import { BacklinksInfo } from "./BacklinksInfo";
import { cn } from "../../lib/utils";

interface BacklinksInfoData {
  referringDomains: number;
  referringMainDomains: number;
  referringPages: number;
  dofollow: number;
  backlinks: number;
  timeUpdate?: string;
}

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
  backlinksInfo?: BacklinksInfoData | null;
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
  const [error, setError] = useState<string | null>(null);
  const [loadingParts, setLoadingParts] = useState({
    overview: true,
    keywords: true,
    competitors: true,
  });

  // 优先从缓存获取，如果缓存过期或不存在，才从API获取（只获取一次）
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

    // 使用sessionStorage防止重复调用
    const apiFetchKey = `api_fetch_${websiteId}`;
    const lastFetchTime = sessionStorage.getItem(apiFetchKey);
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000; // 5分钟内不重复调用API

    // 先读取缓存作为后备（即使缓存没过期，也会先执行 update-metrics）
    let cachedOverviewResult: any = null;
    try {
      const cacheResponse = await fetch("/api/website-data/overview-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseRequest),
      });

      if (cacheResponse.ok) {
        const cacheResult = await cacheResponse.json();
        cachedOverviewResult = cacheResult; // 保存缓存结果作为后备
        console.log("[Dashboard] 📦 Loaded cache as fallback (will try update-metrics first)");
      }
    } catch (error: any) {
      console.log("[Dashboard] ⚠️ Failed to load cache:", error.message);
    }

    // 总是先执行 update-metrics（即使缓存没过期），只有在失败时才使用缓存
    let useCacheAsFallback = false;
    
    // 如果5分钟内已经调用过API，跳过以避免重复调用
    if (lastFetchTime && (now - parseInt(lastFetchTime)) < FIVE_MINUTES) {
      console.log("[Dashboard] ⏭️ API was called recently, skipping to avoid duplicate calls");
      useCacheAsFallback = true; // 使用缓存
    } else {
      // 记录本次API调用时间（在调用前记录，防止重复调用）
      sessionStorage.setItem(apiFetchKey, now.toString());
      
      console.log("[Dashboard] 🔄 Always calling update-metrics first (even if cache is valid)...");
      
      try {
        // 同步调用API更新，等待完成
        const updateResponse = await fetch("/api/website-data/update-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseRequest),
        });

        if (updateResponse.ok) {
          const updateResult = await updateResponse.json();
          console.log("[Dashboard] ✅ Successfully updated metrics from DataForSEO API:", updateResult);
          // API更新成功，清除缓存的 overview 结果，强制重新读取最新数据
          cachedOverviewResult = null;
        } else {
          const errorText = await updateResponse.text();
          console.error("[Dashboard] ❌ update-metrics API failed:", updateResponse.status, errorText);
          // API更新失败，使用缓存作为后备
          useCacheAsFallback = true;
        }
      } catch (error: any) {
        console.error("[Dashboard] ❌ update-metrics API error:", error.message);
        // API调用出错，使用缓存作为后备
        useCacheAsFallback = true;
      }
    }

    // 并行发起所有请求（从缓存读取）
    // 如果 update-metrics 失败且缓存可用，使用缓存；否则重新读取（可能包含最新数据）
    const requests = {
      overview: (useCacheAsFallback && cachedOverviewResult)
        ? Promise.resolve(new Response(JSON.stringify(cachedOverviewResult), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }))
        : fetch("/api/website-data/overview-only", {
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

  // 刷新数据：清除缓存记录，强制重新获取最新数据
  const handleRefresh = async () => {
    console.log("[Dashboard] 🔄 Manual refresh triggered");
    
    // 清除 sessionStorage 中的 API 调用记录，强制重新调用 update-metrics
    const apiFetchKey = `api_fetch_${websiteId}`;
    sessionStorage.removeItem(apiFetchKey);
    
    // 重新加载数据
    await loadData();
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
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
            "hover:opacity-80 active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isDarkTheme
              ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
          )}
          title={uiLanguage === "zh" ? "刷新数据" : "Refresh data"}
        >
          <RefreshCw
            className={cn(
              "w-4 h-4",
              loading && "animate-spin"
            )}
          />
          <span className="text-sm font-medium">
            {uiLanguage === "zh" ? "刷新" : "Refresh"}
          </span>
        </button>
      </div>

      {/* Overview Cards - 始终显示，加载时显示骨架屏 */}
      <OverviewCards
        metrics={data?.overview ? {
          organicTraffic: data.overview.organicTraffic,
          paidTraffic: data.overview.paidTraffic,
          totalTraffic: data.overview.totalTraffic,
          totalKeywords: data.overview.totalKeywords,
          avgPosition: data.overview.avgPosition,
          improvedKeywords: data.overview.improvedKeywords,
          newKeywords: data.overview.newKeywords,
          lostKeywords: data.overview.lostKeywords,
          declinedKeywords: data.overview.declinedKeywords,
          trafficCost: data.overview.trafficCost,
        } : undefined}
        isLoading={loading || !data}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
      />

      {/* Backlinks Info */}
      <BacklinksInfo
        backlinks={data?.overview?.backlinksInfo}
        isLoading={loading || !data?.overview}
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
          <p className="text-sm">
            {uiLanguage === "zh"
              ? "正在从 DataForSEO 获取数据，请稍候..."
              : "Fetching data from DataForSEO, please wait..."}
          </p>
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
