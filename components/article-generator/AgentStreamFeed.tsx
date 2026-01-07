import React, { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentStreamEvent, UILanguage } from "../../types";
import {
  CheckCircle,
  Search,
  FileText,
  PenTool,
  Image as ImageIcon,
  Loader2,
  Target,
  TrendingUp,
  Minus,
  Square,
  X,
  Globe,
  Database,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { EnhancedImageGenCard } from "./EnhancedImageGenCard";
import { ImageGenerationStatus } from "./ImageGenerationProgressCard";
import { StreamingTextCard } from "./StreamingTextCard";
import { ErrorCard, ErrorType } from "./ErrorCard";
import { ImageLightbox } from "./ImageLightbox";
import { QualityScoreCard } from "./QualityScoreCard";

// Import TEXT from App.tsx - we'll need to pass it as a prop or create a separate translations file
// For now, we'll define it locally to avoid circular dependencies
const AGENT_TEXT: Record<UILanguage, any> = {
  en: {
    agentTracker: "Tracker",
    agentResearcher: "Researcher",
    agentStrategist: "Strategist",
    agentWriter: "Writer",
    agentArtist: "Artist",
    agentSystem: "System",
    agentTrackerDesc: "Checking requirements and validating input...",
    agentResearcherDesc: "Analyzing competitors and collecting SEO data...",
    agentStrategistDesc: "Creating content strategy and outline...",
    agentWriterDesc: "Writing article content...",
    agentArtistDesc: "Generating visual assets...",
    cardTopCompetitors: "Top Competitors",
    cardStrategicOutline: "Strategic Outline",
    cardCompetitorAnalysis: "Competitor Analysis",
    cardGeneratingVisual: "Generating Visual",
    cardWinningFormula: "Winning Formula",
    cardContentGaps: "Content Gaps",
    cardTopCompetitorsBenchmark: "Top Competitors Benchmark",
    cardVolume: "Vol",
    cardDifficulty: "KD",
    cardAngle: "Angle",
    cardWeakness: "Weakness",
    cardSearchPreferences: "Search Engine Preferences",
    cardSemanticLandscape: "Semantic Landscape",
    cardEngineStrategies: "Engine Strategies",
    cardGeoRecommendations: "GEO Recommendations",
    cardGoogle: "Google",
    cardPerplexity: "Perplexity",
    cardGenerativeAI: "Generative AI",
    cardRankingLogic: "Ranking Logic",
    cardContentGap: "Content Gap",
    cardActionItem: "Action Item",
    cardCitationLogic: "Citation Logic",
    cardStructureHint: "Structure Hint",
    cardLlmPreference: "LLM Preference",
  },
  zh: {
    agentTracker: "追踪器",
    agentResearcher: "研究员",
    agentStrategist: "策略师",
    agentWriter: "写手",
    agentArtist: "艺术家",
    agentSystem: "系统",
    agentTrackerDesc: "正在检查需求并验证输入...",
    agentResearcherDesc: "正在分析竞争对手并收集SEO数据...",
    agentStrategistDesc: "正在创建内容策略和大纲...",
    agentWriterDesc: "正在撰写文章内容...",
    agentArtistDesc: "正在生成视觉素材...",
    cardTopCompetitors: "顶级竞争对手",
    cardStrategicOutline: "策略大纲",
    cardCompetitorAnalysis: "竞争对手分析",
    cardGeneratingVisual: "正在生成视觉",
    cardWinningFormula: "制胜公式",
    cardContentGaps: "内容缺口",
    cardTopCompetitorsBenchmark: "顶级竞争对手基准",
    cardVolume: "搜索量",
    cardDifficulty: "难度",
    cardAngle: "角度",
    cardWeakness: "弱点",
    cardSearchPreferences: "搜索引擎偏好",
    cardSemanticLandscape: "语义分布",
    cardEngineStrategies: "引擎策略",
    cardGeoRecommendations: "GEO优化建议",
    cardGoogle: "Google",
    cardPerplexity: "Perplexity",
    cardGenerativeAI: "生成式AI",
    cardRankingLogic: "排名逻辑",
    cardContentGap: "内容缺口",
    cardActionItem: "行动项",
    cardCitationLogic: "引用逻辑",
    cardStructureHint: "结构建议",
    cardLlmPreference: "LLM偏好",
  },
};

// Sub-components for specific cards
const SerpCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div
      className={cn(
        "border rounded-lg p-3 space-y-2 mt-2",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Search size={12} className="mr-1" /> {t.cardTopCompetitors}
      </h4>
      <div className="space-y-2">
        {data.results?.slice(0, 3).map((result: any, i: number) => (
          <a
            key={i}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "block p-2 rounded transition-colors",
              isDarkTheme
                ? "bg-black/20 hover:bg-black/30"
                : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <div
              className={cn(
                "text-xs font-medium truncate",
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {result.title}
            </div>
            <div
              className={cn(
                "text-[10px] truncate",
                isDarkTheme ? "text-gray-500" : "text-gray-600"
              )}
            >
              {result.url}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const DataCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="flex space-x-2 mt-2">
      {data.volume > 0 && (
        <div
          className={cn(
            "border px-3 py-1.5 rounded text-xs font-mono",
            isDarkTheme
              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
              : "bg-blue-50 border-blue-200 text-blue-600"
          )}
        >
          {t.cardVolume}: {data.volume}
        </div>
      )}
      {data.difficulty > 0 && (
        <div
          className={cn(
            "border px-3 py-1.5 rounded text-xs font-mono",
            isDarkTheme
              ? "bg-orange-500/10 border-orange-500/20 text-orange-400"
              : "bg-orange-50 border-orange-200 text-orange-600"
          )}
        >
          {t.cardDifficulty}: {data.difficulty}
        </div>
      )}
    </div>
  );
};

const OutlineCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  const t = AGENT_TEXT[uiLanguage];

  // If markdown field exists, render markdown directly
  if (data.markdown) {
    return (
      <div
        className={cn(
          "border rounded-lg p-4 mt-2",
          isDarkTheme
            ? "bg-white/5 border-white/10"
            : "bg-gray-50 border-gray-200"
        )}
      >
        <h4
          className={cn(
            "text-xs font-bold uppercase tracking-widest flex items-center mb-3",
            isDarkTheme ? "text-gray-400" : "text-gray-600"
          )}
        >
          <FileText size={12} className="mr-1" /> {t.cardStrategicOutline}
        </h4>
        <div
          className={cn(
            "prose prose-sm max-w-none",
            isDarkTheme ? "prose-invert" : ""
          )}
        >
          <div
            className={cn(
              "text-xs leading-relaxed",
              isDarkTheme ? "text-gray-300" : "text-gray-700"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: render old structured format
  return (
    <div
      className={cn(
        "border rounded-lg p-4 mt-2 font-mono text-xs",
        isDarkTheme
          ? "bg-white/5 border-white/10 text-gray-300"
          : "bg-gray-50 border-gray-200 text-gray-700"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest mb-2 flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <FileText size={12} className="mr-1" /> {t.cardStrategicOutline}
      </h4>
      <ul className="space-y-1 list-none pl-1">
        <li
          className={cn(
            "font-bold text-sm pb-1",
            isDarkTheme ? "text-white" : "text-gray-900"
          )}
        >
          {data.h1}
        </li>
        {data.structure?.map((section: any, i: number) => (
          <li
            key={i}
            className={cn(
              "pl-2 border-l-2 ml-1",
              isDarkTheme ? "border-white/10" : "border-gray-300"
            )}
          >
            <span
              className={cn(
                "mr-2",
                isDarkTheme ? "text-emerald-500" : "text-emerald-600"
              )}
            >
              H2
            </span>
            {section.header}
            {section.subsections && (
              <ul
                className={cn(
                  "mt-1 ml-2 space-y-0.5 text-[10px]",
                  isDarkTheme ? "opacity-60" : "opacity-80"
                )}
              >
                {section.subsections.map((sub: string, j: number) => (
                  <li key={j}>• {sub}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const FirecrawlResultCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  return (
    <div
      className={cn(
        "border rounded-lg p-3 space-y-2 mt-2",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Globe size={12} className="mr-1" />
        {uiLanguage === "zh" ? "Firecrawl 抓取结果" : "Firecrawl Scrape Result"}
      </h4>
      <div className="space-y-2">
        <div
          className={cn(
            "p-2 rounded",
            isDarkTheme ? "bg-black/20" : "bg-gray-100"
          )}
        >
          <div
            className={cn(
              "text-xs font-medium truncate flex items-center",
              isDarkTheme ? "text-emerald-400" : "text-emerald-600"
            )}
          >
            <ExternalLink size={10} className="mr-1" />
            {data.title || data.url}
          </div>
          <div
            className={cn(
              "text-[10px] truncate mt-0.5",
              isDarkTheme ? "text-gray-500" : "text-gray-600"
            )}
          >
            {data.url}
          </div>
          <div
            className={cn(
              "flex items-center gap-2 mt-2 text-[10px]",
              isDarkTheme ? "text-gray-400" : "text-gray-600"
            )}
          >
            <span>
              {uiLanguage === "zh" ? "内容长度" : "Content"}:{" "}
              {data.contentLength?.toLocaleString()}{" "}
              {uiLanguage === "zh" ? "字符" : "chars"}
            </span>
            {data.hasScreenshot && (
              <span
                className={cn(
                  isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                )}
              >
                📸 {uiLanguage === "zh" ? "含截图" : "Screenshot"}
              </span>
            )}
            {data.images && data.images.length > 0 && (
              <span
                className={cn(isDarkTheme ? "text-blue-400" : "text-blue-600")}
              >
                🖼️ {data.images.length}{" "}
                {uiLanguage === "zh" ? "图片" : "images"}
              </span>
            )}
          </div>
          {data.preview && (
            <div
              className={cn(
                "text-[10px] mt-2 line-clamp-3 p-2 rounded",
                isDarkTheme
                  ? "text-gray-400 bg-black/20"
                  : "text-gray-700 bg-gray-200"
              )}
            >
              {data.preview}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DataForSEOCompetitorsCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  return (
    <div
      className={cn(
        "border rounded-lg p-3 space-y-2 mt-2",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Database size={12} className="mr-1" />
        {uiLanguage === "zh" ? "DataForSEO 竞争对手" : "DataForSEO Competitors"}
      </h4>
      <div
        className={cn(
          "text-[10px] mb-2",
          isDarkTheme ? "text-gray-500" : "text-gray-600"
        )}
      >
        {uiLanguage === "zh" ? "分析域名" : "Analyzing domain"}:{" "}
        <span
          className={cn(isDarkTheme ? "text-emerald-400" : "text-emerald-600")}
        >
          {data.domain}
        </span>
      </div>
      <div className="space-y-1.5">
        {data.competitors?.slice(0, 5).map((competitor: any, i: number) => (
          <div
            key={i}
            className={cn(
              "p-2 rounded text-[10px]",
              isDarkTheme ? "bg-black/20" : "bg-gray-100"
            )}
          >
            <div
              className={cn(
                "font-medium truncate",
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {competitor.domain}
            </div>
            <div
              className={cn(
                "flex items-center gap-2 mt-1",
                isDarkTheme ? "text-gray-400" : "text-gray-600"
              )}
            >
              {competitor.commonKeywords > 0 && (
                <span>
                  {uiLanguage === "zh" ? "共同关键词" : "Common Keywords"}:{" "}
                  {competitor.commonKeywords}
                </span>
              )}
              {competitor.domainRating > 0 && (
                <span>DR: {competitor.domainRating}</span>
              )}
            </div>
          </div>
        ))}
        {data.totalCompetitors > 5 && (
          <div
            className={cn(
              "text-[10px] text-center pt-1",
              isDarkTheme ? "text-gray-500" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh"
              ? `还有 ${data.totalCompetitors - 5} 个竞争对手...`
              : `+ ${data.totalCompetitors - 5} more competitors...`}
          </div>
        )}
      </div>
    </div>
  );
};

const DataForSEOKeywordsCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  return (
    <div
      className={cn(
        "border rounded-lg p-3 space-y-2 mt-2",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Database size={12} className="mr-1" />
        {uiLanguage === "zh" ? "DataForSEO 关键词数据" : "DataForSEO Keywords"}
      </h4>
      <div
        className={cn(
          "text-[10px] mb-2",
          isDarkTheme ? "text-gray-500" : "text-gray-600"
        )}
      >
        {uiLanguage === "zh" ? "域名" : "Domain"}:{" "}
        <span
          className={cn(isDarkTheme ? "text-emerald-400" : "text-emerald-600")}
        >
          {data.domain}
        </span>
        <span className="ml-2">
          {uiLanguage === "zh" ? "关键词数" : "Keywords"}: {data.keywordCount}
        </span>
      </div>
      <div className="space-y-1">
        {data.sampleKeywords?.slice(0, 5).map((kw: any, i: number) => (
          <div
            key={i}
            className={cn(
              "p-1.5 rounded text-[10px] flex items-center justify-between",
              isDarkTheme ? "bg-black/20" : "bg-gray-100"
            )}
          >
            <span
              className={cn(
                "truncate flex-1",
                isDarkTheme ? "text-emerald-300" : "text-emerald-600"
              )}
            >
              {kw.keyword}
            </span>
            <div
              className={cn(
                "flex items-center gap-2 ml-2",
                isDarkTheme ? "text-gray-400" : "text-gray-600"
              )}
            >
              {kw.position > 0 && <span>Pos: {kw.position}</span>}
              {kw.volume > 0 && <span>Vol: {kw.volume}</span>}
              {kw.difficulty > 0 && <span>KD: {kw.difficulty}</span>}
            </div>
          </div>
        ))}
        {data.keywordCount > 5 && (
          <div
            className={cn(
              "text-[10px] text-center pt-1",
              isDarkTheme ? "text-gray-500" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh"
              ? `还有 ${data.keywordCount - 5} 个关键词...`
              : `+ ${data.keywordCount - 5} more keywords...`}
          </div>
        )}
      </div>
    </div>
  );
};

const WebsiteAuditReportCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const report = data.report || "";
  const maxPreviewLength = 500;

  return (
    <div
      className={cn(
        "border rounded-lg p-4 space-y-3 mt-2",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <div className="flex items-center justify-between">
        <h4
          className={cn(
            "text-xs font-bold uppercase tracking-widest flex items-center",
            isDarkTheme ? "text-gray-400" : "text-gray-600"
          )}
        >
          <FileText size={12} className="mr-1" />
          {uiLanguage === "zh"
            ? "网站审计分析报告"
            : "Website Audit Analysis Report"}
        </h4>
        <div
          className={cn(
            "flex items-center gap-2 text-[10px]",
            isDarkTheme ? "text-gray-500" : "text-gray-600"
          )}
        >
          <span>
            {data.reportLength?.toLocaleString()}{" "}
            {uiLanguage === "zh" ? "字符" : "chars"}
          </span>
          {data.extractedKeywordsCount > 0 && (
            <span
              className={cn(
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {data.extractedKeywordsCount}{" "}
              {uiLanguage === "zh" ? "个关键词建议" : "keyword suggestions"}
            </span>
          )}
        </div>
      </div>

      {/* Summary Info */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {data.websiteUrl && (
          <div
            className={cn(
              "p-2 rounded",
              isDarkTheme ? "bg-black/20" : "bg-gray-100"
            )}
          >
            <div
              className={cn(isDarkTheme ? "text-gray-500" : "text-gray-600")}
            >
              {uiLanguage === "zh" ? "网站" : "Website"}
            </div>
            <div
              className={cn(
                "truncate",
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {data.websiteUrl}
            </div>
          </div>
        )}
        {data.competitorKeywordsCount !== undefined && (
          <div
            className={cn(
              "p-2 rounded",
              isDarkTheme ? "bg-black/20" : "bg-gray-100"
            )}
          >
            <div
              className={cn(isDarkTheme ? "text-gray-500" : "text-gray-600")}
            >
              {uiLanguage === "zh" ? "竞争对手关键词" : "Competitor Keywords"}
            </div>
            <div
              className={cn(
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {data.competitorKeywordsCount}
            </div>
          </div>
        )}
        {data.industry && (
          <div
            className={cn(
              "p-2 rounded",
              isDarkTheme ? "bg-black/20" : "bg-gray-100"
            )}
          >
            <div
              className={cn(isDarkTheme ? "text-gray-500" : "text-gray-600")}
            >
              {uiLanguage === "zh" ? "行业" : "Industry"}
            </div>
            <div
              className={cn(
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {data.industry}
            </div>
          </div>
        )}
        {data.miningStrategy && (
          <div
            className={cn(
              "p-2 rounded",
              isDarkTheme ? "bg-black/20" : "bg-gray-100"
            )}
          >
            <div
              className={cn(isDarkTheme ? "text-gray-500" : "text-gray-600")}
            >
              {uiLanguage === "zh" ? "挖掘策略" : "Mining Strategy"}
            </div>
            <div
              className={cn(
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {data.miningStrategy === "horizontal"
                ? uiLanguage === "zh"
                  ? "横向挖掘"
                  : "Horizontal"
                : uiLanguage === "zh"
                ? "纵向挖掘"
                : "Vertical"}
            </div>
          </div>
        )}
      </div>

      {/* Extracted Keywords Preview - Enhanced with full JSON data */}
      {data.keywords && data.keywords.length > 0 && (
        <div className="space-y-2">
          <div
            className={cn(
              "text-[10px] flex items-center justify-between",
              isDarkTheme ? "text-gray-500" : "text-gray-600"
            )}
          >
            <span>
              {uiLanguage === "zh"
                ? "提取的关键词建议"
                : "Extracted Keyword Suggestions"}
            </span>
            <span
              className={cn(
                isDarkTheme ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {data.keywords.length}{" "}
              {uiLanguage === "zh" ? "个关键词" : "keywords"}
            </span>
          </div>

          {/* Keywords Table */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {data.keywords.map((kw: any, i: number) => {
              const probability = kw.probability || kw.priority || "Unknown";
              const probabilityColor =
                probability === "High" || probability === "high"
                  ? isDarkTheme
                    ? "text-green-400"
                    : "text-green-600"
                  : probability === "Medium" || probability === "medium"
                  ? isDarkTheme
                    ? "text-yellow-400"
                    : "text-yellow-600"
                  : probability === "Low" || probability === "low"
                  ? isDarkTheme
                    ? "text-red-400"
                    : "text-red-600"
                  : isDarkTheme
                  ? "text-gray-400"
                  : "text-gray-600";

              const opportunityType =
                kw.opportunity_type || kw.opportunityType || "N/A";
              const intent = kw.intent || "Informational";

              return (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded border transition-colors",
                    isDarkTheme
                      ? "bg-black/20 border-white/5 hover:border-emerald-500/30"
                      : "bg-gray-100 border-gray-300 hover:border-emerald-400"
                  )}
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          "text-xs font-semibold truncate",
                          isDarkTheme ? "text-emerald-300" : "text-emerald-600"
                        )}
                        title={kw.keyword}
                      >
                        {kw.keyword}
                      </div>
                      {kw.translation && (
                        <div
                          className={cn(
                            "text-[10px] mt-0.5",
                            isDarkTheme ? "text-gray-400" : "text-gray-600"
                          )}
                        >
                          {kw.translation}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {probability !== "Unknown" && (
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-medium",
                            probabilityColor,
                            isDarkTheme ? "bg-black/30" : "bg-gray-200"
                          )}
                        >
                          {probability}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] mt-2">
                    {kw.volume !== undefined && kw.volume > 0 && (
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            isDarkTheme ? "text-gray-500" : "text-gray-600"
                          )}
                        >
                          {uiLanguage === "zh" ? "搜索量" : "Volume"}:
                        </span>
                        <span
                          className={cn(
                            isDarkTheme
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          )}
                        >
                          {kw.volume.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {kw.difficulty !== undefined && (
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            isDarkTheme ? "text-gray-500" : "text-gray-600"
                          )}
                        >
                          {uiLanguage === "zh" ? "难度" : "Difficulty"}:
                        </span>
                        <span
                          className={
                            kw.difficulty > 40
                              ? isDarkTheme
                                ? "text-red-400"
                                : "text-red-600"
                              : kw.difficulty > 20
                              ? isDarkTheme
                                ? "text-yellow-400"
                                : "text-yellow-600"
                              : isDarkTheme
                              ? "text-green-400"
                              : "text-green-600"
                          }
                        >
                          {kw.difficulty}
                        </span>
                      </div>
                    )}
                    {intent && (
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            isDarkTheme ? "text-gray-500" : "text-gray-600"
                          )}
                        >
                          {uiLanguage === "zh" ? "意图" : "Intent"}:
                        </span>
                        <span
                          className={cn(
                            isDarkTheme ? "text-blue-400" : "text-blue-600"
                          )}
                        >
                          {intent}
                        </span>
                      </div>
                    )}
                    {opportunityType !== "N/A" && (
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            isDarkTheme ? "text-gray-500" : "text-gray-600"
                          )}
                        >
                          {uiLanguage === "zh" ? "机会类型" : "Type"}:
                        </span>
                        <span
                          className={cn(
                            "capitalize",
                            isDarkTheme ? "text-purple-400" : "text-purple-600"
                          )}
                        >
                          {opportunityType}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reasoning */}
                  {kw.reasoning && (
                    <div
                      className={cn(
                        "mt-2 pt-2 border-t",
                        isDarkTheme ? "border-white/5" : "border-gray-300"
                      )}
                    >
                      <div
                        className={cn(
                          "text-[10px] mb-1",
                          isDarkTheme ? "text-gray-500" : "text-gray-600"
                        )}
                      >
                        {uiLanguage === "zh" ? "分析原因" : "Reasoning"}:
                      </div>
                      <div
                        className={cn(
                          "text-[10px] leading-relaxed line-clamp-2",
                          isDarkTheme ? "text-gray-300" : "text-gray-700"
                        )}
                      >
                        {kw.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Content */}
      {report && (
        <div className="space-y-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "w-full text-left text-[10px] flex items-center justify-between p-2 rounded transition-colors",
              isDarkTheme
                ? "text-emerald-400 hover:text-emerald-300 bg-black/20 hover:bg-black/30"
                : "text-emerald-600 hover:text-emerald-700 bg-gray-100 hover:bg-gray-200"
            )}
          >
            <span>
              {uiLanguage === "zh"
                ? "查看完整分析报告"
                : "View Full Analysis Report"}
            </span>
            <span>{isExpanded ? "▼" : "▶"}</span>
          </button>

          {isExpanded && (
            <div
              className={cn(
                "max-h-96 overflow-y-auto p-3 rounded text-xs leading-relaxed prose prose-sm max-w-none",
                isDarkTheme
                  ? "bg-black/20 text-gray-300 prose-invert"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report}
              </ReactMarkdown>
            </div>
          )}

          {!isExpanded && report.length > maxPreviewLength && (
            <div
              className={cn(
                "p-3 rounded text-xs leading-relaxed line-clamp-6",
                isDarkTheme
                  ? "bg-black/20 text-gray-400"
                  : "bg-gray-100 text-gray-600"
              )}
            >
              {report.substring(0, maxPreviewLength)}...
            </div>
          )}

          {!isExpanded && report.length <= maxPreviewLength && (
            <div
              className={cn(
                "p-3 rounded text-xs leading-relaxed prose prose-sm max-w-none",
                isDarkTheme
                  ? "bg-black/20 text-gray-300 prose-invert"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const GoogleSearchResultsCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  const t = AGENT_TEXT[uiLanguage];
  const searchResults = data.results || data.searchResults || [];

  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "border rounded-lg p-3 space-y-2 mt-2",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Search size={12} className="mr-1" />
        {uiLanguage === "zh" ? "Google 搜索结果" : "Google Search Results"}
      </h4>
      <div className="space-y-2">
        {searchResults.slice(0, 5).map((result: any, i: number) => (
          <a
            key={i}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "block p-2 rounded transition-colors group",
              isDarkTheme
                ? "bg-black/20 hover:bg-black/30"
                : "bg-gray-100 hover:bg-gray-200"
            )}
          >
            <div
              className={cn(
                "text-xs font-medium truncate",
                isDarkTheme
                  ? "text-emerald-400 group-hover:text-emerald-300"
                  : "text-emerald-600 group-hover:text-emerald-700"
              )}
            >
              {result.title || result.url}
            </div>
            <div
              className={cn(
                "text-[10px] truncate mt-0.5",
                isDarkTheme ? "text-gray-500" : "text-gray-600"
              )}
            >
              {result.url}
            </div>
            {result.snippet && (
              <div
                className={cn(
                  "text-[10px] mt-1 line-clamp-2",
                  isDarkTheme ? "text-gray-400" : "text-gray-600"
                )}
              >
                {result.snippet}
              </div>
            )}
          </a>
        ))}
        {searchResults.length > 5 && (
          <div
            className={cn(
              "text-[10px] text-center pt-1",
              isDarkTheme ? "text-gray-500" : "text-gray-600"
            )}
          >
            {uiLanguage === "zh"
              ? `还有 ${searchResults.length - 5} 个结果...`
              : `+ ${searchResults.length - 5} more results...`}
          </div>
        )}
      </div>
    </div>
  );
};

const SearchPreferencesCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  const t = AGENT_TEXT[uiLanguage];

  // 后端现在强制返回JSON格式，直接使用结构化数据
  // 如果data是字符串，尝试解析为JSON（向后兼容）
  let parsedData = data;
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      console.warn("[SearchPreferencesCard] Failed to parse data as JSON:", e);
      // 如果解析失败，返回空数据
      parsedData = {};
    }
  }

  // 使用解析后的数据
  data = parsedData;

  // Fallback: render old structured format
  return (
    <div
      className={cn(
        "border rounded-lg p-4 mt-2 space-y-4",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Search size={12} className="mr-1" /> {t.cardSearchPreferences}
      </h4>

      {/* Semantic Landscape */}
      {data.semantic_landscape && (
        <div className="space-y-1">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider flex items-center",
              isDarkTheme ? "text-purple-400/70" : "text-purple-600"
            )}
          >
            <TrendingUp size={10} className="mr-1" /> {t.cardSemanticLandscape}
          </div>
          <div
            className={cn(
              "text-xs leading-relaxed rounded p-2 border",
              isDarkTheme
                ? "text-gray-300 bg-purple-500/5 border-purple-500/20"
                : "text-gray-700 bg-purple-50 border-purple-200"
            )}
          >
            {data.semantic_landscape}
          </div>
        </div>
      )}

      {/* Engine Strategies */}
      {data.engine_strategies && (
        <div className="space-y-3">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider",
              isDarkTheme ? "text-cyan-400/70" : "text-cyan-600"
            )}
          >
            {t.cardEngineStrategies}
          </div>

          {/* Google Strategy */}
          {data.engine_strategies.google && (
            <div
              className={cn(
                "border rounded p-2 space-y-2",
                isDarkTheme
                  ? "bg-cyan-500/5 border-cyan-500/20"
                  : "bg-cyan-50 border-cyan-200"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium",
                  isDarkTheme ? "text-cyan-400" : "text-cyan-600"
                )}
              >
                {t.cardGoogle}
              </div>
              {data.engine_strategies.google.ranking_logic && (
                <div
                  className={cn(
                    "text-[11px]",
                    isDarkTheme ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      isDarkTheme ? "text-cyan-400/70" : "text-cyan-600"
                    )}
                  >
                    {t.cardRankingLogic}:
                  </span>{" "}
                  {data.engine_strategies.google.ranking_logic}
                </div>
              )}
              {data.engine_strategies.google.content_gap && (
                <div
                  className={cn(
                    "text-[11px]",
                    isDarkTheme ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      isDarkTheme ? "text-cyan-400/70" : "text-cyan-600"
                    )}
                  >
                    {t.cardContentGap}:
                  </span>{" "}
                  {data.engine_strategies.google.content_gap}
                </div>
              )}
              {data.engine_strategies.google.action_item && (
                <div
                  className={cn(
                    "text-[11px]",
                    isDarkTheme ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      isDarkTheme ? "text-cyan-400/70" : "text-cyan-600"
                    )}
                  >
                    {t.cardActionItem}:
                  </span>{" "}
                  {data.engine_strategies.google.action_item}
                </div>
              )}
            </div>
          )}

          {/* Perplexity Strategy */}
          {data.engine_strategies.perplexity && (
            <div
              className={cn(
                "border rounded p-2 space-y-2",
                isDarkTheme
                  ? "bg-blue-500/5 border-blue-500/20"
                  : "bg-blue-50 border-blue-200"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium",
                  isDarkTheme ? "text-blue-400" : "text-blue-600"
                )}
              >
                {t.cardPerplexity}
              </div>
              {data.engine_strategies.perplexity.citation_logic && (
                <div
                  className={cn(
                    "text-[11px]",
                    isDarkTheme ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      isDarkTheme ? "text-blue-400/70" : "text-blue-600"
                    )}
                  >
                    {t.cardCitationLogic}:
                  </span>{" "}
                  {data.engine_strategies.perplexity.citation_logic}
                </div>
              )}
              {data.engine_strategies.perplexity.structure_hint && (
                <div
                  className={cn(
                    "text-[11px]",
                    isDarkTheme ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      isDarkTheme ? "text-blue-400/70" : "text-blue-600"
                    )}
                  >
                    {t.cardStructureHint}:
                  </span>{" "}
                  {data.engine_strategies.perplexity.structure_hint}
                </div>
              )}
            </div>
          )}

          {/* Generative AI Strategy */}
          {data.engine_strategies.generative_ai && (
            <div
              className={cn(
                "border rounded p-2 space-y-2",
                isDarkTheme
                  ? "bg-emerald-500/5 border-emerald-500/20"
                  : "bg-emerald-50 border-emerald-200"
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium",
                  isDarkTheme ? "text-emerald-400" : "text-emerald-600"
                )}
              >
                {t.cardGenerativeAI}
              </div>
              {data.engine_strategies.generative_ai.llm_preference && (
                <div
                  className={cn(
                    "text-[11px]",
                    isDarkTheme ? "text-gray-300" : "text-gray-700"
                  )}
                >
                  <span
                    className={cn(
                      isDarkTheme ? "text-emerald-400/70" : "text-emerald-600"
                    )}
                  >
                    {t.cardLlmPreference}:
                  </span>{" "}
                  {data.engine_strategies.generative_ai.llm_preference}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GEO Recommendations - 支持字符串和对象两种格式 */}
      {data.geo_recommendations &&
        // 如果是字符串格式，直接显示
        (typeof data.geo_recommendations === "string" ? (
          <div className="space-y-1">
            <div
              className={cn(
                "text-[10px] uppercase tracking-wider",
                isDarkTheme ? "text-amber-400/70" : "text-amber-600"
              )}
            >
              {t.cardGeoRecommendations}
            </div>
            <div
              className={cn(
                "border rounded p-2 text-xs leading-relaxed",
                isDarkTheme
                  ? "bg-amber-500/5 border-amber-500/20 text-gray-300"
                  : "bg-amber-50 border-amber-200 text-gray-700"
              )}
            >
              {data.geo_recommendations}
            </div>
          </div>
        ) : (
          // 如果是对象格式，显示各个字段
          (data.geo_recommendations.format_engineering ||
            data.geo_recommendations.entity_engineering ||
            data.geo_recommendations.information_gain ||
            data.geo_recommendations.structure_optimization) && (
            <div className="space-y-1">
              <div
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  isDarkTheme ? "text-amber-400/70" : "text-amber-600"
                )}
              >
                {t.cardGeoRecommendations}
              </div>
              <div
                className={cn(
                  "border rounded p-2 space-y-2 text-xs",
                  isDarkTheme
                    ? "bg-amber-500/5 border-amber-500/20 text-gray-300"
                    : "bg-amber-50 border-amber-200 text-gray-700"
                )}
              >
                {data.geo_recommendations.format_engineering && (
                  <div>
                    <span className="text-amber-400/70">
                      {uiLanguage === "zh"
                        ? "格式工程:"
                        : "Format Engineering:"}
                    </span>{" "}
                    {data.geo_recommendations.format_engineering}
                  </div>
                )}
                {data.geo_recommendations.entity_engineering && (
                  <div>
                    <span className="text-amber-400/70">
                      {uiLanguage === "zh"
                        ? "实体工程:"
                        : "Entity Engineering:"}
                    </span>{" "}
                    {data.geo_recommendations.entity_engineering}
                  </div>
                )}
                {data.geo_recommendations.information_gain && (
                  <div>
                    <span className="text-amber-400/70">
                      {uiLanguage === "zh" ? "信息增益:" : "Information Gain:"}
                    </span>{" "}
                    {data.geo_recommendations.information_gain}
                  </div>
                )}
                {data.geo_recommendations.structure_optimization && (
                  <div>
                    <span className="text-amber-400/70">
                      {uiLanguage === "zh"
                        ? "结构优化:"
                        : "Structure Optimization:"}
                    </span>{" "}
                    {data.geo_recommendations.structure_optimization}
                  </div>
                )}
              </div>
            </div>
          )
        ))}
    </div>
  );
};

// Quality Review Card Component
const QualityReviewCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  // 调试日志
  if (process.env.NODE_ENV === "development") {
    console.log("[QualityReviewCard] 接收到的数据:", {
      dataType: typeof data,
      isString: typeof data === "string",
      isObject: typeof data === "object" && data !== null,
      dataKeys:
        typeof data === "object" && data !== null ? Object.keys(data) : [],
      dataPreview:
        typeof data === "string"
          ? data.substring(0, 200)
          : JSON.stringify(data).substring(0, 200),
    });
  }

  // 如果 data 是字符串，尝试解析 JSON
  let parsedData = data;
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      // 解析失败，保持原样
      console.warn("[QualityReviewCard] 无法解析 JSON 字符串:", e);
    }
  }

  // Extract geo_score from data
  const geoScore = parsedData.geo_score || parsedData.geo_diagnosis;
  const logicCheck = parsedData.logic_check;
  const seoMeta = parsedData.seo_meta;
  const totalScore = geoScore?.total_score || parsedData.total_score || 0;

  // Convert geo_score to QualityScore format if needed
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

  // Check if there's any content to show
  const hasContent =
    totalScore > 0 ||
    seoMeta ||
    logicCheck ||
    parsedData.other_checks ||
    (parsedData.fix_list && parsedData.fix_list.length > 0);

  // 调试日志：检查内容
  if (process.env.NODE_ENV === "development") {
    console.log("[QualityReviewCard] 内容检查:", {
      totalScore,
      hasSeoMeta: !!seoMeta,
      hasLogicCheck: !!logicCheck,
      hasOtherChecks: !!parsedData.other_checks,
      hasFixList: !!(parsedData.fix_list && parsedData.fix_list.length > 0),
      hasContent,
    });
  }

  // Don't render if there's no content
  if (!hasContent) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[QualityReviewCard] 没有内容，不渲染卡片");
    }
    return null;
  }

  return (
    <div
      className={cn(
        "border rounded-lg p-4 mt-2 space-y-4",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Target size={12} className="mr-1" />
        {uiLanguage === "zh" ? "质量审查结果" : "Quality Review Results"}
      </h4>

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
                  {uiLanguage === "zh" ? "描述 (Description)" : "Description"}
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
        <div className="space-y-1">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider",
              isDarkTheme ? "text-emerald-400/70" : "text-emerald-600"
            )}
          >
            {uiLanguage === "zh" ? "逻辑检查" : "Logic Check"}
          </div>
          <div
            className={cn(
              "border rounded p-2 text-xs leading-relaxed",
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
      {parsedData.other_checks && (
        <div className="space-y-2">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider",
              isDarkTheme ? "text-blue-400/70" : "text-blue-600"
            )}
          >
            {uiLanguage === "zh" ? "其他质量检查" : "Other Quality Checks"}
          </div>
          <div
            className={cn(
              "border rounded p-2 space-y-2 text-xs",
              isDarkTheme
                ? "bg-blue-500/5 border-blue-500/20"
                : "bg-blue-50 border-blue-200"
            )}
          >
            {parsedData.other_checks.authenticity && (
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
                    parsedData.other_checks.authenticity.passed
                      ? isDarkTheme
                        ? "text-emerald-400"
                        : "text-emerald-600"
                      : isDarkTheme
                      ? "text-red-400"
                      : "text-red-600"
                  }
                >
                  {parsedData.other_checks.authenticity.passed
                    ? uiLanguage === "zh"
                      ? "通过"
                      : "Passed"
                    : uiLanguage === "zh"
                    ? "未通过"
                    : "Failed"}
                </span>
              </div>
            )}
            {parsedData.other_checks.seo_depth && (
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
                  {uiLanguage === "zh" ? "关键词密度" : "Keyword Density"}:{" "}
                  {parsedData.other_checks.seo_depth.keyword_density || "N/A"}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fix List */}
      {parsedData.fix_list && parsedData.fix_list.length > 0 && (
        <div className="space-y-1">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider",
              isDarkTheme ? "text-amber-400/70" : "text-amber-600"
            )}
          >
            {uiLanguage === "zh" ? "需要修复的问题" : "Issues to Fix"}
          </div>
          <div className="space-y-1">
            {parsedData.fix_list.map((fix: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "border rounded p-2 text-xs",
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
                          isDarkTheme ? "text-amber-400/70" : "text-amber-600"
                        )}
                      >
                        {uiLanguage === "zh" ? "优先级:" : "Priority:"}{" "}
                        {fix.priority}
                      </div>
                    )}
                    {fix.issue && (
                      <div
                        className={cn(
                          isDarkTheme ? "text-gray-300" : "text-gray-700"
                        )}
                      >
                        {uiLanguage === "zh" ? "问题:" : "Issue:"} {fix.issue}
                      </div>
                    )}
                    {fix.suggestion && (
                      <div
                        className={cn(
                          "italic",
                          isDarkTheme ? "text-gray-400" : "text-gray-600"
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
  );
};

// Final Article Card Component
const FinalArticleCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  // 调试日志
  if (process.env.NODE_ENV === "development") {
    console.log("[FinalArticleCard] 接收到的数据:", {
      dataType: typeof data,
      isString: typeof data === "string",
      isObject: typeof data === "object" && data !== null,
      hasArticleBody: !!data?.article_body,
      hasContent: !!data?.content,
      keys: typeof data === "object" && data !== null ? Object.keys(data) : [],
    });
  }

  // Try to parse JSON string if data is a string
  let parsedData = data;
  if (typeof data === "string") {
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      // If parsing fails, treat as markdown content
      parsedData = { article_body: data, content: data };
    }
  }

  // 如果 data 已经是对象，但包含 JSON 字符串字段，尝试解析
  if (typeof parsedData === "object" && parsedData !== null) {
    // 检查是否有字段是 JSON 字符串
    if (
      parsedData.article_body &&
      typeof parsedData.article_body === "string" &&
      parsedData.article_body.trim().startsWith("{")
    ) {
      try {
        const parsedBody = JSON.parse(parsedData.article_body);
        if (typeof parsedBody === "object" && parsedBody !== null) {
          // 合并解析后的内容
          parsedData = { ...parsedData, ...parsedBody };
        }
      } catch (e) {
        // 解析失败，保持原样
      }
    }
  }

  // Extract fields from parsed data
  const articleBody =
    parsedData.article_body || parsedData.content || parsedData.markdown || "";
  const title = parsedData.title || parsedData.seo_meta?.title || "";
  const seoMeta = parsedData.seo_meta;
  const geoScore = parsedData.geo_score;
  const logicCheck = parsedData.logic_check;
  const qualityReview = parsedData.qualityReview || parsedData.quality_review;

  // 调试日志：检查提取的内容
  if (process.env.NODE_ENV === "development") {
    console.log("[FinalArticleCard] 提取的内容:", {
      hasArticleBody: !!articleBody,
      articleBodyLength: articleBody?.length || 0,
      articleBodyPreview: articleBody?.substring(0, 100),
      hasTitle: !!title,
      titleValue: title,
      hasQualityReview: !!qualityReview,
      qualityReviewType: typeof qualityReview,
      qualityReviewKeys:
        qualityReview && typeof qualityReview === "object"
          ? Object.keys(qualityReview)
          : [],
      hasSeoMeta: !!seoMeta,
      hasGeoScore: !!geoScore,
      hasLogicCheck: !!logicCheck,
    });
  }

  if (!articleBody && !title) {
    return (
      <div
        className={cn(
          "border rounded-lg p-4 mt-2",
          isDarkTheme
            ? "bg-white/5 border-white/10"
            : "bg-gray-50 border-gray-200"
        )}
      >
        <div
          className={cn(
            "text-xs italic",
            isDarkTheme ? "text-gray-500" : "text-gray-600"
          )}
        >
          {uiLanguage === "zh"
            ? "暂无文章内容"
            : "No article content available"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border rounded-lg p-4 mt-2 space-y-4",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <FileText size={12} className="mr-1" />
        {uiLanguage === "zh" ? "最终文章" : "Final Article"}
      </h4>

      {/* Title */}
      {title && (
        <div
          className={cn(
            "text-sm font-bold",
            isDarkTheme ? "text-white" : "text-gray-900"
          )}
        >
          {title}
        </div>
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
                  {uiLanguage === "zh" ? "描述 (Description)" : "Description"}
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

      {/* Article Body */}
      {articleBody && (
        <div
          className={cn(
            "prose prose-sm max-w-none",
            isDarkTheme ? "prose-invert" : ""
          )}
        >
          <div
            className={cn(
              "text-xs leading-relaxed max-h-96 overflow-y-auto",
              isDarkTheme ? "text-gray-300" : "text-gray-700"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {articleBody}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Quality Review */}
      {qualityReview && (
        <QualityReviewCard
          data={qualityReview}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* GEO Score (if not in quality review) */}
      {geoScore && !qualityReview && (
        <div className="space-y-1">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider",
              isDarkTheme ? "text-blue-400/70" : "text-blue-600"
            )}
          >
            {uiLanguage === "zh" ? "GEO 评分" : "GEO Score"}
          </div>
          <div
            className={cn(
              "border rounded p-2 text-xs",
              isDarkTheme
                ? "bg-blue-500/5 border-blue-500/20"
                : "bg-blue-50 border-blue-200"
            )}
          >
            {geoScore.total_score !== undefined && (
              <div
                className={cn(
                  "font-bold",
                  isDarkTheme ? "text-blue-400" : "text-blue-600"
                )}
              >
                {uiLanguage === "zh" ? "总分:" : "Total Score:"}{" "}
                {geoScore.total_score}/100
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logic Check */}
      {logicCheck && (
        <div className="space-y-1">
          <div
            className={cn(
              "text-[10px] uppercase tracking-wider",
              isDarkTheme ? "text-emerald-400/70" : "text-emerald-600"
            )}
          >
            {uiLanguage === "zh" ? "逻辑检查" : "Logic Check"}
          </div>
          <div
            className={cn(
              "border rounded p-2 text-xs leading-relaxed",
              isDarkTheme
                ? "bg-emerald-500/5 border-emerald-500/20 text-gray-300"
                : "bg-emerald-50 border-emerald-200 text-gray-700"
            )}
          >
            {logicCheck}
          </div>
        </div>
      )}
    </div>
  );
};

const CompetitorAnalysisCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
}> = ({ data, uiLanguage, isDarkTheme = true }) => {
  const t = AGENT_TEXT[uiLanguage];

  // If markdown field exists, render markdown directly
  if (data.markdown) {
    return (
      <div
        className={cn(
          "border rounded-lg p-4 mt-2",
          isDarkTheme
            ? "bg-white/5 border-white/10"
            : "bg-gray-50 border-gray-200"
        )}
      >
        <h4
          className={cn(
            "text-xs font-bold uppercase tracking-widest flex items-center mb-3",
            isDarkTheme ? "text-gray-400" : "text-gray-600"
          )}
        >
          <Target size={12} className="mr-1" /> {t.cardCompetitorAnalysis}
        </h4>
        <div
          className={cn(
            "prose prose-sm max-w-none",
            isDarkTheme ? "prose-invert" : ""
          )}
        >
          <div
            className={cn(
              "text-xs leading-relaxed",
              isDarkTheme ? "text-gray-300" : "text-gray-700"
            )}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: render old structured format
  return (
    <div
      className={cn(
        "border rounded-lg p-4 mt-2 space-y-4",
        isDarkTheme
          ? "bg-white/5 border-white/10"
          : "bg-gray-50 border-gray-200"
      )}
    >
      <h4
        className={cn(
          "text-xs font-bold uppercase tracking-widest flex items-center",
          isDarkTheme ? "text-gray-400" : "text-gray-600"
        )}
      >
        <Target size={12} className="mr-1" /> {t.cardCompetitorAnalysis}
      </h4>

      {/* Winning Formula */}
      {data.winning_formula && (
        <div className="space-y-1">
          <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider flex items-center">
            <TrendingUp size={10} className="mr-1" /> {t.cardWinningFormula}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
            {data.winning_formula}
          </div>
        </div>
      )}

      {/* Content Gaps */}
      {data.contentGaps && data.contentGaps.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wider">
            {t.cardContentGaps}
          </div>
          <div className="space-y-1">
            {data.contentGaps.map((gap: string, i: number) => (
              <div
                key={i}
                className="text-xs text-gray-300 bg-amber-500/5 border border-amber-500/20 rounded p-2 flex items-start"
              >
                <span className="text-amber-400 mr-2">•</span>
                <span>{gap}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Benchmark (Top 3) */}
      {data.competitor_benchmark && data.competitor_benchmark.length > 0 ? (
        <div className="space-y-1">
          <div className="text-[10px] text-blue-400/70 uppercase tracking-wider">
            {t.cardTopCompetitorsBenchmark}
          </div>
          <div className="space-y-2">
            {data.competitor_benchmark
              .slice(0, 3)
              .map((competitor: any, i: number) => (
                <div
                  key={i}
                  className="text-xs bg-blue-500/5 border border-blue-500/20 rounded p-2 space-y-1"
                >
                  {competitor.domain && (
                    <div className="text-blue-400 font-medium">
                      {competitor.domain}
                    </div>
                  )}
                  {competitor.content_angle && (
                    <div className="text-gray-300 text-[11px]">
                      {t.cardAngle}: {competitor.content_angle}
                    </div>
                  )}
                  {competitor.weakness && (
                    <div className="text-gray-400 text-[11px] italic">
                      {t.cardWeakness}: {competitor.weakness}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      ) : (
        // Show empty state if no competitor benchmark data
        <div className="space-y-1">
          <div className="text-[10px] text-blue-400/70 uppercase tracking-wider">
            {t.cardTopCompetitorsBenchmark}
          </div>
          <div className="text-xs text-gray-500 italic bg-blue-500/5 border border-blue-500/20 rounded p-2">
            {uiLanguage === "zh"
              ? "暂无竞争对手基准数据"
              : "No competitor benchmark data available"}
          </div>
        </div>
      )}
    </div>
  );
};

export const StreamEventDetails: React.FC<{
  event: AgentStreamEvent;
  uiLanguage: UILanguage;
  isDarkTheme?: boolean;
  onImageFullscreen?: (url: string, prompt?: string, theme?: string) => void;
}> = ({ event, uiLanguage, isDarkTheme = true, onImageFullscreen }) => {
  const t = AGENT_TEXT[uiLanguage];
  switch (event.cardType) {
    case "serp":
      return (
        <SerpCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "data":
      return (
        <DataCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "outline":
      return (
        <OutlineCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "competitor-analysis":
      return (
        <CompetitorAnalysisCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "search-preferences":
      return (
        <SearchPreferencesCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "google-search-results":
      return (
        <GoogleSearchResultsCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "firecrawl-result":
      return (
        <FirecrawlResultCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "dataforseo-competitors":
      return (
        <DataForSEOCompetitorsCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "dataforseo-keywords":
      return (
        <DataForSEOKeywordsCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "website-audit-report":
      return (
        <WebsiteAuditReportCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "quality-review":
      return (
        <QualityReviewCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "final-article":
      return (
        <FinalArticleCard
          data={event.data}
          uiLanguage={uiLanguage}
          isDarkTheme={isDarkTheme}
        />
      );
    case "image-gen":
      // Determine status from event data
      const imageStatus: ImageGenerationStatus =
        event.data.status ||
        (event.data.imageUrl
          ? "completed"
          : event.data.error
          ? "failed"
          : "generating");

      return (
        <div className="mt-2">
          <EnhancedImageGenCard
            theme={event.data.theme || "Image"}
            prompt={event.data.prompt || ""}
            status={imageStatus}
            progress={event.data.progress}
            imageUrl={event.data.imageUrl}
            error={event.data.error}
            estimatedTime={event.data.estimatedTime}
            onRegenerate={event.data.onRegenerate}
            onDownload={event.data.onDownload}
            onViewFullscreen={
              onImageFullscreen
                ? () =>
                    onImageFullscreen(
                      event.data.imageUrl,
                      event.data.prompt,
                      event.data.theme
                    )
                : event.data.onViewFullscreen
            }
            uiLanguage={uiLanguage}
          />
        </div>
      );
    case "streaming-text":
      return (
        <div className="mt-2">
          <StreamingTextCard
            content={event.data.content || ""}
            markdown={event.data.markdown}
            speed={event.data.speed}
            interval={event.data.interval}
            onComplete={event.data.onComplete}
            uiLanguage={uiLanguage}
          />
        </div>
      );
    default:
      return null;
  }
};

const getAgentIcon = (id: string) => {
  switch (id) {
    case "tracker":
      return <Search className="text-blue-500" size={16} />;
    case "researcher":
      return <Search className="text-blue-500" size={16} />;
    case "strategist":
      return <FileText className="text-emerald-500" size={16} />;
    case "writer":
      return <PenTool className="text-amber-500" size={16} />;
    case "artist":
      return <ImageIcon className="text-purple-500" size={16} />;
    default:
      return <CheckCircle className="text-gray-500" size={16} />;
  }
};

const getAgentName = (id: string, uiLanguage: UILanguage) => {
  const t = AGENT_TEXT[uiLanguage];
  switch (id) {
    case "tracker":
      return t.agentTracker;
    case "researcher":
      return t.agentResearcher;
    case "strategist":
      return t.agentStrategist;
    case "writer":
      return t.agentWriter;
    case "artist":
      return t.agentArtist;
    default:
      return t.agentSystem;
  }
};

const getAgentDescription = (
  id: string,
  uiLanguage: UILanguage
): string | null => {
  const t = AGENT_TEXT[uiLanguage];
  switch (id) {
    case "tracker":
      return t.agentTrackerDesc;
    case "researcher":
      return t.agentResearcherDesc;
    case "strategist":
      return t.agentStrategistDesc;
    case "writer":
      return t.agentWriterDesc;
    case "artist":
      return t.agentArtistDesc;
    default:
      return null;
  }
};

// Terminal Window Frame Component
const TerminalWindow: React.FC<{
  children: React.ReactNode;
  isDarkTheme?: boolean;
}> = ({ children, isDarkTheme = true }) => {
  return (
    <div
      className={cn(
        "border rounded-lg overflow-hidden shadow-2xl h-full flex flex-col",
        isDarkTheme
          ? "bg-[#0a0a0a] border-gray-800"
          : "bg-white border-gray-300"
      )}
    >
      {/* Terminal Header */}
      <div
        className={cn(
          "border-b px-4 py-2 flex items-center justify-between shrink-0",
          isDarkTheme
            ? "bg-[#1a1a1a] border-gray-800"
            : "bg-gray-50 border-gray-300"
        )}
      >
        {/* Window Controls */}
        <div className="flex items-center space-x-2">
          <button className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center group">
            <X
              size={8}
              className="text-red-900 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
          <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors flex items-center justify-center group">
            <Minus
              size={8}
              className="text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
          <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center group">
            <Square
              size={6}
              className="text-green-900 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
        </div>

        {/* Terminal Title */}
        <div className="flex-1 text-center">
          <span
            className={cn(
              "text-xs font-mono",
              isDarkTheme ? "text-gray-400" : "text-gray-600"
            )}
          >
            agent-terminal
          </span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-12"></div>
      </div>

      {/* Terminal Content - Scrollable */}
      <div
        className={cn(
          "flex-1 overflow-y-auto min-h-0",
          isDarkTheme ? "bg-[#0a0a0a]" : "bg-white"
        )}
      >
        {children}
      </div>
    </div>
  );
};

// Typing Effect Component
const TypingText: React.FC<{
  text: string;
  speed?: number;
  onComplete?: () => void;
}> = ({ text, speed = 30, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (text.length === 0) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayedText("");
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span>
      {displayedText}
      {!isComplete && <Cursor />}
    </span>
  );
};

// Blinking Cursor Component
const Cursor: React.FC = () => {
  return (
    <span className="inline-block w-2 h-4 bg-emerald-400 ml-0.5 animate-pulse" />
  );
};

// Terminal Prompt Component
const TerminalPrompt: React.FC<{
  agentName: string;
  isDarkTheme?: boolean;
}> = ({ agentName, isDarkTheme = true }) => {
  return (
    <span
      className={cn(
        "font-mono",
        isDarkTheme ? "text-emerald-400" : "text-emerald-600"
      )}
    >
      <span className={isDarkTheme ? "text-gray-500" : "text-gray-400"}>$</span>{" "}
      <span className={isDarkTheme ? "text-blue-400" : "text-blue-600"}>
        {agentName.toLowerCase()}
      </span>
      <span className={isDarkTheme ? "text-gray-500" : "text-gray-400"}>:</span>
      <span className={isDarkTheme ? "text-emerald-400" : "text-emerald-600"}>
        ~
      </span>
      <span className={isDarkTheme ? "text-gray-500" : "text-gray-400"}>$</span>{" "}
    </span>
  );
};

// Code Highlight Component
const CodeHighlight: React.FC<{
  children: React.ReactNode;
  isDarkTheme?: boolean;
}> = ({ isDarkTheme = true, children }) => {
  return (
    <span
      className={cn(
        "font-mono text-xs px-1.5 py-0.5 rounded border",
        isDarkTheme
          ? "bg-black/30 text-emerald-300 border-emerald-500/20"
          : "bg-gray-100 text-emerald-700 border-emerald-300"
      )}
    >
      {children}
    </span>
  );
};

// Loading Animation Component
const LoadingDots: React.FC = () => {
  return (
    <span className="inline-flex items-center space-x-1 ml-1">
      <span
        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
};

// Agent Working Animation
const AgentWorkingIndicator: React.FC<{ agentName: string }> = ({
  agentName,
}) => {
  return (
    <div className="flex items-center space-x-2 text-gray-400 text-xs italic">
      <Loader2 className="animate-spin text-emerald-400" size={12} />
      <span>{agentName} is working</span>
      <LoadingDots />
    </div>
  );
};

interface AgentStreamFeedProps {
  events: AgentStreamEvent[];
  uiLanguage?: UILanguage;
  isDarkTheme?: boolean;
  isGenerating?: boolean; // 是否正在生成中
}

export const AgentStreamFeed: React.FC<AgentStreamFeedProps> = ({
  events,
  uiLanguage = "en",
  isDarkTheme = true,
  isGenerating = false,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    prompt?: string;
    theme?: string;
  } | null>(null);

  // 检测最后一个事件是否已完成
  const lastEvent = events[events.length - 1];
  const lastEventCompleted = lastEvent
    ? typingStates[lastEvent.id] || false
    : false;

  // 如果正在生成中，但最后一个事件已完成，显示动态处理提示
  const shouldShowProcessingIndicator =
    isGenerating && events.length > 0 && lastEventCompleted;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Handle image fullscreen view
  const handleImageFullscreen = (
    imageUrl: string,
    prompt?: string,
    theme?: string
  ) => {
    setLightboxImage({ url: imageUrl, prompt, theme });
  };

  const handleTypingComplete = (eventId: string) => {
    setTypingStates((prev) => ({ ...prev, [eventId]: true }));
  };

  // Check if message contains code-like patterns for highlighting
  const highlightCodeInText = (text: string) => {
    // Match code patterns: backticks, file paths, URLs, commands
    const codePatterns = [
      /`([^`]+)`/g, // Backtick code
      /(\/[^\s]+)/g, // File paths
      /(https?:\/\/[^\s]+)/g, // URLs
      /(\$ [^\n]+)/g, // Commands
      /([A-Z_]+_[A-Z_]+)/g, // CONSTANTS
    ];

    let parts: Array<{ text: string; isCode: boolean }> = [
      { text, isCode: false },
    ];

    codePatterns.forEach((pattern) => {
      const newParts: Array<{ text: string; isCode: boolean }> = [];
      parts.forEach((part) => {
        if (part.isCode) {
          newParts.push(part);
        } else {
          let lastIndex = 0;
          let match;
          while ((match = pattern.exec(part.text)) !== null) {
            if (match.index > lastIndex) {
              newParts.push({
                text: part.text.slice(lastIndex, match.index),
                isCode: false,
              });
            }
            newParts.push({ text: match[0], isCode: true });
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < part.text.length) {
            newParts.push({ text: part.text.slice(lastIndex), isCode: false });
          }
        }
      });
      parts = newParts;
    });

    return parts;
  };

  return (
    <TerminalWindow isDarkTheme={isDarkTheme}>
      <div className="p-6 space-y-4 font-mono text-sm">
        {events.length === 0 && (
          <div
            className={cn(
              "text-xs",
              isDarkTheme ? "text-gray-500" : "text-gray-600"
            )}
          >
            <TerminalPrompt agentName="system" isDarkTheme={isDarkTheme} />
            <span
              className={cn(isDarkTheme ? "text-gray-400" : "text-gray-700")}
            >
              Waiting for agents to start
            </span>
            <LoadingDots />
            <Cursor />
          </div>
        )}

        {events.map((event) => {
          const agentDesc = getAgentDescription(event.agentId, uiLanguage);
          const agentName = getAgentName(event.agentId, uiLanguage);
          const isTyping = !typingStates[event.id];
          const showTyping = event.message && isTyping;

          return (
            <div
              key={event.id}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* Terminal-style line with prompt */}
              <div className="flex items-start space-x-2 mb-2">
                <TerminalPrompt
                  agentName={agentName}
                  isDarkTheme={isDarkTheme}
                />

                {/* Agent Description - Show when no message and no card */}
                {!event.message && !event.cardType && agentDesc && (
                  <div
                    className={cn(
                      "text-xs italic flex items-center space-x-2",
                      isDarkTheme ? "text-gray-400" : "text-gray-600"
                    )}
                  >
                    <span>{agentDesc}</span>
                    <LoadingDots />
                    <Cursor />
                  </div>
                )}

                {/* Message with typing effect */}
                {event.message &&
                  (() => {
                    // Check if this is a transition message
                    const isTransitionMessage =
                      event.message.includes("Transitioning") ||
                      event.message.includes("Preparing") ||
                      event.message.includes("complete") ||
                      event.message.includes("正在切换") ||
                      event.message.includes("正在准备") ||
                      event.message.includes("完成");

                    return (
                      <div
                        className={cn(
                          "text-sm leading-relaxed flex-1 flex items-center space-x-2",
                          event.type === "error"
                            ? "text-red-400"
                            : isDarkTheme
                            ? "text-gray-300"
                            : "text-gray-700"
                        )}
                      >
                        {showTyping ? (
                          <>
                            <TypingText
                              text={event.message}
                              speed={20}
                              onComplete={() => handleTypingComplete(event.id)}
                            />
                            {/* Show LoadingDots during typing for transition messages */}
                            {isTransitionMessage && <LoadingDots />}
                          </>
                        ) : (
                          <>
                            {/* Transition messages always show LoadingDots */}
                            {isTransitionMessage ? (
                              <>
                                <span>
                                  {highlightCodeInText(event.message).map(
                                    (part, i) =>
                                      part.isCode ? (
                                        <CodeHighlight
                                          key={i}
                                          isDarkTheme={isDarkTheme}
                                        >
                                          {part.text}
                                        </CodeHighlight>
                                      ) : (
                                        <span key={i}>{part.text}</span>
                                      )
                                  )}
                                </span>
                                <LoadingDots />
                                <Cursor />
                              </>
                            ) : (
                              <>
                                {highlightCodeInText(event.message).map(
                                  (part, i) =>
                                    part.isCode ? (
                                      <CodeHighlight
                                        key={i}
                                        isDarkTheme={isDarkTheme}
                                      >
                                        {part.text}
                                      </CodeHighlight>
                                    ) : (
                                      <span key={i}>{part.text}</span>
                                    )
                                )}
                                <Cursor />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
              </div>

              {/* Functional Cards */}
              {event.type === "card" && (
                <div className="ml-8 mt-2">
                  <StreamEventDetails
                    event={event}
                    uiLanguage={uiLanguage}
                    isDarkTheme={isDarkTheme}
                    onImageFullscreen={handleImageFullscreen}
                  />
                </div>
              )}

              {/* Error Card */}
              {event.type === "error" && (
                <div className="ml-8 mt-2">
                  <ErrorCard
                    type={(event.data?.errorType as ErrorType) || "unknown"}
                    message={event.message || "An error occurred"}
                    details={event.data?.details}
                    onRetry={event.data?.onRetry}
                    uiLanguage={uiLanguage}
                  />
                </div>
              )}

              {/* Timestamp (subtle) */}
              <div
                className={cn(
                  "ml-8 text-[10px] mt-1",
                  isDarkTheme ? "text-gray-600" : "text-gray-500"
                )}
              >
                [{new Date(event.timestamp).toLocaleTimeString()}]
              </div>
            </div>
          );
        })}

        {/* Show processing indicator if generating but no new events */}
        {shouldShowProcessingIndicator && (
          <div
            className={cn(
              "text-xs mt-4 flex items-center space-x-2",
              isDarkTheme ? "text-gray-400" : "text-gray-600"
            )}
          >
            <TerminalPrompt agentName="system" isDarkTheme={isDarkTheme} />
            <span className="italic">
              {uiLanguage === "zh" ? "正在处理中..." : "Processing..."}
            </span>
            <LoadingDots />
            <Cursor />
          </div>
        )}

        {/* Always show cursor at the end */}
        {events.length > 0 && !shouldShowProcessingIndicator && (
          <div
            className={cn(
              "text-xs mt-4",
              isDarkTheme ? "text-gray-500" : "text-gray-600"
            )}
          >
            <TerminalPrompt agentName="system" isDarkTheme={isDarkTheme} />
            <Cursor />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage.url}
          prompt={lightboxImage.prompt}
          theme={lightboxImage.theme}
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          uiLanguage={uiLanguage}
        />
      )}
    </TerminalWindow>
  );
};
