import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  RefreshCw,
  BarChart3,
  Search,
  ExternalLink,
  TrendingUp,
  Sparkles,
  Globe,
} from "lucide-react";
import { OverviewCards } from "./OverviewCards";
import { TopKeywordsTable } from "./TopKeywordsTable";
import { RankedKeywordsTable } from "./RankedKeywordsTable";
import { RelevantPagesTable } from "./RelevantPagesTable";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { cn } from "../../lib/utils";
import { fetchWithAuth, postWithAuth } from "../../lib/api-client";
import { useAuth } from "../../contexts/AuthContext";
import { KeywordData } from "../../types";
import { getUserId } from "./utils";

// 地区选项
const REGIONS = [
  { value: "us", label: "Global / US", labelZh: "全球 / 美国" },
  { value: "uk", label: "United Kingdom", labelZh: "英国" },
  { value: "ca", label: "Canada", labelZh: "加拿大" },
  { value: "au", label: "Australia", labelZh: "澳大利亚" },
  { value: "de", label: "Germany", labelZh: "德国" },
  { value: "fr", label: "France", labelZh: "法国" },
  { value: "jp", label: "Japan", labelZh: "日本" },
  { value: "cn", label: "China", labelZh: "中国" },
];

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

type ViewMode = "overview" | "ranked-keywords" | "relevant-pages" | "domain-intersection";

export const WebsiteDataDashboard: React.FC<WebsiteDataDashboardProps> = ({
  websiteId,
  isDarkTheme,
  uiLanguage,
  onGenerateArticle,
  websiteUrl,
}) => {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [selectedRegion, setSelectedRegion] = useState<string>("us");
  const [data, setData] = useState<WebsiteData | null>(null);
  const [loading, setLoading] = useState(false); // 改为初始不加载
  const [error, setError] = useState<string | null>(null);
  const [loadingParts, setLoadingParts] = useState({
    overview: false,
    keywords: false,
  });
  const [websiteDomain, setWebsiteDomain] = useState<string | null>(null);
  const [hasInitiatedLoad, setHasInitiatedLoad] = useState(false); // 追踪是否已启动加载

  // localStorage 缓存工具函数
  const getCacheKey = (key: string) => `website_data_${websiteId}_${selectedRegion}_${key}`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

  const getCachedData = <T,>(key: string): T | null => {
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

  const setCachedData = <T,>(key: string, data: T) => {
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

  // 仅从数据库缓存加载数据，不主动触发 DataForSEO API 调用
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

    const baseRequest: any = {
      websiteId,
      userId: getUserId(user),
      region: selectedRegion,
    };
    
    // 如果是手动输入的临时网站，需要传递域名
    if (websiteId && websiteId.startsWith('manual-') && websiteDomain) {
      baseRequest.websiteDomain = websiteDomain;
    }

    // 只从缓存读取，不再在此处自动调用 update-metrics
    const requests = {
      overview: postWithAuth("/api/website-data/overview-only", baseRequest),
      keywords: postWithAuth("/api/website-data/keywords-only", { ...baseRequest, limit: 20 }),
    };

    // 处理每个响应
    const handleResponse = async (
      key: 'overview' | 'keywords',
      responsePromise: Promise<Response>
    ) => {
      try {
        const response = await responsePromise;

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
              
              // 检查是否真的有有效数据（不是只有域名）
              if (overviewData && (overviewData.totalKeywords > 0 || overviewData.organicTraffic > 0)) {
                updated.overview = overviewData as WebsiteOverview;
                updated.hasData = true;
              }
            } else if (key === 'keywords' && Array.isArray(result.data) && result.data.length > 0) {
              updated.topKeywords = result.data;
              updated.hasData = true;
            }

            return updated;
          });

          setLoadingParts((prev) => ({ ...prev, [key]: false }));
        } else {
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

    // 检查是否完全没有数据
    setData((currentData) => {
      if (!currentData) return null;
      
      const hasAnyData = !!(currentData.overview || currentData.topKeywords?.length > 0);

      if (!hasAnyData) {
        return {
          ...currentData,
          hasData: false,
          needsRefresh: true, // 标记需要刷新
        };
      }

      return {
        ...currentData,
        hasData: true,
      };
    });

    setLoading(false);
  };

  // 保持向后兼容的 loadData 方法
  const loadData = loadDataParallel;

  // 刷新数据：由用户点击触发，调用 update-metrics 接口获取最新数据
  const handleRefresh = async () => {
    console.log("[Dashboard] 🔄 Manual refresh triggered for region:", selectedRegion);
    setLoading(true);
    setError(null);
    
    try {
      const baseRequest: any = {
        websiteId,
        userId: getUserId(user),
        region: selectedRegion,
      };

      // 显式调用 update-metrics 接口（这会调用 DataForSEO API）
      const updateResponse = await postWithAuth("/api/website-data/update-metrics", baseRequest);
      
      if (!updateResponse.ok) {
        throw new Error(`Update failed: ${updateResponse.status}`);
      }
      
      console.log("[Dashboard] ✅ Update metrics completed, reloading UI data...");
      
      // 更新完成后，重新从数据库加载最新数据到 UI
      await loadDataParallel();
    } catch (err: any) {
      console.error("[Dashboard] ❌ Failed to refresh data:", err.message);
      setError(uiLanguage === 'zh' ? '同步数据失败，请重试' : 'Failed to sync data, please try again');
      setLoading(false);
    }
  };

  // 从 overview API 获取网站信息（如果需要的话，可以从其他API获取）
  // 暂时从 overview 数据中获取，如果没有则留空

  // 监听地区变化
  useEffect(() => {
    if (websiteId) {
      // 切换地区时，重置数据状态
      setData(null);
      setError(null);
      
      const cachedData = getCachedData<WebsiteData>('overview');
      if (cachedData) {
        console.log(`[Dashboard] 📦 Loading from localStorage cache for region: ${selectedRegion}`);
        setData(cachedData);
        setHasInitiatedLoad(true);
        if (cachedData.websiteDomain) {
          setWebsiteDomain(cachedData.websiteDomain);
        }
      } else {
        setHasInitiatedLoad(false);
      }
    }
  }, [selectedRegion, websiteId]);

  // 当切换到overview视图时
  useEffect(() => {
    // 逻辑已合并到上方的 region 监听中
  }, [viewMode]);

  // 自动轮询已禁用，改为由用户手动触发同步
  useEffect(() => {
    // 数据获取逻辑统一由 loadDataParallel 处理
  }, [websiteId, data?.hasData, selectedRegion, user]);

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
                  {uiLanguage === "zh" ? "最后更新" : "Last updated"}: {data.overview.updatedAt && !isNaN(new Date(data.overview.updatedAt).getTime()) ? new Date(data.overview.updatedAt).toLocaleString('zh-CN', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : (uiLanguage === 'zh' ? '暂无数据' : 'No data')}
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
        <div className="flex items-center gap-4">
          {/* 地区选择器 */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedRegion}
              onValueChange={setSelectedRegion}
            >
              <SelectTrigger className={cn(
                "w-[160px] h-10 border-none transition-all",
                isDarkTheme 
                  ? "bg-zinc-800/50 text-white hover:bg-zinc-800" 
                  : "bg-gray-100 text-gray-900 hover:bg-gray-200"
              )}>
                <Globe className="w-4 h-4 text-emerald-500" />
                <SelectValue placeholder="Select Region" />
              </SelectTrigger>
              <SelectContent className={isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}>
                {REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    {uiLanguage === "zh" ? region.labelZh : region.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
    </div>

    {/* Content based on view mode */}
      {viewMode === "overview" ? (
        <>
          {/* 未初始化加载时的提示 */}
          {!hasInitiatedLoad && !loading && (
            <div
              className={cn(
                "text-center py-20 rounded-2xl border flex flex-col items-center justify-center gap-6",
                isDarkTheme
                  ? "bg-zinc-900/30 border-zinc-800 text-zinc-400"
                  : "bg-gray-50 border-gray-200 text-gray-500"
              )}
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-emerald-500 opacity-50" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold text-white">
                  {uiLanguage === "zh" ? "准备深度数据透视" : "Ready for Deep Insights"}
                </p>
                <p className="text-sm opacity-60 max-w-sm mx-auto">
                  {uiLanguage === "zh" 
                    ? "点击下方按钮开始分析该站点的实时 SEO 指标、流量趋势及关键词分布。" 
                    : "Click the button below to start analyzing real-time SEO metrics, traffic trends, and keyword distribution."}
                </p>
              </div>
              
              <Button 
                onClick={() => {
                  setHasInitiatedLoad(true);
                  loadData();
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-10 py-6 h-auto transition-all hover:scale-105"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                {uiLanguage === "zh" ? "开始加载站点数据" : "Start Loading Data"}
              </Button>
            </div>
          )}

          {hasInitiatedLoad && (
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
                    "text-center py-12 rounded-2xl border flex flex-col items-center justify-center gap-4",
                    isDarkTheme
                      ? "bg-zinc-900/30 border-zinc-800 text-zinc-400"
                      : "bg-gray-50 border-gray-200 text-gray-500"
                  )}
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
                    <Globe className="w-8 h-8 text-emerald-500 opacity-50" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-white">
                      {uiLanguage === "zh" ? "暂无站点深度数据" : "No Deep SEO Data"}
                    </p>
                    <p className="text-sm opacity-60 max-w-xs mx-auto">
                      {uiLanguage === "zh" 
                        ? "由于 DataForSEO API 会产生费用，系统不会自动同步。请点击下方按钮手动同步该站点的实时 SEO 数据。" 
                        : "To optimize costs, data is not synced automatically. Click the button below to fetch real-time SEO metrics for this site."}
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleRefresh}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-8 py-6 h-auto"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    {uiLanguage === "zh" ? "立即同步数据" : "Sync Data Now"}
                  </Button>

                  {error && (
                    <p className={cn(
                      "text-xs mt-2",
                      isDarkTheme ? "text-red-400" : "text-red-600"
                    )}>
                      {error}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      ) : viewMode === "ranked-keywords" ? (
        <RankedKeywordsTable
          websiteId={websiteId}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          limit={1000}
          region={selectedRegion}
        />
      ) : viewMode === "relevant-pages" ? (
        <RelevantPagesTable
          websiteId={websiteId}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          limit={20}
          region={selectedRegion}
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
