import React, { useState } from "react";
import {
  Download,
  RefreshCw,
  X,
  Image as ImageIcon,
  Save,
  CheckCircle,
  Maximize2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { MarkdownContent } from "../ui/MarkdownContent";
import { ImageRevealAnimation } from "./ImageRevealAnimation";
import { ImageLightbox } from "./ImageLightbox";
import { useAuth } from "../../contexts/AuthContext";
import { getUserId } from "../website-data/utils";
// We'll use a markdown library or just simple HTML rendering
// For simplicity, we assume 'content' is marked up HTML string for now
// In a real app, use react-markdown

interface ArticlePreviewProps {
  finalArticle: {
    title: string;
    content: string;
    images: { url: string; prompt: string; placement: string }[];
    contentType?: "informational" | "commercial"; // AI 标记的内容类型
  };
  onClose: () => void;
  articleConfig?: {
    keyword?: string;
    tone?: string;
    visualStyle?: string;
    targetAudience?: string;
    targetMarket?: string;
    websiteId?: string; // 关联的用户网站 ID
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
  const { user } = useAuth();
  const currentUserId = getUserId(user);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    prompt?: string;
  } | null>(null);

  // 诊断日志：打印收到的 finalArticle 完整结构
  React.useEffect(() => {
    console.log("[ArticlePreview] 收到的 finalArticle 完整结构:", {
      keys: Object.keys(finalArticle),
      title: finalArticle.title,
      titleLength: finalArticle.title?.length || 0,
      contentType: typeof finalArticle.content,
      contentLength: finalArticle.content?.length || 0,
      contentPreview: finalArticle.content?.substring(0, 300),
      contentStartsWith: finalArticle.content?.substring(0, 50),
      imagesCount: finalArticle.images?.length || 0,
      // 检查是否有其他字段
      hasArticleBody: !!(finalArticle as any).article_body,
      hasMarkdown: !!(finalArticle as any).markdown,
      articleBodyLength: (finalArticle as any).article_body?.length || 0,
      markdownLength: (finalArticle as any).markdown?.length || 0,
    });
  }, [finalArticle]);

  // Handle Export - 只导出 article_body（纯 Markdown）
  const handleExport = () => {
    // 优先使用 article_body，否则用 content
    let articleBody = (finalArticle as any).article_body || finalArticle.content || '';
    
    // 清理可能的 JSON 格式内容
    if (typeof articleBody === 'string') {
      let cleaned = articleBody.trim();
      
      // 移除 ```json 或 ``` 包装
      if (cleaned.startsWith('```json') || cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '');
        const lastBackticks = cleaned.lastIndexOf('```');
        if (lastBackticks > 0) {
          cleaned = cleaned.substring(0, lastBackticks).trim();
        }
      }
      
      // 如果是 JSON 格式，尝试提取 article_body 字段
      if (cleaned.startsWith('{') && cleaned.includes('"article_body"')) {
        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.article_body) {
            articleBody = parsed.article_body;
          }
        } catch {
          // JSON 解析失败，尝试用正则提取
          const match = cleaned.match(/"article_body"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*})/);
          if (match) {
            articleBody = match[1]
              .replace(/\\n/g, '\n')
              .replace(/\\"/g, '"')
              .replace(/\\t/g, '\t')
              .replace(/\\\\/g, '\\');
          }
        }
      } else {
        articleBody = cleaned;
      }
    }
    
    const blob = new Blob([articleBody], { type: "text/markdown" });
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
      // 从 finalArticle 中提取 contentType（AI 在生成时标记的）
      const contentType = finalArticle.contentType || "informational"; // 默认为信息型
      
      const response = await fetch("/api/articles/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token") || ""}`,
        },
        body: JSON.stringify({
          title: finalArticle.title,
          content: finalArticle.content,
          images: finalArticle.images || [],
          keyword: articleConfig?.keyword || null,
          tone: articleConfig?.tone || null,
          visualStyle: articleConfig?.visualStyle || null,
          targetAudience: articleConfig?.targetAudience || null,
          targetMarket: articleConfig?.targetMarket || null,
          websiteId: articleConfig?.websiteId || null, // 关联的用户网站 ID
          contentType: contentType, // AI 标记的内容类型
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
  } => {
    // 防止无限递归
    if (depth > 5) {
      console.warn("[ArticlePreview] JSON解析深度超过限制，返回空内容");
      return { content: "" };
    }

    // 如果 data 是字符串，先尝试解析
    if (typeof data === "string") {
      let trimmed = data.trim();

      // 更强健的 ```json 代码块处理
      const jsonCodeBlockMatch = trimmed.match(/^```json\s*\n([\s\S]*?)\n?```\s*$/);
      const codeBlockMatch = trimmed.match(/^```\s*\n([\s\S]*?)\n?```\s*$/);
      
      if (jsonCodeBlockMatch) {
        trimmed = jsonCodeBlockMatch[1].trim();
        console.log("[ArticlePreview extractArticleData] Removed ```json wrapper");
      } else if (codeBlockMatch) {
        trimmed = codeBlockMatch[1].trim();
        console.log("[ArticlePreview extractArticleData] Removed ``` wrapper");
      } else if (trimmed.startsWith("```json") || trimmed.startsWith("json\n")) {
        // 备用方案
        trimmed = trimmed.replace(/^```?json\s*\n?/, "");
        const lastBackticks = trimmed.lastIndexOf("```");
        if (lastBackticks > 0) {
          trimmed = trimmed.substring(0, lastBackticks).trim();
        } else {
          trimmed = trimmed.replace(/\n?```\s*$/, "").trim();
        }
        console.log("[ArticlePreview extractArticleData] Removed ```json with fallback");
      }

      // 检查是否是 JSON 格式
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === "object" && parsed !== null) {
            console.log("[ArticlePreview extractArticleData] Parsed JSON, keys:", Object.keys(parsed));
            // 递归处理，因为可能有多层嵌套
            return extractArticleData(parsed, depth + 1);
          }
        } catch (e: any) {
          // JSON 解析失败，尝试提取部分内容
          console.warn(
            "[ArticlePreview] JSON解析失败，尝试提取部分内容:",
            e?.message
          );
          
          // 尝试从不完整的 JSON 中提取 article_body 或 content 字段
          const articleBodyMatch = trimmed.match(/"article_body"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|$)/);
          const contentMatch = trimmed.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|$)/);
          const markdownMatch = trimmed.match(/"markdown"\s*:\s*"([\s\S]*?)(?:"\s*[,}]|$)/);
          
          let extractedContent = articleBodyMatch?.[1] || contentMatch?.[1] || markdownMatch?.[1];
          
          if (extractedContent) {
            // 解码可能的转义字符
            try {
              extractedContent = JSON.parse(`"${extractedContent}"`);
            } catch {
              // 如果解析失败，尝试手动处理常见转义
              extractedContent = extractedContent
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\');
            }
            console.log("[ArticlePreview] 从不完整JSON中提取到内容，长度:", extractedContent.length);
            return { content: extractedContent };
          }
          
          // 如果无法提取，返回原始字符串（可能是Markdown）
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

        // 更强健的 ```json 代码块处理
        const jsonCodeBlockMatch = trimmedContent.match(/^```json\s*\n([\s\S]*?)\n?```\s*$/);
        const codeBlockMatch = trimmedContent.match(/^```\s*\n([\s\S]*?)\n?```\s*$/);
        
        if (jsonCodeBlockMatch) {
          trimmedContent = jsonCodeBlockMatch[1].trim();
          console.log("[ArticlePreview] Removed ```json wrapper from content field");
        } else if (codeBlockMatch) {
          trimmedContent = codeBlockMatch[1].trim();
          console.log("[ArticlePreview] Removed ``` wrapper from content field");
        } else if (trimmedContent.startsWith("```json") || trimmedContent.startsWith("json\n")) {
          // 备用方案
          trimmedContent = trimmedContent.replace(/^```?json\s*\n?/, "");
          const lastBackticks = trimmedContent.lastIndexOf("```");
          if (lastBackticks > 0) {
            trimmedContent = trimmedContent.substring(0, lastBackticks).trim();
          } else {
            trimmedContent = trimmedContent.replace(/\n?```\s*$/, "").trim();
          }
          console.log("[ArticlePreview] Removed ```json from content with fallback");
        }

        if (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) {
          try {
            const parsedContent = JSON.parse(trimmedContent);
            if (typeof parsedContent === "object" && parsedContent !== null) {
              console.log("[ArticlePreview] Parsed nested JSON, keys:", Object.keys(parsedContent));
              const nestedData = extractArticleData(parsedContent, depth + 1);
              return {
                content: nestedData.content || "",
              };
            }
          } catch (e) {
            // 解析失败 - 不要清空内容！
            // 可能只是内容中包含了 { 和 } 字符，不一定是 JSON
            console.warn(
              "[ArticlePreview] article_body 以 { 开头但不是有效 JSON，保留原始内容"
            );
            // 保留 trimmedContent 作为内容
            content = trimmedContent;
          }
        } else {
          // 内容不是 JSON，使用清理后的内容
          content = trimmedContent;
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
            };
          }
        } catch (e) {
          // 解析失败 - 不要清空内容！保留原样
          console.warn(
            "[ArticlePreview] 最终检查：内容以 { 开头但不是有效 JSON，保留原始内容，长度:",
            content.length
          );
        }
      }

      return {
        content: content || "",
      };
    }

    return { content: "" };
  };

  // Simple helper to inject images into content
  // This is a naive implementation; production would use a proper parser
  const renderContent = () => {
    // 诊断日志：检查 finalArticle.content 的原始值
    console.log("[ArticlePreview renderContent] 开始处理，原始内容:", {
      contentType: typeof finalArticle.content,
      contentLength: finalArticle.content?.length || 0,
      contentStartsWith: finalArticle.content?.substring(0, 100),
      hasArticleBody: !!(finalArticle as any).article_body,
      articleBodyLength: (finalArticle as any).article_body?.length || 0,
    });

    // 使用统一的解析函数提取文章内容和元数据
    let articleData = extractArticleData(finalArticle.content);
    let content = articleData.content;

    console.log("[ArticlePreview renderContent] extractArticleData(content) 结果:", {
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 100),
    });

    // 如果解析后仍然没有内容，尝试从 finalArticle 对象本身提取
    if (!content || content.trim() === "") {
      console.log("[ArticlePreview renderContent] content 为空，尝试从 finalArticle 对象提取");
      const fallbackData = extractArticleData(finalArticle);
      content = fallbackData.content;
      console.log("[ArticlePreview renderContent] fallback 结果:", {
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 100),
      });
    }

    // 最终安全检查：确保content不是JSON格式的字符串
    if (content && typeof content === "string") {
      let trimmedContent = content.trim();

      // 更强健的 ```json 代码块处理
      const jsonCodeBlockMatch = trimmedContent.match(/^```json\s*\n([\s\S]*?)\n?```\s*$/);
      const codeBlockMatch = trimmedContent.match(/^```\s*\n([\s\S]*?)\n?```\s*$/);
      
      if (jsonCodeBlockMatch) {
        trimmedContent = jsonCodeBlockMatch[1].trim();
        console.log("[ArticlePreview renderContent] Removed ```json wrapper");
      } else if (codeBlockMatch) {
        trimmedContent = codeBlockMatch[1].trim();
        console.log("[ArticlePreview renderContent] Removed ``` wrapper");
      } else if (trimmedContent.startsWith("```json") || trimmedContent.startsWith("json\n")) {
        // 备用方案
        trimmedContent = trimmedContent.replace(/^```?json\s*\n?/, "");
        const lastBackticks = trimmedContent.lastIndexOf("```");
        if (lastBackticks > 0) {
          trimmedContent = trimmedContent.substring(0, lastBackticks).trim();
        } else {
          trimmedContent = trimmedContent.replace(/\n?```\s*$/, "").trim();
        }
        console.log("[ArticlePreview renderContent] Removed ```json with fallback");
      }

      // 如果清理后的内容是 JSON，尝试解析并提取
      if (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) {
        try {
          const parsedAfterClean = JSON.parse(trimmedContent);
          if (
            typeof parsedAfterClean === "object" &&
            parsedAfterClean !== null
          ) {
            console.log("[ArticlePreview renderContent] Parsed JSON, keys:", Object.keys(parsedAfterClean));
            // 如果解析成功，重新提取内容
            const cleanedData = extractArticleData(parsedAfterClean);
            if (cleanedData.content && cleanedData.content.trim().length > 0) {
              content = cleanedData.content;
              console.log(
                "[ArticlePreview] 成功解析 json 内容，提取的内容长度:",
                content.length
              );
            } else {
              // JSON 解析成功但没有有效内容 - 保留原始 trimmedContent
              console.warn(
                "[ArticlePreview] json 解析成功但没提取到内容，保留原始内容，长度:",
                trimmedContent.length
              );
              // 不清空，保留 trimmedContent
              content = trimmedContent;
            }
          }
        } catch (e) {
          // 解析失败 - 保留原始内容
          console.warn("[ArticlePreview] 清理 json 后解析失败，保留原始内容:", e);
          // 不清空，保留 trimmedContent
          content = trimmedContent;
        }
      } else if (trimmedContent !== content.trim()) {
        // 内容被清理过但不是 JSON，使用清理后的内容
        content = trimmedContent;
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

    // 检测 Markdown 内容中是否已经包含了嵌入的图片
    // 如果写手已经在文章中嵌入了图片（![...](...)），就不再在开头显示图片网格
    const hasEmbeddedImages = content && /!\[.*?\]\(.*?\)/.test(content);
    
    // 只有当文章中没有嵌入图片，且有独立的图片数据时，才在开头显示图片网格（兼容旧文章）
    const shouldShowImageGrid = !hasEmbeddedImages && finalArticle.images.length > 0;

    return (
      <div
        className={cn(
          "prose max-w-none",
          isDarkTheme ? "prose-invert prose-lg" : "prose-lg"
        )}
      >
        {/* Images Grid - 仅当文章中没有嵌入图片时显示（兼容旧文章） */}
        {shouldShowImageGrid && (
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

        <MarkdownContent 
          content={content} 
          isDarkTheme={isDarkTheme} 
          onImageClick={(url, alt) => setLightboxImage({ url, prompt: alt })}
        />
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
