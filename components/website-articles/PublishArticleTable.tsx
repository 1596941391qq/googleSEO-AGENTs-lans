/**
 * PublishArticleTable – 发布界面的文章表格
 * 用于发布 tab：缩略图、标签、紧凑列表、更大视野（无发布配置占用）
 */

import React from "react";
import { cn } from "../../lib/utils";
import { StatusBadge } from "./StatusBadge";
import {
  MoreVertical,
  Eye,
  Edit3,
  Send,
  RefreshCw,
  ExternalLink,
  ImageIcon,
} from "lucide-react";

export interface PublishArticle {
  id: string;
  title: string;
  content?: string;
  images?: { url: string; prompt?: string }[];
  keyword?: string | null;
  tone?: string | null;
  visualStyle?: string | null;
  content_type?: "informational" | "commercial" | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  urlSlug?: string | null;
  websiteId?: string | null;
  websiteName?: string | null;
  websiteUrl?: string | null;
  siteId?: string | null;
  siteUrl?: string | null;
  source?: "published" | "task" | "draft";
}

interface PublishArticleTableProps {
  articles: PublishArticle[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (article: PublishArticle) => void;
  onEdit: (article: PublishArticle) => void;
  onPublish?: (article: PublishArticle) => void;
  onUpdate?: (article: PublishArticle) => void;
  onViewLive?: (article: PublishArticle) => void;
  publishingId: string | null;
  updatingId: string | null;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

const statusMap = (
  s: string
): "draft" | "generating" | "published" | "ranking" | "failed" => {
  if (s === "published" || s === "draft" || s === "failed") return s;
  if (s === "generating" || s === "ranking") return s;
  return s === "published" ? "published" : "draft";
};

export const PublishArticleTable: React.FC<PublishArticleTableProps> = ({
  articles,
  selectedIds,
  onSelect,
  onSelectAll,
  onView,
  onEdit,
  onPublish,
  onUpdate,
  onViewLive,
  publishingId,
  updatingId,
  isDarkTheme,
  uiLanguage,
}) => {
  const allSelected =
    articles.length > 0 && selectedIds.length === articles.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        isDarkTheme
          ? "bg-zinc-900/50 border-zinc-800"
          : "bg-white border-gray-200"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-b",
          isDarkTheme
            ? "bg-zinc-900/80 border-zinc-800"
            : "bg-gray-50 border-gray-200"
        )}
      >
        <div className="flex items-center gap-2 w-10 flex-shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={onSelectAll}
            className={cn(
              "w-4 h-4 rounded border-2 transition-all cursor-pointer",
              "focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0",
              isDarkTheme
                ? "bg-zinc-900 border-zinc-700 checked:bg-emerald-500 checked:border-emerald-500"
                : "bg-white border-gray-300 checked:bg-emerald-600 checked:border-emerald-600"
            )}
          />
        </div>
        <div className="w-14 flex-shrink-0 text-xs font-bold uppercase tracking-wider opacity-60">
          {uiLanguage === "zh" ? "封面" : "Cover"}
        </div>
        <div className="w-24 flex-shrink-0 text-xs font-bold uppercase tracking-wider opacity-60">
          {uiLanguage === "zh" ? "状态" : "Status"}
        </div>
        <div className="flex-1 min-w-0 text-xs font-bold uppercase tracking-wider opacity-60">
          {uiLanguage === "zh" ? "标题" : "Title"}
        </div>
        <div className="w-40 flex-shrink-0 text-xs font-bold uppercase tracking-wider opacity-60">
          {uiLanguage === "zh" ? "标签" : "Tags"}
        </div>
        <div className="w-28 flex-shrink-0 text-xs font-bold uppercase tracking-wider opacity-60">
          {uiLanguage === "zh" ? "更新" : "Updated"}
        </div>
        <div className="w-10 flex-shrink-0" />
      </div>

      {/* Body */}
      <div className="divide-y divide-zinc-800/50">
        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p
              className={cn(
                "text-sm font-medium",
                isDarkTheme ? "text-zinc-500" : "text-gray-500"
              )}
            >
              {uiLanguage === "zh" ? "暂无文章" : "No articles yet"}
            </p>
          </div>
        ) : (
          articles.map((article) => (
            <PublishArticleRow
              key={article.id}
              article={article}
              isSelected={selectedIds.includes(article.id)}
              onSelect={onSelect}
              onView={onView}
              onEdit={onEdit}
              onPublish={onPublish}
              onUpdate={onUpdate}
              onViewLive={onViewLive}
              publishingId={publishingId}
              updatingId={updatingId}
              isDarkTheme={isDarkTheme}
              uiLanguage={uiLanguage}
            />
          ))
        )}
      </div>
    </div>
  );
};

const PublishArticleRow: React.FC<{
  article: PublishArticle;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (a: PublishArticle) => void;
  onEdit: (a: PublishArticle) => void;
  onPublish?: (a: PublishArticle) => void;
  onUpdate?: (a: PublishArticle) => void;
  onViewLive?: (a: PublishArticle) => void;
  publishingId: string | null;
  updatingId: string | null;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}> = ({
  article,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onPublish,
  onUpdate,
  onViewLive,
  publishingId,
  updatingId,
  isDarkTheme,
  uiLanguage,
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const thumb = article.images?.[0]?.url ?? null;
  const status = statusMap(article.status);
  const tags: string[] = [];
  if (article.keyword) tags.push(article.keyword);
  if (article.tone) tags.push(article.tone);
  if (article.content_type)
    tags.push(
      article.content_type === "informational"
        ? uiLanguage === "zh"
          ? "信息型"
          : "Info"
        : uiLanguage === "zh"
          ? "商业型"
          : "Commercial"
    );

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "en-US", {
      month: "short",
      day: "numeric",
      year:
        new Date(s).getFullYear() !== new Date().getFullYear()
          ? "numeric"
          : undefined,
    });

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-all duration-200",
        "hover:scale-[1.002]",
        isDarkTheme
          ? "hover:bg-zinc-800/30 hover:border-emerald-500/10"
          : "hover:bg-gray-50 hover:border-emerald-500/10",
        isSelected &&
          (isDarkTheme
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-emerald-50 border-emerald-200")
      )}
    >
      <div className="w-10 flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(article.id)}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "w-4 h-4 rounded border-2 cursor-pointer",
            "focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-0",
            isDarkTheme
              ? "bg-zinc-900 border-zinc-700 checked:bg-emerald-500 checked:border-emerald-500"
              : "bg-white border-gray-300 checked:bg-emerald-600 checked:border-emerald-600"
          )}
        />
      </div>

      {/* Thumbnail */}
      <button
        type="button"
        onClick={() => onView(article)}
        className={cn(
          "w-14 h-10 flex-shrink-0 rounded-lg overflow-hidden border transition-all",
          "hover:ring-2 hover:ring-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
          isDarkTheme ? "border-zinc-700" : "border-gray-200"
        )}
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className={cn(
              "w-full h-full object-cover",
              isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
            )}
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center",
              isDarkTheme ? "bg-zinc-800/50 text-zinc-500" : "bg-gray-100 text-gray-400"
            )}
          >
            <ImageIcon className="w-4 h-4" />
          </div>
        )}
      </button>

      {/* Status */}
      <div className="w-24 flex-shrink-0">
        <StatusBadge
          status={status}
          isDarkTheme={isDarkTheme}
          uiLanguage={uiLanguage}
          size="sm"
        />
      </div>

      {/* Title */}
      <button
        type="button"
        onClick={() => onView(article)}
        className="flex-1 min-w-0 text-left group/title"
      >
        <span
          className={cn(
            "text-sm font-bold truncate block transition-colors",
            "group-hover/title:text-emerald-500",
            isDarkTheme ? "text-white" : "text-gray-900"
          )}
        >
          {article.title}
        </span>
      </button>

      {/* Tags */}
      <div className="w-40 flex-shrink-0 flex flex-wrap gap-1">
        {tags.slice(0, 3).map((t, i) => (
          <span
            key={i}
            className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-md border",
              isDarkTheme
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            )}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Updated */}
      <div
        className={cn(
          "w-28 flex-shrink-0 text-xs",
          isDarkTheme ? "text-zinc-500" : "text-gray-500"
        )}
      >
        {formatDate(article.updatedAt)}
      </div>

      {/* Actions */}
      <div className="w-10 flex-shrink-0 relative">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className={cn(
            "p-1.5 rounded-lg transition-all",
            "opacity-0 group-hover:opacity-100",
            isDarkTheme
              ? "hover:bg-zinc-700 text-zinc-400"
              : "hover:bg-gray-200 text-gray-500"
          )}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div
              className={cn(
                "absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-xl overflow-hidden z-20",
                "animate-in fade-in slide-in-from-top-1 duration-150",
                isDarkTheme
                  ? "bg-zinc-900 border-zinc-800"
                  : "bg-white border-gray-200"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  onView(article);
                  setShowMenu(false);
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium",
                  isDarkTheme
                    ? "hover:bg-zinc-800 text-zinc-300"
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <Eye className="w-3.5 h-3.5" />
                {uiLanguage === "zh" ? "查看" : "View"}
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit(article);
                  setShowMenu(false);
                }}
                className={cn(
                  "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium",
                  isDarkTheme
                    ? "hover:bg-zinc-800 text-zinc-300"
                    : "hover:bg-gray-50 text-gray-700"
                )}
              >
                <Edit3 className="w-3.5 h-3.5" />
                {uiLanguage === "zh" ? "编辑" : "Edit"}
              </button>
              {article.status === "draft" && onPublish && (
                <button
                  type="button"
                  onClick={() => {
                    onPublish(article);
                    setShowMenu(false);
                  }}
                  disabled={publishingId === article.id}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium",
                    isDarkTheme
                      ? "hover:bg-emerald-500/20 text-emerald-400"
                      : "hover:bg-emerald-50 text-emerald-600"
                  )}
                >
                  {publishingId === article.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {uiLanguage === "zh" ? "发布" : "Publish"}
                </button>
              )}
              {article.status === "published" && onUpdate && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdate(article);
                    setShowMenu(false);
                  }}
                  disabled={updatingId === article.id}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium",
                    isDarkTheme
                      ? "hover:bg-blue-500/20 text-blue-400"
                      : "hover:bg-blue-50 text-blue-600"
                  )}
                >
                  {updatingId === article.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {uiLanguage === "zh" ? "更新" : "Update"}
                </button>
              )}
              {article.status === "published" &&
                (article as any).siteUrl &&
                onViewLive && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewLive(article);
                      setShowMenu(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 flex items-center gap-2 text-xs font-medium",
                      isDarkTheme
                        ? "hover:bg-emerald-500/20 text-emerald-400"
                        : "hover:bg-emerald-50 text-emerald-600"
                    )}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {uiLanguage === "zh" ? "查看站点" : "View Live"}
                  </button>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
