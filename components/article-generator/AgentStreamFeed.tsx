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
const SerpCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({
  data,
  uiLanguage,
}) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Search size={12} className="mr-1" /> {t.cardTopCompetitors}
      </h4>
      <div className="space-y-2">
        {data.results?.slice(0, 3).map((result: any, i: number) => (
          <a
            key={i}
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2 bg-black/20 rounded hover:bg-black/30 transition-colors"
          >
            <div className="text-xs font-medium text-emerald-400 truncate">
              {result.title}
            </div>
            <div className="text-[10px] text-gray-500 truncate">
              {result.url}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const DataCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({
  data,
  uiLanguage,
}) => {
  const t = AGENT_TEXT[uiLanguage];
  return (
    <div className="flex space-x-2 mt-2">
      {data.volume > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded text-xs text-blue-400 font-mono">
          {t.cardVolume}: {data.volume}
        </div>
      )}
      {data.difficulty > 0 && (
        <div
          className={cn(
            "bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded text-xs text-orange-400 font-mono"
          )}
        >
          {t.cardDifficulty}: {data.difficulty}
        </div>
      )}
    </div>
  );
};

const OutlineCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({
  data,
  uiLanguage,
}) => {
  const t = AGENT_TEXT[uiLanguage];

  // If markdown field exists, render markdown directly
  if (data.markdown) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center mb-3">
          <FileText size={12} className="mr-1" /> {t.cardStrategicOutline}
        </h4>
        <div className="prose prose-sm prose-invert max-w-none">
          <div className="text-xs text-gray-300 leading-relaxed">
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
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 font-mono text-xs text-gray-300">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center">
        <FileText size={12} className="mr-1" /> {t.cardStrategicOutline}
      </h4>
      <ul className="space-y-1 list-none pl-1">
        <li className="font-bold text-white text-sm pb-1">{data.h1}</li>
        {data.structure?.map((section: any, i: number) => (
          <li key={i} className="pl-2 border-l-2 border-white/10 ml-1">
            <span className="text-emerald-500 mr-2">H2</span>
            {section.header}
            {section.subsections && (
              <ul className="mt-1 ml-2 space-y-0.5 opacity-60 text-[10px]">
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

const FirecrawlResultCard: React.FC<{ data: any; uiLanguage: UILanguage }> = ({
  data,
  uiLanguage,
}) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Globe size={12} className="mr-1" />
        {uiLanguage === "zh" ? "Firecrawl 抓取结果" : "Firecrawl Scrape Result"}
      </h4>
      <div className="space-y-2">
        <div className="p-2 bg-black/20 rounded">
          <div className="text-xs font-medium text-emerald-400 truncate flex items-center">
            <ExternalLink size={10} className="mr-1" />
            {data.title || data.url}
          </div>
          <div className="text-[10px] text-gray-500 truncate mt-0.5">
            {data.url}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
            <span>
              {uiLanguage === "zh" ? "内容长度" : "Content"}:{" "}
              {data.contentLength?.toLocaleString()}{" "}
              {uiLanguage === "zh" ? "字符" : "chars"}
            </span>
            {data.hasScreenshot && (
              <span className="text-emerald-400">
                📸 {uiLanguage === "zh" ? "含截图" : "Screenshot"}
              </span>
            )}
            {data.images && data.images.length > 0 && (
              <span className="text-blue-400">
                🖼️ {data.images.length}{" "}
                {uiLanguage === "zh" ? "图片" : "images"}
              </span>
            )}
          </div>
          {data.preview && (
            <div className="text-[10px] text-gray-400 mt-2 line-clamp-3 bg-black/20 p-2 rounded">
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
}> = ({ data, uiLanguage }) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Database size={12} className="mr-1" />
        {uiLanguage === "zh" ? "DataForSEO 竞争对手" : "DataForSEO Competitors"}
      </h4>
      <div className="text-[10px] text-gray-500 mb-2">
        {uiLanguage === "zh" ? "分析域名" : "Analyzing domain"}:{" "}
        <span className="text-emerald-400">{data.domain}</span>
      </div>
      <div className="space-y-1.5">
        {data.competitors?.slice(0, 5).map((competitor: any, i: number) => (
          <div key={i} className="p-2 bg-black/20 rounded text-[10px]">
            <div className="text-emerald-400 font-medium truncate">
              {competitor.domain}
            </div>
            <div className="flex items-center gap-2 mt-1 text-gray-400">
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
          <div className="text-[10px] text-gray-500 text-center pt-1">
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
}> = ({ data, uiLanguage }) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Database size={12} className="mr-1" />
        {uiLanguage === "zh" ? "DataForSEO 关键词数据" : "DataForSEO Keywords"}
      </h4>
      <div className="text-[10px] text-gray-500 mb-2">
        {uiLanguage === "zh" ? "域名" : "Domain"}:{" "}
        <span className="text-emerald-400">{data.domain}</span>
        <span className="ml-2">
          {uiLanguage === "zh" ? "关键词数" : "Keywords"}: {data.keywordCount}
        </span>
      </div>
      <div className="space-y-1">
        {data.sampleKeywords?.slice(0, 5).map((kw: any, i: number) => (
          <div
            key={i}
            className="p-1.5 bg-black/20 rounded text-[10px] flex items-center justify-between"
          >
            <span className="text-emerald-300 truncate flex-1">
              {kw.keyword}
            </span>
            <div className="flex items-center gap-2 ml-2 text-gray-400">
              {kw.position > 0 && <span>Pos: {kw.position}</span>}
              {kw.volume > 0 && <span>Vol: {kw.volume}</span>}
              {kw.difficulty > 0 && <span>KD: {kw.difficulty}</span>}
            </div>
          </div>
        ))}
        {data.keywordCount > 5 && (
          <div className="text-[10px] text-gray-500 text-center pt-1">
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
}> = ({ data, uiLanguage }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const report = data.report || "";
  const maxPreviewLength = 500;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
          <FileText size={12} className="mr-1" />
          {uiLanguage === "zh"
            ? "网站审计分析报告"
            : "Website Audit Analysis Report"}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <span>
            {data.reportLength?.toLocaleString()}{" "}
            {uiLanguage === "zh" ? "字符" : "chars"}
          </span>
          {data.extractedKeywordsCount > 0 && (
            <span className="text-emerald-400">
              {data.extractedKeywordsCount}{" "}
              {uiLanguage === "zh" ? "个关键词建议" : "keyword suggestions"}
            </span>
          )}
        </div>
      </div>

      {/* Summary Info */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {data.websiteUrl && (
          <div className="p-2 bg-black/20 rounded">
            <div className="text-gray-500">
              {uiLanguage === "zh" ? "网站" : "Website"}
            </div>
            <div className="text-emerald-400 truncate">{data.websiteUrl}</div>
          </div>
        )}
        {data.competitorKeywordsCount !== undefined && (
          <div className="p-2 bg-black/20 rounded">
            <div className="text-gray-500">
              {uiLanguage === "zh" ? "竞争对手关键词" : "Competitor Keywords"}
            </div>
            <div className="text-emerald-400">
              {data.competitorKeywordsCount}
            </div>
          </div>
        )}
        {data.industry && (
          <div className="p-2 bg-black/20 rounded">
            <div className="text-gray-500">
              {uiLanguage === "zh" ? "行业" : "Industry"}
            </div>
            <div className="text-emerald-400">{data.industry}</div>
          </div>
        )}
        {data.miningStrategy && (
          <div className="p-2 bg-black/20 rounded">
            <div className="text-gray-500">
              {uiLanguage === "zh" ? "挖掘策略" : "Mining Strategy"}
            </div>
            <div className="text-emerald-400">
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
          <div className="text-[10px] text-gray-500 flex items-center justify-between">
            <span>
              {uiLanguage === "zh"
                ? "提取的关键词建议"
                : "Extracted Keyword Suggestions"}
            </span>
            <span className="text-emerald-400">
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
                  ? "text-green-400"
                  : probability === "Medium" || probability === "medium"
                  ? "text-yellow-400"
                  : probability === "Low" || probability === "low"
                  ? "text-red-400"
                  : "text-gray-400";

              const opportunityType =
                kw.opportunity_type || kw.opportunityType || "N/A";
              const intent = kw.intent || "Informational";

              return (
                <div
                  key={i}
                  className="p-3 bg-black/20 rounded border border-white/5 hover:border-emerald-500/30 transition-colors"
                >
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs font-semibold text-emerald-300 truncate"
                        title={kw.keyword}
                      >
                        {kw.keyword}
                      </div>
                      {kw.translation && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {kw.translation}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {probability !== "Unknown" && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${probabilityColor} bg-black/30`}
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
                        <span className="text-gray-500">
                          {uiLanguage === "zh" ? "搜索量" : "Volume"}:
                        </span>
                        <span className="text-emerald-400">
                          {kw.volume.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {kw.difficulty !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">
                          {uiLanguage === "zh" ? "难度" : "Difficulty"}:
                        </span>
                        <span
                          className={
                            kw.difficulty > 40
                              ? "text-red-400"
                              : kw.difficulty > 20
                              ? "text-yellow-400"
                              : "text-green-400"
                          }
                        >
                          {kw.difficulty}
                        </span>
                      </div>
                    )}
                    {intent && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">
                          {uiLanguage === "zh" ? "意图" : "Intent"}:
                        </span>
                        <span className="text-blue-400">{intent}</span>
                      </div>
                    )}
                    {opportunityType !== "N/A" && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">
                          {uiLanguage === "zh" ? "机会类型" : "Type"}:
                        </span>
                        <span className="text-purple-400 capitalize">
                          {opportunityType}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Reasoning */}
                  {kw.reasoning && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <div className="text-[10px] text-gray-500 mb-1">
                        {uiLanguage === "zh" ? "分析原因" : "Reasoning"}:
                      </div>
                      <div className="text-[10px] text-gray-300 leading-relaxed line-clamp-2">
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
            className="w-full text-left text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center justify-between p-2 bg-black/20 rounded hover:bg-black/30 transition-colors"
          >
            <span>
              {uiLanguage === "zh"
                ? "查看完整分析报告"
                : "View Full Analysis Report"}
            </span>
            <span>{isExpanded ? "▼" : "▶"}</span>
          </button>

          {isExpanded && (
            <div className="max-h-96 overflow-y-auto p-3 bg-black/20 rounded text-xs text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {report}
              </ReactMarkdown>
            </div>
          )}

          {!isExpanded && report.length > maxPreviewLength && (
            <div className="p-3 bg-black/20 rounded text-xs text-gray-400 leading-relaxed line-clamp-6">
              {report.substring(0, maxPreviewLength)}...
            </div>
          )}

          {!isExpanded && report.length <= maxPreviewLength && (
            <div className="p-3 bg-black/20 rounded text-xs text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none">
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
}> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];
  const searchResults = data.results || data.searchResults || [];

  if (!searchResults || searchResults.length === 0) {
    return null;
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
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
            className="block p-2 bg-black/20 rounded hover:bg-black/30 transition-colors group"
          >
            <div className="text-xs font-medium text-emerald-400 truncate group-hover:text-emerald-300">
              {result.title || result.url}
            </div>
            <div className="text-[10px] text-gray-500 truncate mt-0.5">
              {result.url}
            </div>
            {result.snippet && (
              <div className="text-[10px] text-gray-400 mt-1 line-clamp-2">
                {result.snippet}
              </div>
            )}
          </a>
        ))}
        {searchResults.length > 5 && (
          <div className="text-[10px] text-gray-500 text-center pt-1">
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
}> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];

  // If markdown field exists, render markdown directly
  if (data.markdown) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center mb-3">
          <Search size={12} className="mr-1" /> {t.cardSearchPreferences}
        </h4>
        <div className="prose prose-sm prose-invert max-w-none">
          <div className="text-xs text-gray-300 leading-relaxed">
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
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 space-y-4">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
        <Search size={12} className="mr-1" /> {t.cardSearchPreferences}
      </h4>

      {/* Semantic Landscape */}
      {data.semantic_landscape && (
        <div className="space-y-1">
          <div className="text-[10px] text-purple-400/70 uppercase tracking-wider flex items-center">
            <TrendingUp size={10} className="mr-1" /> {t.cardSemanticLandscape}
          </div>
          <div className="text-xs text-gray-300 leading-relaxed bg-purple-500/5 border border-purple-500/20 rounded p-2">
            {data.semantic_landscape}
          </div>
        </div>
      )}

      {/* Engine Strategies */}
      {data.engine_strategies && (
        <div className="space-y-3">
          <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider">
            {t.cardEngineStrategies}
          </div>

          {/* Google Strategy */}
          {data.engine_strategies.google && (
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded p-2 space-y-2">
              <div className="text-xs font-medium text-cyan-400">
                {t.cardGoogle}
              </div>
              {data.engine_strategies.google.ranking_logic && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-cyan-400/70">
                    {t.cardRankingLogic}:
                  </span>{" "}
                  {data.engine_strategies.google.ranking_logic}
                </div>
              )}
              {data.engine_strategies.google.content_gap && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-cyan-400/70">{t.cardContentGap}:</span>{" "}
                  {data.engine_strategies.google.content_gap}
                </div>
              )}
              {data.engine_strategies.google.action_item && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-cyan-400/70">{t.cardActionItem}:</span>{" "}
                  {data.engine_strategies.google.action_item}
                </div>
              )}
            </div>
          )}

          {/* Perplexity Strategy */}
          {data.engine_strategies.perplexity && (
            <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2 space-y-2">
              <div className="text-xs font-medium text-blue-400">
                {t.cardPerplexity}
              </div>
              {data.engine_strategies.perplexity.citation_logic && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-blue-400/70">
                    {t.cardCitationLogic}:
                  </span>{" "}
                  {data.engine_strategies.perplexity.citation_logic}
                </div>
              )}
              {data.engine_strategies.perplexity.structure_hint && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-blue-400/70">
                    {t.cardStructureHint}:
                  </span>{" "}
                  {data.engine_strategies.perplexity.structure_hint}
                </div>
              )}
            </div>
          )}

          {/* Generative AI Strategy */}
          {data.engine_strategies.generative_ai && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2 space-y-2">
              <div className="text-xs font-medium text-emerald-400">
                {t.cardGenerativeAI}
              </div>
              {data.engine_strategies.generative_ai.llm_preference && (
                <div className="text-[11px] text-gray-300">
                  <span className="text-emerald-400/70">
                    {t.cardLlmPreference}:
                  </span>{" "}
                  {data.engine_strategies.generative_ai.llm_preference}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* GEO Recommendations */}
      {data.geo_recommendations ? (
        <div className="space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wider">
            {t.cardGeoRecommendations}
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded p-2 space-y-2 text-xs text-gray-300">
            {data.geo_recommendations.format_engineering && (
              <div>
                <span className="text-amber-400/70">
                  {uiLanguage === "zh" ? "格式工程:" : "Format Engineering:"}
                </span>{" "}
                {data.geo_recommendations.format_engineering}
              </div>
            )}
            {data.geo_recommendations.entity_engineering && (
              <div>
                <span className="text-amber-400/70">
                  {uiLanguage === "zh" ? "实体工程:" : "Entity Engineering:"}
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
            {!data.geo_recommendations.format_engineering &&
              !data.geo_recommendations.entity_engineering &&
              !data.geo_recommendations.information_gain &&
              !data.geo_recommendations.structure_optimization && (
                <div className="text-gray-500 italic">
                  {uiLanguage === "zh"
                    ? "暂无 GEO 优化建议"
                    : "No GEO optimization recommendations available"}
                </div>
              )}
          </div>
        </div>
      ) : (
        // Show empty state if no geo recommendations
        <div className="space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wider">
            {t.cardGeoRecommendations}
          </div>
          <div className="text-xs text-gray-500 italic bg-amber-500/5 border border-amber-500/20 rounded p-2">
            {uiLanguage === "zh"
              ? "暂无 GEO 优化建议"
              : "No GEO optimization recommendations available"}
          </div>
        </div>
      )}
    </div>
  );
};

// Quality Review Card Component
const QualityReviewCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
}> = ({ data, uiLanguage }) => {
  // Extract geo_score from data
  const geoScore = data.geo_score || data.geo_diagnosis;
  const logicCheck = data.logic_check;
  const seoMeta = data.seo_meta;
  const totalScore = geoScore?.total_score || data.total_score || 0;

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

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 space-y-4">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
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
        />
      )}

      {/* SEO Meta */}
      {seoMeta && (
        <div className="space-y-2">
          <div className="text-[10px] text-purple-400/70 uppercase tracking-wider">
            {uiLanguage === "zh" ? "SEO 元数据" : "SEO Meta"}
          </div>
          <div className="bg-purple-500/5 border border-purple-500/20 rounded p-2 space-y-1 text-xs">
            {seoMeta.title && (
              <div>
                <span className="text-purple-400/70">
                  {uiLanguage === "zh" ? "标题:" : "Title:"}
                </span>{" "}
                <span className="text-gray-300">{seoMeta.title}</span>
              </div>
            )}
            {seoMeta.description && (
              <div>
                <span className="text-purple-400/70">
                  {uiLanguage === "zh" ? "描述:" : "Description:"}
                </span>{" "}
                <span className="text-gray-300">{seoMeta.description}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logic Check */}
      {logicCheck && (
        <div className="space-y-1">
          <div className="text-[10px] text-emerald-400/70 uppercase tracking-wider">
            {uiLanguage === "zh" ? "逻辑检查" : "Logic Check"}
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2 text-xs text-gray-300 leading-relaxed">
            {logicCheck}
          </div>
        </div>
      )}

      {/* Other Quality Checks */}
      {data.other_checks && (
        <div className="space-y-2">
          <div className="text-[10px] text-blue-400/70 uppercase tracking-wider">
            {uiLanguage === "zh" ? "其他质量检查" : "Other Quality Checks"}
          </div>
          <div className="bg-blue-500/5 border border-blue-500/20 rounded p-2 space-y-2 text-xs">
            {data.other_checks.authenticity && (
              <div>
                <span className="text-blue-400/70">
                  {uiLanguage === "zh" ? "真实性:" : "Authenticity:"}
                </span>{" "}
                <span
                  className={
                    data.other_checks.authenticity.passed
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {data.other_checks.authenticity.passed
                    ? uiLanguage === "zh"
                      ? "通过"
                      : "Passed"
                    : uiLanguage === "zh"
                    ? "未通过"
                    : "Failed"}
                </span>
              </div>
            )}
            {data.other_checks.seo_depth && (
              <div>
                <span className="text-blue-400/70">
                  {uiLanguage === "zh" ? "SEO深度:" : "SEO Depth:"}
                </span>{" "}
                <span className="text-gray-300">
                  {uiLanguage === "zh" ? "关键词密度" : "Keyword Density"}:{" "}
                  {data.other_checks.seo_depth.keyword_density || "N/A"}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fix List */}
      {data.fix_list && data.fix_list.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] text-amber-400/70 uppercase tracking-wider">
            {uiLanguage === "zh" ? "需要修复的问题" : "Issues to Fix"}
          </div>
          <div className="space-y-1">
            {data.fix_list.map((fix: any, i: number) => (
              <div
                key={i}
                className="bg-amber-500/5 border border-amber-500/20 rounded p-2 text-xs"
              >
                {typeof fix === "string" ? (
                  <div className="text-gray-300">{fix}</div>
                ) : (
                  <div className="space-y-1">
                    {fix.priority && (
                      <div className="text-amber-400/70">
                        {uiLanguage === "zh" ? "优先级:" : "Priority:"}{" "}
                        {fix.priority}
                      </div>
                    )}
                    {fix.issue && (
                      <div className="text-gray-300">
                        {uiLanguage === "zh" ? "问题:" : "Issue:"} {fix.issue}
                      </div>
                    )}
                    {fix.suggestion && (
                      <div className="text-gray-400 italic">
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
}> = ({ data, uiLanguage }) => {
  const markdown = data.markdown || data.content || data.article_body || "";
  const title = data.title || "";

  if (!markdown) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2">
        <div className="text-xs text-gray-500 italic">
          {uiLanguage === "zh"
            ? "暂无文章内容"
            : "No article content available"}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center mb-3">
        <FileText size={12} className="mr-1" />
        {uiLanguage === "zh" ? "最终文章" : "Final Article"}
      </h4>
      <div className="prose prose-sm prose-invert max-w-none">
        <div className="text-xs text-gray-300 leading-relaxed max-h-96 overflow-y-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

const CompetitorAnalysisCard: React.FC<{
  data: any;
  uiLanguage: UILanguage;
}> = ({ data, uiLanguage }) => {
  const t = AGENT_TEXT[uiLanguage];

  // If markdown field exists, render markdown directly
  if (data.markdown) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center mb-3">
          <Target size={12} className="mr-1" /> {t.cardCompetitorAnalysis}
        </h4>
        <div className="prose prose-sm prose-invert max-w-none">
          <div className="text-xs text-gray-300 leading-relaxed">
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
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 mt-2 space-y-4">
      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
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
  onImageFullscreen?: (url: string, prompt?: string, theme?: string) => void;
}> = ({ event, uiLanguage, onImageFullscreen }) => {
  const t = AGENT_TEXT[uiLanguage];
  switch (event.cardType) {
    case "serp":
      return <SerpCard data={event.data} uiLanguage={uiLanguage} />;
    case "data":
      return <DataCard data={event.data} uiLanguage={uiLanguage} />;
    case "outline":
      return <OutlineCard data={event.data} uiLanguage={uiLanguage} />;
    case "competitor-analysis":
      return (
        <CompetitorAnalysisCard data={event.data} uiLanguage={uiLanguage} />
      );
    case "search-preferences":
      return (
        <SearchPreferencesCard data={event.data} uiLanguage={uiLanguage} />
      );
    case "google-search-results":
      return (
        <GoogleSearchResultsCard data={event.data} uiLanguage={uiLanguage} />
      );
    case "firecrawl-result":
      return <FirecrawlResultCard data={event.data} uiLanguage={uiLanguage} />;
    case "dataforseo-competitors":
      return (
        <DataForSEOCompetitorsCard data={event.data} uiLanguage={uiLanguage} />
      );
    case "dataforseo-keywords":
      return (
        <DataForSEOKeywordsCard data={event.data} uiLanguage={uiLanguage} />
      );
    case "website-audit-report":
      return (
        <WebsiteAuditReportCard data={event.data} uiLanguage={uiLanguage} />
      );
    case "quality-review":
      return <QualityReviewCard data={event.data} uiLanguage={uiLanguage} />;
    case "final-article":
      return <FinalArticleCard data={event.data} uiLanguage={uiLanguage} />;
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
const TerminalWindow: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden shadow-2xl h-full flex flex-col">
      {/* Terminal Header */}
      <div className="bg-[#1a1a1a] border-b border-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
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
          <span className="text-xs text-gray-400 font-mono">
            agent-terminal
          </span>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-12"></div>
      </div>

      {/* Terminal Content - Scrollable */}
      <div className="bg-[#0a0a0a] flex-1 overflow-y-auto min-h-0">
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
const TerminalPrompt: React.FC<{ agentName: string }> = ({ agentName }) => {
  return (
    <span className="text-emerald-400 font-mono">
      <span className="text-gray-500">$</span>{" "}
      <span className="text-blue-400">{agentName.toLowerCase()}</span>
      <span className="text-gray-500">:</span>
      <span className="text-emerald-400">~</span>
      <span className="text-gray-500">$</span>{" "}
    </span>
  );
};

// Code Highlight Component
const CodeHighlight: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <span className="bg-black/30 text-emerald-300 font-mono text-xs px-1.5 py-0.5 rounded border border-emerald-500/20">
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
}

export const AgentStreamFeed: React.FC<AgentStreamFeedProps> = ({
  events,
  uiLanguage = "en",
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [typingStates, setTypingStates] = useState<Record<string, boolean>>({});
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    prompt?: string;
    theme?: string;
  } | null>(null);

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
    <TerminalWindow>
      <div className="p-6 space-y-4 font-mono text-sm">
        {events.length === 0 && (
          <div className="text-gray-500 text-xs">
            <TerminalPrompt agentName="system" />
            <span className="text-gray-400">Waiting for agents to start</span>
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
                <TerminalPrompt agentName={agentName} />

                {/* Agent Description - Show when no message and no card */}
                {!event.message && !event.cardType && agentDesc && (
                  <div className="text-xs text-gray-400 italic flex items-center space-x-2">
                    <span>{agentDesc}</span>
                    <LoadingDots />
                    <Cursor />
                  </div>
                )}

                {/* Message with typing effect */}
                {event.message && (
                  <div
                    className={cn(
                      "text-sm leading-relaxed flex-1",
                      event.type === "error" ? "text-red-400" : "text-gray-300"
                    )}
                  >
                    {showTyping ? (
                      <TypingText
                        text={event.message}
                        speed={20}
                        onComplete={() => handleTypingComplete(event.id)}
                      />
                    ) : (
                      <>
                        {highlightCodeInText(event.message).map((part, i) =>
                          part.isCode ? (
                            <CodeHighlight key={i}>{part.text}</CodeHighlight>
                          ) : (
                            <span key={i}>{part.text}</span>
                          )
                        )}
                        <Cursor />
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Functional Cards */}
              {event.type === "card" && (
                <div className="ml-8 mt-2">
                  <StreamEventDetails
                    event={event}
                    uiLanguage={uiLanguage}
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
              <div className="ml-8 text-[10px] text-gray-600 mt-1">
                [{new Date(event.timestamp).toLocaleTimeString()}]
              </div>
            </div>
          );
        })}

        {/* Always show cursor at the end */}
        {events.length > 0 && (
          <div className="text-gray-500 text-xs mt-4">
            <TerminalPrompt agentName="system" />
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
