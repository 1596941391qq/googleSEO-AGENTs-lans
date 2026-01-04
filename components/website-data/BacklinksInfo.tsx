import React from "react";
import { Link2, Globe, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";
import { Skeleton } from "../ui/skeleton";

interface BacklinksInfo {
  referringDomains: number;
  referringMainDomains: number;
  referringPages: number;
  dofollow: number;
  backlinks: number;
  timeUpdate?: string;
}

interface BacklinksInfoProps {
  backlinks?: BacklinksInfo | null;
  isLoading?: boolean;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const BacklinksInfo: React.FC<BacklinksInfoProps> = ({
  backlinks,
  isLoading = false,
  isDarkTheme,
  uiLanguage,
}) => {
  if (isLoading || !backlinks) {
    return (
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
              "flex items-center gap-2 text-base",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            <Link2 className="w-4 h-4 text-emerald-500" />
            {uiLanguage === "zh" ? "外链信息" : "Backlinks Info"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton
                  className={cn(
                    "h-4 w-20",
                    isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                  )}
                />
                <Skeleton
                  className={cn(
                    "h-6 w-24",
                    isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
                  )}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + "K";
    }
    return num.toLocaleString();
  };

  const stats = [
    {
      label: uiLanguage === "zh" ? "外链域名" : "Referring Domains",
      value: formatNumber(backlinks.referringDomains),
      icon: Globe,
      color: "text-blue-500",
    },
    {
      label: uiLanguage === "zh" ? "主域名" : "Main Domains",
      value: formatNumber(backlinks.referringMainDomains),
      icon: Globe,
      color: "text-purple-500",
    },
    {
      label: uiLanguage === "zh" ? "引用页面" : "Referring Pages",
      value: formatNumber(backlinks.referringPages),
      icon: FileText,
      color: "text-green-500",
    },
    {
      label: uiLanguage === "zh" ? "Dofollow链接" : "Dofollow Links",
      value: formatNumber(backlinks.dofollow),
      icon: Link2,
      color: "text-emerald-500",
    },
    {
      label: uiLanguage === "zh" ? "总外链数" : "Total Backlinks",
      value: formatNumber(backlinks.backlinks),
      icon: ExternalLink,
      color: "text-orange-500",
    },
  ];

  return (
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
            "flex items-center gap-2 text-base",
            isDarkTheme ? "text-white" : "text-gray-900"
          )}
        >
          <Link2 className="w-4 h-4 text-emerald-500" />
          {uiLanguage === "zh" ? "外链信息" : "Backlinks Info"}
        </CardTitle>
        {backlinks.timeUpdate && (
          <p
            className={cn(
              "text-xs mt-1",
              isDarkTheme ? "text-zinc-500" : "text-gray-500"
            )}
          >
            {uiLanguage === "zh" ? "最后更新" : "Last updated"}:{" "}
            {new Date(backlinks.timeUpdate).toLocaleString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-lg border",
                  isDarkTheme
                    ? "bg-zinc-800/50 border-zinc-700"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("w-4 h-4", stat.color)} />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isDarkTheme ? "text-zinc-400" : "text-gray-600"
                    )}
                  >
                    {stat.label}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-xl font-bold",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
