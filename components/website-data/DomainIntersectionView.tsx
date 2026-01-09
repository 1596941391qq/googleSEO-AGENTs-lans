import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  TrendingUp,
  ExternalLink,
  Download,
  Loader2,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { getUserId } from "./utils";

interface DomainIntersection {
  targetDomain: string;
  competitorDomain: string;
  commonKeywords: Array<{
    keyword: string;
    ourPosition: number;
    competitorPosition: number;
    searchVolume: number;
  }>;
  gapKeywords: Array<{
    keyword: string;
    competitorPosition: number;
    searchVolume: number;
    etv: number;
  }>;
  ourKeywords: Array<{
    keyword: string;
    ourPosition: number;
    searchVolume: number;
  }>;
  gapTraffic: number;
}

interface DomainIntersectionViewProps {
  websiteId: string;
  competitorDomain: string;
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const DomainIntersectionView: React.FC<DomainIntersectionViewProps> = ({
  websiteId,
  competitorDomain,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
}) => {
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [intersection, setIntersection] = useState<DomainIntersection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"gap" | "common" | "our">("gap");

  useEffect(() => {
    if (websiteId && competitorDomain) {
      loadIntersection();
    }
  }, [websiteId, competitorDomain]);

  const loadIntersection = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/website-data/domain-intersection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId: currentUserId,
          competitorDomain,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setIntersection(result.data || null);
      } else {
        setError(uiLanguage === "zh" ? "加载失败" : "Failed to load");
      }
    } catch (err: any) {
      setError(err.message || (uiLanguage === "zh" ? "加载出错" : "Error loading"));
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (keywords: any[], filename: string) => {
    const headers = ["Keyword", "Position", "Search Volume", "ETV"];
    const rows = keywords.map((kw) => [
      kw.keyword,
      kw.competitorPosition || kw.ourPosition || "-",
      kw.searchVolume || 0,
      kw.etv || 0,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading || isLoading) {
    return (
      <Card
        className={cn(
          isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
        )}
      >
        <CardHeader>
          <CardTitle
            className={cn(
              "text-lg",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "域名重合度分析" : "Domain Intersection"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn(
          isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
        )}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!intersection) {
    return (
      <Card
        className={cn(
          isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
        )}
      >
        <CardContent className="pt-6">
          <p className={cn(
            "text-sm text-center",
            isDarkTheme ? "text-zinc-500" : "text-gray-500"
          )}>
            {uiLanguage === "zh" ? "暂无数据" : "No data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const gapKeywords = intersection.gapKeywords || [];
  const commonKeywords = intersection.commonKeywords || [];
  const ourKeywords = intersection.ourKeywords || [];

  return (
    <Card
      className={cn(
        isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-white border-gray-200"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle
            className={cn(
              "text-lg",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "域名重合度分析" : "Domain Intersection"}
          </CardTitle>
          <Badge variant="outline" className={cn(
            "text-xs",
            isDarkTheme ? "border-zinc-700 text-zinc-400" : "border-gray-300 text-gray-500"
          )}>
            {intersection.competitorDomain}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={cn(
            "p-4 rounded-lg border",
            isDarkTheme
              ? "bg-red-500/10 border-red-500/20"
              : "bg-red-50 border-red-200"
          )}>
            <div className={cn(
              "text-xs mb-1",
              isDarkTheme ? "text-red-400" : "text-red-600"
            )}>
              {uiLanguage === "zh" ? "Content Gap 关键词" : "Gap Keywords"}
            </div>
            <div className={cn(
              "text-2xl font-bold",
              isDarkTheme ? "text-red-400" : "text-red-600"
            )}>
              {gapKeywords.length}
            </div>
            <div className={cn(
              "text-xs mt-1",
              isDarkTheme ? "text-red-300" : "text-red-500"
            )}>
              ETV: {intersection.gapTraffic?.toLocaleString() || 0}
            </div>
          </div>
          <div className={cn(
            "p-4 rounded-lg border",
            isDarkTheme
              ? "bg-blue-500/10 border-blue-500/20"
              : "bg-blue-50 border-blue-200"
          )}>
            <div className={cn(
              "text-xs mb-1",
              isDarkTheme ? "text-blue-400" : "text-blue-600"
            )}>
              {uiLanguage === "zh" ? "共同关键词" : "Common Keywords"}
            </div>
            <div className={cn(
              "text-2xl font-bold",
              isDarkTheme ? "text-blue-400" : "text-blue-600"
            )}>
              {commonKeywords.length}
            </div>
          </div>
          <div className={cn(
            "p-4 rounded-lg border",
            isDarkTheme
              ? "bg-green-500/10 border-green-500/20"
              : "bg-green-50 border-green-200"
          )}>
            <div className={cn(
              "text-xs mb-1",
              isDarkTheme ? "text-green-400" : "text-green-600"
            )}>
              {uiLanguage === "zh" ? "我们独有的关键词" : "Our Unique Keywords"}
            </div>
            <div className={cn(
              "text-2xl font-bold",
              isDarkTheme ? "text-green-400" : "text-green-600"
            )}>
              {ourKeywords.length}
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex items-center gap-2 mb-4 border-b border-zinc-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("gap")}
            className={cn(
              "rounded-none border-b-2",
              activeTab === "gap"
                ? isDarkTheme
                  ? "border-red-500 text-red-400"
                  : "border-red-500 text-red-600"
                : "border-transparent"
            )}
          >
            {uiLanguage === "zh" ? "Content Gap" : "Content Gap"} ({gapKeywords.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("common")}
            className={cn(
              "rounded-none border-b-2",
              activeTab === "common"
                ? isDarkTheme
                  ? "border-blue-500 text-blue-400"
                  : "border-blue-500 text-blue-600"
                : "border-transparent"
            )}
          >
            {uiLanguage === "zh" ? "共同关键词" : "Common"} ({commonKeywords.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("our")}
            className={cn(
              "rounded-none border-b-2",
              activeTab === "our"
                ? isDarkTheme
                  ? "border-green-500 text-green-400"
                  : "border-green-500 text-green-600"
                : "border-transparent"
            )}
          >
            {uiLanguage === "zh" ? "我们独有的" : "Our Unique"} ({ourKeywords.length})
          </Button>
        </div>

        {/* 关键词列表 */}
        <div className="max-h-96 overflow-y-auto">
          {activeTab === "gap" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={cn(
                  "text-sm",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh"
                    ? "对手有排名而你没有排名的关键词（Content Gap）"
                    : "Keywords competitor ranks for but you don't (Content Gap)"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCSV(gapKeywords, "content-gap-keywords.csv")}
                  className={cn(
                    isDarkTheme
                      ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {uiLanguage === "zh" ? "导出 CSV" : "Export CSV"}
                </Button>
              </div>
              <div className="space-y-2">
                {gapKeywords.length === 0 ? (
                  <p className={cn(
                    "text-sm text-center py-8",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}>
                    {uiLanguage === "zh" ? "暂无数据" : "No data available"}
                  </p>
                ) : (
                  gapKeywords.map((kw, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border flex items-center justify-between",
                        isDarkTheme
                          ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                          : "bg-red-50 border-red-200 hover:bg-red-100"
                      )}
                    >
                      <div className="flex-1">
                        <div className={cn(
                          "font-medium text-sm",
                          isDarkTheme ? "text-white" : "text-gray-900"
                        )}>
                          {kw.keyword}
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className={cn(
                            "text-xs",
                            isDarkTheme ? "text-zinc-400" : "text-gray-500"
                          )}>
                            {uiLanguage === "zh" ? "对手排名" : "Competitor"}: #{kw.competitorPosition}
                          </span>
                          <span className={cn(
                            "text-xs",
                            isDarkTheme ? "text-zinc-400" : "text-gray-500"
                          )}>
                            {uiLanguage === "zh" ? "搜索量" : "Volume"}: {kw.searchVolume?.toLocaleString() || 0}
                          </span>
                          <span className={cn(
                            "text-xs font-medium",
                            isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                          )}>
                            ETV: {kw.etv?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "common" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={cn(
                  "text-sm",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh" ? "双方都有排名的关键词" : "Keywords both domains rank for"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCSV(commonKeywords, "common-keywords.csv")}
                  className={cn(
                    isDarkTheme
                      ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {uiLanguage === "zh" ? "导出 CSV" : "Export CSV"}
                </Button>
              </div>
              <div className="space-y-2">
                {commonKeywords.length === 0 ? (
                  <p className={cn(
                    "text-sm text-center py-8",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}>
                    {uiLanguage === "zh" ? "暂无数据" : "No data available"}
                  </p>
                ) : (
                  commonKeywords.map((kw, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        isDarkTheme
                          ? "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800"
                          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      <div className={cn(
                        "font-medium text-sm",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}>
                        {kw.keyword}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={cn(
                          "text-xs",
                          isDarkTheme ? "text-zinc-400" : "text-gray-500"
                        )}>
                          {uiLanguage === "zh" ? "我们" : "Us"}: #{kw.ourPosition}
                        </span>
                        <span className={cn(
                          "text-xs",
                          isDarkTheme ? "text-zinc-400" : "text-gray-500"
                        )}>
                          {uiLanguage === "zh" ? "对手" : "Competitor"}: #{kw.competitorPosition}
                        </span>
                        <span className={cn(
                          "text-xs",
                          isDarkTheme ? "text-zinc-400" : "text-gray-500"
                        )}>
                          {uiLanguage === "zh" ? "搜索量" : "Volume"}: {kw.searchVolume?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "our" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className={cn(
                  "text-sm",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}>
                  {uiLanguage === "zh" ? "我们有排名而对手没有的关键词" : "Keywords we rank for but competitor doesn't"}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => exportToCSV(ourKeywords, "our-unique-keywords.csv")}
                  className={cn(
                    isDarkTheme
                      ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {uiLanguage === "zh" ? "导出 CSV" : "Export CSV"}
                </Button>
              </div>
              <div className="space-y-2">
                {ourKeywords.length === 0 ? (
                  <p className={cn(
                    "text-sm text-center py-8",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}>
                    {uiLanguage === "zh" ? "暂无数据" : "No data available"}
                  </p>
                ) : (
                  ourKeywords.map((kw, index) => (
                    <div
                      key={index}
                      className={cn(
                        "p-3 rounded-lg border",
                        isDarkTheme
                          ? "bg-green-500/5 border-green-500/20 hover:bg-green-500/10"
                          : "bg-green-50 border-green-200 hover:bg-green-100"
                      )}
                    >
                      <div className={cn(
                        "font-medium text-sm",
                        isDarkTheme ? "text-white" : "text-gray-900"
                      )}>
                        {kw.keyword}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={cn(
                          "text-xs",
                          isDarkTheme ? "text-zinc-400" : "text-gray-500"
                        )}>
                          {uiLanguage === "zh" ? "排名" : "Position"}: #{kw.ourPosition}
                        </span>
                        <span className={cn(
                          "text-xs",
                          isDarkTheme ? "text-zinc-400" : "text-gray-500"
                        )}>
                          {uiLanguage === "zh" ? "搜索量" : "Volume"}: {kw.searchVolume?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
