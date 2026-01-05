import React, { useState, useEffect } from "react";
import {
  Loader2,
  AlertCircle,
  TrendingUp,
  FileText,
  Sparkles,
  Download,
  Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface KeywordRecommendation {
  keyword: string;
  metrics: {
    msv: number;
    kd: number;
    competition: number;
    cpc: number;
    intent: string;
  };
  strategy: {
    content_type: string;
    suggested_word_count: string;
    differentiation: string;
  };
  expected_results: {
    ranking_potential: string;
    monthly_traffic_est: string;
  };
  recommendation_index?: number;
}

interface KeywordRecommendationList {
  priority: number;
  label: string;
  keywords: KeywordRecommendation[];
}

interface KeywordIntelligenceData {
  report_metadata: {
    title: string;
    target_market: string;
    language: string;
    primary_keyword: string;
    data_sources: string[];
    analysis_date: string;
  };
  executive_summary: {
    top_5_keywords: Array<{
      rank: number;
      keyword: string;
      msv: number;
      kd: number;
      intent: string;
      recommendation_index: number;
    }>;
    overall_assessment: {
      feasibility: string;
      high_value_keyword_count: number;
      average_kd: number;
      opportunity_rating: string;
    };
  };
  keyword_recommendation_list: KeywordRecommendationList[];
}

interface KeywordIntelligenceViewProps {
  websiteId: string;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const KeywordIntelligenceView: React.FC<KeywordIntelligenceViewProps> = ({
  websiteId,
  isDarkTheme,
  uiLanguage,
}) => {
  const [data, setData] = useState<KeywordIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  useEffect(() => {
    loadKeywordRecommendations();
  }, [websiteId]);

  const loadKeywordRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/website-data/analyze-keyword-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: 1, // TODO: Get from session
          topN: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load keyword recommendations");
      }

      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
        // 默认选择第一个推荐的关键词
        if (result.data.keyword_recommendation_list && result.data.keyword_recommendation_list.length > 0) {
          const firstKeyword = result.data.keyword_recommendation_list[0]?.keywords?.[0];
          if (firstKeyword) {
            setSelectedKeyword(firstKeyword.keyword);
          }
        }
      } else {
        // 如果没有关键词数据，显示友好提示
        if (result.error && result.error.includes("No keywords found")) {
          setError(uiLanguage === "zh" 
            ? "未找到关键词数据。请先在总览页面更新网站指标。"
            : "No keywords found. Please update website metrics in the Overview page first.");
        } else {
          throw new Error(result.error || "No data returned");
        }
      }
    } catch (err: any) {
      console.error("[KeywordIntelligenceView] Error:", err);
      setError(err.message || "Failed to load keyword recommendations");
    } finally {
      setLoading(false);
    }
  };

  // 获取所有关键词（扁平化）
  const getAllKeywords = (): KeywordRecommendation[] => {
    if (!data) return [];
    return data.keyword_recommendation_list.flatMap((list) => list.keywords);
  };

  // 获取推荐部署方案（选中的关键词）
  const getSelectedKeywordDeployment = (): KeywordRecommendation | null => {
    if (!selectedKeyword || !data) return null;
    const allKeywords = getAllKeywords();
    return allKeywords.find((kw) => kw.keyword === selectedKeyword) || null;
  };

  // 格式化数字
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // 获取意图标签颜色
  const getIntentColor = (intent: string) => {
    const upperIntent = intent.toUpperCase();
    if (upperIntent.includes("INFORMATIONAL")) {
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
    if (upperIntent.includes("COMMERCIAL")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (upperIntent.includes("TRANSACTIONAL")) {
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    }
    if (upperIntent.includes("NAVIGATIONAL")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  };

  // 获取推荐分数显示（竖条）
  const getRecommendationBars = (index: number) => {
    const bars = Math.min(5, Math.max(1, index || 1));
    return Array.from({ length: bars }).map((_, i) => (
      <div
        key={i}
        className={cn(
          "w-1 h-4 rounded",
          isDarkTheme ? "bg-emerald-400" : "bg-emerald-500"
        )}
      />
    ));
  };

  // 导出CSV
  const handleExportCSV = () => {
    const allKeywords = getAllKeywords();
    const headers = [
      "Keyword",
      "Monthly Search Volume",
      "Keyword Difficulty",
      "CPC",
      "Intent",
      "Recommendation Index",
      "Content Type",
      "Suggested Word Count",
      "Differentiation",
    ];
    const rows = allKeywords.map((kw) => [
      kw.keyword,
      kw.metrics.msv.toString(),
      kw.metrics.kd.toString(),
      kw.metrics.cpc.toFixed(2),
      kw.metrics.intent,
      (kw.recommendation_index || 0).toString(),
      kw.strategy.content_type,
      kw.strategy.suggested_word_count,
      kw.strategy.differentiation,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `keyword-recommendations-${Date.now()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2
            className={cn(
              "w-8 h-8 animate-spin mx-auto mb-4",
              isDarkTheme ? "text-emerald-400" : "text-emerald-500"
            )}
          />
          <p
            className={cn(
              "text-sm",
              isDarkTheme ? "text-zinc-400" : "text-gray-500"
            )}
          >
            {uiLanguage === "zh"
              ? "正在分析关键词推荐..."
              : "Analyzing keyword recommendations..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "p-6 rounded-lg border text-center",
          isDarkTheme
            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
            : "bg-amber-50 border-amber-200 text-amber-700"
        )}
      >
        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
        <p className="text-sm mb-1">{error}</p>
        {error.includes("未找到关键词") || error.includes("No keywords found") ? (
          <p className={cn(
            "text-xs mt-2",
            isDarkTheme ? "text-amber-300" : "text-amber-600"
          )}>
            {uiLanguage === "zh" 
              ? "提示：请先切换到「总览」页面，点击「刷新」按钮更新网站指标数据。"
              : "Tip: Please switch to the Overview page and click the Refresh button to update website metrics."}
          </p>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={loadKeywordRecommendations}
            className={cn(
              "mt-4",
              isDarkTheme
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            {uiLanguage === "zh" ? "重试" : "Retry"}
          </Button>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className={cn(
          "text-center py-8 text-sm",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        {uiLanguage === "zh"
          ? "暂无数据"
          : "No data available"}
      </div>
    );
  }

  const allKeywords = getAllKeywords();
  const selectedDeployment = getSelectedKeywordDeployment();

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={cn(
              "text-lg font-semibold",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "高价值关键词" : "High Value Keywords"}
          </h2>
          <p
            className={cn(
              "text-xs mt-1",
              isDarkTheme ? "text-zinc-500" : "text-gray-500"
            )}
          >
            {uiLanguage === "zh"
              ? "基于排名前十的关键词分析"
              : "Based on top 10 ranked keywords"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className={cn(
              isDarkTheme
                ? "bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <Download className="w-4 h-4 mr-2" />
            {uiLanguage === "zh" ? "导出 CSV" : "Export CSV"}
          </Button>
          <Button
            size="sm"
            className={cn(
              "bg-emerald-500 hover:bg-emerald-600 text-white"
            )}
          >
            <Rocket className="w-4 h-4 mr-2" />
            {uiLanguage === "zh" ? "全部部署" : "Deploy All"}
          </Button>
        </div>
      </div>

      {/* Keywords Table */}
      <Card
        className={cn(
          isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn(
              "text-base font-semibold",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "关键词列表" : "Keywords List"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  className={cn(
                    "border-b text-xs uppercase",
                    isDarkTheme
                      ? "border-zinc-800 text-zinc-400"
                      : "border-gray-200 text-gray-500"
                  )}
                >
                  <th className="pb-3 text-left font-medium">
                    {uiLanguage === "zh" ? "关键词" : "Keyword"}
                  </th>
                  <th className="pb-3 text-right font-medium">
                    {uiLanguage === "zh" ? "月搜索量" : "Monthly MSV"}
                  </th>
                  <th className="pb-3 text-center font-medium">
                    {uiLanguage === "zh" ? "难度 (KD)" : "Difficulty (KD)"}
                  </th>
                  <th className="pb-3 text-center font-medium">
                    {uiLanguage === "zh" ? "意图" : "Intent"}
                  </th>
                  <th className="pb-3 text-center font-medium">
                    {uiLanguage === "zh" ? "推荐" : "Recommendation"}
                  </th>
                  <th className="pb-3 text-center font-medium">
                    {uiLanguage === "zh" ? "操作" : "Action"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {allKeywords.map((kw, index) => (
                  <tr
                    key={index}
                    className={cn(
                      "border-b text-sm cursor-pointer transition-colors",
                      isDarkTheme
                        ? "border-zinc-800 hover:bg-zinc-800/50"
                        : "border-gray-100 hover:bg-gray-50",
                      selectedKeyword === kw.keyword &&
                        (isDarkTheme ? "bg-zinc-800/70" : "bg-gray-50")
                    )}
                    onClick={() => setSelectedKeyword(kw.keyword)}
                  >
                    <td className="py-3 pr-2">
                      <div
                        className={cn(
                          "font-medium",
                          isDarkTheme ? "text-white" : "text-gray-900"
                        )}
                      >
                        {kw.keyword}
                      </div>
                      <div
                        className={cn(
                          "text-xs mt-1",
                          isDarkTheme ? "text-zinc-500" : "text-gray-500"
                        )}
                      >
                        CPC: ${kw.metrics.cpc.toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isDarkTheme ? "text-zinc-300" : "text-gray-700"
                        )}
                      >
                        {formatNumber(kw.metrics.msv)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center">
                        <div
                          className={cn(
                            "w-16 h-2 rounded-full overflow-hidden",
                            isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                          )}
                        >
                          <div
                            className={cn(
                              "h-full",
                              kw.metrics.kd <= 30
                                ? "bg-emerald-500"
                                : kw.metrics.kd <= 60
                                ? "bg-amber-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${Math.min(100, kw.metrics.kd)}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            "ml-2 text-xs font-medium",
                            isDarkTheme ? "text-zinc-300" : "text-gray-700"
                          )}
                        >
                          {kw.metrics.kd}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs border",
                          getIntentColor(kw.metrics.intent)
                        )}
                      >
                        {kw.metrics.intent}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {getRecommendationBars(kw.recommendation_index || 1)}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        className={cn(
                          "p-1 rounded hover:bg-opacity-20 transition-colors",
                          isDarkTheme
                            ? "text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500"
                            : "text-gray-400 hover:text-emerald-500 hover:bg-emerald-50"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedKeyword(kw.keyword);
                        }}
                      >
                        <TrendingUp className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Deployment Cards */}
      {selectedDeployment && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card
            className={cn(
              isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
            )}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle
                  className={cn(
                    "text-base font-semibold",
                    isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                  )}
                >
                  {selectedDeployment.keyword}
                </CardTitle>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p
                className={cn(
                  "text-xs mt-1",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}
              >
                {uiLanguage === "zh" ? "推荐部署" : "Recommended Deployment"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Strategy */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h4
                    className={cn(
                      "text-sm font-medium",
                      isDarkTheme ? "text-white" : "text-gray-900"
                    )}
                  >
                    {uiLanguage === "zh" ? "内容策略" : "Content Strategy"}
                  </h4>
                </div>
                <p
                  className={cn(
                    "text-sm mb-1",
                    isDarkTheme ? "text-zinc-300" : "text-gray-700"
                  )}
                >
                  {selectedDeployment.strategy.content_type}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}
                >
                  {uiLanguage === "zh" ? "建议字数：" : "Suggested: "}
                  {selectedDeployment.strategy.suggested_word_count}
                </p>
              </div>

              {/* Edge Differentiation */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4
                    className={cn(
                      "text-sm font-medium",
                      isDarkTheme ? "text-white" : "text-gray-900"
                    )}
                  >
                    {uiLanguage === "zh" ? "优势差异化" : "Edge Differentiation"}
                  </h4>
                </div>
                <p
                  className={cn(
                    "text-sm",
                    isDarkTheme ? "text-zinc-300" : "text-gray-700"
                  )}
                >
                  {selectedDeployment.strategy.differentiation}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Second card for additional keywords (if any) */}
          {allKeywords.length > 1 && allKeywords[1] && allKeywords[1].keyword !== selectedDeployment.keyword && (
            <Card
              className={cn(
                isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle
                    className={cn(
                      "text-base font-semibold",
                      isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                    )}
                  >
                    {allKeywords[1].keyword}
                  </CardTitle>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
                <p
                  className={cn(
                    "text-xs mt-1",
                    isDarkTheme ? "text-zinc-400" : "text-gray-500"
                  )}
                >
                  {uiLanguage === "zh" ? "推荐部署" : "Recommended Deployment"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <h4
                      className={cn(
                        "text-sm font-medium",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {uiLanguage === "zh" ? "内容策略" : "Content Strategy"}
                    </h4>
                  </div>
                  <p
                    className={cn(
                      "text-sm mb-1",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}
                  >
                    {allKeywords[1].strategy.content_type}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      isDarkTheme ? "text-zinc-500" : "text-gray-500"
                    )}
                  >
                    {uiLanguage === "zh" ? "建议字数：" : "Suggested: "}
                    {allKeywords[1].strategy.suggested_word_count}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4
                      className={cn(
                        "text-sm font-medium",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}
                    >
                      {uiLanguage === "zh" ? "优势差异化" : "Edge Differentiation"}
                    </h4>
                  </div>
                  <p
                    className={cn(
                      "text-sm",
                      isDarkTheme ? "text-zinc-300" : "text-gray-700"
                    )}
                  >
                    {allKeywords[1].strategy.differentiation}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
