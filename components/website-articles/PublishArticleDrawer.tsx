/**
 * PublishArticleDrawer – 发布界面的文章详情抽屉
 * 展示 API 文章详情，支持 Edit / Publish / Update / View Live
 */

import React from "react";
import { cn } from "../../lib/utils";
import { StatusBadge } from "./StatusBadge";
import {
  X,
  Calendar,
  Edit3,
  Send,
  RefreshCw,
  ExternalLink,
  Hash,
} from "lucide-react";
import { Button } from "../ui/button";
import type { PublishArticle } from "./PublishArticleTable";

const statusMap = (
  s: string
): "draft" | "generating" | "published" | "ranking" | "failed" => {
  if (["draft", "published", "failed", "generating", "ranking"].includes(s))
    return s as any;
  return s === "published" ? "published" : "draft";
};

interface PublishArticleDrawerProps {
  article: PublishArticle | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (article: PublishArticle) => void;
  onPublish?: (article: PublishArticle) => void;
  onUpdate?: (article: PublishArticle) => void;
  onViewLive?: (article: PublishArticle) => void;
  publishingId: string | null;
  updatingId: string | null;
  isDarkTheme: boolean;
  uiLanguage: "en" | "zh";
}

export const PublishArticleDrawer: React.FC<PublishArticleDrawerProps> = ({
  article,
  isOpen,
  onClose,
  onEdit,
  onPublish,
  onUpdate,
  onViewLive,
  publishingId,
  updatingId,
  isDarkTheme,
  uiLanguage,
}) => {
  if (!article) return null;

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

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
  const siteUrl = (article as any).siteUrl as string | undefined;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed top-0 right-0 h-full w-full md:w-[480px] z-50 shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full",
          isDarkTheme
            ? "bg-zinc-900 border-l border-zinc-800"
            : "bg-white border-l border-gray-200"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className={cn(
              "flex items-center justify-between px-5 py-4 border-b",
              isDarkTheme ? "border-zinc-800" : "border-gray-200"
            )}
          >
            <div className="flex items-center gap-3">
              <StatusBadge
                status={status}
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
              />
              <span
                className={cn(
                  "text-sm font-bold",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {uiLanguage === "zh" ? "文章详情" : "Article Details"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn(
                "rounded-lg",
                isDarkTheme
                  ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
                  : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
              )}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Thumbnails */}
            {article.images && article.images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {article.images.slice(0, 6).map((img, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-20 h-14 flex-shrink-0 rounded-lg overflow-hidden border",
                      isDarkTheme ? "border-zinc-700" : "border-gray-200"
                    )}
                  >
                    <img
                      src={img.url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Title */}
            <div className="space-y-1">
              <label
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  isDarkTheme ? "text-zinc-500" : "text-gray-500"
                )}
              >
                {uiLanguage === "zh" ? "标题" : "Title"}
              </label>
              <h3
                className={cn(
                  "text-lg font-bold leading-snug",
                  isDarkTheme ? "text-white" : "text-gray-900"
                )}
              >
                {article.title}
              </h3>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <label
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}
                >
                  {uiLanguage === "zh" ? "标签" : "Tags"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((t, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-lg border",
                        isDarkTheme
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Keyword */}
            {article.keyword && (
              <div
                className={cn(
                  "p-3 rounded-xl border",
                  isDarkTheme
                    ? "bg-zinc-800/30 border-zinc-800"
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  <Hash className="w-3.5 h-3.5" />
                  {uiLanguage === "zh" ? "关键词" : "Keyword"}
                </div>
                <div
                  className={cn(
                    "text-sm font-bold",
                    isDarkTheme ? "text-white" : "text-gray-900"
                  )}
                >
                  {article.keyword}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500">
                <Calendar className="w-3.5 h-3.5" />
                {uiLanguage === "zh" ? "时间" : "Dates"}
              </div>
              <div
                className={cn(
                  "text-xs space-y-1",
                  isDarkTheme ? "text-zinc-400" : "text-gray-600"
                )}
              >
                <div>
                  {uiLanguage === "zh" ? "创建" : "Created"}:{" "}
                  {formatDate(article.createdAt)}
                </div>
                <div>
                  {uiLanguage === "zh" ? "更新" : "Updated"}:{" "}
                  {formatDate(article.updatedAt)}
                </div>
                {article.publishedAt && (
                  <div>
                    {uiLanguage === "zh" ? "发布于" : "Published"}:{" "}
                    {formatDate(article.publishedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Content preview */}
            {article.content && (
              <div className="space-y-2">
                <label
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    isDarkTheme ? "text-zinc-500" : "text-gray-500"
                  )}
                >
                  {uiLanguage === "zh" ? "内容预览" : "Preview"}
                </label>
                <div
                  className={cn(
                    "p-3 rounded-xl border max-h-40 overflow-y-auto text-sm leading-relaxed",
                    isDarkTheme
                      ? "bg-zinc-800/30 border-zinc-800 text-zinc-400"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  )}
                >
                  {article.content.substring(0, 400)}
                  {article.content.length > 400 && "…"}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            className={cn(
              "flex flex-wrap gap-2 p-5 border-t",
              isDarkTheme ? "border-zinc-800" : "border-gray-200"
            )}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(article)}
              className={cn(
                "font-bold",
                !isDarkTheme &&
                  "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-emerald-500 hover:text-emerald-600"
              )}
            >
              <Edit3 className="w-3.5 h-3.5 mr-2" />
              {uiLanguage === "zh" ? "编辑" : "Edit"}
            </Button>

            {article.status === "draft" && onPublish && (
              <Button
                size="sm"
                onClick={() => onPublish(article)}
                disabled={publishingId === article.id}
                className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {publishingId === article.id ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 mr-2" />
                )}
                {uiLanguage === "zh" ? "发布" : "Publish"}
              </Button>
            )}

            {article.status === "published" && onUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdate(article)}
                disabled={updatingId === article.id}
                className={cn(
                  "font-bold",
                  isDarkTheme
                    ? "border-blue-500/20 text-blue-400 hover:bg-blue-500/10"
                    : "border-blue-500/50 text-blue-600 hover:bg-blue-50"
                )}
              >
                {updatingId === article.id ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 mr-2" />
                )}
                {uiLanguage === "zh" ? "更新" : "Update"}
              </Button>
            )}

            {article.status === "published" && siteUrl && onViewLive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewLive(article)}
                className={cn(
                  "font-bold",
                  isDarkTheme
                    ? "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    : "border-emerald-500/50 text-emerald-600 hover:bg-emerald-50"
                )}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                {uiLanguage === "zh" ? "查看发布" : "View Live"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
