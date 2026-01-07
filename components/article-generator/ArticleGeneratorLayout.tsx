import React, { useState, useEffect, useRef } from "react";
import { AgentStreamFeed } from "./AgentStreamFeed";
import { ArticleInputConfig, ArticleConfig } from "./ArticleInputConfig";
import { ArticlePreview } from "./ArticlePreview";
import { OverallProgressBar, GenerationStage } from "./OverallProgressBar";
import { AgentStreamEvent, TargetLanguage } from "../../types";
import { cn } from "../../lib/utils";

/**
 * 检测关键词的语言（中文或英文）
 */
function detectKeywordLanguage(keyword: string): "zh" | "en" {
  // 检测中文字符
  const chineseCharCount = (keyword.match(/[\u4e00-\u9fa5]/g) || []).length;
  // 检测英文单词
  const englishWordCount = (keyword.match(/[a-zA-Z]+/g) || []).length;

  // 如果中文字符数量大于英文单词数量的30%，则认为是中文
  // 否则默认为英文
  return chineseCharCount > englishWordCount * 0.3 ? "zh" : "en";
}

/**
 * 统一的 JSON 内容解析函数
 * 处理各种可能的 JSON 格式，提取实际的正文内容和元数据
 * 确保不会返回JSON字符串作为最终内容
 */
function extractArticleData(
  data: any,
  depth: number = 0
): {
  content: string;
  seo_meta?: { title?: string; description?: string };
  geo_score?: any;
  qualityReview?: any;
  logic_check?: string;
} {
  // 防止无限递归
  if (depth > 5) {
    console.warn("[ArticleGeneratorLayout] JSON解析深度超过限制，返回空内容");
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
            "[ArticleGeneratorLayout] 检测到JSON格式的字符串但解析失败，跳过显示"
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
            // 合并嵌套的 seo_meta 和 geo_score
            return {
              content: nestedData.content || "",
              seo_meta: nestedData.seo_meta || data.seo_meta,
              geo_score: nestedData.geo_score || data.geo_score,
            };
          }
        } catch (e) {
          // 解析失败，检查内容是否看起来像JSON
          // 如果是JSON格式但解析失败，不应该显示
          if (trimmedContent.startsWith("{") && trimmedContent.includes('"')) {
            console.warn(
              "[ArticleGeneratorLayout] article_body 是JSON格式但解析失败，跳过显示"
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
            geo_score: finalData.geo_score || data.geo_score,
            qualityReview:
              finalData.qualityReview ||
              data.qualityReview ||
              data.quality_review,
            logic_check: finalData.logic_check || data.logic_check,
          };
        }
      } catch (e) {
        // 如果最终解析也失败，清空内容，避免显示JSON字符串
        console.warn(
          "[ArticleGeneratorLayout] 最终内容检查发现JSON格式字符串，已跳过显示"
        );
        content = "";
      }
    }

    return {
      content: content || "",
      seo_meta: data.seo_meta,
      geo_score: data.geo_score,
    };
  }

  return { content: "" };
}

/**
 * 根据目标市场获取对应的输出语言
 * 如果没有设置目标市场，则根据关键词语言推断
 */
function getTargetLanguageFromMarket(
  targetMarket: string,
  keyword?: string
): TargetLanguage {
  // 如果设置了目标市场，优先使用目标市场对应的语言
  if (targetMarket && targetMarket !== "global") {
    const marketToLanguage: Record<string, TargetLanguage> = {
      us: "en",
      uk: "en",
      ca: "en",
      au: "en",
      de: "en", // German - fallback to English as TargetLanguage doesn't support 'de'
      fr: "fr", // French
      jp: "ja", // Japanese
      cn: "zh", // Chinese
    };

    if (marketToLanguage[targetMarket]) {
      return marketToLanguage[targetMarket];
    }
  }

  // 如果没有设置目标市场或目标市场是global，则根据关键词语言推断
  if (keyword) {
    const detectedLang = detectKeywordLanguage(keyword);
    return detectedLang === "zh" ? "zh" : "en";
  }

  // 默认返回英文
  return "en";
}

// Redefine interface locally to match strict type checking or import properly
// We'll trust the types pass through, but for now mocking the state logic here for UI demo

interface ArticleGeneratorLayoutProps {
  onBack: () => void;
  uiLanguage?: "en" | "zh";
  isDarkTheme?: boolean;
  articleGeneratorState?: {
    keyword: string;
    tone: string;
    targetAudience: string;
    visualStyle: string;
    targetMarket?: string;
    isGenerating: boolean;
    progress: number;
    currentStage:
      | "input"
      | "research"
      | "strategy"
      | "writing"
      | "visualizing"
      | "complete";
    streamEvents: AgentStreamEvent[];
    finalArticle: {
      title: string;
      content: string;
      images: { url: string; prompt: string; placement: string }[];
    } | null;
  };
  onStateChange?: (
    state: Partial<{
      keyword: string;
      tone: string;
      targetAudience: string;
      visualStyle: string;
      isGenerating: boolean;
      progress: number;
      currentStage:
        | "input"
        | "research"
        | "strategy"
        | "writing"
        | "visualizing"
        | "complete";
      streamEvents: AgentStreamEvent[];
      finalArticle: {
        title: string;
        content: string;
        images: { url: string; prompt: string; placement: string }[];
        // Optional: Additional data for SEO and quality scores
        geo_score?: any;
        qualityReview?: any;
        seo_meta?: { title?: string; description?: string };
        logic_check?: string;
      } | null;
    }>
  ) => void;
}

export const ArticleGeneratorLayout: React.FC<ArticleGeneratorLayoutProps> = ({
  onBack,
  uiLanguage = "en",
  isDarkTheme = true,
  articleGeneratorState,
  onStateChange,
}) => {
  // Use global state if provided, otherwise fallback to local state
  const defaultState = {
    currentStage: "input" as const,
    streamEvents: [] as AgentStreamEvent[],
    finalArticle: null as any,
    isGenerating: false,
    progress: 0,
  };

  const state = articleGeneratorState || defaultState;
  // Determine stage based on state: if generating -> generating, if has finalArticle -> preview, else -> input
  // 确保已生成的文章能够正确显示预览
  // 检查 finalArticle 是否有有效内容（title 或 content）
  // 注意：finalArticle 可能包含 content 字段，也可能包含其他字段如 article_body
  // 检查 finalArticle 是否有有效内容
  // 需要确保 title 或 content 不是空字符串
  // 同时需要检查 content 是否是有效的 Markdown 内容（不是 JSON 字符串）
  const hasValidFinalArticle = (() => {
    if (!state.finalArticle) return false;

    const hasTitle =
      state.finalArticle.title && state.finalArticle.title.trim().length > 0;

    // 检查 content 字段
    let hasValidContent = false;
    const content =
      state.finalArticle.content ||
      (state.finalArticle as any).article_body ||
      (state.finalArticle as any).markdown;
    if (content && typeof content === "string") {
      const trimmedContent = content.trim();
      // 如果内容以 "json\n" 开头，需要先处理
      const cleanedContent =
        trimmedContent.startsWith("json\n") ||
        trimmedContent.startsWith("```json\n")
          ? trimmedContent
              .replace(/^```?json\n?/, "")
              .replace(/```$/, "")
              .trim()
          : trimmedContent;

      // 检查是否是有效的 Markdown 内容（不是 JSON）
      if (cleanedContent.length > 0) {
        // 如果不是 JSON 格式，或者解析后能提取出有效内容，则认为有效
        if (!cleanedContent.startsWith("{")) {
          hasValidContent = true;
        } else {
          // 如果是 JSON，尝试解析并检查是否有 article_body 或 content 字段
          try {
            const parsed = JSON.parse(cleanedContent);
            if (typeof parsed === "object" && parsed !== null) {
              const extractedContent =
                parsed.article_body || parsed.content || parsed.markdown || "";
              hasValidContent = extractedContent.trim().length > 0;
            }
          } catch (e) {
            // 解析失败，可能是格式化的 JSON 文本，不算有效内容
            hasValidContent = false;
          }
        }
      }
    }

    return hasTitle || hasValidContent;
  })();

  // 阶段判断逻辑（优先级从高到低）：
  // 1. 如果有最终文章（无论 isGenerating 状态）-> preview（已生成的文章应该显示预览）
  // 2. 如果正在生成且没有最终文章 -> generating
  // 3. 否则 -> input
  //
  // 重要：已生成的文章（有 finalArticle）应该始终显示预览，即使 isGenerating 为 true
  // 这样可以确保从 localStorage 恢复的已生成文章能够正确显示
  const stage = hasValidFinalArticle
    ? "preview"
    : state.isGenerating === true
    ? "generating"
    : "input";

  // 调试日志：帮助诊断已生成文章的状态
  useEffect(() => {
    console.log("[ArticleGeneratorLayout] 状态检查:", {
      hasFinalArticle: !!state.finalArticle,
      hasValidFinalArticle,
      finalArticleTitle: state.finalArticle?.title,
      finalArticleContentLength: state.finalArticle?.content?.length || 0,
      finalArticleContentPreview: state.finalArticle?.content?.substring(0, 50),
      hasArticleBody: !!(state.finalArticle as any)?.article_body,
      hasMarkdown: !!(state.finalArticle as any)?.markdown,
      isGenerating: state.isGenerating,
      currentStage: state.currentStage,
      calculatedStage: stage,
      willShowPreview: stage === "preview",
    });
  }, [
    state.finalArticle,
    state.isGenerating,
    state.currentStage,
    hasValidFinalArticle,
    stage,
  ]);

  const events = state.streamEvents || [];
  const finalArticle = state.finalArticle;
  const prevStageRef = useRef<GenerationStage>(state.currentStage || "input");

  const updateState = (updates: Partial<typeof state>) => {
    if (onStateChange) {
      onStateChange(updates);
    }
  };

  // 检测步骤变化并添加过渡消息
  useEffect(() => {
    const currentStage = state.currentStage || "input";
    const prevStage = prevStageRef.current;

    // 如果步骤变化了，且不是从 input 开始，添加过渡消息
    if (
      currentStage !== prevStage &&
      prevStage !== "input" &&
      currentStage !== "complete" &&
      state.isGenerating
    ) {
      const stageTransitionMessages: Record<
        GenerationStage,
        { en: string; zh: string }
      > = {
        input: { en: "", zh: "" },
        research: {
          en: "Preparing research phase...",
          zh: "正在准备研究阶段...",
        },
        strategy: {
          en: "Transitioning to strategy planning...",
          zh: "正在切换到策略规划阶段...",
        },
        writing: {
          en: "Preparing content writing phase...",
          zh: "正在准备内容撰写阶段...",
        },
        visualizing: {
          en: "Preparing image generation phase...",
          zh: "正在准备图像生成阶段...",
        },
        complete: { en: "", zh: "" },
      };

      // 根据前一个步骤生成更具体的过渡消息
      const getTransitionMessage = (
        from: GenerationStage,
        to: GenerationStage
      ) => {
        const baseMessage = stageTransitionMessages[to];
        if (!baseMessage.en) return null;

        // 如果是从 research 到 strategy
        if (from === "research" && to === "strategy") {
          return {
            en: "Research complete. Transitioning to strategy planning...",
            zh: "研究完成。正在切换到策略规划阶段...",
          };
        }
        // 如果是从 strategy 到 writing
        if (from === "strategy" && to === "writing") {
          return {
            en: "Strategy complete. Preparing content writing phase...",
            zh: "策略规划完成。正在准备内容撰写阶段...",
          };
        }
        // 如果是从 writing 到 visualizing
        if (from === "writing" && to === "visualizing") {
          return {
            en: "Content writing complete. Preparing image generation phase...",
            zh: "内容撰写完成。正在准备图像生成阶段...",
          };
        }

        return baseMessage;
      };

      const transitionMessage = getTransitionMessage(prevStage, currentStage);

      if (transitionMessage && transitionMessage.en) {
        const transitionEvent: AgentStreamEvent = {
          id: `transition-${Date.now()}-${Math.random()}`,
          agentId: "tracker",
          type: "log",
          timestamp: Date.now(),
          message:
            uiLanguage === "zh" ? transitionMessage.zh : transitionMessage.en,
        };

        // 添加过渡事件到流中
        const updatedEvents = [...(state.streamEvents || []), transitionEvent];
        updateState({
          streamEvents: updatedEvents,
        });
      }
    }

    // 更新前一个步骤的引用
    prevStageRef.current = currentStage;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentStage, state.isGenerating, uiLanguage]);

  // 确保已生成的文章能够正确显示预览
  // 当从外部传入已生成的文章时，确保 isGenerating 为 false
  useEffect(() => {
    if (hasValidFinalArticle && state.isGenerating) {
      console.log(
        "[ArticleGeneratorLayout] 检测到已生成的文章但 isGenerating 为 true，自动设置为 false"
      );
      updateState({
        isGenerating: false,
        currentStage: "complete",
        progress: 100,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidFinalArticle, state.isGenerating]);

  const startGeneration = async (config: ArticleConfig) => {
    updateState({
      currentStage: "research", // Use a valid stage from the type
      streamEvents: [],
      finalArticle: null,
      isGenerating: true,
      keyword: config.keyword,
      tone: config.tone,
      targetAudience: config.targetAudience,
      visualStyle: config.visualStyle,
      targetMarket: config.targetMarket,
    });

    // Track events locally for this generation session
    let currentEvents: AgentStreamEvent[] = [];

    try {
      const response = await fetch("/api/visual-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          uiLanguage: uiLanguage || "en",
          targetLanguage: getTargetLanguageFromMarket(
            config.targetMarket,
            config.keyword
          ),
        }),
      });

      if (!response.ok) throw new Error("Failed to start generation");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          try {
            const json = JSON.parse(line.replace("data: ", ""));

            if (json.type === "event") {
              const event = json.data as AgentStreamEvent;
              currentEvents = [...currentEvents, event];

              // Update progress and stage based on agent
              let newProgress = state.progress || 0;
              let newStage: GenerationStage = state.currentStage || "research";

              // Calculate progress based on agent activity
              if (event.agentId === "researcher") {
                newStage = "research";
                newProgress = Math.max(newProgress, 20);
              } else if (event.agentId === "strategist") {
                newStage = "strategy";
                newProgress = Math.max(newProgress, 40);
              } else if (event.agentId === "writer") {
                newStage = "writing";
                newProgress = Math.max(newProgress, 60);
              } else if (event.agentId === "artist") {
                newStage = "visualizing";
                newProgress = Math.max(newProgress, 80);
              }

              updateState({
                streamEvents: currentEvents,
                progress: newProgress,
                currentStage: newStage,
              });
            } else if (json.type === "done") {
              // Parse the final article data - handle both object and string formats
              let finalData = json.data;
              if (typeof finalData === "string") {
                try {
                  finalData = JSON.parse(finalData);
                } catch (e) {
                  // If parsing fails, treat as markdown content
                  finalData = { content: finalData };
                }
              }

              // 调试：检查 finalData 的结构
              console.log("[ArticleGeneratorLayout] finalData 结构检查:", {
                finalDataType: typeof finalData,
                isString: typeof finalData === "string",
                isObject: typeof finalData === "object" && finalData !== null,
                finalDataPreview:
                  typeof finalData === "string"
                    ? finalData.substring(0, 200)
                    : typeof finalData === "object" && finalData !== null
                    ? Object.keys(finalData)
                    : finalData,
                hasArticleBody: !!finalData?.article_body,
                hasContent: !!finalData?.content,
                articleBodyType: typeof finalData?.article_body,
                articleBodyPreview:
                  typeof finalData?.article_body === "string"
                    ? finalData.article_body.substring(0, 200)
                    : finalData?.article_body,
              });

              // 使用统一的解析函数提取文章内容和元数据
              const articleData = extractArticleData(finalData);
              let articleContent = articleData.content;

              console.log("[ArticleGeneratorLayout] extractArticleData 结果:", {
                hasContent: !!articleContent,
                contentLength: articleContent?.length || 0,
                contentPreview: articleContent?.substring(0, 200),
                hasSeoMeta: !!articleData.seo_meta,
              });

              // 最终安全检查：确保articleContent不是JSON格式的字符串
              if (articleContent && typeof articleContent === "string") {
                let trimmedContent = articleContent.trim();
                let contentProcessed = false;

                // 处理以 "json\n" 或 "```json\n" 开头的情况
                if (
                  trimmedContent.startsWith("json\n") ||
                  trimmedContent.startsWith("```json\n")
                ) {
                  // 移除 "json\n" 或 "```json\n" 前缀
                  trimmedContent = trimmedContent
                    .replace(/^```?json\n?/, "")
                    .trim();
                  // 移除可能的 "```" 后缀
                  trimmedContent = trimmedContent.replace(/```$/, "").trim();

                  // 重新解析处理后的内容
                  try {
                    const parsedAfterClean = JSON.parse(trimmedContent);
                    if (
                      typeof parsedAfterClean === "object" &&
                      parsedAfterClean !== null
                    ) {
                      // 如果解析成功，重新提取内容
                      const cleanedData = extractArticleData(parsedAfterClean);
                      articleContent = cleanedData.content || "";
                      // 更新 articleData 的 seo_meta
                      if (cleanedData.seo_meta) {
                        articleData.seo_meta = cleanedData.seo_meta;
                      }
                      // 标记内容已处理，避免后续再次检查
                      contentProcessed = true;
                      console.log(
                        "[ArticleGeneratorLayout] 成功解析 json 前缀内容，提取的内容长度:",
                        articleContent.length
                      );
                    }
                  } catch (e) {
                    console.warn(
                      "[ArticleGeneratorLayout] 清理 json 前缀后解析失败:",
                      e
                    );
                  }
                }

                // 只有在内容未被处理的情况下，才检查是否是 JSON
                if (!contentProcessed) {
                  // 如果内容看起来像JSON对象或数组，尝试解析
                  if (
                    (trimmedContent.startsWith("{") &&
                      trimmedContent.endsWith("}")) ||
                    (trimmedContent.startsWith("[") &&
                      trimmedContent.endsWith("]"))
                  ) {
                    try {
                      const testParsed = JSON.parse(trimmedContent);
                      // 如果解析成功，说明这是JSON，尝试提取内容
                      if (
                        typeof testParsed === "object" &&
                        testParsed !== null
                      ) {
                        // 尝试从 JSON 中提取 article_body 或 content
                        const extractedData = extractArticleData(testParsed);
                        if (
                          extractedData.content &&
                          extractedData.content.trim().length > 0
                        ) {
                          articleContent = extractedData.content;
                          if (extractedData.seo_meta) {
                            articleData.seo_meta = extractedData.seo_meta;
                          }
                          console.log(
                            "[ArticleGeneratorLayout] 从 JSON 中提取内容成功，长度:",
                            articleContent.length
                          );
                        } else {
                          console.warn(
                            "[ArticleGeneratorLayout] JSON 中未找到有效内容，已过滤"
                          );
                          articleContent = "";
                        }
                      }
                    } catch (e) {
                      // 解析失败，可能是格式化的JSON文本，但为了安全起见，也过滤掉
                      if (
                        trimmedContent.includes('"') &&
                        trimmedContent.includes(":")
                      ) {
                        console.warn(
                          "[ArticleGeneratorLayout] 检测到类似JSON格式的内容，已过滤"
                        );
                        articleContent = "";
                      }
                    }
                  }
                }
              }

              // 确保 title 和 content 都有值
              // 优先使用解析出的 seo_meta.title，其次使用 finalData 中的 title
              const articleTitle =
                articleData.seo_meta?.title ||
                finalData.title ||
                finalData.seo_meta?.title ||
                "";

              console.log("[ArticleGeneratorLayout] 解析文章内容:", {
                hasArticleBody: !!finalData.article_body,
                hasContent: !!finalData.content,
                hasMarkdown: !!finalData.markdown,
                articleContentType: typeof articleContent,
                articleContentLength:
                  typeof articleContent === "string"
                    ? articleContent.length
                    : 0,
                articleContentPreview:
                  typeof articleContent === "string"
                    ? articleContent.substring(0, 100)
                    : articleContent,
                finalDataKeys: Object.keys(finalData),
                finalDataArticleBodyType: typeof finalData.article_body,
                finalDataArticleBodyPreview:
                  typeof finalData.article_body === "string"
                    ? finalData.article_body.substring(0, 100)
                    : finalData.article_body,
              });

              // 构建 qualityReview 对象（如果不存在，从 geo_score 和 logic_check 构建）
              let qualityReview =
                articleData.qualityReview ||
                finalData.qualityReview ||
                finalData.quality_review;

              // 如果没有 qualityReview，但从 geo_score 或 logic_check 存在，构建一个
              if (!qualityReview) {
                const geoScore = articleData.geo_score || finalData.geo_score;
                const logicCheck =
                  articleData.logic_check || finalData.logic_check;
                const seoMeta = articleData.seo_meta || finalData.seo_meta;

                if (geoScore || logicCheck || seoMeta) {
                  qualityReview = {
                    geo_score: geoScore,
                    logic_check: logicCheck,
                    seo_meta: seoMeta,
                  };
                }
              }

              const finalArticle = {
                title: articleTitle,
                content: articleContent,
                images: Array.isArray(finalData.images) ? finalData.images : [],
                // Include additional data for quality scores and GEO analysis
                // 优先使用解析出的元数据，其次使用 finalData 中的元数据
                geo_score: articleData.geo_score || finalData.geo_score,
                qualityReview: qualityReview,
                seo_meta: articleData.seo_meta || finalData.seo_meta,
                logic_check: articleData.logic_check || finalData.logic_check,
              };

              console.log("[ArticleGeneratorLayout] 构建 finalArticle:", {
                hasTitle: !!finalArticle.title,
                titleValue: finalArticle.title,
                hasContent: !!finalArticle.content,
                contentLength: finalArticle.content?.length || 0,
                contentPreview: finalArticle.content?.substring(0, 100),
                imagesCount: finalArticle.images.length,
                finalDataKeys: Object.keys(finalData),
                finalDataArticleBody: !!finalData.article_body,
                finalDataArticleBodyLength: finalData.article_body?.length || 0,
                hasQualityReview: !!finalArticle.qualityReview,
                hasFinalDataQualityReview: !!(
                  finalData.qualityReview || finalData.quality_review
                ),
                finalDataQualityReviewKeys: finalData.qualityReview
                  ? Object.keys(finalData.qualityReview)
                  : finalData.quality_review
                  ? Object.keys(finalData.quality_review)
                  : [],
                hasGeoScore: !!finalArticle.geo_score,
                hasSeoMeta: !!finalArticle.seo_meta,
                hasLogicCheck: !!finalArticle.logic_check,
                articleDataKeys: Object.keys(articleData),
                hasArticleDataQualityReview: !!articleData.qualityReview,
              });

              // Also add a final-article card event to the stream
              const finalArticleEvent: AgentStreamEvent = {
                id: Math.random().toString(),
                agentId: "tracker",
                type: "card",
                cardType: "final-article",
                timestamp: Date.now(),
                message: "",
                data: finalData,
              };
              currentEvents = [...currentEvents, finalArticleEvent];

              // 强制切换到预览模式：确保 isGenerating 为 false，并且 finalArticle 有内容
              console.log(
                "[ArticleGeneratorLayout] 生成完成，准备切换到预览模式:",
                {
                  finalArticle,
                  hasTitle: !!finalArticle.title,
                  titleValue: finalArticle.title,
                  hasContent: !!finalArticle.content,
                  contentLength: finalArticle.content?.length || 0,
                  contentPreview: finalArticle.content?.substring(0, 100),
                  willSwitchToPreview: !!(
                    finalArticle.title || finalArticle.content
                  ),
                }
              );

              // 确保 finalArticle 有内容才更新状态
              // 检查条件：title 或 content 必须有值，且不能是空字符串
              const hasValidContent =
                (finalArticle.title && finalArticle.title.trim().length > 0) ||
                (finalArticle.content &&
                  finalArticle.content.trim().length > 0);

              if (hasValidContent) {
                console.log(
                  "[ArticleGeneratorLayout] 更新状态，切换到预览模式:",
                  {
                    finalArticle,
                    hasTitle: !!finalArticle.title,
                    hasContent: !!finalArticle.content,
                  }
                );

                updateState({
                  finalArticle: finalArticle,
                  streamEvents: currentEvents,
                  isGenerating: false, // 明确设置为 false，确保切换到预览模式
                  currentStage: "complete",
                  progress: 100,
                });
              } else {
                console.error(
                  "[ArticleGeneratorLayout] finalArticle 没有有效内容，无法切换到预览模式:",
                  {
                    finalArticle,
                    finalData,
                    articleTitle,
                    articleContent,
                    hasTitle: !!finalArticle.title,
                    titleLength: finalArticle.title?.length || 0,
                    hasContent: !!finalArticle.content,
                    contentLength: finalArticle.content?.length || 0,
                  }
                );
              }
            } else if (json.type === "error") {
              const errorEvent: AgentStreamEvent = {
                id: Math.random().toString(),
                agentId: "tracker",
                type: "error",
                timestamp: Date.now(),
                message: json.message,
                data: {
                  errorType: "api-error",
                  details: json.message,
                },
              };
              currentEvents = [...currentEvents, errorEvent];
              updateState({
                streamEvents: currentEvents,
                isGenerating: false,
              });
            }
          } catch (e) {
            console.error("Error parsing stream line:", e);
          }
        }
      }
    } catch (error: any) {
      const errorEvent: AgentStreamEvent = {
        id: Math.random().toString(),
        agentId: "tracker",
        type: "error",
        timestamp: Date.now(),
        message: `Connection Error: ${error.message}`,
      };
      currentEvents = [...currentEvents, errorEvent];
      updateState({
        streamEvents: currentEvents,
        isGenerating: false,
      });
    }
  };

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden font-sans relative",
        isDarkTheme ? "bg-[#050505] text-white" : "bg-gray-50 text-gray-900"
      )}
    >
      {/* Background Ambient Effect */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div
          className={cn(
            "absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]",
            isDarkTheme ? "bg-emerald-500/5" : "bg-emerald-500/10"
          )}
        ></div>
        <div
          className={cn(
            "absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]",
            isDarkTheme ? "bg-blue-500/5" : "bg-blue-500/10"
          )}
        ></div>
      </div>

      {/* Content Container (Center Stage) */}
      <div
        className={cn(
          "relative z-10 w-full h-full flex flex-col max-w-5xl mx-auto backdrop-blur-sm shadow-2xl",
          isDarkTheme ? "bg-[#050505]/50" : "bg-white/80"
        )}
      >
        {/* Stage Content */}
        <div className="flex-1 overflow-hidden relative">
          {stage === "input" && (
            <ArticleInputConfig
              onStart={startGeneration}
              uiLanguage={uiLanguage}
              isDarkTheme={isDarkTheme}
            />
          )}

          {stage === "generating" && (
            <div className="h-full flex flex-col">
              {/* Overall Progress Bar */}
              <div className="p-6 pb-4 shrink-0">
                <OverallProgressBar
                  currentStage={state.currentStage || "research"}
                  progress={state.progress || 0}
                  uiLanguage={uiLanguage}
                  isDarkTheme={isDarkTheme}
                />
              </div>

              {/* Agent Stream Feed - 只在生成中显示，生成完成后隐藏 */}
              <div className="flex-1 min-h-0">
                <AgentStreamFeed
                  events={events}
                  uiLanguage={uiLanguage}
                  isDarkTheme={isDarkTheme}
                  isGenerating={state.isGenerating}
                />
              </div>
            </div>
          )}

          {/* Preview Stage - 强制检查 finalArticle 是否存在 */}
          {/* 重要：确保 preview 阶段不显示 AgentStreamFeed */}
          {stage === "preview" && hasValidFinalArticle && finalArticle && (
            <ArticlePreview
              finalArticle={finalArticle}
              onClose={() =>
                updateState({
                  currentStage: "input",
                  finalArticle: null,
                  isGenerating: false,
                })
              }
              articleConfig={{
                keyword: (state as any).keyword || "",
                tone: (state as any).tone || "professional",
                visualStyle: (state as any).visualStyle || "realistic",
                targetAudience: (state as any).targetAudience || "beginner",
                targetMarket: (state as any).targetMarket,
              }}
              uiLanguage={uiLanguage}
              isDarkTheme={isDarkTheme}
            />
          )}

          {/* 如果 stage 计算错误，但有 finalArticle，强制显示预览 */}
          {stage !== "preview" &&
            hasValidFinalArticle &&
            finalArticle &&
            !state.isGenerating && (
              <ArticlePreview
                finalArticle={finalArticle}
                onClose={() =>
                  updateState({
                    currentStage: "input",
                    finalArticle: null,
                    isGenerating: false,
                  })
                }
                articleConfig={{
                  keyword: (state as any).keyword || "",
                  tone: (state as any).tone || "professional",
                  visualStyle: (state as any).visualStyle || "realistic",
                  targetAudience: (state as any).targetAudience || "beginner",
                  targetMarket: (state as any).targetMarket,
                }}
                uiLanguage={uiLanguage}
                isDarkTheme={isDarkTheme}
              />
            )}
        </div>
      </div>
    </div>
  );
};
