import React, { useRef, useEffect } from "react";
import { BrainCircuit, TrendingUp } from "lucide-react";
import { DeepDiveThought, ProbabilityLevel } from "../../types";

interface DeepDiveAnalysisStreamProps {
  thoughts: DeepDiveThought[];
  t: any;
  isDarkTheme?: boolean;
}

export const DeepDiveAnalysisStream: React.FC<DeepDiveAnalysisStreamProps> = ({
  thoughts,
  t,
  isDarkTheme = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  return (
    <div
      className={`rounded-lg p-4 h-full overflow-hidden flex flex-col shadow-sm border ${isDarkTheme
        ? "bg-[#0a0a0a] border-white/10"
        : "bg-white border-gray-200"
        }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${isDarkTheme
          ? "border-white/10 text-neutral-400"
          : "border-gray-200 text-gray-500"
          }`}
      >
        <BrainCircuit className="w-3 h-3 text-emerald-500" />
        <span>Deep Dive Analysis Stream</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2"
      >
        {thoughts.map((thought) => (
          <div key={thought.id} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${thought.type === "content-generation"
                  ? isDarkTheme
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-emerald-100 text-emerald-700"
                  : thought.type === "keyword-extraction"
                    ? isDarkTheme
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-emerald-100 text-emerald-700"
                    : thought.type === "serp-verification"
                      ? isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-100 text-emerald-700"
                      : isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
              >
                {thought.type.toUpperCase().replace("-", " ")}
              </span>
            </div>
            <p
              className={`text-sm mb-2 ${isDarkTheme ? "text-neutral-300" : "text-gray-700"
                }`}
            >
              {thought.content}
            </p>

            {/* Core Keywords Display */}
            {thought.type === "keyword-extraction" &&
              thought.data?.keywords && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {thought.data.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className={`px-2 py-1 rounded-md text-xs font-medium border ${isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-emerald-100 text-emerald-700 border-emerald-300"
                        }`}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

            {/* SE Ranking Data Display */}
            {thought.type === "serp-verification" &&
              thought.data?.serankingData && (
                <div className="mt-2 mb-2 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 p-3 rounded-md border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 font-bold mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    SE RANKING DATA
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {thought.data.serankingData.volume !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                        >
                          Volume
                        </div>
                        <div
                          className={`font-bold ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-600"
                            }`}
                        >
                          {thought.data.serankingData.volume.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {thought.data.serankingData.difficulty !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                        >
                          KD
                        </div>
                        <div
                          className={`font-bold ${thought.data.serankingData.difficulty > 40
                            ? isDarkTheme
                              ? "text-red-400"
                              : "text-red-600"
                            : thought.data.serankingData.difficulty > 20
                              ? isDarkTheme
                                ? "text-yellow-400"
                                : "text-yellow-600"
                              : isDarkTheme
                                ? "text-emerald-400"
                                : "text-emerald-600"
                            }`}
                        >
                          {thought.data.serankingData.difficulty}
                        </div>
                      </div>
                    )}
                    {thought.data.serankingData.cpc !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                        >
                          CPC
                        </div>
                        <div
                          className={`font-bold ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-600"
                            }`}
                        >
                          ${Number(thought.data.serankingData.cpc).toFixed(2)}
                        </div>
                      </div>
                    )}
                    {thought.data.serankingData.competition !== undefined && (
                      <div
                        className={`px-2 py-1 rounded border ${isDarkTheme
                          ? "bg-black border-emerald-500/20"
                          : "bg-white border-gray-200"
                          }`}
                      >
                        <div
                          className={`text-[9px] uppercase ${isDarkTheme ? "text-neutral-400" : "text-gray-500"
                            }`}
                        >
                          Competition
                        </div>
                        <div
                          className={`font-bold ${isDarkTheme
                            ? "text-emerald-400"
                            : "text-emerald-600"
                            }`}
                        >
                          {(() => {
                            const val = thought.data.serankingData.competition;
                            return typeof val === "number"
                              ? val.toFixed(2)
                              : val && !isNaN(Number(val))
                                ? Number(val).toFixed(2)
                                : "N/A";
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* SERP Results Display */}
            {thought.type === "serp-verification" &&
              thought.data?.serpResults &&
              thought.data.serpResults.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div
                    className={`border rounded-md overflow-hidden ${isDarkTheme
                      ? "border-emerald-500/30 bg-black"
                      : "border-gray-200 bg-gray-50"
                      }`}
                  >
                    <div className="space-y-2 p-2">
                      {thought.data.serpResults
                        .slice(0, 3)
                        .map((snippet, idx) => (
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
                                ? "text-emerald-400"
                                : "text-emerald-600"
                                }`}
                            >
                              {snippet.url}
                            </div>
                            <div
                              className={`mt-1 line-clamp-2 ${isDarkTheme
                                ? "text-neutral-400"
                                : "text-gray-600"
                                }`}
                            >
                              {snippet.snippet}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  {thought.data.analysis && (
                    <div
                      className={`p-2 rounded border ${isDarkTheme
                        ? "bg-indigo-500/10 border-indigo-500/30"
                        : "bg-indigo-50 border-indigo-200"
                        }`}
                    >
                      <div
                        className={`text-[10px] font-bold mb-1 ${isDarkTheme ? "text-indigo-400" : "text-indigo-700"
                          }`}
                      >
                        COMPETITION ANALYSIS
                      </div>
                      <p
                        className={`text-xs whitespace-pre-wrap ${isDarkTheme ? "text-neutral-300" : "text-gray-700"
                          }`}
                      >
                        {thought.data.analysis}
                      </p>
                    </div>
                  )}
                </div>
              )}

            {/* Probability Analysis Display */}
            {thought.type === "probability-analysis" &&
              thought.data?.probability &&
              thought.data?.analysis && (
                <div
                  className={`mt-2 p-3 rounded border ${isDarkTheme
                    ? "bg-black border-emerald-500/20"
                    : "bg-gray-50 border-gray-200"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-bold border ${thought.data.probability === ProbabilityLevel.HIGH
                        ? isDarkTheme
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-emerald-100 text-emerald-700 border-emerald-300"
                        : thought.data.probability === ProbabilityLevel.MEDIUM
                          ? isDarkTheme
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                            : "bg-yellow-100 text-yellow-700 border-yellow-300"
                          : isDarkTheme
                            ? "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-red-100 text-red-700 border-red-300"
                        }`}
                    >
                      {thought.data.probability} Probability
                    </span>
                  </div>
                  <p
                    className={`text-xs whitespace-pre-wrap ${isDarkTheme ? "text-neutral-300" : "text-gray-700"
                      }`}
                  >
                    {thought.data.analysis}
                  </p>
                </div>
              )}
          </div>
        ))}
      </div>
    </div>
  );
};
