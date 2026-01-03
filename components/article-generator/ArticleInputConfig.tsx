import React, { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Wand2,
  Type,
  Image as ImageIcon,
  Users,
  Globe,
} from "lucide-react";
import { cn } from "../../lib/utils";

// Tone Options
const getToneOptions = (uiLanguage: "en" | "zh" = "en") => [
  {
    id: "professional",
    label: uiLanguage === "zh" ? "专业" : "Professional",
    emoji: "👔",
  },
  { id: "casual", label: uiLanguage === "zh" ? "随意" : "Casual", emoji: "☕" },
  {
    id: "persuasive",
    label: uiLanguage === "zh" ? "说服性" : "Persuasive",
    emoji: "🔥",
  },
  {
    id: "educational",
    label: uiLanguage === "zh" ? "教育性" : "Educational",
    emoji: "📚",
  },
];

// Visual Styles
const getVisualStyles = (uiLanguage: "en" | "zh" = "en") => [
  {
    id: "realistic",
    label: uiLanguage === "zh" ? "写实照片" : "Realistic Photo",
    emoji: "📷",
  },
  {
    id: "minimalist",
    label: uiLanguage === "zh" ? "极简主义" : "Minimalist",
    emoji: "🎨",
  },
  {
    id: "cyberpunk",
    label: uiLanguage === "zh" ? "赛博朋克" : "Cyberpunk",
    emoji: "🤖",
  },
  {
    id: "watercolor",
    label: uiLanguage === "zh" ? "水彩画" : "Watercolor",
    emoji: "🖌️",
  },
];

// Target Market Options
const getTargetMarketOptions = (uiLanguage: "en" | "zh" = "en") => [
  {
    id: "global",
    label: uiLanguage === "zh" ? "全球市场" : "Global Market",
    emoji: "🌍",
  },
  {
    id: "us",
    label: uiLanguage === "zh" ? "美国市场" : "US Market",
    emoji: "🇺🇸",
  },
  {
    id: "uk",
    label: uiLanguage === "zh" ? "英国市场" : "UK Market",
    emoji: "🇬🇧",
  },
  {
    id: "ca",
    label: uiLanguage === "zh" ? "加拿大市场" : "Canada Market",
    emoji: "🇨🇦",
  },
  {
    id: "au",
    label: uiLanguage === "zh" ? "澳大利亚市场" : "Australia Market",
    emoji: "🇦🇺",
  },
  {
    id: "de",
    label: uiLanguage === "zh" ? "德国市场" : "Germany Market",
    emoji: "🇩🇪",
  },
  {
    id: "fr",
    label: uiLanguage === "zh" ? "法国市场" : "France Market",
    emoji: "🇫🇷",
  },
  {
    id: "jp",
    label: uiLanguage === "zh" ? "日本市场" : "Japan Market",
    emoji: "🇯🇵",
  },
  {
    id: "cn",
    label: uiLanguage === "zh" ? "中国市场" : "China Market",
    emoji: "🇨🇳",
  },
];

interface ArticleInputConfigProps {
  onStart: (config: ArticleConfig) => void;
  isDarkTheme?: boolean;
  uiLanguage?: "en" | "zh";
}

export interface ArticleConfig {
  keyword: string;
  tone: string;
  visualStyle: string;
  targetAudience: "beginner" | "expert";
  targetMarket: string;
}

export const ArticleInputConfig: React.FC<ArticleInputConfigProps> = ({
  onStart,
  isDarkTheme,
  uiLanguage = "en",
}) => {
  const [keyword, setKeyword] = useState("");
  const [tone, setTone] = useState("professional");
  const [visualStyle, setVisualStyle] = useState("realistic");
  const [audience, setAudience] = useState<"beginner" | "expert">("beginner");
  const [targetMarket, setTargetMarket] = useState("global");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const toneOptions = getToneOptions(uiLanguage as "en" | "zh");
  const visualStyles = getVisualStyles(uiLanguage as "en" | "zh");
  const targetMarketOptions = getTargetMarketOptions(uiLanguage as "en" | "zh");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onStart({
      keyword,
      tone,
      visualStyle,
      targetAudience: audience,
      targetMarket,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="text-center mb-10 space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-2xl mb-4 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <Wand2 className="text-emerald-500 w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">
          {uiLanguage === "zh" ? "AI 图文工场" : "AI Visual Article Generator"}
        </h1>
        <p className="text-lg text-gray-400 max-w-md mx-auto">
          {uiLanguage === "zh"
            ? "将单个关键词转换为包含 AI 生成配图的丰富结构化文章。"
            : "Transform a single keyword into a rich, structured article with AI-generated visuals."}
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-6">
        {/* Main Input */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={
                uiLanguage === "zh"
                  ? "输入您的主题关键词"
                  : "Enter your topic keyword"
              }
              className="w-full bg-[#111] border border-white/10 text-xl p-6 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-2xl"
              autoFocus
            />
            <button
              type="submit"
              disabled={!keyword.trim()}
              className="absolute right-3 top-3 bottom-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-6 rounded-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <span>{uiLanguage === "zh" ? "生成" : "Generate"}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Options Toggles */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center space-x-1"
          >
            <span>
              {isAdvancedOpen
                ? uiLanguage === "zh"
                  ? "隐藏"
                  : "Hide"
                : uiLanguage === "zh"
                ? "显示"
                : "Show"}{" "}
              {uiLanguage === "zh" ? "高级选项" : "Advanced Options"}
            </span>
          </button>
        </div>

        {/* Advanced Options Panel */}
        {isAdvancedOpen && (
          <div className="bg-[#111] border border-white/5 rounded-xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tone */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                  <Type size={12} className="mr-2" />{" "}
                  {uiLanguage === "zh" ? "语调" : "Tone"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {toneOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTone(opt.id)}
                      className={cn(
                        "p-2 rounded border text-xs font-medium transition-all text-left flex items-center space-x-2",
                        tone === opt.id
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                      )}
                    >
                      <span>{opt.emoji}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Style */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                  <ImageIcon size={12} className="mr-2" />{" "}
                  {uiLanguage === "zh" ? "视觉风格" : "Visual Style"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {visualStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setVisualStyle(style.id)}
                      className={cn(
                        "p-2 rounded border text-xs font-medium transition-all text-left flex items-center space-x-2",
                        visualStyle === style.id
                          ? "bg-purple-500/20 border-purple-500/50 text-purple-400"
                          : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                      )}
                    >
                      <span>{style.emoji}</span>
                      <span>{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Target Market */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                <Globe size={12} className="mr-2" />{" "}
                {uiLanguage === "zh" ? "目标市场" : "Target Market"}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {targetMarketOptions.map((market) => (
                  <button
                    key={market.id}
                    type="button"
                    onClick={() => setTargetMarket(market.id)}
                    className={cn(
                      "p-2 rounded border text-xs font-medium transition-all text-center flex flex-col items-center space-y-1",
                      targetMarket === market.id
                        ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                        : "bg-black/20 border-white/5 text-gray-400 hover:bg-white/5"
                    )}
                  >
                    <span className="text-base">{market.emoji}</span>
                    <span>{market.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Audience Slider (Simple Toggle for now) */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center">
                <Users size={12} className="mr-2" />{" "}
                {uiLanguage === "zh" ? "目标受众" : "Target Audience"}
              </label>
              <div className="flex bg-black/40 p-1 rounded-lg w-full max-w-md mx-auto border border-white/5">
                <button
                  type="button"
                  onClick={() => setAudience("beginner")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                    audience === "beginner"
                      ? "bg-white/10 text-white shadow"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {uiLanguage === "zh" ? "初学者" : "Beginner"}
                </button>
                <button
                  type="button"
                  onClick={() => setAudience("expert")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded transition-all",
                    audience === "expert"
                      ? "bg-white/10 text-white shadow"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {uiLanguage === "zh" ? "专家" : "Expert"}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
