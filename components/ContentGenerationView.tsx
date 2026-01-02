import React, { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { ContentGenerationState, WebsiteBinding, KeywordData } from "./types";
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

// Website Data Tab Component (独立组件，修复 hooks 问题)
interface WebsiteDataTabProps {
  website: WebsiteBinding | null;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

const WebsiteDataTab: React.FC<WebsiteDataTabProps> = ({
  website,
  isDarkTheme,
  uiLanguage,
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

  // Use the new WebsiteDataDashboard component
  return (
    <WebsiteDataDashboard
      websiteId={website.id}
      isDarkTheme={isDarkTheme}
      uiLanguage={uiLanguage}
    />
  );
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: website.url,
          userId: 1, // TODO: Get from session
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
                "text-xs mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "总关键词" : "Total Keywords"}
            </div>
            <div
              className={cn(
                "text-2xl font-bold",
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
                "text-xs mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "前10名" : "Top 10"}
            </div>
            <div className={cn("text-2xl font-bold text-emerald-500")}>
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
                "text-xs mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "平均排名" : "Avg Position"}
            </div>
            <div
              className={cn(
                "text-2xl font-bold",
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
                "text-xs mb-1",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "排名提升" : "Improved"}
            </div>
            <div className={cn("text-2xl font-bold text-emerald-500")}>
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

interface ContentGenerationViewProps {
  state: ContentGenerationState;
  setState: (update: Partial<ContentGenerationState>) => void;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const ContentGenerationView: React.FC<ContentGenerationViewProps> = ({
  state,
  setState,
  isDarkTheme,
  uiLanguage,
}) => {
  const [urlInput, setUrlInput] = useState("");
  const [tempUrl, setTempUrl] = useState(""); // Store URL during onboarding
  const [qa1, setQa1] = useState("");
  const [qa2, setQa2] = useState("");
  const [qa3, setQa3] = useState<string[]>([]);
  const [qa4, setQa4] = useState("");

  // Load website binding from database first, then fallback to localStorage
  React.useEffect(() => {
    const loadWebsiteFromDatabase = async () => {
      try {
        // Try loading from database first
        const response = await fetch(`/api/websites/list?user_id=1`);

        if (response.ok) {
          const result = await response.json();
          if (result.data?.currentWebsite) {
            console.log(
              "[Content Generation] Loaded website from database:",
              result.data.currentWebsite
            );
            setState({
              website: result.data.currentWebsite,
              onboardingStep: 5, // Set to bound state
            });
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
          setState({
            website,
            onboardingStep: 5, // Set to bound state
          });
        }
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
            setState({
              website,
              onboardingStep: 5, // Set to bound state
            });
          }
        } catch (localError) {
          console.error(
            "[Content Generation] Failed to load saved website from localStorage:",
            localError
          );
        }
      }
    };

    loadWebsiteFromDatabase();
  }, []);

  // Save website binding to localStorage whenever it changes
  React.useEffect(() => {
    if (state.website) {
      try {
        localStorage.setItem(
          "google_seo_bound_website",
          JSON.stringify(state.website)
        );
      } catch (error) {
        console.error(
          "[Content Generation] Failed to save website to localStorage:",
          error
        );
      }
    } else {
      // Clear localStorage when website is unbound
      localStorage.removeItem("google_seo_bound_website");
    }
  }, [state.website]);

  // Preload screenshot image when article demo is displayed
  React.useEffect(() => {
    if (state.onboardingStep === 3 && state.demoContent?.screenshot) {
      const img = new Image();
      img.src = state.demoContent.screenshot;
    }
  }, [state.onboardingStep, state.demoContent?.screenshot]);

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
        // Store scraped data in state (don't set website yet - only after full onboarding)
        setState({
          websiteData: {
            rawContent: data.data.markdown,
            extractedKeywords: [], // Will extract now
            rankingOpportunities: [], // Will analyze later
          },
          onboardingStep: 1, // Stay on loading while extracting keywords
        });

        // Now extract keywords
        try {
          console.log("[Content Generation] Step 2: Extracting keywords...");
          const extractResponse = await fetch("/api/extract-keywords", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: data.data.markdown,
              url: processedUrl,
              targetLanguage: "en", // Can be made configurable
            }),
          });

          if (!extractResponse.ok) {
            const errorData = await extractResponse.json();
            console.error("[Content Generation] Extract failed:", errorData);
            throw new Error(errorData.error || "Failed to extract keywords");
          }

          const extractData = await extractResponse.json();
          console.log(
            "[Content Generation] Extract success, keywords:",
            extractData.data?.keywords?.length || 0
          );

          if (extractData.success && extractData.data) {
            setState({
              websiteData: {
                rawContent: data.data.markdown,
                extractedKeywords: extractData.data.keywords || [],
                rankingOpportunities: [], // Will analyze later
              },
              onboardingStep: 1, // Stay on loading while generating demo content
            });

            // Now generate demo content
            try {
              console.log(
                "[Content Generation] Step 3: Generating demo content..."
              );
              const demoResponse = await fetch("/api/generate-demo-content", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  content: data.data.markdown,
                  url: processedUrl,
                  keywords: extractData.data.keywords || [],
                  targetLanguage: uiLanguage, // Use uiLanguage instead of hardcoded "en"
                  uiLanguage: uiLanguage,
                  websiteTitle: data.data.title || "", // Pass website title to AI
                }),
              });

              if (!demoResponse.ok) {
                const errorData = await demoResponse.json();
                console.error(
                  "[Content Generation] Demo generation failed:",
                  errorData
                );
                throw new Error(
                  errorData.error || "Failed to generate demo content"
                );
              }

              const demoData = await demoResponse.json();
              console.log("[Content Generation] Demo generation success");

              if (demoData.success && demoData.data) {
                setState({
                  demoContent: {
                    ...demoData.data,
                    screenshot: data.data.screenshot,
                  },
                  onboardingStep: 2, // Move to demo
                });
              } else {
                throw new Error("Invalid demo response format");
              }
            } catch (demoError: any) {
              console.error(
                "[Content Generation] Error generating demo content:",
                demoError
              );

              // 处理网络错误
              if (
                demoError?.message?.includes("Failed to fetch") ||
                demoError?.name === "TypeError"
              ) {
                console.warn(
                  "[Content Generation] Network error during demo generation"
                );
              }

              // Still move to next step with default content
              console.log(
                "[Content Generation] Moving to step 2 with default content"
              );
              const urlDomain = new URL(processedUrl).hostname;
              const urlBrand =
                urlDomain.split(".")[0].charAt(0).toUpperCase() +
                urlDomain.split(".")[0].slice(1);
              setState({
                demoContent: {
                  chatGPTDemo: null,
                  articleDemo: null,
                  domain: urlDomain,
                  brandName: urlBrand,
                  screenshot: data.data.screenshot,
                },
                onboardingStep: 2,
              });
            }
          } else {
            throw new Error("Invalid extract response format");
          }
        } catch (extractError: any) {
          console.error(
            "[Content Generation] Error extracting keywords:",
            extractError
          );

          // 处理网络错误
          if (
            extractError?.message?.includes("Failed to fetch") ||
            extractError?.name === "TypeError"
          ) {
            console.warn(
              "[Content Generation] Network error during keyword extraction"
            );
          }

          // Still move to next step, just without keywords
          console.log("[Content Generation] Moving to step 2 without keywords");
          const urlDomain2 = new URL(processedUrl).hostname;
          const urlBrand2 =
            urlDomain2.split(".")[0].charAt(0).toUpperCase() +
            urlDomain2.split(".")[0].slice(1);
          setState({
            demoContent: {
              chatGPTDemo: null,
              articleDemo: null,
              domain: urlDomain2,
              brandName: urlBrand2,
              screenshot: data.data.screenshot,
            },
            onboardingStep: 2,
          });
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

  const handleNextStep = () => {
    if (state.onboardingStep < 4) {
      setState({ onboardingStep: state.onboardingStep + 1 });
    }
  };

  // Render My Website Tab
  const renderMyWebsite = () => {
    // If website is bound, show bound state
    if (state.website) {
      return (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top: Website Info & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Website Info Card */}
            <Card
              className={cn(
                "col-span-1",
                isDarkTheme
                  ? "bg-zinc-900 border-zinc-800"
                  : "bg-white border-gray-200"
              )}
            >
              <CardHeader>
                <CardTitle
                  className={cn(
                    "flex items-center gap-2",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  <Globe className="w-5 h-5 text-emerald-500" />
                  {t.websiteInfo}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Unbind Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full mb-4",
                    isDarkTheme
                      ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                      : "border-red-500/30 text-red-600 hover:bg-red-50"
                  )}
                  onClick={() => {
                    if (
                      confirm(
                        uiLanguage === "zh"
                          ? "确定要解绑网站吗？这将清除所有绑定数据。"
                          : "Are you sure you want to unbind? This will clear all binding data."
                      )
                    ) {
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
                >
                  {uiLanguage === "zh" ? "解绑网站" : "Unbind"}
                </Button>

                <div>
                  <div
                    className={cn(
                      "text-xs mb-1",
                      isDarkTheme ? "text-zinc-500" : "text-gray-500"
                    )}
                  >
                    URL
                  </div>
                  <a
                    href={state.website.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-sm font-medium flex items-center gap-1 hover:underline",
                      isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                    )}
                  >
                    {state.website.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {state.website.industry && (
                  <div>
                    <div
                      className={cn(
                        "text-xs mb-1",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      Industry
                    </div>
                    <div
                      className={cn(
                        "text-sm",
                        isDarkTheme ? "text-zinc-200" : "text-gray-900"
                      )}
                    >
                      {state.website.industry}
                    </div>
                  </div>
                )}

                {state.website.monthlyVisits && (
                  <div>
                    <div
                      className={cn(
                        "text-xs mb-1",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {t.monthlyVisits}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        isDarkTheme ? "text-zinc-200" : "text-gray-900"
                      )}
                    >
                      {state.website.monthlyVisits.toLocaleString()}
                    </div>
                  </div>
                )}

                {state.website.monthlyRevenue && (
                  <div>
                    <div
                      className={cn(
                        "text-xs mb-1",
                        isDarkTheme ? "text-zinc-500" : "text-gray-500"
                      )}
                    >
                      {t.monthlyRevenue}
                    </div>
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        isDarkTheme ? "text-zinc-200" : "text-gray-900"
                      )}
                    >
                      {state.website.monthlyRevenue}
                    </div>
                  </div>
                )}

                {state.website.marketingTools &&
                  state.website.marketingTools.length > 0 && (
                    <div>
                      <div
                        className={cn(
                          "text-xs mb-2",
                          isDarkTheme ? "text-zinc-500" : "text-gray-500"
                        )}
                      >
                        {t.features}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {state.website.marketingTools.map((tool, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={cn(
                              isDarkTheme
                                ? "border-zinc-700 text-zinc-300"
                                : "border-gray-300 text-gray-700"
                            )}
                          >
                            {tool}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Feature Guidance & Data Overview */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
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
                    {uiLanguage === "zh" ? "功能指引" : "Feature Guidance"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className={cn(
                        "h-auto p-4 flex flex-col items-start gap-2",
                        isDarkTheme
                          ? "border-zinc-700 hover:bg-zinc-800"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                      onClick={() => handleTabChange("website-data")}
                    >
                      <Hash className="w-5 h-5 text-emerald-500" />
                      <div className="text-left">
                        <div className="font-medium text-sm">
                          {t.websiteData}
                        </div>
                        <div
                          className={cn(
                            "text-xs mt-1",
                            isDarkTheme ? "text-zinc-500" : "text-gray-500"
                          )}
                        >
                          {uiLanguage === "zh"
                            ? "查看网站关键词数据"
                            : "View website keyword data"}
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className={cn(
                        "h-auto p-4 flex flex-col items-start gap-2",
                        isDarkTheme
                          ? "border-zinc-700 hover:bg-zinc-800"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                      onClick={() => handleTabChange("article-rankings")}
                    >
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                      <div className="text-left">
                        <div className="font-medium text-sm">
                          {t.articleRankings}
                        </div>
                        <div
                          className={cn(
                            "text-xs mt-1",
                            isDarkTheme ? "text-zinc-500" : "text-gray-500"
                          )}
                        >
                          {uiLanguage === "zh"
                            ? "查看文章排名机会"
                            : "View article ranking opportunities"}
                        </div>
                      </div>
                    </Button>
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
                <CardHeader>
                  <CardTitle
                    className={cn(isDarkTheme ? "text-white" : "text-gray-900")}
                  >
                    {t.dataOverview}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "text-sm text-center py-8",
                      isDarkTheme ? "text-zinc-500" : "text-gray-500"
                    )}
                  >
                    {uiLanguage === "zh"
                      ? "暂无数据 - 请先从其他标签页获取数据"
                      : "No data yet - Please fetch data from other tabs first"}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Bottom: Website Manager */}
          <Card
            className={cn(
              isDarkTheme
                ? "bg-zinc-900 border-zinc-800"
                : "bg-white border-gray-200"
            )}
          >
            <CardHeader>
              <CardTitle
                className={cn(
                  "flex items-center gap-2",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                <Hash className="w-5 h-5 text-emerald-500" />
                {uiLanguage === "zh" ? "所有网站" : "All Websites"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WebsiteManager
                userId={1} // TODO: Get from session
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
                onWebsiteSelect={(website) => {
                  setState({ website });
                }}
                currentWebsiteId={state.website?.id}
              />
            </CardContent>
          </Card>
        </div>
      );
    }

    // 5-step onboarding flow
    switch (state.onboardingStep) {
      case 0:
        // Step 1: Enter URL
        return (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-6">
            <div className="w-full max-w-xl text-center space-y-8">
              {/* Icon */}
              <div className="flex justify-center">
                <div
                  className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center",
                    isDarkTheme
                      ? "bg-emerald-500/10 border border-emerald-500/20"
                      : "bg-emerald-50 border border-emerald-100"
                  )}
                >
                  <Globe className="w-10 h-10 text-emerald-500" />
                </div>
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h2
                  className={cn(
                    "text-3xl font-semibold tracking-tight",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  {t.bindWebsite}
                </h2>
                <p
                  className={cn(
                    "text-base leading-relaxed max-w-lg mx-auto",
                    isDarkTheme ? "text-zinc-400" : "text-gray-600"
                  )}
                >
                  {uiLanguage === "zh"
                    ? "输入您的网站URL，我们将自动分析并生成SEO策略"
                    : "Enter your website URL and we'll automatically analyze and generate SEO strategy"}
                </p>
              </div>

              {/* Input and Button */}
              <div className="space-y-4 max-w-md mx-auto">
                <Input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={t.enterUrlPlaceholder}
                  className={cn(
                    "h-12 text-base",
                    isDarkTheme
                      ? "bg-zinc-900/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUrlSubmit();
                    }
                  }}
                />

                <Button
                  size="lg"
                  className={cn(
                    "h-12 px-6 text-base font-medium",
                    "bg-emerald-500 hover:bg-emerald-600 text-white",
                    "transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:shadow-emerald-500/20"
                  )}
                  onClick={handleUrlSubmit}
                >
                  {uiLanguage === "zh" ? "开始分析" : "Start Analysis"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
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
                  "text-3xl font-bold mb-3",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {uiLanguage === "zh"
                  ? "分析您的网站中..."
                  : "Analyzing your website..."}
              </h2>
              <p
                className={cn(
                  "text-sm",
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
                    "text-sm",
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
                    "text-sm",
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
                    "text-sm",
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
                "text-2xl font-bold mb-6 text-center",
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
                      "ml-4 text-sm font-medium",
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
                    {state.demoContent?.chatGPTDemo?.userQuestion ||
                      t.bestAgeVerification}
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
                        "text-sm mb-4",
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
                          },
                          body: JSON.stringify({
                            userId: 1, // TODO: Get from session/auth
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
                      } else {
                        console.log(
                          "[Content Generation] Website data saved successfully"
                        );
                      }
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
                      }
                    }

                    const boundWebsite = {
                      url: tempUrl,
                      boundAt: new Date().toISOString(),
                      monthlyRevenue: qa2,
                      marketingTools: qa3,
                      additionalInfo: qa4,
                    };

                    // Save to localStorage
                    try {
                      localStorage.setItem(
                        "google_seo_bound_website",
                        JSON.stringify(boundWebsite)
                      );
                    } catch (error) {
                      console.error(
                        "[Content Generation] Failed to save website to localStorage:",
                        error
                      );
                    }

                    setState({
                      website: boundWebsite,
                      onboardingStep: 5, // Complete (bound state will show)
                    });
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

  // Old functions removed - now using WebsiteDataTab and ArticleRankingsTab components

  // Render Publish Tab
  const renderPublish = () => {
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
            ? "发布功能即将推出..."
            : "Publish feature coming soon..."}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Tab Content - No top tabs needed, they're in sidebar */}
      {state.activeTab === "my-website" && renderMyWebsite()}
      {state.activeTab === "website-data" && (
        <WebsiteDataTab
          website={state.website}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />
      )}
      {state.activeTab === "article-rankings" && (
        <ArticleRankingsTab
          website={state.website}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
        />
      )}
      {state.activeTab === "publish" && renderPublish()}
    </div>
  );
};
