import React, { useRef, useEffect, useState } from "react";
import { Languages, TrendingUp, Lightbulb } from "lucide-react";
import { BatchAnalysisThought, ProbabilityLevel } from "../../types";
import { ThinkingIndicator } from "../shared/ThinkingIndicator";
import { TypingTextEffect } from "./TypingTextEffect";

interface BatchAnalysisStreamProps {
  thoughts: BatchAnalysisThought[];
  t: any;
  isDarkTheme?: boolean;
  uiLanguage?: "zh" | "en";
  thinkingStatus?: {
    isThinking: boolean;
    message: string;
    startTime: number;
    phase: "generating" | "analyzing" | "searching" | "idle";
    subPhase?: "ai-generating" | "keyword-research-api" | "ai-analyzing";
    phaseStartTime?: number;
  };
}

export const BatchAnalysisStream: React.FC<BatchAnalysisStreamProps> = ({
  thoughts,
  t,
  isDarkTheme = true,
  uiLanguage = "en",
  thinkingStatus,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Track which thoughts have completed typing animation
  const [typedThoughts, setTypedThoughts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts, thinkingStatus]);

  const handleTypingComplete = (thoughtId: string) => {
    setTypedThoughts((prev) => new Set(prev).add(thoughtId));
  };

  return (
    <div
      className={`rounded-lg p-4 h-full overflow-hidden flex flex-col shadow-sm border ${isDarkTheme
        ? "bg-[#0a0a0a] border-white/10"
        : "bg-white border-gray-200"
        }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${isDarkTheme
          ? "border-emerald-500/30 text-white/90"
          : "border-gray-200 text-gray-500"
          }`}
      >
        <Languages className="w-3 h-3 text-emerald-500" />
        <span>Cross-Market Insights Stream</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2"
      >
        {thoughts.map((thought) => (
          <div key={thought.id} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${thought.type === "translation"
                  ? isDarkTheme
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-100 text-emerald-700"
                  : thought.type === "seranking"
                    ? isDarkTheme
                      ? "bg-orange-500/20 text-orange-400"
                      : "bg-orange-100 text-orange-700"
                    : thought.type === "serp-search"
                      ? isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-100 text-emerald-700"
                      : thought.type === "intent-analysis"
                        ? isDarkTheme
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-700"
                        : isDarkTheme
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-700"
                  }`}
              >
                {thought.type === "seranking"
                  ? "SEO RESEARCH"
                  : thought.type.toUpperCase().replace("-", " ")}
              </span>
              <span
                className={`text-xs font-medium truncate ${isDarkTheme ? "text-white/90" : "text-gray-600"
                  }`}
              >
                {thought.keyword}
              </span>
            </div>
            <p
              className={`text-sm mb-2 ${isDarkTheme ? "text-white" : "text-gray-700"
                }`}
            >
              {typedThoughts.has(thought.id) ? (
                thought.content
              ) : (
                <TypingTextEffect
                  text={thought.content}
                  speed={15}
                  onComplete={() => handleTypingComplete(thought.id)}
                  isDarkTheme={isDarkTheme}
                />
              )}
            </p>

            {/* SE Ranking Data Display */}
            {thought.type === "seranking" && thought.serankingData && (
              <div className="mt-2">
                {thought.serankingData.is_data_found ? (
                  <div
                    className={`p-3 rounded border ${isDarkTheme
                      ? "bg-black/40 border-orange-500/30"
                      : "bg-orange-50 border-orange-200"
                      }`}
                  >
                    <div
                      className={`text-[10px] font-bold mb-2 flex items-center gap-1 ${isDarkTheme ? "text-orange-400" : "text-orange-600"
                        }`}
                    >
                      <TrendingUp className="w-3 h-3" />
                      SE RANKING DATA
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className={`p-2 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${isDarkTheme ? "text-white/70" : "text-gray-500"
                            }`}
                        >
                          VOLUME
                        </div>
                        <div
                          className={`text-sm font-bold ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-600"
                            }`}
                        >
                          {thought.serankingData.volume?.toLocaleString() ||
                            "N/A"}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                        >
                          KD
                        </div>
                        <div
                          className={`text-sm font-bold ${(thought.serankingData.difficulty || 0) <= 40
                            ? isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
                            : (thought.serankingData.difficulty || 0) <= 60
                              ? isDarkTheme
                                ? "text-yellow-400"
                                : "text-yellow-600"
                              : isDarkTheme
                                ? "text-red-400"
                                : "text-red-600"
                            }`}
                        >
                          {thought.serankingData.difficulty || "N/A"}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                        >
                          CPC
                        </div>
                        <div
                          className={`text-sm font-bold ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-600"
                            }`}
                        >
                          {(() => {
                            const val = thought.serankingData.cpc;
                            return typeof val === "number"
                              ? `$${val.toFixed(2)}`
                              : val && !isNaN(Number(val))
                                ? `$${Number(val).toFixed(2)}`
                                : "N/A";
                          })()}
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] font-bold mb-1 ${isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                        >
                          COMP
                        </div>
                        <div
                          className={`text-sm font-bold ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-600"
                            }`}
                        >
                          {thought.serankingData.competition
                            ? typeof thought.serankingData.competition ===
                              "number"
                              ? (
                                thought.serankingData.competition * 100
                              ).toFixed(1) + "%"
                              : thought.serankingData.competition
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded border ${isDarkTheme
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-emerald-50 border-emerald-200"
                      }`}
                  >
                    <div
                      className={`text-xs font-medium flex items-center gap-2 ${isDarkTheme ? "text-emerald-400" : "text-emerald-700"
                        }`}
                    >
                      <Lightbulb className="w-4 h-4" />
                      Blue Ocean Signal - No competition data found!
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Intent Analysis Display */}
            {thought.type === "intent-analysis" &&
              thought.intentData &&
              (() => {
                // 过滤掉错误信息
                const hasErrorKeywords = (
                  text: string | undefined
                ): boolean => {
                  if (!text) return false;
                  const errorKeywords = [
                    "无法确定",
                    "Unable to determine",
                    "分析失败",
                    "Analysis failed",
                    "AI响应被截断",
                    "AI response was truncated",
                    "原始错误",
                    "Original error",
                    "不完整的JSON",
                    "incomplete JSON",
                    "无效的JSON",
                    "invalid JSON",
                    "解析失败",
                    "Failed to parse",
                    "Unterminated string",
                    "响应预览",
                    "Response preview",
                  ];
                  return errorKeywords.some((keyword) =>
                    text.includes(keyword)
                  );
                };

                const isValidSearchIntent =
                  thought.intentData.searchIntent &&
                  !hasErrorKeywords(thought.intentData.searchIntent);
                const isValidIntentAnalysis =
                  thought.intentData.intentAnalysis &&
                  !hasErrorKeywords(thought.intentData.intentAnalysis);

                // 如果都包含错误信息，不显示
                if (!isValidSearchIntent && !isValidIntentAnalysis) {
                  return null;
                }

                return (
                  <div className="mt-2 space-y-2">
                    {isValidSearchIntent && (
                      <div
                        className={`p-2 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/30"
                          : "bg-emerald-50 border-emerald-200"
                          }`}
                      >
                        <div
                          className={`text-[10px] font-bold mb-1 ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-700"
                            }`}
                        >
                          USER INTENT
                        </div>
                        <p
                          className={`text-xs ${isDarkTheme ? "text-white" : "text-gray-700"
                            }`}
                        >
                          {thought.intentData.searchIntent}
                        </p>
                      </div>
                    )}
                    {isValidIntentAnalysis && (
                      <div
                        className={`p-2 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/30"
                          : "bg-emerald-50 border-emerald-200"
                          }`}
                      >
                        <div
                          className={`text-[10px] font-bold mb-1 ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-700"
                            }`}
                        >
                          INTENT vs SERP
                        </div>
                        <p
                          className={`text-xs ${isDarkTheme ? "text-white" : "text-gray-700"
                            }`}
                        >
                          {thought.intentData.intentAnalysis}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* SERP Snippets */}
            {thought.type === "serp-search" &&
              thought.serpSnippets &&
              thought.serpSnippets.length > 0 && (
                <div
                  className={`mt-2 border rounded-md overflow-hidden ${isDarkTheme
                    ? "border-emerald-500/30 bg-black"
                    : "border-gray-200 bg-gray-50"
                    }`}
                >
                  <div className="space-y-2 p-2">
                    {thought.serpSnippets.slice(0, 3).map((snippet, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border text-xs ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`font-medium truncate ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-600"
                            }`}
                        >
                          {snippet.title}
                        </div>
                        <div
                          className={`text-[10px] truncate ${isDarkTheme
                            ? "text-emerald-500/70"
                            : "text-emerald-600"
                            }`}
                        >
                          {snippet.url}
                        </div>
                        <div
                          className={`mt-1 line-clamp-2 ${isDarkTheme ? "text-white/90" : "text-gray-600"
                            }`}
                        >
                          {snippet.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Analysis Result */}
            {thought.type === "analysis" && thought.analysis && (
              <div
                className={`mt-2 p-3 rounded border ${isDarkTheme
                  ? "bg-black border-emerald-500/30"
                  : "bg-gray-50 border-gray-200"
                  }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${thought.analysis.probability === ProbabilityLevel.HIGH
                      ? isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-100 text-emerald-700"
                      : thought.analysis.probability ===
                        ProbabilityLevel.MEDIUM
                        ? isDarkTheme
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-yellow-100 text-yellow-700"
                        : isDarkTheme
                          ? "bg-red-500/20 text-red-400"
                          : "bg-red-100 text-red-700"
                      }`}
                  >
                    {thought.analysis.probability}
                  </span>
                  <span
                    className={`text-xs ${isDarkTheme ? "text-neutral-400" : "text-gray-600"
                      }`}
                  >
                    {thought.analysis.topDomainType}
                  </span>
                  <span
                    className={`text-xs ${isDarkTheme ? "text-neutral-500" : "text-gray-500"
                      }`}
                  >
                    (
                    {thought.analysis.serpResultCount === -1
                      ? "Many"
                      : thought.analysis.serpResultCount}{" "}
                    results)
                  </span>
                </div>
                <p
                  className={`text-xs whitespace-pre-wrap ${isDarkTheme ? "text-neutral-300" : "text-gray-700"
                    }`}
                >
                  {thought.analysis.reasoning}
                </p>
              </div>
            )}
          </div>
        ))}

        {/* Thinking Indicator - shows when AI is actively processing */}
        {thinkingStatus?.isThinking && thinkingStatus.message && (
          <ThinkingIndicator
            message={thinkingStatus.message}
            startTime={thinkingStatus.startTime}
            isDarkTheme={isDarkTheme}
            uiLanguage={uiLanguage}
            subPhase={thinkingStatus.subPhase}
            phaseStartTime={thinkingStatus.phaseStartTime}
          />
        )}
      </div>
    </div>
  );
};
