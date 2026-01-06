import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  RefreshCw,
  BarChart3,
  Search,
  ExternalLink,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { OverviewCards } from "./OverviewCards";
import { TopKeywordsTable } from "./TopKeywordsTable";
import { KeywordIntelligenceView } from "./KeywordIntelligenceView";
import { RankedKeywordsTable } from "./RankedKeywordsTable";
import { RelevantPagesTable } from "./RelevantPagesTable";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { KeywordData } from "../../types";
import { getUserId } from "./utils";

interface WebsiteOverview {
  organicTraffic: number;
  paidTraffic: number;
  totalTraffic: number;
  totalKeywords: number;
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

interface WebsiteData {
  hasData: boolean;
  overview: WebsiteOverview | null;
  topKeywords: DomainKeyword[];
  competitors?: any[];
  needsRefresh: boolean;
  websiteDomain?: string;
  websiteUrl?: string;
}

interface WebsiteDataDashboardProps {
  websiteId: string;
  websiteUrl?: string;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  onGenerateArticle?: (keyword: any) => void;
}

type ViewMode = "overview" | "keyword-intelligence" | "ranked-keywords" | "relevant-pages" | "domain-intersection";

export const WebsiteDataDashboard: React.FC<WebsiteDataDashboardProps> = ({
  websiteId,
  isDarkTheme,
  uiLanguage,
  onGenerateArticle,
  websiteUrl,
}) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [data, setData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(true); // 初始为 true，显示加载状态
  const [error, setError] = useState<string | null>(null);
  const [loadingParts, setLoadingParts] = useState({
    overview: true,
    keywords: true,
  });
  const [websiteDomain, setWebsiteDomain] = useState<string | null>(null);

  // localStorage 缓存工具函数
  const getCacheKey = (key: string) => `website_data_${websiteId}_${key}`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

  const getCachedData = <T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(getCacheKey(key));
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_DURATION) {
        localStorage.removeItem(getCacheKey(key));
        return null;
      }
      return data as T;
    } catch {
      return null;
    }
  };

  const setCachedData = <T>(key: string, data: T) => {
    try {
      localStorage.setItem(getCacheKey(key), JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('[Dashboard] Failed to cache data:', error);
    }
  };

  // 从 websiteUrl prop 提取域名（如果提供了）
  useEffect(() => {
    if (websiteUrl) {
      try {
        const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
        const domain = new URL(url).hostname.replace(/^www\./, '');
        setWebsiteDomain(domain);
      } catch (e) {
        // 如果解析失败，直接使用 websiteUrl（去掉协议和www）
        setWebsiteDomain(websiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, ''));
      }
    }
  }, [websiteUrl]);

  // 优先从缓存获取，如果缓存过期或不存在，才从API获取（只获取一次）
  const loadDataParallel = async () => {
    setLoading(true);
    setError(null);
    setLoadingParts({ overview: true, keywords: true });

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
      userId: getUserId(user),
    };

    // 使用sessionStorage防止重复调用
    const apiFetchKey = `api_fetch_${websiteId}`;
    const lastFetchTime = sessionStorage.getItem(apiFetchKey);
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000; // 5分钟内不重复调用API

    // 总是先执行 update-metrics（即使缓存没过期），只有在失败时才使用缓存
    let useCacheAsFallback = false;
    let cachedOverviewResult: any = null;
    
    // 如果5分钟内已经调用过API，跳过以避免重复调用
    if (lastFetchTime && (now - parseInt(lastFetchTime)) < FIVE_MINUTES) {
      console.log("[Dashboard] ⏭️ API was called recently, skipping to avoid duplicate calls");
      useCacheAsFallback = true; // 使用缓存，先读取缓存
    } else {
      // 记录本次API调用时间（在调用前记录，防止重复调用）
      sessionStorage.setItem(apiFetchKey, now.toString());
      
      console.log("[Dashboard] 🔄 Always calling update-metrics first (even if cache is valid)...");
      
      try {
        // 同步调用API更新，等待完成（这是第一个调用，优先于所有其他请求）
        const updateResponse = await fetch("/api/website-data/update-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseRequest),
        });

        if (updateResponse.ok) {
          const updateResult = await updateResponse.json();
          console.log("[Dashboard] ✅ Successfully updated metrics from DataForSEO API:", updateResult);
          // API更新成功，不设置 useCacheAsFallback，强制重新读取最新数据
        } else {
          const errorText = await updateResponse.text();
          console.error("[Dashboard] ❌ update-metrics API failed:", updateResponse.status, errorText);
          // API更新失败，使用缓存作为后备（稍后读取）
          useCacheAsFallback = true;
        }
      } catch (error: any) {
        console.error("[Dashboard] ❌ update-metrics API error:", error.message);
        // API调用出错，使用缓存作为后备（稍后读取）
        useCacheAsFallback = true;
      }
    }

    // 只有在 update-metrics 失败时才读取缓存作为后备
    if (useCacheAsFallback) {
      try {
        const cacheResponse = await fetch("/api/website-data/overview-only", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseRequest),
        });

        if (cacheResponse.ok) {
          const cacheResult = await cacheResponse.json();
          cachedOverviewResult = cacheResult; // 保存缓存结果作为后备
        }
      } catch (error: any) {
        // 静默失败，使用空缓存
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
    };

    // 处理每个请求，哪个先返回就先更新
    const handleResponse = async (
      key: 'overview' | 'keywords',
      responsePromise: Promise<Response>
    ) => {
      try {
        const startTime = Date.now();
        const response = await responsePromise;
        const loadTime = Date.now() - startTime;

        if (response.ok) {
          const result = await response.json();

          // 增量更新数据
          setData((prev) => {
            if (!prev) return prev;
            const updated = { ...prev };

            if (key === 'overview' && result.data) {
              // 先提取域名（如果 API 返回了）
              if (result.data.domain && !websiteDomain) {
                updated.websiteDomain = result.data.domain;
                setWebsiteDomain(result.data.domain);
              }
              
              // 提取 overview 数据（排除 domain 字段）
              const { domain, ...overviewData } = result.data;
              updated.overview = overviewData as WebsiteOverview;
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
    ]);

    // 等待所有请求完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 检查数据状态（不自动触发更新，只在用户访问时显示提示）
    setData((currentData) => {
      const hasAnyData = currentData?.overview || (currentData?.topKeywords?.length ?? 0) > 0 || (currentData?.competitors?.length ?? 0) > 0;

      if (!hasAnyData) {
        // 不自动触发更新，只标记需要刷新
        return {
          ...currentData,
          needsRefresh: true,
        };
      }

      // 保存到localStorage缓存
      if (currentData && hasAnyData) {
        setCachedData('overview', {
          ...currentData,
          websiteDomain: websiteDomain || currentData.websiteDomain,
        });
      }

      return currentData;
    });

    setLoading(false);
  };

  // 保持向后兼容的 loadData 方法
  const loadData = loadDataParallel;

  // 刷新数据：清除缓存记录，强制重新获取最新数据
  const handleRefresh = async () => {
    console.log("[Dashboard] 🔄 Manual refresh triggered");
    
    // 清除 sessionStorage 中的 API 调用记录
    const apiFetchKey = `api_fetch_${websiteId}`;
    sessionStorage.removeItem(apiFetchKey);
    
    // 清除 localStorage 缓存
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(`website_data_${websiteId}_`)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('[Dashboard] Failed to clear localStorage cache:', error);
    }
    
    // 强制重新加载数据
    await loadDataParallel(true);
  };

  // 从 overview API 获取网站信息（如果需要的话，可以从其他API获取）
  // 暂时从 overview 数据中获取，如果没有则留空

  // 首次加载数据（只在websiteId变化时）
  useEffect(() => {
    if (websiteId) {
      // 先尝试从缓存加载
      const cachedData = getCachedData<WebsiteData>('overview');
      if (cachedData) {
        console.log('[Dashboard] 📦 Loading from localStorage cache');
        setData(cachedData);
        setLoading(false);
        setLoadingParts({ overview: false, keywords: false });
        if (cachedData.websiteDomain) {
          setWebsiteDomain(cachedData.websiteDomain);
        }
      } else {
        // 没有缓存时才调用API（只在overview视图时）
        if (viewMode === "overview") {
          loadData();
        }
      }
    } else {
      // 如果没有 websiteId，重置状态
      setData(null);
      setLoading(false);
      setError(uiLanguage === "zh" ? "缺少网站ID" : "Missing website ID");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId]); // 只在websiteId变化时加载

  // 当切换到overview视图时，如果没有数据则加载
  useEffect(() => {
    if (websiteId && viewMode === "overview" && !data) {
      const cachedData = getCachedData<WebsiteData>('overview');
      if (!cachedData) {
        loadData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]); // 只在viewMode变化时检查

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
    <div className={cn(
      "space-y-6 min-h-screen relative",
      isDarkTheme ? "bg-[#0a0a0a]" : "bg-gray-50"
    )}>
      {/* Background Grid Pattern */}
      <div
        className={cn(
          "absolute inset-0 opacity-[0.03] pointer-events-none",
          isDarkTheme
            ? 'bg-[url(\'data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100%25" height="100%25" fill="url(%23grid)" /%3E%3C/svg%3E\')]'
            : 'bg-[url(\'data:image/svg+xml,%3Csvg width="40" height="40" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 40 0 L 0 0 0 40" fill="none" stroke="gray" stroke-width="1"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100%25" height="100%25" fill="url(%23grid)" /%3E%3C/svg%3E\')]'
        )}
      />

      {/* Top Navigation Bar - 图2风格 */}
      <div className={cn(
        "relative flex items-start justify-between p-6 rounded-2xl border",
        isDarkTheme 
          ? "bg-[#1a1a1a] border-zinc-800/50 backdrop-blur-sm" 
          : "bg-white border-gray-200 shadow-sm"
      )}>
        {/* 左侧区域 */}
        <div className="flex flex-col gap-4">
          {/* 顶部：绿色按钮 + 更新时间标签 */}
          <div className="flex items-center gap-3">
            <Badge
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider",
                isDarkTheme
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-500 text-white"
              )}
            >
              {uiLanguage === "zh" ? "策略指挥中心" : "STRATEGY COMMAND CENTER"}
            </Badge>
            {data?.overview && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                isDarkTheme
                  ? "bg-zinc-800/50 text-zinc-400"
                  : "bg-gray-100 text-gray-600"
              )}>
                <span className="text-xs">
                  {uiLanguage === "zh" ? "最后更新" : "Last updated"}: {new Date(data.overview.updatedAt).toLocaleString('zh-CN', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className={cn(
                    "ml-1 p-1 rounded-full transition-all hover:opacity-80",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isDarkTheme
                      ? "hover:bg-zinc-700"
                      : "hover:bg-gray-200"
                  )}
                  title={uiLanguage === "zh" ? "刷新数据" : "Refresh data"}
                >
                  <RefreshCw
                    className={cn(
                      "w-3.5 h-3.5",
                      isDarkTheme ? "text-zinc-400" : "text-gray-500",
                      loading && "animate-spin"
                    )}
                  />
                </button>
              </div>
            )}
          </div>

          {/* 中部：大号域名显示 */}
          {websiteDomain ? (
            <div className="flex items-center gap-3">
              <a
                href={`https://${websiteDomain}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 group transition-all",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                <span
                  className={cn(
                    "text-4xl font-bold italic tracking-tight",
                    isDarkTheme
                      ? "text-white drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                      : "text-gray-900"
                  )}
                  style={{
                    textShadow: isDarkTheme
                      ? "0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(59, 130, 246, 0.2)"
                      : "none",
                  }}
                >
                  {websiteDomain}
                </span>
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all group-hover:scale-110",
                    isDarkTheme
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-emerald-500 border border-emerald-600"
                  )}
                >
                  <ExternalLink
                    className={cn(
                      "w-4 h-4",
                      isDarkTheme ? "text-emerald-400" : "text-white"
                    )}
                  />
                </div>
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-4xl font-bold italic",
                isDarkTheme ? "text-zinc-500" : "text-gray-400"
              )}>
                {uiLanguage === "zh" ? "加载中..." : "Loading..."}
              </span>
            </div>
          )}
        </div>

        {/* 右侧：切换控件 - 图2风格 */}
        <div className="flex items-center">
          {/* 总览 */}
          <button
            onClick={() => setViewMode("overview")}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3 rounded-l-xl transition-all border-r",
              viewMode === "overview"
                ? isDarkTheme
                  ? "bg-white text-gray-900 border-white/20"
                  : "bg-white text-gray-900 shadow-sm border-gray-200"
                : isDarkTheme
                ? "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border-zinc-700/50"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
            )}
          >
            <BarChart3
              className={cn(
                "w-4 h-4 transition-colors",
                viewMode === "overview"
                  ? isDarkTheme
                    ? "text-emerald-600"
                    : "text-emerald-500"
                  : isDarkTheme
                  ? "text-zinc-500"
                  : "text-gray-500"
              )}
            />
            <span className="text-sm font-medium">
              {uiLanguage === "zh" ? "全局透视" : "Global Perspective"}
            </span>
          </button>

          {/* 关键词情报 */}
          <button
            onClick={() => setViewMode("keyword-intelligence")}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3 transition-all border-r",
              viewMode === "keyword-intelligence"
                ? isDarkTheme
                  ? "bg-white text-gray-900 border-white/20"
                  : "bg-white text-gray-900 shadow-sm border-gray-200"
                : isDarkTheme
                ? "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border-zinc-700/50"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
            )}
          >
            <Sparkles
              className={cn(
                "w-4 h-4 transition-colors",
                viewMode === "keyword-intelligence"
                  ? isDarkTheme
                    ? "text-emerald-600"
                    : "text-emerald-500"
                  : isDarkTheme
                  ? "text-zinc-500"
                  : "text-gray-500"
              )}
            />
            <span className="text-sm font-medium">
              {uiLanguage === "zh" ? "关键词情报" : "Keyword Intelligence"}
            </span>
          </button>

          {/* 排名关键词 */}
          <button
            onClick={() => setViewMode("ranked-keywords")}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3 transition-all border-r",
              viewMode === "ranked-keywords"
                ? isDarkTheme
                  ? "bg-white text-gray-900 border-white/20"
                  : "bg-white text-gray-900 shadow-sm border-gray-200"
                : isDarkTheme
                ? "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border-zinc-700/50"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300"
            )}
          >
            <Search
              className={cn(
                "w-4 h-4 transition-colors",
                viewMode === "ranked-keywords"
                  ? isDarkTheme
                    ? "text-emerald-600"
                    : "text-emerald-500"
                  : isDarkTheme
                  ? "text-zinc-500"
                  : "text-gray-500"
              )}
            />
            <span className="text-sm font-medium">
              {uiLanguage === "zh" ? "排名关键词" : "Ranked Keywords"}
            </span>
          </button>

          {/* 相关页面 */}
          <button
            onClick={() => setViewMode("relevant-pages")}
            className={cn(
              "relative flex items-center gap-2 px-5 py-3 rounded-r-xl transition-all",
              viewMode === "relevant-pages"
                ? isDarkTheme
                  ? "bg-white text-gray-900"
                  : "bg-white text-gray-900 shadow-sm"
                : isDarkTheme
                ? "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <ExternalLink
              className={cn(
                "w-4 h-4 transition-colors",
                viewMode === "relevant-pages"
                  ? isDarkTheme
                    ? "text-emerald-600"
                    : "text-emerald-500"
                  : isDarkTheme
                  ? "text-zinc-500"
                  : "text-gray-500"
              )}
            />
            <span className="text-sm font-medium">
              {uiLanguage === "zh" ? "相关页面" : "Relevant Pages"}
            </span>
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === "overview" ? (
        <>
      {/* Overview Cards - 始终显示，加载时显示骨架屏 */}
      <OverviewCards
        metrics={data?.overview ? {
          organicTraffic: data.overview.organicTraffic,
          paidTraffic: data.overview.paidTraffic,
          totalTraffic: data.overview.totalTraffic,
          totalKeywords: data.overview.totalKeywords,
          avgPosition: data.overview.avgPosition,
          trafficCost: data.overview.trafficCost,
        } : undefined}
        isLoading={loading || !data}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
      />

      {/* Top Keywords Table - 始终显示，加载时显示加载状态 */}
      <TopKeywordsTable
        keywords={data?.topKeywords || []}
        isLoading={loading || !data}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
        websiteId={websiteId}
        totalKeywordsCount={data?.overview?.totalKeywords}
        onViewAll={() => setViewMode("ranked-keywords")}
      />

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
        </>
      ) : viewMode === "keyword-intelligence" ? (
        <KeywordIntelligenceView
          websiteId={websiteId}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          onGenerateArticle={onGenerateArticle}
        />
      ) : viewMode === "ranked-keywords" ? (
        <RankedKeywordsTable
          websiteId={websiteId}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          limit={1000}
        />
      ) : viewMode === "relevant-pages" ? (
        <RelevantPagesTable
          websiteId={websiteId}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          limit={20}
        />
      ) : viewMode === "domain-intersection" ? (
        <div className="space-y-4">
          <p className={cn(
            "text-sm",
            isDarkTheme ? "text-zinc-400" : "text-gray-500"
          )}>
            {uiLanguage === "zh"
              ? "域名交集功能需要选择竞争对手域名"
              : "Domain intersection requires competitor domain selection"}
          </p>
        </div>
      ) : null}
    </div>
  );
};
