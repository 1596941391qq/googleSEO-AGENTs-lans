import React, { useState, useEffect } from "react";
import { BrainCircuit } from "lucide-react";

interface ThinkingIndicatorProps {
  message: string;
  startTime: number;
  isDarkTheme?: boolean;
  uiLanguage?: "zh" | "en";
  subPhase?: "ai-generating" | "keyword-research-api" | "ai-analyzing";
  phaseStartTime?: number;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  message,
  startTime,
  isDarkTheme = true,
  uiLanguage = "en",
  subPhase,
  phaseStartTime,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [phaseElapsedSeconds, setPhaseElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!startTime) return;

    // Calculate initial elapsed time
    const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
    setElapsedSeconds(initialElapsed);

    // Update every second
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Track phase elapsed time separately
  useEffect(() => {
    if (!phaseStartTime) return;

    const initialPhaseElapsed = Math.floor(
      (Date.now() - phaseStartTime) / 1000
    );
    setPhaseElapsedSeconds(initialPhaseElapsed);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - phaseStartTime) / 1000);
      setPhaseElapsedSeconds(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [phaseStartTime]);

  // Get sub-phase label
  const getSubPhaseLabel = () => {
    if (!subPhase) return null;
    const labels: Record<string, { zh: string; en: string; color: string }> = {
      "ai-generating": {
        zh: "🧠 AI 生成",
        en: "🧠 AI Gen",
        color: isDarkTheme
          ? "bg-purple-500/20 text-purple-300"
          : "bg-purple-100 text-purple-700",
      },
      "keyword-research-api": {
        zh: "🔍 Keyword Research",
        en: "🔍 Keyword Research",
        color: isDarkTheme
          ? "bg-blue-500/20 text-blue-300"
          : "bg-blue-100 text-blue-700",
      },
      "ai-analyzing": {
        zh: "🤖 AI 分析",
        en: "🤖 AI Analyze",
        color: isDarkTheme
          ? "bg-amber-500/20 text-amber-300"
          : "bg-amber-100 text-amber-700",
      },
    };
    return labels[subPhase];
  };

  const subPhaseInfo = getSubPhaseLabel();

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border animate-pulse ${
        isDarkTheme
          ? "bg-emerald-500/5 border-emerald-500/20"
          : "bg-emerald-50 border-emerald-200"
      }`}
    >
      <div className="flex items-center gap-2 flex-1">
        <BrainCircuit
          className={`w-4 h-4 ${
            isDarkTheme ? "text-emerald-400" : "text-emerald-600"
          } animate-pulse`}
        />
        {/* Sub-phase badge */}
        {subPhaseInfo && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${subPhaseInfo.color}`}
          >
            {uiLanguage === "zh" ? subPhaseInfo.zh : subPhaseInfo.en}
          </span>
        )}
        <span
          className={`text-sm ${isDarkTheme ? "text-white" : "text-gray-800"}`}
        >
          {message}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {/* Phase-specific timer */}
        {phaseStartTime && subPhaseInfo && (
          <span
            className={`text-xs font-mono px-1.5 py-0.5 rounded ${subPhaseInfo.color}`}
          >
            {phaseElapsedSeconds}s
          </span>
        )}
        {/* Total timer */}
        <span
          className={`text-xs font-mono font-bold ${
            isDarkTheme ? "text-emerald-400" : "text-emerald-600"
          }`}
        >
          {uiLanguage === "zh" ? "总计" : "Total"}: {elapsedSeconds}s
        </span>
        <div className="flex space-x-1">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDarkTheme ? "bg-emerald-400" : "bg-emerald-600"
            } animate-bounce`}
            style={{ animationDelay: "0ms" }}
          />
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDarkTheme ? "bg-emerald-400" : "bg-emerald-600"
            } animate-bounce`}
            style={{ animationDelay: "150ms" }}
          />
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isDarkTheme ? "bg-emerald-400" : "bg-emerald-600"
            } animate-bounce`}
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};
