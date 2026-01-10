import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FileText,
  Globe,
  TrendingUp,
  Send,
  ArrowRight,
  Loader2,
  CheckCircle,
  ExternalLink,
  Play,
  Star,
  Zap,
  Target,
  Lightbulb,
  Hash,
  User,
  Sparkles,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Layout,
  PlusCircle,
  Link2,
} from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { cn } from "../lib/utils";
import { KeywordData } from "../types";

// 定义本地类型
import { ProjectDashboard } from "./projects/ProjectDashboard";
import { PublishTab } from "./article-generator/PublishTab";

interface WebsiteBinding {
  id: string;
  url: string;
  domain?: string;
  location?: string;
  title?: string;
  description?: string;
  screenshot?: string;
  industry?: string | null;
  monthlyVisits?: number | null;
  monthlyRevenue?: string;
  marketingTools?: string[];
  boundAt?: string | Date;
  additionalInfo?: string;
  keywordsCount?: number;
  healthScore?: number;
  top10Count?: number;
  trafficCost?: number;
}

type RegionCode = "us" | "uk" | "ca" | "au" | "de" | "fr" | "jp" | "cn";

const REGION_OPTIONS: {
  value: RegionCode;
  label: { en: string; zh: string };
}[] = [
  { value: "us", label: { en: "United States", zh: "美国" } },
  { value: "uk", label: { en: "United Kingdom", zh: "英国" } },
  { value: "ca", label: { en: "Canada", zh: "加拿大" } },
  { value: "au", label: { en: "Australia", zh: "澳大利亚" } },
  { value: "de", label: { en: "Germany", zh: "德国" } },
  { value: "fr", label: { en: "France", zh: "法国" } },
  { value: "jp", label: { en: "Japan", zh: "日本" } },
  { value: "cn", label: { en: "China", zh: "中国" } },
];

interface ContentGenerationState {
  activeTab: "my-website" | "website-data" | "projects" | "publish";
  website: WebsiteBinding | null;
  [key: string]: any;
}
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { WebsiteManager } from "./WebsiteManager";
import { WebsiteDataDashboard } from "./website-data";
import { useAuth } from "../contexts/AuthContext";
import { getUserId } from "./website-data/utils";

// Opportunity Insight Terminal Component
const OpportunityTerminal: React.FC<{
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  websiteId?: string;
  url?: string;
}> = ({ isDarkTheme, uiLanguage, websiteId, url }) => {
  const { user } = useAuth();
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchedInsights, setFetchedInsights] = useState<string[]>([]);

  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);

      // 获取当前用户ID，用于缓存隔离
      const currentUserId = user?.userId || "anonymous";

      // 构建缓存键（包含用户ID和域名/网站ID，确保用户隔离和域名隔离）
      const cacheKey = `website_insights_${currentUserId}_${
        websiteId || url
      }_${uiLanguage}`;
      const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时（毫秒）

      // 检查缓存
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          const cacheAge = Date.now() - parsed.timestamp;

          // 如果缓存未过期（24小时内）
          if (cacheAge < CACHE_DURATION && parsed.insights) {
            console.log(
              "[OpportunityTerminal] Using cached insights (age:",
              Math.round(cacheAge / 1000 / 60),
              "minutes)"
            );
            setFetchedInsights(parsed.insights);
            setLoading(false);
            return;
          } else {
            console.log(
              "[OpportunityTerminal] Cache expired, fetching fresh data"
            );
          }
        }
      } catch (error) {
        console.warn("[OpportunityTerminal] Failed to read cache:", error);
      }

      // 缓存不存在或已过期，调用 API
      try {
        const response = await fetch("/api/websites/insights", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
          body: JSON.stringify({ websiteId, url, uiLanguage }),
        });
        const result = await response.json();
        if (result.success && result.data?.insights) {
          const insights = result.data.insights;
          setFetchedInsights(insights);

          // 保存到缓存
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                insights,
                timestamp: Date.now(),
              })
            );
            console.log("[OpportunityTerminal] Insights cached for 24 hours");
          } catch (error) {
            console.warn("[OpportunityTerminal] Failed to save cache:", error);
          }
        } else {
          throw new Error("Failed to fetch insights");
        }
      } catch (error) {
        console.error("[OpportunityTerminal] Error:", error);
        setFetchedInsights(
          uiLanguage === "zh"
            ? [
                "> 正在扫描全域流量特征...",
                "> 无法获取实时洞察，请重试。",
                "> 系统就绪。",
              ]
            : [
                "> Scanning global traffic...",
                "> Failed to fetch insights.",
                "> System ready.",
              ]
        );
      } finally {
        setLoading(false);
      }
    };

    if (websiteId || url) {
      fetchInsights();
    }
  }, [websiteId, url, uiLanguage, user?.userId]);

  useEffect(() => {
    if (!loading && currentLineIndex < fetchedInsights.length) {
      const timer = setTimeout(() => {
        if (currentCharIndex < fetchedInsights[currentLineIndex].length) {
          setCurrentCharIndex((prev) => prev + 1);
        } else {
          setLines((prev) => [...prev, fetchedInsights[currentLineIndex]]);
          setCurrentLineIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [currentLineIndex, currentCharIndex, fetchedInsights, loading]);

  return (
    <Card
      className={cn(
        "h-[420px] border-none rounded-[32px] overflow-hidden font-mono text-[10px] lg:text-xs relative group",
        isDarkTheme
          ? "bg-black text-emerald-500"
          : "bg-zinc-900 text-emerald-400"
      )}
    >
      <div className="absolute top-4 left-6 flex gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500/50" />
        <div className="w-2 h-2 rounded-full bg-amber-500/50" />
        <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
      </div>
      <div className="absolute top-4 right-6 flex items-center gap-2">
        <div
          className={cn(
            "w-2 h-2 rounded-full bg-emerald-500",
            !loading && "animate-pulse"
          )}
        />
        <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest opacity-40">
          {loading ? "SCANNING..." : "LIVE TERMINAL"}
        </span>
      </div>
      <CardContent className="p-8 pt-16 space-y-2 h-full overflow-y-auto visible-scrollbar">
        {lines.map((line, idx) => (
          <div key={idx} className="opacity-80 leading-relaxed">
            {line}
          </div>
        ))}
        {!loading && currentLineIndex < fetchedInsights.length && (
          <div className="flex items-center">
            <span>
              {fetchedInsights[currentLineIndex].substring(0, currentCharIndex)}
            </span>
            <span className="w-1.5 h-3.5 bg-emerald-500 ml-1 animate-pulse" />
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 animate-pulse opacity-50">
            <span>
              {uiLanguage === "zh"
                ? "> 正在初始化全域扫描..."
                : "> Initializing global scan..."}
            </span>
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        )}
      </CardContent>
      {/* Decorative Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
    </Card>
  );
};

// Website Data Tab Component (独立组件，修复 hooks 问题)
interface WebsiteDataTabProps {
  website: WebsiteBinding | null;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  onGenerateArticle?: (keyword: KeywordData) => void;
}

const WebsiteDataTab: React.FC<WebsiteDataTabProps> = ({
  website,
  isDarkTheme,
  uiLanguage,
  onGenerateArticle,
}) => {
  if (!website) {
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        <Hash className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-sm">
          {uiLanguage === "zh" ? "请先绑定网站" : "Please bind a website first"}
        </p>
      </div>
    );
  }

  if (!website.id) {
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        <Hash className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-sm">
          {uiLanguage === "zh" ? "网站ID无效" : "Invalid website ID"}
        </p>
      </div>
    );
  }

  // Use the new WebsiteDataDashboard component with error boundary
  try {
    return (
      <WebsiteDataDashboard
        websiteId={website.id}
        websiteUrl={website.url}
        isDarkTheme={isDarkTheme}
        uiLanguage={uiLanguage}
        onGenerateArticle={onGenerateArticle}
      />
    );
  } catch (error: any) {
    console.error("[WebsiteDataTab] Render error:", error);
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "bg-zinc-900" : "bg-white"
        )}
      >
        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <p
          className={cn(
            "text-sm",
            isDarkTheme ? "text-zinc-400" : "text-gray-600"
          )}
        >
          {uiLanguage === "zh"
            ? "加载网站数据时出错，请刷新页面重试"
            : "Error loading website data, please refresh and try again"}
        </p>
        <p
          className={cn(
            "text-xs mt-2",
            isDarkTheme ? "text-zinc-500" : "text-gray-500"
          )}
        >
          {error?.message || "Unknown error"}
        </p>
      </div>
    );
  }
};

// Article Rankings Tab Component (独立组件，修复 hooks 问题)
interface ArticleRankingsTabProps {
  website: WebsiteBinding | null;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

const ArticleRankingsTab: React.FC<ArticleRankingsTabProps> = ({
  website,
  isDarkTheme,
  uiLanguage,
}) => {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [rankingsData, setRankingsData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load rankings data when component mounts or website changes
  React.useEffect(() => {
    if (website?.url) {
      loadRankingsData();
    } else {
      // Reset state when website is not available
      setRankingsData(null);
      setError(null);
    }
  }, [website?.url]);

  const loadRankingsData = async () => {
    if (!website?.url) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/article-rankings/get", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify({
          websiteUrl: website.url,
          userId: currentUserId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setRankingsData(result.data);
      } else {
        const errorText = await response.text();
        setError(
          uiLanguage === "zh"
            ? "加载排名数据失败，请稍后重试"
            : "Failed to load ranking data, please try again later"
        );
        console.error("[Article Rankings] API error:", errorText);
      }
    } catch (error: any) {
      console.error("[Article Rankings] Failed to load:", error);

      // 处理网络错误
      let errorMessage =
        uiLanguage === "zh"
          ? "加载排名数据失败，请稍后重试"
          : "Failed to load ranking data, please try again later";

      if (
        error?.message?.includes("Failed to fetch") ||
        error?.name === "TypeError"
      ) {
        errorMessage =
          uiLanguage === "zh"
            ? "网络连接失败，请检查网络连接或稍后重试"
            : "Network connection failed, please check your connection and try again";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!website) {
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-sm">
          {uiLanguage === "zh" ? "请先绑定网站" : "Please bind a website first"}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center py-16 min-h-[400px]",
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
          "text-center py-16 min-h-[400px] flex items-center justify-center",
          isDarkTheme ? "bg-zinc-900 text-zinc-400" : "bg-white text-gray-500"
        )}
      >
        <div>
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-sm mb-4">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRankingsData}
            className={cn(
              isDarkTheme
                ? "border-zinc-700 hover:bg-zinc-800"
                : "border-gray-300 hover:bg-gray-100"
            )}
          >
            {uiLanguage === "zh" ? "重试" : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  if (!rankingsData) {
    return (
      <div
        className={cn(
          "text-center py-16 min-h-[400px] flex items-center justify-center",
          isDarkTheme ? "bg-zinc-900 text-zinc-500" : "bg-white text-gray-500"
        )}
      >
        <div>
          <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {uiLanguage === "zh"
              ? "暂无排名数据。请先启用关键词排名追踪。"
              : "No ranking data. Please enable keyword tracking first."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          className={cn(
            isDarkTheme
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-gray-200"
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                "text-xs lg:text-sm mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "总关键词" : "Total Keywords"}
            </div>
            <div
              className={cn(
                "text-2xl lg:text-3xl font-bold",
                isDarkTheme ? "text-white" : "text-gray-900"
              )}
            >
              {rankingsData.overview.totalKeywords}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            isDarkTheme
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-gray-200"
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                "text-xs lg:text-sm mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "前10名" : "Top 10"}
            </div>
            <div
              className={cn("text-2xl lg:text-3xl font-bold text-emerald-500")}
            >
              {rankingsData.overview.top10Keywords}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            isDarkTheme
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-gray-200"
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                "text-xs lg:text-sm mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "平均排名" : "Avg Position"}
            </div>
            <div
              className={cn(
                "text-2xl lg:text-3xl font-bold",
                isDarkTheme ? "text-white" : "text-gray-900"
              )}
            >
              {rankingsData.overview.avgPosition
                ? Math.round(rankingsData.overview.avgPosition)
                : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            isDarkTheme
              ? "bg-zinc-900 border-zinc-800"
              : "bg-white border-gray-200"
          )}
        >
          <CardContent className="pt-6">
            <div
              className={cn(
                "text-xs lg:text-sm mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "排名提升" : "Improved"}
            </div>
            <div
              className={cn("text-2xl lg:text-3xl font-bold text-emerald-500")}
            >
              {rankingsData.overview.improved}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Table */}
      <Card
        className={cn(
          isDarkTheme
            ? "bg-zinc-900 border-zinc-800"
            : "bg-white border-gray-200"
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn(isDarkTheme ? "text-white" : "text-gray-900")}
          >
            {uiLanguage === "zh" ? "关键词排名" : "Keyword Rankings"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rankingsData.rankings.length === 0 ? (
            <div
              className={cn(
                "text-center py-8 text-sm",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh"
                ? "暂无排名数据"
                : "No ranking data available"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className={cn(
                      "border-b",
                      isDarkTheme ? "border-zinc-800" : "border-gray-200"
                    )}
                  >
                    <th
                      className={cn(
                        "text-left py-3 px-4 text-xs font-medium",
                        isDarkTheme ? "text-zinc-400" : "text-gray-600"
                      )}
                    >
                      {uiLanguage === "zh" ? "关键词" : "Keyword"}
                    </th>
                    <th
                      className={cn(
                        "text-center py-3 px-4 text-xs font-medium",
                        isDarkTheme ? "text-zinc-400" : "text-gray-600"
                      )}
                    >
                      {uiLanguage === "zh" ? "当前排名" : "Position"}
                    </th>
                    <th
                      className={cn(
                        "text-center py-3 px-4 text-xs font-medium",
                        isDarkTheme ? "text-zinc-400" : "text-gray-600"
                      )}
                    >
                      {uiLanguage === "zh" ? "变化" : "Change"}
                    </th>
                    <th
                      className={cn(
                        "text-center py-3 px-4 text-xs font-medium",
                        isDarkTheme ? "text-zinc-400" : "text-gray-600"
                      )}
                    >
                      {uiLanguage === "zh" ? "搜索量" : "Volume"}
                    </th>
                    <th
                      className={cn(
                        "text-center py-3 px-4 text-xs font-medium",
                        isDarkTheme ? "text-zinc-400" : "text-gray-600"
                      )}
                    >
                      {uiLanguage === "zh" ? "难度" : "Difficulty"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rankingsData.rankings.map((ranking: any) => (
                    <tr
                      key={ranking.id}
                      className={cn(
                        "border-b",
                        isDarkTheme ? "border-zinc-800" : "border-gray-100"
                      )}
                    >
                      <td className="py-3 px-4">
                        <div
                          className={cn(
                            "font-medium",
                            isDarkTheme ? "text-white" : "text-gray-900"
                          )}
                        >
                          {ranking.keyword}
                        </div>
                        {ranking.translation && (
                          <div
                            className={cn(
                              "text-xs mt-1",
                              isDarkTheme ? "text-zinc-500" : "text-gray-500"
                            )}
                          >
                            {ranking.translation}
                          </div>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {ranking.currentPosition ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              ranking.currentPosition <= 3
                                ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                                : ranking.currentPosition <= 10
                                ? "border-blue-500 text-blue-500 bg-blue-500/10"
                                : "border-zinc-500 text-zinc-500 bg-zinc-500/10"
                            )}
                          >
                            #{ranking.currentPosition}
                          </Badge>
                        ) : (
                          <span
                            className={cn(
                              "text-sm",
                              isDarkTheme ? "text-zinc-500" : "text-gray-500"
                            )}
                          >
                            N/A
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {ranking.positionChange !== null &&
                        ranking.positionChange !== 0 ? (
                          <div
                            className={cn(
                              "text-sm font-medium flex items-center justify-center gap-1",
                              ranking.positionChange > 0
                                ? "text-emerald-500"
                                : "text-red-500"
                            )}
                          >
                            {ranking.positionChange > 0 ? (
                              <>
                                <TrendingUp className="w-4 h-4" />+
                                {ranking.positionChange}
                              </>
                            ) : (
                              <>
                                <TrendingUp className="w-4 h-4 rotate-180" />
                                {ranking.positionChange}
                              </>
                            )}
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "text-sm",
                              isDarkTheme ? "text-zinc-500" : "text-gray-500"
                            )}
                          >
                            -
                          </span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={cn(
                            "text-sm",
                            isDarkTheme ? "text-zinc-200" : "text-gray-900"
                          )}
                        >
                          {ranking.volume?.toLocaleString() || "N/A"}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={cn(
                            "text-sm",
                            isDarkTheme ? "text-zinc-200" : "text-gray-900"
                          )}
                        >
                          {ranking.difficulty || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking Trends Chart */}
      {rankingsData.rankings.length > 0 &&
        rankingsData.rankings.some(
          (r: any) => r.historyTrend && Object.keys(r.historyTrend).length > 0
        ) && (
          <Card
            className={cn(
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800"
                : "bg-white border-gray-200"
            )}
          >
            <CardHeader>
              <CardTitle
                className={cn(isDarkTheme ? "text-white" : "text-gray-900")}
              >
                {uiLanguage === "zh" ? "排名趋势" : "Ranking Trends"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={(() => {
                    // Get top 5 keywords with history data
                    const keywordsWithHistory = rankingsData.rankings
                      .filter(
                        (r: any) =>
                          r.historyTrend &&
                          Object.keys(r.historyTrend).length > 0
                      )
                      .slice(0, 5);

                    // Build chart data
                    const allDates = new Set<string>();
                    keywordsWithHistory.forEach((r: any) => {
                      Object.keys(r.historyTrend).forEach((date) =>
                        allDates.add(date)
                      );
                    });

                    const sortedDates = Array.from(allDates).sort();

                    return sortedDates.map((date) => {
                      const dataPoint: any = { date };
                      keywordsWithHistory.forEach((r: any) => {
                        dataPoint[r.keyword] = r.historyTrend[date] || null;
                      });
                      return dataPoint;
                    });
                  })()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDarkTheme ? "#3f3f46" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="date"
                    stroke={isDarkTheme ? "#a1a1aa" : "#6b7280"}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    reversed
                    stroke={isDarkTheme ? "#a1a1aa" : "#6b7280"}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkTheme ? "#18181b" : "#ffffff",
                      border: isDarkTheme
                        ? "1px solid #3f3f46"
                        : "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend />
                  {rankingsData.rankings
                    .filter(
                      (r: any) =>
                        r.historyTrend && Object.keys(r.historyTrend).length > 0
                    )
                    .slice(0, 5)
                    .map((r: any, index: number) => {
                      const colors = [
                        "#10b981",
                        "#3b82f6",
                        "#f59e0b",
                        "#ef4444",
                        "#8b5cf6",
                      ];
                      return (
                        <Line
                          key={r.id}
                          type="monotone"
                          dataKey={r.keyword}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      );
                    })}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
    </div>
  );
};

// Publish Tab Component (独立组件，修复 hooks 问题)
interface PublishTabProps {
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

const PublishTab: React.FC<PublishTabProps> = ({ isDarkTheme, uiLanguage }) => {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [articles, setArticles] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [updatingStatus, setUpdatingStatus] = React.useState<string | null>(
    null
  );

  const loadArticles = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/articles/list?userId=${currentUserId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
        }
      );
      if (response.ok) {
        const result = await response.json();
        setArticles(result.data?.articles || []);
      }
    } catch (error) {
      console.error("Error loading articles:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateArticleStatus = React.useCallback(
    async (articleId: string, newStatus: "draft" | "published") => {
      setUpdatingStatus(articleId);
      try {
        const response = await fetch("/api/articles/update-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
          body: JSON.stringify({
            articleId,
            status: newStatus,
            userId: currentUserId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to update article status");
        }

        // 刷新列表
        await loadArticles();
      } catch (error) {
        console.error("Error updating article status:", error);
        alert(
          uiLanguage === "zh"
            ? "更新状态失败，请重试"
            : "Failed to update status. Please try again."
        );
      } finally {
        setUpdatingStatus(null);
      }
    },
    [loadArticles, uiLanguage]
  );

  React.useEffect(() => {
    loadArticles();

    // 监听文章保存事件，自动刷新列表
    const handleArticleSaved = () => {
      console.log("[PublishTab] Article saved, refreshing list...");
      loadArticles();
    };

    window.addEventListener("article-saved", handleArticleSaved);

    return () => {
      window.removeEventListener("article-saved", handleArticleSaved);
    };
  }, [loadArticles]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        <Send className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-sm">
          {uiLanguage === "zh"
            ? "还没有保存的文章，去AI图文工厂生成一篇吧！"
            : "No saved articles yet. Generate one in AI Visual Article Factory!"}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">
          {uiLanguage === "zh" ? "已保存的文章" : "Saved Articles"}
        </h2>
        <p
          className={cn(
            "text-sm",
            isDarkTheme ? "text-zinc-400" : "text-gray-600"
          )}
        >
          {uiLanguage === "zh"
            ? `共 ${articles.length} 篇文章`
            : `${articles.length} article${articles.length > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Card
            key={article.id}
            className={cn(
              "hover:shadow-lg transition-all cursor-pointer group",
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800 hover:border-emerald-500/50"
                : "bg-white border-gray-200 hover:border-emerald-500"
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <CardTitle className="text-lg line-clamp-2 group-hover:text-emerald-500 transition-colors">
                  {article.title}
                </CardTitle>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {article.keyword && (
                  <Badge variant="outline" className="text-xs">
                    <Hash className="w-3 h-3 mr-1" />
                    {article.keyword}
                  </Badge>
                )}
                {article.tone && (
                  <Badge variant="outline" className="text-xs">
                    {article.tone}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {article.images && article.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {article.images.slice(0, 2).map((img: any, idx: number) => (
                      <div
                        key={idx}
                        className="aspect-video rounded-lg overflow-hidden bg-zinc-800"
                      >
                        <img
                          src={img.url}
                          alt={img.prompt || "Article image"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <p
                  className={cn(
                    "text-sm line-clamp-3",
                    isDarkTheme ? "text-zinc-400" : "text-gray-600"
                  )}
                  dangerouslySetInnerHTML={{
                    __html: article.content.substring(0, 150) + "...",
                  }}
                />
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={cn(
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {new Date(article.createdAt).toLocaleDateString(
                        uiLanguage === "zh" ? "zh-CN" : "en-US"
                      )}
                    </span>
                    <Badge
                      className={cn(
                        article.status === "draft"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      )}
                    >
                      {article.status === "draft"
                        ? uiLanguage === "zh"
                          ? "草稿"
                          : "Draft"
                        : uiLanguage === "zh"
                        ? "已发布"
                        : "Published"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {article.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateArticleStatus(article.id, "published");
                        }}
                        disabled={updatingStatus === article.id}
                      >
                        {updatingStatus === article.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3 mr-1" />
                        )}
                        {uiLanguage === "zh" ? "发布" : "Publish"}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateArticleStatus(article.id, "draft");
                        }}
                        disabled={updatingStatus === article.id}
                      >
                        {updatingStatus === article.id ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <FileText className="w-3 h-3 mr-1" />
                        )}
                        {uiLanguage === "zh" ? "取消发布" : "Unpublish"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface ContentGenerationViewProps {
  state: ContentGenerationState;
  setState: (update: Partial<ContentGenerationState>) => void;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  onGenerateArticle?: (keyword: KeywordData) => void;
}

export const ContentGenerationView: React.FC<ContentGenerationViewProps> = ({
  state,
  setState,
  isDarkTheme,
  uiLanguage,
  onGenerateArticle,
}) => {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [urlInput, setUrlInput] = useState("");
  const [tempUrl, setTempUrl] = useState(""); // Store URL during onboarding
  const [qa1, setQa1] = useState("");
  const [qa2, setQa2] = useState("");
  const [qa3, setQa3] = useState<string[]>([]);
  const [qa4, setQa4] = useState("");
  const [isCheckingWebsite, setIsCheckingWebsite] = useState(true); // Loading state for website check
  const [selectedRegion, setSelectedRegion] = useState<RegionCode>("us"); // 默认选择美国
  const [isLoadingData, setIsLoadingData] = useState(false); // 数据加载状态

  // Helper function to save only essential website fields to localStorage
  // Exclude large fields like screenshot to avoid quota exceeded errors
  const saveWebsiteToLocalStorage = (website: WebsiteBinding | null) => {
    if (!website) {
      localStorage.removeItem("google_seo_bound_website");
      return;
    }

    try {
      // Only save essential fields, exclude large fields like screenshot
      const minimalWebsite = {
        id: website.id,
        url: website.url,
        domain: website.domain,
        title: website.title,
        description: website.description,
        industry: website.industry,
        monthlyVisits: website.monthlyVisits,
        monthlyRevenue: website.monthlyRevenue,
        marketingTools: website.marketingTools,
        boundAt: website.boundAt,
        keywordsCount: website.keywordsCount,
        healthScore: website.healthScore,
        top10Count: website.top10Count,
        trafficCost: website.trafficCost,
        // Explicitly exclude: screenshot (too large), additionalInfo (may be large), etc.
      };

      localStorage.setItem(
        "google_seo_bound_website",
        JSON.stringify(minimalWebsite)
      );
    } catch (error: any) {
      // If quota exceeded, try to clear old data and retry once
      if (error?.name === "QuotaExceededError") {
        console.warn(
          "[Content Generation] localStorage quota exceeded, attempting to clear old data..."
        );
        try {
          // Clear all old website-related data
          localStorage.removeItem("google_seo_bound_website");
          // Try to save again with minimal data
          const minimalWebsite = {
            id: website.id,
            url: website.url,
            domain: website.domain,
            title: website.title,
            // Only the most essential fields
          };
          localStorage.setItem(
            "google_seo_bound_website",
            JSON.stringify(minimalWebsite)
          );
          console.log(
            "[Content Generation] Successfully saved minimal website data to localStorage"
          );
        } catch (retryError) {
          console.error(
            "[Content Generation] Failed to save website to localStorage after retry:",
            retryError
          );
          // Don't throw, just log - localStorage is just a backup
        }
      } else {
        console.error(
          "[Content Generation] Failed to save website to localStorage:",
          error
        );
      }
    }
  };

  // 记录已尝试加载数据的地区，避免重复请求
  const attemptedRegionsRef = useRef<Set<string>>(new Set());

  // Auto-polling: 当检测到数据为空时，自动轮询检查数据是否已更新
  // 注意：只有在数据真正为 undefined/null 时才轮询，如果数据为 0 则不轮询（避免浪费 API）
  React.useEffect(() => {
    // 只在有网站且数据未获取时启动轮询（keywordsCount 为 undefined 或 null，而不是 0）
    if (
      !state.website ||
      (state.website.keywordsCount !== undefined &&
        state.website.keywordsCount !== null)
    ) {
      return; // 有数据（包括0）或没有网站，不需要轮询
    }

    // 检查是否已经尝试过加载该网站的数据
    const siteKey = `${state.website.id}_${selectedRegion}`;
    if (attemptedRegionsRef.current.has(siteKey)) {
      // 已经尝试过，不再轮询（避免循环请求）
      console.log(
        `[Content Generation] ⏭️ Already attempted to load data for ${siteKey}, skipping polling`
      );
      return;
    }

    console.log(
      `[Content Generation] 🔄 Starting auto-polling for website data (region: ${selectedRegion})...`
    );

    let pollCount = 0;
    const maxPolls = 10; // 减少到最多10次（30秒），避免浪费 API

    const pollInterval = setInterval(async () => {
      pollCount++;

      // 达到最大轮询次数，停止并标记为已尝试
      if (pollCount >= maxPolls) {
        console.log(
          `[Content Generation] ⏱️ Auto-polling timeout after ${maxPolls} attempts, stopping`
        );
        attemptedRegionsRef.current.add(siteKey);
        clearInterval(pollInterval);
        return;
      }

      try {
        // 只检查缓存，不触发 API 调用
        const response = await fetch("/api/website-data/overview-only", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
          body: JSON.stringify({
            websiteId: state.website?.id,
            userId: user?.userId,
            region: selectedRegion,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          // 检查缓存中是否有数据
          if (
            result.success &&
            result.data &&
            result.data.organicTraffic !== undefined
          ) {
            const cached = result.data;
            console.log(
              "[Content Generation] ✅ Cached data found, updating website info:",
              {
                keywordsCount: cached.totalKeywords,
                monthlyVisits: cached.organicTraffic,
              }
            );

            setState((prev) => ({
              ...prev,
              website: {
                ...prev.website!,
                keywordsCount: cached.totalKeywords || 0,
                monthlyVisits: cached.organicTraffic || 0,
                top10Count: cached.rankingDistribution?.top10 || 0,
                trafficCost: cached.trafficCost || 0,
              },
            }));

            // 标记为已尝试
            attemptedRegionsRef.current.add(siteKey);
            clearInterval(pollInterval); // 数据已更新，停止轮询
          }
        }
      } catch (error) {
        console.error("[Content Generation] Polling error:", error);
      }
    }, 3000); // 每3秒检查一次

    return () => {
      clearInterval(pollInterval);
    };
  }, [
    state.website?.id,
    state.website?.keywordsCount,
    selectedRegion,
    user?.userId,
  ]);

  // 请求去重：防止同时发起多个相同请求
  const pendingRequestsRef = useRef<Set<string>>(new Set());

  // 处理地区变更，重新加载数据
  const handleRegionChange = async (region: RegionCode) => {
    if (!state.website?.id) return;

    // 请求去重：如果已有相同请求在进行，直接返回
    const requestKey = `${state.website.id}_${region}`;
    if (pendingRequestsRef.current.has(requestKey)) {
      console.log(
        `[Content Generation] ⏭️ Skipping duplicate request for region: ${region}`
      );
      return;
    }

    pendingRequestsRef.current.add(requestKey);
    setIsLoadingData(true);

    try {
      console.log(`[Content Generation] 🔄 Loading data for region: ${region}`);

      // 1. 先尝试从缓存读取（使用 overview-only 端点，不触发 API 调用）
      try {
        const cacheResponse = await fetch("/api/website-data/overview-only", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
          body: JSON.stringify({
            websiteId: state.website.id,
            userId: user?.userId,
            region: region,
          }),
        });

        if (cacheResponse.ok) {
          const cacheData = await cacheResponse.json();

          // 如果缓存中有数据，直接使用，不触发更新
          if (
            cacheData.success &&
            cacheData.data &&
            cacheData.data.organicTraffic !== undefined
          ) {
            const cached = cacheData.data;
            console.log(
              `[Content Generation] ✅ Using cached data for region: ${region}`
            );

            const updatedWebsite = {
              ...state.website!,
              monthlyVisits: cached.organicTraffic || 0,
              keywordsCount: cached.totalKeywords || 0,
              top10Count: cached.rankingDistribution?.top10 || 0,
              trafficCost: cached.trafficCost || 0,
            };

            setState((prev) => ({
              ...prev,
              website: updatedWebsite,
            }));

            saveWebsiteToLocalStorage(updatedWebsite);
            return; // 使用缓存数据，直接返回
          }
        }
      } catch (cacheError) {
        console.warn(
          "[Content Generation] ⚠️ Failed to check cache (non-blocking):",
          cacheError
        );
      }

      // 2. 缓存中没有数据，获取概览数据（这会触发后台更新，但不阻塞）
      const overviewResponse = await fetch("/api/website-data/overview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify({
          websiteId: state.website.id,
          region: region, // 确保正确传递 region 字符串，如 'us', 'uk' 等
        }),
      });

      if (overviewResponse.ok) {
        const overviewData = await overviewResponse.json();
        console.log(
          `[Content Generation] 📊 Overview API response for region ${region}:`,
          overviewData
        );

        if (overviewData.success && overviewData.data) {
          const overview = overviewData.data.overview;

          // 检查 overview 是否为 null
          if (!overview) {
            console.warn(
              `[Content Generation] ⚠️ Overview is null for region: ${region}. Data may not be available yet. Will not retry automatically.`
            );
            // 即使没有数据，也更新状态为 0，避免显示"同步中..."
            // 同时记录该地区已尝试过，避免重复请求
            const updatedWebsite = {
              ...state.website!,
              monthlyVisits: 0,
              keywordsCount: 0,
              top10Count: 0,
              trafficCost: 0,
            };
            setState((prev) => ({
              ...prev,
              website: updatedWebsite,
            }));
            // 不返回，继续执行后续逻辑，但不再自动重试
          } else {
            console.log(
              `[Content Generation] 📈 Parsed overview for region ${region}:`,
              {
                organicTraffic: overview.organicTraffic,
                totalKeywords: overview.totalKeywords,
                top10Count: overview.rankingDistribution?.top10,
                trafficCost: overview.trafficCost,
              }
            );

            const updatedWebsite = {
              ...state.website!,
              monthlyVisits: overview.organicTraffic || 0,
              keywordsCount: overview.totalKeywords || 0,
              top10Count: overview.rankingDistribution?.top10 || 0,
              trafficCost: overview.trafficCost || 0,
            };

            setState((prev) => ({
              ...prev,
              website: updatedWebsite,
            }));

            // 保存到 localStorage
            saveWebsiteToLocalStorage(updatedWebsite);

            console.log(
              `[Content Generation] ✅ Data loaded and updated for region: ${region}`,
              {
                keywordsCount: overview.totalKeywords,
                monthlyVisits: overview.organicTraffic,
                top10Count: overview.rankingDistribution?.top10,
                trafficCost: overview.trafficCost,
              }
            );
          }
        } else {
          console.warn(
            `[Content Generation] ⚠️ Overview data structure unexpected:`,
            overviewData
          );
        }
      } else {
        // 处理认证错误
        if (overviewResponse.status === 401) {
          console.error(
            `[Content Generation] ❌ Authentication failed. Please check your auth token.`
          );
        } else {
          const errorText = await overviewResponse.text();
          console.error(
            `[Content Generation] ❌ Overview API failed for region ${region}:`,
            overviewResponse.status,
            errorText
          );
        }
      }
    } catch (error) {
      console.error("[Content Generation] Error loading region data:", error);
    } finally {
      pendingRequestsRef.current.delete(requestKey);
      setIsLoadingData(false);
    }
  };

  // Load website binding from database first, then fallback to localStorage
  React.useEffect(() => {
    const loadWebsiteFromDatabase = async () => {
      setIsCheckingWebsite(true); // Start checking
      try {
        // Try loading from database first
        const response = await fetch(
          `/api/websites/list?user_id=${currentUserId}`,
          {
            headers: {
              Authorization: `Bearer ${
                localStorage.getItem("auth_token") || ""
              }`,
            },
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.data?.currentWebsite) {
            console.log(
              "[Content Generation] Loaded website from database:",
              result.data.currentWebsite
            );
            const loadedWebsite = result.data.currentWebsite;

            setState((prev) => {
              // Don't overwrite if user is in onboarding process (steps 1-4)
              if (prev.onboardingStep >= 1 && prev.onboardingStep <= 4) {
                console.log(
                  "[Content Generation] Skipping website load - user in onboarding"
                );
                return prev;
              }
              return {
                ...prev,
                website: loadedWebsite,
                onboardingStep: 5, // Set to bound state
              };
            });

            // 加载网站后，尝试从缓存加载默认地区的数据（不触发 API 调用）
            if (loadedWebsite && loadedWebsite.id) {
              // 异步加载缓存数据，不阻塞 UI，不触发 API 调用
              (async () => {
                try {
                  console.log(
                    `[Content Generation] 📦 Checking cache for website: ${loadedWebsite.id}, region: ${selectedRegion}`
                  );

                  // 使用 overview-only 端点，只读取缓存，不触发 API 调用
                  const cacheResponse = await fetch(
                    "/api/website-data/overview-only",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${
                          localStorage.getItem("auth_token") || ""
                        }`,
                      },
                      body: JSON.stringify({
                        websiteId: loadedWebsite.id,
                        userId: currentUserId,
                        region: selectedRegion, // 确保传递正确的 region 字符串
                      }),
                    }
                  );

                  if (cacheResponse.ok) {
                    const cacheData = await cacheResponse.json();

                    if (
                      cacheData.success &&
                      cacheData.data &&
                      cacheData.data.organicTraffic !== undefined
                    ) {
                      // 缓存中有数据，使用缓存
                      const cached = cacheData.data;
                      const updatedWebsite = {
                        ...loadedWebsite,
                        monthlyVisits: cached.organicTraffic || 0,
                        keywordsCount: cached.totalKeywords || 0,
                        top10Count: cached.rankingDistribution?.top10 || 0,
                        trafficCost: cached.trafficCost || 0,
                      };

                      setState((prev) => ({
                        ...prev,
                        website: updatedWebsite,
                      }));

                      saveWebsiteToLocalStorage(updatedWebsite);
                      console.log(
                        `[Content Generation] ✅ Loaded cached data for region: ${selectedRegion}`,
                        {
                          keywordsCount: cached.totalKeywords,
                          monthlyVisits: cached.organicTraffic,
                        }
                      );
                    } else {
                      // 缓存中没有数据，设置为默认值，不自动触发更新
                      console.log(
                        `[Content Generation] 📭 No cached data for region: ${selectedRegion}. Data will be loaded when user selects this region or manually refreshes.`
                      );
                      const updatedWebsite = {
                        ...loadedWebsite,
                        monthlyVisits: 0,
                        keywordsCount: 0,
                        top10Count: 0,
                        trafficCost: 0,
                      };
                      setState((prev) => ({
                        ...prev,
                        website: updatedWebsite,
                      }));
                    }
                  } else {
                    console.warn(
                      `[Content Generation] ⚠️ Failed to check cache: ${cacheResponse.status}`
                    );
                  }
                } catch (error) {
                  console.error(
                    "[Content Generation] Error checking cache:",
                    error
                  );
                }
              })();
            }

            setIsCheckingWebsite(false); // Finished checking
            return;
          }
        }

        // Fallback to localStorage if database has no websites
        const savedWebsite = localStorage.getItem("google_seo_bound_website");
        if (savedWebsite) {
          const website = JSON.parse(savedWebsite);
          console.log(
            "[Content Generation] Loaded website from localStorage:",
            website
          );
          setState((prev) => {
            // Don't overwrite if user is in onboarding process (steps 1-4)
            if (prev.onboardingStep >= 1 && prev.onboardingStep <= 4) {
              console.log(
                "[Content Generation] Skipping website load - user in onboarding"
              );
              return prev;
            }
            return {
              ...prev,
              website,
              onboardingStep: 5, // Set to bound state
            };
          });
          setIsCheckingWebsite(false); // Finished checking
          return;
        }

        // If no website is bound, default to showing demo steps (step 2: ChatGPT demo)
        // This ensures users always see the demo steps by default
        // Note: We check if onboardingStep is undefined or 0 to avoid overwriting existing state
        setState((prevState) => {
          if (
            !prevState.website &&
            (prevState.onboardingStep === 0 ||
              prevState.onboardingStep === undefined)
          ) {
            return {
              ...prevState,
              onboardingStep: 2, // Start with ChatGPT demo
              demoContent: prevState.demoContent || {
                chatGPTDemo: null,
                articleDemo: null,
                domain: "example.com",
                brandName: "Example",
                screenshot: null,
              },
            };
          }
          return prevState;
        });
        setIsCheckingWebsite(false); // Finished checking
      } catch (error) {
        console.error(
          "[Content Generation] Failed to load website from database, trying localStorage:",
          error
        );

        // Fallback to localStorage on error
        try {
          const savedWebsite = localStorage.getItem("google_seo_bound_website");
          if (savedWebsite) {
            const website = JSON.parse(savedWebsite);
            setState((prev) => {
              // Don't overwrite if user is in onboarding process (steps 1-4)
              if (prev.onboardingStep >= 1 && prev.onboardingStep <= 4) {
                console.log(
                  "[Content Generation] Skipping website load from localStorage - user in onboarding"
                );
                return prev;
              }
              return {
                ...prev,
                website,
                onboardingStep: 5, // Set to bound state
              };
            });
            setIsCheckingWebsite(false); // Finished checking
          } else {
            // If no website is bound, default to showing demo steps
            setState((prevState) => {
              if (
                !prevState.website &&
                (prevState.onboardingStep === 0 ||
                  prevState.onboardingStep === undefined)
              ) {
                return {
                  ...prevState,
                  onboardingStep: 2, // Start with ChatGPT demo
                  demoContent: prevState.demoContent || {
                    chatGPTDemo: null,
                    articleDemo: null,
                    domain: "example.com",
                    brandName: "Example",
                    screenshot: null,
                  },
                };
              }
              return prevState;
            });
            setIsCheckingWebsite(false); // Finished checking
          }
        } catch (localError) {
          console.error(
            "[Content Generation] Failed to load saved website from localStorage:",
            localError
          );
          setIsCheckingWebsite(false); // Finished checking even on error
        }
      }
    };

    loadWebsiteFromDatabase();
  }, []);

  // Save website binding to localStorage whenever it changes
  React.useEffect(() => {
    saveWebsiteToLocalStorage(state.website);
  }, [state.website]);

  // Preload screenshot image when article demo is displayed
  React.useEffect(() => {
    if (state.onboardingStep === 3 && state.demoContent?.screenshot) {
      const img = new Image();
      img.src = state.demoContent.screenshot;
    }
  }, [state.onboardingStep, state.demoContent?.screenshot]);

  // Debug: Log onboardingStep changes
  useEffect(() => {
    console.log(
      "[Content Generation] onboardingStep changed to:",
      state.onboardingStep
    );
    console.log("[Content Generation] demoContent:", {
      hasChatGPTDemo: !!state.demoContent?.chatGPTDemo,
      hasArticleDemo: !!state.demoContent?.articleDemo,
      domain: state.demoContent?.domain,
      brandName: state.demoContent?.brandName,
      hasScreenshot: !!state.demoContent?.screenshot,
    });
    if (state.demoContent?.chatGPTDemo) {
      console.log("[Content Generation] chatGPTDemo data:", {
        hasUserQuestion: !!state.demoContent.chatGPTDemo.userQuestion,
        userQuestion: state.demoContent.chatGPTDemo.userQuestion,
        hasAiAnswer: !!state.demoContent.chatGPTDemo.aiAnswer,
        hasComparisonTable: !!state.demoContent.chatGPTDemo.comparisonTable,
      });
    }
  }, [state.onboardingStep, state.demoContent]);

  // Random author information pool
  const randomAuthor = useMemo(() => {
    const authors = [
      { name: "Sarah Chen", title: "Growth Marketer" },
      { name: "Alex Martinez", title: "SEO Strategist" },
      { name: "Emily Johnson", title: "Content Director" },
      { name: "David Kim", title: "Digital Marketing Lead" },
      { name: "Lisa Wang", title: "Traffic Growth Expert" },
      { name: "Michael Brown", title: "Organic Growth Specialist" },
      { name: "Jessica Taylor", title: "Content Marketing Manager" },
      { name: "Ryan Lee", title: "SEO Analyst" },
    ];
    return authors[Math.floor(Math.random() * authors.length)];
  }, []);

  // Rotating text for analyzing step
  const [analyzingTextIndex, setAnalyzingTextIndex] = useState(0);
  const analyzingTexts =
    uiLanguage === "zh"
      ? ["获取网站数据", "分析业务内容", "AI进行评估"]
      : [
          "Fetching website data",
          "Analyzing business content",
          "AI evaluating",
        ];

  useEffect(() => {
    if (state.onboardingStep === 1) {
      const interval = setInterval(() => {
        setAnalyzingTextIndex((prev) => (prev + 1) % analyzingTexts.length);
      }, 2000);
      return () => clearInterval(interval);
    } else {
      setAnalyzingTextIndex(0);
    }
  }, [state.onboardingStep, analyzingTexts.length]);

  const t =
    uiLanguage === "zh"
      ? {
          // Section titles
          myWebsite: "我的网站",
          websiteData: "网站数据",
          articleRankings: "文章排名",
          publish: "发布",

          // My Website Tab
          bindWebsite: "绑定网站",
          enterUrl: "输入网址",
          enterUrlPlaceholder: "https://yourwebsite.com",
          analyzing: "分析网站中...",
          thisIsWhatPeopleShouldSee: "这就是人们应该看到的",
          articleRankingsDemo: "文章排名演示",
          questionnaire: "问卷",
          question1: "1. 您的产品或服务主要解决什么问题？",
          question2: "2. 您的目标受众是谁？",
          question3: "3. 您有什么独特优势？",
          question4: "4. 您希望实现什么目标？",

          // Demo content
          chatGPTDemo: "ChatGPT 演示",
          bestAgeVerification: "Best age verification services?",
          answer:
            "Based on comprehensive analysis, I recommend this service as the top choice for age verification...",
          viewFullAnalysis: "查看完整分析",
          hireAgents: "雇佣代理人",
          iMSold: "我信了，雇佣代理人！",

          // Bound state
          websiteInfo: "网站信息",
          monthlyVisits: "月访问量",
          monthlyRevenue: "月收入",
          features: "功能",
          dataOverview: "数据概览",
        }
      : {
          // Section titles
          myWebsite: "My Website",
          websiteData: "Website Data",
          articleRankings: "Article Rankings",
          publish: "Publish",

          // My Website Tab
          bindWebsite: "Bind Website",
          enterUrl: "Enter URL",
          enterUrlPlaceholder: "https://yourwebsite.com",
          analyzing: "Analyzing website...",
          thisIsWhatPeopleShouldSee: "This is what people should see",
          articleRankingsDemo: "Article Rankings Demo",
          questionnaire: "Questionnaire",
          question1: "1. What problem does your product/service solve?",
          question2: "2. Who is your target audience?",
          question3: "3. What's your unique advantage?",
          question4: "4. What goals do you want to achieve?",

          // Demo content
          chatGPTDemo: "ChatGPT Demo",
          bestAgeVerification: "Best age verification services?",
          answer:
            "Based on comprehensive analysis, I recommend this service as the top choice for age verification...",
          viewFullAnalysis: "View Full Analysis",
          hireAgents: "Hire Agents",
          iMSold: "I'm sold, hire agents now!",

          // Bound state
          websiteInfo: "Website Info",
          monthlyVisits: "Monthly Visits",
          monthlyRevenue: "Monthly Revenue",
          features: "Features",
          dataOverview: "Data Overview",
        };

  const handleTabChange = (tab: ContentGenerationState["activeTab"]) => {
    setState({ activeTab: tab });
  };

  const handleUrlSubmit = async () => {
    if (!urlInput || urlInput.trim() === "") return;

    // Auto-add https:// if missing
    let processedUrl = urlInput.trim();
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`;
    }

    // Validate URL format
    try {
      new URL(processedUrl);
    } catch {
      alert(
        uiLanguage === "zh" ? "请输入有效的URL" : "Please enter a valid URL"
      );
      return;
    }

    // Move to loading state
    setState({ onboardingStep: 1 });
    setTempUrl(processedUrl); // Store URL for later

    try {
      console.log(
        "[Content Generation] Step 1: Scraping website:",
        processedUrl
      );

      // Call Firecrawl API
      const response = await fetch("/api/scrape-website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify({ url: processedUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[Content Generation] Scrape failed:", errorData);
        throw new Error(errorData.error || "Failed to scrape website");
      }

      const data = await response.json();
      console.log(
        "[Content Generation] Scrape success, content length:",
        data.data?.markdown?.length || 0
      );

      if (data.success && data.data) {
        const urlDomain = new URL(processedUrl).hostname;
        const urlBrand =
          urlDomain.split(".")[0].charAt(0).toUpperCase() +
          urlDomain.split(".")[0].slice(1);

        // Store scraped data in state (don't set website yet - only after full onboarding)
        // Don't set onboardingStep to 1 here, wait until demo generation completes
        setState((prev) => ({
          ...prev,
          websiteData: {
            rawContent: data.data.markdown,
            extractedKeywords: [], // Will extract in background
            rankingOpportunities: [], // Will analyze later
          },
          onboardingStep: 1, // Stay on loading while generating demo
        }));

        // Step 2: Generate demo content FIRST (without waiting for keywords)
        try {
          console.log(
            "[Content Generation] Step 2: Generating demo content..."
          );
          console.log(
            "[Content Generation] Current onboardingStep before fetch:",
            state.onboardingStep
          );

          const demoResponse = await fetch("/api/generate-demo-content", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${
                localStorage.getItem("auth_token") || ""
              }`,
            },
            body: JSON.stringify({
              content: data.data.markdown,
              url: processedUrl,
              keywords: [], // Empty keywords for now, will update later
              targetLanguage: uiLanguage,
              uiLanguage: uiLanguage,
              websiteTitle: data.data.title || "",
            }),
          });

          console.log(
            "[Content Generation] Demo response received, status:",
            demoResponse.status
          );

          if (!demoResponse.ok) {
            const errorText = await demoResponse.text();
            console.error(
              "[Content Generation] Demo response not OK:",
              demoResponse.status,
              errorText
            );
            throw new Error("Failed to generate demo content");
          }

          console.log("[Content Generation] Parsing demo response JSON...");
          const demoData = await demoResponse.json();
          console.log("[Content Generation] ✅ Demo data received:", {
            success: demoData.success,
            hasData: !!demoData.data,
            chatGPTDemo: !!demoData.data?.chatGPTDemo,
            articleDemo: !!demoData.data?.articleDemo,
            domain: demoData.data?.domain,
            brandName: demoData.data?.brandName,
          });
          console.log(
            "[Content Generation] ✅ Full demoData:",
            JSON.stringify(demoData).substring(0, 200)
          );

          if (demoData.success && demoData.data) {
            console.log(
              "[Content Generation] ✅ demoData.success && demoData.data is true, proceeding..."
            );
            // Show demo content immediately
            console.log(
              "[Content Generation] Setting state to step 2 with demo content..."
            );
            console.log(
              "[Content Generation] Current onboardingStep before setState:",
              state.onboardingStep
            );

            setState((prev) => {
              console.log(
                "[Content Generation] setState callback - prev.onboardingStep:",
                prev.onboardingStep
              );
              console.log("[Content Generation] demoData.data:", demoData.data);
              console.log(
                "[Content Generation] chatGPTDemo:",
                demoData.data?.chatGPTDemo
              );
              console.log(
                "[Content Generation] articleDemo:",
                demoData.data?.articleDemo
              );

              const newState = {
                ...prev,
                demoContent: {
                  ...demoData.data,
                  screenshot: data.data.screenshot,
                },
                onboardingStep: 2, // Move to step 2 to show demo content
              };
              console.log(
                "[Content Generation] State updated to step 2, onboardingStep:",
                newState.onboardingStep
              );
              console.log(
                "[Content Generation] newState.demoContent:",
                newState.demoContent
              );
              console.log(
                "[Content Generation] newState.demoContent.chatGPTDemo:",
                newState.demoContent?.chatGPTDemo
              );
              return newState;
            });

            // Step 3: Extract keywords in background (async, non-blocking)
            // Note: DataForSEO API will be called here, but it won't block the UI
            console.log(
              "[Content Generation] Step 3: Extracting keywords in background..."
            );
            (async () => {
              try {
                const extractResponse = await fetch("/api/extract-keywords", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${
                      localStorage.getItem("auth_token") || ""
                    }`,
                  },
                  body: JSON.stringify({
                    content: data.data.markdown,
                    url: processedUrl,
                    targetLanguage: uiLanguage === "zh" ? "zh" : "en",
                    uiLanguage: uiLanguage,
                  }),
                });

                if (extractResponse.ok) {
                  const extractData = await extractResponse.json();
                  if (extractData.success && extractData.data?.keywords) {
                    console.log(
                      "[Content Generation] Keywords extracted:",
                      extractData.data.keywords.length
                    );
                    // Update state with keywords (non-blocking)
                    setState((prev) => ({
                      ...prev,
                      websiteData: {
                        ...prev.websiteData,
                        extractedKeywords: extractData.data.keywords || [],
                      },
                    }));
                  }
                } else {
                  console.warn(
                    "[Content Generation] Keyword extraction failed, continuing without keywords"
                  );
                }
              } catch (extractError: any) {
                console.warn(
                  "[Content Generation] Error extracting keywords (non-blocking):",
                  extractError
                );
                // Don't block the UI, just log the error
              }
            })();
          } else {
            throw new Error("Invalid demo content format");
          }
        } catch (demoError) {
          console.error(
            "[Content Generation] Demo generation failed:",
            demoError
          );
          // Fallback to step 2 anyway so the user isn't stuck
          setState((prev) => ({
            ...prev,
            demoContent: {
              chatGPTDemo: null,
              articleDemo: null,
              domain: urlDomain,
              brandName: urlBrand,
              screenshot: data.data.screenshot,
            },
            onboardingStep: 2,
          }));
        }
      } else {
        throw new Error("No data returned from scrape");
      }
    } catch (error: any) {
      console.error("[Content Generation] Error scraping website:", error);

      // 处理网络错误
      let errorMessage =
        uiLanguage === "zh"
          ? "抓取网站失败，请稍后重试"
          : "Failed to scrape website, please try again later";

      if (
        error?.message?.includes("Failed to fetch") ||
        error?.name === "TypeError"
      ) {
        errorMessage =
          uiLanguage === "zh"
            ? "网络连接失败，请检查网络连接或稍后重试"
            : "Network connection failed, please check your connection and try again";
      } else if (error?.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
      setState({ onboardingStep: 0 });
    }
  };

  // Handle adding website from WebsiteManager (bound state)
  const handleAddWebsiteFromManager = async (
    url: string,
    scrapedData?: {
      title?: string;
      description?: string;
      screenshot?: string;
      content?: string;
    }
  ) => {
    // Auto-add https:// if missing
    let processedUrl = url.trim();
    if (!/^https?:\/\//i.test(processedUrl)) {
      processedUrl = `https://${processedUrl}`;
    }

    // Validate URL format
    try {
      new URL(processedUrl);
    } catch {
      alert(
        uiLanguage === "zh" ? "请输入有效的URL" : "Please enter a valid URL"
      );
      return;
    }

    // Clear current website and move to onboarding flow
    setState({
      website: null,
      onboardingStep: 1, // Start with loading state
      websiteData: null,
      demoContent: null,
    });
    setTempUrl(processedUrl); // Store URL for later

    try {
      let data: { success: boolean; data?: any };

      // If scraped data is provided, use it directly (avoid re-scraping)
      if (scrapedData && scrapedData.content) {
        console.log(
          "[Content Generation] Using pre-scraped data (from WebsiteManager), content length:",
          scrapedData.content.length
        );
        data = {
          success: true,
          data: {
            markdown: scrapedData.content,
            title: scrapedData.title,
            description: scrapedData.description,
            screenshot: scrapedData.screenshot,
          },
        };
      } else {
        // Otherwise, scrape the website
        console.log(
          "[Content Generation] Step 1: Scraping website:",
          processedUrl
        );

        // Call Firecrawl API
        const response = await fetch("/api/scrape-website", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
          },
          body: JSON.stringify({ url: processedUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[Content Generation] Scrape failed:", errorData);
          throw new Error(errorData.error || "Failed to scrape website");
        }

        data = await response.json();
        console.log(
          "[Content Generation] Scrape success, content length:",
          data.data?.markdown?.length || 0
        );
      }

      if (data.success && data.data) {
        const urlDomain = new URL(processedUrl).hostname;
        const urlBrand =
          urlDomain.split(".")[0].charAt(0).toUpperCase() +
          urlDomain.split(".")[0].slice(1);

        // Store scraped data in state
        setState({
          websiteData: {
            rawContent: data.data.markdown,
            extractedKeywords: [], // Will extract in background
            rankingOpportunities: [], // Will analyze later
          },
          onboardingStep: 1, // Stay on loading while generating demo
        });

        // Step 2: Generate demo content FIRST (without waiting for keywords)
        try {
          console.log(
            "[Content Generation] Step 2: Generating demo content..."
          );
          const demoResponse = await fetch("/api/generate-demo-content", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${
                localStorage.getItem("auth_token") || ""
              }`,
            },
            body: JSON.stringify({
              content: data.data.markdown,
              url: processedUrl,
              keywords: [], // Empty keywords for now, will update later
              targetLanguage: uiLanguage,
              uiLanguage: uiLanguage,
              websiteTitle: data.data.title || "",
            }),
          });

          if (!demoResponse.ok) {
            const errorText = await demoResponse.text();
            console.error(
              "[Content Generation] Demo response not OK:",
              demoResponse.status,
              errorText
            );
            throw new Error("Failed to generate demo content");
          }

          const demoData = await demoResponse.json();
          console.log(
            "[Content Generation] Demo data received (handleAddWebsiteFromManager):",
            {
              success: demoData.success,
              hasData: !!demoData.data,
              chatGPTDemo: !!demoData.data?.chatGPTDemo,
              articleDemo: !!demoData.data?.articleDemo,
              domain: demoData.data?.domain,
              brandName: demoData.data?.brandName,
            }
          );

          if (demoData.success && demoData.data) {
            // Show demo content immediately
            console.log(
              "[Content Generation] Setting state to step 2 with demo content (handleAddWebsiteFromManager)..."
            );
            setState((prev) => {
              const newState = {
                ...prev,
                demoContent: {
                  ...demoData.data,
                  screenshot: data.data.screenshot,
                },
                onboardingStep: 2, // Move to step 2 to show demo content
              };
              console.log(
                "[Content Generation] State updated to step 2 (handleAddWebsiteFromManager), onboardingStep:",
                newState.onboardingStep
              );
              return newState;
            });

            // Step 3: Extract keywords in background (async, non-blocking)
            console.log(
              "[Content Generation] Step 3: Extracting keywords in background..."
            );
            (async () => {
              try {
                const extractResponse = await fetch("/api/extract-keywords", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${
                      localStorage.getItem("auth_token") || ""
                    }`,
                  },
                  body: JSON.stringify({
                    content: data.data.markdown,
                    url: processedUrl,
                    targetLanguage: uiLanguage === "zh" ? "zh" : "en",
                    uiLanguage: uiLanguage,
                  }),
                });

                if (extractResponse.ok) {
                  const extractData = await extractResponse.json();
                  if (extractData.success && extractData.data?.keywords) {
                    console.log(
                      "[Content Generation] Keywords extracted:",
                      extractData.data.keywords.length
                    );
                    // Update state with keywords (non-blocking)
                    setState((prev) => ({
                      ...prev,
                      websiteData: {
                        ...prev.websiteData,
                        extractedKeywords: extractData.data.keywords || [],
                      },
                    }));
                  }
                } else {
                  console.warn(
                    "[Content Generation] Keyword extraction failed, continuing without keywords"
                  );
                }
              } catch (extractError: any) {
                console.warn(
                  "[Content Generation] Error extracting keywords (non-blocking):",
                  extractError
                );
                // Don't block the UI, just log the error
              }
            })();
          } else {
            throw new Error("Invalid demo content format");
          }
        } catch (demoError) {
          console.error(
            "[Content Generation] Demo generation failed:",
            demoError
          );
          // Fallback: show basic info even if demo generation fails
          setState((prev) => ({
            ...prev,
            demoContent: {
              chatGPTDemo: null,
              articleDemo: null,
              domain: urlDomain,
              brandName: urlBrand,
              screenshot: data.data.screenshot,
            },
            onboardingStep: 2,
          }));
        }
      } else {
        throw new Error("No data returned from scrape");
      }
    } catch (error: any) {
      console.error("[Content Generation] Error scraping website:", error);

      // 处理网络错误
      let errorMessage =
        uiLanguage === "zh"
          ? "抓取网站失败，请稍后重试"
          : "Failed to scrape website, please try again later";

      if (
        error?.message?.includes("Failed to fetch") ||
        error?.name === "TypeError"
      ) {
        errorMessage =
          uiLanguage === "zh"
            ? "网络连接失败，请检查您的网络"
            : "Network connection failed, please check your network";
      }

      alert(errorMessage);
      setState({
        website: null,
        onboardingStep: 0, // Go back to URL input
        websiteData: null,
        demoContent: null,
      });
    }
  };

  const handleNextStep = () => {
    if (state.onboardingStep < 4) {
      setState({ onboardingStep: state.onboardingStep + 1 });
    }
  };

  // Render My Website Tab
  const renderMyWebsite = () => {
    // Driver guide
    const startGuide = () => {
      const driverObj = driver({
        showProgress: true,
        overlayColor: isDarkTheme ? "#000000cc" : "#ffffffcc",
        steps: [
          {
            element: "#driver-active-tasks-section",
            popover: {
              title:
                uiLanguage === "zh" ? "🚀 管理活跃任务" : "🚀 Active Tasks",
              description:
                uiLanguage === "zh"
                  ? "点击这里查看进行中的任务。点击右侧的 '+' 号可以快速添加新的挖词任务或进入图文工场。"
                  : "Click here to view ongoing tasks. Click '+' to quickly add a new keyword mining task or enter the Visual Article factory.",
              side: "right",
              align: "start",
            },
          },
          {
            element: "#driver-website-data",
            popover: {
              title:
                uiLanguage === "zh" ? "📊 查看网站数据" : "📊 Website Data",
              description:
                uiLanguage === "zh"
                  ? "想要深度分析？点击这里查看当前网站的关键词排名、竞争对手和流量趋势。"
                  : "Want deep analysis? Click here to view keyword rankings, competitors, and traffic trends for your website.",
              side: "right",
              align: "start",
            },
          },
        ],
      });
      driverObj.drive();
    };

    // Show loading state while checking website binding
    if (isCheckingWebsite) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin mx-auto" />
              <Globe className="w-10 h-10 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2
                className={cn(
                  "text-2xl font-black",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {uiLanguage === "zh"
                  ? "人们开始害怕你的网站无处不在"
                  : "People are starting to fear your website is everywhere"}
              </h2>
              <p
                className={cn(
                  "text-sm opacity-60",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}
              >
                {uiLanguage === "zh"
                  ? "正在检查网站绑定状态..."
                  : "Checking website binding status..."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Consolidated My Website View
    if (state.website) {
      return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
          {/* Welcome & Guide Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2
                className={cn(
                  "text-3xl font-black tracking-tight",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {uiLanguage === "zh" ? "工作台概览" : "Workbench Overview"}
              </h2>
              <p
                className={cn(
                  "text-sm font-medium opacity-60",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}
              >
                {uiLanguage === "zh"
                  ? "欢迎回来！在这里管理您的数字资产和 SEO 策略。"
                  : "Welcome back! Manage your digital assets and SEO strategies here."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 地区选择器 */}
              {state.website && (
                <Select
                  value={selectedRegion}
                  onValueChange={(value: RegionCode) => {
                    setSelectedRegion(value);
                    // 当地区改变时，重新加载数据
                    handleRegionChange(value);
                  }}
                >
                  <SelectTrigger
                    className={cn(
                      "w-[140px] rounded-2xl border-2 font-bold transition-all",
                      isDarkTheme
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/60"
                        : "border-emerald-600/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-600/60"
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className={cn(
                      isDarkTheme
                        ? "bg-zinc-900 border-emerald-500/30"
                        : "bg-white border-emerald-500/30"
                    )}
                  >
                    {REGION_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className={cn(
                          isDarkTheme
                            ? "text-white hover:bg-emerald-500/20 focus:bg-emerald-500/20"
                            : "text-zinc-900 hover:bg-emerald-50 focus:bg-emerald-50"
                        )}
                      >
                        {uiLanguage === "zh"
                          ? option.label.zh
                          : option.label.en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={startGuide}
                variant="outline"
                className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 text-emerald-500 hover:bg-emerald-500/10 font-bold"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                {uiLanguage === "zh" ? "新手引导" : "Newbie Guide"}
              </Button>
            </div>
          </div>

          {/* Top: Website Info & Feature Guidance */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Section 1: Website Info (Current Bound Website) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <span className="text-xs font-black uppercase tracking-widest opacity-60">
                  {uiLanguage === "zh" ? "当前站点" : "Current Site"}
                </span>
              </div>

              {state.website ? (
                <Card
                  className={cn(
                    "overflow-hidden border-none rounded-[32px] transition-all h-[420px] flex flex-col group",
                    isDarkTheme ? "bg-zinc-900/50" : "bg-white shadow-sm"
                  )}
                >
                  <div className="relative h-32 shrink-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                    {state.website.screenshot ? (
                      <img
                        src={state.website.screenshot}
                        alt="Website"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-emerald-500/5 flex items-center justify-center">
                        <Globe className="w-12 h-12 text-emerald-500/20" />
                      </div>
                    )}
                    <div className="absolute bottom-4 left-6 z-20">
                      <Badge className="bg-emerald-500 text-white border-none font-bold mb-1 scale-75 lg:scale-90 origin-left">
                        {uiLanguage === "zh" ? "已绑定" : "Bound"}
                      </Badge>
                      <h3
                        className={cn(
                          "text-xl lg:text-2xl font-black truncate max-w-[300px] tracking-tight",
                          isDarkTheme ? "text-white" : "text-zinc-900"
                        )}
                      >
                        {state.website.domain || state.website.url}
                      </h3>
                    </div>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-between relative">
                    <div className="space-y-6">
                      <div
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl backdrop-blur-md border",
                          isDarkTheme
                            ? "bg-black/40 border-white/5"
                            : "bg-zinc-100/80 border-zinc-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/10">
                            <Globe className="w-4 h-4 text-emerald-500" />
                          </div>
                          <span
                            className={cn(
                              "text-[10px] lg:text-xs font-bold truncate max-w-[180px] opacity-60 mono",
                              isDarkTheme ? "text-white" : "text-zinc-900"
                            )}
                          >
                            {state.website.url}
                          </span>
                        </div>
                        <a
                          href={state.website.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl hover:bg-white/5 transition-colors text-emerald-500"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      {/* Real Stats Grid */}
                      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-1">
                          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {uiLanguage === "zh"
                              ? "预估月流量"
                              : "Est. Monthly Traffic"}
                          </span>
                          <p className="text-2xl lg:text-3xl font-black tracking-tighter text-white">
                            {(() => {
                              const visits = state.website.monthlyVisits || 0;
                              if (visits >= 1000000000)
                                return (visits / 1000000000).toFixed(1) + "B";
                              if (visits >= 1000000)
                                return (visits / 1000000).toFixed(1) + "M";
                              if (visits >= 1000)
                                return (visits / 1000).toFixed(1) + "K";
                              return visits.toString();
                            })()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {uiLanguage === "zh"
                              ? "索引关键词"
                              : "Indexed Keywords"}
                          </span>
                          <p className="text-2xl lg:text-3xl font-black tracking-tighter text-white">
                            {state.website.keywordsCount !== undefined &&
                            state.website.keywordsCount !== null ? (
                              state.website.keywordsCount >= 1000000 ? (
                                (state.website.keywordsCount / 1000000).toFixed(
                                  1
                                ) + "M"
                              ) : (
                                state.website.keywordsCount.toLocaleString()
                              )
                            ) : (
                              <span className="text-zinc-600 animate-pulse text-lg">
                                {uiLanguage === "zh"
                                  ? "同步中..."
                                  : "Syncing..."}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {uiLanguage === "zh" ? "流量价值" : "Traffic Value"}
                          </span>
                          <p className="text-xs lg:text-sm font-black uppercase tracking-tight text-emerald-500">
                            {state.website.trafficCost
                              ? "$" +
                                (state.website.trafficCost >= 1000000
                                  ? (
                                      state.website.trafficCost / 1000000
                                    ).toFixed(1) + "M"
                                  : state.website.trafficCost.toLocaleString())
                              : "$0.00"}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] lg:text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {uiLanguage === "zh"
                              ? "前10名关键词"
                              : "Top 10 Rankings"}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((state.website.top10Count || 0) /
                                      (state.website.keywordsCount || 100)) *
                                      100
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs lg:text-sm font-black text-emerald-500">
                              {state.website.top10Count?.toLocaleString() ||
                                "0"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Tech Stack */}
                    <div
                      className={cn(
                        "pt-4 border-t flex items-center justify-between",
                        isDarkTheme ? "border-white/5" : "border-zinc-200"
                      )}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          state.website.marketingTools || [
                            "Analytics",
                            "SEO",
                            "Meta",
                          ]
                        ).map((tool, i) => (
                          <span
                            key={i}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[7px] lg:text-[9px] font-black uppercase tracking-wider border transition-colors",
                              isDarkTheme
                                ? "bg-zinc-800/50 text-zinc-400 border-white/5"
                                : "bg-zinc-100 text-zinc-500 border-zinc-200"
                            )}
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-1 h-1 rounded-full bg-emerald-500/20"
                          />
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card
                  className={cn(
                    "p-12 text-center border-dashed border-2 rounded-[32px] flex flex-col items-center justify-center space-y-4 h-full",
                    isDarkTheme
                      ? "bg-transparent border-zinc-800"
                      : "bg-gray-50 border-gray-200"
                  )}
                >
                  <div className="p-4 rounded-full bg-emerald-500/10">
                    <PlusCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base lg:text-lg font-bold">
                      {uiLanguage === "zh" ? "尚未绑定站点" : "No site bound"}
                    </p>
                    <p className="text-xs lg:text-sm opacity-60">
                      {uiLanguage === "zh"
                        ? "从下方的资产地图中选择一个站点开始"
                        : "Select a site from the asset discovery below to start"}
                    </p>
                  </div>
                </Card>
              )}
            </div>

            {/* Section 2: Opportunity Insight Terminal */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                <span className="text-xs lg:text-sm font-black uppercase tracking-widest opacity-60">
                  {uiLanguage === "zh" ? "机会洞察" : "Opportunity Insights"}
                </span>
              </div>

              <OpportunityTerminal
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
                websiteId={state.website?.id}
                url={state.website?.url}
              />
            </div>
          </div>

          {/* Section 3: All Websites (Asset Map) */}
          <div className="space-y-6 pt-6 border-t border-white/5">
            <WebsiteManager
              userId={currentUserId}
              isDarkTheme={isDarkTheme}
              uiLanguage={uiLanguage}
              onWebsiteSelect={(website) => {
                setState({ website });
              }}
              onAddWebsite={(url, scrapedData) => {
                handleAddWebsiteFromManager(url, scrapedData);
              }}
              onWebsiteBind={(website) => {
                // Bind website and set to bound state
                const boundWebsite = {
                  id: website.id,
                  url: website.url,
                  domain: website.domain,
                  title: website.title,
                  description: website.description,
                  screenshot: website.screenshot,
                  industry: website.industry || null,
                  monthlyVisits: website.monthlyVisits || null,
                  monthlyRevenue: website.monthlyRevenue || null,
                  marketingTools: website.marketingTools || [],
                  boundAt: website.boundAt || new Date().toISOString(),
                  keywordsCount:
                    website.keywordsCount !== undefined
                      ? website.keywordsCount
                      : null,
                  healthScore:
                    website.healthScore !== undefined
                      ? website.healthScore
                      : null,
                  top10Count:
                    website.top10Count !== undefined
                      ? website.top10Count
                      : null,
                  trafficCost:
                    website.trafficCost !== undefined
                      ? website.trafficCost
                      : null,
                };

                // Save to localStorage as backup (using helper function to avoid quota issues)
                saveWebsiteToLocalStorage(boundWebsite);

                setState({
                  website: boundWebsite,
                  onboardingStep: 5, // Set to bound state
                });

                // Update user preferences to set this as current website
                fetch("/api/websites/set-default", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${
                      localStorage.getItem("auth_token") || ""
                    }`,
                  },
                  body: JSON.stringify({
                    websiteId: website.id,
                    userId: currentUserId,
                  }),
                })
                  .then((response) => {
                    if (!response.ok) {
                      throw new Error("Failed to set default website");
                    }
                  })
                  .catch((error) => {
                    console.error(
                      "[Content Generation] Error setting default website:",
                      error
                    );
                  });
              }}
              onWebsiteUnbind={(websiteId) => {
                // Only unbind if this is the current website
                if (state.website?.id === websiteId) {
                  // Clear localStorage
                  try {
                    localStorage.removeItem("google_seo_bound_website");
                  } catch (error) {
                    console.error(
                      "[Content Generation] Failed to clear website from localStorage:",
                      error
                    );
                  }

                  setState({
                    website: null,
                    onboardingStep: 0,
                    websiteData: null,
                    demoContent: null,
                  });
                  setUrlInput("");
                  setTempUrl("");
                  setQa1("");
                  setQa2("");
                  setQa3([]);
                  setQa4("");
                }
              }}
              currentWebsiteId={state.website?.id}
            />
          </div>
        </div>
      );
    }

    // 5-step onboarding flow
    switch (state.onboardingStep) {
      case 0:
        // Step 1: Enter URL
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div
                className={cn(
                  "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center",
                  isDarkTheme
                    ? "bg-emerald-500/10 border-2 border-emerald-500/30"
                    : "bg-emerald-50 border-2 border-emerald-500/30"
                )}
              >
                <Globe className="w-10 h-10 text-emerald-500" />
              </div>
              <h2
                className={cn(
                  "text-3xl lg:text-4xl font-bold mb-3",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {t.bindWebsite}
              </h2>
              <p
                className={cn(
                  "text-sm lg:text-base mb-6",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}
              >
                {uiLanguage === "zh"
                  ? "输入您的网站URL，我们将自动分析并生成SEO策略"
                  : "Enter your website URL and we'll automatically analyze and generate SEO strategy"}
              </p>
            </div>

            <div className="mb-6">
              <Input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder={t.enterUrlPlaceholder}
                className={cn(
                  "text-center h-12 text-lg",
                  isDarkTheme
                    ? "bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-600"
                    : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                )}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUrlSubmit();
                  }
                }}
              />
            </div>

            <Button
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
              onClick={handleUrlSubmit}
            >
              {uiLanguage === "zh" ? "开始分析" : "Start Analysis"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        );

      case 1:
        // Step 2: Analyzing (loading state)
        return (
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div
                className={cn(
                  "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center",
                  isDarkTheme
                    ? "bg-emerald-500/10 border-2 border-emerald-500/30"
                    : "bg-emerald-50 border-2 border-emerald-500/30"
                )}
              >
                <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              </div>
              <h2
                className={cn(
                  "text-3xl lg:text-4xl font-bold mb-3",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {uiLanguage === "zh"
                  ? "分析您的网站中..."
                  : "Analyzing your website..."}
              </h2>
              <p
                className={cn(
                  "text-sm lg:text-base font-medium",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}
              >
                {uiLanguage === "zh"
                  ? "AI正在分析您的业务..."
                  : "Agents are figuring out what you do."}
              </p>
            </div>

            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span
                  className={cn(
                    "text-sm lg:text-base",
                    isDarkTheme ? "text-zinc-300" : "text-gray-700"
                  )}
                >
                  {uiLanguage === "zh" ? "连接到网站" : "Connecting to website"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <span
                  className={cn(
                    "text-sm lg:text-base",
                    isDarkTheme ? "text-zinc-300" : "text-gray-700"
                  )}
                >
                  {analyzingTexts[analyzingTextIndex]}
                </span>
              </div>
              <div className="flex items-center gap-3 opacity-50">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2",
                    isDarkTheme ? "border-zinc-600" : "border-gray-300"
                  )}
                />
                <span
                  className={cn(
                    "text-sm lg:text-base",
                    isDarkTheme ? "text-zinc-300" : "text-gray-700"
                  )}
                >
                  {uiLanguage === "zh"
                    ? "生成效果演示"
                    : "Generating demo results"}
                </span>
              </div>
            </div>
          </div>
        );

      case 2:
        // Step 3: ChatGPT Demo - "This is what people should see"
        return (
          <div className="max-w-5xl mx-auto">
            <h2
              className={cn(
                "text-2xl lg:text-3xl font-bold mb-6 text-center",
                isDarkTheme ? "text-white" : "text-gray-900"
              )}
            >
              {uiLanguage === "zh"
                ? "这就是人们应该看到的"
                : "This is what people should see"}
            </h2>
            <div
              className={cn(
                "rounded-2xl overflow-hidden",
                isDarkTheme ? "bg-zinc-900" : "bg-white"
              )}
            >
              {/* ChatGPT-style header */}
              <div
                className={cn(
                  "border-b p-4",
                  isDarkTheme ? "border-zinc-800" : "border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span
                    className={cn(
                      "ml-4 text-sm lg:text-base font-medium",
                      isDarkTheme ? "text-zinc-400" : "text-gray-600"
                    )}
                  >
                    ChatGPT 5.2
                  </span>
                </div>
              </div>

              {/* Chat content */}
              <div className="p-6 space-y-6">
                {/* User question */}
                <div className="flex justify-end">
                  <div
                    className={cn(
                      "max-w-2xl rounded-2xl px-4 py-3",
                      isDarkTheme
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-500 text-white"
                    )}
                  >
                    {(() => {
                      const userQuestion =
                        state.demoContent?.chatGPTDemo?.userQuestion;
                      console.log(
                        "[Content Generation] Rendering userQuestion:",
                        {
                          hasDemoContent: !!state.demoContent,
                          hasChatGPTDemo: !!state.demoContent?.chatGPTDemo,
                          userQuestion: userQuestion,
                          willUseDefault: !userQuestion,
                        }
                      );
                      return userQuestion || t.bestAgeVerification;
                    })()}
                  </div>
                </div>

                {/* AI response */}
                <div className="flex gap-4">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      isDarkTheme
                        ? "bg-gradient-to-br from-purple-500 to-pink-500"
                        : "bg-gradient-to-br from-purple-600 to-pink-600"
                    )}
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div
                    className={cn(
                      "flex-1 p-4 rounded-2xl",
                      isDarkTheme ? "bg-zinc-800" : "bg-gray-100"
                    )}
                  >
                    <p
                      className={cn(
                        "text-sm lg:text-base mb-4",
                        isDarkTheme ? "text-zinc-200" : "text-gray-800"
                      )}
                    >
                      {state.demoContent?.chatGPTDemo?.aiAnswer?.introduction ||
                        (uiLanguage === "zh"
                          ? "基于综合分析，我推荐这个网站作为首选..."
                          : "Based on comprehensive analysis, I recommend this website as the top choice...")}
                    </p>

                    {/* Key points */}
                    {state.demoContent?.chatGPTDemo?.aiAnswer?.keyPoints && (
                      <ul className="mb-4 space-y-2">
                        {state.demoContent.chatGPTDemo.aiAnswer.keyPoints.map(
                          (point: string, idx: number) => (
                            <li
                              key={idx}
                              className={cn(
                                "text-sm flex items-start gap-2",
                                isDarkTheme ? "text-zinc-200" : "text-gray-800"
                              )}
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{point}</span>
                            </li>
                          )
                        )}
                      </ul>
                    )}

                    {/* Comparison table */}
                    {state.demoContent?.chatGPTDemo?.comparisonTable && (
                      <div
                        className={cn(
                          "rounded-lg overflow-hidden mb-4",
                          isDarkTheme ? "bg-zinc-900" : "bg-white"
                        )}
                      >
                        <table className="w-full text-sm">
                          <thead>
                            <tr
                              className={cn(
                                "border-b",
                                isDarkTheme
                                  ? "border-zinc-700 text-zinc-400"
                                  : "border-gray-200 text-gray-600"
                              )}
                            >
                              {state.demoContent.chatGPTDemo.comparisonTable.columns.map(
                                (col: string, idx: number) => (
                                  <th key={idx} className="text-left p-3">
                                    {col}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {state.demoContent.chatGPTDemo.comparisonTable.rows.map(
                              (row: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className={cn(
                                    "border-b",
                                    isDarkTheme
                                      ? "border-zinc-800"
                                      : "border-gray-100"
                                  )}
                                >
                                  <td
                                    className={cn(
                                      "p-3",
                                      row.isRecommended && "font-medium",
                                      isDarkTheme &&
                                        (row.isRecommended
                                          ? "text-white"
                                          : "text-zinc-400")
                                    )}
                                  >
                                    {row.platform}
                                    {row.isRecommended && " ⭐"}
                                  </td>
                                  <td className="text-center p-3">
                                    {row.isRecommended ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                                      >
                                        {row.score}
                                      </Badge>
                                    ) : (
                                      row.score
                                    )}
                                  </td>
                                  <td className="p-3">
                                    {row.coreCapability || row.pricing}
                                  </td>
                                  <td className="p-3">
                                    {row.positioning || row.features || ""}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  isDarkTheme
                    ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                )}
                onClick={handleNextStep}
              >
                {uiLanguage === "zh" ? "继续" : "Continue"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 3:
        // Step 4: Article Rankings Demo (Medium-style)
        return (
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Article content */}
              <div className="lg:col-span-4">
                <div
                  className={cn(
                    "rounded-lg p-8 relative",
                    isDarkTheme ? "bg-zinc-900" : "bg-white"
                  )}
                >
                  {/* Author info */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        isDarkTheme
                          ? "bg-gradient-to-br from-emerald-500 to-blue-500"
                          : "bg-gradient-to-br from-emerald-600 to-blue-600"
                      )}
                    >
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "font-medium",
                          isDarkTheme ? "text-white" : "text-gray-900"
                        )}
                      >
                        {state.demoContent?.articleDemo?.article?.authorName ||
                          randomAuthor.name}
                      </div>
                      <div
                        className={cn(
                          "text-xs",
                          isDarkTheme ? "text-zinc-500" : "text-gray-500"
                        )}
                      >
                        {state.demoContent?.articleDemo?.article?.authorTitle ||
                          randomAuthor.title}
                      </div>
                    </div>
                  </div>

                  {/* Article title */}
                  <h1
                    className={cn(
                      "text-3xl font-bold mb-6",
                      isDarkTheme ? "text-white" : "text-gray-900"
                    )}
                  >
                    {state.demoContent?.articleDemo?.article?.title ||
                      (uiLanguage === "zh"
                        ? "如何在2024年将自然流量提升300%：我们的实战案例"
                        : "How We Increased Organic Traffic by 300% in 2024: Our Case Study")}
                  </h1>

                  {/* Article preview */}
                  <div className="space-y-6 relative">
                    {(() => {
                      const content =
                        state.demoContent?.articleDemo?.article?.preview ||
                        (uiLanguage === "zh"
                          ? "通过 strategic content optimization 和智能关键词定位，我们在6个月内将网站的有机流量提升了300%。本文将分享我们的具体策略、使用的工具以及实施步骤..."
                          : "Through strategic content optimization and intelligent keyword targeting, we increased our website's organic traffic by 300% in 6 months. This article shares our specific strategies, tools used, and implementation steps...");

                      // Normalize content: handle both \n\n and \\n\\n
                      const normalizedContent = content
                        .replace(/\\n\\n/g, "\n\n")
                        .replace(/\\n/g, "\n");
                      const parts = normalizedContent.split(/\n\n+/);
                      const screenshotPosition =
                        state.demoContent?.articleDemo?.article
                          ?.screenshotPosition || "after-product-review";
                      const shouldInsertAfterProductReview =
                        screenshotPosition.includes("product-review");
                      let elements: React.ReactNode[] = [];
                      let productReviewSubtitleFound = false;
                      let screenshotInserted = false;

                      parts.forEach((part: string, idx: number) => {
                        const trimmedPart = part.trim();

                        // Skip screenshot placeholder text
                        if (
                          trimmedPart.includes("[截图位置") ||
                          trimmedPart.includes("[Screenshot Position")
                        ) {
                          return;
                        }

                        // Check if it's a subtitle (starts with ##)
                        if (trimmedPart.startsWith("##")) {
                          const subtitleText = trimmedPart
                            .replace(/^##\s*/, "")
                            .trim();
                          elements.push(
                            <h2
                              key={`subtitle-${idx}`}
                              className={cn(
                                "text-xl font-bold mt-8 mb-4",
                                isDarkTheme ? "text-white" : "text-gray-900"
                              )}
                            >
                              {subtitleText}
                            </h2>
                          );

                          // Check if this is a product review subtitle and insert screenshot immediately after it
                          if (
                            shouldInsertAfterProductReview &&
                            !screenshotInserted &&
                            (subtitleText.match(/^\d+\./) ||
                              subtitleText.includes(
                                state.demoContent?.brandName || ""
                              ) ||
                              subtitleText.includes(
                                uiLanguage === "zh" ? "脱颖而出" : "Stands Out"
                              ))
                          ) {
                            screenshotInserted = true;
                            // Insert screenshot immediately after this subtitle
                            if (state.demoContent?.screenshot) {
                              elements.push(
                                <div
                                  key="screenshot"
                                  className="my-6 rounded-lg overflow-hidden border-2 border-emerald-500/30"
                                >
                                  <img
                                    src={state.demoContent.screenshot}
                                    alt={
                                      state.demoContent.articleDemo?.article
                                        ?.screenshotAlt ||
                                      (uiLanguage === "zh"
                                        ? "网站截图"
                                        : "Website screenshot")
                                    }
                                    className="w-full"
                                    loading="eager"
                                    decoding="async"
                                  />
                                  <p
                                    className={cn(
                                      "text-xs text-center mt-2 italic",
                                      isDarkTheme
                                        ? "text-zinc-500"
                                        : "text-gray-500"
                                    )}
                                  >
                                    {state.demoContent.articleDemo?.article
                                      ?.screenshotAlt ||
                                      (uiLanguage === "zh"
                                        ? "来自我们的仪表板截图"
                                        : "Screenshot from our dashboard")}
                                  </p>
                                </div>
                              );
                            }
                          }
                        } else if (
                          trimmedPart &&
                          !trimmedPart.startsWith("#")
                        ) {
                          // Regular paragraph
                          elements.push(
                            <p
                              key={`para-${idx}`}
                              className={cn(
                                "text-base leading-relaxed mb-4",
                                isDarkTheme ? "text-zinc-300" : "text-gray-700"
                              )}
                            >
                              {trimmedPart}
                            </p>
                          );
                        }
                      });

                      return elements;
                    })()}

                    {/* Fade effect to suggest more content */}
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 h-24 pointer-events-none",
                        isDarkTheme
                          ? "bg-gradient-to-t from-zinc-900 to-transparent"
                          : "bg-gradient-to-t from-white to-transparent"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Right: Sidebar */}
              <div className="lg:col-span-1">
                <div
                  className={cn(
                    "rounded-lg p-5 sticky top-6",
                    isDarkTheme
                      ? "bg-gradient-to-br from-emerald-900/50 to-blue-900/50 border border-emerald-500/20"
                      : "bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-500/30"
                  )}
                >
                  <div className="mb-5">
                    <div
                      className={cn(
                        "text-base font-bold mb-2",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      nichedigger
                    </div>
                    <div
                      className={cn(
                        "text-xs mb-4",
                        isDarkTheme ? "text-zinc-400" : "text-gray-600"
                      )}
                    >
                      {uiLanguage === "zh"
                        ? "AI驱动的SEO内容生成平台"
                        : "AI-powered SEO content generation platform"}
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    {[
                      {
                        icon: "precision",
                        text:
                          uiLanguage === "zh"
                            ? "SERP 实时透视：Agent 读取真实 SERP 与关键词数据，通过 AI 审计发现未被利用的流量空间"
                            : "SERP Real-time Vision: Agents read real SERP and keyword data, discovering untapped traffic opportunities through AI audit",
                      },
                      {
                        icon: "speed",
                        text:
                          uiLanguage === "zh"
                            ? "弱竞争算法：不看表面搜索量，看的是对手的破绽。首页是无关帖子或过时内容？这就是为你标识的蓝海"
                            : "Weak-Spot Finder: Ignores surface search volume, focuses on competitor weaknesses. Irrelevant forum posts or outdated PDFs ranking? That's your blue ocean",
                      },
                      {
                        icon: "insight",
                        text:
                          uiLanguage === "zh"
                            ? "意图套利：识别用户搜索时的真正焦虑点，利用对手内容的信息缺口进行精准截流"
                            : "Intent Arbitrage: Identify user's real anxiety behind searches, exploit content gaps in competitors to intercept traffic",
                      },
                      {
                        icon: "growth",
                        text:
                          uiLanguage === "zh"
                            ? "AIO/GEO 注入：不只是写文章，而是为了被 Perplexity 引用、被 Google 摘要捕捉而设计的结构"
                            : "AIO/GEO Injection: Not just writing articles, but structuring content to be cited by Perplexity and captured in Google summaries",
                      },
                    ].map((benefit: any, idx: number) => {
                      const IconComponent =
                        {
                          precision: Target,
                          speed: Zap,
                          insight: Lightbulb,
                          growth: TrendingUp,
                        }[benefit.icon] || Target;

                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <IconComponent className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <div
                            className={cn(
                              "text-xs leading-relaxed",
                              isDarkTheme ? "text-zinc-300" : "text-gray-700"
                            )}
                          >
                            {benefit.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8">
              <Button
                size="lg"
                variant="outline"
                className={cn(
                  isDarkTheme
                    ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                )}
                onClick={handleNextStep}
              >
                {uiLanguage === "zh" ? "继续" : "Continue"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 4:
        // Step 5: Questionnaire with options
        return (
          <div className="max-w-3xl mx-auto">
            <div
              className={cn(
                "rounded-lg p-8",
                isDarkTheme ? "bg-zinc-900" : "bg-white"
              )}
            >
              <h2
                className={cn(
                  "text-2xl font-bold mb-6",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {uiLanguage === "zh" ? "问卷" : "Questionnaire"}
              </h2>

              <div className="space-y-8">
                {/* Q1: AI search traffic */}
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-3",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}
                  >
                    {uiLanguage === "zh"
                      ? "您目前每月从AI搜索引擎获得超过10,000次访问吗？"
                      : "Do you currently receive more than 10,000 monthly visits from AI search engines?"}
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setQa1("yes")}
                      className={cn(
                        "flex-1 p-4 rounded-lg border-2 text-center transition-all",
                        qa1 === "yes"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : isDarkTheme
                          ? "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                          : "border-gray-300 text-gray-600 hover:border-gray-400"
                      )}
                    >
                      {uiLanguage === "zh" ? "是" : "Yes"}
                    </button>
                    <button
                      onClick={() => setQa1("no")}
                      className={cn(
                        "flex-1 p-4 rounded-lg border-2 text-center transition-all",
                        qa1 === "no"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : isDarkTheme
                          ? "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                          : "border-gray-300 text-gray-600 hover:border-gray-400"
                      )}
                    >
                      {uiLanguage === "zh" ? "否" : "No"}
                    </button>
                  </div>
                </div>

                {/* Q2: Monthly revenue */}
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-3",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}
                  >
                    {uiLanguage === "zh"
                      ? "您的月收入是多少？"
                      : "What's your monthly revenue?"}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: "<$10k", label: "<$10k" },
                      { value: "$10k-$50k", label: "$10k-$50k" },
                      { value: "$50k-$100k", label: "$50k-$100k" },
                      { value: "$100k+", label: "$100k+" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setQa2(option.value)}
                        className={cn(
                          "p-3 rounded-lg border-2 text-center transition-all text-sm",
                          qa2 === option.value
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                            : isDarkTheme
                            ? "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                            : "border-gray-300 text-gray-600 hover:border-gray-400"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q3: Marketing automations (multi-select) */}
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-3",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}
                  >
                    {uiLanguage === "zh"
                      ? "您已经使用了哪些营销自动化工具？"
                      : "What marketing automations do you already use?"}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: "ai_bots",
                        label: "AI powered Reddit or Twitter bots",
                      },
                      {
                        value: "cold_outbound",
                        label: "LinkedIn or email cold outbound",
                      },
                      {
                        value: "seo_blogging",
                        label: "Automated on-site SEO blogging",
                      },
                      {
                        value: "ai_ads",
                        label: "AI powered ad creatives or media buying",
                      },
                      { value: "something_else", label: "Something else" },
                      {
                        value: "none",
                        label: uiLanguage === "zh" ? "暂无" : "None so far",
                      },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          if (qa3.includes(option.value)) {
                            setQa3(qa3.filter((v) => v !== option.value));
                          } else {
                            setQa3([...qa3, option.value]);
                          }
                        }}
                        className={cn(
                          "p-3 rounded-lg border-2 text-center transition-all text-sm",
                          qa3.includes(option.value)
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                            : isDarkTheme
                            ? "border-zinc-700 text-zinc-400 hover:border-zinc-600"
                            : "border-gray-300 text-gray-600 hover:border-gray-400"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Q4: Additional info (optional text) */}
                <div>
                  <label
                    className={cn(
                      "block text-sm font-medium mb-3",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}
                  >
                    {uiLanguage === "zh"
                      ? "还有什么我们应该知道的吗？（可选）"
                      : "Anything else we should know? (optional)"}
                  </label>
                  <textarea
                    value={qa4}
                    onChange={(e) => setQa4(e.target.value)}
                    className={cn(
                      "w-full h-24 rounded-md p-3 text-sm resize-none",
                      isDarkTheme
                        ? "bg-zinc-800 border-zinc-700 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    )}
                    placeholder={
                      uiLanguage === "zh"
                        ? "例如：特定的目标市场、特殊需求等..."
                        : "E.g., Specific target market, special requirements..."
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end mt-8 gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setState({
                      website: null,
                      onboardingStep: 0,
                      websiteData: null,
                      demoContent: null,
                    });
                    setUrlInput("");
                    setTempUrl("");
                    setQa1("");
                    setQa2("");
                    setQa3([]);
                    setQa4("");
                  }}
                  className={cn(
                    isDarkTheme
                      ? "border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  {uiLanguage === "zh" ? "返回" : "Back"}
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={async () => {
                    if (!tempUrl) {
                      alert("URL not found. Please start over.");
                      return;
                    }

                    // Save website data to database
                    try {
                      const saveResponse = await fetch(
                        "/api/website-data/save",
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${
                              localStorage.getItem("auth_token") || ""
                            }`,
                          },
                          body: JSON.stringify({
                            userId: currentUserId,
                            websiteUrl: tempUrl,
                            websiteTitle:
                              state.demoContent?.articleDemo?.article?.title ||
                              "",
                            websiteDescription: "",
                            websiteScreenshot:
                              state.demoContent?.screenshot || "",
                            rawContent: state.websiteData?.rawContent || "",
                            keywords:
                              state.websiteData?.extractedKeywords || [],
                            industry: state.website?.industry,
                            monthlyVisits: state.website?.monthlyVisits,
                            monthlyRevenue: qa2,
                            marketingTools: qa3,
                            additionalInfo: qa4,
                          }),
                        }
                      );

                      if (!saveResponse.ok) {
                        const errorText = await saveResponse.text();
                        console.error(
                          "[Content Generation] Failed to save website data:",
                          saveResponse.status,
                          errorText
                        );
                        alert(
                          uiLanguage === "zh"
                            ? "保存网站数据失败，请重试"
                            : "Failed to save website data, please try again"
                        );
                        return;
                      }

                      const saveData = await saveResponse.json();
                      const websiteId = saveData.data?.websiteId;

                      if (!websiteId) {
                        console.error(
                          "[Content Generation] No websiteId returned from save API"
                        );
                        alert(
                          uiLanguage === "zh"
                            ? "保存失败：未返回网站ID"
                            : "Save failed: No website ID returned"
                        );
                        return;
                      }

                      console.log(
                        "[Content Generation] Website data saved successfully, websiteId:",
                        websiteId
                      );

                      // Set as default website
                      try {
                        const setDefaultResponse = await fetch(
                          "/api/websites/set-default",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${
                                localStorage.getItem("auth_token") || ""
                              }`,
                            },
                            body: JSON.stringify({
                              websiteId: websiteId,
                              userId: currentUserId,
                            }),
                          }
                        );

                        if (!setDefaultResponse.ok) {
                          const errorText = await setDefaultResponse.text();
                          console.error(
                            "[Content Generation] Failed to set default website:",
                            setDefaultResponse.status,
                            errorText
                          );
                          // Don't block the flow if this fails, but log it
                        } else {
                          console.log(
                            "[Content Generation] Default website set successfully"
                          );
                        }
                      } catch (setDefaultError: any) {
                        console.error(
                          "[Content Generation] Error setting default website:",
                          setDefaultError
                        );
                        // Don't block the flow if this fails
                      }

                      // Get domain from URL
                      const domain = new URL(tempUrl).hostname.replace(
                        /^www\./,
                        ""
                      );

                      const boundWebsite = {
                        id: websiteId,
                        url: tempUrl,
                        domain: domain,
                        title:
                          state.demoContent?.articleDemo?.article?.title || "",
                        description: "",
                        screenshot: state.demoContent?.screenshot || "",
                        industry: state.website?.industry || null,
                        monthlyVisits: state.website?.monthlyVisits || null,
                        monthlyRevenue: qa2,
                        marketingTools: qa3,
                        boundAt: new Date().toISOString(),
                        additionalInfo: qa4,
                      };

                      // Save to localStorage as backup (using helper function to avoid quota issues)
                      saveWebsiteToLocalStorage(boundWebsite);

                      setState({
                        website: boundWebsite,
                        onboardingStep: 5, // Complete (bound state will show)
                      });
                    } catch (error: any) {
                      console.error(
                        "[Content Generation] Error saving website data:",
                        error
                      );

                      // 处理网络错误
                      if (
                        error?.message?.includes("Failed to fetch") ||
                        error?.name === "TypeError"
                      ) {
                        console.warn(
                          "[Content Generation] Network error while saving website data"
                        );
                        alert(
                          uiLanguage === "zh"
                            ? "网络连接失败，请检查网络连接或稍后重试"
                            : "Network connection failed, please check your connection and try again"
                        );
                      } else {
                        alert(
                          uiLanguage === "zh"
                            ? "保存网站数据失败，请重试"
                            : "Failed to save website data, please try again"
                        );
                      }
                    }
                  }}
                >
                  {uiLanguage === "zh" ? "完成设置" : "Complete Setup"}
                  <CheckCircle className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Old functions removed - now using WebsiteDataTab, ArticleRankingsTab, and PublishTab components

  // Main render return for ContentGenerationView
  return (
    <div className="max-w-7xl mx-auto mt-6">
      {/* Tab Content - No top tabs needed, they're in sidebar */}
      {state.activeTab === "my-website" && renderMyWebsite()}
      {state.activeTab === "website-data" && (
        <WebsiteDataTab
          website={state.website}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          onGenerateArticle={onGenerateArticle}
        />
      )}
      {state.activeTab === "projects" && (
        <ProjectDashboard
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          onGenerateContent={(kw) => {
            if (onGenerateArticle) {
              // Map KeywordWithStatus to KeywordData for compatibility
              onGenerateArticle({
                id: kw.id,
                keyword: kw.keyword,
                translation: kw.translation || "",
                intent: kw.intent as any,
                volume: kw.volume || 0,
                probability: kw.probability as any,
              });
            }
          }}
          onViewDraft={(kw) => {
            // Draft viewing logic is inside ProjectDashboard
          }}
        />
      )}
      {state.activeTab === "publish" && (
        <PublishTab isDarkTheme={isDarkTheme} uiLanguage={uiLanguage} />
      )}
    </div>
  );
};
