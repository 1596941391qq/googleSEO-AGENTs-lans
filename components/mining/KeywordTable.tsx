
import React from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ExternalLink, 
  FileText, 
  BrainCircuit, 
  TrendingUp, 
  Lightbulb 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import { KeywordData, ProbabilityLevel, UILanguage } from '../../types';

interface KeywordTableProps {
  keywords: KeywordData[];
  expandedRowId: string | null;
  onToggleExpand: (id: string | null) => void;
  onDeepDive: (keyword: KeywordData) => void;
  isDarkTheme: boolean;
  uiLanguage: UILanguage;
  t: any; // Translation object
  MarkdownContent: React.FC<{ content: string; isDarkTheme: boolean }>;
}

export const KeywordTable: React.FC<KeywordTableProps> = ({
  keywords,
  expandedRowId,
  onToggleExpand,
  onDeepDive,
  isDarkTheme,
  uiLanguage,
  t,
  MarkdownContent
}) => {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className={`w-full text-left text-sm ${isDarkTheme ? "text-slate-300" : "text-gray-700"}`}>
        <thead className={`text-xs uppercase font-semibold border-b ${isDarkTheme ? "bg-black/60 text-slate-400 border-emerald-500/20" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
          <tr>
            <th className="px-4 py-4 w-10"></th>
            <th className="px-4 py-4">{t.colKw}</th>
            <th className="px-4 py-4">{t.colTrans}</th>
            <th className="px-4 py-4">{t.blueOceanScore || (uiLanguage === 'zh' ? '蓝海分' : 'Blue Ocean')}</th>
            <th className="px-4 py-4">{t.drComparison || (uiLanguage === 'zh' ? 'DR对比' : 'DR Comp')}</th>
            <th className="px-4 py-4">{t.colVol}</th>
            <th className="px-4 py-4">{t.colType}</th>
            <th className="px-4 py-4 text-center">{t.colProb}</th>
            <th className="px-4 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-500/10">
          {keywords.map((item) => {
            const isExpanded = expandedRowId === item.id;
            return (
              <React.Fragment key={item.id}>
                <tr className={`transition-colors ${isExpanded ? "bg-emerald-500/10" : "hover:bg-emerald-500/5"}`}>
                  <td className="px-4 py-4 text-center cursor-pointer" onClick={() => onToggleExpand(isExpanded ? null : item.id)}>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
                  </td>
                  <td className={`px-4 py-4 font-medium ${isDarkTheme ? "text-white" : "text-gray-900"}`} onClick={() => onToggleExpand(isExpanded ? null : item.id)}>
                    <div className="cursor-pointer">{item.keyword}</div>
                  </td>
                  <td className={`px-4 py-4 ${isDarkTheme ? "text-slate-400" : "text-gray-600"}`}>
                    {item.translation}
                  </td>
                  <td className={`px-4 py-4 font-bold ${isDarkTheme ? "text-white" : "text-gray-900"}`}>
                    {item.blueOceanScore !== undefined ? (
                      <div className="flex flex-col">
                        <span className={cn(
                          item.blueOceanScore >= 70 ? "text-emerald-400" :
                          item.blueOceanScore >= 40 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {Math.round(item.blueOceanScore)}
                        </span>
                        <div className="w-12 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              item.blueOceanScore >= 70 ? "bg-emerald-500" :
                              item.blueOceanScore >= 40 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${item.blueOceanScore}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className={`px-4 py-4 ${isDarkTheme ? "text-white/80" : "text-gray-700"}`}>
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{item.websiteDR !== undefined ? Math.round(item.websiteDR) : "-"}</span>
                      <span className="text-[10px] text-slate-500 text-nowrap">vs</span>
                      <span className="font-medium text-amber-400/80">
                        {item.competitorDRs && item.competitorDRs.length > 0 
                          ? Math.round(item.competitorDRs.reduce((a: number, b: number) => a + b, 0) / item.competitorDRs.length)
                          : "-"}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-4 font-mono ${isDarkTheme ? "text-white" : "text-gray-900"}`}>
                    {item.volume.toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      {item.topDomainType || "-"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      item.probability === ProbabilityLevel.HIGH ? "bg-emerald-500/30 text-emerald-400 border-emerald-500/50" :
                      item.probability === ProbabilityLevel.MEDIUM ? "bg-yellow-500/30 text-yellow-400 border-yellow-500/50" :
                      "bg-red-500/30 text-red-400 border-red-500/50"
                    }`}>
                      {item.probability}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <a href={`https://www.google.com/search?q=${encodeURIComponent(item.keyword)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors text-xs font-medium border border-emerald-500/30" title={t.verifyBtn} onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="w-3 h-3" />
                        {t.verifyBtn}
                      </a>
                      <button className={`text-xs flex items-center gap-1 transition-colors ${isDarkTheme ? "text-white/70 hover:text-emerald-400" : "text-gray-600 hover:text-emerald-600"}`} onClick={() => onToggleExpand(isExpanded ? null : item.id)}>
                        Details
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDeepDive(item); }} className="flex items-center gap-1 px-2 py-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors text-xs font-medium" title={t.btnGenerateArticle || t.deepDive}>
                        <FileText className="w-3 h-3" />
                        {t.btnGenerateArticle || t.deepDive}
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className={`animate-fade-in border-b ${isDarkTheme ? "bg-black border-emerald-500/20" : "bg-gray-50 border-gray-200"}`}>
                    <td colSpan={9} className="px-4 py-6">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          {(item.searchIntent || item.intentAnalysis) && (() => {
                            // 过滤掉错误信息，只显示有效内容
                            const hasErrorKeywords = (text: string | undefined): boolean => {
                              if (!text) return false;
                              const errorKeywords = [
                                '无法确定', 'Unable to determine', 
                                '分析失败', 'Analysis failed', 
                                'AI响应被截断', 'AI response was truncated',
                                '原始错误', 'Original error',
                                '不完整的JSON', 'incomplete JSON',
                                '无效的JSON', 'invalid JSON',
                                '解析失败', 'Failed to parse',
                                'Unterminated string'
                              ];
                              return errorKeywords.some(keyword => text.includes(keyword));
                            };

                            const isValidSearchIntent = item.searchIntent && !hasErrorKeywords(item.searchIntent);
                            const isValidIntentAnalysis = item.intentAnalysis && !hasErrorKeywords(item.intentAnalysis);

                            // 如果都包含错误信息，不显示这个卡片
                            if (!isValidSearchIntent && !isValidIntentAnalysis) {
                              return null;
                            }

                            return (
                              <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/30" : "bg-white border-slate-200")}>
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <BrainCircuit className="w-4 h-4 text-emerald-500" />
                                    <span className={cn(isDarkTheme ? "text-white" : "text-slate-900")}>
                                      {t.searchIntentAnalysis || (uiLanguage === "zh" ? "搜索意图分析" : "Search Intent Analysis")}
                                    </span>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  {isValidSearchIntent && (
                                    <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/30" : "bg-emerald-50 border-emerald-200")}>
                                      <CardContent className="p-4">
                                        <div className={cn("text-xs font-semibold mb-2", isDarkTheme ? "text-emerald-400" : "text-emerald-700")}>
                                          {t.userIntent || (uiLanguage === "zh" ? "用户意图" : "USER INTENT")}
                                        </div>
                                        <p className={cn("text-sm leading-relaxed", isDarkTheme ? "text-white" : "text-slate-700")}>
                                          {item.searchIntent}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  )}
                                  {isValidIntentAnalysis && (
                                    <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/30" : "bg-emerald-50 border-emerald-200")}>
                                      <CardContent className="p-4">
                                        <div className={cn("text-xs font-semibold mb-2", isDarkTheme ? "text-emerald-400" : "text-emerald-700")}>
                                          {t.intentVsSerpMatch || (uiLanguage === "zh" ? "意图与SERP匹配" : "INTENT vs SERP MATCH")}
                                        </div>
                                        <p className={cn("text-sm leading-relaxed", isDarkTheme ? "text-white" : "text-slate-700")}>
                                          {item.intentAnalysis}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })()}
                          {item.serankingData && item.serankingData.is_data_found && (
                            <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/30" : "bg-white border-slate-200")}>
                              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /><span className={cn(isDarkTheme ? "text-white" : "text-slate-900")}>{t.keywordResearchTool || (uiLanguage === "zh" ? "SEO词研究工具 (DataForSEO)" : "Keyword Research Tool (DataForSEO)")}</span></CardTitle></CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                  <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-slate-50 border-slate-200")}><CardContent className="p-4"><div className={cn("text-xs font-medium mb-1.5", isDarkTheme ? "text-white/70" : "text-slate-600")}>{t.searchVolume || (uiLanguage === "zh" ? "搜索量" : "SEARCH VOLUME")}</div><div className={cn("text-xl font-bold", isDarkTheme ? "text-emerald-400" : "text-emerald-600")}>{item.serankingData.volume?.toLocaleString() || "N/A"}</div><div className={cn("text-xs mt-1", isDarkTheme ? "text-white/60" : "text-slate-500")}>{uiLanguage === "zh" ? "月搜索量" : "monthly searches"}</div></CardContent></Card>
                                  <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}><CardContent className="p-4"><div className={cn("text-xs font-medium mb-1.5", isDarkTheme ? "text-white/70" : "text-emerald-700")}>{t.keywordDifficulty || (uiLanguage === "zh" ? "关键词难度" : "KEYWORD DIFFICULTY")}</div><div className={cn("text-xl font-bold",(item.serankingData.difficulty || 0) <= 40 ? (isDarkTheme ? "text-emerald-400" : "text-emerald-600") : (item.serankingData.difficulty || 0) <= 60 ? (isDarkTheme ? "text-yellow-400" : "text-yellow-600") : (isDarkTheme ? "text-red-400" : "text-red-600"))}>{item.serankingData.difficulty || "N/A"}</div><div className={cn("text-xs mt-1", isDarkTheme ? "text-white/60" : "text-emerald-600/70")}>{(item.serankingData.difficulty || 0) <= 40 ? (uiLanguage === "zh" ? "低竞争" : "Low competition") : (item.serankingData.difficulty || 0) <= 60 ? (uiLanguage === "zh" ? "中等竞争" : "Medium competition") : (uiLanguage === "zh" ? "高竞争" : "High competition")}</div></CardContent></Card>
                                  <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}><CardContent className="p-4"><div className={cn("text-xs font-medium mb-1.5", isDarkTheme ? "text-white/70" : "text-emerald-700")}>CPC</div><div className={cn("text-xl font-bold", isDarkTheme ? "text-emerald-400" : "text-emerald-600")}>${item.serankingData.cpc?.toFixed(2) || "N/A"}</div><div className={cn("text-xs mt-1", isDarkTheme ? "text-white/60" : "text-emerald-600/70")}>{uiLanguage === "zh" ? "点击成本" : "cost per click"}</div></CardContent></Card>
                                  <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}><CardContent className="p-4"><div className={cn("text-xs font-medium mb-1.5", isDarkTheme ? "text-white/70" : "text-emerald-700")}>{t.blueOceanScore || (uiLanguage === "zh" ? "蓝海分" : "BLUE OCEAN")}</div><div className={cn("text-xl font-bold", item.blueOceanScore && item.blueOceanScore >= 70 ? "text-emerald-400" : item.blueOceanScore && item.blueOceanScore >= 40 ? "text-yellow-400" : "text-red-400")}>{item.blueOceanScore !== undefined ? Math.round(item.blueOceanScore) : "N/A"}</div><div className={cn("text-xs mt-1", isDarkTheme ? "text-white/60" : "text-emerald-600/70")}>{uiLanguage === "zh" ? "挖掘潜力" : "Mining potential"}</div></CardContent></Card>
                                  <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}><CardContent className="p-4"><div className={cn("text-xs font-medium mb-1.5", isDarkTheme ? "text-white/70" : "text-emerald-700")}>DR (YOU vs AVG)</div><div className={cn("text-xl font-bold", isDarkTheme ? "text-white" : "text-slate-900")}>{item.websiteDR !== undefined ? Math.round(item.websiteDR) : "-"}<span className="text-xs font-normal text-slate-500 mx-1">/</span>{item.competitorDRs && item.competitorDRs.length > 0 ? Math.round(item.competitorDRs.reduce((a: number, b: number) => a + b, 0) / item.competitorDRs.length) : "-"}</div><div className={cn("text-xs mt-1", isDarkTheme ? "text-white/60" : "text-emerald-600/70")}>{uiLanguage === "zh" ? "域名权重对比" : "Domain authority"}</div></CardContent></Card>
                                  <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}><CardContent className="p-4"><div className={cn("text-xs font-medium mb-1.5", isDarkTheme ? "text-white/70" : "text-emerald-700")}>{uiLanguage === "zh" ? "上首页概率" : "TOP 10 PROB"}</div><div className={cn("text-xl font-bold", item.top10Probability === ProbabilityLevel.HIGH ? "text-emerald-400" : item.top10Probability === ProbabilityLevel.MEDIUM ? "text-yellow-400" : "text-red-400")}>{item.top10Probability || "N/A"}</div><div className={cn("text-xs mt-1", isDarkTheme ? "text-white/60" : "text-emerald-600/70")}>{uiLanguage === "zh" ? "基于DR估算" : "Based on DR"}</div></CardContent></Card>
                                </div>
                                {item.serankingData.history_trend && Object.keys(item.serankingData.history_trend).length > 0 && (
                                  <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-emerald-50 border-emerald-200")}><CardContent className="p-4"><div className={cn("text-xs font-semibold mb-3 flex items-center gap-2", isDarkTheme ? "text-white/70" : "text-emerald-700")}><TrendingUp className={cn("w-4 h-4", isDarkTheme ? "text-emerald-400" : "text-emerald-600")} />{t.searchVolumeTrend || (uiLanguage === "zh" ? "搜索量趋势（过去12个月）" : "SEARCH VOLUME TREND (Last 12 Months)")}</div><div className="grid grid-cols-4 md:grid-cols-6 gap-2">{Object.entries(item.serankingData.history_trend).sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).map(([date, volume]) => (<Card key={date} className={cn("text-center", isDarkTheme ? "bg-black border-emerald-500/20" : "bg-white border-emerald-200")}><CardContent className="p-2"><div className={cn("text-xs font-medium mb-1", isDarkTheme ? "text-white/60" : "text-emerald-600/80")}>{new Date(date).toLocaleDateString(uiLanguage === "zh" ? "zh-CN" : "en-US", { month: "short", year: "2-digit" })}</div><div className={cn("text-sm font-bold", isDarkTheme ? "text-white" : "text-emerald-600")}>{typeof volume === "number" ? volume.toLocaleString() : volume}</div></CardContent></Card>))}</div></CardContent></Card>
                                )}
                              </CardContent>
                            </Card>
                          )}
                          {(() => {
                            // 过滤掉错误信息
                            const hasErrorKeywords = (text: string | undefined): boolean => {
                              if (!text) return false;
                              const errorKeywords = [
                                '无法确定', 'Unable to determine', 
                                '分析失败', 'Analysis failed', 
                                'AI响应被截断', 'AI response was truncated',
                                '原始错误', 'Original error',
                                '不完整的JSON', 'incomplete JSON',
                                '无效的JSON', 'invalid JSON',
                                '解析失败', 'Failed to parse',
                                'Unterminated string', '响应预览'
                              ];
                              return errorKeywords.some(keyword => text.includes(keyword));
                            };

                            const isValidReasoning = item.reasoning && !hasErrorKeywords(item.reasoning);
                            const displayReasoning = isValidReasoning 
                              ? item.reasoning 
                              : (uiLanguage === "zh" 
                                  ? "分析结果正在生成中，请稍候..." 
                                  : "Analysis results are being generated, please wait...");

                            return (
                              <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-white border-slate-200")}>
                                <CardHeader className="pb-3">
                                  <CardTitle className={cn("text-sm font-semibold", isDarkTheme ? "text-white" : "text-slate-900")}>
                                    {t.analysisReasoning || (uiLanguage === "zh" ? "分析推理" : "Analysis Reasoning")}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className={cn("prose prose-sm max-w-none", isDarkTheme ? "prose-invert prose-emerald prose-headings:text-white prose-p:text-white prose-strong:text-white prose-li:text-white" : "prose-slate")}>
                                    <MarkdownContent content={displayReasoning} isDarkTheme={isDarkTheme} />
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })()}
                          <Card className={cn(isDarkTheme ? "bg-black border-emerald-500/20" : "bg-white border-slate-200")}><CardContent className="p-4"><div className="grid grid-cols-2 gap-4"><div><span className={cn("text-xs block mb-1", isDarkTheme ? "text-white/70" : "text-slate-600")}>{t.referenceSerpCount || (uiLanguage === "zh" ? "参考SERP数量" : "Reference SERP Count")}</span><span className={cn("text-sm font-semibold", isDarkTheme ? "text-white" : "text-slate-900")}>{item.serpResultCount === -1 ? (uiLanguage === "zh" ? "未知（很多）" : "Unknown (Many)") : item.serpResultCount ?? (uiLanguage === "zh" ? "未知" : "Unknown")}</span></div><div><span className={cn("text-xs block mb-1", isDarkTheme ? "text-white/70" : "text-slate-600")}>{t.topCompetitorType || (uiLanguage === "zh" ? "顶级竞争对手类型" : "Top Competitor Type")}</span><Badge variant="outline" className={cn("text-xs", isDarkTheme ? "border-emerald-500/30 text-white" : "border-slate-300 text-slate-700")}>{item.topDomainType ?? "-"}</Badge></div></div></CardContent></Card>
                          {item.serpResultCount === 0 ? (<Card className={cn("border-amber-200 dark:border-amber-800/50", isDarkTheme ? "bg-amber-950/20" : "bg-amber-50")}><CardContent className="p-4"><div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300"><Lightbulb className="w-4 h-4" />{uiLanguage === "zh" ? "搜索中未找到直接竞争对手。" : "No direct competitors found in search."}</div></CardContent></Card>) : (item.topSerpSnippets && item.topSerpSnippets.length > 0 && (<Card className={cn(isDarkTheme ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200")}><CardHeader className="pb-3"><div className="flex justify-between items-center"><CardTitle className={cn("text-sm font-semibold", isDarkTheme ? "text-slate-200" : "text-slate-900")}>{t.serpEvidence}</CardTitle><Badge variant="outline" className={cn("text-[10px]", isDarkTheme ? "border-amber-800/50 text-amber-400" : "border-amber-200 text-amber-700")}>{t.serpEvidenceDisclaimer}</Badge></div></CardHeader><CardContent><div className="space-y-3">{item.topSerpSnippets.slice(0, 3).map((snip, i) => (<Card key={i} className={cn(isDarkTheme ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200")}><CardContent className="p-3"><div className={cn("text-sm font-semibold mb-1 truncate", isDarkTheme ? "text-emerald-400" : "text-emerald-700")}>{snip.title}</div><div className={cn("text-xs mb-2 truncate", isDarkTheme ? "text-emerald-400" : "text-emerald-700")}>{snip.url}</div><div className={cn("text-xs line-clamp-2 leading-relaxed", isDarkTheme ? "text-slate-400" : "text-slate-600")}>{snip.snippet}</div></CardContent></Card>))}</div></CardContent></Card>))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
