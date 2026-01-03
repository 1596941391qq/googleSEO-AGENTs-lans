import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronRight,
  TestTube,
  X,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
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

  // 测试功能状态（仅本地可见）
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testUrl, setTestUrl] = useState("");
  const [testEndpoint, setTestEndpoint] = useState<"overview" | "keywords" | "keyword-data" | "whois-overview" | "custom">("whois-overview");
  const [testCustomEndpoint, setTestCustomEndpoint] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // 检查是否为本地环境
  const isLocal = typeof window !== "undefined" && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === ""
  );

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

    // 检查是否需要触发数据更新（仅一次，不轮询）
    setData((currentData) => {
      const hasAnyData = currentData?.overview || (currentData?.topKeywords?.length ?? 0) > 0 || (currentData?.competitors?.length ?? 0) > 0;

      if (!hasAnyData) {
        console.log("[Dashboard] ⚠️ No cached data found, triggering one-time update...");
        // 异步触发数据更新（不阻塞，仅一次）
        fetch("/api/website-data/update-metrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(baseRequest),
        })
          .then(() => {
            console.log("[Dashboard] Update completed, reloading once...");
            // 更新完成后仅重新加载一次
            loadDataParallel();
          })
          .catch((error) => {
            console.error("[Dashboard] Update failed:", error);
            setError(uiLanguage === "zh" ? "获取数据失败，请手动刷新" : "Failed to fetch data, please refresh manually");
          });
      }

      return currentData;
    });

    setLoading(false);
    console.log("[Dashboard] ✅ Parallel loading completed");
  };

  // 保持向后兼容的 loadData 方法
  const loadData = loadDataParallel;

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

  // 测试 DataForSEO API
  const testDataForSEO = async () => {
    if (!testUrl.trim()) {
      setTestError(uiLanguage === "zh" ? "请输入网址" : "Please enter a URL");
      return;
    }

    setTestLoading(true);
    setTestError(null);
    setTestResult(null);

    try {
      const requestBody: any = {
        url: testUrl,
        endpoint: testEndpoint,
        locationCode: 2840,
      };

      if (testEndpoint === "custom" && testCustomEndpoint) {
        requestBody.customEndpoint = testCustomEndpoint;
        requestBody.requestBody = [{
          target: testUrl.replace(/^https?:\/\//, '').split('/')[0],
          location_code: 2840,
        }];
      }

      const response = await fetch("/api/website-data/test-dataforseo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTestResult(result);
      } else {
        setTestError(result.error || result.details || "Unknown error");
      }
    } catch (error: any) {
      setTestError(error.message || "Network error");
    } finally {
      setTestLoading(false);
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
      {/* 测试面板 - 仅本地可见 */}
      {isLocal && (
        <Card className={cn(
          isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-yellow-50 border-yellow-200"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TestTube className={cn(
                  "w-5 h-5",
                  isDarkTheme ? "text-yellow-400" : "text-yellow-600"
                )} />
                <h3 className={cn(
                  "font-semibold",
                  isDarkTheme ? "text-yellow-400" : "text-yellow-700"
                )}>
                  {uiLanguage === "zh" ? "DataForSEO API 测试（仅本地）" : "DataForSEO API Test (Local Only)"}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTestPanel(!showTestPanel);
                  if (showTestPanel) {
                    setTestResult(null);
                    setTestError(null);
                  }
                }}
              >
                {showTestPanel ? (
                  <X className="w-4 h-4" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
              </Button>
            </div>

            {showTestPanel && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={uiLanguage === "zh" ? "输入网址，例如: example.com" : "Enter URL, e.g.: example.com"}
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        testDataForSEO();
                      }
                    }}
                    className={cn(
                      "flex-1",
                      isDarkTheme ? "bg-zinc-800 border-zinc-700" : "bg-white"
                    )}
                  />
                  <select
                    value={testEndpoint}
                    onChange={(e) => setTestEndpoint(e.target.value as any)}
                    className={cn(
                      "px-3 py-2 rounded-md border",
                      isDarkTheme ? "bg-zinc-800 border-zinc-700 text-white" : "bg-white border-gray-300"
                    )}
                  >
                    <option value="whois-overview">Whois Overview (推荐 - 包含 SEO 指标)</option>
                    <option value="overview">Overview (使用 target 参数)</option>
                    <option value="keywords">Keywords (尝试多个端点)</option>
                    <option value="keyword-data">Keyword Data</option>
                    <option value="custom">Custom (自定义端点)</option>
                  </select>
                  {testEndpoint === "custom" && (
                    <Input
                      type="text"
                      placeholder={uiLanguage === "zh" ? "端点路径，如: /dataforseo_labs/google/domain_analytics/live" : "Endpoint path, e.g.: /dataforseo_labs/google/domain_analytics/live"}
                      value={testCustomEndpoint}
                      onChange={(e) => setTestCustomEndpoint(e.target.value)}
                      className={cn(
                        "flex-1",
                        isDarkTheme ? "bg-zinc-800 border-zinc-700" : "bg-white"
                      )}
                    />
                  )}
                  <Button
                    onClick={testDataForSEO}
                    disabled={testLoading || !testUrl.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {testLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      uiLanguage === "zh" ? "测试" : "Test"
                    )}
                  </Button>
                </div>

                {testError && (
                  <div className={cn(
                    "p-3 rounded-md",
                    isDarkTheme ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-600"
                  )}>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{testError}</span>
                    </div>
                  </div>
                )}

                {testResult && (
                  <div className="space-y-2">
                    <div className={cn(
                      "p-3 rounded-md text-sm font-mono overflow-auto max-h-96",
                      isDarkTheme ? "bg-zinc-800 text-zinc-300" : "bg-gray-100 text-gray-800"
                    )}>
                      <div className="mb-2 font-semibold">
                        {uiLanguage === "zh" ? "响应内容：" : "Response:"}
                      </div>
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
