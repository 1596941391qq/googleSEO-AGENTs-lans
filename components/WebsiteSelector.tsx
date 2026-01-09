import React, { useState, useEffect } from "react";
import {
  Globe,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import type { Website, WebsitesListData } from "./WebsiteManager";
import { useAuth } from "../contexts/AuthContext";
import { getUserId } from "./website-data/utils";

interface WebsiteSelectorProps {
  userId?: number;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
  selectedWebsiteId?: string | null;
  onWebsiteSelect?: (website: Website | null) => void;
  showAddButton?: boolean;
  onAddWebsite?: () => void;
}

export const WebsiteSelector: React.FC<WebsiteSelectorProps> = ({
  userId,
  isDarkTheme,
  uiLanguage,
  selectedWebsiteId,
  onWebsiteSelect,
  showAddButton = false,
  onAddWebsite,
}) => {
  const { user } = useAuth();
  const currentUserId = userId || getUserId(user);
  const [data, setData] = useState<WebsitesListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load websites list
  const loadWebsites = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/websites/list?user_id=${currentUserId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setData(result.data);

        // Auto-select current website if available and no selection yet
        if (!selectedWebsiteId && result.data?.currentWebsite) {
          onWebsiteSelect?.(result.data.currentWebsite);
        }
      } else {
        const errorText = await response.text();
        setError(
          uiLanguage === "zh"
            ? "加载网站列表失败"
            : "Failed to load websites list"
        );
        console.error("[WebsiteSelector] API error:", errorText);
      }
    } catch (error: any) {
      console.error("[WebsiteSelector] Failed to load:", error);
      setError(
        uiLanguage === "zh" ? "网络连接失败" : "Network connection failed"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, [userId]);

  const handleWebsiteChange = (websiteId: string) => {
    if (websiteId === "none") {
      onWebsiteSelect?.(null);
      return;
    }

    const website = data?.websites.find((w) => w.id === websiteId);
    if (website) {
      onWebsiteSelect?.(website);
    }
  };

  const selectedWebsite =
    data?.websites.find((w) => w.id === selectedWebsiteId) ||
    data?.currentWebsite;

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          isDarkTheme
            ? "bg-black/40 border border-emerald-500/20"
            : "bg-white border border-emerald-500/30"
        )}
      >
        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
        <span
          className={cn(
            "text-sm",
            isDarkTheme ? "text-zinc-400" : "text-gray-600"
          )}
        >
          {uiLanguage === "zh" ? "加载中..." : "Loading..."}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg",
          isDarkTheme
            ? "bg-red-950/50 border border-red-500/30 text-red-400"
            : "bg-red-50 border border-red-200 text-red-700"
        )}
      >
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">{error}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadWebsites}
          className="ml-auto h-6 px-2 text-xs"
        >
          {uiLanguage === "zh" ? "重试" : "Retry"}
        </Button>
      </div>
    );
  }

  if (!data || data.websites.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 rounded-lg",
          isDarkTheme
            ? "bg-black/40 border border-emerald-500/20"
            : "bg-white border border-emerald-500/30"
        )}
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-500" />
          <span
            className={cn(
              "text-sm",
              isDarkTheme ? "text-zinc-400" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh" ? "还没有绑定网站" : "No websites bound yet"}
          </span>
        </div>
        {showAddButton && onAddWebsite && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddWebsite}
            className="h-7 px-3 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            {uiLanguage === "zh" ? "添加网站" : "Add Website"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg",
        isDarkTheme
          ? "bg-black/40 border border-emerald-500/20"
          : "bg-white border border-emerald-500/30"
      )}
    >
      <Globe className="w-4 h-4 text-emerald-500 flex-shrink-0" />
      <span
        className={cn(
          "text-sm font-medium whitespace-nowrap",
          isDarkTheme ? "text-zinc-300" : "text-gray-700"
        )}
      >
        {uiLanguage === "zh" ? "选择网站" : "Select Website"}:
      </span>
      <Select
        value={selectedWebsiteId || selectedWebsite?.id || "none"}
        onValueChange={handleWebsiteChange}
      >
        <SelectTrigger
          className={cn(
            "flex-1 h-8 border-0 bg-transparent focus:ring-0 focus:ring-offset-0",
            isDarkTheme
              ? "text-white hover:bg-zinc-800/50"
              : "text-gray-900 hover:bg-gray-50"
          )}
        >
          <SelectValue>
            {selectedWebsite ? (
              <div className="flex items-center gap-2">
                <span className="truncate">{selectedWebsite.url}</span>
                {selectedWebsite.isDefault && (
                  <Badge
                    variant="secondary"
                    className="flex-shrink-0 text-xs px-1.5 py-0 h-4"
                  >
                    <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                    {uiLanguage === "zh" ? "默认" : "Default"}
                  </Badge>
                )}
              </div>
            ) : (
              <span className={isDarkTheme ? "text-zinc-400" : "text-gray-500"}>
                {uiLanguage === "zh" ? "未选择" : "None selected"}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className={cn(
            isDarkTheme
              ? "bg-black/90 border-emerald-500/30"
              : "bg-white border-emerald-500/30"
          )}
        >
          <SelectItem
            value="none"
            className={cn(
              isDarkTheme
                ? "text-zinc-400 focus:bg-emerald-500/20 focus:text-emerald-400"
                : "text-gray-500 focus:bg-emerald-500/10 focus:text-emerald-600"
            )}
          >
            {uiLanguage === "zh" ? "未选择" : "None selected"}
          </SelectItem>
          {data.websites.map((website) => (
            <SelectItem
              key={website.id}
              value={website.id}
              className={cn(
                isDarkTheme
                  ? "text-white focus:bg-emerald-500/20 focus:text-emerald-400"
                  : "text-gray-900 focus:bg-emerald-500/10 focus:text-emerald-600"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="truncate">{website.url}</span>
                {website.isDefault && (
                  <Badge
                    variant="secondary"
                    className="flex-shrink-0 text-xs px-1.5 py-0"
                  >
                    <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                    {uiLanguage === "zh" ? "默认" : "Default"}
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showAddButton && onAddWebsite && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAddWebsite}
          className="h-7 px-3 text-xs flex-shrink-0"
        >
          <Plus className="w-3 h-3 mr-1" />
          {uiLanguage === "zh" ? "添加" : "Add"}
        </Button>
      )}
    </div>
  );
};
