import React, { useState, useEffect, useRef } from "react";
import { BrainCircuit, TrendingUp } from "lucide-react";
import { ThinkingIndicator } from "../shared/ThinkingIndicator";
import {
  AgentThought,
  ProbabilityLevel,
  AgentStreamEvent,
} from "../../types";

// Import helper components
import { TypingTextEffect } from "./TypingTextEffect";
import { SerpPreview } from "./SerpPreview";
import { GoogleSearchResults } from "./GoogleSearchResults";
import { StreamEventDetails } from "./StreamEventDetails";
import { renderAgentDataTable } from "./renderAgentDataTable";

interface AgentStreamProps {
  thoughts: AgentThought[];
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

export const AgentStream: React.FC<AgentStreamProps> = ({
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
      className={`rounded-lg p-4 h-full overflow-hidden flex flex-col shadow-sm border ${
        isDarkTheme
          ? "bg-[#0a0a0a] border-white/10"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b pb-2 mb-2 uppercase tracking-wider text-[10px] ${
          isDarkTheme
            ? "border-white/10 text-neutral-400"
            : "border-gray-200 text-gray-500"
        }`}
      >
        <BrainCircuit className="w-3 h-3 text-emerald-500" />
        <span>{t.agentStreamTitle}</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 space-y-4 pr-2"
      >
        {thoughts
          .filter((thought) => {
            // 过滤掉空的analysis显示：如果type是analysis但没有content且没有data，则不显示
            if (
              thought.type === "analysis" &&
              !thought.content &&
              !thought.data
            ) {
              return false;
            }
            return true;
          })
          .map((thought) => (
            <div key={thought.id} className="animate-fade-in">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    thought.type === "generation"
                      ? isDarkTheme
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-emerald-100 text-emerald-700"
                      : thought.type === "analysis"
                        ? isDarkTheme
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-700"
                        : isDarkTheme
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  ROUND {thought.round}
                </span>
                <span
                  className={`text-xs uppercase font-semibold ${
                    isDarkTheme ? "text-white/70" : "text-gray-500"
                  }`}
                >
                  {thought.type}
                </span>
              </div>
