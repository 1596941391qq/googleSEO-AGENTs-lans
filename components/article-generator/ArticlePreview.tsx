import React, { useState } from "react";
import {
  Download,
  RefreshCw,
  X,
  Image as ImageIcon,
  Save,
  CheckCircle,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Target,
  FileText,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { MarkdownContent } from "../ui/MarkdownContent";
import { ImageRevealAnimation } from "./ImageRevealAnimation";
import { ImageLightbox } from "./ImageLightbox";
import { QualityScoreCard } from "./QualityScoreCard";
// We'll use a markdown library or just simple HTML rendering
// For simplicity, we assume 'content' is marked up HTML string for now
// In a real app, use react-markdown

interface ArticlePreviewProps {
  finalArticle: {
    title: string;
    content: string;
    images: { url: string; prompt: string; placement: string }[];
    // Optional: Additional data for quality scores and GEO analysis
    geo_score?: any;
    qualityReview?: any;
    seo_meta?: any;
    logic_check?: string;
  };
  onClose: () => void;
  articleConfig?: {
    keyword?: string;
    tone?: string;
    visualStyle?: string;
    targetAudience?: string;
    targetMarket?: string;
  };
  uiLanguage?: "en" | "zh";
  isDarkTheme?: boolean;
}

export const ArticlePreview: React.FC<ArticlePreviewProps> = ({
  finalArticle,
  onClose,
  articleConfig,
  uiLanguage = "en",
  isDarkTheme = true,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isQualityReviewExpanded, setIsQualityReviewExpanded] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    prompt?: string;
  } | null>(null);

  // Handle Export
  const handleExport = () => {
    // Create a markdown file with title and content
    const markdown = `# ${finalArticle.title}\n\n${finalArticle.content}`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${finalArticle.title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Save
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const userId = 1; // TODO: Get from session/auth

      const response = await fetch("/api/articles/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          title: finalArticle.title,
          content: finalArticle.content,
          images: finalArticle.images || [],
          keyword: articleConfig?.keyword || null,
          tone: articleConfig?.tone || null,
          visualStyle: articleConfig?.visualStyle || null,
          targetAudience: articleConfig?.targetAudience || null,
          targetMarket: articleConfig?.targetMarket || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save article");
      }

      // 触发文章保存事件，通知 publish 页面刷新
      window.dispatchEvent(new CustomEvent("article-saved"));

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error: any) {
      console.error("Error saving article:", error);
      alert(
        uiLanguage === "zh"
          ? "保存失败，请重试"
          : "Failed to save article. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 统一的 JSON 内容解析函数
   * 处理各种可能的 JSON 格式，提取实际的正文内容和元数据
   * 确保不会返回JSON字符串作为最终内容
   */
  const extractArticleData = (
    data: any,
    depth: number = 0
  ): {
    content: string;
    seo_meta?: { title?: string; description?: string };
    qualityReview?: any;
    geo_score?: any;
    logic_check?: string;
  } => {
    // 防止无限递归
    if (depth > 5) {
      console.warn("[ArticlePreview] JSON解析深度超过限制，返回空内容");
      return { content: "" };
    }

    // 如果 data 是字符串，先尝试解析
    if (typeof data === "string") {
      let trimmed = data.trim();

      // 处理以 "json\n" 或 "```json\n" 开头的情况
      if (trimmed.startsWith("json\n") || trimmed.startsWith("```json\n")) {
        // 移除 "json\n" 或 "```json\n" 前缀
        trimmed = trimmed.replace(/^```?json\n?/, "").trim();
        // 移除可能的 "```" 后缀
        trimmed = trimmed.replace(/```$/, "").trim();
      }

      // 检查是否是 JSON 格式
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === "object" && parsed !== null) {
            // 递归处理，因为可能有多层嵌套
            return extractArticleData(parsed, depth + 1);
          }
        } catch (e) {
          // 解析失败，检查是否是有效的Markdown内容
          // 如果看起来像JSON但解析失败，可能是格式化的JSON文本，不应该直接显示
          if (trimmed.startsWith("{") && trimmed.includes('"')) {
            console.warn(
              "[ArticlePreview] 检测到JSON格式的字符串但解析失败，跳过显示"
            );
            return { content: "" };
          }
          // 返回原始字符串作为内容（可能是Markdown）
          return { content: data };
        }
      }
      // 不是 JSON 格式，直接返回作为内容
      return { content: data };
    }

    // 如果 data 是对象，提取内容字段和元数据
    if (typeof data === "object" && data !== null) {
      // 优先顺序：article_body > content > markdown
      let content = data.article_body || data.content || data.markdown || "";

      // 如果提取的内容仍然是 JSON 字符串，递归解析
      if (typeof content === "string") {
        let trimmedContent = content.trim();

        // 处理以 "json\n" 或 "```json\n" 开头的情况
        if (
          trimmedContent.startsWith("json\n") ||
          trimmedContent.startsWith("```json\n")
        ) {
          // 移除 "json\n" 或 "```json\n" 前缀
          trimmedContent = trimmedContent.replace(/^```?json\n?/, "").trim();
          // 移除可能的 "```" 后缀
          trimmedContent = trimmedContent.replace(/```$/, "").trim();
        }

        if (trimmedContent.startsWith("{")) {
          try {
            const parsedContent = JSON.parse(trimmedContent);
            if (typeof parsedContent === "object" && parsedContent !== null) {
              const nestedData = extractArticleData(parsedContent, depth + 1);
              // 合并嵌套的 seo_meta 和其他元数据
              return {
                content: nestedData.content || "",
                seo_meta: nestedData.seo_meta || data.seo_meta,
                qualityReview:
                  nestedData.qualityReview ||
                  data.qualityReview ||
                  data.quality_review,
                geo_score: nestedData.geo_score || data.geo_score,
                logic_check: nestedData.logic_check || data.logic_check,
              };
            }
          } catch (e) {
            // 解析失败，检查内容是否看起来像JSON
            // 如果是JSON格式但解析失败，不应该显示
            if (
              trimmedContent.startsWith("{") &&
              trimmedContent.includes('"')
            ) {
              console.warn(
                "[ArticlePreview] article_body 是JSON格式但解析失败，跳过显示"
              );
              content = "";
            }
          }
        }
      }

      // 最终检查：确保content不是JSON格式的字符串
      if (
        typeof content === "string" &&
        content.trim().startsWith("{") &&
        content.trim().endsWith("}")
      ) {
        // 尝试最后一次解析
        try {
          const finalParsed = JSON.parse(content.trim());
          if (typeof finalParsed === "object" && finalParsed !== null) {
            // 如果解析成功，说明这确实是JSON，应该提取其中的内容字段
            const finalData = extractArticleData(finalParsed, depth + 1);
            return {
              content: finalData.content || "",
              seo_meta: finalData.seo_meta || data.seo_meta,
              qualityReview:
                finalData.qualityReview ||
                data.qualityReview ||
                data.quality_review,
              geo_score: finalData.geo_score || data.geo_score,
              logic_check: finalData.logic_check || data.logic_check,
            };
          }
        } catch (e) {
          // 如果最终解析也失败，清空内容，避免显示JSON字符串
          console.warn(
            "[ArticlePreview] 最终内容检查发现JSON格式字符串，已跳过显示"
          );
          content = "";
        }
      }

      return {
        content: content || "",
        seo_meta: data.seo_meta,
        qualityReview: data.qualityReview || data.quality_review,
        geo_score: data.geo_score,
        logic_check: data.logic_check,
      };
    }

    return { content: "" };
  };

  // Render Quality Review Card
  const renderQualityReview = () => {
    // 首先尝试从 finalArticle 直接获取
    let qualityReview = finalArticle.qualityReview;
    let fallbackData: any = null;

    // 如果不存在，尝试从 content 中解析
    if (!qualityReview) {
      const articleData = extractArticleData(finalArticle.content);
      qualityReview = articleData.qualityReview;
    }

    // 如果还是不存在，尝试从 finalArticle 对象本身解析
    if (!qualityReview) {
      fallbackData = extractArticleData(finalArticle);
      qualityReview = fallbackData.qualityReview;
    }

    // 如果还是没有 qualityReview，但从 geo_score 或 logic_check 存在，构建一个 qualityReview 对象
    if (!qualityReview) {
      const hasGeoScore = !!(
        finalArticle.geo_score ||
        (fallbackData && fallbackData.geo_score)
      );
      const hasLogicCheck = !!(
        finalArticle.logic_check ||
        (fallbackData && fallbackData.logic_check)
      );
      const hasSeoMeta = !!(
        finalArticle.seo_meta ||
        (fallbackData && fallbackData.seo_meta)
      );

      if (hasGeoScore || hasLogicCheck || hasSeoMeta) {
        qualityReview = {
          geo_score:
            finalArticle.geo_score || (fallbackData && fallbackData.geo_score),
          logic_check:
            finalArticle.logic_check ||
            (fallbackData && fallbackData.logic_check),
          seo_meta:
            finalArticle.seo_meta || (fallbackData && fallbackData.seo_meta),
        };
      }
    }

    // 调试日志
    if (process.env.NODE_ENV === "development") {
      console.log("[ArticlePreview] renderQualityReview 检查:", {
        hasFinalArticleQualityReview: !!finalArticle.qualityReview,
        hasExtractedQualityReview: !!qualityReview,
        finalArticleKeys: Object.keys(finalArticle),
        hasGeoScore: !!finalArticle.geo_score,
        hasLogicCheck: !!finalArticle.logic_check,
        hasSeoMeta: !!finalArticle.seo_meta,
        qualityReviewType: typeof qualityReview,
        qualityReviewKeys:
          qualityReview && typeof qualityReview === "object"
            ? Object.keys(qualityReview)
            : [],
      });
    }

    if (!qualityReview) {
      return null;
    }

    // 使用提取到的 qualityReview
    const geoScore = qualityReview.geo_score || finalArticle.geo_score;
    const logicCheck = qualityReview.logic_check || finalArticle.logic_check;
    const seoMeta = qualityReview.seo_meta || finalArticle.seo_meta;
    const totalScore = geoScore?.total_score || 0;

    // Convert geo_score to QualityScore format
    const scores = geoScore
      ? {
          title_standard: parseInt(geoScore.title_standard || "0", 10),
          summary: parseInt(geoScore.summary || "0", 10),
          information_gain: parseInt(geoScore.information_gain || "0", 10),
          format_engineering: parseInt(geoScore.format_engineering || "0", 10),
          entity_engineering: parseInt(geoScore.entity_engineering || "0", 10),
          comparison: parseInt(geoScore.comparison || "0", 10),
          faq: parseInt(geoScore.faq || "0", 10),
        }
      : {
          title_standard: 0,
          summary: 0,
          information_gain: 0,
          format_engineering: 0,
          entity_engineering: 0,
          comparison: 0,
          faq: 0,
        };

    // Determine rating
    const rating =
      totalScore >= 90
        ? "master-copy"
        : totalScore >= 80
        ? "ai-summary-ready"
        : totalScore >= 70
        ? "usable"
        : "needs-optimization";

    return (
      <div className="mb-8">
        <div
          className={cn(
            "border rounded-lg overflow-hidden",
            isDarkTheme
              ? "bg-white/5 border-white/10"
              : "bg-gray-50 border-gray-200"
          )}
        >
          {/* 可点击的标题栏 */}
          <button
            onClick={() => setIsQualityReviewExpanded(!isQualityReviewExpanded)}
            className={cn(
              "w-full p-4 flex items-center justify-between transition-colors",
              isDarkTheme ? "hover:bg-white/10" : "hover:bg-gray-100"
            )}
          >
            <h4
              className={cn(
                "text-sm font-bold uppercase tracking-widest flex items-center",
                isDarkTheme ? "text-gray-400" : "text-gray-600"
              )}
            >
              <Target size={16} className="mr-2" />
              {uiLanguage === "zh" ? "质量审查结果" : "Quality Review Results"}
            </h4>
            {isQualityReviewExpanded ? (
              <ChevronUp
                size={20}
                className={cn(isDarkTheme ? "text-gray-400" : "text-gray-600")}
              />
            ) : (
              <ChevronDown
                size={20}
                className={cn(isDarkTheme ? "text-gray-400" : "text-gray-600")}
              />
            )}
          </button>

          {/* 可展开的内容区域 */}
          {isQualityReviewExpanded && (
            <div className="p-6 pt-0 space-y-4">
              {/* Quality Score Card */}
              {totalScore > 0 && (
                <QualityScoreCard
                  scores={scores}
                  totalScore={totalScore}
                  rating={rating}
                  uiLanguage={uiLanguage}
                  isDarkTheme={isDarkTheme}
                />
              )}

              {/* SEO Meta */}
              {seoMeta && (
                <div className="space-y-2">
                  <div
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider flex items-center",
                      isDarkTheme ? "text-blue-400" : "text-blue-600"
                    )}
                  >
                    <FileText size={12} className="mr-1" />
                    {uiLanguage === "zh" ? "SEO 元数据" : "SEO Meta"}
                  </div>
                  <div
                    className={cn(
                      "border rounded-lg p-3 space-y-2",
                      isDarkTheme
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-blue-50 border-blue-200"
                    )}
                  >
                    {seoMeta.title && (
                      <div>
                        <div
                          className={cn(
                            "text-xs font-semibold mb-1",
                            isDarkTheme ? "text-blue-300" : "text-blue-700"
                          )}
                        >
                          {uiLanguage === "zh" ? "标题 (Title)" : "Title"}
                        </div>
                        <div
                          className={cn(
                            "text-sm leading-relaxed",
                            isDarkTheme ? "text-gray-300" : "text-gray-700"
                          )}
                        >
                          {seoMeta.title}
                        </div>
                      </div>
                    )}
                    {seoMeta.description && (
                      <div>
                        <div
                          className={cn(
                            "text-xs font-semibold mb-1",
                            isDarkTheme ? "text-blue-300" : "text-blue-700"
                          )}
                        >
                          {uiLanguage === "zh"
                            ? "描述 (Description)"
                            : "Description"}
                        </div>
                        <div
                          className={cn(
                            "text-sm leading-relaxed",
                            isDarkTheme ? "text-gray-300" : "text-gray-700"
                          )}
                        >
                          {seoMeta.description}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Logic Check */}
              {logicCheck && (
                <div className="space-y-2">
                  <div
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isDarkTheme ? "text-emerald-400/70" : "text-emerald-600"
                    )}
                  >
                    {uiLanguage === "zh" ? "逻辑检查" : "Logic Check"}
                  </div>
                  <div
                    className={cn(
                      "border rounded-lg p-4 text-sm leading-relaxed",
                      isDarkTheme
                        ? "bg-emerald-500/5 border-emerald-500/20 text-gray-300"
                        : "bg-emerald-50 border-emerald-200 text-gray-700"
                    )}
                  >
                    {logicCheck}
                  </div>
                </div>
              )}

              {/* Other Quality Checks */}
              {qualityReview.other_checks && (
                <div className="space-y-2">
                  <div
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isDarkTheme ? "text-blue-400/70" : "text-blue-600"
                    )}
                  >
                    {uiLanguage === "zh"
                      ? "其他质量检查"
                      : "Other Quality Checks"}
                  </div>
                  <div
                    className={cn(
                      "border rounded-lg p-4 space-y-2 text-sm",
                      isDarkTheme
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-blue-50 border-blue-200"
                    )}
                  >
                    {qualityReview.other_checks.authenticity && (
                      <div>
                        <span
                          className={cn(
                            isDarkTheme ? "text-blue-400/70" : "text-blue-600"
                          )}
                        >
                          {uiLanguage === "zh" ? "真实性:" : "Authenticity:"}
                        </span>{" "}
                        <span
                          className={
                            qualityReview.other_checks.authenticity.passed
                              ? isDarkTheme
                                ? "text-emerald-400"
                                : "text-emerald-600"
                              : isDarkTheme
                              ? "text-red-400"
                              : "text-red-600"
                          }
                        >
                          {qualityReview.other_checks.authenticity.passed
                            ? uiLanguage === "zh"
                              ? "通过"
                              : "Passed"
                            : uiLanguage === "zh"
                            ? "未通过"
                            : "Failed"}
                        </span>
                      </div>
                    )}
                    {qualityReview.other_checks.seo_depth && (
                      <div>
                        <span
                          className={cn(
                            isDarkTheme ? "text-blue-400/70" : "text-blue-600"
                          )}
                        >
                          {uiLanguage === "zh" ? "SEO深度:" : "SEO Depth:"}
                        </span>{" "}
                        <span
                          className={cn(
                            isDarkTheme ? "text-gray-300" : "text-gray-700"
                          )}
                        >
                          {uiLanguage === "zh"
                            ? "关键词密度"
                            : "Keyword Density"}
                          :{" "}
                          {qualityReview.other_checks.seo_depth
                            .keyword_density || "N/A"}
                          %
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fix List */}
              {qualityReview.fix_list && qualityReview.fix_list.length > 0 && (
                <div className="space-y-2">
                  <div
                    className={cn(
                      "text-xs font-semibold uppercase tracking-wider",
                      isDarkTheme ? "text-amber-400/70" : "text-amber-600"
                    )}
                  >
                    {uiLanguage === "zh" ? "需要修复的问题" : "Issues to Fix"}
                  </div>
                  <div className="space-y-2">
                    {qualityReview.fix_list.map((fix: any, i: number) => (
                      <div
                        key={i}
                        className={cn(
                          "border rounded-lg p-4 text-sm",
                          isDarkTheme
                            ? "bg-amber-500/5 border-amber-500/20"
                            : "bg-amber-50 border-amber-200"
                        )}
                      >
                        {typeof fix === "string" ? (
                          <div
                            className={cn(
                              isDarkTheme ? "text-gray-300" : "text-gray-700"
                            )}
                          >
                            {fix}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {fix.priority && (
                              <div
                                className={cn(
                                  isDarkTheme
                                    ? "text-amber-400/70"
                                    : "text-amber-600"
                                )}
                              >
                                {uiLanguage === "zh" ? "优先级:" : "Priority:"}{" "}
                                {fix.priority}
                              </div>
                            )}
                            {fix.issue && (
                              <div
                                className={cn(
                                  isDarkTheme
                                    ? "text-gray-300"
                                    : "text-gray-700"
                                )}
                              >
                                {uiLanguage === "zh" ? "问题:" : "Issue:"}{" "}
                                {fix.issue}
                              </div>
                            )}
                            {fix.suggestion && (
                              <div
                                className={cn(
                                  "italic",
                                  isDarkTheme
                                    ? "text-gray-400"
                                    : "text-gray-600"
                                )}
                              >
                                {uiLanguage === "zh" ? "建议:" : "Suggestion:"}{" "}
                                {fix.suggestion}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Simple helper to inject images into content
  // This is a naive implementation; production would use a proper parser
  const renderContent = () => {
    // 使用统一的解析函数提取文章内容和元数据
    let articleData = extractArticleData(finalArticle.content);
    let content = articleData.content;

    // 如果解析后仍然没有内容，尝试从 finalArticle 对象本身提取
    if (!content || content.trim() === "") {
      const fallbackData = extractArticleData(finalArticle);
      content = fallbackData.content;
      // 合并 seo_meta（优先使用解析出的）
      if (fallbackData.seo_meta && !articleData.seo_meta) {
        articleData.seo_meta = fallbackData.seo_meta;
      }
    }

    // 如果 finalArticle 本身有 seo_meta，优先使用它
    if (finalArticle.seo_meta && !articleData.seo_meta) {
      articleData.seo_meta = finalArticle.seo_meta;
    }

    // 最终安全检查：确保content不是JSON格式的字符串
    if (content && typeof content === "string") {
      let trimmedContent = content.trim();

      // 处理以 "json\n" 或 "```json\n" 开头的情况
      if (
        trimmedContent.startsWith("json\n") ||
        trimmedContent.startsWith("```json\n")
      ) {
        // 移除 "json\n" 或 "```json\n" 前缀
        trimmedContent = trimmedContent.replace(/^```?json\n?/, "").trim();
        // 移除可能的 "```" 后缀
        trimmedContent = trimmedContent.replace(/```$/, "").trim();

        // 尝试解析并提取内容
        try {
          const parsedAfterClean = JSON.parse(trimmedContent);
          if (
            typeof parsedAfterClean === "object" &&
            parsedAfterClean !== null
          ) {
            // 如果解析成功，重新提取内容
            const cleanedData = extractArticleData(parsedAfterClean);
            if (cleanedData.content && cleanedData.content.trim().length > 0) {
              content = cleanedData.content;
              // 更新 seo_meta
              if (cleanedData.seo_meta && !articleData.seo_meta) {
                articleData.seo_meta = cleanedData.seo_meta;
              }
              console.log(
                "[ArticlePreview] 成功解析 json 前缀内容，提取的内容长度:",
                content.length
              );
            } else {
              console.warn(
                "[ArticlePreview] json 前缀内容解析后没有有效内容，已过滤"
              );
              content = "";
            }
          }
        } catch (e) {
          console.warn("[ArticlePreview] 清理 json 前缀后解析失败:", e);
          content = "";
        }
      } else {
        // 如果内容看起来像JSON对象或数组，尝试解析
        if (
          (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) ||
          (trimmedContent.startsWith("[") && trimmedContent.endsWith("]"))
        ) {
          try {
            const testParsed = JSON.parse(trimmedContent);
            // 如果解析成功，说明这是JSON，尝试提取内容
            if (typeof testParsed === "object" && testParsed !== null) {
              const extractedData = extractArticleData(testParsed);
              if (
                extractedData.content &&
                extractedData.content.trim().length > 0
              ) {
                content = extractedData.content;
                if (extractedData.seo_meta && !articleData.seo_meta) {
                  articleData.seo_meta = extractedData.seo_meta;
                }
                console.log(
                  "[ArticlePreview] 从 JSON 中提取内容成功，长度:",
                  content.length
                );
              } else {
                console.warn(
                  "[ArticlePreview] 检测到JSON格式的内容，已过滤，避免直接显示"
                );
                content = "";
              }
            }
          } catch (e) {
            // 解析失败，可能是格式化的JSON文本，但为了安全起见，也过滤掉
            if (trimmedContent.includes('"') && trimmedContent.includes(":")) {
              console.warn("[ArticlePreview] 检测到类似JSON格式的内容，已过滤");
              content = "";
            }
          }
        }
      }
    }

    // If content is empty or invalid, show placeholder
    if (!content || content.trim() === "") {
      return (
        <div
          className={cn(
            "p-4 rounded-lg",
            isDarkTheme
              ? "bg-white/5 border border-white/10"
              : "bg-gray-50 border border-gray-200"
          )}
        >
          <p
            className={cn(
              "text-sm",
              isDarkTheme ? "text-gray-400" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh"
              ? "暂无文章内容"
              : "No article content available"}
          </p>
        </div>
      );
    }

    // Naive image injection - this should be handled by the backend Agent 3 logic ideally,
    // but here we just render them at the top or specific placeholders if we had them.
    // For this MVP, let's just render images at the top after title.

    return (
      <div
        className={cn(
          "prose max-w-none",
          isDarkTheme ? "prose-invert prose-lg" : "prose-lg"
        )}
      >
        {/* Images Grid */}
        {finalArticle.images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mb-8">
            {finalArticle.images.map((img, i) => (
              <div
                key={i}
                className={cn(
                  "relative group rounded-xl overflow-hidden border shadow-2xl cursor-pointer",
                  isDarkTheme ? "border-white/10" : "border-gray-300"
                )}
                onClick={() =>
                  setLightboxImage({ url: img.url, prompt: img.prompt })
                }
              >
                <ImageRevealAnimation
                  imageUrl={img.url}
                  prompt={img.prompt}
                  aspectRatio="4:3"
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center space-x-2 text-white text-sm">
                    <Maximize2 size={18} />
                    <span>
                      {uiLanguage === "zh"
                        ? "点击查看大图"
                        : "Click to view fullscreen"}
                    </span>
                  </div>
                </div>
                {img.prompt && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p
                      className={cn(
                        "text-xs italic line-clamp-2",
                        isDarkTheme ? "text-gray-300" : "text-gray-700"
                      )}
                    >
                      "{img.prompt}"
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <MarkdownContent content={content} isDarkTheme={isDarkTheme} />

        {/* SEO Meta Card */}
        {(articleData.seo_meta || finalArticle.seo_meta) && (
          <div className="mt-8">
            <div
              className={cn(
                "border rounded-lg p-4",
                isDarkTheme
                  ? "bg-blue-500/5 border-blue-500/20"
                  : "bg-blue-50 border-blue-200"
              )}
            >
              <div
                className={cn(
                  "text-sm font-bold uppercase tracking-wider mb-3 flex items-center",
                  isDarkTheme ? "text-blue-400" : "text-blue-600"
                )}
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {uiLanguage === "zh" ? "SEO 元数据" : "SEO Meta Data"}
              </div>
              <div className="space-y-3">
                {(articleData.seo_meta?.title ||
                  finalArticle.seo_meta?.title) && (
                  <div>
                    <div
                      className={cn(
                        "text-xs font-semibold mb-1",
                        isDarkTheme ? "text-blue-300" : "text-blue-700"
                      )}
                    >
                      {uiLanguage === "zh" ? "标题 (Title)" : "Title"}
                    </div>
                    <div
                      className={cn(
                        "text-sm leading-relaxed",
                        isDarkTheme ? "text-gray-300" : "text-gray-700"
                      )}
                    >
                      {articleData.seo_meta?.title ||
                        finalArticle.seo_meta?.title}
                    </div>
                  </div>
                )}
                {(articleData.seo_meta?.description ||
                  finalArticle.seo_meta?.description) && (
                  <div>
                    <div
                      className={cn(
                        "text-xs font-semibold mb-1",
                        isDarkTheme ? "text-blue-300" : "text-blue-700"
                      )}
                    >
                      {uiLanguage === "zh"
                        ? "描述 (Description)"
                        : "Description"}
                    </div>
                    <div
                      className={cn(
                        "text-sm leading-relaxed",
                        isDarkTheme ? "text-gray-300" : "text-gray-700"
                      )}
                    >
                      {articleData.seo_meta?.description ||
                        finalArticle.seo_meta?.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GEO Score (if not in quality review) */}
        {finalArticle.geo_score && !finalArticle.qualityReview && (
          <div className="mt-8 space-y-2">
            <div
              className={cn(
                "text-sm font-bold uppercase tracking-wider",
                isDarkTheme ? "text-blue-400" : "text-blue-600"
              )}
            >
              {uiLanguage === "zh" ? "GEO 质量评分" : "GEO Quality Score"}
            </div>
            <QualityScoreCard
              scores={{
                title_standard: parseInt(
                  finalArticle.geo_score.title_standard || "0",
                  10
                ),
                summary: parseInt(finalArticle.geo_score.summary || "0", 10),
                information_gain: parseInt(
                  finalArticle.geo_score.information_gain || "0",
                  10
                ),
                format_engineering: parseInt(
                  finalArticle.geo_score.format_engineering || "0",
                  10
                ),
                entity_engineering: parseInt(
                  finalArticle.geo_score.entity_engineering || "0",
                  10
                ),
                comparison: parseInt(
                  finalArticle.geo_score.comparison || "0",
                  10
                ),
                faq: parseInt(finalArticle.geo_score.faq || "0", 10),
              }}
              totalScore={parseInt(
                finalArticle.geo_score.total_score || "0",
                10
              )}
              uiLanguage={uiLanguage}
              isDarkTheme={isDarkTheme}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full relative",
        isDarkTheme ? "bg-[#050505]" : "bg-gray-50"
      )}
    >
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-8 right-8 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-emerald-500/90 backdrop-blur-sm border border-emerald-400/50 rounded-lg p-4 shadow-2xl flex items-center space-x-3 min-w-[280px]">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">
                {uiLanguage === "zh" ? "已保存到发布界面" : "Saved to Publish"}
              </p>
              <p className="text-emerald-100 text-xs mt-0.5">
                {uiLanguage === "zh"
                  ? "可以在发布标签页查看"
                  : "View in Publish tab"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Fixed on Right */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3">
        <button
          onClick={handleExport}
          className={cn(
            "p-3 rounded-lg text-white bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30",
            "transition-all flex items-center space-x-2 shadow-lg backdrop-blur-sm",
            "hover:scale-105 active:scale-95"
          )}
          title="Export Article"
        >
          <Download size={18} />
          <span className="text-sm font-medium">Export</span>
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "p-3 rounded-lg text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30",
            "transition-all flex items-center space-x-2 shadow-lg backdrop-blur-sm",
            "hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          title="Save Article"
        >
          {isSaving ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm font-medium">
                {uiLanguage === "zh" ? "保存中..." : "Saving..."}
              </span>
            </>
          ) : (
            <>
              <Save size={18} />
              <span className="text-sm font-medium">
                {uiLanguage === "zh" ? "保存" : "Save"}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Content Area - Medium Style */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div
          className={cn(
            "max-w-3xl mx-auto px-8 py-16",
            isDarkTheme ? "bg-[#050505]" : "bg-gray-50"
          )}
        >
          <h1
            className={cn(
              "text-4xl md:text-5xl font-black tracking-tight leading-tight mb-8",
              isDarkTheme ? "text-white" : "text-gray-900"
            )}
          >
            {finalArticle.title}
          </h1>

          {/* Quality Review Card - 显示在标题下方 */}
          {renderQualityReview()}

          {renderContent()}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          prompt={lightboxImage.prompt}
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          onDownload={() => {
            const a = document.createElement("a");
            a.href = lightboxImage.url;
            a.download = `image-${Date.now()}.jpg`;
            a.click();
          }}
          uiLanguage={uiLanguage}
        />
      )}
    </div>
  );
};
