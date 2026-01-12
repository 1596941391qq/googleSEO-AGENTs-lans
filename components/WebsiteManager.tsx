import React, { useState, useEffect } from "react";
import {
  Globe,
  CheckCircle,
  Trash2,
  ChevronRight,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Link2,
  ExternalLink,
  Zap,
  Activity,
  BarChart3,
  Search,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import { fetchWithAuth, postWithAuth } from "../lib/api-client";

export interface Website {
  id: string;
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  screenshot: string | null;
  industry: string | null;
  monthlyVisits: number | null;
  monthlyRevenue: string | null;
  marketingTools: string[];
  isDefault: boolean;
  lastAccessedAt: Date | null;
  boundAt: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // New fields for UI
  healthScore?: number;
  estTraffic?: string;
  keywordsCount?: number;
  top10Count?: number;
  trafficCost?: number;
  statusBadges?: string[];
}

export interface WebsitesListData {
  websites: Website[];
  currentWebsite: Website | null;
  preferences: {
    defaultWebsiteId: string | null;
    lastSelectedWebsiteId: string | null;
    uiSettings: any;
  };
}

interface WebsiteManagerProps {
  userId?: string;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  onWebsiteSelect?: (website: Website) => void;
  onWebsiteBind?: (website: Website) => void;
  onWebsiteUnbind?: (websiteId: string) => void;
  onAddWebsite?: (
    url: string,
    scrapedData?: {
      title?: string;
      description?: string;
      screenshot?: string;
      content?: string;
    }
  ) => void;
  currentWebsiteId?: string | null;
}

export const WebsiteManager: React.FC<WebsiteManagerProps> = ({
  userId,
  isDarkTheme,
  uiLanguage,
  onWebsiteSelect,
  onWebsiteBind,
  onWebsiteUnbind,
  onAddWebsite,
  currentWebsiteId,
}) => {
  const [data, setData] = useState<WebsitesListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingWebsiteId, setDeletingWebsiteId] = useState<string | null>(
    null
  );
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [addingWebsite, setAddingWebsite] = useState(false);

  // Load websites list
  const loadWebsites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuth(`/api/websites/list`);

      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      } else {
        const errorText = await response.text();
        setError(
          uiLanguage === "zh"
            ? "加载网站列表失败"
            : "Failed to load websites list"
        );
        console.error("[WebsiteManager] API error:", errorText);
      }
    } catch (error: any) {
      console.error("[WebsiteManager] Failed to load:", error);
      setError(
        uiLanguage === "zh" ? "网络连接失败" : "Network connection failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Set default website
  const setDefaultWebsite = async (websiteId: string) => {
    setSettingDefaultId(websiteId);

    try {
      const response = await postWithAuth("/api/websites/set-default", {
        websiteId,
        userId,
      });

      if (response.ok) {
        // Reload list
        await loadWebsites();
      } else {
        const errorText = await response.text();
        console.error("[WebsiteManager] Set default error:", errorText);
      }
    } catch (error: any) {
      console.error("[WebsiteManager] Failed to set default:", error);
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Delete website
  const deleteWebsite = async (websiteId: string) => {
    if (
      !confirm(
        uiLanguage === "zh"
          ? "确定要删除这个网站吗？"
          : "Are you sure you want to delete this website?"
      )
    ) {
      return;
    }

    setDeletingWebsiteId(websiteId);

    try {
      const response = await fetchWithAuth("/api/websites/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteId,
          userId,
        }),
      });

      if (response.ok) {
        // Immediately remove from local state for instant UI update
        if (data) {
          setData({
            ...data,
            websites: data.websites.filter((w) => w.id !== websiteId),
          });
        }
        // Then reload list to sync with server
        await loadWebsites();
      } else {
        const errorText = await response.text();
        console.error("[WebsiteManager] Delete error:", errorText);
      }
    } catch (error: any) {
      console.error("[WebsiteManager] Failed to delete:", error);
    } finally {
      setDeletingWebsiteId(null);
    }
  };

  // Add website
  const handleAddWebsite = async () => {
    if (!newWebsiteUrl || newWebsiteUrl.trim() === "") {
      alert(
        uiLanguage === "zh" ? "请输入网站URL" : "Please enter a website URL"
      );
      return;
    }

    let processedUrl = newWebsiteUrl.trim();
    if (
      !processedUrl.startsWith("http://") &&
      !processedUrl.startsWith("https://")
    ) {
      processedUrl = "https://" + processedUrl;
    }

    try {
      new URL(processedUrl);
    } catch {
      alert(uiLanguage === "zh" ? "无效的URL格式" : "Invalid URL format");
      return;
    }

    setAddingWebsite(true);

    try {
      // Step 1: Scrape website
      const scrapeResponse = await postWithAuth("/api/scrape-website", {
        url: processedUrl,
      });

      if (!scrapeResponse.ok) {
        throw new Error("Failed to scrape website");
      }

      const scrapeData = await scrapeResponse.json();
      if (!scrapeData.success || !scrapeData.data) {
        throw new Error("Invalid scrape response");
      }

      // Step 2: Save website
      const saveResponse = await postWithAuth("/api/website-data/save", {
        userId,
        websiteUrl: processedUrl,
        websiteTitle: scrapeData.data.title || null,
        websiteDescription: scrapeData.data.description || null,
        websiteScreenshot: scrapeData.data.screenshot || null,
        rawContent: scrapeData.data.content || null,
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save website");
      }

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error("Invalid save response");
      }

      // Step 3: Trigger metrics update in background (don't await)
      postWithAuth("/api/website-data/update-metrics", {
        websiteId: saveData.data.websiteId,
        userId,
      }).catch((err) =>
        console.warn("[WebsiteManager] Failed to trigger initial metrics:", err)
      );

      // If onAddWebsite callback is provided, trigger the demo flow with scraped data
      if (onAddWebsite) {
        onAddWebsite(processedUrl, {
          title: scrapeData.data.title,
          description: scrapeData.data.description,
          screenshot: scrapeData.data.screenshot,
          content: scrapeData.data.content,
        });
        setNewWebsiteUrl("");
        setShowAddWebsite(false);
      } else {
        // Otherwise, just reload list
        await loadWebsites();
        setNewWebsiteUrl("");
        setShowAddWebsite(false);
      }
    } catch (error: any) {
      console.error("[WebsiteManager] Failed to add website:", error);
      alert(
        uiLanguage === "zh"
          ? `添加网站失败: ${error.message}`
          : `Failed to add website: ${error.message}`
      );
    } finally {
      setAddingWebsite(false);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, [userId]);

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
          "flex items-center justify-center py-16",
          isDarkTheme ? "bg-zinc-900 text-zinc-400" : "bg-white text-gray-500"
        )}
      >
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm mb-3">{error}</p>
          <Button onClick={loadWebsites} variant="outline" size="sm">
            {uiLanguage === "zh" ? "重试" : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.websites.length === 0) {
    return (
      <div
        className={cn(
          "text-center py-16",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        <Globe className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p className="text-sm mb-4">
          {uiLanguage === "zh" ? "还没有绑定网站" : "No websites bound yet"}
        </p>
        {!showAddWebsite ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddWebsite(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {uiLanguage === "zh" ? "添加网站" : "Add Website"}
          </Button>
        ) : (
          <div className="max-w-md mx-auto space-y-3">
            <Input
              type="url"
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
              placeholder={
                uiLanguage === "zh"
                  ? "输入网站URL (例如: example.com)"
                  : "Enter website URL (e.g., example.com)"
              }
              className={cn(
                isDarkTheme
                  ? "bg-zinc-900 border-zinc-700 text-white"
                  : "bg-white border-gray-300"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddWebsite();
                } else if (e.key === "Escape") {
                  setShowAddWebsite(false);
                  setNewWebsiteUrl("");
                }
              }}
              disabled={addingWebsite}
            />
            <div className="flex gap-2 justify-center">
              <Button
                size="sm"
                onClick={handleAddWebsite}
                disabled={addingWebsite}
              >
                {addingWebsite ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uiLanguage === "zh" ? "添加中..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {uiLanguage === "zh" ? "添加" : "Add"}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddWebsite(false);
                  setNewWebsiteUrl("");
                }}
                disabled={addingWebsite}
              >
                <X className="w-4 h-4 mr-2" />
                {uiLanguage === "zh" ? "取消" : "Cancel"}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1
              className={cn(
                "text-4xl lg:text-5xl font-black tracking-tighter italic uppercase",
                isDarkTheme ? "text-white" : "text-gray-900"
              )}
            >
              {uiLanguage === "zh" ? "资产地图" : "Asset"}{" "}
              <span className="text-emerald-500">
                {uiLanguage === "zh" ? "Asset Discovery" : "Discovery"}
              </span>
            </h1>
          </div>
          <p
            className={cn(
              "text-sm lg:text-base font-medium opacity-60",
              isDarkTheme ? "text-zinc-400" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh"
              ? "集成 DataForSEO Labs 实时数据，深度透视全域 SEO 表现"
              : "Integrated DataForSEO Labs real-time data, deep insight into global SEO performance"}
          </p>
        </div>
        {!showAddWebsite ? (
          <Button
            size="lg"
            onClick={() => setShowAddWebsite(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl px-6 py-6 shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all hover:scale-105"
          >
            <Plus className="w-5 h-5 mr-2" />
            {uiLanguage === "zh" ? "绑定新站点" : "Bind New Site"}
          </Button>
        ) : (
          <div className="flex items-center gap-3 bg-zinc-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-xl">
            <Input
              type="url"
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
              placeholder={
                uiLanguage === "zh" ? "输入网站URL" : "Enter website URL"
              }
              className={cn(
                "w-64 h-12 rounded-xl",
                isDarkTheme
                  ? "bg-black border-white/10 text-white"
                  : "bg-white border-gray-200"
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddWebsite();
                } else if (e.key === "Escape") {
                  setShowAddWebsite(false);
                  setNewWebsiteUrl("");
                }
              }}
              disabled={addingWebsite}
            />
            <Button
              size="lg"
              onClick={handleAddWebsite}
              disabled={addingWebsite}
              className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
            >
              {addingWebsite ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Plus className="w-5 h-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setShowAddWebsite(false);
                setNewWebsiteUrl("");
              }}
              disabled={addingWebsite}
              className="rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Websites List - Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {data.websites.map((website) => (
          <WebsiteCard
            key={website.id}
            website={website}
            isDarkTheme={isDarkTheme}
            uiLanguage={uiLanguage}
            isCurrent={website.id === currentWebsiteId}
            onSelect={() => onWebsiteSelect?.(website)}
            onBind={() => onWebsiteBind?.(website)}
            onUnbind={() => onWebsiteUnbind?.(website.id)}
            onSetDefault={() => setDefaultWebsite(website.id)}
            onDelete={() => deleteWebsite(website.id)}
            isSettingDefault={settingDefaultId === website.id}
            isDeleting={deletingWebsiteId === website.id}
          />
        ))}
      </div>
    </div>
  );
};

interface WebsiteCardProps {
  website: Website;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  isCurrent: boolean;
  onSelect: () => void;
  onBind?: () => void;
  onUnbind?: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
  isSettingDefault: boolean;
  isDeleting: boolean;
}

const WebsiteCard: React.FC<WebsiteCardProps> = ({
  website,
  isDarkTheme,
  uiLanguage,
  isCurrent,
  onSelect,
  onBind,
  onUnbind,
  onSetDefault,
  onDelete,
  isSettingDefault,
  isDeleting,
}) => {
  // Format traffic and keywords
  const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + "B";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const estTraffic = formatNumber(website.monthlyVisits || 0);
  const keywordsCount = website.keywordsCount || 0;
  const top10Count = website.top10Count || 0;

  // Derive status badges from real data
  const statusBadges = React.useMemo(() => {
    if (website.statusBadges && website.statusBadges.length > 0)
      return website.statusBadges;

    const badges = [];
    if (keywordsCount > 100) {
      badges.push(uiLanguage === "zh" ? "活跃索引" : "ACTIVE INDEX");
    }
    if (top10Count > 50) {
      badges.push(uiLanguage === "zh" ? "高权重站" : "HIGH AUTHORITY");
    }
    if (badges.length === 0) {
      badges.push(uiLanguage === "zh" ? "扫描中" : "SCANNING");
    }
    return badges;
  }, [website.statusBadges, keywordsCount, top10Count, uiLanguage]);

  // Ensure screenshot is a valid image source (handle base64 missing prefix)
  const screenshotSrc = React.useMemo(() => {
    if (!website.screenshot) return null;
    if (
      website.screenshot.startsWith("http") ||
      website.screenshot.startsWith("data:")
    ) {
      return website.screenshot;
    }
    // If it looks like base64 but missing prefix, add it
    if (/^[A-Za-z0-9+/=]{100,}$/.test(website.screenshot)) {
      return `data:image/png;base64,${website.screenshot}`;
    }
    return website.screenshot;
  }, [website.screenshot]);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500 border-none rounded-[32px]",
        isDarkTheme ? "bg-[#0f0f0f]/80" : "bg-white",
        "hover:scale-[1.02] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]",
        isCurrent && "ring-2 ring-emerald-500/50"
      )}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      {/* Top Image Section */}
      <div className="relative h-48 overflow-hidden rounded-[24px] m-3">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        {screenshotSrc ? (
          <img
            src={screenshotSrc}
            alt={website.title || website.domain}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <Globe className="w-12 h-12 text-zinc-700" />
          </div>
        )}

        {/* Top 10 Rankings Overlay */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-center justify-center min-w-[56px] h-14 px-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/10">
          <span className="text-[8px] lg:text-[10px] font-black text-emerald-500 uppercase tracking-tighter">
            TOP 10
          </span>
          <span className="text-xl lg:text-2xl font-black text-white leading-none">
            {formatNumber(top10Count)}
          </span>
        </div>

        {/* Status Badges Overlay */}
        <div className="absolute bottom-4 left-4 z-20 flex gap-2">
          {statusBadges.map((badge, idx) => (
            <div
              key={idx}
              className="px-2 py-1 rounded-md bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-[9px] lg:text-[11px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1"
            >
              <Zap size={8} />
              {badge}
            </div>
          ))}
        </div>
      </div>

      <CardContent className="p-6 pt-2 space-y-6 relative z-10">
        {/* Title & URL */}
        <div className="space-y-1">
          <h3
            className={cn(
              "text-xl lg:text-2xl font-black tracking-tight truncate",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {website.title || website.domain}
          </h3>
          <div className="flex items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest text-emerald-500">
              HTTPS://
            </span>
            <span className="text-[10px] lg:text-xs font-black uppercase tracking-widest truncate max-w-[150px]">
              {website.domain}
            </span>
            <ExternalLink size={10} className="text-zinc-500" />
          </div>
        </div>

        {/* Progress Bars (Decorative like image) */}
        <div className="flex gap-1">
          {[40, 60, 30, 80, 50, 90].map((w, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden"
            >
              <div
                className="h-full bg-emerald-500/40"
                style={{ width: `${w}%` }}
              />
            </div>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-1">
            <span className="text-[8px] lg:text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
              EST. TRAFFIC
            </span>
            <span className="text-lg lg:text-xl font-black text-white">
              {estTraffic}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-zinc-900/50 border border-white/5 space-y-1">
            <span className="text-[8px] lg:text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
              KEYWORDS
            </span>
            <span className="text-lg lg:text-xl font-black text-white">
              {keywordsCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex gap-2">
          <Button
            onClick={() => (onBind ? onBind() : onSelect())}
            className={cn(
              "flex-1 h-12 rounded-xl font-black text-xs lg:text-sm uppercase tracking-widest transition-all",
              isCurrent
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "bg-white text-black hover:bg-zinc-200"
            )}
          >
            {isCurrent ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {uiLanguage === "zh" ? "当前站点" : "Current Site"}
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                {uiLanguage === "zh" ? "绑定" : "Bind"}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="w-12 h-12 rounded-xl border-white/10 bg-zinc-900/50 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
