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
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

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
  userId?: number;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  onWebsiteSelect?: (website: Website) => void;
  onWebsiteBind?: (website: Website) => void;
  onWebsiteUnbind?: (websiteId: string) => void;
  onAddWebsite?: (url: string) => void;
  currentWebsiteId?: string | null;
}

export const WebsiteManager: React.FC<WebsiteManagerProps> = ({
  userId = 1,
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
      const response = await fetch(`/api/websites/list?user_id=${userId}`);

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
      const response = await fetch("/api/websites/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId,
        }),
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
      const response = await fetch("/api/websites/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteId,
          userId,
        }),
      });

      if (response.ok) {
        // Reload list
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
      const scrapeResponse = await fetch("/api/scrape-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: processedUrl }),
      });

      if (!scrapeResponse.ok) {
        throw new Error("Failed to scrape website");
      }

      const scrapeData = await scrapeResponse.json();
      if (!scrapeData.success || !scrapeData.data) {
        throw new Error("Invalid scrape response");
      }

      // Step 2: Save website
      const saveResponse = await fetch("/api/website-data/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          websiteUrl: processedUrl,
          websiteTitle: scrapeData.data.title || null,
          websiteDescription: scrapeData.data.description || null,
          websiteScreenshot: scrapeData.data.screenshot || null,
          rawContent: scrapeData.data.content || null,
        }),
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save website");
      }

      const saveData = await saveResponse.json();
      if (!saveData.success) {
        throw new Error("Invalid save response");
      }

      // If onAddWebsite callback is provided, trigger the demo flow
      if (onAddWebsite) {
        onAddWebsite(processedUrl);
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={cn(
              "text-lg font-semibold",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {uiLanguage === "zh" ? "我的网站" : "My Websites"}
          </h2>
          <p
            className={cn(
              "text-sm mt-1",
              isDarkTheme ? "text-zinc-400" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh"
              ? `${data.websites.length} 个网站`
              : `${data.websites.length} website${
                  data.websites.length > 1 ? "s" : ""
                }`}
          </p>
        </div>
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
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={newWebsiteUrl}
              onChange={(e) => setNewWebsiteUrl(e.target.value)}
              placeholder={
                uiLanguage === "zh" ? "输入网站URL" : "Enter website URL"
              }
              className={cn(
                "w-64 h-8",
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
            <Button
              size="sm"
              onClick={handleAddWebsite}
              disabled={addingWebsite}
            >
              {addingWebsite ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddWebsite(false);
                setNewWebsiteUrl("");
              }}
              disabled={addingWebsite}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Websites List */}
      <div className="space-y-3">
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
  const formatDate = (date: Date | string | null) => {
    if (!date) return null;

    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (uiLanguage === "zh") {
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      return d.toLocaleDateString("zh-CN");
    } else {
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US");
    }
  };

  const lastAccessed = formatDate(website.lastAccessedAt || website.updatedAt);

  return (
    <Card
      className={cn(
        "transition-all cursor-pointer hover:shadow-md",
        isCurrent && "ring-2 ring-emerald-500",
        isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Left: Website Info */}
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {/* Icon/Favicon */}
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                isDarkTheme ? "bg-zinc-800" : "bg-gray-100"
              )}
            >
              <Globe
                className={cn(
                  "w-5 h-5",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3
                  className={cn(
                    "font-medium truncate",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  {website.title || website.domain}
                </h3>
                {website.isDefault && (
                  <Badge
                    variant="secondary"
                    className="flex-shrink-0 text-xs px-2 py-0"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {uiLanguage === "zh" ? "默认" : "Default"}
                  </Badge>
                )}
                {isCurrent && (
                  <Badge className="flex-shrink-0 text-xs px-2 py-0">
                    {uiLanguage === "zh" ? "当前" : "Current"}
                  </Badge>
                )}
              </div>
              <p
                className={cn(
                  "text-sm truncate mt-0.5",
                  isDarkTheme ? "text-zinc-400" : "text-gray-500"
                )}
              >
                {website.url}
              </p>
              {lastAccessed && (
                <p
                  className={cn(
                    "text-xs mt-1",
                    isDarkTheme ? "text-zinc-500" : "text-gray-400"
                  )}
                >
                  {uiLanguage === "zh" ? "最后访问" : "Last accessed"}:{" "}
                  {lastAccessed}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
            {!isCurrent && onBind && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onBind();
                }}
              >
                <Link2 className="w-3 h-3 mr-1" />
                {uiLanguage === "zh" ? "绑定" : "Bind"}
              </Button>
            )}
            {isCurrent && onUnbind && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "text-xs",
                  isDarkTheme
                    ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                    : "border-red-500/30 text-red-600 hover:bg-red-50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    confirm(
                      uiLanguage === "zh"
                        ? "确定要解绑这个网站吗？"
                        : "Are you sure you want to unbind this website?"
                    )
                  ) {
                    onUnbind();
                  }
                }}
              >
                <X className="w-3 h-3 mr-1" />
                {uiLanguage === "zh" ? "解绑" : "Unbind"}
              </Button>
            )}
            {!website.isDefault && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                disabled={isSettingDefault}
                onClick={(e) => {
                  e.stopPropagation();
                  onSetDefault();
                }}
              >
                {isSettingDefault ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : uiLanguage === "zh" ? (
                  "设为默认"
                ) : (
                  "Set Default"
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              disabled={isDeleting}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>

            <ChevronRight
              className={cn(
                "w-5 h-5",
                isDarkTheme ? "text-zinc-500" : "text-gray-400"
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
